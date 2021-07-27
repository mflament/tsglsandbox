import {
  ElevationModifier,
  SphereElevationModifier,
  TerrainElevationModifier,
  TerrainElevationSettings
} from './ElevationModifier';
import {PlanetBuffers} from './PlanetBuffers';
import {vec2, vec3} from 'gl-matrix';
import {control} from "gl";

export class PlanetGeneratorSettings {
  @control({choices: {values: ['cube', 'sphere', 'terrain']}})
  shapeType: 'cube' | 'sphere' | 'terrain' = 'cube';
  @control({min: 2, max: 256, step: 1})
  resolution = 64;

  @control({color: true, debounce: 0})
  color = 0x0000FF;

  terrain = new TerrainElevationSettings();
}

export class PlanetGenerator {
  private readonly shapeGenerator?: ElevationModifier;

  private uv = vec2.create(); // point on face
  private pos = vec3.create(); // point on sphere
  private point = vec3.create(); // point on terrain
  private axisA = vec3.create();
  private axisB = vec3.create();

  constructor(readonly planetBuffers: PlanetBuffers, readonly settings: PlanetGeneratorSettings) {
    const resolution = settings.resolution;
    if (planetBuffers.resolution !== resolution)
      throw new Error('buffers resolution ' + planetBuffers.resolution + ' does not match planet resolution ' + resolution);
    if (settings.shapeType === 'sphere') this.shapeGenerator = new SphereElevationModifier(1);
    else if (settings.shapeType === 'terrain') this.shapeGenerator = new TerrainElevationModifier(settings.terrain);
    else this.shapeGenerator = undefined;
  }

  generate(): void {
    this.generateMainFaces();
    this.generateSideFaces();
    this.planetBuffers.check();
    this.planetBuffers.computeNormals();
    console.log(this.x, this.y, this.theta);
  }

  // 4 main faces, connected by the last row to the next face
  private generateMainFaces(): void {
    const resolution = this.settings.resolution;
    const planetBuffers = this.planetBuffers;
    for (let face = 0; face < 4; face++) {
      const dir = Direction.DIRECTIONS[face];
      for (let y = 0; y < resolution - 1; y++) {
        for (let x = 0; x < resolution; x++) {
          const vertexIndex = this.addVertex(dir, x, y);
          if (x !== resolution - 1) {
            // create triangle
            const a = vertexIndex;
            const b = vertexIndex + 1;
            const c = planetBuffers.findVertexIndex(face, x, y + 1);
            const d = planetBuffers.findVertexIndex(face, x + 1, y + 1);
            planetBuffers.addTriangle(a, d, c);
            planetBuffers.addTriangle(a, b, d);
          }
        }
      }
    }
  }

  // 2 side faces, connected on each border to another face
  private generateSideFaces(): void {
    const resolution = this.settings.resolution;
    const planetBuffers = this.planetBuffers;
    for (let face = 4; face < 6; face++) {
      const dir = Direction.DIRECTIONS[face];
      for (let y = 0; y < resolution - 1; y++) {
        for (let x = 0; x < resolution - 1; x++) {
          if (x > 0 && y > 0) this.addVertex(dir, x, y);

          // create triangles
          const a = planetBuffers.findVertexIndex(face, x, y);
          const b = planetBuffers.findVertexIndex(face, x + 1, y);
          const c = planetBuffers.findVertexIndex(face, x, y + 1);
          const d = planetBuffers.findVertexIndex(face, x + 1, y + 1);
          planetBuffers.addTriangle(a, d, c);
          planetBuffers.addTriangle(a, b, d);
        }
      }
    }
  }

  private addVertex(dir: Direction, x: number, y: number): number {
    const planetBuffers = this.planetBuffers;
    const res = planetBuffers.vertexIndex;
    const resolution = this.settings.resolution;

    const pct = this.uv;
    vec2.scale(pct, vec2.set(pct, x, y), 1 / (resolution - 1));
    vec3.scale(this.axisA, dir.axisA, (pct[0] - 0.5) * 2);
    vec3.scale(this.axisB, dir.axisB, (pct[1] - 0.5) * 2);

    vec3.add(this.point, dir.localUp, this.axisA);
    vec3.add(this.point, this.point, this.axisB);

    vec3.normalize(this.pos, this.point);
    // θ = tan−1(−z/x) / θ = atan2(-z, x);
    const theta = Math.atan(-this.pos[2] / this.pos[0]);
    minmax(theta, this.theta);
    // φ = acos(-y);
    const phi = Math.acos(-this.pos[1]);
    // u = (θ + π) / 2 π; v = φ / π
    vec2.set(this.uv, (theta + Math.PI) / (2 * Math.PI), phi / Math.PI);
    minmax(this.uv[0], this.x);
    minmax(this.uv[1], this.y);

    if (!this.shapeGenerator) {
      planetBuffers.addVertex(this.point, this.uv);
    } else {
      const elevation = this.shapeGenerator.elevate(this.pos);
      vec3.scale(this.point, this.pos, elevation);
      planetBuffers.addVertex(this.point, this.uv);
    }
    return res;
  }

  private x = {min: Infinity, max: -Infinity};
  private y = {min: Infinity, max: -Infinity};
  private theta = {min: Infinity, max: -Infinity};
}

function minmax(v: number, res: { min: number, max: number }): void {
  res.min = Math.min(res.min, v);
  res.max = Math.max(res.max, v);
}

class Direction {
  readonly axisB: vec3;

  constructor(readonly localUp: vec3, readonly axisA: vec3) {
    this.axisB = vec3.cross(vec3.create(), localUp, axisA);
  }

  static readonly DIRECTIONS = [
    new Direction([0, 1, 0], [1, 0, 0]),
    new Direction([0, 0, 1], [1, 0, 0]),
    new Direction([0, -1, 0], [1, 0, 0]),
    new Direction([0, 0, -1], [1, 0, 0]),
    new Direction([1, 0, 0], [0, 0, -1]),
    new Direction([-1, 0, 0], [0, 0, 1])
  ];
}
