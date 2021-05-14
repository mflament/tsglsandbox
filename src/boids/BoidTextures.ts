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
import { vec2 } from 'gl-matrix';

const BOID_FLOATS = 4;

export const BOIDS_DATA_BINDING = 0;
export const BOIDS_SPEED_BINDING = 1;
export const TARGET_HEADING_BINDING = 2;
export const SCAN_DATA_BINDING = 3;

export class BoidTextures implements Deletable {
  static create(gl: WebGL2RenderingContext, maxBoids: number): BoidTextures {
    return new BoidTextures(
      [BoidDataTextures.create(gl, maxBoids), BoidDataTextures.create(gl, maxBoids)],
      [newDataTexture(gl, maxBoids, InternalFormat.RG32F), newDataTexture(gl, maxBoids, InternalFormat.RG32F)],
      newDataTexture(gl, maxBoids, InternalFormat.RGBA32F, maxBoids)
    );
  }

  private _boidsCount = 0;

  constructor(
    readonly boids: BoidDataTextures[],
    readonly targetHeadings: GLTexture2D[],
    readonly scanTexture: GLTexture2D
  ) {
    boids[0].activate();
    targetHeadings[0].activate(TARGET_HEADING_BINDING);
    scanTexture.activate(SCAN_DATA_BINDING);
  }

  get boidsCount(): number {
    return this._boidsCount;
  }

  set boidsCount(newCount: number) {
    if (newCount < this._boidsCount) {
      this._boidsCount = newCount;
    } else if (newCount > this._boidsCount) {
      const missing = newCount - this._boidsCount;
      this.pushBoids(missing);
    }
  }

  delete(): void {
    this.boids.forEach(b => b.delete());
    this.targetHeadings.forEach(b => b.delete());
    this.scanTexture.delete();
  }

  swapBoids(): void {
    const tmp = this.boids[0];
    this.boids[0] = this.boids[1];
    this.boids[1] = tmp;
    this.boids[0].activate();
  }

  swapTargetHeadings(): void {
    const tmp = this.targetHeadings[0];
    this.targetHeadings[0] = this.targetHeadings[1];
    this.targetHeadings[1] = tmp;
    this.targetHeadings[0].activate(TARGET_HEADING_BINDING);
  }

  pushBoids(boids: Boid[] | number): void {
    if (typeof boids === 'number') {
      boids = randomizedBoids(boids);
    }
    const data = boidsData(boids);
    const textureData = {
      x: this._boidsCount,
      y: 0,
      width: boids.length,
      height: 1,
      type: TextureComponentType.FLOAT
    };
    this.boids[0].data.bind().subdata({
      ...textureData,
      buffer: data,
      format: TextureFormat.RGBA
    });
    this.boids[0].speed.bind().subdata({
      ...textureData,
      buffer: new Float32Array(boids.length),
      format: TextureFormat.RED
    });

    const targetHeadings = new Float32Array(boids.length * 2);
    for (let i = 0; i < boids.length; i++) {
      targetHeadings[i * 2] = data[i * BOID_FLOATS + 2];
      targetHeadings[i * 2 + 1] = data[i * BOID_FLOATS + 3];
    }
    this.targetHeadings[0].bind().subdata({
      ...textureData,
      buffer: targetHeadings,
      format: TextureFormat.RG
    });

    this._boidsCount += boids.length;
  }
}

export class BoidDataTextures implements Deletable {
  static create(gl: WebGL2RenderingContext, maxBoids: number): BoidDataTextures {
    return new BoidDataTextures(newDataTexture(gl, maxBoids), newDataTexture(gl, maxBoids, InternalFormat.R32F));
  }

  constructor(readonly data: GLTexture2D, readonly speed: GLTexture2D) {}

  activate(): void {
    this.data.activate(BOIDS_DATA_BINDING).bind();
    this.speed.activate(BOIDS_SPEED_BINDING).bind();
  }

  delete(): void {
    this.data.delete();
    this.speed.delete();
  }
}

function boidsData(boids: Boid[]): Float32Array {
  const array = new Float32Array(boids.length * BOID_FLOATS);
  boids.forEach((boid, index) => {
    const offset = index * BOID_FLOATS;
    array.set(boid.pos, offset); // xy : pos
    array.set([Math.cos(boid.angle), Math.sin(boid.angle)], offset + 2); // xy : pos
  });
  return array;
}

function randomizedBoids(count: number): Boid[] {
  const boids: Boid[] = [];
  for (let index = 0; index < count; index++) {
    boids.push({ pos: randomPoint([0, 0]), angle: Math.random() * 2 * Math.PI });
  }
  return boids;
}

function randomPoint(out: vec2): vec2 {
  return vec2.set(out, Math.random() * 1.9 - 0.95, Math.random() * 1.9 - 0.95);
}

function newDataTexture(
  gl: WebGL2RenderingContext,
  width: number,
  internalFormat: InternalFormat = InternalFormat.RGBA32F,
  height = 1
): GLTexture2D {
  return new GLTexture2D(gl)
    .bind()
    .minFilter(TextureMinFilter.NEAREST)
    .magFilter(TextureMagFilter.NEAREST)
    .wrap(TextureWrappingMode.CLAMP_TO_EDGE)
    .data({
      internalFormat: internalFormat,
      width: width,
      height: height,
      type: TextureComponentType.FLOAT
    })
    .unbind();
}

interface Boid {
  pos: vec2;
  angle: number;
}
