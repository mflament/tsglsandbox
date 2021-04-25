import { VertextArray, PartialVertexAttribute, VertexAttribute } from './VertextArray';
import { componentType, IndexBuffer, IndexBufferType, VertexBuffer } from './GLBuffers';
import { Bindable, Deletable } from '../utils/GLUtils';
import { BufferUsage, DrawMode, IndexComponentType } from './BufferEnums';

export interface GLDrawable extends Bindable, Deletable {
  draw(count?: number, offset?: number, instances?: number): void;
}

export class MappedBuffer extends VertexBuffer {
  readonly attributes: VertexAttribute[] = [];

  constructor(readonly gl: WebGL2RenderingContext) {
    super(gl);
    this.bind();
  }

  get stride(): number {
    return this.attributes.length > 0 ? this.attributes[this.attributes.length - 1].stride : 0;
  }

  get count(): number {
    const stride = this.stride;
    if (stride === 0) return 0;
    return super.size / stride;
  }

  withAttribute(attr: VertexAttribute): void {
    if (this.attributes.length > 0 && attr.stride != this.stride)
      throw new Error('Mismatched strides ' + this.stride + ', ' + attr.stride);
    this.attributes.push(attr);
  }
}

abstract class AbstractBufferDrawable implements GLDrawable {
  readonly vao: VertextArray;
  readonly mappedBuffers: MappedBuffer[] = [];
  private _positionsBuffer?: MappedBuffer;
  private _instancesBuffer?: MappedBuffer;

  constructor(readonly gl: WebGL2RenderingContext, readonly drawMode: DrawMode = DrawMode.TRIANGLES) {
    this.vao = new VertextArray(gl).bind();
  }

  bind(): AbstractBufferDrawable {
    this.vao.bind();
    this.mappedBuffers.forEach(mb => mb.bind());
    return this;
  }

  unbind(): AbstractBufferDrawable {
    this.vao.unbind();
    this.mappedBuffers.forEach(mb => mb.unbind());
    return this;
  }

  delete(): void {
    this.vao.delete();
    this.mappedBuffers.forEach(mb => mb.delete());
  }

  abstract draw(count?: number, offset?: number, instances?: number): void;

  mapPositions(attributes: PartialVertexAttribute[]): MappedBuffer {
    this._positionsBuffer = this.mapBuffer(attributes);
    return this._positionsBuffer;
  }

  mapInstances(attributes: PartialVertexAttribute[]): MappedBuffer {
    this._instancesBuffer = this.mapBuffer(attributes);
    return this._instancesBuffer;
  }

  get positions(): MappedBuffer {
    if (!this._positionsBuffer && this.mappedBuffers.length === 0) throw new Error('No buffers');
    return this._positionsBuffer ? this._positionsBuffer : this.mappedBuffers[0];
  }

  get instances(): MappedBuffer | undefined {
    return this._instancesBuffer;
  }

  mapBuffer(pattributes: PartialVertexAttribute[]): MappedBuffer {
    const mbuffer = new MappedBuffer(this.gl);
    pattributes.map(a => this.mapAttribute(a)).forEach(a => mbuffer.withAttribute(a));
    this.mappedBuffers.push(mbuffer);
    return mbuffer;
  }

  private mapAttribute(attribute: PartialVertexAttribute): VertexAttribute {
    return this.vao.withAttribute(attribute).lastAttribute;
  }
}

export class ArrayBufferDrawable extends AbstractBufferDrawable {
  constructor(gl: WebGL2RenderingContext, drawMode?: DrawMode) {
    super(gl, drawMode);
  }

  bind(): ArrayBufferDrawable {
    super.bind();
    return this;
  }

  unbind(): ArrayBufferDrawable {
    super.unbind();
    return this;
  }

  delete(): ArrayBufferDrawable {
    super.delete();
    return this;
  }

  draw(count?: number, offset = 0, instances?: number): void {
    if (count === undefined) count = this.positions.count;
    if (count > 0) {
      const instancesBuffer = this.instances;
      if (instancesBuffer) {
        if (instances === undefined) instances = instancesBuffer.count;
        this.gl.drawArraysInstanced(this.drawMode, offset, count, instances);
      } else {
        this.gl.drawArrays(this.drawMode, offset, count);
      }
    }
  }
}

export class IndexedBufferDrawable extends AbstractBufferDrawable {
  readonly ibo: IndexBuffer;
  private componentType?: IndexComponentType;

  constructor(gl: WebGL2RenderingContext, drawMode?: DrawMode) {
    super(gl, drawMode);
    this.ibo = new IndexBuffer(gl).bind();
  }

  bind(): IndexedBufferDrawable {
    super.bind();
    return this;
  }

  unbind(): IndexedBufferDrawable {
    super.unbind();
    return this;
  }

  delete(): IndexedBufferDrawable {
    super.delete();
    return this;
  }

  setIndices(source: IndexBufferType, usage?: BufferUsage, srcOffset?: number, length?: number): IndexedBufferDrawable {
    this.ibo.setdata(source, usage, srcOffset, length);
    this.componentType = componentType(source);
    return this;
  }

  setsubindices(
    source: IndexBufferType,
    dstOffset: number,
    srcOffset?: number,
    length?: number
  ): IndexedBufferDrawable {
    this.ibo.setsubdata(source, dstOffset, srcOffset, length);
    return this;
  }

  draw(count?: number, offset = 0, instances?: number): void {
    if (count === undefined) count = this.ibo.size;
    if (this.componentType !== undefined && count > 0) {
      const instancesBuffer = this.instances;
      if (instancesBuffer) {
        if (instances === undefined) instances = instancesBuffer.count;
        this.gl.drawElementsInstanced(this.drawMode, count, this.componentType, offset, instances);
      } else {
        this.gl.drawElements(this.drawMode, count, this.componentType, offset);
      }
    }
  }
}
