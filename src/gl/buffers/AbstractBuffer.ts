import {AbstractDeletable, Bindable, checkNull, Deletable} from '../GLUtils';
import {ArrayBufferType, BufferTarget, BufferUsage} from './BufferEnums';

export interface Buffer extends Bindable, Deletable {
  /**
   * @returns buffer size in bytes
   */
  readonly size: number;

  allocate(size: number, usage?: BufferUsage): void;

  setdata(source: ArrayBufferType | number[], usage?: BufferUsage, srcOffset?: number, length?: number): void;

  setsubdata(source: ArrayBufferType | number[], dstOffset: number, srcOffset?: number, length?: number): void;

  getsubdata(destBuffer: ArrayBufferView, srcOffset?: number, destOffset?: number, length?: number): void;

}

export abstract class AbstractBuffer<B extends ArrayBufferType = ArrayBufferType,
  THIS extends AbstractBuffer<B, THIS> = any>
  extends AbstractDeletable
  implements Buffer {
  readonly glbuffer: WebGLBuffer;
  private _size = 0; // in bytes

  protected constructor(readonly gl: WebGL2RenderingContext, readonly target: BufferTarget) {
    super();
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
    super.delete();
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
