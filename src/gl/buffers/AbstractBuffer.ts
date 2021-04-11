import { Bindable, checkNull, Deletable } from '../gl-utils';
import { BufferTarget, BufferUsage, DrawMode } from './BufferEnums';

export abstract class AbstractBuffer implements Bindable, Deletable {
  readonly glbuffer: WebGLBuffer;

  constructor(readonly gl: WebGL2RenderingContext, readonly target: BufferTarget) {
    this.glbuffer = checkNull(() => gl.createBuffer());
    this.gl.bindBuffer(this.target, this.glbuffer);
  }

  bind(): AbstractBuffer {
    this.gl.bindBuffer(this.target, this.glbuffer);
    return this;
  }

  unbind(): AbstractBuffer {
    this.gl.bindBuffer(this.target, null);
    return this;
  }

  delete(): AbstractBuffer {
    this.gl.deleteBuffer(this.glbuffer);
    return this;
  }

  allocate(size: number, usage = BufferUsage.STATIC_READ): AbstractBuffer {
    this.gl.bufferData(this.target, size, usage);
    return this;
  }

  abstract draw(mode?: DrawMode, offset?: number, count?: number): void;

  protected data(
    source: ArrayBufferView,
    usage = BufferUsage.STATIC_READ,
    srcOffset = 0,
    length = source.byteLength
  ): AbstractBuffer {
    this.gl.bufferData(this.target, source, usage, srcOffset, length);
    return this;
  }
}
