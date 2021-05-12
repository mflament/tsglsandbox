import { Deletable } from '../gl/utils/GLUtils';
import { SandboxContainer, SandboxFactory } from '../gl/sandbox/GLSandbox';
import { AbstractGLSandbox, newSandboxFactory } from '../gl/sandbox/AbstractGLSandbox';
import { vec2, vec4 } from 'gl-matrix';
import { BufferUsage, DrawMode, TransformFeedbackDrawMode } from '../gl/buffers/BufferEnums';
import { Program, VaryingBufferMode } from '../gl/shader/Program';
import { BufferAttribute, VertexBuffer } from '../gl/buffers/VertexBuffer';
import { GLDrawable, newDrawable, newInstancedDrawable } from '../gl/drawable/GLDrawable';
import { TransformFeedback } from '../gl/shader/TransformFeedback';
import { AABB, QuadTree } from '../utils/QuadTree';
import { GLTexture2D } from '../gl/texture/GLTexture';
import {
  InternalFormat,
  TextureComponentType,
  TextureFormat,
  TextureMagFilter,
  TextureMinFilter
} from '../gl/texture/TextureEnums';
import { FrameBuffer } from '../gl/buffers/FrameBuffer';

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
  u_boidConfig: WebGLUniformLocation | null = null;
  u_boidColor: WebGLUniformLocation | null = null;
  u_scanTexture: WebGLUniformLocation | null = null;
}

class UpdateUniforms {
  u_boidConfig: WebGLUniformLocation | null = null;
  u_elapsedSeconds: WebGLUniformLocation | null = null;
}
class ScanUniforms {
  u_boidsCount: WebGLUniformLocation | null = null;
}

interface Boid {
  pos: vec2;
  angle: number;
}

