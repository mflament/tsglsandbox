import { Bindable, checkNull, Deletable } from '../gl-utils';
import { GLTexture2D } from '../texture/GLTexture';

const TARGET = WebGL2RenderingContext.FRAMEBUFFER;

export class FrameBuffer implements Bindable, Deletable {
  private readonly fb: WebGLFramebuffer;

  constructor(readonly gl: WebGL2RenderingContext) {
    this.fb = checkNull(() => gl.createFramebuffer());
  }

  bind(): FrameBuffer {
    this.gl.bindFramebuffer(TARGET, this.fb);
    return this;
  }

  unbind(): FrameBuffer {
    this.gl.bindFramebuffer(TARGET, null);
    return this;
  }

  delete(): void {
    this.gl.deleteFramebuffer(this.fb);
  }

  attach(texture: GLTexture2D, index = 0, level = 0): FrameBuffer {
    this.gl.framebufferTexture2D(
      TARGET,
      WebGL2RenderingContext.COLOR_ATTACHMENT0 + index,
      WebGL2RenderingContext.TEXTURE_2D,
      texture.gltexture,
      level
    );
    return this;
  }

  detach(index = 0, level = 0): FrameBuffer {
    this.gl.framebufferTexture2D(
      TARGET,
      WebGL2RenderingContext.COLOR_ATTACHMENT0 + index,
      WebGL2RenderingContext.TEXTURE_2D,
      null,
      level
    );
    return this;
  }
}
