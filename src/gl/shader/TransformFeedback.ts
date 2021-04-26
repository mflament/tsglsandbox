import { TransformFeedbackDrawMode } from '../buffers/BufferEnums';
import { VertexBuffer } from '../buffers/GLBuffers';
import { Bindable, checkNull, Deletable } from '../utils/GLUtils';

export enum VaryingBufferMode {
  INTERLEAVED_ATTRIBS = WebGL2RenderingContext.INTERLEAVED_ATTRIBS,
  SEPARATE_ATTRIBS = WebGL2RenderingContext.SEPARATE_ATTRIBS
}
export interface TransformFeedbackVarying {
  name: string;
  bufferMode: VaryingBufferMode;
}

export class TransformFeedback implements Bindable, Deletable {
  private readonly transformFeedback: WebGLTransformFeedback;

  constructor(readonly gl: WebGL2RenderingContext) {
    this.transformFeedback = checkNull(() => gl.createTransformFeedback());
  }

  bind(): TransformFeedback {
    this.gl.bindTransformFeedback(WebGL2RenderingContext.TRANSFORM_FEEDBACK, this.transformFeedback);
    return this;
  }

  unbind(): TransformFeedback {
    this.gl.bindTransformFeedback(WebGL2RenderingContext.TRANSFORM_FEEDBACK, null);
    return this;
  }

  bindBuffer(index: number, buffer: VertexBuffer): TransformFeedback {
    this.gl.bindBufferBase(WebGL2RenderingContext.TRANSFORM_FEEDBACK_BUFFER, index, buffer.glbuffer);
    return this;
  }

  unbindBuffer(index: number): TransformFeedback {
    this.gl.bindBufferBase(WebGL2RenderingContext.TRANSFORM_FEEDBACK_BUFFER, index, null);
    return this;
  }

  delete(): TransformFeedback {
    this.gl.deleteTransformFeedback(this.transformFeedback);
    return this;
  }

  begin(mode: TransformFeedbackDrawMode): TransformFeedback {
    this.gl.beginTransformFeedback(mode);
    return this;
  }

  end(): TransformFeedback {
    this.gl.endTransformFeedback();
    return this;
  }
}
