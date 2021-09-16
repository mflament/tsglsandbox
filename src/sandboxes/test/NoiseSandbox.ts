import {
  AbstractGLSandbox,
  control,
  FractalNoiseParameters,
  GLTexture2D,
  IndexedDrawable,
  newQuadDrawable,
  NoiseTextureGenerator,
  Program,
  quadProgram,
  SandboxContainer,
  SandboxFactory,
  shaderPath
} from 'gl';
import { randomSimplexSeed } from 'random';

class NoiseUniforms {
  u_sampler: WebGLUniformLocation | null = null;
  u_time: WebGLUniformLocation | null = null;
}

class NoiseSandboxParameters {
  @control({ min: 32, max: 2048, step: 16 })
  size = 512;
  @control({ min: 1, max: 100, step: 1 })
  scale = 10;
  @control({ min: 1, max: 16, step: 1 })
  octaves = 8;
  @control({ min: 0, max: 1, step: 0.001 })
  persistence = 0.6;
  normalize = false;
  float32 = true;
}

class NoiseSandbox extends AbstractGLSandbox<NoiseSandboxParameters> {
  static async create(
    container: SandboxContainer,
    name: string,
    parameters?: NoiseSandboxParameters
  ): Promise<NoiseSandbox> {
    const program = await quadProgram(container.programLoader, {
      fspath: shaderPath('noise.fs.glsl', import.meta),
      uniformLocations: new NoiseUniforms()
    });
    return new NoiseSandbox(container, name, program, parameters);
  }

  private readonly quadBuffers: IndexedDrawable;
  private readonly generator: NoiseTextureGenerator;
  private readonly seed = randomSimplexSeed();
  private texture: GLTexture2D;

  constructor(
    container: SandboxContainer,
    name: string,
    readonly renderProgram: Program<NoiseUniforms>,
    parameters?: NoiseSandboxParameters
  ) {
    super(container, name, parameters);
    this.generator = new NoiseTextureGenerator(this.gl);
    renderProgram.use();
    this.gl.uniform1i(renderProgram.uniformLocations.u_sampler, 0);
    this.quadBuffers = newQuadDrawable(this.gl).bind();
    this.texture = this.generator.create(this.generatorParameters).activate(0).bind();
  }

  createDefaultParameters(): NoiseSandboxParameters {
    return new NoiseSandboxParameters();
  }

  private get generatorParameters(): FractalNoiseParameters {
    const params = this.parameters;
    return {
      seed: this.seed,
      width: params.size,
      height: params.size,
      scale: params.scale,
      normalize: params.normalize,
      float32: params.float32,
      octaves: params.octaves,
      persistence: params.persistence
    };
  }

  render(): void {
    this.quadBuffers.draw();
  }

  onparameterchange(): void {
    this.texture = this.generator.update(this.generatorParameters, this.texture);
    this.texture.activate(0).bind();
  }
}

export function noise(): SandboxFactory {
  return NoiseSandbox.create;
}
