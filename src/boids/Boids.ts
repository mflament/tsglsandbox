import { Deletable } from '../gl/utils/GLUtils';
import { SandboxContainer, SandboxFactory } from '../gl/sandbox/GLSandbox';
import { AbstractGLSandbox, newSandboxFactory } from '../gl/sandbox/AbstractGLSandbox';
import { vec2, vec4 } from 'gl-matrix';
import { DrawMode } from '../gl/buffers/BufferEnums';
import { Program } from '../gl/shader/Program';
import { BufferAttribute, VertexBuffer } from '../gl/buffers/VertexBuffer';
import { IndexedDrawable, InstancedDrawable } from '../gl/drawable/GLDrawable';
import { TransformFeedback } from '../gl/shader/TransformFeedback';
import { AABB, QuadTree } from '../utils/QuadTree';
import { GLTexture2D, SizedData, BaseTextureData } from '../gl/texture/GLTexture';
import {
  InternalFormat,
  TextureComponentType,
  TextureFormat,
  TextureMagFilter,
  TextureMinFilter,
  TextureWrappingMode
} from '../gl/texture/TextureEnums';
import { FrameBuffer, FrameBufferStatus, frameBufferStatusName } from '../gl/buffers/FrameBuffer';
import { newQuadDrawable } from '../gl/drawable/QuadDrawable';

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

class RenderUniforms {
  u_boidData: WebGLUniformLocation | null = null;
  u_boidConfig: WebGLUniformLocation | null = null;
  u_boidColor: WebGLUniformLocation | null = null;
  u_boidCount: WebGLUniformLocation | null = null;
  u_scanTexture: WebGLUniformLocation | null = null;
}

class UpdateUniforms {
  u_boidData: WebGLUniformLocation | null = null;
  u_boidConfig: WebGLUniformLocation | null = null;
  u_updateConfig: WebGLUniformLocation | null = null;
  u_elapsedSeconds: WebGLUniformLocation | null = null;
  u_boidCount: WebGLUniformLocation | null = null;
  u_scanTexture: WebGLUniformLocation | null = null;
}

class ScanUniforms {
  u_boidData: WebGLUniformLocation | null = null;
  u_boidConfig: WebGLUniformLocation | null = null;
}

interface Boid {
  pos: vec2;
  angle: number;
}

const MAX_BOIDS = 256;
const BOID_FLOATS = 4;
const BOID_COLOR: vec4 = [0, 1, 0, 1];

// prettier-ignore
const BOIDS_VERTICES = [
  -0.25, 0,
  0.5, 0,
  -0.5, 0.5,
  -0.25, 0,
  -0.5, -0.5,
  0.5, 0
];

