import {control} from "gl";
import {TerrainElevationSettings} from "./ElevationModifier";
import {PlanetetBuffers, PlanetIndices} from "./Planet";
import {vec3} from "gl-matrix";
import {InterleavedBuffer} from "three";

export class PlanetGeneratorSettings {
  @control({choices: {values: ['cube', 'sphere', 'terrain']}})
  shapeType: 'cube' | 'sphere' | 'terrain' = 'cube';
  @control({min: 2, max: 256, step: 1})
  resolution = 64;

  @control({color: true, debounce: 0})
  color = 0x0000FF;

  terrain = new TerrainElevationSettings();
}

export interface PlanetGenerator {
  generate(settings: PlanetGeneratorSettings, buffers?: PlanetetBuffers): PlanetetBuffers;
}

export interface PlanetIndicesGenerator {
  generate(resolution: number, indices?: PlanetIndices): PlanetIndices;
}

export interface PlanetVerticesGenerator {
  generate(settings: PlanetGeneratorSettings, vertices?: InterleavedBuffer): InterleavedBuffer;
}

export function newPlanetGenerator(indicesGenerator: PlanetIndicesGenerator, verticesGenerator: PlanetVerticesGenerator): PlanetGenerator {
  return {
    generate(settings: PlanetGeneratorSettings, buffers?: PlanetetBuffers): PlanetetBuffers {
      const indices = indicesGenerator.generate(settings.resolution, buffers?.indices);
      const vertices = verticesGenerator.generate(settings, buffers?.vertices);
      return {indices: indices, vertices: vertices};
    }
  }
}

export function mainFacesVertices(resolution: number): number {
  return resolution * (resolution - 1);
}

export function sideFacesVertices(resolution: number): number {
  return (resolution - 2) * (resolution - 2);
}

export function planetVertices(resolution: number): number {
  return mainFacesVertices(resolution) * 4 + sideFacesVertices(resolution) * 2;
}

export function planetTriangles(resolution: number): number {
  return (resolution - 1) * (resolution - 1) * 2 * 6;
}

export class FaceDirection {
  readonly axisB: vec3;

  constructor(readonly localUp: vec3, readonly axisA: vec3) {
    this.axisB = vec3.cross(vec3.create(), axisA, localUp);
  }
}

export const FACE_DIRECTIONS = [
  new FaceDirection([0, 1, 0], [1, 0, 0]), // up
  new FaceDirection([0, 0, 1], [1, 0, 0]), // front
  new FaceDirection([0, -1, 0], [1, 0, 0]), // bottom
  new FaceDirection([0, 0, -1], [1, 0, 0]), // back
  new FaceDirection([1, 0, 0], [0, 0, 1]), // right
  new FaceDirection([-1, 0, 0], [0, 0, 1]) // left
];

// noinspection JSUnusedGlobalSymbols
export function printDirections(): string {
  return FACE_DIRECTIONS.map(fd => `FaceDirection(${fvec3(fd.localUp)}, ${fvec3(fd.axisA)}, ${fvec3(fd.axisB)})`).join(',\n');
}

function fvec3(v: vec3): string {
  return `vec3(${ffloat(v[0])}, ${ffloat(v[1])}, ${ffloat(v[2])})`;
}

function ffloat(f: number): string {
  return f.toFixed(1);
}
