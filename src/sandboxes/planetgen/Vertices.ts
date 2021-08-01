import {vec2, vec3} from "gl-matrix";
import {Triangles} from "./Triangles";

export const VERTEX_SIZE = 3 + 3 + 2; // position, normal, uv, color

export class Vertices {
  readonly array: Float32Array;
  private _count = 0;

  constructor(param: number | Float32Array) {
    if (typeof param === 'number') {
      this.array = new Float32Array(param * VERTEX_SIZE);
    } else {
      this.array = param;
    }
  }

  get capacity(): number {
    return this.array.length;
  }

  get count(): number {
    return this._count;
  }

  push(pos: vec3, normal?: vec3, uv?: vec2): number {
    const index = this._count;
    const offset = index * VERTEX_SIZE;
    this.array.set(pos, offset);
    if (normal) this.array.set(normal, offset + 3);
    if (uv) this.array.set(uv, offset + 6);
    this._count++;
    return index;
  }

  getPosition(index: number, pos: vec3): void {
    const offset = index * VERTEX_SIZE;
    vec3.set(pos, this.array[offset], this.array[offset + 1], this.array[offset + 2]);
  }

  getNormal(index: number, normal: vec3): void {
    const offset = index * VERTEX_SIZE + 3;
    vec3.set(normal, this.array[offset], this.array[offset + 1], this.array[offset + 2]);
  }

  setNormal(index: number, normal: vec3): void {
    const offset = index * VERTEX_SIZE + 3;
    this.array.set(normal, offset);
  }

  getUV(index: number, uv: vec2): void {
    const offset = index * VERTEX_SIZE + 6;
    vec2.set(uv, this.array[offset], this.array[offset + 1]);
  }

  setUV(index: number, uv: vec2): void {
    const offset = index * VERTEX_SIZE + 6;
    this.array.set(uv, offset);
  }

  computeNormals(triangles: Triangles): void {
    const triangle = {a: vec3.create(), b: vec3.create(), c: vec3.create()};
    const cb = vec3.create();
    const ab = vec3.create();

    for (let i = 0; i < triangles.count; i++) {
      this.getTriangle(i, triangles, triangle);
      vec3.sub(cb, triangle.c, triangle.b);
      vec3.sub(ab, triangle.a, triangle.b);
      vec3.cross(cb, cb, ab);
      this.addNormal(i, triangles, cb);
    }

    for (let i = 0; i < this._count; i++) {
      this.getNormal(i, cb);
      vec3.normalize(cb, cb)
      this.setNormal(i, cb);
    }
  }

  private addNormal(triangle: number, triangles: Triangles, normal: vec3): void {
    const toffset = triangle * 3;
    for (let i = 0; i < 3; i++) {
      const v = triangles.array[toffset + i];
      const noffset = v * VERTEX_SIZE + 3;
      this.array[noffset] += normal[0];
      this.array[noffset + 1] += normal[1];
      this.array[noffset + 2] += normal[2];
    }
  }

  private getTriangle(index: number, triangles: Triangles, triangle: { a: vec3; b: vec3; c: vec3 }): void {
    const offset = index * 3;
    this.getPosition(triangles.array[offset], triangle.a);
    this.getPosition(triangles.array[offset + 1], triangle.b);
    this.getPosition(triangles.array[offset + 2], triangle.c);
  }

  reset(): void {
    this._count = 0;
  }
}
