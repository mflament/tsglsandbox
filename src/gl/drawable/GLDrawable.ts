import {AttributeLocations, VertexArray} from './VertextArray';
import {AbstractDeletable, Bindable} from '../GLUtils';
import {DrawMode, IndexBuffer, IndexBufferType, VertexBuffer} from 'gl';

interface VertexBufferParameter<V = any> {
  buffer: VertexBuffer<V>;
  locations?: AttributeLocations<V>;
}

export class GLDrawable<V = any> extends AbstractDeletable implements Bindable {
  protected readonly vao: VertexArray;
  readonly vertices: VertexBuffer<V>;
  constructor(
    readonly gl: WebGL2RenderingContext,
    verticesParam: VertexBufferParameter<V>,
    readonly drawMode: DrawMode
  ) {
    super();
    this.vao = new VertexArray(gl).bind();
    this.vertices = verticesParam.buffer;
    this.vertices.bind();
    this.vao.mapAttributes(this.vertices, verticesParam.locations);
  }

  draw(count = this.vertices.count, offset = 0): void {
    this.gl.drawArrays(this.drawMode, offset, count);
  }

  bind(): GLDrawable<V> {
    this.vertices.bind();
    this.vao.bind();
    return this;
  }

  unbind(): GLDrawable<V> {
    this.vao.unbind();
    return this;
  }

  delete(): void {
    this.vao.delete();
    this.vertices.delete();
    super.delete();
  }
}

export class IndexedDrawable<V = any, I extends IndexBufferType = IndexBufferType> extends GLDrawable<V> {
  constructor(
    gl: WebGL2RenderingContext,
    verticesParam: VertexBufferParameter<V>,
    drawMode: DrawMode,
    readonly indices: IndexBuffer<I>
  ) {
    super(gl, verticesParam, drawMode);
  }

  bind(): IndexedDrawable<V, I> {
    super.bind();
    this.indices.bind();
    return this;
  }

  unbind(): IndexedDrawable<V, I> {
    super.unbind();
    this.indices.unbind();
    return this;
  }

  delete(): void {
    super.delete();
    this.indices.delete();
  }

  draw(count = this.indices.count, offset = 0): void {
    this.gl.drawElements(this.drawMode, count, this.indices.componentType, offset);
  }
}

export class InstancedDrawable<V = any, E = any> extends AbstractDeletable {
  readonly vertices?: VertexBuffer<V>;
  readonly instances?: VertexBuffer<E>;
  protected readonly vao: VertexArray;

  constructor(
    readonly gl: WebGL2RenderingContext,
    readonly drawMode: DrawMode,
    verticesParam?: VertexBufferParameter<V>,
    instancesParam?: VertexBufferParameter<E>
  ) {
    super();
    this.vao = new VertexArray(gl).bind();
    if (verticesParam) {
      this.vertices = verticesParam.buffer;
      this.vertices.bind();
      this.vao.mapAttributes(this.vertices, verticesParam.locations);
    }
    if (instancesParam) {
      this.instances = instancesParam.buffer;
      this.instances.bind();
      this.vao.mapAttributes(this.instances, instancesParam.locations, 1);
    }
  }

  get instancesCount(): number {
    return this.instances ? this.instances.count : 1;
  }

  get vertexCount(): number {
    return this.vertices ? this.vertices.count : 0;
  }

  bind(): InstancedDrawable<V, E> {
    this.vertices?.bind();
    this.instances?.bind();
    this.vao.bind();
    return this;
  }

  unbind(): InstancedDrawable<V, E> {
    this.vao.unbind();
    return this;
  }

  delete(): void {
    this.vao.delete();
    this.vertices?.delete();
    this.instances?.delete();
    super.delete();
  }

  draw(instanceCount = this.instancesCount, vertexCount = this.vertexCount, vertexOffset = 0): void {
    this.gl.drawArraysInstanced(this.drawMode, vertexOffset, vertexCount, instanceCount);
  }
}

export class InstancedIndexedDrawable<
  V = any,
  E = any,
  I extends IndexBufferType = IndexBufferType
> extends InstancedDrawable<V, E> {
  constructor(
    gl: WebGL2RenderingContext,
    drawMode: DrawMode,
    readonly indices: IndexBuffer<I>,
    verticesParam?: VertexBufferParameter<V>,
    instancesParam?: VertexBufferParameter<E>
  ) {
    super(gl, drawMode, verticesParam, instancesParam);
  }

  bind(): InstancedIndexedDrawable<V, E, I> {
    super.bind();
    this.indices.bind();
    return this;
  }

  unbind(): InstancedIndexedDrawable<V, E, I> {
    super.unbind();
    this.indices.unbind();
    return this;
  }

  delete(): void {
    super.delete();
    this.indices.delete();
  }

  draw(instanceCount = this.instancesCount, indexCount = this.indices.count, indexOffset = 0): void {
    this.gl.drawElementsInstanced(this.drawMode, indexCount, this.indices.componentType, indexOffset, instanceCount);
  }
}
