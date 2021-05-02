import { BufferUsage, TransformFeedbackDrawMode } from '../gl/buffers/BufferEnums';
import { VertexArray } from '../gl/buffers/VertextArray';
import { Deletable } from '../gl/utils/GLUtils';
import { AbstractGLSandbox, newSandboxFactory } from '../gl/sandbox/AbstractGLSandbox';
import { SandboxContainer, SandboxFactory } from '../gl/sandbox/GLSandbox';
import { Program } from '../gl/shader/Program';
import { TransformFeedback } from '../gl/shader/TransformFeedback';

// @ts-ignore
import renderParticleVS from 'assets/shaders/particles/particles-render.vs.glsl';
// @ts-ignore
import renderParticleFS from 'assets/shaders/particles/particles-render.fs.glsl';
// @ts-ignore
import updateParticleVS from 'assets/shaders/particles/particles-update.vs.glsl';
// @ts-ignore
import updateParticleFS from 'assets/shaders/particles/particles-update.fs.glsl';
import { BufferAttribute, VertexBuffer } from '../gl/buffers/VertexBuffer';

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

interface UpdateUniforms {
  acceleration: WebGLUniformLocation | null;
  maxSpeed: WebGLUniformLocation | null;
  mode: WebGLUniformLocation | null;
  elapsed: WebGLUniformLocation | null;
  target: WebGLUniformLocation | null;
}

class ParticlesResources implements Deletable {
  readonly particleBuffers: ParticleBuffers;
  readonly transformFeedback: TransformFeedback;
  readonly overlayContent: HTMLElement;
  readonly countSpan: HTMLElement;
  constructor(
    readonly container: SandboxContainer,
    readonly renderProgram: Program<any, { maxSpeed: WebGLUniformLocation | null }>,
    readonly updateProgram: Program<any, UpdateUniforms>,
    readonly parameters: ParticlesParameters
  ) {
    this.particleBuffers = new ParticleBuffers(container.gl, this.parameters);
    this.transformFeedback = new TransformFeedback(container.gl);
    this.overlayContent = document.createElement('div');
    this.countSpan = document.createElement('span');
    this.overlayContent.appendChild(this.countSpan);
    this.updateOverlay();
  }

  delete(): void {
    this.particleBuffers.dataBuffer.unbind();
    this.particleBuffers.delete();
    this.transformFeedback.delete();
    this.container.gl.useProgram(null);
    this.renderProgram.delete();
    this.updateProgram.delete();
  }

  updateOverlay(): void {
    this.countSpan.textContent = `${this.particleBuffers.count.toLocaleString()} particles`;
  }

  static async create(container: SandboxContainer): Promise<ParticlesResources> {
    const programs = await Promise.all([
      container.programLoader.loadProgram({
        vsSource: renderParticleVS,
        fsSource: renderParticleFS,
        attributeLocations: {},
        uniformLocations: { maxSpeed: null }
      }),
      container.programLoader.loadProgram({
        vsSource: updateParticleVS,
        fsSource: updateParticleFS,
        attributeLocations: {},
        uniformLocations: {
          acceleration: null,
          maxSpeed: null,
          mode: null,
          elapsed: null,
          target: null
        },
        varyings: ['outputPosition', 'outputSpeed']
      })
    ]);
    const parameters = { count: 500_000, accel: 4, speed: 2 };
    window.hashlocation.parseParams(parameters);
    return new ParticlesResources(container, programs[0], programs[1], parameters);
  }
}

class GLParticles extends AbstractGLSandbox<ParticlesResources, ParticlesParameters> {
  private _mode: TargetMode = TargetMode.ATTRACT;

  private readonly target = { x: 0, y: 0 };
  private readonly dirty = {
    params: true,
    mode: true,
    target: true
  };

  constructor(container: SandboxContainer, name: string, resources: ParticlesResources) {
    super(container, name, resources, resources.parameters);
    this.mouseleave = this.mouseleave.bind(this);
    container.canvas.addEventListener('mouseleave', this.mouseleave);
    resources.particleBuffers.dataBuffer.bind();
    this.running = true;
  }

  render(): void {
    this.clear();
    const particleBuffers = this.resources.particleBuffers;
    const renderProgram = this.resources.renderProgram;
    renderProgram.use();
    if (this.dirty.params) {
      particleBuffers.dataBuffer.bind();

      const updateProgram = this.resources.updateProgram;
      updateProgram.use();
      this.gl.uniform1f(updateProgram.uniformLocations.acceleration, this.parameters.accel);
      this.gl.uniform1f(updateProgram.uniformLocations.maxSpeed, this.parameters.speed);

      renderProgram.use();
      this.gl.uniform1f(this.resources.renderProgram.uniformLocations.maxSpeed, this.parameters.speed);

      this.dirty.params = false;
    }

    if (particleBuffers.count < this.parameters.count) {
      particleBuffers.addParticles(this.parameters.count - particleBuffers.count);
      this.resources.updateOverlay();
    } else if (particleBuffers.count > this.parameters.count) {
      particleBuffers.count = this.parameters.count;
      this.resources.updateOverlay();
    }
    particleBuffers.draw();
  }

  update(_time: number, dt: number): void {
    const updateProgram = this.resources.updateProgram;
    updateProgram.use();
    if (this.dirty.mode) {
      this.gl.uniform1i(updateProgram.uniformLocations.mode, this._mode);
      this.dirty.mode = false;
    }

    if (this.dirty.target) {
      this.gl.uniform2f(updateProgram.uniformLocations.target, this.target.x, this.target.y);
      this.dirty.target = false;
    }

    this.gl.uniform1f(updateProgram.uniformLocations.elapsed, dt);

    const tf = this.resources.transformFeedback;
    tf.bind().bindBuffer(0, this.resources.particleBuffers.targetBuffer.vbo);
    this.gl.enable(WebGL2RenderingContext.RASTERIZER_DISCARD);

    tf.begin(TransformFeedbackDrawMode.POINTS);
    this.resources.particleBuffers.draw();
    tf.end();

    this.gl.disable(WebGL2RenderingContext.RASTERIZER_DISCARD);
    tf.unbindBuffer(0).unbind();

    this.resources.particleBuffers.swap();
  }

  delete(): void {
    super.delete();
    this.resources.delete();
    this.container.canvas.removeEventListener('mouseleave', this.mouseleave);
  }

  onParametersChanged(): void {
    this.dirty.params = true;
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

  private mouseleave(): void {
    this.setViewportTarget(0, 0);
  }

  private setClientTarget(cx: number, cy: number) {
    const x = (cx / this.dimension[0]) * 2 - 1;
    const y = (1 - cy / this.dimension[1]) * 2 - 1;
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
    // this.vbo.unbind();
    // this.vao.unbind();
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
  return newSandboxFactory(
    ParticlesResources.create,
    (container, name, resources) => new GLParticles(container, name, resources)
  );
}
