import { vec2 } from 'gl-matrix';
import {
  VertexArray,
  BufferUsage,
  TransformFeedbackDrawMode,
  BufferAttribute,
  VertexBuffer,
  Program,
  VaryingBufferMode,
  TransformFeedback,
  AbstractGLSandbox,
  SandboxContainer,
  SandboxFactory
} from 'gl';

interface ParticlesParameters {
  count: number;
  accel: number;
  speed: number;
}

const FLOAT_BYTES = 4;
const PARTICLES_FLOATS = 4;
const PARTICLES_BYTES = PARTICLES_FLOATS * FLOAT_BYTES;

enum TargetMode {
  ATTRACT = 0,
  REPUSLE = 1,
  RELAX = 2
}

class RenderUniforms {
  maxSpeed: WebGLUniformLocation | null = null;
}

class UpdateUniforms {
  acceleration: WebGLUniformLocation | null = null;
  maxSpeed: WebGLUniformLocation | null = null;
  mode: WebGLUniformLocation | null = null;
  elapsed: WebGLUniformLocation | null = null;
  target: WebGLUniformLocation | null = null;
}

class GLParticles extends AbstractGLSandbox<ParticlesParameters> {
  static async create(container: SandboxContainer, name: string): Promise<GLParticles> {
    const programs = await Promise.all([
      container.programLoader.load({
        path: 'particles/particles-render.glsl',
        uniformLocations: new RenderUniforms()
      }),
      container.programLoader.load({
        path: 'particles/particles-update.glsl',
        uniformLocations: new UpdateUniforms(),
        varyingMode: VaryingBufferMode.INTERLEAVED
      })
    ]);
    const parameters = { count: 500_000, accel: 4, speed: 2 };
    window.hashLocation.parseParams(parameters);
    return new GLParticles(container, name, parameters, programs[0], programs[1]);
  }

  readonly overlayContent: HTMLElement;

  private readonly particleBuffers: ParticleBuffers;
  private readonly transformFeedback: TransformFeedback;
  private readonly countSpan: HTMLElement;

  private _mode: TargetMode = TargetMode.ATTRACT;

  private readonly target = vec2.create();
  private newTarget?: vec2;

  private readonly dirty = {
    params: true,
    mode: true
  };

  constructor(
    container: SandboxContainer,
    name: string,
    parameters: ParticlesParameters,
    readonly renderProgram: Program<RenderUniforms>,
    readonly updateProgram: Program<UpdateUniforms>
  ) {
    super(container, name, parameters);

    this.particleBuffers = new ParticleBuffers(container.gl, parameters);
    this.particleBuffers.dataBuffer.bind();

    this.transformFeedback = new TransformFeedback(container.gl);
    this.overlayContent = document.createElement('div');
    this.countSpan = document.createElement('span');
    this.overlayContent.appendChild(this.countSpan);
    this.updateOverlay();

    this.mouseleave = this.mouseleave.bind(this);
    container.canvas.addEventListener('mouseleave', this.mouseleave);

    this.running = true;
  }

  render(): void {
    this.clear();
    const particleBuffers = this.particleBuffers;
    const renderProgram = this.renderProgram;
    renderProgram.use();
    if (this.dirty.params) {
      particleBuffers.dataBuffer.bind();

      const updateProgram = this.updateProgram;
      updateProgram.use();
      this.gl.uniform1f(updateProgram.uniformLocations.acceleration, this.parameters.accel);
      this.gl.uniform1f(updateProgram.uniformLocations.maxSpeed, this.parameters.speed);

      renderProgram.use();
      this.gl.uniform1f(this.renderProgram.uniformLocations.maxSpeed, this.parameters.speed);

      this.dirty.params = false;
    }

    if (particleBuffers.count < this.parameters.count) {
      particleBuffers.addParticles(this.parameters.count - particleBuffers.count);
      this.updateOverlay();
    } else if (particleBuffers.count > this.parameters.count) {
      particleBuffers.count = this.parameters.count;
      this.updateOverlay();
    }
    particleBuffers.draw();
  }

  update(_time: number, dt: number): void {
    const updateProgram = this.updateProgram;
    updateProgram.use();
    if (this.dirty.mode) {
      this.gl.uniform1i(updateProgram.uniformLocations.mode, this._mode);
      this.dirty.mode = false;
    }

    if (this.newTarget) {
      this.gl.uniform2f(updateProgram.uniformLocations.target, this.newTarget[0], this.newTarget[1]);
      this.newTarget = undefined;
    }

    this.gl.uniform1f(updateProgram.uniformLocations.elapsed, dt);

    this.transformFeedback.bind().bindBuffer(0, this.particleBuffers.targetBuffer.vbo);
    this.gl.enable(WebGL2RenderingContext.RASTERIZER_DISCARD);

    this.transformFeedback.begin(TransformFeedbackDrawMode.POINTS);
    this.particleBuffers.draw();
    this.transformFeedback.end();

    this.gl.disable(WebGL2RenderingContext.RASTERIZER_DISCARD);
    this.transformFeedback.unbindBuffer(0).unbind();

    this.particleBuffers.swap();
  }

  delete(): void {
    super.delete();
    this.container.canvas.removeEventListener('mouseleave', this.mouseleave);
  }

  onParametersChanged(): void {
    this.dirty.params = true;
  }

  onmousemove(event: MouseEvent): void {
    this.updateTarget(event);
  }

