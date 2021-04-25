import { Bindable, checkNull, Deletable } from '../utils/GLUtils';
import { VertexComponentType } from './BufferEnums';

export interface VertexAttribute {
  location: number;
  size: number;
  type: VertexComponentType;
  normalized: boolean;
  stride: number;
  offset: number;
  attribDivisor?: number;
}

export type PartialVertexAttribute = Partial<VertexAttribute> & {
  location: number;
  size: number;
};

export class VertextArray implements Bindable, Deletable {
  readonly vao: WebGLVertexArrayObject;
  private readonly attributes: VertexAttribute[] = [];

  constructor(readonly gl: WebGL2RenderingContext) {
    this.vao = checkNull(() => gl.createVertexArray());
  }

  withAttribute(attribute: PartialVertexAttribute): VertextArray {
    const a: VertexAttribute = {
      type: WebGL2RenderingContext.FLOAT,
      normalized: false,
      offset: 0,
      stride: 0,
      ...attribute
    };
    this.gl.enableVertexAttribArray(a.location);
    this.gl.vertexAttribPointer(a.location, a.size, a.type, a.normalized, a.stride, a.offset);
    if (typeof a.attribDivisor === 'number') this.gl.vertexAttribDivisor(a.location, a.attribDivisor);
    this.attributes.push(a);
    return this;
  }

  get lastAttribute(): VertexAttribute {
    return this.attributes[this.attributes.length - 1];
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
