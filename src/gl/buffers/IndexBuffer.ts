import { BufferTarget, BufferUsage, DrawMode, IndexComponentType } from './BufferEnums';
import { AbstractBuffer } from './AbstractBuffer';

export class IndexBuffer extends AbstractBuffer {
  private _type: IndexComponentType = IndexComponentType.UNSIGNED_SHORT;
  private _count = 0;

  constructor(readonly gl: WebGL2RenderingContext) {
    super(gl, BufferTarget.ELEMENT_ARRAY_BUFFER);
  }

  get type(): IndexComponentType {
    return this._type;
  }

  bind(): IndexBuffer {
    super.bind();
    return this;
  }

  unbind(): IndexBuffer {
    super.bind();
    return this;
  }

  count(): number {
    return this._count;
  }

  draw(mode = DrawMode.TRIANGLES, offset = 0, count = this._count): void {
    this.gl.drawElements(mode, count, this._type, offset);
  }

  data(
    source: Uint8Array | Uint16Array | Uint32Array,
    usage = BufferUsage.STATIC_READ,
    srcOffset = 0,
    length = source.length
  ): IndexBuffer {
    if (source instanceof Uint8Array) {
      this._type = IndexComponentType.UNSIGNED_BYTE;
    } else if (source instanceof Uint16Array) {
      this._type = IndexComponentType.UNSIGNED_SHORT;
    } else if (source instanceof Uint32Array) {
      this._type = IndexComponentType.UNSIGNED_INT;
    }
    this._count = length;
    super.data(source, usage, srcOffset, length);
    return this;
  }
}
