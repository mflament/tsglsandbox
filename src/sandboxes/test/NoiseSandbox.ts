import {
  AbstractGLSandbox,
  SandboxContainer,
  SandboxFactory,
  newQuadDrawable,
  Program,
  GLTexture2D,
  IndexedDrawable,
  NoiseTextureGenerator,
  quadProgram
} from 'gl';
import { control } from '../../gl/sandbox/ParametersMetadata';
import { NoiseParameters } from '../../gl/texture/NoiseTextureGenerator';
import { randomSimplexSeed } from '../../random/noise/SimplexNoise';

class NoiseUniforms {
  u_sampler: WebGLUniformLocation | null = null;
  u_time: WebGLUniformLocation | null = null;
}

class NoiseSandboxParameters {
  @control({ min: 32, max: 2048, step: 16 })
  size = 512;
  @control({ min: 1, max: 100, step: 1 })
  scale = 10;
  normalize = false;
  float32 = true;
}

class NoiseSandbox extends AbstractGLSandbox<NoiseSandboxParameters> {
  static async create(container: SandboxContainer, name: string): Promise<NoiseSandbox> {
    const program = await quadProgram(container.programLoader, {
      fspath: 'test/noise.fs.glsl',
      uniformLocations: new NoiseUniforms()
    });
    return new NoiseSandbox(container, name, program);
  }

  private readonly quadBuffers: IndexedDrawable;
  private readonly texture: GLTexture2D;
  private readonly generator: NoiseTextureGenerator;
  private readonly seed = randomSimplexSeed();

  constructor(container: SandboxContainer, name: string, readonly renderProgram: Program<NoiseUniforms>) {
    super(container, name, new NoiseSandboxParameters());
    this.generator = new NoiseTextureGenerator(this.gl);
    renderProgram.use();
    this.gl.uniform1i(renderProgram.uniformLocations.u_sampler, 0);
    this.quadBuffers = newQuadDrawable(this.gl).bind();
    this.texture = this.generator.create(this.generatorParameters).activate(0).bind();
  }

  private get generatorParameters(): NoiseParameters {
    const params = this.parameters;
    return {
      seed: this.seed,
      width: params.size,
      height: params.size,
      scale: params.scale,
      normalize: params.normalize,
      float32: params.float32
    };
  }

  render(): void {
    this.quadBuffers.draw();
  }

  onparameterchange(): void {
    this.generator.update(this.generatorParameters, this.texture);
  }
}

export function noise(): SandboxFactory {
  return NoiseSandbox.create;
}
