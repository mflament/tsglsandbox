import { BufferTarget, BufferUsage, DrawMode, VertexComponentType } from './BufferEnums';
import { AbstractBuffer } from './AbstractBuffer';

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
    super.bind();
    return this;
  }

  draw(mode: DrawMode = DrawMode.TRIANGLES, offset = 0, count = this._count): void {
    this.gl.drawArrays(mode, offset, count);
  }

  data(
    source: Int8Array | Int16Array | Int32Array | Float32Array | Uint8Array | Uint16Array | Uint32Array,
    usage = BufferUsage.STATIC_READ,
    srcOffset = 0,
    length = source.length
  ): VertexBuffer {
    if (source instanceof Int8Array) this._type = VertexComponentType.BYTE;
    else if (source instanceof Int16Array) this._type = VertexComponentType.SHORT;
    else if (source instanceof Float32Array) this._type = VertexComponentType.FLOAT;
    else if (source instanceof Uint8Array) this._type = VertexComponentType.UNSIGNED_BYTE;
    else if (source instanceof Uint16Array) this._type = VertexComponentType.UNSIGNED_SHORT;
    this._count = length;
    super.data(source, usage, srcOffset, length);
    return this;
  }
}
