import { Deletable } from '../gl/utils/GLUtils';
import { SandboxContainer, SandboxFactory } from '../gl/sandbox/GLSandbox';
import { AbstractGLSandbox, newSandboxFactory } from '../gl/sandbox/AbstractGLSandbox';
import { vec2, vec4 } from 'gl-matrix';
import { BufferUsage, DrawMode } from '../gl/buffers/BufferEnums';
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
// import UPDATE_VS from 'assets/shaders/boids/boids-update.vs.glsl';
// @ts-ignore
// import UPDATE_FS from 'assets/shaders/boids/boids-update.fs.glsl';

import { GLTexture2D } from '../gl/texture/GLTexture';
import { TextureMagFilter, TextureMinFilter } from '../gl/texture/TextureEnums';
import { FrameBuffer } from '../gl/buffers/FrameBuffer';
import { newQuadDrawable, QUAD_VS } from '../gl/buffers/GLDrawables';
import { BufferAttribute, VertexBuffer } from '../gl/buffers/VertexBuffer';
import { GLDrawable, InstancedDrawable, newDrawable } from '../gl/buffers/GLDrawable';

interface BoidsParameters {
  count: number;
  accel: number;
  speed: number;
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

class DebugUniforms {
  u_boidsMap: WebGLUniformLocation | null = null;
}

class BoidsResources implements Deletable {
  static async create(container: SandboxContainer): Promise<BoidsResources> {
    const parameters = { count: 1, accel: 4, speed: 2 };
    window.hashlocation.parseParams(parameters);
    const renderProgram = await container.programLoader.loadProgram({
      vsSource: RENDER_VS,
      fsSource: RENDER_FS,
      uniformLocations: new RenderUniforms()
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
    return new BoidsResources(container, parameters, renderProgram, mapProgram, debugProgram);
  }

  readonly boidSize: vec2 = [0, 0];

  readonly boidsBuffer: VertexBuffer<BoidAttributes>;

  readonly renderDrawable: InstancedDrawable;
  readonly mapDrawable: GLDrawable;

  readonly mapTexture: GLTexture2D;
  readonly frameBuffer: FrameBuffer;

  readonly debugDrawable: GLDrawable;

  constructor(
    readonly container: SandboxContainer,
    readonly parameters: BoidsParameters,
    readonly renderProgram: Program<never, RenderUniforms>,
    readonly mapProgram: Program,
    readonly debugProgram: Program<never, DebugUniforms>
  ) {
    this.updateBoidSize(container.dimension);
    renderProgram.use();
    container.gl.uniform2f(this.renderProgram.uniformLocations.u_boidScale, this.boidSize[0] / 2, this.boidSize[1] / 2);

    const vertices = new VertexBuffer<VertexAttributes>(this.gl, {
      a_position: { size: 2 }
    })
      .bind()
      .setdata(BOIDS_VERTICES);
    this.boidsBuffer = new VertexBuffer<BoidAttributes>(this.gl, {
      a_boidData: { size: 4 },
      a_boidColor: { size: 4 }
    });

    this.renderDrawable = newDrawable(
      this.gl,
      vertices,
      this.boidsBuffer,
      {
        a_position: renderProgram.attributeLocation('a_position'),
        a_boidData: renderProgram.attributeLocation('a_boidData'),
        a_boidColor: renderProgram.attributeLocation('a_boidColor')
      },
      DrawMode.TRIANGLES
    );

    this.mapTexture = new GLTexture2D(this.gl)
      .bind()
      .minFilter(TextureMinFilter.NEAREST)
      .magFilter(TextureMagFilter.NEAREST)
      .data({
        width: 2 / this.boidSize[0],
        height: 2 / this.boidSize[1]
      });

    this.frameBuffer = new FrameBuffer(this.gl);
    mapProgram.use();
    this.mapDrawable = newDrawable(
      this.gl,
      this.boidsBuffer,
      {
        a_boidData: mapProgram.attributeLocation('a_boidData'),
        a_boidColor: -1
      },
      DrawMode.POINTS
    );

    new BoidBuffer(2)
      .push([
        { pos: [0.5, 0.25], angle: 2.5, speed: 0, color: BOID_COLOR },
        { pos: [-0.5, -0.25], angle: 1, speed: 0, color: BOID_COLOR }
      ])
      .update(this.boidsBuffer);

    this.drawMap();

    //BoidBuffer.randomizedBoids(container.dimension, 10).update();
    this.debugDrawable = newQuadDrawable(this.gl);
    debugProgram.use();
    this.gl.uniform1i(debugProgram.uniformLocations.u_boidsMap, 0);
  }

  drawBoids(): void {
    this.renderProgram.use();
    this.renderDrawable.bind().draw();
  }

  drawDebug() {
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
    this.mapDrawable.bind().draw();

    this.frameBuffer.detach().unbind();

    const dim = this.container.dimension;
    this.gl.viewport(0, 0, dim[0], dim[1]);
  }

  get gl(): WebGL2RenderingContext {
    return this.container.gl;
  }

  private updateBoidSize(dim: vec2): void {
    const width = 0.025;
    vec2.set(this.boidSize, width, width * (dim[0] / dim[1]));
  }

  update(time = 0): void {
    // todo
  }

  updateParams(): void {
    // TODO
  }

  delete(): void {
    this.renderDrawable.delete();
    this.renderProgram.delete();
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
    if (this.drawMap) this.resources.drawDebug();
    else this.resources.drawBoids();
  }

  update(time: number): void {
    this.resources.update(time);
  }

  onkeydown(e: KeyboardEvent): void {
    switch (e.key.toLowerCase()) {
      case 'm':
        this.drawMap = !this.drawMap;
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

export function boids(): SandboxFactory<BoidsParameters> {
  return newSandboxFactory(
    BoidsResources.create,
    (container, name, resources) => new GLBoids(container, name, resources)
  );
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
    buffer.setdata(this.array, BufferUsage.DYNAMIC_DRAW, 0, this._count * BOID_FLOATS);
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
