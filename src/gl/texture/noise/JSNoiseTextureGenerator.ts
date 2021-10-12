import { vec2 } from 'gl-matrix';
import { fractalNoise2D, Noise, simplexNoise2D } from 'random';
import { GLTexture2D } from '../GLTexture';
import { TextureComponentType } from '../TextureEnums';
import {
  AbstractNoiseTextureGenerator,
  createVec2,
  isFractalNoiseParameters,
  NoiseParameters
} from './NoiseTextureGenerator';

export class JSNoiseTextureGenerator extends AbstractNoiseTextureGenerator {
  constructor(gl: WebGL2RenderingContext) {
    super(gl);
  }

  protected doGenerate(size: vec2, params: NoiseParameters, target: GLTexture2D): void {
    let noise: Noise;
    if (isFractalNoiseParameters(params) && params.octaves > 0)
      noise = fractalNoise2D(simplexNoise2D(params.seed), params.octaves, params.persistence);
    else noise = simplexNoise2D(params.seed);

    const v: vec2 = [0, 0];
    const array = new Float32Array(size[0] * size[1]);
    const offset = createVec2(params.offset);
    const scale = createVec2(params.scale);
    const range = createVec2(params.range);
    for (let y = 0; y < size[1]; y++) {
      for (let x = 0; x < size[0]; x++) {
        vec2.div(v, vec2.set(v, x, y), size);
        vec2.mul(v, v, scale);
        vec2.add(v, v, offset);

        const n = (noise(v) + 1) / 2;
        array[y * size[0] + x] = range[0] + n * (range[1] - range[0]);
      }
    }

    target.subdata({
      srcData: array,
      width: size[0],
      height: size[1],
      type: TextureComponentType.FLOAT
    });
  }
}
