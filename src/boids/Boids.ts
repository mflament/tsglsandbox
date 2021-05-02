import { Deletable } from '../gl/utils/GLUtils';
import { SandboxContainer, SandboxFactory } from '../gl/sandbox/GLSandbox';
import { AbstractGLSandbox, newSandboxFactory } from '../gl/sandbox/AbstractGLSandbox';
import { vec2, vec4 } from 'gl-matrix';
import { BufferUsage, DrawMode, TransformFeedbackDrawMode } from '../gl/buffers/BufferEnums';
import { AABB, QuadTree } from '../utils/QuadTree';
import { Program } from '../gl/shader/Program';

// @ts-ignore
import RENDER_VS from 'assets/shaders/boids/boids-render.vs.glsl';
// @ts-ignore
import RENDER_FS from 'assets/shaders/boids/boids-render.fs.glsl';

// @ts-ignore
import MAP_VS from 'assets/shaders/boids/boids-map.vs.glsl';
// @ts-ignore
import MAP_DEBUG_FS from 'assets/shaders/boids/boids-debug.fs.glsl';

// @ts-ignore
import UPDATE_VS from 'assets/shaders/boids/boids-update.vs.glsl';
// @ts-ignore
import UPDATE_FS from 'assets/shaders/boids/boids-update.fs.glsl';

import { GLTexture2D } from '../gl/texture/GLTexture';
import { TextureMagFilter, TextureMinFilter } from '../gl/texture/TextureEnums';
import { FrameBuffer } from '../gl/buffers/FrameBuffer';
import { newQuadDrawable, QUAD_VS } from '../gl/buffers/GLDrawables';
import { BufferAttribute, VertexBuffer } from '../gl/buffers/VertexBuffer';
import { GLDrawable, InstancedDrawable, newDrawable } from '../gl/buffers/GLDrawable';
import { TransformFeedback } from '../gl/shader/TransformFeedback';

interface BoidsParameters {
  count: number;
  viewdistance: number;
  accel: number;
  maxspeed: number;
  turnspeed: number;
}

interface VertexAttributes {
  a_position: BufferAttribute;
}

interface BoidAttributes {
  a_boidData: BufferAttribute;
  a_boidColor: BufferAttribute;
}

class RenderUniforms {
  u_boidScale: WebGLUniformLocation | null = null;
}

class UpdateUniforms {
  u_boidConfig: WebGLUniformLocation | null = null;
  u_boidsMap: WebGLUniformLocation | null = null;
  u_elapsedSeconds: WebGLUniformLocation | null = null;
}

class DebugUniforms {
  u_boidsMap: WebGLUniformLocation | null = null;
}

const attributeLocations = {
  a_position: 0,
  a_boidData: 1,
  a_boidColor: 2
};

class BoidsResources implements Deletable {
  static async create(container: SandboxContainer): Promise<BoidsResources> {
    const parameters: BoidsParameters = { count: 1, accel: 0.5, maxspeed: 1, turnspeed: Math.PI, viewdistance: 0.1 };
    window.hashlocation.parseParams(parameters);
    const renderProgram = await container.programLoader.loadProgram({
      vsSource: RENDER_VS,
      fsSource: RENDER_FS,
      uniformLocations: new RenderUniforms()
    });
    const updateProgram = await container.programLoader.loadProgram({
      vsSource: UPDATE_VS,
      fsSource: UPDATE_FS,
      uniformLocations: new UpdateUniforms(),
      varyings: ['newData', 'newColor']
    });
    const mapProgram = await container.programLoader.loadProgram({
      vsSource: MAP_VS,
      fsSource: RENDER_FS
    });
    const debugProgram = await container.programLoader.loadProgram({
      vsSource: QUAD_VS,
      fsSource: MAP_DEBUG_FS,
      uniformLocations: new DebugUniforms()
    });
    return new BoidsResources(container, parameters, renderProgram, updateProgram, mapProgram, debugProgram);
  }

  readonly boidSize: vec2 = [0, 0];

  readonly vertices: VertexBuffer<VertexAttributes>;

  frontBuffer: BoidsBuffers;
  backBuffer: BoidsBuffers;

  readonly mapTexture: GLTexture2D;
  readonly frameBuffer: FrameBuffer;
  readonly transformFeedback: TransformFeedback;

  readonly debugDrawable: GLDrawable;

