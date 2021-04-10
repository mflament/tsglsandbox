import { glCreate } from './gl-utils';

type BufferTarget =
  | WebGL2RenderingContext['ARRAY_BUFFER']
  | WebGL2RenderingContext['ELEMENT_ARRAY_BUFFER']
  | WebGL2RenderingContext['COPY_READ_BUFFER']
  | WebGL2RenderingContext['COPY_WRITE_BUFFER']
  | WebGL2RenderingContext['TRANSFORM_FEEDBACK_BUFFER']
  | WebGL2RenderingContext['UNIFORM_BUFFER']
  | WebGL2RenderingContext['PIXEL_PACK_BUFFER']
  | WebGL2RenderingContext['PIXEL_UNPACK_BUFFER'];

type BufferUsage =
  | WebGL2RenderingContext['STATIC_DRAW']
  | WebGL2RenderingContext['DYNAMIC_DRAW']
  | WebGL2RenderingContext['STREAM_DRAW']
  | WebGL2RenderingContext['STATIC_READ']
  | WebGL2RenderingContext['DYNAMIC_READ']
  | WebGL2RenderingContext['STREAM_READ']
  | WebGL2RenderingContext['STATIC_COPY']
  | WebGL2RenderingContext['DYNAMIC_COPY']
  | WebGL2RenderingContext['STREAM_COPY'];

type DrawMode =
  | WebGL2RenderingContext['POINTS']
  | WebGL2RenderingContext['LINE_STRIP']
  | WebGL2RenderingContext['LINE_LOOP']
  | WebGL2RenderingContext['LINES']
  | WebGL2RenderingContext['TRIANGLE_STRIP']
  | WebGL2RenderingContext['TRIANGLE_FAN']
  | WebGL2RenderingContext['TRIANGLES'];

type VertexComponentType =
  | WebGL2RenderingContext['BYTE']
  | WebGL2RenderingContext['SHORT']
  | WebGL2RenderingContext['FLOAT']
  | WebGL2RenderingContext['UNSIGNED_BYTE']
  | WebGL2RenderingContext['UNSIGNED_SHORT'];

type IndexComponentType =
  | WebGL2RenderingContext['UNSIGNED_BYTE']
  | WebGL2RenderingContext['UNSIGNED_SHORT']
  | WebGL2RenderingContext['UNSIGNED_INT'];

export interface Buffer {
  bind(): Buffer;
  unbind(): Buffer;
  delete(): Buffer;
}

export interface Drawable {
  draw(mode?: DrawMode, offset?: number, count?: number): void;
}

class AbstractBuffer implements Buffer {
  readonly glbuffer: WebGLBuffer;

  constructor(readonly gl: WebGL2RenderingContext, readonly target: BufferTarget) {
    this.glbuffer = glCreate(() => gl.createBuffer());
    this.gl.bindBuffer(target, this.glbuffer);
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

  allocate(size: number, usage: BufferUsage = WebGL2RenderingContext.STATIC_READ): AbstractBuffer {
    this.gl.bufferData(this.target, size, usage);
    return this;
  }

  protected data(
    source: ArrayBufferView,
    usage: BufferUsage = WebGL2RenderingContext.STATIC_READ,
    srcOffset = 0,
    length = source.byteLength
  ): AbstractBuffer {
    this.gl.bufferData(this.target, source, usage, srcOffset, length);
    return this;
  }
}

export class IndexBuffer extends AbstractBuffer implements Drawable {
  private _type: IndexComponentType = WebGL2RenderingContext.UNSIGNED_SHORT;
  private _count = 0;

  constructor(readonly gl: WebGL2RenderingContext) {
    super(gl, WebGL2RenderingContext.ELEMENT_ARRAY_BUFFER);
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

  draw(mode: DrawMode = WebGL2RenderingContext.TRIANGLES, offset = 0, count = this._count): void {
    this.gl.drawElements(mode, count, this._type, offset);
  }

  data(
    source: Uint8Array | Uint16Array | Uint32Array,
    usage: BufferUsage = WebGL2RenderingContext.STATIC_READ,
    srcOffset = 0,
    length = source.length
  ): IndexBuffer {
    if (source instanceof Uint8Array) {
      this._type = WebGL2RenderingContext.UNSIGNED_BYTE;
    } else if (source instanceof Uint16Array) {
      this._type = WebGL2RenderingContext.UNSIGNED_SHORT;
    } else if (source instanceof Uint32Array) {
      this._type = WebGL2RenderingContext.UNSIGNED_INT;
    }
    this._count = length;
    super.data(source, usage, srcOffset, length);
    return this;
  }
}

export class VertexBuffer extends AbstractBuffer {
  private _type: VertexComponentType = WebGL2RenderingContext.FLOAT;
  private _count = 0;

  constructor(gl: WebGL2RenderingContext) {
    super(gl, WebGL2RenderingContext.ARRAY_BUFFER);
  }

  get type(): VertexComponentType {
    return this._type;
  }

  bind(): VertexBuffer {
    super.bind();
    return this;
  }

  unbind(): VertexBuffer {
    super.bind();
    return this;
  }

  draw(mode: DrawMode = WebGL2RenderingContext.TRIANGLES, offset = 0, count = this._count): void {
    this.gl.drawArrays(mode, offset, count);
  }

  data(
    source: Int8Array | Int16Array | Int32Array | Float32Array | Uint8Array | Uint16Array | Uint32Array,
    usage: BufferUsage = WebGL2RenderingContext.STATIC_READ,
    srcOffset = 0,
    length = source.length
  ): VertexBuffer {
    if (source instanceof Int8Array) this._type = WebGL2RenderingContext.BYTE;
    else if (source instanceof Int16Array) this._type = WebGL2RenderingContext.SHORT;
    else if (source instanceof Float32Array) this._type = WebGL2RenderingContext.FLOAT;
    else if (source instanceof Uint8Array) this._type = WebGL2RenderingContext.UNSIGNED_BYTE;
    else if (source instanceof Uint16Array) this._type = WebGL2RenderingContext.UNSIGNED_SHORT;
    this._count = length;
    super.data(source, usage, srcOffset, length);
    return this;
  }
}

export interface VertexAttrib {
  index: number;
  size: number;
  type: VertexComponentType;
  normalized: boolean;
  stride: number;
  offset: number;
}

export class VertextArray implements Buffer {
  readonly vao: WebGLVertexArrayObject;

  constructor(readonly gl: WebGL2RenderingContext) {
    this.vao = glCreate(() => gl.createVertexArray());
  }

  withAttribute(
    index: number,
    size: number,
    type: VertexComponentType,
    normalized = false,
    stride = 0,
    offset = 0
  ): VertextArray {
    this.gl.enableVertexAttribArray(index);
    this.gl.vertexAttribPointer(index, size, type, normalized, stride, offset);
    return this;
  }

  bind(): VertextArray {
    this.gl.bindVertexArray(this.vao);
    return this;
  }

  unbind(): VertextArray {
    this.gl.bindVertexArray(null);
    return this;
  }

  delete(): VertextArray {
    this.gl.deleteVertexArray(this.vao);
    return this;
  }
}
