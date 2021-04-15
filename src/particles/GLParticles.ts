import { BufferUsage, TransformFeedbackDrawMode, VertexComponentType } from '../gl/buffers/BufferEnums';
import { VertexBuffer } from '../gl/buffers/VertexBuffer';
import { VertextArray } from '../gl/buffers/VertextArray';
import { Deletable } from '../gl/gl-utils';
import { AbstractGLSandbox } from '../gl/sandbox/AbstractGLSandbox';
import { SandboxContainer } from '../gl/sandbox/GLSandbox';
import { Program } from '../gl/shader/Program';
import { TransformFeedback } from '../gl/shader/TransformFeedback';

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

interface RenderUniforms {
  maxSpeed: WebGLUniformLocation | null;
}

interface UpdateUniforms {
  acceleration: WebGLUniformLocation | null;
  maxSpeed: WebGLUniformLocation | null;
  mode: WebGLUniformLocation | null;
  elapsed: WebGLUniformLocation | null;
  target: WebGLUniformLocation | null;
}

interface Resources extends Deletable {
  particleBuffers: ParticleBuffers;
  renderProgram: Program<RenderUniforms>;
  updateProgram: Program<UpdateUniforms>;
  transformFeedback: TransformFeedback;
  overlayContent: HTMLElement;
}

export class GLParticles extends AbstractGLSandbox<ParticlesParameters> {
  private renderUniforms: RenderUniforms = { maxSpeed: null };

  private updateUniforms: UpdateUniforms = {
    acceleration: null,
    maxSpeed: null,
    mode: null,
    elapsed: null,
    target: null
  };

  private _resources?: Resources;
  private lastTime = -1;
  private _mode: TargetMode = TargetMode.ATTRACT;

  private readonly target = { x: 0, y: 0 };
  private readonly dirty = {
    params: true,
    mode: true,
    target: true
  };

  constructor() {
    super('particles', { count: 500000, accel: 4, speed: 2 });
  }

  async setup(container: SandboxContainer): Promise<void> {
    super.setup(container);

    const programs = await Promise.all([
      this.loadProgram({
        vsSource: 'shaders/particles/particles-render.vs.glsl',
        fsSource: 'shaders/particles/particles-render.fs.glsl',
        uniformLocations: this.renderUniforms
      }),
      this.loadProgram({
        vsSource: 'shaders/particles/particles-update.vs.glsl',
        fsSource: 'shaders/particles/particles-update.fs.glsl',
        uniformLocations: this.updateUniforms,
        varyings: ['outputPosition', 'outputSpeed']
      })
    ]);

    this._resources = {
      renderProgram: programs[0],
      updateProgram: programs[1],
      particleBuffers: new ParticleBuffers(this.gl, this.parameters),
      transformFeedback: new TransformFeedback(this.gl),
      overlayContent: this.createOverlayContent(),
      delete() {
        this.renderProgram.delete();
        this.updateProgram.delete();
        this.particleBuffers.delete();
        this.transformFeedback.delete;
      }
    };

    this.mouseleave = this.mouseleave.bind(this);
    container.canvas.addEventListener('mouseleave', this.mouseleave);
  }

  onParametersChanged(): void {
    if (!this._resources) return;
    this.dirty.params = true;
    this.overlayContent.innerHTML = this.createOverlaySpan();
  }

  delete(): void {
    if (this._resources) {
      this._resources.delete();
      this._resources = undefined;
      this.container.canvas.removeEventListener('mouseleave', this.mouseleave);
    }
  }

  onmousemove(event: MouseEvent): void {
    this.setClientTarget(event.offsetX, event.offsetY);
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
    this.setClientTarget(event.touches[0].clientX, event.touches[0].clientY);
    this.mode = TargetMode.REPUSLE;
  }

  ontouchmove(event: TouchEvent): void {
    this.setClientTarget(event.touches[0].clientX, event.touches[0].clientY);
    if (this.mode === TargetMode.REPUSLE) this.mode = TargetMode.ATTRACT;
  }

  ontouchend(): void {
    this.mode = TargetMode.ATTRACT;
  }

  get overlayContent(): HTMLElement {
    return this.resources.overlayContent;
  }

