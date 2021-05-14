import { vec2 } from 'gl-matrix';
import { Noise } from '../../utils/noise/Noise';
import { GLTexture2D } from './GLTexture';

export class NoiseTextureGenerator {
  constructor(readonly gl: WebGL2RenderingContext) {}

  generate(noise: Noise<vec2>, target: GLTexture2D, scale = 1): void {
    if (target.width == 0 || target.height == 0) return;
    // let array =
  }
}
