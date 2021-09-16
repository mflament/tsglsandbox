import { DrawMode } from 'gl';

type Triangle = ArrayLike<number>;

function setTriangle(target: Uint32Array, a: number, b: number, c: number) {
  target[0] = a;
  target[1] = b;
  target[2] = c;
}

export abstract class PlanetIndexBuffer {
  static planetTriangles(resolution: number): number {
    const rowTriangles = (resolution - 1) * 2;
    const faceTriangles = rowTriangles * (resolution - 1);
    return faceTriangles * 6;
  }

  static create(maxResolution: number, mode: DrawMode): PlanetIndexBuffer {
    if (mode === DrawMode.TRIANGLES) return new TrianglesPlanetIndexBuffer(maxResolution);
    else if (mode == DrawMode.TRIANGLE_STRIP) return new TriangleStripPlanetIndexBuffer(maxResolution);
    else throw new Error('Unsupported draw mode ' + DrawMode[mode]);
  }

  static indexCount(resolution: number, mode: DrawMode): number {
    if (mode === DrawMode.TRIANGLES) return TrianglesPlanetIndexBuffer.indexCount(resolution);
    if (mode === DrawMode.TRIANGLE_STRIP) return TriangleStripPlanetIndexBuffer.indexCount(resolution);
    else throw new Error('Unsupported draw mode ' + DrawMode[mode]);
  }

  count: number;

  protected constructor(readonly array: Uint32Array, readonly drawMode: DrawMode) {
    this.count = 0;
  }

  slice(): Uint32Array {
    return new Uint32Array(this.array, 0, this.count);
  }

  get uarray(): Uint32Array {
    return this.array as Uint32Array;
  }

  get capacity(): number {
    return this.array.length;
  }

  abstract trianglesCount(resolution: number): number;

  trianglePerRow(resolution: number): number {
    return (resolution - 1) * 2;
  }

  abstract triangles(): Generator<Triangle>;

  abstract indexPerRow(resolution: number): number;

  pushIndices(...idx: number[]): void {
    const uarray = this.array as Uint32Array;
    uarray.set(idx, this.count);
    this.count += idx.length;
  }
}

class TrianglesPlanetIndexBuffer extends PlanetIndexBuffer {
  static indexCount(resolution: number): number {
    return PlanetIndexBuffer.planetTriangles(resolution) * 3;
  }

  constructor(readonly maxResolution: number) {
    super(new Uint32Array(TrianglesPlanetIndexBuffer.indexCount(maxResolution)), DrawMode.TRIANGLES);
  }

  indexPerRow(resolution: number): number {
    return (resolution - 1) * 2 * 3;
  }

  trianglesCount(): number {
    return this.count / 3;
  }

  *triangles(): Generator<Triangle> {
    const triangle = new Uint32Array(3);
    const trianglesCount = this.trianglesCount();
    for (let i = 0; i < trianglesCount; i++) {
      const offset = i * 3;
      setTriangle(triangle, this.array[offset], this.array[offset + 1], this.array[offset + 2]);
      yield triangle;
    }
  }
}

class TriangleStripPlanetIndexBuffer extends PlanetIndexBuffer {
  static indexCount(resolution: number): number {
    const faceRows = resolution - 1;
    const rowIndices = resolution * 2 + 1;
    return faceRows * rowIndices * 6;
  }

  constructor(maxResolution: number) {
    super(new Uint32Array(TriangleStripPlanetIndexBuffer.indexCount(maxResolution)), DrawMode.TRIANGLE_STRIP);
  }

  indexPerRow(resolution: number): number {
    return resolution * 2 + 1;
  }

  trianglesCount(resolution: number): number {
    const rowIndices = this.indexPerRow(resolution);
    const rows = this.count / rowIndices;
    return rows * this.trianglePerRow(resolution);
  }

  *triangles(): Generator<Triangle> {
    const triangle = new Uint32Array(3);
    let stripIndex = 0;
    for (let offset = 2; offset < this.count; offset++) {
      const c = this.array[offset];
      if (c === 0xffffffff) {
        offset += 2;
        stripIndex = 0;
        continue;
      }
      if (stripIndex % 2 === 0) {
        // a b c
        setTriangle(triangle, this.array[offset - 2], this.array[offset - 1], c);
      } else {
        // maintains proper winding
        // b a c
        setTriangle(triangle, this.array[offset - 1], this.array[offset - 2], c);
      }
      yield triangle;
      stripIndex++;
    }
  }
}
