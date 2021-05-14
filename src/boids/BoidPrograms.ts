import { Deletable } from '../gl/utils/GLUtils';
import { Program } from '../gl/shader/Program';
import { ProgramLoader } from '../gl/shader/ProgramLoader';
import { vec2, vec4 } from 'gl-matrix';
import { BoidsParameters } from './Boids';
import { BOIDS_DATA_BINDING, BOIDS_SPEED_BINDING, SCAN_DATA_BINDING, TARGET_HEADING_BINDING } from './BoidTextures';

const BOID_COLOR: vec4 = [0, 1, 0, 1];

export class RenderUniforms {
  u_boidData: WebGLUniformLocation | null = null;
  u_boidScale: WebGLUniformLocation | null = null;
  u_boidColor: WebGLUniformLocation | null = null;
  u_scanData: WebGLUniformLocation | null = null;
  u_scanConfig: WebGLUniformLocation | null = null;
}

export class UpdateUniforms {
  u_boidData: WebGLUniformLocation | null = null;
  u_boidSpeed: WebGLUniformLocation | null = null;
  u_targetHeadings: WebGLUniformLocation | null = null;
  u_boidConfig: WebGLUniformLocation | null = null;
}

export class MoveUniforms {
  u_boidData: WebGLUniformLocation | null = null;
  u_boidSpeed: WebGLUniformLocation | null = null;
  u_targetHeadings: WebGLUniformLocation | null = null;
  u_boidConfig: WebGLUniformLocation | null = null;
  u_elapsedSeconds: WebGLUniformLocation | null = null;
}

export class ScanUniforms {
  u_boidData: WebGLUniformLocation | null = null;
  u_scanConfig: WebGLUniformLocation | null = null;
}

export class BoidPrograms implements Deletable {
  static async create(programLoader: ProgramLoader, boidSize: number): Promise<BoidPrograms> {
    // without this we can't render to RGBA32F
    if (!programLoader.gl.getExtension('EXT_color_buffer_float')) throw new Error('need EXT_color_buffer_float');
    // just guessing without this we can't downsample
    if (!programLoader.gl.getExtension('OES_texture_float_linear')) throw new Error('need OES_texture_float_linear');

    return new BoidPrograms(
      boidSize,
      await programLoader.load({
        path: 'boids/render-boids.glsl',
        uniformLocations: new RenderUniforms()
      }),
      await programLoader.load({
        vspath: 'quad.vs.glsl',
        fspath: 'boids/move-boids.fs.glsl',
        uniformLocations: new MoveUniforms()
      }),
      await programLoader.load({
        vspath: 'quad.vs.glsl',
        fspath: 'boids/update-boids.fs.glsl',
        uniformLocations: new UpdateUniforms()
      }),
      await programLoader.load({
        vspath: 'quad.vs.glsl',
        fspath: 'boids/scan-boids.fs.glsl',
        uniformLocations: new ScanUniforms()
      })
    );
  }

  constructor(
    readonly boidSize: number,
    readonly renderBoids: Program<RenderUniforms>,
    readonly moveBoids: Program<MoveUniforms>,
    readonly updateBoids: Program<UpdateUniforms>,
    readonly scanBoids: Program<ScanUniforms>
  ) {}

  get gl(): WebGL2RenderingContext {
    return this.renderBoids.gl;
  }

  setupUniforms(parameters: BoidsParameters, boidSize: vec2): void {
    this.renderBoids.use();
    this.gl.uniform4f(
      this.renderBoids.uniformLocations.u_boidColor,
      BOID_COLOR[0],
      BOID_COLOR[1],
      BOID_COLOR[2],
      BOID_COLOR[3]
    );
    this.gl.uniform1i(this.renderBoids.uniformLocations.u_boidData, BOIDS_DATA_BINDING);
    this.gl.uniform1i(this.renderBoids.uniformLocations.u_scanData, SCAN_DATA_BINDING);

    this.moveBoids.use();
    this.gl.uniform1i(this.moveBoids.uniformLocations.u_boidData, BOIDS_DATA_BINDING);
    this.gl.uniform1i(this.moveBoids.uniformLocations.u_boidSpeed, BOIDS_SPEED_BINDING);
    this.gl.uniform1i(this.moveBoids.uniformLocations.u_targetHeadings, TARGET_HEADING_BINDING);

    this.updateBoids.use();
    this.gl.uniform1i(this.updateBoids.uniformLocations.u_boidData, BOIDS_DATA_BINDING);
    this.gl.uniform1i(this.updateBoids.uniformLocations.u_boidSpeed, BOIDS_SPEED_BINDING);
    this.gl.uniform1i(this.updateBoids.uniformLocations.u_targetHeadings, TARGET_HEADING_BINDING);

    this.scanBoids.use();
    this.gl.uniform1i(this.scanBoids.uniformLocations.u_boidData, BOIDS_DATA_BINDING);

    this.updateUniforms(parameters);
    this.updateBoidSize(boidSize);
  }

  updateUniforms(parameters: BoidsParameters): void {
    this.moveBoids.use();
    this.updateBoidConfig(this.moveBoids.uniformLocations.u_boidConfig, parameters);

    this.updateBoids.use();
    this.updateBoidConfig(this.updateBoids.uniformLocations.u_boidConfig, parameters);

    this.scanBoids.use();
    this.updateScanConfig(this.scanBoids.uniformLocations.u_scanConfig, parameters);

    this.renderBoids.use();
    this.updateScanConfig(this.renderBoids.uniformLocations.u_scanConfig, parameters);
  }

  updateBoidSize(boidSize: vec2): void {
    this.renderBoids.use();
    this.gl.uniform2f(this.renderBoids.uniformLocations.u_boidScale, boidSize[0], boidSize[1]);
  }

  delete(): void {
    [this.renderBoids, this.moveBoids, this.updateBoids].forEach(p => p.delete());
  }

  private updateBoidConfig(location: WebGLUniformLocation | null, parameters: BoidsParameters): void {
    const acceleration = clamp(parameters.acceleration, 0.1, 100);
    const maxspeed = clamp(parameters.acceleration, 0.1, 1000);
    const turnspeed = clamp(parameters.turnspeed, 1, 1000000);
    // x: acceleration, y: max speed, y: turn speed
    this.gl.uniform3f(location, acceleration, maxspeed, toRad(turnspeed));
  }

  private updateScanConfig(location: WebGLUniformLocation | null, parameters: BoidsParameters): void {
    const viewdist = parameters.viewdist * this.boidSize;
    const fov = Math.cos(toRad(parameters.fov / 2));
    /// x:  view distance, y: fov
    this.gl.uniform2f(location, viewdist, fov);
  }
}

function clamp(x: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, x));
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}
