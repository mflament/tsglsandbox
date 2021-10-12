import { AbstractDeletable, newQuadProgram, Program, ProgramLoader } from 'gl';
import { TEXTURE_UNITS } from './BoidTextures';

export class BoidsUniforms {
  // sampler2D [boids, 1 ] xy: pos , zw: velocity
  u_boidData: WebGLUniformLocation | null = null;
}

export class BoidsUniformsBlocks {
  u_familly: number = WebGL2RenderingContext.INVALID_INDEX;
}

export class UpdateUniforms extends BoidsUniforms {
  // vec2: x: time , y : delta time
  u_time: WebGLUniformLocation | null = null;
  // int
  u_boidsCount: WebGLUniformLocation | null = null;
}

export class RenderUniforms extends BoidsUniforms {}

export class BoidPrograms extends AbstractDeletable {
  static async create(programLoader: ProgramLoader): Promise<BoidPrograms> {
    // without this we can't render to RGBA32F
    if (!programLoader.gl.getExtension('EXT_color_buffer_float')) throw new Error('need EXT_color_buffer_float');
    // just guessing without this we can't downsample
    if (!programLoader.gl.getExtension('OES_texture_float_linear')) throw new Error('need OES_texture_float_linear');
    return new BoidPrograms(
      await programLoader.load({
        path: 'sandboxes/boids/render-boids.glsl',
        uniformLocations: new RenderUniforms(),
        uniformBlockIndices: new BoidsUniformsBlocks()
      }),
      await newQuadProgram(programLoader, {
        fspath: 'sandboxes/boids/update-boids.fs.glsl',
        uniformLocations: new UpdateUniforms(),
        uniformBlockIndices: new BoidsUniformsBlocks()
      })
    );
  }

  constructor(
    readonly renderBoids: Program<RenderUniforms, BoidsUniformsBlocks>,
    readonly updateBoids: Program<UpdateUniforms, BoidsUniformsBlocks>
  ) {
    super();
  }

  get gl(): WebGL2RenderingContext {
    return this.renderBoids.gl;
  }

  setupUniforms(): void {
    this.setupProgramUniforms(this.updateBoids);
    this.setupProgramUniforms(this.renderBoids);
  }

  prepareUpdate(boidsCount: number, time: number, dt: number): void {
    this.gl.uniform1i(this.updateBoids.uniformLocations.u_boidsCount, boidsCount);
    this.gl.uniform2f(this.updateBoids.uniformLocations.u_time, time, dt);
  }

  delete(): void {
    this.updateBoids.delete();
    this.renderBoids.delete();
    super.delete();
  }

  private setupProgramUniforms(program: Program<BoidsUniforms, BoidsUniformsBlocks>): void {
    program.use();
    const locations = program.uniformLocations;
    this.gl.uniform1i(locations.u_boidData, TEXTURE_UNITS.data);
    program.bindUniformBlock(program.uniformBlockIndices.u_familly, 0);
  }
}
