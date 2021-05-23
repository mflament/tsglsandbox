import {
  AbstractGLSandbox,
  SandboxContainer,
  SandboxFactory,
  newQuadDrawable,
  QUAD_VS,
  Program,
  GLTexture2D,
  IndexedDrawable,
  NoiseParameters,
  NoiseTextureGenerator,
  TextureNoiseParameters
} from 'gl';

class NoiseUniforms {
  u_sampler: WebGLUniformLocation | null = null;
  u_time: WebGLUniformLocation | null = null;
}

const SEED = 2156468546;

class NoiseSandbox extends AbstractGLSandbox<TextureNoiseParameters> {
  static async create(container: SandboxContainer, name: string): Promise<NoiseSandbox> {
    const program = await container.programLoader.load({
      vspath: QUAD_VS,
      fspath: 'test/noise.fs.glsl',
      uniformLocations: new NoiseUniforms()
    });
    const parameters: TextureNoiseParameters = {
      octaves: 8,
      persistence: 0.3,
      scale: 1,
      width: 512,
      height: 512,
      seed: SEED,
      normalize: true,
      float32: true
    };
    window.hashLocation.parseParams(parameters);
    return new NoiseSandbox(container, name, parameters, program);
  }

  readonly quadBuffers: IndexedDrawable;
  readonly texture: GLTexture2D;
  readonly generator: NoiseTextureGenerator;

  constructor(
    container: SandboxContainer,
    name: string,
    parameters: TextureNoiseParameters,
    readonly renderProgram: Program<NoiseUniforms>
  ) {
    super(container, name, parameters);
    this.generator = new NoiseTextureGenerator(container.gl);
    renderProgram.use();
    container.gl.uniform1i(renderProgram.uniformLocations.u_sampler, 0);
    this.quadBuffers = newQuadDrawable(container.gl).bind();

    this.texture = this.generator.create(parameters).activate(0).bind();
  }

  render(): void {
    this.quadBuffers.draw();
  }

  update(time: number): void {
    this.gl.uniform1f(this.renderProgram.uniformLocations.u_time, time);
  }

  onParametersChanged(): void {
    this.updateNoise(this.parameters);
  }

  private updateNoise(params: NoiseParameters): void {
    this.generator.update(params, this.texture);
  }
}

export function noise(): SandboxFactory {
  return NoiseSandbox.create;
}