  render(time: number): void {
    if (!this._resources) return;
    const resources = this._resources;
    this.resources.updateProgram.use();

    if (this.dirty.params) {
      resources.particleBuffers.ensureCapacity(this.parameters.count);

      resources.renderProgram.use();
      this.gl.uniform1f(this.renderUniforms.maxSpeed, this.parameters.speed);

      resources.updateProgram.use();
      this.gl.uniform1f(this.updateUniforms.acceleration, this.parameters.accel);
      this.gl.uniform1f(this.updateUniforms.maxSpeed, this.parameters.speed);

      this.dirty.params = false;
      resources.particleBuffers.dataBuffer.bind();
    }

    if (resources.particleBuffers.count < this.parameters.count) {
      resources.particleBuffers.addParticles(this.parameters.count - resources.particleBuffers.count);
    } else if (resources.particleBuffers.count > this.parameters.count) {
      resources.particleBuffers.count = this.parameters.count;
    }

    if (this.dirty.mode) {
      this.gl.uniform1i(this.updateUniforms.mode, this._mode);
      this.dirty.mode = false;
    }

    if (this.dirty.target) {
      this.gl.uniform2f(this.updateUniforms.target, this.target.x, this.target.y);
      this.dirty.target = false;
    }

    const dt = this.lastTime < 0 ? 0 : (time - this.lastTime) / 1000;
    this.gl.uniform1f(this.updateUniforms.elapsed, dt);
    this.update(resources);

    resources.renderProgram.use();
    resources.particleBuffers.draw();

    this.lastTime = time;
  }

  private update(res: Resources) {
    const tf = res.transformFeedback;
    tf.bind().bindBuffer(0, res.particleBuffers.targetBuffer.vbo);
    this.gl.enable(WebGL2RenderingContext.RASTERIZER_DISCARD);

    tf.begin(TransformFeedbackDrawMode.POINTS);
    res.particleBuffers.draw();
    tf.end();

    this.gl.disable(WebGL2RenderingContext.RASTERIZER_DISCARD);
    tf.unbindBuffer(0).unbind();

    res.particleBuffers.swap();
  }

  private mouseleave(): void {
    if (!this._resources) return;
    this.setViewportTarget(0, 0);
  }

  private setClientTarget(cx: number, cy: number) {
    const x = (cx / this.dimension.width) * 2 - 1;
    const y = (1 - cy / this.dimension.height) * 2 - 1;
    this.setViewportTarget(x, y);
  }

  private setViewportTarget(x: number, y: number) {
    this.target.x = x;
    this.target.y = y;
    this.dirty.target = true;
  }

  private get mode(): TargetMode {
    return this._mode;
  }

  private set mode(mode: TargetMode) {
    this._mode = mode;
    this.dirty.mode = true;
  }

  private createOverlayContent(): HTMLElement {
    const element = document.createElement('div');
    element.innerHTML = this.createOverlaySpan();
    return element;
  }

  private createOverlaySpan(): string {
    const count = this.parameters.count.toLocaleString();
    return `<span>${count} particles</span>`;
  }

  private get resources(): Resources {
    if (!this._resources) throw new Error('Not initialized');
    return this._resources;
  }
}

class ParticleBuffer {
  readonly vao: VertextArray;
  readonly vbo: VertexBuffer;

  constructor(readonly gl: WebGL2RenderingContext) {
    this.vbo = new VertexBuffer(gl).bind();
    this.vao = new VertextArray(gl).bind();
    this.vao
      .withAttribute(0, 2, VertexComponentType.FLOAT, false, PARTICLES_BYTES, 0)
      .withAttribute(1, 2, VertexComponentType.FLOAT, false, PARTICLES_BYTES, 2 * FLOAT_BYTES)
      .unbind();
    this.vbo.unbind();
    this.vao.unbind();
  }

  bind() {
    this.vbo.bind();
    this.vao.bind();
  }

  unbind() {
    this.vao.unbind();
    this.vbo.unbind();
  }

  delete() {
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
  private _newParticlesBuffer = new Float32Array(10000 * PARTICLES_FLOATS);

  constructor(readonly gl: WebGL2RenderingContext, readonly params: ParticlesParameters) {
    this.buffers = [new ParticleBuffer(gl), new ParticleBuffer(gl)];
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

  ensureCapacity(requiredCapacity: number) {
    if (this._capacity < requiredCapacity) {
      const newSize = requiredCapacity * PARTICLES_BYTES;
      this.dataBuffer.vbo.bind().allocate(newSize, BufferUsage.DYNAMIC_DRAW).unbind();
      this.targetBuffer.vbo.bind().allocate(newSize, BufferUsage.DYNAMIC_DRAW).unbind();
      this._capacity = requiredCapacity;
      this._count = 0;
    }
  }

  addParticles(count: number) {
    const buffer = this._newParticlesBuffer;
    count = Math.min(count, buffer.length / PARTICLES_FLOATS);
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
    this.dataBuffer.vbo.setsubdata(buffer, this._count * PARTICLES_BYTES, 0, count * PARTICLES_FLOATS);
    this._count += count;
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
}
