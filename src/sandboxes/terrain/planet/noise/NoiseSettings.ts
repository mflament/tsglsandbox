import { RNG } from 'random';
import { vec3 } from 'gl-matrix';

export class NoiseFilterSettings {
  strength = 1;
  roughness = 1.14;
  center = vec3.create();

  layers = 4;
  persistence = 0.5;
  baseRoughness = 1.14;

  minValue = 0;
}

export class SimpleNoiseFilterSettings extends NoiseFilterSettings {
  readonly type = 'simple';
}

export class RigidNoiseFilterSettings extends NoiseFilterSettings {
  readonly type = 'rigid';
  weightMultiplier = 1;
}

export class NoiseLayerSettings {
  enabled = true;
  useMask = false;
  filterSettings: SimpleNoiseFilterSettings | RigidNoiseFilterSettings = new SimpleNoiseFilterSettings();
}

export class NoiseSettings {
  seed = RNG.randomSeed(6);
  layers: NoiseLayerSettings[] = [new NoiseLayerSettings()];
}
