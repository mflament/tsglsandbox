import { Deletable } from '../gl/utils/GLUtils';
import { Program } from '../gl/shader/Program';
import { ProgramLoader } from '../gl/shader/ProgramLoader';
import { vec2, vec4 } from 'gl-matrix';

import {
  BOIDS_DATA_BINDING,
  BOIDS_SPEED_BINDING,
  BoidTextures,
  SCAN_DATA_BINDING,
  TARGET_HEADING_BINDING
} from './BoidTextures';

const BOID_COLOR: vec4 = [0, 1, 0, 1];

export class BoidsUniformLocations {
  u_boidData: WebGLUniformLocation | null = null;
  u_boidSpeed: WebGLUniformLocation | null = null;
  u_targetHeadings: WebGLUniformLocation | null = null;
  u_scanData: WebGLUniformLocation | null = null;

  u_boidCount: WebGLUniformLocation | null = null;
  u_time: WebGLUniformLocation | null = null;
  u_deltaTime: WebGLUniformLocation | null = null;
  u_speedConfig: WebGLUniformLocation | null = null;
  u_scanConfig: WebGLUniformLocation | null = null;
  u_updateConfig: WebGLUniformLocation | null = null;

  u_boidScale: WebGLUniformLocation | null = null;
  u_boidColor: WebGLUniformLocation | null = null;
}

type BoidsProgram = Program<BoidsUniformLocations>;

export interface BoidUniforms {
  boidsCount: number;
  viewdist: number;
  acceleration: number;
  maxspeed: number;
  turnspeed: number;
  fov: number;
  repulseDistance: number;
  boidsSize: vec2;
}

export class BoidPrograms implements Deletable {
  static async create(programLoader: ProgramLoader): Promise<BoidPrograms> {
    // without this we can't render to RGBA32F
    if (!programLoader.gl.getExtension('EXT_color_buffer_float')) throw new Error('need EXT_color_buffer_float');
    // just guessing without this we can't downsample
    if (!programLoader.gl.getExtension('OES_texture_float_linear')) throw new Error('need OES_texture_float_linear');

    return new BoidPrograms(
      await programLoader.load({
        path: 'boids/render-boids.glsl',
        uniformLocations: new BoidsUniformLocations()
      }),
      await programLoader.load({
        vspath: 'quad.vs.glsl',
        fspath: 'boids/move-boids.fs.glsl',
        uniformLocations: new BoidsUniformLocations()
      }),
      await programLoader.load({
        vspath: 'quad.vs.glsl',
        fspath: 'boids/update-boids.fs.glsl',
        uniformLocations: new BoidsUniformLocations()
      }),
      await programLoader.load({
        vspath: 'quad.vs.glsl',
        fspath: 'boids/scan-boids.fs.glsl',
        uniformLocations: new BoidsUniformLocations()
      })
    );
  }

  constructor(
    readonly renderBoids: BoidsProgram,
    readonly moveBoids: BoidsProgram,
    readonly updateHeadings: BoidsProgram,
    readonly scanBoids: BoidsProgram
  ) {}

  get gl(): WebGL2RenderingContext {
    return this.renderBoids.gl;
  }

  get programs(): BoidsProgram[] {
    return [this.renderBoids, this.moveBoids, this.updateHeadings, this.scanBoids];
  }

  setupUniforms(): void {
    this.programs.forEach(p => this.setupProgramUniforms(p));
  }

  updateUniforms(uniforms: BoidUniforms): void {
    this.programs.forEach(p => this.updateProgramUniforms(p, uniforms));
  }

  bindRender(textures: BoidTextures): BoidPrograms {
    this.renderBoids.use();
    textures.bindScan();
    return this;
  }

  unbindRender(textures: BoidTextures): BoidPrograms {
    textures.unbindScan();
    return this;
  }

  bindMove(textures: BoidTextures, dt: number): BoidPrograms {
    this.moveBoids.use();
    this.gl.uniform1f(this.moveBoids.uniformLocations.u_deltaTime, dt);
    textures.bindTargetHeading();
    return this;
  }

  unbindMove(textures: BoidTextures): BoidPrograms {
    textures.unbindTargetHeading();
    return this;
  }

  bindUpdateHeadings(textures: BoidTextures, time: number): BoidPrograms {
    this.updateHeadings.use();
    this.gl.uniform1f(this.updateHeadings.uniformLocations.u_time, time);
    textures.bindTargetHeading();
    textures.bindScan();
    return this;
  }

  unbindUpdateHeadings(textures: BoidTextures): BoidPrograms {
    textures.unbindTargetHeading();
    textures.unbindScan();
    return this;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  bindScan(_textures: BoidTextures): BoidPrograms {
    this.scanBoids.use();
    return this;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  unbindScan(_textures: BoidTextures): BoidPrograms {
    return this;
  }

  delete(): void {
    [this.renderBoids, this.moveBoids, this.updateHeadings].forEach(p => p.delete());
  }

  private setupProgramUniforms(program: BoidsProgram): void {
    program.use();
    const locations = program.uniformLocations;
    this.gl.uniform4f(locations.u_boidColor, BOID_COLOR[0], BOID_COLOR[1], BOID_COLOR[2], BOID_COLOR[3]);
    this.gl.uniform1i(locations.u_boidData, BOIDS_DATA_BINDING);
    this.gl.uniform1i(locations.u_scanData, SCAN_DATA_BINDING);
    this.gl.uniform1i(locations.u_boidData, BOIDS_DATA_BINDING);
    this.gl.uniform1i(locations.u_boidSpeed, BOIDS_SPEED_BINDING);
    this.gl.uniform1i(locations.u_targetHeadings, TARGET_HEADING_BINDING);
  }

  private updateProgramUniforms(program: BoidsProgram, parameters: BoidUniforms): void {
    program.use();
    const locations = program.uniformLocations;
    this.gl.uniform1i(locations.u_boidCount, parameters.boidsCount);
    this.gl.uniform3f(locations.u_speedConfig, parameters.acceleration, parameters.maxspeed, parameters.turnspeed);
    this.gl.uniform2f(locations.u_scanConfig, parameters.viewdist, parameters.fov);
    this.gl.uniform1f(locations.u_updateConfig, parameters.repulseDistance);
    this.gl.uniform2f(locations.u_boidScale, parameters.boidsSize[0], parameters.boidsSize[1]);
  }
}
