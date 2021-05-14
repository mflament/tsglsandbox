import { Bindable, checkNull, Deletable } from '../utils/GLUtils';
import { GLTexture2D } from '../texture/GLTexture';

const FRAMEBUFFER = WebGL2RenderingContext.FRAMEBUFFER;

export enum FrameBufferStatus {
  COMPLETE = WebGL2RenderingContext.FRAMEBUFFER_COMPLETE,
  INCOMPLETE_ATTACHMENT = WebGL2RenderingContext.FRAMEBUFFER_INCOMPLETE_ATTACHMENT,
  MISSING_ATTACHMENT = WebGL2RenderingContext.FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT,
  INCOMPLETE_DIMENSIONS = WebGL2RenderingContext.FRAMEBUFFER_INCOMPLETE_DIMENSIONS,
  UNSUPPORTED = WebGL2RenderingContext.FRAMEBUFFER_UNSUPPORTED,
  INCOMPLETE_MULTISAMPLE = WebGL2RenderingContext.FRAMEBUFFER_INCOMPLETE_MULTISAMPLE
}

export function frameBufferStatusName(status: FrameBufferStatus): string {
  switch (status) {
    case FrameBufferStatus.COMPLETE:
      return 'COMPLETE';
    case FrameBufferStatus.INCOMPLETE_ATTACHMENT:
      return 'INCOMPLETE_ATTACHMENT';
    case FrameBufferStatus.MISSING_ATTACHMENT:
      return 'MISSING_ATTACHMENT';
    case FrameBufferStatus.INCOMPLETE_DIMENSIONS:
      return 'INCOMPLETE_DIMENSIONS';
    case FrameBufferStatus.UNSUPPORTED:
      return 'UNSUPPORTED';
    case FrameBufferStatus.INCOMPLETE_MULTISAMPLE:
      return 'INCOMPLETE_MULTISAMPLE';
    default:
      return 'Uknown status ' + status;
  }
}

export class FrameBuffer implements Bindable, Deletable {
  private readonly fb: WebGLFramebuffer;

  constructor(readonly gl: WebGL2RenderingContext) {
    this.fb = checkNull(() => gl.createFramebuffer());
  }

  bind(): FrameBuffer {
    this.gl.bindFramebuffer(FRAMEBUFFER, this.fb);
    return this;
  }

  unbind(): FrameBuffer {
    this.gl.bindFramebuffer(FRAMEBUFFER, null);
    return this;
  }

  delete(): void {
    this.gl.deleteFramebuffer(this.fb);
  }

  attach(texture: GLTexture2D, index = 0, level = 0): FrameBuffer {
    this.gl.framebufferTexture2D(
      FRAMEBUFFER,
      WebGL2RenderingContext.COLOR_ATTACHMENT0 + index,
      WebGL2RenderingContext.TEXTURE_2D,
      texture.gltexture,
      level
    );
    return this;
  }

  drawBuffers(buffers: number[]): FrameBuffer {
    this.gl.drawBuffers(buffers.map(a => WebGL2RenderingContext.COLOR_ATTACHMENT0 + a));
    return this;
  }

  detach(index = 0, level = 0): FrameBuffer {
    this.gl.framebufferTexture2D(
      FRAMEBUFFER,
      WebGL2RenderingContext.COLOR_ATTACHMENT0 + index,
      WebGL2RenderingContext.TEXTURE_2D,
      null,
      level
    );
    return this;
  }

  get status(): FrameBufferStatus {
    return this.gl.checkFramebufferStatus(WebGL2RenderingContext.FRAMEBUFFER);
  }

  checkStatus(): void {
    const status = this.status;
    if (status !== FrameBufferStatus.COMPLETE) {
      const message = 'FrameBuffer is not complete:' + frameBufferStatusName(status);
      console.error(message);
      throw new Error(message);
    }
  }
}
