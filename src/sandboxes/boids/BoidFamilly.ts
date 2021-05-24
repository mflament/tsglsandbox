import { vec2, vec4 } from 'gl-matrix';
import { Bindable, BufferUsage, Deletable, UniformBuffer } from 'gl';

/**
 * Boid familly
 *
 * vec4 scale;
 * float acceleration;
 * // screen unit/s
 * float maxSpeed;
 * // rad/s
 * float turnSpeed;
 * // fov threshold = cos(fov)
 * float fov;
 * vec4 color;
 * // x: cohesion , y:  separation, z:aligment, w: bounding
 * vec4 radii;
 * // x: cohesion , y:  separation, z:aligment, w: bounding
 * vec4 weights;
 */
const FAMILLY_BUFFER_FLOATS = 4 + 1 + 1 + 1 + 1 + 4 + 4 + 4;

export interface BoidFamilly {
  scale: vec2;
  acceleration: number;
  maxSpeed: number;
  turnSpeed: number;
  fov: number;
  color: vec4;
  radii: vec4;
  weights: vec4;
}

export class BoidFamillyBuffer implements Bindable, Deletable {
  private readonly buffer: UniformBuffer;
  private readonly radii = vec4.create();

  constructor(gl: WebGL2RenderingContext) {
    const mod = FAMILLY_BUFFER_FLOATS % 4;
    const size = mod === 0 ? FAMILLY_BUFFER_FLOATS : FAMILLY_BUFFER_FLOATS + (4 - mod);
    this.buffer = new UniformBuffer(gl).bind().allocate(size * 4, BufferUsage.STATIC_READ);
  }

  bind(): BoidFamillyBuffer {
    this.buffer.bind(0);
    return this;
  }

  unbind(): BoidFamillyBuffer {
    this.buffer.unbind(0);
    return this;
  }

  delete(): void {
    this.buffer.delete();
  }

  update(f: BoidFamilly): void {
    const array = new Float32Array(FAMILLY_BUFFER_FLOATS);
    array.set(f.scale, 0);

    let offset = 4;
    array[offset++] = f.acceleration;
    array[offset++] = f.maxSpeed;
    array[offset++] = toRad(f.turnSpeed);
    array[offset++] = Math.cos(toRad(f.fov));

    array.set(f.color, offset);
    offset += 4;

    const boidLength = Math.max(f.scale[0], f.scale[1]);
    vec4.copy(this.radii, f.radii);
    vec4.scale(this.radii, this.radii, boidLength);
    array.set(this.radii, offset);
    offset += 4;

    array.set(f.weights, offset);
    this.buffer.bind().setsubdata(array, 0);
  }
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}
