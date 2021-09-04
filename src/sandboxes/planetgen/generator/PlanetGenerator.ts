import {PlanetGeneratorSettings} from "../PlanetGeneratorSettings";
import {Planet} from "../Planet";
import {CancellablePromise} from "./CancellableJob";
import {DefaultVertexGenerator, PlanetVertexGenerator} from "./PlanetVertexGenerator";
import {newIndexGenerator} from "./PlanetIndexGenerator";
import {DefaultNormalsGenerator, PlanetNormalsGenerator} from "./PlanetNormalsGenerator";

export interface PlanetGenerator {
  generate(settings: PlanetGeneratorSettings, planet: Planet): CancellablePromise<void>;
}

export class DefaultPlanetGenerator implements PlanetGenerator {
  private vertexGenerator: PlanetVertexGenerator = new DefaultVertexGenerator();
  private normalsGenerator: PlanetNormalsGenerator = new DefaultNormalsGenerator();

  async generate(settings: PlanetGeneratorSettings, planet: Planet): CancellablePromise<void> {
    const times = { index: 0, vertex: 0, normals: 0 };

    let now = performance.now();
    let start = now;
    const indexGenerator = newIndexGenerator(settings.drawMode);
    const index = await indexGenerator.generate(settings, planet.indexBuffer);
    if (index === 'cancelled') return 'cancelled';
    now = performance.now();
    times.index = now -start;
    start = now;

    const vertex = await this.vertexGenerator.generate(settings, planet.vertexBuffer);
    if (vertex === 'cancelled') return 'cancelled';
    now = performance.now();
    times.vertex = now -start;
    start = now;

    if (await this.normalsGenerator.generate(settings, index, vertex) === 'cancelled')
      return 'cancelled';

    now = performance.now();
    times.normals = now -start;
    start = now;

    console.log("times ", times);
    planet.update(index, vertex);
  }
}
