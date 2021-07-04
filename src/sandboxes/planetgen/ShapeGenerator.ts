import { vec3 } from 'gl-matrix';
import { NoiseFilter, makeSimpleNoiseFilter, makeRidgidNoiseFilter } from './noise/NoiseFilter';
import { RNG } from 'utils';
import { NoiseLayerSettings } from './noise/NoiseSettings';
import { TerrainShapeSettings, SphereShapeSettings } from './ShapeSettings';

export interface ShapeGenerator {
  generate(source: vec3, target: vec3): void;
}

export class SphereShapeGenerator implements ShapeGenerator {
  constructor(readonly settings: SphereShapeSettings) {}
  generate(pointOnUnitCube: vec3, pointOnSphere: vec3): void {
    vec3.normalize(pointOnSphere, pointOnUnitCube);
    vec3.scale(pointOnSphere, pointOnSphere, this.settings.radius);
  }
}

export class NoiseShapeGenerator implements ShapeGenerator {
  private readonly rng: RNG;
  private readonly filters: NoiseFilter[] = [];

  constructor(readonly settings: TerrainShapeSettings) {
    this.rng = new RNG(this.settings.noiseSettings.seed);
    this.filters = settings.noiseSettings.layers.map(s => this.createFilter(s));
  }

  private createFilter(settings: NoiseLayerSettings): NoiseFilter {
    settings = settings || {};

    const seed = this.rng.random(0, Math.pow(2, Uint32Array.BYTES_PER_ELEMENT * 8) - 1);
    const noise = makeNoise3D(seed);
    if (settings.filterSettings.type === 'ridgid') {
      return makeRidgidNoiseFilter(settings.filterSettings, noise);
    }
    return makeSimpleNoiseFilter(settings.filterSettings, noise);
  }

  generate(pointOnUnitCube: vec3, pointOnTerrain: vec3): void {
    pointOnTerrain.copy(pointOnUnitCube).normalize();
    const layers = this.settings.noiseSettings.layers;
    const filters = this.filters;
    let elevation = 0;
    if (filters.length > 0) {
      let filter = filters[0];
      let settings = layers[0];
      const firstValue = filter(pointOnTerrain);
      if (settings.enabled) elevation += firstValue;

      for (let i = 1; i < filters.length; i++) {
        settings = layers[i];
        if (settings.enabled) {
          filter = filters[i];
          const mask = settings.useMask ? firstValue : 1;
          elevation += filter(pointOnTerrain) * mask;
        }
      }
    }
    pointOnTerrain.multiplyScalar(this.settings.radius).multiplyScalar(1 + elevation);
  }
}