class BoidsResources implements Deletable {
  static async create(container: SandboxContainer): Promise<BoidsResources> {
    // without this we can't render to RGBA32F
    if (!container.gl.getExtension('EXT_color_buffer_float')) throw new Error('need EXT_color_buffer_float');
    // just guessing without this we can't downsample
    if (!container.gl.getExtension('OES_texture_float_linear')) throw new Error('need OES_texture_float_linear');

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
    // const renderProgram = await container.programLoader.load({
    //   vspath: 'quad.vs.glsl',
    //   fspath: 'boids/boids-debug.fs.glsl',
    //   uniformLocations: new RenderUniforms()
    // });
    const updateProgram = await container.programLoader.load({
      vspath: 'quad.vs.glsl',
      fspath: 'boids/boids-update.fs.glsl',
      uniformLocations: new UpdateUniforms()
    });
    const scanProgram = await container.programLoader.load({
      vspath: 'quad.vs.glsl',
      fspath: 'boids/boids-scan.fs.glsl',
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
      .wrap(TextureWrappingMode.CLAMP_TO_EDGE)
      .data({
        internalFormat: InternalFormat.RGBA32F,
        format: TextureFormat.RGBA,
        type: TextureComponentType.FLOAT,
        width: MAX_BOIDS,
        height: MAX_BOIDS
      });

    this.renderProgram.use();
    this.gl.uniform4f(
      renderProgram.uniformLocations.u_boidColor,
      BOID_COLOR[0],
      BOID_COLOR[1],
      BOID_COLOR[2],
      BOID_COLOR[3]
    );
    this.gl.uniform1i(renderProgram.uniformLocations.u_boidData, 0);
    this.gl.uniform1i(renderProgram.uniformLocations.u_scanTexture, 1);

    this.updateProgram.use();
    this.gl.uniform1i(updateProgram.uniformLocations.u_boidData, 0);
    this.gl.uniform1i(updateProgram.uniformLocations.u_scanTexture, 1);

    this.scanProgram.use();
    this.gl.uniform1i(scanProgram.uniformLocations.u_boidData, 0);

    // this.pushBoids([
    //   { pos: [0, 0], angle: 0 },
    //   { pos: [0, 0.1], angle: 0 },
    //   { pos: [-0.5, 0], angle: 0 },
    //   { pos: [-0.1, 0.1], angle: 0 }
    // ]);

    this.updateBoidSize(container.dimension);

    this.frontDrawable.renderDrawable.bind();

    this.scanBoids();

    this.renderProgram.use();
  }

  get gl(): WebGL2RenderingContext {
    return this.container.gl;
  }

  render(): void {
    this.scanTexture.activate(1).bind();
    this.frontDrawable.boidsData.activate(0).bind();
    this.frontDrawable.render(this._boidsCount);
  }

  update(dt: number): void {
    this.scanBoids();

    this.frameBuffer.bind().attach(this.backDrawable.boidsData);

    this.gl.viewport(0, 0, this._boidsCount, 1);
    this.gl.clearColor(0, 0, 0, 1);
    this.gl.clear(WebGL2RenderingContext.COLOR_BUFFER_BIT);

    this.updateProgram.use();
    this.gl.uniform1f(this.updateProgram.uniformLocations.u_elapsedSeconds, dt);
    this.frontDrawable.update();
    this.checkFrameBufferStatus();
    this.frameBuffer.detach().unbind();

    this.gl.viewport(0, 0, this.container.dimension[0], this.container.dimension[1]);

    const swap = this.frontDrawable;
    this.frontDrawable = this.backDrawable;
    this.backDrawable = swap;

    this.renderProgram.use();
    this.frontDrawable.boidsData.bind().activate(0);
    this.frontDrawable.renderDrawable.bind();
  }

  private scanBoids(): void {
    this.frameBuffer.bind().attach(this.scanTexture);

    this.gl.viewport(0, 0, this._boidsCount, this._boidsCount);
    this.gl.clearColor(0, 0, 0, 1);
    this.gl.clear(WebGL2RenderingContext.COLOR_BUFFER_BIT);

    this.scanProgram.use();
    this.frontDrawable.boidsData.activate(0).bind();
    this.frontDrawable.scan();
    this.checkFrameBufferStatus();
    this.frameBuffer.detach().unbind();

    this.gl.viewport(0, 0, this.container.dimension[0], this.container.dimension[1]);
    this.renderProgram.use();
    this.frontDrawable.renderDrawable.bind();
  }

  updateParams(): void {
    this.parameters.count = Math.min(MAX_BOIDS, this.parameters.count);
    if (this.parameters.count != this._boidsCount) {
      if (this.parameters.count < this._boidsCount) {
        this._boidsCount = this.parameters.count;
      } else if (this.parameters.count > this._boidsCount) {
        const missing = this.parameters.count - this._boidsCount;
        const newBoids = this.randomizedBoids(missing);
        this.pushBoids(newBoids);
      }
    }

    this.updateProgram.use();
    this.updateBoidConfig(this.updateProgram.uniformLocations.u_boidConfig);
    // x: boid speed, y: turn speed
    this.gl.uniform1i(this.updateProgram.uniformLocations.u_boidCount, this._boidsCount);
    this.gl.uniform2f(
      this.updateProgram.uniformLocations.u_updateConfig,
      this.parameters.speed,
      this.parameters.turnspeed
    );

    this.scanProgram.use();
    this.updateBoidConfig(this.scanProgram.uniformLocations.u_boidConfig);

    this.renderProgram.use();
    this.updateBoidConfig(this.renderProgram.uniformLocations.u_boidConfig);
    this.gl.uniform1i(this.renderProgram.uniformLocations.u_boidCount, this._boidsCount);
  }

  updateBoidSize(dim: vec2): void {
    const width = 2.0 / 100;
    vec2.set(this.boidSize, width, width * (dim[0] / dim[1]));
    this.updateParams();
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

  private checkFrameBufferStatus(): void {
    const status = this.frameBuffer.status;
    if (status != FrameBufferStatus.COMPLETE) console.error(frameBufferStatusName(this.frameBuffer.status));
  }

  private updateBoidConfig(location: WebGLUniformLocation | null): void {
    const scalex = this.boidSize[0];
    const scaley = this.boidSize[1];
    const fov = Math.cos((this.parameters.fov / 2) * (Math.PI / 180));
    const viewdist = this.parameters.viewdist * 2.0 * this.boidSize[1];
    this.gl.uniform4f(location, scalex, scaley, viewdist, fov);
  }

  private pushBoids(boids: Boid[]) {
    const array = this.boidsData(boids);
    this.frontDrawable.boidsData
      .bind()
      .subdata({
        buffer: array,
        ...this.dataTextureConfig(boids.length),
        x: this._boidsCount,
        y: 0
      })
      .unbind();
    this._boidsCount += boids.length;
  }

  private boidsData(boids: Boid | Boid[]): Float32Array {
    if (!Array.isArray(boids)) boids = [boids];
    const array = new Float32Array(boids.length * BOID_FLOATS);
    boids.forEach((boid, index) => {
      const offset = index * BOID_FLOATS;
      array.set(boid.pos, offset); // xy
      array[offset + 2] = boid.angle; //z
      array[offset + 3] = 1.0; // w: unused
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
    return vec2.set(out, Math.random() * 1.9 - 0.95, Math.random() * 1.9 - 0.95);
  }

  dataTextureConfig(count: number): BaseTextureData & SizedData {
    return {
      height: 1,
      width: count,
      format: TextureFormat.RGBA,
      type: TextureComponentType.FLOAT
    };
  }
}

class BoidsDrawable implements Deletable {
  readonly boidsData: GLTexture2D;

  readonly renderDrawable: InstancedDrawable;
  readonly scanDrawable: IndexedDrawable;
  readonly updateDrawable: IndexedDrawable;

  constructor(readonly resources: BoidsResources) {
    this.boidsData = new GLTexture2D(resources.gl)
      .bind()
      .minFilter(TextureMinFilter.LINEAR)
      .magFilter(TextureMagFilter.LINEAR)
      .wrap(TextureWrappingMode.CLAMP_TO_EDGE)
      .data({
        internalFormat: InternalFormat.RGBA32F,
        ...resources.dataTextureConfig(MAX_BOIDS)
      })
      .unbind();

    this.renderDrawable = new InstancedDrawable(resources.gl, DrawMode.TRIANGLES, {
      buffer: resources.vertices,
      locations: { a_position: 0 }
    });

    //this.updateDrawable = new InstancedDrawable(resources.gl, DrawMode.POINTS);
    this.updateDrawable = newQuadDrawable(resources.gl);
    this.scanDrawable = newQuadDrawable(resources.gl);
  }

  render(count: number): void {
    this.renderDrawable.draw(count);
  }

  update(): void {
    this.updateDrawable.bind().draw();
  }

  scan(): void {
    this.scanDrawable.bind().draw();
  }

  delete() {
    [this.boidsData, this.renderDrawable].forEach(d => d.delete());
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
