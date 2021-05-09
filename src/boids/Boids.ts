import { Deletable } from '../gl/utils/GLUtils';
import { SandboxContainer, SandboxFactory } from '../gl/sandbox/GLSandbox';
import { AbstractGLSandbox, newSandboxFactory } from '../gl/sandbox/AbstractGLSandbox';
import { vec2, vec4 } from 'gl-matrix';
import { BufferUsage, DrawMode, TransformFeedbackDrawMode } from '../gl/buffers/BufferEnums';
import { Program } from '../gl/shader/Program';
import { BufferAttribute, VertexBuffer } from '../gl/buffers/VertexBuffer';
import { GLDrawable, InstancedDrawable, newDrawable } from '../gl/buffers/GLDrawable';
import { TransformFeedback, VaryingBufferMode } from '../gl/shader/TransformFeedback';
import { AABB, QuadTree } from '../utils/QuadTree';

// @ts-ignore
import RENDER_VS from 'assets/shaders/boids/boids-render.vs.glsl';
// @ts-ignore
import RENDER_FS from 'assets/shaders/boids/boids-render.fs.glsl';
// @ts-ignore
import UPDATE_VS from 'assets/shaders/boids/boids-update.vs.glsl';
// @ts-ignore
import MAP_VS from 'assets/shaders/boids/boids-map.vs.glsl';
// @ts-ignore
import PASSTHROUGH_FS from 'assets/shaders/boids/boids-passthrough.fs.glsl';

interface BoidsParameters {
  count: number;
  speed: number;
  turnspeed: number;
  fov: number;
  viewdist: number;
}

interface VertexAttributes {
  a_position: BufferAttribute;
}

interface BoidAttributes {
  a_boidData: BufferAttribute;
}

class RenderUniforms {
  u_boidScale: WebGLUniformLocation | null = null;
  u_boidColor: WebGLUniformLocation | null = null;
}

class UpdateUniforms {
  u_boidConfig: WebGLUniformLocation | null = null;
  u_elapsedSeconds: WebGLUniformLocation | null = null;
}
class MapUniforms {
  u_boidConfig: WebGLUniformLocation | null = null;
}

interface Boid {
  pos: vec2;
  angle: number;
}

const MAX_BOIDS = 1000;
const BOID_FLOATS = 3;
const BOID_COLOR: vec4 = [0, 1, 0, 1];

// prettier-ignore
const BOIDS_VERTICES = [
  -1, -1,
  0, -0.5,
  0, 1,
  0, -0.5,
  1, -1,
  0, 1
];

class BoidsResources implements Deletable {
  static async create(container: SandboxContainer): Promise<BoidsResources> {
    const parameters: BoidsParameters = {
      count: 1,
      speed: 1,
      turnspeed: Math.PI * 0.8,
      fov: 180,
      viewdist: 8
    };
    window.hashlocation.parseParams(parameters);
    const renderProgram = await container.programLoader.loadProgram({
      vsSource: RENDER_VS,
      fsSource: RENDER_FS,
      uniformLocations: new RenderUniforms()
    });
    const updateProgram = await container.programLoader.loadProgram({
      vsSource: UPDATE_VS,
      fsSource: PASSTHROUGH_FS,
      uniformLocations: new UpdateUniforms(),
      varyings: { names: ['newData'], mode: VaryingBufferMode.INTERLEAVED_ATTRIBS }
    });
    const mapProgram = await container.programLoader.loadProgram({
      vsSource: MAP_VS,
      fsSource: PASSTHROUGH_FS,
      uniformLocations: new MapUniforms(),
      varyings: { names: ['target_dist'], mode: VaryingBufferMode.INTERLEAVED_ATTRIBS }
    });
    return new BoidsResources(container, parameters, renderProgram, updateProgram, mapProgram);
  }

  readonly boidSize: vec2 = [0, 0];

  readonly vertices: VertexBuffer<VertexAttributes>;

  frontDrawable: BoidsDrawable;
  backDrawable: BoidsDrawable;

  readonly transformFeedback: TransformFeedback;

  private _boidsCount = 0;

  constructor(
    readonly container: SandboxContainer,
    readonly parameters: BoidsParameters,
    readonly renderProgram: Program<never, RenderUniforms>,
    readonly updateProgram: Program<never, UpdateUniforms>,
    readonly mapProgram: Program<never, MapUniforms>
  ) {
    this.vertices = new VertexBuffer<VertexAttributes>(this.gl, { a_position: { size: 2 } });
    this.vertices.bind().setdata(BOIDS_VERTICES);

    this.backDrawable = new BoidsDrawable(this);
    this.frontDrawable = new BoidsDrawable(this);
    this.transformFeedback = new TransformFeedback(this.gl);

    this.renderProgram.use();
    this.gl.uniform4f(
      renderProgram.uniformLocations.u_boidColor,
      BOID_COLOR[0],
      BOID_COLOR[1],
      BOID_COLOR[2],
      BOID_COLOR[3]
    );
    this.updateBoidSize(container.dimension);
    this.updateParams();
    this.frontDrawable.renderDrawable.bind();
  }

  get gl(): WebGL2RenderingContext {
    return this.container.gl;
  }

  render(): void {
    this.frontDrawable.render(this._boidsCount);
  }

