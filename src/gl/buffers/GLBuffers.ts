import { Bindable, checkNull, Deletable } from '../utils/GLUtils';
import { BufferTarget, BufferUsage } from './BufferEnums';

export abstract class GLBuffer<B extends ArrayBufferType, THIS extends GLBuffer<B, THIS>>
  implements Bindable, Deletable {
  readonly glbuffer: WebGLBuffer;
  private _size = 0; // in bytes

  constructor(readonly gl: WebGL2RenderingContext, readonly target: BufferTarget) {
    this.glbuffer = checkNull(() => gl.createBuffer());
    this.bind();
  }

  /**
   * @returns buffer size in bytes
   */
  get size(): number {
    return this._size;
  }

  bind(): THIS {
    this.gl.bindBuffer(this.target, this.glbuffer);
    return this.self();
  }

  unbind(): THIS {
    this.gl.bindBuffer(this.target, null);
    return this.self();
  }

  delete(): THIS {
    this.gl.deleteBuffer(this.glbuffer);
    this._size = 0;
    return this.self();
  }

  allocate(size: number, usage = BufferUsage.STATIC_DRAW): THIS {
    this.gl.bufferData(this.target, size, usage);
    this._size = size;
    return this.self();
  }

  setdata(source: ArrayBuffer, usage?: BufferUsage): THIS;
  setdata(source: B | number[], usage?: BufferUsage, srcOffset?: number, length?: number): THIS;
  setdata(source: ArrayBuffer | B | number[], usage = BufferUsage.STATIC_DRAW, srcOffset = 0, length?: number): THIS {
    if (Array.isArray(source)) source = new Float32Array(source);
    if (source instanceof ArrayBuffer) {
      this._size = source.byteLength;
      this.gl.bufferData(this.target, source, usage);
    } else {
      const elementsCount = length === undefined ? source.length - srcOffset : length;
      this._size = elementsCount * source.BYTES_PER_ELEMENT;
      this.gl.bufferData(this.target, source, usage, srcOffset, length);
    }
    return this.self();
  }

  setsubdata(source: ArrayBuffer | number[], dstOffset: number): THIS;
  setsubdata(source: B | number[], dstOffset: number, srcOffset?: number, length?: number): THIS;
  setsubdata(source: ArrayBuffer | B | number[], dstOffset: number, srcOffset = 0, length?: number): THIS {
    if (Array.isArray(source)) source = new Float32Array(source);
    if (source instanceof ArrayBuffer) this.gl.bufferSubData(this.target, dstOffset, source);
    else this.gl.bufferSubData(this.target, dstOffset, source, srcOffset, length);
    return this.self();
  }

  getsubdata(destBuffer: ArrayBufferView, srcOffset = 0, destOffset?: number, length?: number): THIS {
    this.gl.getBufferSubData(this.target, srcOffset, destBuffer, destOffset, length);
    return this.self();
  }

  protected abstract self(): THIS;
}

export class VertexBuffer extends GLBuffer<VertexBufferType, VertexBuffer> {
  constructor(gl: WebGL2RenderingContext) {
    super(gl, BufferTarget.ARRAY_BUFFER);
  }
  protected self(): VertexBuffer {
    return this;
  }
}

export class IndexBuffer extends GLBuffer<IndexBufferType, IndexBuffer> {
  constructor(gl: WebGL2RenderingContext) {
    super(gl, BufferTarget.ELEMENT_ARRAY_BUFFER);
  }

  protected self(): IndexBuffer {
    return this;
  }
}

export class UniformBuffer extends GLBuffer<ArrayBufferType, UniformBuffer> {
  constructor(gl: WebGL2RenderingContext) {
    super(gl, BufferTarget.UNIFORM_BUFFER);
  }

  bind(index?: number): UniformBuffer {
    super.bind();
    if (index !== undefined) this.gl.bindBufferBase(BufferTarget.UNIFORM_BUFFER, index, this.glbuffer);
    return this;
  }

  unbind(index?: number): UniformBuffer {
    super.unbind();
    if (index !== undefined) this.gl.bindBufferBase(BufferTarget.UNIFORM_BUFFER, index, null);
    return this;
  }

  protected self(): UniformBuffer {
    return this;
  }
}

export class TransformFeedbackBuffer extends GLBuffer<ArrayBufferType, TransformFeedbackBuffer> {
  constructor(gl: WebGL2RenderingContext) {
    super(gl, BufferTarget.TRANSFORM_FEEDBACK_BUFFER);
  }

  bind(index?: number): TransformFeedbackBuffer {
    super.bind();
    if (index !== undefined) this.gl.bindBufferBase(BufferTarget.TRANSFORM_FEEDBACK_BUFFER, index, this.glbuffer);
    return this;
  }

  unbind(index?: number): TransformFeedbackBuffer {
    super.unbind();
    if (index !== undefined) this.gl.bindBufferBase(BufferTarget.TRANSFORM_FEEDBACK_BUFFER, index, null);
    return this;
  }

  protected self(): TransformFeedbackBuffer {
    return this;
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
