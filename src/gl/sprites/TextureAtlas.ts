import { vec2 } from 'gl-matrix';
import { GLTexture2D } from '../texture/GLTexture';

export interface TextureRegion {
  textureOffset: vec2;
  textureSize: vec2;
}

export interface Animation {
  start: number;
  frames: number;
  duration: number;
}

function defaultRegion(): TextureRegion {
  return { textureSize: [1, 1], textureOffset: [0, 0] };
}

export class TextureAtlas {
  constructor(
    readonly texture: GLTexture2D,
    readonly regions: TextureRegion[] = [defaultRegion()],
    readonly animations: Animation[] = [],
    readonly textureIndex?: number
  ) {}
}

export function splitRegions(rows: number, columns: number, count = rows * columns): TextureRegion[] {
  const cellSize: vec2 = [1 / columns, 1 / rows];
  const regions: TextureRegion[] = [];
  for (let row = 0; regions.length < count && row < rows; row++) {
    for (let col = 0; regions.length < count && col < columns; col++) {
      regions.push({
        textureOffset: [col * cellSize[0], 1 - (row + 1) * cellSize[1]],
        textureSize: cellSize
      });
    }
  }
  return regions;
}
