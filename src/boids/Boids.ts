import { SandboxContainer, SandboxFactory } from '../gl/sandbox/GLSandbox';
import { AbstractGLSandbox } from '../gl/sandbox/AbstractGLSandbox';
import { vec2 } from 'gl-matrix';
import { DrawMode } from '../gl/buffers/BufferEnums';
import { VertexBuffer } from '../gl/buffers/VertexBuffer';
import { IndexedDrawable, InstancedDrawable } from '../gl/drawable/GLDrawable';
import { GLTexture2D } from '../gl/texture/GLTexture';
import { FrameBuffer } from '../gl/buffers/FrameBuffer';
import { newQuadDrawable } from '../gl/drawable/QuadDrawable';
import { BoidPrograms } from './BoidPrograms';
import { BoidTextures, SCAN_DATA_BINDING } from './BoidTextures';

export interface BoidsParameters {
  count: number;
  acceleration: number;
  maxspeed: number;
  turnspeed: number;
  fov: number;
  viewdist: number;
  ups: number;
}
const MAX_BOIDS = 256;
const BOID_WIDTH = 2.0 / 100;
// prettier-ignore
const BOIDS_VERTICES = [
  -0.25, 0,
  0.5, 0,
  -0.5, 0.5,
  -0.25, 0,
  -0.5, -0.5,
  0.5, 0
];

class GLBoids extends AbstractGLSandbox<BoidsParameters> {
  static async create(container: SandboxContainer, name: string): Promise<GLBoids> {
    const parameters: BoidsParameters = {
      count: 20,
      acceleration: 0.25,
      maxspeed: 0.5,
      turnspeed: 180,
      fov: 140,
      viewdist: 4,
      ups: 30
    };
    window.hashlocation.parseParams(parameters);
    return new GLBoids(container, name, parameters, await BoidPrograms.create(container.programLoader, BOID_WIDTH));
  }

  readonly frameBuffer: FrameBuffer;

  readonly renderDrawable: InstancedDrawable;
  readonly quadDrawable: IndexedDrawable;

  readonly textures: BoidTextures;

  readonly boidSize = vec2.create();

  newTarget?: vec2;
  private updateInterval: number;
  private nextUpdate?: number;
  private readonly target = vec2.create();

  constructor(container: SandboxContainer, name: string, parameters: BoidsParameters, readonly programs: BoidPrograms) {
    super(container, name, parameters);
    this.updateInterval = parameters.ups === 0 ? Infinity : 1 / parameters.ups;
    this.textures = BoidTextures.create(this.gl, MAX_BOIDS);

    this.renderDrawable = this.createRenderDrawable();
    this.quadDrawable = newQuadDrawable(this.gl);
    this.frameBuffer = new FrameBuffer(this.gl);

    this.updateBoidSize(container.dimension);
    programs.setupUniforms(parameters, this.boidSize);

    this.textures.pushBoids([
      { pos: [0.0, 0.95], angle: Math.PI / 2 }
      // { pos: [0, 0.2], angle: Math.PI / 2 },
      // { pos: [0, 0.1], angle: 0 },
      // { pos: [-0.1, 0], angle: 0 },
      // { pos: [0.1, 0.1], angle: 0 },
      // { pos: [0, 0.5], angle: 0 }
    ]);

    this.programs.renderBoids.use();
    this.renderDrawable.bind();

    this.scanBoids();
  }

  render(): void {
    // this.clear([0.5, 0.5, 0.5, 1], WebGL2RenderingContext.COLOR_BUFFER_BIT);
    this.clear([0, 0, 0, 1], WebGL2RenderingContext.COLOR_BUFFER_BIT);
    this.renderBoids();
  }

  update(_time: number, dt: number): void {
    if (this.nextUpdate === undefined || this.nextUpdate <= _time) {
      this.updateBoids();
      this.nextUpdate = _time + this.updateInterval;
    }
    this.moveBoids(dt);
  }

  onkeydown(e: KeyboardEvent): void {
    switch (e.key.toLowerCase()) {
      case 'n':
        this.updateBoids();
        break;
    }
  }

  onmousemove(e: MouseEvent): void {
    this.newTarget = this.clientToWorld(e, this.target);
  }

  onParametersChanged(): void {
    this.textures.boidsCount = Math.min(MAX_BOIDS, this.parameters.count);
    this.programs.updateUniforms(this.parameters);
    this.updateInterval = 1 / this.parameters.ups === 0 ? Infinity : 1 / this.parameters.ups;
  }

  onresize(dim: vec2): void {
    this.onsresize(dim);
  }

  private renderBoids(): void {
    this.renderDrawable.draw(this.textures.boidsCount);
  }

  private moveBoids(dt: number): void {
    const moveProgram = this.programs.moveBoids;
    moveProgram.use();
    this.gl.uniform1f(moveProgram.uniformLocations.u_elapsedSeconds, dt);

    const backBuffer = this.textures.boids[1];
    this.compute([backBuffer.data, backBuffer.speed]);
    this.textures.swapBoids();

    this.programs.renderBoids.use();
  }

  private updateBoids(): void {
    this.scanBoids();
    this.programs.updateBoids.use();
    this.compute(this.textures.targetHeadings[1]);
    this.textures.swapTargetHeadings();
    this.programs.renderBoids.use();
  }

  private scanBoids(): void {
    this.programs.scanBoids.use();
    this.compute(this.textures.scanTexture, this.textures.boidsCount, this.textures.boidsCount);
    this.textures.scanTexture.activate(SCAN_DATA_BINDING);
    this.programs.renderBoids.use();
  }

  onsresize(dim: vec2): void {
    this.updateBoidSize(dim);
    this.programs.updateBoidSize(this.boidSize);
  }

  private compute(target: GLTexture2D | GLTexture2D[], width = this.textures.boidsCount, height = 1): void {
    if (!Array.isArray(target)) target = [target];
    this.frameBuffer.bind();
    const attachments: number[] = [];
    target.forEach((t, i) => {
      this.frameBuffer.attach(t, i);
      attachments.push(i);
    });
    this.frameBuffer.drawBuffers(attachments);

    this.gl.viewport(0, 0, width, height);
    this.gl.clearColor(0, 0, 0, 0);
    this.gl.clear(WebGL2RenderingContext.COLOR_BUFFER_BIT);

    this.quadDrawable.bind().draw();
    this.frameBuffer.checkStatus();

    target.forEach((_t, i) => this.frameBuffer.detach(i));
    this.frameBuffer.unbind();

    this.gl.viewport(0, 0, this.container.dimension[0], this.container.dimension[1]);
    this.renderDrawable.bind();
  }

  private updateBoidSize(dim: vec2): void {
    const ar = dim[0] / dim[1];
    vec2.set(this.boidSize, BOID_WIDTH, BOID_WIDTH * ar);
  }

  private createRenderDrawable(): InstancedDrawable {
    const vertices = new VertexBuffer(this.gl, { a_position: { size: 2 } });
    vertices.bind().setdata(BOIDS_VERTICES);
    return new InstancedDrawable(this.gl, DrawMode.TRIANGLES, {
      buffer: vertices,
      locations: { a_position: 0 }
    });
  }
}

export function boids(): SandboxFactory<BoidsParameters> {
  return GLBoids.create;
}
