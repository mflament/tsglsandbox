import { Deletable } from '../gl/utils/GLUtils';
import { GLTexture2D } from '../gl/texture/GLTexture';
import {
  InternalFormat,
  TextureComponentType,
  TextureFormat,
  TextureMagFilter,
  TextureMinFilter,
  TextureWrappingMode
} from '../gl/texture/TextureEnums';
import { Boid, BoidFamilly } from './Boid';
import { vec3, vec4 } from 'gl-matrix';

export const TEXTURE_UNITS = {
  data: 0,
  boidFamilies: 1,
  families: 2,
  colors: 3,
  radii: 4,
  weights: 5
};

export class BoidTextures implements Deletable {
  private _boidsCount = 0;

  readonly boidFamilies: GLTexture2D;
  readonly families: GLTexture2D;
  readonly colors: GLTexture2D;
  readonly radii: GLTexture2D;
  readonly weights: GLTexture2D;

  readonly boids: BoidsData[];

  constructor(gl: WebGL2RenderingContext, maxBoids: number) {
    this.families = newDataTexture(gl);
    this.colors = newDataTexture(gl);
    this.radii = newDataTexture(gl);
    this.weights = newDataTexture(gl);
    this.boids = [BoidsData.create(gl, maxBoids), BoidsData.create(gl, maxBoids)];
    this.boidFamilies = newDataTexture(gl).bind().data({
      width: maxBoids,
      height: 1,
      internalFormat: InternalFormat.R8,
      format: TextureFormat.RED,
      type: TextureComponentType.UNSIGNED_BYTE
    });
  }

  get boidsCount(): number {
    return this._boidsCount;
  }

  bind(): void {
    this.boidFamilies.activate(TEXTURE_UNITS.boidFamilies).bind();
    this.families.activate(TEXTURE_UNITS.families).bind();
    this.colors.activate(TEXTURE_UNITS.colors).bind();
    this.radii.activate(TEXTURE_UNITS.radii).bind();
    this.weights.activate(TEXTURE_UNITS.weights).bind();
    this.boids[0].bind();
  }

  updateFamilies(families: BoidFamilly[]): void {
    this.updateConfigs(families);
    this.updateColors(families);
    this.updateRadiii(families);
    this.updateWeights(families);
  }

  delete(): void {
    this.boids.forEach(b => b.delete());
    this.boidFamilies.delete();
    this.families.delete();
    this.radii.delete();
    this.weights.delete();
    this.colors.delete();
  }

  swapBoids(): void {
    const tmp = this.boids[0];
    this.boids[0] = this.boids[1];
    this.boids[1] = tmp;
    this.boids[0].bind();
  }

  pushBoids(boids: Boid[]): void {
    this.boids[0].pushBoids(this._boidsCount, boids);
    const array = new Uint8Array(boids.length);
    boids.forEach((b, i) => (array[i] = b.familly));
    this.boidFamilies.activate(TEXTURE_UNITS.boidFamilies).bind().subdata({
      x: this._boidsCount,
      y: 0,
      width: boids.length,
      height: 1,
      buffer: array,
      format: TextureFormat.RED,
      type: TextureComponentType.UNSIGNED_BYTE
    });
    this._boidsCount += boids.length;
  }

  removeBoids(count: number): void {
    this._boidsCount -= count;
  }

  private updateConfigs(families: BoidFamilly[]): void {
    const array = new Float32Array(families.length * 4);
    families.forEach((f, i) => {
      const offset = i * 4;
      array.set(f.size, offset);
      array[offset + 2] = f.maxSpeed;
    });
    this.families.activate(TEXTURE_UNITS.families).bind().data({
      buffer: array,
      width: families.length,
      height: 1,
      internalFormat: InternalFormat.RGBA32F
    });
  }

  private updateRadiii(families: BoidFamilly[]): void {
    const array = new Float32Array(families.length * 4);
    families.forEach((f, i) => {
      const size = Math.max(f.size[0], f.size[1]);
      array.set(vec3.scale(vec3.create(), f.radii, size), i * 4);
    });
    this.radii.activate(TEXTURE_UNITS.radii).bind().data({
      buffer: array,
      width: families.length,
      height: 1,
      internalFormat: InternalFormat.RGBA32F
    });
  }

  private updateWeights(families: BoidFamilly[]): void {
    const array = new Float32Array(families.length * 4);
    families.forEach((f, i) => array.set(f.weights, i * 4));
    this.weights.activate(TEXTURE_UNITS.weights).bind().data({
      buffer: array,
      width: families.length,
      height: 1,
      internalFormat: InternalFormat.RGBA32F
    });
  }

  private updateColors(families: BoidFamilly[]): void {
    const array = new Uint8Array(families.length * 4);
    families.forEach((f, i) => array.set(vec4.scale(vec4.create(), f.color, 255), i * 4));
    this.colors.activate(TEXTURE_UNITS.colors).bind().data({
      buffer: array,
      width: families.length,
      height: 1,
      internalFormat: InternalFormat.RGBA,
      type: TextureComponentType.UNSIGNED_BYTE
    });
  }
}

export class BoidsData implements Deletable {
  static create(gl: WebGL2RenderingContext, maxBoids: number): BoidsData {
    const data = newDataTexture(gl).bind().data({
      width: maxBoids,
      height: 1,
      internalFormat: InternalFormat.RGBA32F,
      format: TextureFormat.RGBA,
      type: TextureComponentType.FLOAT
    });
    return new BoidsData(data);
  }

  constructor(readonly data: GLTexture2D) {}

  bind(): BoidsData {
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
        buffer: array,
        format: TextureFormat.RGBA
      });
  }

  delete(): void {
    this.data.delete();
  }
}

function newDataTexture(gl: WebGL2RenderingContext): GLTexture2D {
  return new GLTexture2D(gl)
    .bind()
    .minFilter(TextureMinFilter.NEAREST)
    .magFilter(TextureMagFilter.NEAREST)
    .wrap(TextureWrappingMode.CLAMP_TO_EDGE)
    .unbind();
}
