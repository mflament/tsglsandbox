import {PlanetGeneratorSettings} from "../PlanetGeneratorSettings";
import {PlanetIndexBuffer} from "../index/PlanetIndexBuffer";
import {NORMAL_OFFSET, PlanetVertexBuffer} from "../vertex/PlanetVertexBuffer";
import {CancellablePromise, JobRunner} from "./CancellableJob";
import {vec3} from "gl-matrix";

export interface PlanetNormalsGenerator {
  generate(settings: PlanetGeneratorSettings, indexBuffer: PlanetIndexBuffer, vertexBuffer: PlanetVertexBuffer): void | CancellablePromise<void>;
}

const TRIANGLES_PER_CHUNK = 100000;
const VERTEX_PER_CHUNK = 1000000;

export class DefaultNormalsGenerator implements PlanetNormalsGenerator {

  private readonly jobRunner = new JobRunner<void>();

  constructor(readonly trianglesPerChunk = TRIANGLES_PER_CHUNK, readonly vertexPerChunk = VERTEX_PER_CHUNK) {
  }

  async generate(_settings: PlanetGeneratorSettings, indexBuffer: PlanetIndexBuffer, vertexBuffer: PlanetVertexBuffer): CancellablePromise<void> {
    return this.jobRunner.startJob(this.newGenerator(indexBuffer, vertexBuffer));
  }

  private* newGenerator(index: PlanetIndexBuffer, vertex: PlanetVertexBuffer): Generator<unknown, void> {
    const positions = {a: vec3.create(), b: vec3.create(), c: vec3.create()};
    const cb = vec3.create();
    const ab = vec3.create();

    const triangles = index.triangles();
    let next = triangles.next();
    let completedTriangles = 0;
    while (!next.done) {
      const triangle = next.value;
      vertex.getTrianglePositions(triangle, positions);
      vec3.sub(cb, positions.c, positions.b);
      vec3.sub(ab, positions.a, positions.b);
      vec3.cross(cb, cb, ab);
      vertex.addNormal(triangle, cb);
      completedTriangles++;
      if (completedTriangles % this.trianglesPerChunk === 0)
        yield;
      next = triangles.next();
    }
    if (completedTriangles > 0)
      yield;

    for (let i = 0; i < vertex.vertexCount; i++) {
      const noffset = i * vertex.stride + NORMAL_OFFSET;
      vec3.set(cb, vertex.array[noffset], vertex.array[noffset + 1], vertex.array[noffset + 2]);
      vec3.normalize(cb, cb);
      vertex.array.set(cb, noffset);
      if (i % this.vertexPerChunk === 0) yield;
    }
  }
}
