import React from 'react';
import {vec2} from 'gl-matrix';
import {
  AbstractGLSandbox,
  control,
  Program,
  SandboxContainer,
  SandboxFactory,
  TransformFeedback,
  TransformFeedbackDrawMode,
  VaryingBufferMode
} from 'gl';
import 'reflect-metadata';
import {ParticleBuffers} from './ParticleBuffer';
import {SandboxEventHandler} from "../../gl/sandbox/ActionManager";

class ParticlesParameters {
  @control<GLParticles>({min: 5000, max: sandbox => sandbox.maxParticles, step: 1000})
  count = 500_000;
  @control({min: 0.1, max: 10, step: 0.1})
  accel = 4;
  @control({min: 0.1, max: 10, step: 0.1})
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

class GLParticles extends AbstractGLSandbox<ParticlesParameters> implements SandboxEventHandler {
  static async create(container: SandboxContainer, name: string, parameters?: ParticlesParameters): Promise<GLParticles> {
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
    return new GLParticles(container, name, programs[0], programs[1], parameters);
  }

  readonly displayName = 'Particles';

  private readonly particleBuffers: ParticleBuffers;
  private readonly transformFeedback: TransformFeedback;

  private _mode: TargetMode = TargetMode.ATTRACT;

  private readonly target = vec2.create();

  private _newTarget?: vec2;
  private _newMode?: TargetMode;
  private _newParam?: Partial<ParticlesParameters>;

  constructor(
    container: SandboxContainer,
    name: string,
    readonly renderProgram: Program<RenderUniforms>,
    readonly updateProgram: Program<UpdateUniforms>,
    parameters?: ParticlesParameters
  ) {
    super(container, name, parameters);

    const gl = container.canvas.gl;
    this.particleBuffers = new ParticleBuffers(gl, this.parameters, MAX_PARTICLES);
    this.particleBuffers.dataBuffer.bind();
    this.transformFeedback = new TransformFeedback(gl);
    this.running = true;

    this._newMode = this._mode;
    this._newParam = this.parameters;
    this.renderProgram.use();
  }

  createDefaultParameters(): ParticlesParameters {
    return new ParticlesParameters();
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
        this.updateControls();
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

  customControls(): JSX.Element | undefined {
    return <ParticlesControls count={this.particleBuffers.count}/>;
  }

  private updateTarget(e: TouchEvent | MouseEvent) {
    this._newTarget = this.clientToWorld(e, this.target);
  }

}

function ParticlesControls(props: {count : number}): JSX.Element {
  const desc = `${props.count.toLocaleString()} particles`;
  return <div className="row">{desc}</div>;
}
export function glparticles(): SandboxFactory<ParticlesParameters> {
  return GLParticles.create;
}
