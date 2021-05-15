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
import { BoidTextures } from './BoidTextures';

export interface BoidsParameters {
  count: number;
  acceleration: number;
  maxspeed: number;
  turnspeed: number;
  fov: number;
  viewdist: number;
  repulseDistance: number;
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
      repulseDistance: 3,
      ups: 30
    };
    window.hashlocation.parseParams(parameters);
    return new GLBoids(container, name, parameters, await BoidPrograms.create(container.programLoader));
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
    programs.setupUniforms();

    // this.textures.pushBoids([
    //   { pos: [0.0, 0.0], angle: Math.PI / 2 },
    //   { pos: [0, 5 * this.boidSize[1]], angle: Math.PI / 2 }
    //   // { pos: [0, 0.1], angle: 0 },
    //   // { pos: [-0.1, 0], angle: 0 },
    //   // { pos: [0.1, 0.1], angle: 0 },
    //   // { pos: [0, 0.5], angle: 0 }
    // ]);

    this.onParametersChanged();

    this.programs.renderBoids.use();
    this.textures.boids[0].bind();
    this.renderDrawable.bind();

    this.scanBoids();
  }

  render(): void {
    // this.scanBoids();
    // this.clear([0.5, 0.5, 0.5, 1], WebGL2RenderingContext.COLOR_BUFFER_BIT);
    this.clear([0, 0, 0, 1], WebGL2RenderingContext.COLOR_BUFFER_BIT);
    this.renderBoids();
  }

  update(time: number, dt: number): void {
    if (this.nextUpdate === undefined || this.nextUpdate <= time) {
      this.updateBoids(time);
      this.nextUpdate = time + this.updateInterval;
    }
    this.moveBoids(dt);
  }

  onkeydown(e: KeyboardEvent): void {
    switch (e.key.toLowerCase()) {
      case 'n':
        this.updateBoids(0);
        break;
    }
  }

  onmousemove(e: MouseEvent): void {
    this.newTarget = this.clientToWorld(e, this.target);
  }

  onParametersChanged(): void {
    this.textures.boidsCount = Math.min(MAX_BOIDS, this.parameters.count);
    this.parameters.count = this.textures.boidsCount;
    this.updateInterval = 1 / this.parameters.ups === 0 ? Infinity : 1 / this.parameters.ups;
    this.updateUniforms();
  }

  onresize(dim: vec2): void {
    this.onsresize(dim);
  }

  onsresize(dim: vec2): void {
    this.updateBoidSize(dim);
    this.updateUniforms();
  }

  private renderBoids(): void {
    this.programs.bindRender(this.textures);
    this.renderDrawable.draw(this.textures.boidsCount);
    this.programs.unbindRender(this.textures);
  }

  private moveBoids(dt: number): void {
    this.programs.bindMove(this.textures, dt);

    const backBuffer = this.textures.boids[1];
    this.compute([backBuffer.data, backBuffer.speed]);

    this.textures.swapBoids();
    this.programs.unbindMove(this.textures);
  }

  private updateBoids(time: number): void {
    this.scanBoids();

    this.programs.bindUpdateHeadings(this.textures, time);

    this.compute(this.textures.targetHeadings[1]);
    this.programs.unbindUpdateHeadings(this.textures);
    this.textures.swapTargetHeadings();
    this.programs.renderBoids.use();
  }

  private scanBoids(): void {
    this.programs.bindScan(this.textures);
    this.compute(this.textures.scan, this.textures.boidsCount, this.textures.boidsCount);
    this.programs.unbindScan(this.textures);
  }

  private updateUniforms() {
    const boidLength = Math.max(this.boidSize[0], this.boidSize[1]);
    this.programs.updateUniforms({
      boidsCount: this.parameters.count,
      boidsSize: this.boidSize,
      acceleration: this.parameters.acceleration,
      maxspeed: this.parameters.maxspeed,
      turnspeed: toRad(this.parameters.turnspeed),
      viewdist: this.parameters.viewdist * boidLength,
      fov: Math.cos(toRad(this.parameters.fov / 2)),
      repulseDistance: this.parameters.repulseDistance * boidLength
    });
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

function clamp(x: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, x));
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}
