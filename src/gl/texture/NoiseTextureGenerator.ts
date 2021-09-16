import { vec2 } from 'gl-matrix';
import { fractalNoise2D, Noise, randomSimplexSeed, simplexNoise2D } from 'random';
import { GLTexture2D } from './GLTexture';
import {
  InternalFormat,
  PixelStoreParameter,
  TextureComponentType,
  TextureMagFilter,
  TextureMinFilter,
  TextureWrappingMode
} from './TextureEnums';

export interface NoiseParameters {
  width: number;
  height: number;
  seed?: number;
  scale: number;
  range: vec2;
  normalize: boolean;
  float32: boolean;
}

export interface FractalNoiseParameters extends NoiseParameters {
  octaves: number;
  persistence: number;
}

function isFractalNoiseParameters(params: NoiseParameters): params is FractalNoiseParameters {
  const fp = params as Partial<FractalNoiseParameters>;
  return params && typeof fp.octaves === 'number';
}

export class NoiseTextureGenerator {
  constructor(readonly gl: WebGL2RenderingContext) {}

  create(params?: Partial<NoiseParameters>): GLTexture2D {
    return this.generate(NoiseTextureGenerator.createParameters(params));
  }

  update(params: Partial<NoiseParameters>, target: GLTexture2D): GLTexture2D {
    return this.generate(
      NoiseTextureGenerator.createParameters({ width: target.width, height: target.height, ...params }),
      target
    );
  }

  private generate(params: NoiseParameters, target?: GLTexture2D): GLTexture2D {
    const internalFormat = params.float32 ? InternalFormat.R32F : InternalFormat.R8;
    if (
      !target ||
      target.internalFormat !== internalFormat ||
      target.width !== params.width ||
      target.height !== params.height
    ) {
      target?.delete();
      target = new GLTexture2D(this.gl, internalFormat)
        .bind()
        .minFilter(TextureMinFilter.NEAREST)
        .magFilter(TextureMagFilter.NEAREST)
        .wrap(TextureWrappingMode.REPEAT)
        .freeze(params.width, params.height);
    }

    let noise: Noise;
    if (isFractalNoiseParameters(params) && params.octaves > 0)
      noise = fractalNoise2D(simplexNoise2D(params.seed), params.octaves, params.persistence);
    else noise = simplexNoise2D(params.seed);

    let val, unpackAlignment, array;
    if (params.float32) {
      array = new Float32Array(params.width * params.height);
      unpackAlignment = 4;
      val = (x: number) => x;
    } else {
      array = new Uint8Array(params.width * params.height);
      unpackAlignment = params.width % 4 === 0 ? 4 : 1;
      val = (x: number) => Math.floor(x * 255);
    }

    this.gl.pixelStorei(PixelStoreParameter.UNPACK_ALIGNMENT, unpackAlignment);
    const v: vec2 = [0, 0];
    const bounds: vec2 = [Infinity, -Infinity];
    const scale = params.scale;
    for (let y = 0; y < params.height; y++) {
      for (let x = 0; x < params.width; x++) {
        vec2.set(v, (x / params.width - 0.5) * scale, (y / params.height - 0.5) * scale);
        const n = val((noise(v) + 1) / 2);
        array[y * params.width + x] = params.range[0] + n * (params.range[1] - params.range[0]);
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

    target.subdata({
      srcData: array,
      width: params.width,
      height: params.height,
      type: params.float32 ? TextureComponentType.FLOAT : TextureComponentType.UNSIGNED_BYTE
    });
    return target;
  }

  private static createParameters(params?: Partial<FractalNoiseParameters>): NoiseParameters {
    params = params || {};
    return {
      seed: randomSimplexSeed(),
      width: 512,
      height: 512,
      scale: 1,
      float32: true,
      normalize: false,
      range: [0, 1],
      ...params
    };
  }
}
