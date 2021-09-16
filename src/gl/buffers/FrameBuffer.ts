import { AbstractDeletable, Bindable, checkNull } from '../GLUtils';
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

export class FrameBuffer extends AbstractDeletable implements Bindable {
  private readonly fb: WebGLFramebuffer;
  private readonly _attachments: number[] = [];

  constructor(readonly gl: WebGL2RenderingContext) {
    super();
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
    super.delete();
  }

  attach(textures: GLTexture2D | GLTexture2D[], level = 0): FrameBuffer {
    if (!Array.isArray(textures)) textures = [textures];
    textures.forEach(t => {
      const index = WebGL2RenderingContext.COLOR_ATTACHMENT0 + this._attachments.length;
      this.gl.framebufferTexture2D(FRAMEBUFFER, index, WebGL2RenderingContext.TEXTURE_2D, t.gltexture, level);
      this._attachments.push(index);
    });
    this.gl.drawBuffers(this._attachments);
    return this;
  }

  detach(): FrameBuffer {
    this._attachments.forEach((_t, index) =>
      this.gl.framebufferTexture2D(
        FRAMEBUFFER,
        WebGL2RenderingContext.COLOR_ATTACHMENT0 + index,
        WebGL2RenderingContext.TEXTURE_2D,
        null,
        0
      )
    );
    this._attachments.splice(0, this._attachments.length);
    this.gl.drawBuffers(this._attachments);
    return this;
  }

  get status(): FrameBufferStatus {
    return this.gl.checkFramebufferStatus(WebGL2RenderingContext.FRAMEBUFFER);
  }

  checkStatus(): void {
    const status = this.status;
    if (status !== FrameBufferStatus.COMPLETE) {
      const message = 'FrameBuffer is not complete:' + frameBufferStatusName(status);
      throw new Error(message);
    }
  }
}
