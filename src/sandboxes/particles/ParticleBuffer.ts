import { BufferAttribute, BufferUsage, VertexArray, VertexBuffer } from 'gl';

const PARTICLES_FLOATS = 4;

export class ParticleBuffers {
  private buffers: ParticleBuffer[];
  private readonly randomizedParticles: Float32Array;
  private randomizedParticlesCount = 0;
  readonly maxParticles: number;

  private _count = 0;
  private _dataIndex = 0;

  constructor(
    readonly gl: WebGL2RenderingContext,
    readonly params: { count: number; speed: number },
    maxParticles: number
  ) {
    this.buffers = [new ParticleBuffer(gl, maxParticles), new ParticleBuffer(gl, maxParticles)];
    this.maxParticles = maxParticles;
    this.randomizedParticles = new Float32Array(maxParticles * PARTICLES_FLOATS);
    this.randomizeParticles(maxParticles);
    this.count = params.count;
  }

  get dataBuffer(): ParticleBuffer {
    return this.buffers[this._dataIndex];
  }

  get targetBuffer(): ParticleBuffer {
    return this.buffers[1 - this._dataIndex];
  }

  get count(): number {
    return this._count;
  }

  set count(newCount: number) {
    if (this._count !== newCount) {
      //this.dataBuffer.vbo.bind().allocate(PARTICLES_FLOATS * 4 * newCount);
      if (this._count < newCount) {
        this.randomizeParticles(newCount);
        const offset = this._count;
        const length = newCount - this._count;
        this.dataBuffer.vbo.bind().setsubdata(this.randomizedParticles, offset, 0, length * PARTICLES_FLOATS);
      }
      this._count = newCount;
    }
  }

  swap(): void {
    this._dataIndex = 1 - this._dataIndex;
    this.dataBuffer.bind();
  }

  draw(): void {
    this.gl.drawArrays(WebGLRenderingContext.POINTS, 0, this._count);
  }

  delete(): void {
    this.buffers.forEach(buffer => buffer.delete());
  }

  private randomizeParticles(count: number): void {
    if (this.randomizedParticlesCount >= count) return;
    const buffer = this.randomizedParticles;
    const range = Math.sqrt(this.params.speed * 2);
    const halfRange = range / 2;
    for (let i = this.randomizedParticlesCount; i < count; i++) {
      let index = i * PARTICLES_FLOATS;
      // position
      buffer[index++] = Math.random() * 2 - 1;
      buffer[index++] = Math.random() * 2 - 1;
      // velocity
      buffer[index++] = Math.random() * range - halfRange;
      buffer[index++] = Math.random() * range - halfRange;
    }
    this.randomizedParticlesCount = count;
  }
}

class ParticleBuffer {
  readonly vao: VertexArray;
  readonly vbo: VertexBuffer<ParticleAttributes>;

  constructor(readonly gl: WebGL2RenderingContext, maxParticles: number) {
    this.vbo = new VertexBuffer<ParticleAttributes>(gl, {
      position: { size: 2 },
      speed: { size: 2 }
    })
      .bind()
      .allocate(maxParticles * PARTICLES_FLOATS * 4, BufferUsage.STATIC_DRAW);
    this.vao = new VertexArray(gl).bind().mapAttributes(this.vbo, {
      position: 0,
      speed: 1
    });
  }

  bind(): ParticleBuffer {
    this.vbo.bind();
    this.vao.bind();
    return this;
  }

  unbind(): ParticleBuffer {
    this.vao.unbind();
    this.vbo.unbind();
    return this;
  }

  delete(): void {
    this.vao.delete();
    this.vbo.delete();
  }
}

interface ParticleAttributes {
  position: BufferAttribute;
  speed: BufferAttribute;
}
