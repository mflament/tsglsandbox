import { Bindable, checkNull, Deletable } from '../gl-utils';
import { VertexComponentType } from './BufferEnums';

export interface VertexAttrib {
  index: number;
  size: number;
  type: VertexComponentType;
  normalized: boolean;
  stride: number;
  offset: number;
}

export class VertextArray implements Bindable, Deletable {
  readonly vao: WebGLVertexArrayObject;

  constructor(readonly gl: WebGL2RenderingContext) {
    this.vao = checkNull(() => gl.createVertexArray());
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
