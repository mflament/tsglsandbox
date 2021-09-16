import { AbstractBuffer } from './AbstractBuffer';
import { ArrayBufferType, BufferTarget } from './BufferEnums';

export class TransformFeedbackBuffer extends AbstractBuffer<ArrayBufferType, TransformFeedbackBuffer> {
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
