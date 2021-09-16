import { PlanetGeneratorSettings } from '../PlanetGeneratorSettings';
import { PlanetIndexBuffer } from '../index/PlanetIndexBuffer';
import { CancellablePromise, JobRunner } from './CancellableJob';
import { vertexIndexLookup } from '../VertexIndexLookup';
import { DrawMode } from 'gl';

export interface PlanetIndexGenerator {
  generate(
    settings: PlanetGeneratorSettings,
    indexBuffer?: PlanetIndexBuffer
  ): PlanetIndexBuffer | CancellablePromise<PlanetIndexBuffer>;
}

const INDEX_PER_CHUNK = 1000000;

export function newIndexGenerator(drawMode: DrawMode, indexPerChunk = INDEX_PER_CHUNK): PlanetIndexGenerator {
  if (drawMode === DrawMode.TRIANGLES) return new TrianglesIndexGenerator(indexPerChunk);
  else if (drawMode === DrawMode.TRIANGLE_STRIP) return new TriangleStripIndexGenerator(indexPerChunk);
  else throw new Error('Invalid draw mode ' + drawMode);
}

abstract class AbstractIndexGenerator implements PlanetIndexGenerator {
  private readonly jobRunner = new JobRunner<PlanetIndexBuffer>();

  protected constructor(readonly indexPerChunk: number, readonly drawMode: DrawMode) {}

  async generate(
    settings: PlanetGeneratorSettings,
    indexBuffer?: PlanetIndexBuffer
  ): CancellablePromise<PlanetIndexBuffer> {
    if (settings.drawMode !== this.drawMode) throw new Error('Wrong generator for ' + settings.drawMode);
    const resolution = settings.resolution;

    const indexCount = PlanetIndexBuffer.indexCount(resolution, this.drawMode);
    indexBuffer = indexBuffer || PlanetIndexBuffer.create(settings.resolution, this.drawMode);
    if (indexBuffer.capacity < indexCount || indexBuffer.drawMode !== this.drawMode) {
      indexBuffer = PlanetIndexBuffer.create(resolution, this.drawMode);
    }
    if (indexBuffer.count !== indexCount) {
      indexBuffer.count = 0;
      return this.jobRunner.startJob(this.newGenerator(resolution, indexBuffer));
    }
    return indexBuffer;
  }

  protected abstract newGenerator(
    resolution: number,
    indexBuffer: PlanetIndexBuffer
  ): Generator<unknown, PlanetIndexBuffer>;
}

class TrianglesIndexGenerator extends AbstractIndexGenerator {
  constructor(indexPerChunk: number) {
    super(indexPerChunk, DrawMode.TRIANGLES);
  }

  protected *newGenerator(resolution: number, indexBuffer: PlanetIndexBuffer): Generator<unknown, PlanetIndexBuffer> {
    const rowPerFace = resolution - 1;
    const getVertexIndex = vertexIndexLookup(resolution);
    let a, b, c, d;
    let nextChunk = this.indexPerChunk;
    for (let face = 0; face < 6; face++) {
      for (let row = 0; row < rowPerFace; row++) {
        for (let col = 0; col < resolution - 1; col++) {
          a = getVertexIndex(face, row, col);
          b = getVertexIndex(face, row, col + 1);
          c = getVertexIndex(face, row + 1, col);
          d = getVertexIndex(face, row + 1, col + 1);
          indexBuffer.pushIndices(a, c, d);
          indexBuffer.pushIndices(a, d, b);
          if (indexBuffer.count >= nextChunk) {
            yield;
            nextChunk += this.indexPerChunk;
          }
        }
      }
    }
    return indexBuffer;
  }
}

class TriangleStripIndexGenerator extends AbstractIndexGenerator {
  constructor(indexPerChunk: number) {
    super(indexPerChunk, DrawMode.TRIANGLE_STRIP);
  }

  protected *newGenerator(resolution: number, indexBuffer: PlanetIndexBuffer): Generator<unknown, PlanetIndexBuffer> {
    const rowPerFace = resolution - 1;
    const getVertexIndex = vertexIndexLookup(resolution);
    let nextChunk = this.indexPerChunk;
    for (let face = 0; face < 6; face++) {
      for (let row = 0; row < rowPerFace; row++) {
        for (let col = 0; col < resolution; col++) {
          indexBuffer.pushIndices(getVertexIndex(face, row, col), getVertexIndex(face, row + 1, col));
        }
        indexBuffer.pushIndices(0xffffffff);
        if (indexBuffer.count >= nextChunk) {
          yield;
          nextChunk += this.indexPerChunk;
        }
      }
    }
    return indexBuffer;
  }
}
