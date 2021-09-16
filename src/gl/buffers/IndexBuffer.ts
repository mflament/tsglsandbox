import { AbstractBuffer } from './AbstractBuffer';
import { BufferTarget, IndexBufferType, IndexComponentType, sizeOf } from './BufferEnums';

export abstract class IndexBuffer<T extends IndexBufferType = never> extends AbstractBuffer<T, IndexBuffer<T>> {
  constructor(gl: WebGL2RenderingContext, readonly componentType: IndexComponentType) {
    super(gl, BufferTarget.ELEMENT_ARRAY_BUFFER);
  }

  get count(): number {
    return this.size / sizeOf(this.componentType);
  }

  protected self(): IndexBuffer<T> {
    return this;
  }
}

export class ByteIndexBuffer extends IndexBuffer<Uint8Array> {
  constructor(gl: WebGL2RenderingContext) {
    super(gl, IndexComponentType.UNSIGNED_BYTE);
  }

  protected self(): ByteIndexBuffer {
    return this;
  }
}

export class ShortIndexBuffer extends IndexBuffer<Uint16Array> {
  constructor(gl: WebGL2RenderingContext) {
    super(gl, IndexComponentType.UNSIGNED_SHORT);
  }

  protected self(): ShortIndexBuffer {
    return this;
  }
}

export class IntIndexBuffer extends IndexBuffer<Uint32Array> {
  constructor(gl: WebGL2RenderingContext) {
    super(gl, IndexComponentType.UNSIGNED_INT);
  }

  protected self(): IntIndexBuffer {
    return this;
  }
}
