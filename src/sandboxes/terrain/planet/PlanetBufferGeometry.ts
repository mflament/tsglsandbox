import { BufferGeometry, InterleavedBuffer, InterleavedBufferAttribute, Uint32BufferAttribute } from 'three';
import { vec2, vec3 } from 'gl-matrix';
import { COLOR_OFFSET, NORMAL_OFFSET, UV_OFFSET } from './Planet';
import { indexCount, vertexCount } from './generator/PlanetUtils';

export const RESTART_INDEX = 0xffffffff;

export class PlanetBufferGeometry extends BufferGeometry {
  readonly vertexSize: number;

  private readonly maxIndex: number;
  private readonly maxVertex: number;

  private readonly indexBuffer: Uint32BufferAttribute;
  private readonly vertexBuffer: InterleavedBuffer;

  private _indexCount = 0;
  private _vertexCount = 0;

  constructor(readonly maxResolution: number, readonly vertexColor: boolean) {
    super();
    this.maxIndex = Math.max(indexCount(maxResolution, false), indexCount(maxResolution, true));
    this.indexBuffer = new Uint32BufferAttribute(this.maxIndex, 1);
    this.setIndex(this.indexBuffer);

    this.vertexSize = 3 + 3 + 2 + (vertexColor ? 3 : 0);
    this.maxVertex = vertexCount(maxResolution);
    this.vertexBuffer = new InterleavedBuffer(new Float32Array(this.maxVertex * this.vertexSize), this.vertexSize);
    this.setAttribute('position', new InterleavedBufferAttribute(this.vertexBuffer, 3, 0));
    this.setAttribute('normal', new InterleavedBufferAttribute(this.vertexBuffer, 3, NORMAL_OFFSET));
    this.setAttribute('uv', new InterleavedBufferAttribute(this.vertexBuffer, 2, UV_OFFSET));
    if (vertexColor) this.setAttribute('color', new InterleavedBufferAttribute(this.vertexBuffer, 3, COLOR_OFFSET));
    this.setDrawRange(0, 0);
  }

  get indexCount(): number {
    return this._indexCount;
  }

  get vertexCount(): number {
    return this._vertexCount;
  }

  get vertexArray(): Float32Array {
    return this.vertexBuffer.array as Float32Array;
  }

  get indexArray(): Uint32Array {
    return this.indexBuffer.array as Uint32Array;
  }

  pushVertex(position: vec3, uv: vec2, color?: vec3): void {
    if (this._vertexCount < this.maxVertex) {
      const offset = this._vertexCount * this.vertexSize;
      const array = this.vertexArray;
      array.set(position, offset);
      array.set(uv, offset + UV_OFFSET);
      array.set(position, offset);
      if (color) array.set(color, offset + COLOR_OFFSET);
      this._vertexCount += 1;
    } else {
      throw new Error('Vertex overflow');
    }
  }

  pushIndex(...indices: number[]): void {
    if (this._indexCount + indices.length <= this.maxIndex) {
      const array = this.indexArray;
      const offset = this._indexCount;
      for (let i = 0; i < indices.length; i++) {
        array[offset + i] = indices[i];
      }
      this._indexCount += indices.length;
    } else {
      throw new Error('Index overflow');
    }
  }

  getPosition(vertexIndex: number, target: vec3): void {
    this.getVec3(vertexIndex, 0, target);
  }

  getNormal(vertexIndex: number, target: vec3): void {
    this.getVec3(vertexIndex, NORMAL_OFFSET, target);
  }

  setNormal(vertexIndex: number, normal: vec3): void {
    const array = this.vertexArray;
    const offset = vertexIndex * this.vertexSize + NORMAL_OFFSET;
    array[offset] = normal[0];
    array[offset + 1] = normal[1];
    array[offset + 2] = normal[2];
  }

  commit(resolution: number, triangleStrip: boolean): void {
    let expected = indexCount(resolution, triangleStrip);
    if (this._indexCount != expected)
      throw new Error('Invalid index count ' + this._indexCount + ', expecting ' + expected);

    expected = vertexCount(resolution);
    if (this._vertexCount != expected)
      throw new Error('Invalid vertex count ' + this._vertexCount + ', expecting ' + expected);

    this.setDrawRange(0, this._indexCount);
    this.indexBuffer.needsUpdate = true;
    this.vertexBuffer.needsUpdate = true;
  }

  clear(): void {
    this._indexCount = this._vertexCount = 0;
    const farray = this.vertexBuffer.array as Float32Array;
    farray.fill(0);
    this.setDrawRange(0, 0);
  }

  triangleIndices(triangleStrip: boolean): Iterator<TriangleIndices> {
    const triangle: TriangleIndices = [0, 0, 0];
    return {
      next: triangleStrip ? this.stripTriangles(triangle) : this.directTriangles(triangle),
      throw: (e?: any) => {
        throw e;
      },
      return: () => {
        return { done: true, value: undefined };
      }
    };
  }

  private getVec3(vertexIndex: number, offset: number, target: vec3): void {
    const array = this.vertexArray;
    offset += vertexIndex * this.vertexSize;
    target[0] = array[offset];
    target[1] = array[offset + 1];
    target[2] = array[offset + 2];
  }

  private directTriangles(triangle: TriangleIndices): () => IteratorResult<TriangleIndices> {
    const trianglesCount = Math.floor(this._indexCount / 3);
    const array = this.indexBuffer.array;
    let triangleIndex = 0;
    return () => {
      if (triangleIndex < trianglesCount) {
        const indexOffset = triangleIndex * 3;
        vec3.set(triangle, array[indexOffset], array[indexOffset + 1], array[indexOffset + 2]);
        triangleIndex++;
        return { done: false, value: triangle };
      }
      return { done: true, value: undefined };
    };
  }

  private stripTriangles(triangle: TriangleIndices): () => IteratorResult<TriangleIndices> {
    let stripIndex = 0;
    const array = this.indexBuffer.array;
    let offset = 2;

    const next = (): boolean => {
      if (offset < this._indexCount) {
        const c = array[offset];
        if (c === RESTART_INDEX) {
          offset += 3;
          stripIndex = 0;
          return next();
        }

        if (stripIndex % 2 === 0) {
          // a b c
          vec3.set(triangle, array[offset - 2], array[offset - 1], c);
        } else {
          // maintains proper winding
          // b a c
          vec3.set(triangle, array[offset - 1], array[offset - 2], c);
        }

        offset++;
        stripIndex++;
        return true;
      }
      return false;
    };

    return () => {
      if (next()) return { done: false, value: triangle };
      return { done: true, value: undefined };
    };
  }
}

type TriangleIndices = [a: number, b: number, c: number];
