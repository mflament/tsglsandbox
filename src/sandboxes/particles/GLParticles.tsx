import React, { RefObject } from 'react';
import { vec2 } from 'gl-matrix';
import {
  TransformFeedbackDrawMode,
  Program,
  VaryingBufferMode,
  TransformFeedback,
  AbstractGLSandbox,
  SandboxContainer,
  SandboxFactory,
  control
} from 'gl';
import 'reflect-metadata';
import { ParticleBuffers } from './ParticleBuffer';

class ParticlesParameters {
  @control<GLParticles>({ min: 5000, max: sandbox => sandbox.maxParticles, step: 1000 })
  count = 500_000;
  @control({ min: 0.1, max: 10, step: 0.1 })
  accel = 4;
  @control({ min: 0.1, max: 10, step: 0.1 })
  speed = 2;
}

const MAX_PARTICLES = 10_000_000;

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
    return new GLParticles(container, name, programs[0], programs[1]);
  }

  readonly displayName = 'Particles';

  private readonly particleBuffers: ParticleBuffers;
  private readonly transformFeedback: TransformFeedback;

  private _mode: TargetMode = TargetMode.ATTRACT;

  private readonly target = vec2.create();

  private _newTarget?: vec2;
  private _newMode?: TargetMode;
  private _newParam?: Partial<ParticlesParameters>;

  private readonly controlsRef: RefObject<HTMLDivElement>;

  constructor(
    container: SandboxContainer,
    name: string,
    readonly renderProgram: Program<RenderUniforms>,
    readonly updateProgram: Program<UpdateUniforms>
  ) {
    super(container, name, new ParticlesParameters());

    const gl = container.canvas.gl;
    this.particleBuffers = new ParticleBuffers(gl, this.parameters, MAX_PARTICLES);
    this.particleBuffers.dataBuffer.bind();
    this.transformFeedback = new TransformFeedback(gl);
    this.running = true;

    this.controlsRef = React.createRef();
    this._newMode = this._mode;
    this._newParam = this.parameters;
    this.renderProgram.use();
  }

  get maxParticles(): number {
    return this.particleBuffers.maxParticles;
  }

  render(): void {
    this.clear();
    this.particleBuffers.draw();
  }

  update(_time: number, dt: number): void {
    const updateProgram = this.updateProgram;
    updateProgram.use();

    if (this._newMode !== undefined) {
      this.gl.uniform1i(updateProgram.uniformLocations.mode, this._newMode);
      this._mode = this._newMode;
      this._newMode = undefined;
    }

    if (this._newTarget !== undefined) {
      this.gl.uniform2f(updateProgram.uniformLocations.target, this._newTarget[0], this._newTarget[1]);
      this._newTarget = undefined;
    }

    if (this._newParam !== undefined) {
      if (this._newParam.accel !== undefined) {
        this.gl.uniform1f(updateProgram.uniformLocations.acceleration, this._newParam.accel);
      }

      if (this._newParam.speed !== undefined) {
        this.gl.uniform1f(updateProgram.uniformLocations.maxSpeed, this._newParam.speed);

        this.renderProgram.use();
        this.gl.uniform1f(this.renderProgram.uniformLocations.maxSpeed, this._newParam.speed);
      }

      if (this._newParam.count !== undefined) {
        this.particleBuffers.count = this._newParam.count;
        if (this.controlsRef.current) this.controlsRef.current.textContent = this.description;
      }

      this._newParam = undefined;
    }

    updateProgram.use();
    this.gl.uniform1f(updateProgram.uniformLocations.elapsed, dt);

    this.transformFeedback.bind().bindBuffer(0, this.particleBuffers.targetBuffer.vbo);
    this.gl.enable(WebGL2RenderingContext.RASTERIZER_DISCARD);

    this.transformFeedback.begin(TransformFeedbackDrawMode.POINTS);
    this.particleBuffers.draw();
    this.transformFeedback.end();

    this.gl.disable(WebGL2RenderingContext.RASTERIZER_DISCARD);
    this.transformFeedback.unbindBuffer(0).unbind();

    this.particleBuffers.swap();
    this.renderProgram.use();
  }

  onparameterchange(): void {
    this._newParam = this.parameters;
  }

  onmousemove(e: MouseEvent): void {
    this.updateTarget(e);
  }

  onmousedown(e: MouseEvent): void {
    let mode: TargetMode;
    switch (e.button) {
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
    this._newMode = mode;
  }

  onmouseup(): void {
    this._newMode = TargetMode.ATTRACT;
  }

  ontouchstart(e: TouchEvent): void {
    this.updateTarget(e);
    this._newMode = TargetMode.REPUSLE;
  }

  ontouchmove(e: TouchEvent): void {
    this.updateTarget(e);
  }

  ontouchend(): void {
    this._newMode = TargetMode.ATTRACT;
  }

  onmouseleave(): void {
    this._newTarget = vec2.set(this.target, 0, 0);
  }

  private updateTarget(e: TouchEvent | MouseEvent) {
    this._newTarget = this.clientToWorld(e, this.target);
  }

  get customControls(): JSX.Element {
    return <div ref={this.controlsRef}> {this.description} </div>;
  }

  private get description(): string {
    return `${this.particleBuffers.count.toLocaleString()} particles`;
  }
}
export function glparticles(): SandboxFactory<ParticlesParameters> {
  return GLParticles.create;
}
