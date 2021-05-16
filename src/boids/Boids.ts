import { SandboxContainer, SandboxFactory } from '../gl/sandbox/GLSandbox';
import { AbstractGLSandbox } from '../gl/sandbox/AbstractGLSandbox';
import { vec2 } from 'gl-matrix';
import { DrawMode } from '../gl/buffers/BufferEnums';
import { VertexBuffer } from '../gl/buffers/VertexBuffer';
import { IndexedDrawable, InstancedDrawable } from '../gl/drawable/GLDrawable';
import { FrameBuffer } from '../gl/buffers/FrameBuffer';
import { newQuadDrawable } from '../gl/drawable/QuadDrawable';
import { BoidPrograms } from './BoidPrograms';
import { BoidTextures } from './BoidTextures';
import { Boid, BoidFamilly, parseFamilly, randomizedBoids } from './Boid';
import { BoidsParameters } from './BoidsParameters';

export function boids(): SandboxFactory<BoidsParameters> {
  return GLBoids.create;
}

const MAX_BOIDS = 256;

// const TEST_BOIDS: Boid[] = [{ pos: [0.0, 0.0], velocity: [1.0, 1.0], familly: 0 }];
// const TEST_FAMILIES: BoidFamilly[] = [
//   { maxSpeed: 0.3, size: [2 / 100, 0], color: [0, 1, 0, 1], radii: [8, 8, 8], weights: [1.0, 1.0, 1.0] },
//   { maxSpeed: 1, size: [2 / 50, 0], color: [1, 0, 0, 1], radii: [8, 8, 8], weights: [1.0, 1.0, 1.0] }
// ];

class GLBoids extends AbstractGLSandbox<BoidsParameters> {
  static async create(container: SandboxContainer, name: string): Promise<GLBoids> {
    const parameters: BoidsParameters = {
      count: 20,
      maxspeed: 0.5,
      fov: 140
    };
    window.hashlocation.parseParams(parameters);
    return new GLBoids(container, name, parameters, await BoidPrograms.create(container.programLoader));
  }

  private readonly frameBuffer: FrameBuffer;
  private readonly renderDrawable: InstancedDrawable;
  private readonly quadDrawable: IndexedDrawable;

  private readonly textures: BoidTextures;

  private readonly famillies: BoidFamilly[] = [];

  constructor(container: SandboxContainer, name: string, parameters: BoidsParameters, readonly programs: BoidPrograms) {
    super(container, name, parameters);
    this.textures = new BoidTextures(this.gl, MAX_BOIDS);

    this.renderDrawable = this.createRenderDrawable();
    this.quadDrawable = newQuadDrawable(this.gl);
    this.frameBuffer = new FrameBuffer(this.gl);

    programs.setupUniforms();

    // if (TEST_BOIDS) {
    //   parameters.count = TEST_BOIDS.length;
    //   this.textures.pushBoids(TEST_BOIDS);
    //   TEST_FAMILIES.forEach(f => (f.size[1] = f.size[0] * container.aspectRatio));
    //   this.famillies.push(...TEST_FAMILIES);
    // }
    this.famillies.push(parseFamilly(parameters, container.aspectRatio));

    this.updateFamilies();
    this.onParametersChanged();

    this.programs.renderBoids.use();
    this.renderDrawable.bind();
  }

  render(): void {
    this.clear([0, 0, 0, 1], WebGL2RenderingContext.COLOR_BUFFER_BIT);
    this.textures.bind();
    this.renderDrawable.draw(this.textures.boidsCount);
  }

  update(time: number, dt: number): void {
    this.programs.prepareUpdate(this.textures.boidsCount, time, dt);

    const boidsData = this.textures.boids[1];
    this.frameBuffer.bind().attach(boidsData.data);

    this.gl.viewport(0, 0, this.textures.boidsCount, 1);
    this.gl.clearColor(0, 0, 0, 0);
    this.gl.clear(WebGL2RenderingContext.COLOR_BUFFER_BIT);

    this.textures.bind();
    this.quadDrawable.bind().draw();
    this.frameBuffer.checkStatus();

    this.frameBuffer.detach();
    this.frameBuffer.unbind();

    this.gl.viewport(0, 0, this.container.dimension[0], this.container.dimension[1]);

    this.textures.swapBoids();

    this.programs.renderBoids.use();
    this.renderDrawable.bind();
  }

  onkeydown(e: KeyboardEvent): void {
    switch (e.key.toLowerCase()) {
      case 'n':
        this.update(0, 0);
        break;
    }
  }

  onParametersChanged(): void {
    this.parameters.count = Math.min(MAX_BOIDS, this.parameters.count);
    if (this.parameters.count < this.textures.boidsCount)
      this.textures.removeBoids(this.textures.boidsCount - this.parameters.count);
    else if (this.parameters.count > this.textures.boidsCount) {
      const missing = this.parameters.count - this.textures.boidsCount;
      const newBoids = randomizedBoids(missing, 0, this.famillies[0].maxSpeed);
      this.textures.pushBoids(newBoids);
    }
  }

  onresize(dim: vec2): void {
    const ar = dim[0] / dim[1];
    this.famillies.forEach(f => (f.size[1] = f.size[0] * ar));
    this.updateFamilies();
  }

  private updateFamilies(): void {
    this.textures.updateFamilies(this.famillies);
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

// prettier-ignore
const BOIDS_VERTICES = [
  -0.25, 0,
  0.5, 0,
  -0.5, 0.5,
  -0.25, 0,
  -0.5, -0.5,
  0.5, 0
];
