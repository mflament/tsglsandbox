import {
  BufferGeometry,
  InterleavedBuffer,
  InterleavedBufferAttribute,
  Mesh,
  MeshStandardMaterial,
  TextureLoader,
  Uint32BufferAttribute, WebGLRenderer
} from 'three';

import {PlanetBuffers, VERTEX_SIZE} from './PlanetBuffers';
import {FrontSide} from "three/src/constants";

export class Planet {
  readonly mesh: Mesh;

  dirty = true;
  private readonly _material: MeshStandardMaterial;

  constructor(color: number) {
    const loader = new TextureLoader();
    this._material = new MeshStandardMaterial({
      color: color,
      roughness: 0.5,
      side: FrontSide,
    });
    loader.load('images/momotte.jpg', t => {
      this._material.map = t;
      this._material.needsUpdate = true;
    });
    this.mesh = new Mesh(new BufferGeometry(), this._material);
  }

  set color(color: number) {
    this._material.color.set(color);
  }

  set wireframe(w: boolean) {
    this._material.wireframe = w;
  }

  update(buffers: PlanetBuffers): void {
    const geometry = this.mesh.geometry;
    geometry.setIndex(new Uint32BufferAttribute(buffers.triangles, 1));
    const interleavedBuffer = new InterleavedBuffer(buffers.vertices, VERTEX_SIZE);
    geometry.setAttribute('position', new InterleavedBufferAttribute(interleavedBuffer, 3, 0));
    geometry.setAttribute('normal', new InterleavedBufferAttribute(interleavedBuffer, 3, 3));
    geometry.setAttribute('uv', new InterleavedBufferAttribute(interleavedBuffer, 2, 6));

    this.mesh.geometry = geometry;
    this.dirty = false;
  }
}
