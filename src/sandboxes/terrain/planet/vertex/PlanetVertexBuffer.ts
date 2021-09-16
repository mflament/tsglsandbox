import { vec2, vec3 } from 'gl-matrix';

export const NORMAL_OFFSET = 3;
export const UV_OFFSET = 6;
export const COLOR_OFFSET = 8;

const ZERO_V3 = vec3.create();

export class PlanetVertexBuffer {
  static mainFaceVertices(resolution: number): number {
    return resolution * (resolution - 1);
  }

  static sideFaceVertices(resolution: number): number {
    return (resolution - 2) * (resolution - 2);
  }

  static vertexCount(resolution: number): number {
    return PlanetVertexBuffer.mainFaceVertices(resolution) * 4 + PlanetVertexBuffer.sideFaceVertices(resolution) * 2;
  }

  static create(maxResolution: number, color = false): PlanetVertexBuffer {
    const stride = color ? 11 : 8;
    return new PlanetVertexBuffer(maxResolution, stride, color);
  }

  vertexCount = 0;

  readonly array: Float32Array;

  private constructor(maxResolution: number, readonly stride: number, readonly color: boolean) {
    this.array = new Float32Array(PlanetVertexBuffer.vertexCount(maxResolution) * stride);
  }

  get capacity(): number {
    return this.array.length / this.stride;
  }

  slice(): Float32Array {
    return new Float32Array(this.array.buffer, 0, this.vertexCount * this.stride);
  }

  push(position: vec3, uv: vec2, color?: vec3): void {
    const offset = this.vertexCount * this.stride;
    if (offset >= this.array.length) console.log('Goiing boum');
    this.array.set(position, offset);
    this.array.set(ZERO_V3, offset + NORMAL_OFFSET);
    this.array.set(uv, offset + UV_OFFSET);
    if (color && this.color) this.array.set(color, offset + COLOR_OFFSET);
    this.vertexCount++;
  }

  addNormal(triangle: ArrayLike<number>, n: vec3): void {
    for (let i = 0; i < 3; i++) {
      const noffset = triangle[i] * this.stride + NORMAL_OFFSET;
      this.array[noffset] += n[0];
      this.array[noffset + 1] += n[1];
      this.array[noffset + 2] += n[2];
    }
  }

  getTrianglePositions(triangle: ArrayLike<number>, positions: { a: vec3; b: vec3; c: vec3 }): void {
    this.getPosition(triangle[0], positions.a);
    this.getPosition(triangle[1], positions.b);
    this.getPosition(triangle[2], positions.c);
  }

  private getPosition(index: number, v: vec3): void {
    const offset = index * this.stride;
    vec3.set(v, this.array[offset], this.array[offset + 1], this.array[offset + 2]);
  }

  getAttributes(): Attribute[] {
    const res: Attribute[] = [
      { name: 'position', size: 3, offset: 0 },
      { name: 'normal', size: 3, offset: NORMAL_OFFSET },
      { name: 'uv', size: 2, offset: UV_OFFSET }
    ];
    if (this.color) res.push({ name: 'color', size: 3, offset: COLOR_OFFSET });
    return res;
  }
}

type Attribute = { name: AttributeName; size: number; offset: number };
type AttributeName = 'position' | 'normal' | 'uv' | 'color';
export const VERTEX_ATTRIBUTES = ['position', 'normal', 'uv', 'color'];
