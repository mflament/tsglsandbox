import { GLTexture2D } from '../GLTexture';
import { vec2 } from 'gl-matrix';
import { InternalFormat, TextureMagFilter, TextureMinFilter, TextureWrappingMode } from '../TextureEnums';

export interface NoiseTextureGenerator {
  generate(params: NoiseParameters, target?: GLTexture2D): Promise<GLTexture2D>;
}

export interface NoiseParameters {
  seed?: number;
  size: vec2 | number;
  offset: vec2 | number;
  scale: vec2 | number;
  range: vec2;
}

export interface FractalNoiseParameters extends NoiseParameters {
  octaves: number;
  persistence: number;
}

export abstract class AbstractNoiseTextureGenerator implements NoiseTextureGenerator {
  protected constructor(readonly gl: WebGL2RenderingContext) {}

  async generate(params: NoiseParameters, target?: GLTexture2D): Promise<GLTexture2D> {
    const internalFormat = InternalFormat.R32F;
    const size = createVec2(params.size);
    vec2.min(size, size, [4096, 4096]);
    if (!target || target.internalFormat !== internalFormat || target.width !== size[0] || target.height !== size[1]) {
      target?.delete();
      target = new GLTexture2D(this.gl, internalFormat)
        .bind()
        .minFilter(TextureMinFilter.NEAREST)
        .magFilter(TextureMagFilter.NEAREST)
        .wrap(TextureWrappingMode.CLAMP_TO_EDGE)
        .freeze(size[0], size[1]);
    } else {
      target.bind();
    }
    await this.doGenerate(size, params, target);
    return target;
  }

  protected abstract doGenerate(size: vec2, params: NoiseParameters, target: GLTexture2D): Promise<void> | void;
}

export function createVec2(p: vec2 | number): vec2 {
  return typeof p === 'number' ? [p, p] : p;
}

export function isFractalNoiseParameters(params: NoiseParameters): params is FractalNoiseParameters {
  const fp = params as Partial<FractalNoiseParameters>;
  return (
    params &&
    typeof fp.octaves === 'number' &&
    fp.octaves > 1 &&
    typeof fp.persistence === 'number' &&
    fp.persistence > 0
  );
}
