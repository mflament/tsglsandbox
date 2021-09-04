import {vec3} from 'gl-matrix';
import {fractalNoise3D, Noise, simplexNoise3D} from "random";
import {TerrainElevationSettings} from "./PlanetGeneratorSettings";

export interface ElevationModifier {
  elevate(source: vec3): number;
}

export class SphereElevationModifier implements ElevationModifier {
  constructor(readonly radius: number) {
  }

  elevate(): number {
    return this.radius;
  }
}

export class TerrainElevationModifier implements ElevationModifier {
  private readonly noise: Noise<vec3>;
  private readonly point = vec3.create();

  constructor(readonly settings: TerrainElevationSettings) {
    this.noise = fractalNoise3D(simplexNoise3D(settings.seed), settings.octaves, settings.persistence);
    //this.noise = simplexNoise3D(settings.seed);
  }

  elevate(source: vec3): number {
    vec3.scale(this.point, source, this.settings.scale);
    const n = this.noise(this.point); // (-1,1)
    const he = this.settings.elevation / 2;
    return 1 - he + n * he;
  }
}

// export class TerrainElevationModifier implements ElevationModifier {
//   private readonly rng: RNG;
//   private readonly filters: NoiseFilter[] = [];
//
//   constructor(readonly settings: PlanetGeneratorSettings) {
//     this.rng = new RNG(this.settings.noiseSettings.seed);
//     this.filters = settings.noiseSettings.layers.map(s => this.createFilter(s));
//   }
//
//   private createFilter(settings: NoiseLayerSettings): NoiseFilter {
//     settings = settings || {};
//
//     const seed = this.rng.random(0, Math.pow(2, Uint32Array.BYTES_PER_ELEMENT * 8) - 1);
//     const noise = simplexNoise3D(seed);
//     if (settings.filterSettings.type === 'rigid') {
//       return makeRidgidNoiseFilter(settings.filterSettings, noise);
//     }
//     return makeSimpleNoiseFilter(settings.filterSettings, noise);
//   }
//
//   elevate(source: vec3): number {
//     const layers = this.settings.noiseSettings.layers;
//     const filters = this.filters;
//     let elevation = 0;
//     if (filters.length > 0) {
//       let filter = filters[0];
//       let settings = layers[0];
//       const firstValue = filter(source);
//       if (settings.enabled) elevation += firstValue;
//
//       for (let i = 1; i < filters.length; i++) {
//         settings = layers[i];
//         if (settings.enabled) {
//           filter = filters[i];
//           const mask = settings.useMask ? firstValue : 1;
//           elevation += filter(source) * mask;
//         }
//       }
//     }
//     return this.settings.radius * (1 + elevation);
//   }
// }

