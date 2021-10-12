import {
  AbstractGLSandbox,
  control,
  FractalNoiseParameters,
  GLTexture2D,
  IndexedDrawable,
  JSNoiseTextureGenerator,
  newQuadDrawable,
  newQuadProgram,
  Program,
  SandboxContainer,
  SandboxFactory,
  ShaderNoiseTextureGenerator
} from 'gl';
import { randomSimplexSeed } from 'random';
import { vec2 } from 'gl-matrix';
import React from 'react';

class NoiseUniforms {
  u_sampler: WebGLUniformLocation | null = null;
}

class NoiseSandboxParameters implements FractalNoiseParameters {
  @control({ choices: { values: ['js', 'shader'] } })
  generator: 'js' | 'shader' = 'js';
  @control({ min: 32, max: 2048, step: 16 })
  size = 512;
  @control({ min: 0, max: 10, step: 0.1 })
  offset: vec2 = [0, 0];
  @control({ min: 0.1, max: 10, step: 0.1 })
  scale = 5;
  @control({ min: 1, max: 16, step: 1 })
  octaves = 8;
  @control({ min: 0, max: 1, step: 0.001 })
  persistence = 0.6;
  @control({ min: 0, max: 1, step: 0.001 })
  range: vec2 = [0, 1];
}

class NoiseSandbox extends AbstractGLSandbox<NoiseSandboxParameters> {
  static async create(
    container: SandboxContainer,
    name: string,
    parameters?: NoiseSandboxParameters
  ): Promise<NoiseSandbox> {
    const program = await newQuadProgram(container.programLoader, {
      fspath: 'sandboxes/test/render-noise.fs.glsl',
      uniformLocations: new NoiseUniforms()
    });
    return new NoiseSandbox(container, name, program, parameters);
  }

  private readonly quadBuffers: IndexedDrawable;
  private readonly seed = randomSimplexSeed();
  private readonly generators: { shader: ShaderNoiseTextureGenerator; js: JSNoiseTextureGenerator };
  private texture?: GLTexture2D;
  private lastDuration = 0;

  constructor(
    container: SandboxContainer,
    name: string,
    readonly renderProgram: Program<NoiseUniforms>,
    parameters?: NoiseSandboxParameters
  ) {
    super(container, name, parameters);

    renderProgram.use();
    this.gl.uniform1i(renderProgram.uniformLocations.u_sampler, 0);

    this.quadBuffers = newQuadDrawable(this.gl);
    this.generators = {
      js: new JSNoiseTextureGenerator(this.gl),
      shader: new ShaderNoiseTextureGenerator(container)
    };

    this.onparameterchange();
  }

  createDefaultParameters(): NoiseSandboxParameters {
    return new NoiseSandboxParameters();
  }

  delete() {
    this.generators.shader?.delete();
  }

  private get generatorParameters(): FractalNoiseParameters {
    const params = this.parameters;
    return {
      seed: this.seed,
      ...params
    };
  }

  render(): void {
    this.quadBuffers.draw();
  }

  onparameterchange(): void {
    const generator = this.parameters.generator === 'js' ? this.generators.js : this.generators.shader;
    const start = performance.now();

    generator.generate(this.generatorParameters, this.texture).then(t => {
      this.lastDuration = performance.now() - start;
      this.texture = t;
      this.texture.bind();
      this.updateControls();
    });

    this.renderProgram.use();
    this.quadBuffers.bind();
  }

  customControls(): JSX.Element {
    return <div className="row">Generated in {this.lastDuration.toFixed(0)} ms</div>;
  }
}

export function noise(): SandboxFactory {
  return NoiseSandbox.create;
}