  constructor(
    readonly container: SandboxContainer,
    readonly parameters: BoidsParameters,
    readonly renderProgram: Program<never, RenderUniforms>,
    readonly updateProgram: Program<never, UpdateUniforms>,
    readonly mapProgram: Program,
    readonly debugProgram: Program<never, DebugUniforms>
  ) {
    this.vertices = new VertexBuffer<VertexAttributes>(this.gl, {
      a_position: { size: 2 }
    })
      .bind()
      .setdata(BOIDS_VERTICES);

    this.frontBuffer = new BoidsBuffers(this);
    this.backBuffer = new BoidsBuffers(this);

    this.mapTexture = new GLTexture2D(this.gl)
      .bind()
      .minFilter(TextureMinFilter.NEAREST)
      .magFilter(TextureMagFilter.NEAREST);
    this.frameBuffer = new FrameBuffer(this.gl);
    this.transformFeedback = new TransformFeedback(this.gl);

    this.updateBoidSize(container.dimension);

    this.updateProgram.use();
    this.updateParams();
    this.gl.uniform1i(this.updateProgram.uniformLocations.u_boidsMap, 0);

    this.setBoids([
      { pos: [0.5, 0.25], angle: 2.5, speed: 0, color: BOID_COLOR },
      { pos: [-0.5, -0.25], angle: 1, speed: 0, color: BOID_COLOR }
    ]);

    this.drawMap();

    //BoidBuffer.randomizedBoids(container.dimension, 10).update();
    this.debugDrawable = this.newDebugDrawable();
  }

  setBoidsConfig(config: BoidsParameters): void {
    this.updateProgram.use();
    // x: view distance, y: acceleration, z: max speed, w: rot speed
    this.gl.uniform4f(
      this.updateProgram.uniformLocations.u_boidConfig,
      config.viewdistance,
      config.accel,
      config.maxspeed,
      config.turnspeed
    );
  }

  setBoids(boids: Boid[]) {
    new BoidBuffer(boids.length).push(boids).update(this.frontBuffer.boidsBuffer);
    this.backBuffer.boidsBuffer.bind().allocate(this.frontBuffer.boidsBuffer.size);
  }

  render(): void {
    this.renderProgram.use();
    this.frontBuffer.renderDrawable.bind().draw();
  }

  update(dt: number): void {
    this.drawMap();
    this.updateProgram.use();
    this.gl.uniform1f(this.updateProgram.uniformLocations.u_elapsedSeconds, dt);

    this.transformFeedback.bind().bindBuffer(0, this.backBuffer.boidsBuffer);
    this.gl.enable(WebGL2RenderingContext.RASTERIZER_DISCARD);

    this.transformFeedback.begin(TransformFeedbackDrawMode.POINTS);
    this.backBuffer.updateDrawable.draw();
    this.transformFeedback.end();

    this.gl.disable(WebGL2RenderingContext.RASTERIZER_DISCARD);
    this.transformFeedback.unbindBuffer(0).unbind();

    const swap = this.frontBuffer;
    this.frontBuffer = this.backBuffer;
    this.backBuffer = swap;
  }

  drawBoidsMap() {
    this.debugProgram.use();
    this.mapTexture.bind().activate(0);
    this.debugDrawable.bind().draw();
  }

  private drawMap(): void {
    this.mapTexture.bind();
    this.frameBuffer.bind().attach(this.mapTexture);

    this.gl.viewport(0, 0, this.mapTexture.width, this.mapTexture.height);
    this.gl.clearColor(0, 0, 0, 1);
    this.gl.clear(WebGL2RenderingContext.COLOR_BUFFER_BIT);

    this.mapProgram.use();
    this.frontBuffer.updateDrawable.bind().draw();

    this.frameBuffer.detach().unbind();

    const dim = this.container.dimension;
    this.gl.viewport(0, 0, dim[0], dim[1]);
  }

  get gl(): WebGL2RenderingContext {
    return this.container.gl;
  }

  private newDebugDrawable(): GLDrawable {
    const drawable = newQuadDrawable(this.gl);
    this.debugProgram.use();
    this.gl.uniform1i(this.debugProgram.uniformLocations.u_boidsMap, 0);
    return drawable;
  }

  private updateBoidSize(dim: vec2): void {
    const width = 0.025;
    vec2.set(this.boidSize, width, width * (dim[0] / dim[1]));
    this.renderProgram.use();
    this.gl.uniform2f(this.renderProgram.uniformLocations.u_boidScale, this.boidSize[0] / 2, this.boidSize[1] / 2);
    this.mapTexture.bind().data({
      width: 2 / this.boidSize[0],
      height: 2 / this.boidSize[1]
    });
  }

  updateParams(): void {
    this.setBoidsConfig(this.parameters);
  }

  delete(): void {
    this.frontBuffer.delete();
    this.backBuffer.delete();
    this.debugDrawable.delete();
    this.frameBuffer.delete();
    this.transformFeedback.delete();
    this.mapTexture.delete();
    this.renderProgram.delete();
    this.updateProgram.delete();
    this.mapProgram.delete();
    this.debugProgram.delete();
  }
}

