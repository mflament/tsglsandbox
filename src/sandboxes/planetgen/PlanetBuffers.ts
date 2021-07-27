import {vec2, vec3} from 'gl-matrix';

export const VERTEX_SIZE = 3 + 3 + 2; // position, normal, uv

export class PlanetBuffers {
  readonly vertices: Float32Array;
  readonly triangles: Int32Array;

  readonly mainSize: number;
  readonly sideSize: number;
  readonly expectedVertices: number;
  readonly expectedTriangles: number;

  private readonly faceOffsets: number[] = new Array(6);

  private vertexCount = 0;
  private triangleCount = 0;

  constructor(readonly resolution = 64) {
    this.mainSize = resolution * (resolution - 1);
    this.sideSize = (resolution - 2) * (resolution - 2);
    this.expectedVertices = this.mainSize * 4 + this.sideSize * 2;
    this.expectedTriangles = (resolution - 1) * (resolution - 1) * 2 * 6;
    this.faceOffsets[0] = 0;
    for (let face = 1; face < 6; face++) {
      this.faceOffsets[face] = this.faceOffsets[face - 1] + (face <= 4 ? this.mainSize : this.sideSize);
    }
    this.vertices = new Float32Array(this.expectedVertices * VERTEX_SIZE);
    this.triangles = new Int32Array(this.expectedTriangles * 3);
  }

  get vertexIndex(): number {
    return this.vertexCount;
  }

  addVertex(v: vec3, uv: vec2): void {
    if (this.vertexIndex === this.expectedVertices) throw new Error('Vertex overflow');
    const offset = this.vertexCount * VERTEX_SIZE;
    // postition
    const vertices = this.vertices;
    vertices.set(v, offset);
    // initialize normal
    vertices.fill(0, offset + 3, offset + 6);
    // uv
    vertices.set(uv, offset + 6);
    this.vertexCount++;
  }

  addTriangle(a: number, b: number, c: number): void {
    if (this.triangleCount == this.expectedTriangles) throw new Error('triangles overflow');
    const offset = this.triangleCount * 3;
    this.triangles[offset] = a;
    this.triangles[offset + 1] = b;
    this.triangles[offset + 2] = c;
    this.triangleCount++;
  }

  computeNormals(): void {
    const triangle = {a: vec3.create(), b: vec3.create(), c: vec3.create()};
    const cb = vec3.create();
    const ab = vec3.create();

    for (let i = 0; i < this.triangleCount; i++) {
      this.getTriangle(i, triangle);
      vec3.sub(cb, triangle.c, triangle.b);
      vec3.sub(ab, triangle.a, triangle.b);
      vec3.cross(cb, cb, ab);
      this.addNormal(i, cb);
    }

    for (let i = 0; i < this.vertexCount; i++) {
      this.getNormal(i, cb);
      vec3.normalize(cb, cb)
      this.setNormal(i, cb);
    }
  }

  findVertexIndex(face: number, x: number, y: number): number {
    const resolution = this.resolution;
    if (face < 4) {
      if (y == resolution - 1) {
        const previous = face == 0 ? 3 : face - 1;
        return this.findVertexIndex(previous, x, 0);
      }
      return this.faceOffsets[face] + y * resolution + x;
    }

    if (y == 0) {
      if (face == 4) return this.findVertexIndex(2, resolution - 1, resolution - 1 - x);
      return this.findVertexIndex(2, 0, x);
    }
    if (y == resolution - 1) {
      if (face == 4) return this.findVertexIndex(0, resolution - 1, x);
      return this.findVertexIndex(0, 0, resolution - 1 - x);
    }
    if (x == 0) {
      if (face == 4) return this.findVertexIndex(1, resolution - 1, y);
      return this.findVertexIndex(3, 0, resolution - 1 - y);
    }
    if (x == resolution - 1) {
      if (face == 4) return this.findVertexIndex(3, resolution - 1, resolution - 1 - y);
      return this.findVertexIndex(1, 0, y);
    }
    return this.faceOffsets[face] + (y - 1) * (resolution - 2) + (x - 1);
  }

  private getTriangle(index: number, out: { a: vec3, b: vec3, c: vec3 }): void {
    const offset = index * 3;
    this.getPosition(this.triangles[offset], out.a);
    this.getPosition(this.triangles[offset + 1], out.b);
    this.getPosition(this.triangles[offset + 2], out.c);
  }

  private getPosition(vertex: number, out: vec3): void {
    const offset = vertex * VERTEX_SIZE;
    vec3.set(out, this.vertices[offset], this.vertices[offset + 1], this.vertices[offset + 2]);
  }

  private getNormal(vertex: number, out: vec3): void {
    const offset = vertex * VERTEX_SIZE + 3;
    vec3.set(out, this.vertices[offset], this.vertices[offset + 1], this.vertices[offset + 2]);
  }

  private setNormal(vertex: number, n: vec3): void {
    const offset = vertex * VERTEX_SIZE + 3;
    this.vertices.set(n, offset);
  }

  private addNormal(triangle: number, normal: vec3): void {
    const toffset = triangle * 3;
    for (let i = 0; i < 3; i++) {
      const v = this.triangles[toffset + i];
      const noffset = v * VERTEX_SIZE + 3;
      this.vertices[noffset] += normal[0];
      this.vertices[noffset + 1] += normal[1];
      this.vertices[noffset + 2] += normal[2];
    }
  }

  check(): void {
    if (this.vertexIndex != this.expectedVertices) console.error('Missing some vertices');
    if (this.triangleCount != this.expectedTriangles) console.error('Missing some triangles');
  }
}
