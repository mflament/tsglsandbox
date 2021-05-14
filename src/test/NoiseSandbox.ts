import { AbstractGLSandbox } from '../gl/sandbox/AbstractGLSandbox';
import { SandboxContainer, SandboxFactory } from '../gl/sandbox/GLSandbox';
import { newQuadDrawable, QUAD_VS } from '../gl/drawable/QuadDrawable';
import { Program } from '../gl/shader/Program';
import { GLTexture2D } from '../gl/texture/GLTexture';
import { IndexedDrawable } from '../gl/drawable/GLDrawable';
import { InternalFormat, TextureComponentType, TextureFormat } from '../gl/texture/TextureEnums';
import { simplexNoise2D, randomSimplexSeed } from '../utils/noise/simplex/SimplexNoise';
import { vec2 } from 'gl-matrix';
import { fractalNoise2D } from '../utils/noise/FractalNoise';

class NoiseUniforms {
  u_sampler: WebGLUniformLocation | null = null;
}

interface NoiseParameters {
  octaves: number;
  persistence: number;
  scale: number;
  normalize: boolean;
}

class NoiseSandbox extends AbstractGLSandbox<NoiseParameters> {
  static async create(container: SandboxContainer, name: string): Promise<NoiseSandbox> {
    const program = await container.programLoader.load({
      vspath: QUAD_VS,
      fspath: 'test/noise.fs.glsl',
      uniformLocations: new NoiseUniforms()
    });
    const parameters = {
      octaves: 8,
      persistence: 0.3,
      scale: 1,
      normalize: false
    };
    window.hashlocation.parseParams(parameters);
    return new NoiseSandbox(container, name, parameters, program);
  }

  readonly quadBuffers: IndexedDrawable;
  readonly texture: GLTexture2D;

  constructor(
    container: SandboxContainer,
    name: string,
    parameters: NoiseParameters,
    readonly renderProgram: Program<NoiseUniforms>
  ) {
    super(container, name, parameters);
    renderProgram.use();
    container.gl.uniform1i(renderProgram.uniformLocations.u_sampler, 0);
    this.quadBuffers = newQuadDrawable(container.gl).bind();

    const size = 512;
    const array = new Uint8Array(4 * size * size).fill(255);
    this.texture = new GLTexture2D(container.gl)
      .bind()
      .data({
        buffer: array,
        width: size,
        height: size,
        internalFormat: InternalFormat.RGBA,
        format: TextureFormat.RGBA,
        type: TextureComponentType.UNSIGNED_BYTE
      })
      .activate(0);
  }

  render(): void {
    this.quadBuffers.draw();
  }

  updateNoise(params: NoiseParameters): void {
    const noise = fractalNoise2D(simplexNoise2D(), params.octaves, params.persistence);
    const size = 512;
    const array = new Uint8Array(4 * size * size);
    array.fill(255);
    const v: vec2 = [0, 0];

    // const bounds: vec2 = [Infinity, -Infinity];
    // for (let y = 0; y < size; y++) {
    //   for (let x = 0; x < size; x++) {
    //     const n = noise(vec2.set(v, x, y));
    //     array[y * size + x] = 255;
    //     //n * 255;
    //     bounds[0] = Math.min(n, bounds[0]);
    //     bounds[1] = Math.max(n, bounds[1]);
    //   }
    // }
    this.texture.data({
      buffer: array,
      width: size,
      height: size,
      internalFormat: InternalFormat.RGBA,
      format: TextureFormat.RGBA,
      type: TextureComponentType.UNSIGNED_BYTE
    });
  }
}

export function noise(): SandboxFactory {
  return NoiseSandbox.create;
}