class BoidsBuffers {
  readonly boidsBuffer: VertexBuffer<BoidAttributes>;
  readonly renderDrawable: InstancedDrawable;
  readonly updateDrawable: GLDrawable;
  constructor(readonly resources: BoidsResources) {
    this.boidsBuffer = new VertexBuffer<BoidAttributes>(resources.gl, {
      a_boidData: { size: 4 },
      a_boidColor: { size: 4 }
    });
    this.renderDrawable = newDrawable(
      resources.gl,
      resources.vertices,
      this.boidsBuffer,
      attributeLocations,
      DrawMode.TRIANGLES
    );
    this.updateDrawable = newDrawable(resources.gl, this.boidsBuffer, attributeLocations, DrawMode.POINTS);
  }
  delete() {
    this.boidsBuffer.delete();
    this.renderDrawable.delete();
    this.updateDrawable.delete();
  }
}

class GLBoids extends AbstractGLSandbox<BoidsResources, BoidsParameters> {
  private drawMap = false;
  constructor(container: SandboxContainer, name: string, resources: BoidsResources) {
    super(container, name, resources, resources.parameters);
    // this.running = true;
  }

  render(): void {
    this.clear([0.1, 0.1, 0.1, 1], WebGL2RenderingContext.COLOR_BUFFER_BIT | WebGL2RenderingContext.DEPTH_BUFFER_BIT);
    if (this.drawMap) this.resources.drawBoidsMap();
    else this.resources.render();
  }

  update(_time: number, dt: number): void {
    this.resources.update(dt);
  }

  onkeydown(e: KeyboardEvent): void {
    switch (e.key.toLowerCase()) {
      case 'm':
        this.drawMap = !this.drawMap;
        break;
      case 'n':
        this.resources.update(0);
        break;
    }
  }

  delete(): void {
    super.delete();
    this.resources.delete();
  }

  onParametersChanged(): void {
    this.resources.updateParams();
  }

  onresize(dim: vec2): void {
    // TODO
  }
}

/**
 * vec2 pos
 * vec2 heading
 * float speed
 * vec4 color
 */
interface Boid {
  pos: vec2;
  angle: number;
  speed: number;
  color: vec4;
}

const BOID_FLOATS = 8;
const BOID_COLOR: vec4 = [0, 1, 0, 1];

class BoidBuffer {
  readonly array: Float32Array;
  private _count = 0;
  constructor(capacity: number) {
    this.array = new Float32Array(capacity * BOID_FLOATS);
  }

  get count(): number {
    return this._count;
  }

  push(boids: Boid | Boid[]): BoidBuffer {
    if (!Array.isArray(boids)) boids = [boids];
    boids.forEach(boid => {
      const offset = this._count * BOID_FLOATS;
      this.array.set(boid.pos, offset);
      this.array[offset + 2] = boid.angle;
      this.array[offset + 3] = boid.speed;
      this.array.set(boid.color, offset + 4);
      this._count++;
    });
    return this;
  }

  update(buffer: VertexBuffer): void {
    buffer.bind().setdata(this.array, BufferUsage.DYNAMIC_DRAW, 0, this._count * BOID_FLOATS);
  }

  static randomizedBoids(boidSize: vec2, count: number): BoidBuffer {
    const quadTree = new QuadTree();
    const bbox = new AABB([0, 0], [boidSize[0] / 2, boidSize[1] / 2]);
    const buffer = new BoidBuffer(count);
    for (let index = 0; index < count; index++) {
      const pos: vec2 = [0, 0];
      vec2.copy(bbox.center, this.randomPoint(pos));
      while (quadTree.query(bbox).length > 0) {
        vec2.copy(bbox.center, this.randomPoint(pos));
      }
      const angle = Math.random() * 2 * Math.PI;
      const boid: Boid = { pos: pos, angle: angle, speed: Math.random(), color: BOID_COLOR };
      buffer.push(boid);
    }
    return buffer;
  }

  static randomPoint(out: vec2): vec2 {
    return vec2.set(out, Math.random() * 2 - 1, Math.random() * 2 - 1);
  }
}

// prettier-ignore
const BOIDS_VERTICES = [
  -1, -1,
  0, -0.5,
  0, 1,
  0, -0.5,
  1, -1,
  0, 1
];

export function boids(): SandboxFactory<BoidsParameters> {
  return newSandboxFactory(
    BoidsResources.create,
    (container, name, resources) => new GLBoids(container, name, resources)
  );
}
