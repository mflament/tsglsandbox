import {
  BufferGeometry,
  FrontSide,
  InterleavedBuffer,
  InterleavedBufferAttribute,
  Mesh,
  MeshBasicMaterial,
  Texture,
  TextureLoader,
  Uint32BufferAttribute
} from 'three';
import {DrawMode} from "gl";

export interface PlanetIndices {
  array: Uint32Array;
  mode: DrawMode;
  count: number;
}

export interface PlanetetBuffers {
  indices: PlanetIndices;
  vertices: InterleavedBuffer;
}

export class Planet {
  readonly mesh: Mesh;

  dirty = true;
  private readonly _material: MeshBasicMaterial;

  private _texture: Promise<Texture>;
  private _vertices = 0;
  private _triangles = 0;

  constructor() {
    this._material = Planet.createMaterial();
    this.mesh = new Mesh(new BufferGeometry(), this._material);

    const loader = new TextureLoader();
    this._texture = new Promise((resolve) => loader.load('images/earth.png', resolve));
  }

  get vertices(): number {
    return this._vertices;
  }

  get triangles(): number {
    return this._triangles;
  }

  updateMesh(buffers: PlanetetBuffers): void {
    this.mesh.geometry.dispose();
    const geometry = new BufferGeometry();
    geometry.setIndex(new Uint32BufferAttribute(indexBuffer(buffers.indices), Uint32Array.BYTES_PER_ELEMENT));

    let offset = 0;
    const sizes = [3, 3, 2, 3];
    ['position', 'normal', 'uv', 'color'].forEach((name, index) => {
      geometry.setAttribute(name, new InterleavedBufferAttribute(buffers.vertices, sizes[index], offset));
      offset += sizes[index]
    });
    this.mesh.geometry = geometry;
    this._vertices = buffers.vertices.count;
    this._triangles = buffers.indices.count / 3;
  }

  get material(): MeshBasicMaterial {
    return this._material;
  }

  delete(): void {
    this.mesh.geometry.dispose();
  }

  private static createMaterial(): MeshBasicMaterial {
    return new MeshBasicMaterial({
      side: FrontSide
    });
  }

  set color(color: number) {
    this._material.color.set(color);
  }

  set wireframe(w: boolean) {
    this._material.wireframe = w;
    this._material.needsUpdate = true;
  }

  set texture(t: boolean) {
    if (t) {
      this._texture.then(t => {
        this._material.map = t;
        this._material.needsUpdate = true;
      });
    } else {
      this._material.map = null;
      this._material.needsUpdate = true;
    }
  }

}

function indexBuffer(indices: PlanetIndices): Uint32Array {
  if (indices.array.length === indices.count)
    return indices.array;
  return new Uint32Array(indices.array, 0, indices.count * indices.array.BYTES_PER_ELEMENT);
}
