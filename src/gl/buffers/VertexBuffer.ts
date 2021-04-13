import { BufferTarget, BufferUsage, DrawMode, VertexComponentType } from './BufferEnums';
import { AbstractBuffer } from './AbstractBuffer';

type VertexBufferType = Int8Array | Int16Array | Int32Array | Float32Array | Uint8Array | Uint16Array | Uint32Array;

export class VertexBuffer extends AbstractBuffer {
  private _type: VertexComponentType = VertexComponentType.FLOAT;
  private _count = 0;

  constructor(gl: WebGL2RenderingContext) {
    super(gl, BufferTarget.ARRAY_BUFFER);
  }

  get type(): VertexComponentType {
    return this._type;
  }

  bind(): VertexBuffer {
    super.bind();
    return this;
  }

  unbind(): VertexBuffer {
    super.unbind();
    return this;
  }

  draw(mode: DrawMode = DrawMode.TRIANGLES, offset = 0, count = this._count): void {
    this.gl.drawArrays(mode, offset, count);
  }

  setdata(
    source: VertexBufferType,
    usage = BufferUsage.STATIC_READ,
    srcOffset = 0,
    length = source.length
  ): VertexBuffer {
    this._type = this.vertexComponentType(source);
    this._count = length;
    super.setdata(source, usage, srcOffset, length);
    return this;
  }

  setsubdata(source: ArrayBufferView, dstOffset: number, srcOffset = 0, length?: number): AbstractBuffer {
    // if (length === undefined) length = source.byteLength - (source.byteOffset + srcOffset);
    this.gl.bufferSubData(this.target, dstOffset, source, srcOffset, length);
    return this;
  }

  getsubdata(destBuffer: VertexBufferType, srcOffset = 0, destOffset = 0, length?: number): VertexBuffer {
    length = length === undefined ? destBuffer.length - destOffset : length;
    this.gl.getBufferSubData(this.target, srcOffset, destBuffer, destOffset, length);
    return this;
  }

  private vertexComponentType(buffer: VertexBufferType): VertexComponentType {
    if (buffer instanceof Int8Array) return VertexComponentType.BYTE;
    else if (buffer instanceof Int16Array) return VertexComponentType.SHORT;
    else if (buffer instanceof Float32Array) return VertexComponentType.FLOAT;
    else if (buffer instanceof Uint8Array) return VertexComponentType.UNSIGNED_BYTE;
    else if (buffer instanceof Uint16Array) return VertexComponentType.UNSIGNED_SHORT;
    throw new Error('Invalid buffer type ' + buffer);
  }
}
