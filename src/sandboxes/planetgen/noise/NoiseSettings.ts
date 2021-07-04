export type NoiseFilterType = 'simple' | 'ridgid';

export type NoiseFilterSettings = {
  strength: number;
  roughness: number;
  center: { x: number; y: number; z: number };

  layers: number;
  persistence: number;
  baseRoughness: number;

  minValue: number;
};

export type SimpleNoiseFilterSettings = NoiseFilterSettings & {
  type: 'simple';
};

export type RidgidNoiseFilterSettings = NoiseFilterSettings & {
  type: 'ridgid';
  weightMultiplier: number;
};

export type NoiseFiltersSettings = SimpleNoiseFilterSettings | RidgidNoiseFilterSettings;

export type NoiseLayerSettings = {
  enabled: boolean;
  useMask: boolean;
  filterSettings: NoiseFiltersSettings;
};

export type NoiseSettings = {
  seed: string;
  layers: NoiseLayerSettings[];
};

export const defaultNoiseLayerSettings: NoiseLayerSettings = {
  enabled: true,
  useMask: false,
  filterSettings: {
    type: 'simple',
    strength: 1,
    roughness: 1.14,
    center: { x: 0, y: 0, z: 0 },

    layers: 4,
    persistence: 0.5,
    baseRoughness: 1.14,

    minValue: 0
  }
};
