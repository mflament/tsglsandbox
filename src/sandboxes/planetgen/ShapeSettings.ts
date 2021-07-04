import { NoiseSettings } from './noise/NoiseSettings';

export type CubeShapeSettings = {
  type: 'cube';
  resolution: number;
};

export type SphereShapeSettings = {
  type: 'sphere';
  resolution: number;
  radius: number;
};

export type TerrainShapeSettings = {
  type: 'terrain';
  resolution: number;
  radius: number;
  noiseSettings: NoiseSettings;
};

export type ShapeSettings = CubeShapeSettings | SphereShapeSettings | TerrainShapeSettings;
