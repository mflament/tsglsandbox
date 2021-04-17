import { Bindable, checkNull, Deletable } from '../GLUtils';
import { BufferTarget, BufferUsage } from './BufferEnums';

export abstract class GLBuffer<B extends ArrayBufferType> implements Bindable, Deletable {
  readonly glbuffer: WebGLBuffer;
  private _size = 0; // in bytes

  constructor(readonly gl: WebGL2RenderingContext, readonly target: BufferTarget) {
    this.glbuffer = checkNull(() => gl.createBuffer());
    this.gl.bindBuffer(this.target, this.glbuffer);
  }

  get size(): number {
    return this._size;
  }

  bind(): GLBuffer<B> {
    this.gl.bindBuffer(this.target, this.glbuffer);
    return this;
  }

  unbind(): GLBuffer<B> {
    this.gl.bindBuffer(this.target, null);
    return this;
  }

  delete(): GLBuffer<B> {
    this.gl.deleteBuffer(this.glbuffer);
    this._size = 0;
    return this;
  }

  allocate(size: number, usage = BufferUsage.STATIC_DRAW): GLBuffer<B> {
    this.gl.bufferData(this.target, size, usage);
    this._size = size;
    return this;
  }

  setdata(source: B, usage = BufferUsage.STATIC_DRAW, srcOffset = 0, length = 0): GLBuffer<B> {
    const elementSize = source.BYTES_PER_ELEMENT;
    const copyLength = length === 0 ? source.length - srcOffset : length;
    this._size = elementSize * copyLength;
    this.gl.bufferData(this.target, source, usage, srcOffset, length);
    return this;
  }

  setsubdata(source: B, dstOffset: number, srcOffset = 0, length?: number): GLBuffer<B> {
    this.gl.bufferSubData(this.target, dstOffset, source, srcOffset, length);
    return this;
  }

  getsubdata(destBuffer: ArrayBufferView, srcOffset = 0, destOffset?: number, length?: number): GLBuffer<B> {
    this.gl.getBufferSubData(this.target, srcOffset, destBuffer, destOffset, length);
    return this;
  }
}

export class VertexBuffer extends GLBuffer<VertexBufferType> {
  constructor(gl: WebGL2RenderingContext) {
    super(gl, BufferTarget.ARRAY_BUFFER);
  }
}

export class IndexBuffer extends GLBuffer<IndexBufferType> {
  constructor(gl: WebGL2RenderingContext) {
    super(gl, BufferTarget.ELEMENT_ARRAY_BUFFER);
  }
}

export class UniformBuffer extends GLBuffer<VertexBufferType | IndexBufferType> {
  constructor(gl: WebGL2RenderingContext) {
    super(gl, BufferTarget.UNIFORM_BUFFER);
  }
}

export type VertexBufferType =
  | Int8Array
  | Int16Array
  | Int32Array
  | Float32Array
  | Uint8Array
  | Uint16Array
  | Uint32Array;

export type IndexBufferType = Uint8Array | Uint16Array | Uint32Array;

export type ArrayBufferType = VertexBufferType | IndexBufferType;

export function componentType(buffer: VertexBufferType | IndexBufferType): number {
  if (buffer instanceof Float32Array) return WebGL2RenderingContext.FLOAT;
  if (buffer instanceof Uint8Array) return WebGL2RenderingContext.UNSIGNED_BYTE;
  if (buffer instanceof Uint16Array) return WebGL2RenderingContext.UNSIGNED_SHORT;
  if (buffer instanceof Uint32Array) return WebGL2RenderingContext.UNSIGNED_INT;
  if (buffer instanceof Int8Array) return WebGL2RenderingContext.BYTE;
  if (buffer instanceof Int16Array) return WebGL2RenderingContext.SHORT;
  if (buffer instanceof Int32Array) return WebGL2RenderingContext.INT;
  throw new Error('Unhandled buffer ' + buffer);
}
