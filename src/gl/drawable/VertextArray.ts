import {AbstractDeletable, Bindable, checkNull} from '../GLUtils';
import {BufferAttribute, VertexBuffer} from '../buffers/VertexBuffer';

export type AttributeLocations<T = never> = {
  [P in keyof T]?: number;
};

export class VertexArray extends AbstractDeletable implements Bindable {
  private static _boundArray?: VertexArray;

  readonly vao: WebGLVertexArrayObject;

  constructor(readonly gl: WebGL2RenderingContext) {
    super();
    this.vao = checkNull(() => gl.createVertexArray());
  }

  mapAttributes<V>(
    vbo: VertexBuffer<V>,
    attributeLocations?: AttributeLocations<V>,
    attribDivisor?: number
  ): VertexArray {
    if (attributeLocations) {
      for (const name in attributeLocations) {
        const location = attributeLocations[name];
        if (typeof location === 'number' && location >= 0) {
          const attr = vbo.attribute(name);
          if (attr) this.mapAttribute(location, attr, attribDivisor);
        }
      }
    } else {
      for (let i = 0; i < vbo.attributesCount; i++) {
        this.mapAttribute(i, vbo.attribute(i), attribDivisor);
      }
    }
    return this;
  }

  mapAttribute(location: number, attribute: BufferAttribute, attribDivisor?: number): VertexArray {
    this.gl.enableVertexAttribArray(location);
    this.gl.vertexAttribPointer(
      location,
      attribute.size,
      attribute.type === undefined ? WebGL2RenderingContext.FLOAT : attribute.type,
      attribute.normalized || false,
      attribute.stride,
      attribute.offset
    );
    if (typeof attribDivisor === 'number') this.gl.vertexAttribDivisor(location, attribDivisor);
    return this;
  }

  bind(): VertexArray {
    if (VertexArray._boundArray !== this) {
      this.gl.bindVertexArray(this.vao);
      VertexArray._boundArray = this;
    }
    return this;
  }

  unbind(): VertexArray {
    if (VertexArray._boundArray === this) {
      this.gl.bindVertexArray(null);
      VertexArray._boundArray = undefined;
    }
    return this;
  }

  delete(): VertexArray {
    this.unbind();
    this.gl.deleteVertexArray(this.vao);
    super.delete();
    return this;
  }
}
