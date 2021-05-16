import { Deletable } from '../gl/utils/GLUtils';
import { Program } from '../gl/shader/Program';
import { ProgramLoader } from '../gl/shader/ProgramLoader';

import { TEXTURE_UNITS } from './BoidTextures';

export class BoidsUniforms {
  // sampler2D [boids, 1 ] xy: pos , zw: velocity
  u_boidData: WebGLUniformLocation | null = null;
  // sampler2D [boids, 1] : x : familly index
  u_boidFamilies: WebGLUniformLocation | null = null;

  // sampler2D [families, 1] : xy:  size, z: max speed
  u_families: WebGLUniformLocation | null = null;
}

export class UpdateUniforms extends BoidsUniforms {
  // vec2: x: time , y : delta time
  u_time: WebGLUniformLocation | null = null;
  // int
  u_boidsCount: WebGLUniformLocation | null = null;

  // sampler2D [familly, 1] : x: cohesion , y:  separation, z:aligment
  u_famillyRadii: WebGLUniformLocation | null = null;
  // sampler2D [familly, 1] : x: cohesion , y:  separation, z:aligment
  u_famillyWeights: WebGLUniformLocation | null = null;
}

export class RenderUniforms extends BoidsUniforms {
  // sampler2D [families, 1] : rgba
  u_famillyColors: WebGLUniformLocation | null = null;
}

export class BoidPrograms implements Deletable {
  static async create(programLoader: ProgramLoader): Promise<BoidPrograms> {
    // without this we can't render to RGBA32F
    if (!programLoader.gl.getExtension('EXT_color_buffer_float')) throw new Error('need EXT_color_buffer_float');
    // just guessing without this we can't downsample
    if (!programLoader.gl.getExtension('OES_texture_float_linear')) throw new Error('need OES_texture_float_linear');
    return new BoidPrograms(
      await programLoader.load({
        path: 'boids2/render-boids.glsl',
        uniformLocations: new RenderUniforms()
      }),
      await programLoader.load({
        vspath: 'quad.vs.glsl',
        fspath: 'boids2/update-boids.fs.glsl',
        uniformLocations: new UpdateUniforms()
      })
    );
  }

  constructor(readonly renderBoids: Program<RenderUniforms>, readonly updateBoids: Program<UpdateUniforms>) {}

  get gl(): WebGL2RenderingContext {
    return this.renderBoids.gl;
  }

  get programs(): Program<BoidsUniforms>[] {
    return [this.renderBoids, this.updateBoids];
  }

  setupUniforms(): void {
    this.setupProgramUniforms(this.updateBoids);
    this.gl.uniform1i(this.updateBoids.uniformLocations.u_famillyRadii, TEXTURE_UNITS.radii);
    this.gl.uniform1i(this.updateBoids.uniformLocations.u_famillyWeights, TEXTURE_UNITS.weights);

    this.setupProgramUniforms(this.renderBoids);
    this.gl.uniform1i(this.renderBoids.uniformLocations.u_famillyColors, TEXTURE_UNITS.colors);
  }

  prepareUpdate(boidsCount: number, time: number, dt: number): void {
    this.updateBoids.use();
    this.gl.uniform1i(this.updateBoids.uniformLocations.u_boidsCount, boidsCount);
    this.gl.uniform2f(this.updateBoids.uniformLocations.u_time, time, dt);
  }

  delete(): void {
    this.programs.forEach(p => p.delete());
  }

  private setupProgramUniforms(program: Program<BoidsUniforms>): void {
    program.use();
    const locations = program.uniformLocations;
    this.gl.uniform1i(locations.u_boidData, TEXTURE_UNITS.data);
    this.gl.uniform1i(locations.u_boidFamilies, TEXTURE_UNITS.boidFamilies);
    this.gl.uniform1i(locations.u_families, TEXTURE_UNITS.families);
  }
}
