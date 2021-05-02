import { AbstractBuffer } from './AbstractBuffer';
import { ArrayBufferType, BufferTarget } from './BufferEnums';

export class UniformBuffer extends AbstractBuffer<ArrayBufferType, UniformBuffer> {
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
