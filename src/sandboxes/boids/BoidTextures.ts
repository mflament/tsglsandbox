import {
  GLTexture2D,
  InternalFormat,
  TextureComponentType,
  TextureMagFilter,
  TextureMinFilter,
  TextureWrappingMode
} from 'gl';
import { AbstractDeletable } from '../../gl/GLUtils';

import { Boid } from './Boid';

export const TEXTURE_UNITS = {
  data: 0
};

export class BoidsDataTextures extends AbstractDeletable {
  private _boidsCount = 0;
  readonly data: BoidsDataTexture[];

  constructor(gl: WebGL2RenderingContext, maxBoids: number) {
    super();
    this.data = [BoidsDataTexture.create(gl, maxBoids), BoidsDataTexture.create(gl, maxBoids)];
  }

  get boidsCount(): number {
    return this._boidsCount;
  }

  bind(): void {
    this.data[0].bind();
  }

  delete(): void {
    this.data.forEach(b => b.delete());
    super.delete();
  }

  swapBoids(): void {
    const tmp = this.data[0];
    this.data[0] = this.data[1];
    this.data[1] = tmp;
  }

  pushBoids(boids: Boid[]): void {
    this.data[0].pushBoids(this._boidsCount, boids);
    const array = new Uint8Array(boids.length);
    boids.forEach((b, i) => (array[i] = b.familly));
    this._boidsCount += boids.length;
  }

  removeBoids(count: number): void {
    this._boidsCount -= count;
  }
}

export class BoidsDataTexture extends AbstractDeletable {
  static create(gl: WebGL2RenderingContext, maxBoids: number): BoidsDataTexture {
    const data = newDataTexture(gl).bind().data({ width: maxBoids, height: 1 });
    return new BoidsDataTexture(data);
  }

  constructor(readonly data: GLTexture2D) {
    super();
  }

  bind(): BoidsDataTexture {
    this.data.activate(TEXTURE_UNITS.data).bind();
    return this;
  }

  pushBoids(offset: number, boids: Boid[]): void {
    const textureData = { x: offset, y: 0, width: boids.length, height: 1, type: TextureComponentType.FLOAT };
    const array = new Float32Array(boids.length * 4);
    boids.forEach((boid, index) => {
      const offset = index * 4;
      array.set(boid.pos, offset); // xy : pos
      array.set(boid.velocity, offset + 2); // xy : pos
    });
    this.data
      .activate(TEXTURE_UNITS.data)
      .bind()
      .subdata({
        ...textureData,
        srcData: array
      });
  }

  delete(): void {
    this.data.delete();
    super.delete();
  }
}

function newDataTexture(gl: WebGL2RenderingContext): GLTexture2D {
  return new GLTexture2D(gl, InternalFormat.RGBA32F)
    .bind()
    .minFilter(TextureMinFilter.NEAREST)
    .magFilter(TextureMagFilter.NEAREST)
    .wrap(TextureWrappingMode.CLAMP_TO_EDGE)
    .unbind();
}
