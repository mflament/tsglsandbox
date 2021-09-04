import {vec3} from "gl-matrix";

class FaceDirection {
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
  new FaceDirection([-1, 0, 0], [0, 0, 1]), // left
  new FaceDirection([1, 0, 0], [0, 0, -1]), // right
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
