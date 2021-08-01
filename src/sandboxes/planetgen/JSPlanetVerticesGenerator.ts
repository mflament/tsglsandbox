import {SphereElevationModifier, TerrainElevationModifier} from './ElevationModifier';
import {vec2, vec3} from 'gl-matrix';
import {FACE_DIRECTIONS, PlanetGeneratorSettings, planetVertices, PlanetVerticesGenerator} from "./PlanetGenerator";

import {InterleavedBuffer} from "three";
import {VERTEX_SIZE, Vertices} from "./Vertices";

export class JSPlanetVerticesGenerator implements PlanetVerticesGenerator {

  private readonly vectors = {
    uv: vec2.create(),
    pos: vec3.create(),
    point: vec3.create(),
    axisA: vec3.create(),
    axisB: vec3.create()
  };

  generate(settings: PlanetGeneratorSettings, buffer?: InterleavedBuffer): InterleavedBuffer {
    const elevationModifier = settings.shapeType === 'sphere'
      ? new SphereElevationModifier(1)
      : settings.shapeType === 'terrain' ? new TerrainElevationModifier(settings.terrain) : undefined;

    const resolution = settings.resolution;
    const vertexCount = planetVertices(resolution);
    let array = buffer?.array;
    if (!array || array.length * VERTEX_SIZE !== vertexCount) {
      array = new Float32Array(vertexCount * VERTEX_SIZE);
      if (buffer) {
        buffer.array = array;
        buffer.needsUpdate = true;
      }
    }
    if (!(array instanceof Float32Array))
      throw new Error("Buffer array " + array + " is not a Float32Array");

    const vertices = new Vertices(array);
    const {uv, pos, point, axisA, axisB} = this.vectors;

    function addVertex(face: number, x: number, y: number) {
      const dir = FACE_DIRECTIONS[face];
      vec2.scale(uv, vec2.set(uv, x, y), 1 / (resolution - 1));
      vec3.scale(axisA, dir.axisA, (uv[0] - 0.5) * 2);
      vec3.scale(axisB, dir.axisB, (uv[1] - 0.5) * 2);

      vec3.add(point, dir.localUp, axisA);
      vec3.add(point, point, axisB);

      vec3.normalize(pos, point);
      // θ = tan−1(−z/x) / θ = atan2(-z, x);
      const theta = Math.atan(-pos[2] / pos[0]);
      // φ = acos(-y);
      const phi = Math.acos(-pos[1]);
      // u = (θ + π) / 2 π; v = φ / π
      vec2.set(uv, (theta + Math.PI) / (2 * Math.PI), phi / Math.PI);

      if (!elevationModifier) {
        vertices.push(point, undefined, uv);
      } else {
        const elevation = elevationModifier.elevate(pos);
        vec3.scale(point, pos, elevation);
        vertices.push(point, undefined, uv);
      }
    }

    function addVertices(face: number): void {
      let start, width;
      if (face < 4) {
        start = 0;
        width = resolution;
      } else {
        start = 1;
        width = resolution - 1;
      }
      for (let y = start; y < resolution - 1; y++) {
        for (let x = start; x < width; x++) {
          addVertex(face, x, y);
        }
      }
    }

    for (let face = 0; face < 6; face++) {
      addVertices(face);
    }
    if (vertices.count < vertexCount)
      throw new Error("Missing some vertices");

    return buffer || new InterleavedBuffer(array, VERTEX_SIZE);
  }

}
