import { BufferGeometry, InterleavedBuffer, InterleavedBufferAttribute, Mesh, Uint32BufferAttribute } from 'three';
import { PlanetIndexBuffer } from './index/PlanetIndexBuffer';
import { PlanetVertexBuffer } from './vertex/PlanetVertexBuffer';
import { PlanetMaterial } from './PlanetMaterial';

export class Planet {
  readonly mesh: Mesh;

  private _indexBuffer?: PlanetIndexBuffer;
  private _vertexBuffer?: PlanetVertexBuffer;

  constructor(readonly material: PlanetMaterial) {
    this.mesh = new Mesh(new BufferGeometry(), material);
  }

  get indexBuffer(): PlanetIndexBuffer | undefined {
    return this._indexBuffer;
  }

  get indexCount(): number {
    return this._indexBuffer?.count || 0;
  }

  triangleCount(resolution: number): number {
    return this._indexBuffer?.trianglesCount(resolution) || 0;
  }

  get vertexBuffer(): PlanetVertexBuffer | undefined {
    return this._vertexBuffer;
  }

  get vertexCount(): number {
    return this._vertexBuffer?.vertexCount || 0;
  }

  update(index: PlanetIndexBuffer, vertex: PlanetVertexBuffer): void {
    if (index !== this._indexBuffer || vertex != this._vertexBuffer) {
      this.mesh.geometry.dispose();
      const geometry = new BufferGeometry();
      geometry.setIndex(new Uint32BufferAttribute(index.array, 1));
      const interleavedBuffer = new InterleavedBuffer(vertex.array, vertex.stride);
      vertex
        .getAttributes()
        .forEach(attribute =>
          geometry.setAttribute(
            attribute.name,
            new InterleavedBufferAttribute(interleavedBuffer, attribute.size, attribute.offset)
          )
        );
      this.mesh.mode = index.drawMode;
      this.mesh.geometry = geometry;
      this._indexBuffer = index;
      this._vertexBuffer = vertex;
    }
  }

  delete(): void {
    this.mesh.geometry.dispose();
  }
}
