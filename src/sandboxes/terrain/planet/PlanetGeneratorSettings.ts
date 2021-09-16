import { control, DrawMode } from 'gl';
import { randomSimplexSeed } from 'random';

export type ShapeType = 'cube' | 'sphere' | 'terrain';

export interface PlanetGeneratorSettings {
  shapeType: ShapeType;
  drawMode: DrawMode;
  resolution: number;
  color: number;
  terrain: TerrainElevationSettings;
}

export interface TerrainElevationSettings {
  seed: number;
  elevation: number;
  octaves: number;
  persistence: number;
  scale: number;
}

export class DefaultPlanetGeneratorSettings implements PlanetGeneratorSettings {
  @control({ choices: { values: ['cube', 'sphere', 'terrain'] } })
  shapeType: ShapeType = 'cube';

  @control({
    choices: { values: [DrawMode.TRIANGLES, DrawMode.TRIANGLE_STRIP], labels: ['Triangles', 'Triangles Strip'] }
  })
  drawMode: DrawMode = DrawMode.TRIANGLE_STRIP;

  @control({ min: 2, max: 512, step: 1, debounce: 250 })
  resolution = 64;

  @control({ color: true })
  color = 0x0000ff;

  terrain = new DefaultTerrainElevationSettings();
}

export class DefaultTerrainElevationSettings implements TerrainElevationSettings {
  seed = randomSimplexSeed();
  /**
   * pct of radius that will have varying elevation
   */
  @control({ min: 0, max: 1, step: 0.01 })
  elevation = 0.2;
  @control({ min: 1, max: 12, step: 1 })
  octaves = 4;
  @control({ min: 0, max: 2, step: 0.01 })
  persistence = 0.5;
  @control({ min: 0.1, max: 20, step: 0.01 })
  scale = 1;
}