const MAX_BOIDS = 1024;
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
      fov: 140,
      viewdist: 4
    };
    window.hashlocation.parseParams(parameters);
    const renderProgram = await container.programLoader.load({
      path: 'boids/boids-render.glsl',
      uniformLocations: new RenderUniforms()
    });
    const updateProgram = await container.programLoader.load({
      path: 'boids/boids-update.glsl',
      uniformLocations: new UpdateUniforms(),
      varyingMode: VaryingBufferMode.INTERLEAVED
    });
    const scanProgram = await container.programLoader.load({
      path: 'boids/boids-scan.glsl',
      uniformLocations: new ScanUniforms()
    });
    return new BoidsResources(container, parameters, renderProgram, updateProgram, scanProgram);
  }

  private _boidsCount = 0;

  readonly boidSize: vec2 = [0, 0];
  readonly vertices: VertexBuffer<VertexAttributes>;
  readonly transformFeedback: TransformFeedback;
  readonly frameBuffer: FrameBuffer;

  frontDrawable: BoidsDrawable;
  backDrawable: BoidsDrawable;

  scanTexture: GLTexture2D;

  constructor(
    readonly container: SandboxContainer,
    readonly parameters: BoidsParameters,
    readonly renderProgram: Program<RenderUniforms>,
    readonly updateProgram: Program<UpdateUniforms>,
    readonly scanProgram: Program<ScanUniforms>
  ) {
    this.vertices = new VertexBuffer<VertexAttributes>(this.gl, { a_position: { size: 2 } });
    this.vertices.bind().setdata(BOIDS_VERTICES);

    this.frontDrawable = new BoidsDrawable(this);
    this.backDrawable = new BoidsDrawable(this);
    this.transformFeedback = new TransformFeedback(this.gl);
    this.frameBuffer = new FrameBuffer(this.gl);
    this.scanTexture = new GLTexture2D(this.gl)
      .bind()
      .minFilter(TextureMinFilter.NEAREST)
      .magFilter(TextureMagFilter.NEAREST)
      .activate(0);

    this.renderProgram.use();
    this.gl.uniform4f(
      renderProgram.uniformLocations.u_boidColor,
      BOID_COLOR[0],
      BOID_COLOR[1],
      BOID_COLOR[2],
      BOID_COLOR[3]
    );
    this.gl.uniform1i(renderProgram.uniformLocations.u_scanTexture, 0);
    this.updateBoidSize(container.dimension);

    // this.pushBoids([
    //   { pos: [0.45, 0], angle: -Math.PI / 10 },
    //   { pos: [0.45, this.boidSize[1] * 2], angle: 0 },
    //   { pos: [0.4, this.boidSize[1] * 2], angle: 0 },
    //   { pos: [0.5, 0], angle: 0 },
    //   { pos: [0.45, -0.05], angle: 0 }
    // ]);
    // this.updateScanTexture();

    this.updateParams();

    this.frontDrawable.renderDrawable.bind();

    this.scanBoids();
    this.renderProgram.use();
    this.frontDrawable.renderDrawable.bind();
  }

  get gl(): WebGL2RenderingContext {
    return this.container.gl;
  }

  render(): void {
    this.frontDrawable.render(this._boidsCount);
  }

  update(dt: number): void {
    this.scanBoids();

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

  private scanBoids(): void {
    this.frameBuffer.bind().attach(this.scanTexture);

    this.gl.viewport(0, 0, this._boidsCount, this._boidsCount);
    this.gl.clearColor(0, 0, 0, 1);
    this.gl.clear(WebGL2RenderingContext.COLOR_BUFFER_BIT);

    this.scanProgram.use();
    this.frontDrawable.scan(this._boidsCount);
    this.frameBuffer.detach().unbind();

    this.gl.viewport(0, 0, this.container.dimension[0], this.container.dimension[1]);
  }

  updateParams(): void {
    this.updateProgram.use();
    // x: boid speed, y: turn speed
    this.gl.uniform2f(
      this.updateProgram.uniformLocations.u_boidConfig,
      this.parameters.speed,
      this.parameters.turnspeed
    );

    this.updateRenderBoidConfig();

    this.parameters.count = Math.min(MAX_BOIDS, this.parameters.count);
    if (this.parameters.count != this._boidsCount) {
      if (this.parameters.count < this._boidsCount) {
        this._boidsCount = this.parameters.count;
      } else if (this.parameters.count > this._boidsCount) {
        const missing = this.parameters.count - this._boidsCount;
        const newBoids = this.randomizedBoids(missing);
        this.pushBoids(newBoids);
      }

      this.scanProgram.use();
      this.gl.uniform1i(this.scanProgram.uniformLocations.u_boidsCount, this._boidsCount);

      this.updateScanTexture();
    }

    this.renderProgram.use();
  }

  private updateScanTexture(): void {
    this.gl.pixelStorei(WebGL2RenderingContext.UNPACK_ALIGNMENT, 1);
    const textureData = new Uint8Array(this._boidsCount * this._boidsCount * 4);
    this.scanTexture.data({
      buffer: textureData,
      width: this._boidsCount,
      height: this._boidsCount,
      internalFormat: InternalFormat.RGBA,
      format: TextureFormat.RGBA,
      type: TextureComponentType.UNSIGNED_BYTE
    });
  }

  updateBoidSize(dim: vec2): void {
    const width = 0.025;
    vec2.set(this.boidSize, width, width * (dim[0] / dim[1]));
    this.updateRenderBoidConfig();
  }

  private updateRenderBoidConfig(): void {
    this.renderProgram.use();
    this.gl.uniform4f(
      this.renderProgram.uniformLocations.u_boidConfig,
      this.boidSize[0] / 2, // scale.x
      this.boidSize[1] / 2, // scale.y
      Math.cos((this.parameters.fov / 2) * (Math.PI / 180)), // fov (dot limit)
      this.parameters.viewdist * 2.0 * this.boidSize[1] // view dist
    );
  }

  delete(): void {
    [
      this.frameBuffer,
      this.transformFeedback,
      this.frontDrawable,
      this.backDrawable,
      this.renderProgram,
      this.updateProgram,
      this.scanTexture,
      this.scanProgram
    ].forEach(d => d.delete());
  }

  private pushBoids(boids: Boid[]) {
    const dstOffset = this._boidsCount * BOID_FLOATS * 4;
    const array = this.boidsData(boids);
    this.frontDrawable.boidsBuffer.bind().setsubdata(array, dstOffset).unbind();
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
  readonly renderDrawable: GLDrawable;
  readonly scanDrawable: GLDrawable;
  readonly updateDrawable: GLDrawable;

  constructor(readonly resources: BoidsResources) {
    // this.renderDrawable = newQuadDrawable(this.resources.gl);

    this.boidsBuffer = new VertexBuffer<BoidAttributes>(resources.gl, {
      a_boidData: { size: 3 }
    }).allocate(MAX_BOIDS * BOID_FLOATS * 4, BufferUsage.DYNAMIC_DRAW);

    this.renderDrawable = newInstancedDrawable(
      resources.gl,
      resources.vertices,
      { a_position: 0 },
      this.boidsBuffer,
      { a_boidData: 1 },
      DrawMode.TRIANGLES
    );

    this.updateDrawable = newDrawable(resources.gl, this.boidsBuffer, { a_boidData: 0 }, DrawMode.POINTS);

    this.scanDrawable = newInstancedDrawable(
      resources.gl,
      this.boidsBuffer,
      { a_boidData: 0 },
      this.boidsBuffer,
      { a_boidData: 1 },
      DrawMode.POINTS
    );
  }

  render(count: number): void {
    this.renderDrawable.draw(count);
    // this.renderDrawable.bind().draw();
  }

  update(count: number): void {
    this.updateDrawable.bind().draw(count);
  }

  scan(count: number): void {
    this.scanDrawable.bind().draw(count, count);
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
    this.clear([0.1, 0.1, 0.1, 1], WebGL2RenderingContext.COLOR_BUFFER_BIT);
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