  onmousedown(event: MouseEvent): void {
    let mode: TargetMode;
    switch (event.button) {
      case 0:
        mode = TargetMode.REPUSLE;
        break;
      case 2:
        mode = TargetMode.RELAX;
        break;
      default:
        mode = TargetMode.ATTRACT;
        break;
    }
    this.mode = mode;
  }

  onmouseup(): void {
    this.mode = TargetMode.ATTRACT;
  }

  ontouchstart(event: TouchEvent): void {
    this.updateTarget(event);
    this.mode = TargetMode.REPUSLE;
  }

  ontouchmove(event: TouchEvent): void {
    this.updateTarget(event);
    if (this.mode === TargetMode.REPUSLE) this.mode = TargetMode.ATTRACT;
  }

  ontouchend(): void {
    this.mode = TargetMode.ATTRACT;
  }

  private mouseleave(): void {
    this.newTarget = vec2.set(this.target, 0, 0);
  }

  private updateTarget(e: TouchEvent | MouseEvent) {
    this.newTarget = this.clientToWorld(e, this.target);
  }

  private get mode(): TargetMode {
    return this._mode;
  }

  private set mode(mode: TargetMode) {
    this._mode = mode;
    this.dirty.mode = true;
  }

  updateOverlay(): void {
    this.countSpan.textContent = `${this.particleBuffers.count.toLocaleString()} particles`;
  }
}

interface ParticleAttributes {
  position: BufferAttribute;
  speed: BufferAttribute;
}

class ParticleBuffer {
  readonly vao: VertexArray;
  readonly vbo: VertexBuffer<ParticleAttributes>;

  constructor(readonly gl: WebGL2RenderingContext) {
    this.vbo = new VertexBuffer<ParticleAttributes>(gl, {
      position: { size: 2 },
      speed: { size: 2 }
    }).bind();
    this.vao = new VertexArray(gl).bind().mapAttributes(this.vbo, {
      position: 0,
      speed: 1
    });
  }

  bind(): ParticleBuffer {
    this.vbo.bind();
    this.vao.bind();
    return this;
  }

  unbind(): ParticleBuffer {
    this.vao.unbind();
    this.vbo.unbind();
    return this;
  }

  delete(): void {
    this.vao.delete();
    this.vbo.delete();
  }
}

class ParticleBuffers {
  private buffers: ParticleBuffer[];

  // in particles count
  private _capacity = 0;
  private _count = 0;
  private _dataIndex = 0;

  constructor(readonly gl: WebGL2RenderingContext, readonly params: ParticlesParameters) {
    this.buffers = [new ParticleBuffer(gl), new ParticleBuffer(gl)];
    this.createParticles(params.count);
  }

  get count(): number {
    return this._count;
  }

  set count(newCount: number) {
    this._count = newCount;
  }

  get dataBuffer(): ParticleBuffer {
    return this.buffers[this._dataIndex];
  }

  get targetBuffer(): ParticleBuffer {
    return this.buffers[1 - this._dataIndex];
  }

  addParticles(count: number): number {
    this.ensureCapacity(this.count + count);
    count = Math.min(count, 10_000);
    const buffer = new Float32Array(count * PARTICLES_FLOATS);
    this.randomizeParticles(buffer, count);
    this.dataBuffer.vbo.setsubdata(buffer, this._count * PARTICLES_BYTES, 0, count * PARTICLES_FLOATS);
    this._count += count;
    return this._count;
  }

  createParticles(count: number): void {
    this.ensureCapacity(count);
    const particles = new Float32Array(count * PARTICLES_FLOATS);
    this.randomizeParticles(particles);
    this.dataBuffer.bind().vbo.setsubdata(particles, 0);
    this._count = count;
  }

  swap() {
    this._dataIndex = 1 - this._dataIndex;
    this.dataBuffer.bind();
  }

  draw() {
    this.gl.drawArrays(WebGLRenderingContext.POINTS, 0, this._count);
  }

  delete() {
    this.buffers.forEach(buffer => buffer.delete());
  }

  private ensureCapacity(requiredCapacity: number): void {
    if (this._capacity < requiredCapacity) {
      const newSize = requiredCapacity * PARTICLES_BYTES;
      this.targetBuffer.vbo.bind().allocate(newSize, BufferUsage.DYNAMIC_DRAW).unbind();

      this.dataBuffer.bind();
      if (this._count > 0) {
        const particles = new Float32Array(this._count * PARTICLES_FLOATS);
        this.dataBuffer.vbo.getsubdata(particles).allocate(newSize, BufferUsage.DYNAMIC_DRAW).setsubdata(particles, 0);
      } else {
        this.dataBuffer.vbo.allocate(newSize, BufferUsage.DYNAMIC_DRAW);
      }

      this._capacity = requiredCapacity;
    }
  }

  private randomizeParticles(buffer: Float32Array, count = buffer.length): void {
    const range = Math.sqrt(this.params.speed * 2);
    const halfRange = range / 2;
    let pos = 0;
    for (let i = 0; i < count; i++) {
      // position
      buffer[pos++] = Math.random() * 2 - 1;
      buffer[pos++] = Math.random() * 2 - 1;
      // velocity
      buffer[pos++] = Math.random() * range - halfRange;
      buffer[pos++] = Math.random() * range - halfRange;
    }
  }
}

export function glparticles(): SandboxFactory<ParticlesParameters> {
  return GLParticles.create;
}
