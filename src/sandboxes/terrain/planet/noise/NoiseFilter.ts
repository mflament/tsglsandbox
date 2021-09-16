import { Noise } from 'random';
import { NoiseFilterSettings, RigidNoiseFilterSettings, SimpleNoiseFilterSettings } from './NoiseSettings';
import { vec3 } from 'gl-matrix';

const noiseInput = vec3.create();

export type NoiseFilter = (point: vec3) => number;

function createCenter(settings: NoiseFilterSettings): vec3 {
  return vec3.copy(vec3.create(), settings.center);
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export const makeSimpleNoiseFilter = (settings: SimpleNoiseFilterSettings, noise3D: Noise<vec3>): NoiseFilter => {
  const center = createCenter(settings);
  return (point: vec3): number => {
    let value = 0;
    let frequency = settings.baseRoughness;
    let amplitude = 1;
    for (let layer = 0; layer < settings.layers; layer++) {
      vec3.scale(noiseInput, point, frequency);
      vec3.add(noiseInput, noiseInput, center);
      const v = (noise3D(noiseInput) + 1) * 0.5 * amplitude;
      value += v;
      frequency *= settings.roughness;
      amplitude *= settings.persistence;
    }
    value = Math.max(0, value - settings.minValue);
    return value * settings.strength;
  };
};

export const makeRidgidNoiseFilter = (settings: RigidNoiseFilterSettings, noise3D: Noise<vec3>): NoiseFilter => {
  const center = createCenter(settings);
  return (point: vec3): number => {
    let value = 0;
    let frequency = settings.baseRoughness;
    let amplitude = 1;
    let weight = 1;
    for (let layer = 0; layer < settings.layers; layer++) {
      vec3.scale(noiseInput, point, frequency);
      vec3.add(noiseInput, noiseInput, center);
      let v = noise3D(noiseInput);
      v = 1 - Math.abs(v);
      v *= v;
      v *= weight;
      weight = clamp(v * settings.weightMultiplier, 0, 1);

      v *= amplitude;
      value += v;
      frequency *= settings.roughness;
      amplitude *= settings.persistence;
    }
    value = Math.max(0, value - settings.minValue);
    return value * settings.strength;
  };
};
