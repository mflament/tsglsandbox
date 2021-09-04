import {PlanetVertexBuffer} from "../vertex/PlanetVertexBuffer";
import {PlanetGeneratorSettings} from "../PlanetGeneratorSettings";
import {ElevationModifier, SphereElevationModifier, TerrainElevationModifier} from "../ElevationModifier";
import {FACE_DIRECTIONS} from "../FaceDirection";
import {vec2, vec3} from "gl-matrix";
import {CancellablePromise, JobRunner} from "./CancellableJob";

export interface PlanetVertexGenerator {
  generate(settings: PlanetGeneratorSettings, vertexBuffer?: PlanetVertexBuffer): PlanetVertexBuffer | CancellablePromise<PlanetVertexBuffer>;
}

const VERTEX_PER_CHUNK = 100000;

export class DefaultVertexGenerator implements PlanetVertexGenerator {
  private static readonly VECTORS = {
    uv: vec2.create(),
    pos: vec3.create(),
    point: vec3.create(),
    axisA: vec3.create(),
    axisB: vec3.create()
  };

  private readonly jobRunner = new JobRunner<PlanetVertexBuffer>();
  private cache?: { settings: PlanetGeneratorSettings, elevator?: ElevationModifier };

  constructor(readonly vertexPerChunk = VERTEX_PER_CHUNK) {
  }

  async generate(settings: PlanetGeneratorSettings, vertexBuffer?: PlanetVertexBuffer): CancellablePromise<PlanetVertexBuffer> {
    const elevator = this.updateElevator(settings);
    const resolution = settings.resolution;
    const vertexCount = PlanetVertexBuffer.vertexCount(resolution);
    vertexBuffer = vertexBuffer || PlanetVertexBuffer.create(resolution);
    if (vertexBuffer.capacity < vertexCount)
      vertexBuffer = PlanetVertexBuffer.create(resolution);
    const generator = this.newGenerator(resolution, elevator, vertexBuffer);
    vertexBuffer.vertexCount = 0;
    return this.jobRunner.startJob(generator);
  }

  private* newGenerator(resolution: number, elevator: ElevationModifier | undefined, vertexBuffer: PlanetVertexBuffer): Generator<unknown, PlanetVertexBuffer> {
    const vertexPerChunk = this.vertexPerChunk;

    function addVertex(face: number, x: number, y: number): void {
      const {uv, pos, point, axisA, axisB} = DefaultVertexGenerator.VECTORS;
      const dir = FACE_DIRECTIONS[face];
      vec2.scale(uv, vec2.set(uv, x, y), 1 / (resolution - 1));
      vec3.scale(axisA, dir.axisA, (uv[0] - 0.5) * 2);
      vec3.scale(axisB, dir.axisB, (uv[1] - 0.5) * 2);

      vec3.add(point, dir.localUp, axisA);
      vec3.add(point, point, axisB);

      // compute uv : project point on sphere to
      vec3.normalize(pos, point);
      // θ = tan−1(−z/x) / θ = atan2(-z, x);
      const theta = Math.atan(-pos[2] / pos[0]);
      // φ = acos(-y);
      const phi = Math.acos(-pos[1]);
      // u = (θ + π) / 2 π; v = φ / π
      vec2.set(uv, (theta + Math.PI) / (2 * Math.PI), phi / Math.PI);

      if (elevator) {
        const elevation = elevator.elevate(pos);
        vec3.scale(point, pos, elevation);
      }
      vertexBuffer.push(point, uv);
    }

    const faceRows = resolution - 1;
    for (let face = 0; face < 4; face++) {
      for (let y = 0; y < faceRows; y++) {
        for (let x = 0; x < resolution; x++) {
          addVertex(face, x, y);
          if (vertexBuffer.vertexCount % vertexPerChunk === 0)
            yield;
        }
      }
    }

    for (let face = 4; face < 6; face++) {
      for (let y = 1; y < faceRows; y++) {
        for (let x = 1; x < faceRows; x++) {
          addVertex(face, x, y);
          if (vertexBuffer.vertexCount % vertexPerChunk === 0)
            yield;
        }
      }
    }
    return vertexBuffer;
  }


  private updateElevator(newSettings: PlanetGeneratorSettings): ElevationModifier | undefined {
    let elevator;
    switch (newSettings.shapeType) {
      case 'sphere':
        elevator = new SphereElevationModifier(1);
        break;
      case 'terrain':
        elevator = new TerrainElevationModifier(newSettings.terrain);
        break;
      case 'cube':
        elevator = undefined;
        break;
    }
    this.cache = {settings: newSettings, elevator: elevator};
    return this.cache.elevator;
  }
}
