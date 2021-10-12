import { PlanetGeneratorSettings } from '../PlanetGeneratorSettings';
import { Planet } from '../Planet';
import { CancellablePromise, DefaultCancellablePromise, StoppableRunner } from './CancellablePromise';
import { ElevationModifier, SphereElevationModifier, TerrainElevationModifier } from './ElevationModifier';
import { PlanetBufferGeometry, RESTART_INDEX } from '../PlanetBufferGeometry';
import { vec2, vec3 } from 'gl-matrix';
import { FACE_DIRECTIONS } from './FaceDirection';
import { vertexIndexLookup } from './VertexIndexLookup';
import { vertexCount } from './PlanetUtils';

export interface PlanetGenerator {
  generate(settings: PlanetGeneratorSettings, planet: Planet): CancellablePromise<void>;
}

export class DefaultPlanetGenerator implements PlanetGenerator {
  generate(settings: PlanetGeneratorSettings, planet: Planet): CancellablePromise<void> {
    return new DefaultCancellablePromise(generateTask(settings, planet.geometry), 50);
  }
}

function generateTask(settings: PlanetGeneratorSettings, geometry: PlanetBufferGeometry): StoppableRunner<void> {
  const uv = vec2.create();
  const pos = vec3.create();
  const npos = vec3.create();
  const cb = vec3.create();
  const ab = vec3.create();
  const triangle: [a: vec3, b: vec3, c: vec3] = [vec3.create(), vec3.create(), vec3.create()];

  const resolution = settings.resolution;

  const triangleStrip = settings.triangleStrip;

  let elevationModifier: ElevationModifier | undefined;
  if (settings.shapeType === 'sphere') elevationModifier = new SphereElevationModifier(1);
  else if (settings.shapeType === 'terrain') elevationModifier = new TerrainElevationModifier(settings.terrain);

  const vertexLookup = vertexIndexLookup(resolution);

  function* generate(): StoppableRunner<void> {
    let shouldStop = yield;
    console.time('Total');

    console.time('Vertex');
    for (let face = 0; face < 6; face++) {
      for (let y = 0; y < resolution; y++) {
        for (let x = 0; x < resolution; x++) {
          generateVertex(face, x, y);
          if (shouldStop()) shouldStop = yield;
        }
      }
    }
    console.timeEnd('Vertex');

    console.time('Index');
    for (let face = 0; face < 6; face++) {
      for (let y = 0; y < resolution; y++) {
        for (let x = 0; x < resolution; x++) {
          generateIndex(face, x, y);
          if (shouldStop()) shouldStop = yield;
        }
      }
    }
    console.timeEnd('Index');

    console.time('compute normals');
    const trianglesIterator = geometry.triangleIndices(settings.triangleStrip);
    let next = trianglesIterator.next();
    while (!next.done) {
      const triangle = next.value;
      computeTriangleNormals(triangle);
      next = trianglesIterator.next();
      if (shouldStop()) shouldStop = yield;
    }
    console.timeEnd('compute normals');

    console.time('normalize normals');
    const vertexes = vertexCount(resolution);
    for (let normalizedVertex = 0; normalizedVertex < vertexes; normalizedVertex++) {
      geometry.getNormal(normalizedVertex, npos);
      vec3.normalize(npos, npos);
      geometry.setNormal(normalizedVertex, npos);
      if (shouldStop()) shouldStop = yield;
    }
    console.timeEnd('normalize normals');

    console.time('geometry.commit');
    geometry.commit(resolution, triangleStrip);
    console.timeEnd('geometry.commit');

    console.timeEnd('Total');
  }

  function generateVertex(face: number, x: number, y: number): void {
    if (face < 4 || (x > 0 && y > 0)) {
      pushVertex(face, x, y);
      if (face < 4 && x === resolution - 1) {
        pushVertex(face, x + 1, y);
      }
    }
  }

  function pushVertex(face: number, x: number, y: number): void {
    const faceDirection = FACE_DIRECTIONS[face];
    vec2.set(uv, x, y);
    vec2.scale(uv, uv, 1 / resolution);

    vec3.copy(pos, faceDirection.normal);
    vec3.add(pos, pos, vec3.scale(npos, faceDirection.xAxis, (uv[0] - 0.5) * 2));
    vec3.add(pos, pos, vec3.scale(npos, faceDirection.yAxis, (uv[1] - 0.5) * 2));

    // compute uv : project point on unit sphere
    vec3.normalize(npos, pos);
    // θ = tan−1(−z/x) / θ = atan2(-z, x);
    const theta = Math.atan(-npos[2] / npos[0]);
    // φ = acos(-y);
    const phi = Math.acos(-npos[1]);
    // u = (θ + π) / 2 π; v = φ / π
    vec2.set(uv, (theta + Math.PI) / (2 * Math.PI), phi / Math.PI);

    if (elevationModifier) {
      const elevation = elevationModifier.elevate(pos);
      vec3.scale(pos, npos, elevation);
    }
    geometry.pushVertex(pos, uv);
  }

  function generateIndex(face: number, x: number, y: number): void {
    function lookupVertex(rowOffset: number, colOffset: number): number {
      return vertexLookup(face, y + rowOffset, x + colOffset);
    }

    if (triangleStrip) {
      let a = lookupVertex(0, 0);
      let b = lookupVertex(1, 0);
      geometry.pushIndex(a, b);
      if (x === resolution - 1) {
        a = lookupVertex(0, 1);
        b = lookupVertex(1, 1);
        geometry.pushIndex(a, b, RESTART_INDEX);
      }
    } else {
      const a = lookupVertex(0, 0);
      const b = lookupVertex(0, 1);
      const c = lookupVertex(1, 0);
      const d = lookupVertex(1, 1);
      geometry.pushIndex(a, c, d);
      geometry.pushIndex(a, d, b);
    }
  }

  function computeTriangleNormals(indices: [a: number, b: number, c: number]): void {
    geometry.getPosition(indices[0], triangle[0]);
    geometry.getPosition(indices[1], triangle[1]);
    geometry.getPosition(indices[2], triangle[2]);

    vec3.sub(cb, triangle[2], triangle[1]);
    vec3.sub(ab, triangle[0], triangle[1]);
    vec3.cross(cb, cb, ab);

    addNormal(indices[0], cb);
    addNormal(indices[1], cb);
    addNormal(indices[2], cb);
  }

  function addNormal(vertexIndex: number, normal: vec3): void {
    geometry.getNormal(vertexIndex, npos);
    vec3.add(npos, npos, normal);
    geometry.setNormal(vertexIndex, npos);
  }

  geometry.clear();
  return generate();
}