  update(dt: number): void {
    this.updateProgram.use();
    this.gl.uniform1f(this.updateProgram.uniformLocations.u_elapsedSeconds, dt);

    this.transformFeedback.bind().bindBuffer(0, this.backDrawable.boidsBuffer);
    this.gl.enable(WebGL2RenderingContext.RASTERIZER_DISCARD);

    this.transformFeedback.begin(TransformFeedbackDrawMode.POINTS);
    this.frontDrawable.update(this._boidsCount);
    this.transformFeedback.end();

    this.gl.disable(WebGL2RenderingContext.RASTERIZER_DISCARD);
    this.transformFeedback.unbindBuffer(0).unbind();

    const swap = this.frontDrawable;
    this.frontDrawable = this.backDrawable;
    this.backDrawable = swap;

    this.frontDrawable.renderDrawable.bind();
    this.renderProgram.use();
  }

  updateParams(): void {
    this.updateProgram.use();
    // x: boid speed, y: turn speed
    this.gl.uniform2f(
      this.updateProgram.uniformLocations.u_boidConfig,
      this.parameters.speed,
      this.parameters.turnspeed
    );

    this.mapProgram.use();
    this.gl.uniform2f(
      this.mapProgram.uniformLocations.u_boidConfig,
      Math.cos((this.parameters.fov / 2) * (Math.PI / 180)),
      this.boidSize[1] * this.parameters.viewdist
    );

    this.renderProgram.use();
    this.parameters.count = Math.min(MAX_BOIDS, this.parameters.count);
    if (this.parameters.count < this._boidsCount) {
      this._boidsCount = this.parameters.count;
    } else if (this.parameters.count > this._boidsCount) {
      const missing = this.parameters.count - this._boidsCount;
      const newBoids = this.randomizedBoids(missing);
      this.pushBoids(newBoids);
    }
  }

  delete(): void {
    this.frontDrawable.delete();
    this.backDrawable.delete();
    this.transformFeedback.delete();
    this.renderProgram.delete();
    this.updateProgram.delete();
  }

  private updateMap(): void {}

  private pushBoids(boids: Boid[]) {
    const dstOffset = this._boidsCount * BOID_FLOATS * 4;
    const array = this.boidsData(boids);
    this.frontDrawable.boidsBuffer.setsubdata(array, dstOffset);
    this._boidsCount += boids.length;
  }

  private boidsData(boids: Boid | Boid[]): Float32Array {
    if (!Array.isArray(boids)) boids = [boids];
    const array = new Float32Array(boids.length * BOID_FLOATS);
    boids.forEach((boid, index) => {
      const offset = index * BOID_FLOATS;
      array.set(boid.pos, offset); // xy
      array[offset + 2] = boid.angle; //z
    });
    return array;
  }

  updateBoidSize(dim: vec2): void {
    const width = 0.025;
    vec2.set(this.boidSize, width, width * (dim[0] / dim[1]));
    this.gl.uniform2f(this.renderProgram.uniformLocations.u_boidScale, this.boidSize[0] / 2, this.boidSize[1] / 2);
  }

  private randomizedBoids(count: number): Boid[] {
    const quadTree = new QuadTree();
    const bbox = new AABB([0, 0], [this.boidSize[0] / 2, this.boidSize[1] / 2]);
    const boids: Boid[] = [];
    for (let index = 0; index < count; index++) {
      const pos: vec2 = [0, 0];
      vec2.copy(bbox.center, this.randomPoint(pos));
      while (quadTree.query(bbox).length > 0) {
        vec2.copy(bbox.center, this.randomPoint(pos));
      }
      boids.push({ pos: pos, angle: Math.random() * 2 * Math.PI });
    }
    return boids;
  }

  private randomPoint(out: vec2): vec2 {
    return vec2.set(out, Math.random() * 2 - 1, Math.random() * 2 - 1);
  }
}

class BoidsDrawable implements Deletable {
  readonly boidsBuffer: VertexBuffer<BoidAttributes>;
  readonly renderDrawable: InstancedDrawable;
  readonly updateDrawable: GLDrawable;

  constructor(readonly resources: BoidsResources) {
    this.boidsBuffer = new VertexBuffer<BoidAttributes>(resources.gl, {
      a_boidData: { size: 3 }
    }).allocate(MAX_BOIDS * BOID_FLOATS * 4, BufferUsage.DYNAMIC_DRAW);

    this.renderDrawable = newDrawable(
      resources.gl,
      resources.vertices,
      this.boidsBuffer,
      { a_position: 0, a_boidData: 1 },
      DrawMode.TRIANGLES
    );

    this.updateDrawable = newDrawable(resources.gl, this.boidsBuffer, { a_boidData: 0 }, DrawMode.POINTS);
  }

  render(count: number): void {
    this.renderDrawable.draw(count);
  }

  update(count: number): void {
    this.updateDrawable.bind().draw(count);
  }

  delete() {
    this.boidsBuffer.delete();
    this.renderDrawable.delete();
  }
}

class GLBoids extends AbstractGLSandbox<BoidsResources, BoidsParameters> {
  constructor(container: SandboxContainer, name: string, resources: BoidsResources) {
    super(container, name, resources, resources.parameters);
    // this.running = true;
  }

  render(): void {
    this.clear([0.1, 0.1, 0.1, 1], WebGL2RenderingContext.COLOR_BUFFER_BIT | WebGL2RenderingContext.DEPTH_BUFFER_BIT);
    this.resources.render();
  }

  update(_time: number, dt: number): void {
    this.resources.update(dt);
  }

  onkeydown(e: KeyboardEvent): void {
    switch (e.key.toLowerCase()) {
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
    this.resources.updateBoidSize(dim);
  }
}

export function boids(): SandboxFactory<BoidsParameters> {
  return newSandboxFactory(
    BoidsResources.create,
    (container, name, resources) => new GLBoids(container, name, resources)
  );
}
