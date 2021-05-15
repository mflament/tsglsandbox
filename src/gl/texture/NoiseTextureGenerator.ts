import { vec2 } from 'gl-matrix';
import { Noise } from '../../utils/noise/Noise';
import { simplexNoise2D, randomSimplexSeed } from '../../utils/noise/simplex/SimplexNoise';
import { fractalNoise2D } from '../../utils/noise/FractalNoise';
import { GLTexture2D } from './GLTexture';
import {
  InternalFormat,
  TextureComponentType,
  TextureFormat,
  TextureMagFilter,
  TextureMinFilter,
  TextureWrappingMode
} from './TextureEnums';

export interface NoiseParameters {
  seed: number;
  octaves: number;
  persistence: number;
  scale: number;
  normalize: boolean;
  float32: boolean;
}

export interface TextureNoiseParameters extends NoiseParameters {
  width: number;
  height: number;
}

export class NoiseTextureGenerator {
  constructor(readonly gl: WebGL2RenderingContext) {}

  create(params?: Partial<TextureNoiseParameters>): GLTexture2D {
    const target = new GLTexture2D(this.gl)
      .bind()
      .minFilter(TextureMinFilter.NEAREST)
      .magFilter(TextureMagFilter.NEAREST)
      .wrap(TextureWrappingMode.REPEAT);
    this.generate(this.createParameters(params), target);
    return target.unbind();
  }

  update(params: Partial<NoiseParameters>, target: GLTexture2D): void {
    this.generate(this.createParameters({ width: target.width, height: target.height, ...params }), target);
  }

  private generate(params: TextureNoiseParameters, target: GLTexture2D): void {
    let noise: Noise<vec2>;
    if (params.octaves > 0) noise = fractalNoise2D(simplexNoise2D(params.seed), params.octaves, params.persistence);
    else noise = simplexNoise2D(params.seed);

    const array = params.float32
      ? new Float32Array(params.width * params.height)
      : new Uint8Array(params.width * params.height);

    const v: vec2 = [0, 0];
    const bounds: vec2 = [Infinity, -Infinity];
    const scale = params.scale;
    const val = params.float32 ? (x: number) => x : (x: number) => Math.floor(x * 255);
    for (let y = 0; y < params.height; y++) {
      for (let x = 0; x < params.width; x++) {
        vec2.set(v, (x / params.width) * scale, (y / params.height) * scale);
        const n = val((noise(v) + 1) / 2);
        array[y * params.width + x] = n;
        bounds[0] = Math.min(n, bounds[0]);
        bounds[1] = Math.max(n, bounds[1]);
      }
    }

    if (params.normalize) {
      const low = bounds[0];
      const n = bounds[1] - bounds[0];
      for (let index = 0; index < array.length; index++) {
        array[index] = val((array[index] - low) / n);
      }
    }

    target.data({
      buffer: array,
      width: params.width,
      height: params.height,
      internalFormat: params.float32 ? InternalFormat.R32F : InternalFormat.R8,
      format: TextureFormat.RED,
      type: params.float32 ? TextureComponentType.FLOAT : TextureComponentType.UNSIGNED_BYTE
    });
  }

  private createParameters(params?: Partial<TextureNoiseParameters>): TextureNoiseParameters {
    params = params || {};
    return {
      seed: randomSimplexSeed(),
      width: 512,
      height: 512,
      octaves: 4,
      persistence: 5,
      scale: 1,
      float32: true,
      normalize: true,
      ...params
    };
  }
}
