import { TransformFeedbackDrawMode } from '../buffers/BufferEnums';
import { VertexBuffer } from '../buffers/VertexBuffer';
import { AbstractDeletable, Bindable, checkNull } from '../GLUtils';
export class TransformFeedback extends AbstractDeletable implements Bindable {
  private readonly transformFeedback: WebGLTransformFeedback;

  constructor(readonly gl: WebGL2RenderingContext) {
    super();
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
    super.delete();
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
