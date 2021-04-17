import { Bindable, checkNull, Deletable } from '../GLUtils';
import { VertexComponentType } from './BufferEnums';

export interface VertexAttrib {
  index: number;
  size: number;
  type: VertexComponentType;
  normalized: boolean;
  stride: number;
  offset: number;
  attribDivisor?: number;
}
export type PartialVertexAttrib = Partial<VertexAttrib> & {
  size: number;
};

export class VertextArray implements Bindable, Deletable {
  readonly vao: WebGLVertexArrayObject;
  private readonly attributes: VertexAttrib[] = [];

  constructor(readonly gl: WebGL2RenderingContext) {
    this.vao = checkNull(() => gl.createVertexArray());
  }

  withAttribute(attribute: PartialVertexAttrib): VertextArray {
    const a: VertexAttrib = {
      index: this.attributes.length,
      type: WebGL2RenderingContext.FLOAT,
      normalized: false,
      offset: 0,
      stride: 0,
      ...attribute
    };
    this.gl.enableVertexAttribArray(a.index);
    this.gl.vertexAttribPointer(a.index, a.size, a.type, a.normalized, a.stride, a.offset);
    if (typeof a.attribDivisor === 'number') this.gl.vertexAttribDivisor(a.index, a.attribDivisor);
    this.attributes.push(a);
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
