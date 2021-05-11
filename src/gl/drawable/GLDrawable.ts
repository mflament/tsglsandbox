import { VertexArray, AttributeLocations } from './VertextArray';
import { Bindable, Deletable } from '../utils/GLUtils';
import { DrawMode, IndexBuffer, IndexBufferType, VertexBuffer } from '../buffers/GLBuffers';

export interface GLDrawable<V = unknown> extends Bindable, Deletable {
  readonly vao: VertexArray;
  readonly vertices: VertexBuffer<V>;
  readonly drawMode: DrawMode;
  draw(count?: number, offset?: number): void;
  bind(): GLDrawable<V>;
  unbind(): GLDrawable<V>;
}

export interface InstancedDrawable<V = unknown, E = unknown> extends GLDrawable<V> {
  readonly instances: VertexBuffer<E>;
  bind(): InstancedDrawable<V, E>;
  unbind(): InstancedDrawable<V, E>;
  draw(instanceCount?: number, vertexCount?: number, vertexOffset?: number): void;
}

export interface IndexedDrawable<V = unknown, I extends IndexBufferType = IndexBufferType> extends GLDrawable<V> {
  readonly indices: IndexBuffer<I>;
  bind(): IndexedDrawable<V, I>;
  unbind(): IndexedDrawable<V, I>;
}

export interface InstancedIndexedDrawable<V = unknown, E = unknown, I extends IndexBufferType = IndexBufferType>
  extends InstancedDrawable<V, E>,
    IndexedDrawable<V, I> {
  draw(vertexCount?: number, vertexOffset?: number, instanceCount?: number, instanceOffset?: number): void;
  bind(): InstancedIndexedDrawable<V, E, I>;
  unbind(): InstancedIndexedDrawable<V, E, I>;
}

export function newDrawable<V = unknown>(
  gl: WebGL2RenderingContext,
  vertices: VertexBuffer<V>,
  attributeLocations: AttributeLocations<V>,
  drawMode?: DrawMode
): GLDrawable<V> {
  const vao = new VertexArray(gl).bind();
  vertices.bind();
  vao.mapAttributes(vertices, attributeLocations);
  return new BufferDrawable(gl, vao, vertices, drawMode);
}

export function newIndexedDrawable<V = unknown, I extends IndexBufferType = IndexBufferType>(
  gl: WebGL2RenderingContext,
  vertices: VertexBuffer<V>,
  attributeLocations: AttributeLocations<V>,
  indices: IndexBuffer<I>,
  drawMode?: DrawMode
): IndexedDrawable<V, I> {
  const vao = new VertexArray(gl).bind();
  vertices.bind();
  vao.mapAttributes(vertices, attributeLocations);
  return new BufferDrawable(gl, vao, vertices, drawMode, undefined, indices);
}

export function newInstancedDrawable<V = unknown>(
  gl: WebGL2RenderingContext,
  vertices: VertexBuffer<V>,
  vertexAttributeLocations: AttributeLocations<V>,
  drawMode?: DrawMode
): InstancedDrawable<V, never>;
export function newInstancedDrawable<V = unknown, E = unknown>(
  gl: WebGL2RenderingContext,
  vertices: VertexBuffer<V>,
  vertexAttributeLocations: AttributeLocations<V>,
  instances: VertexBuffer<E>,
  instancesAttributeLocations: AttributeLocations<E>,
  drawMode?: DrawMode
): InstancedDrawable<V, E>;
export function newInstancedDrawable<V = unknown, E = unknown>(
  gl: WebGL2RenderingContext,
  vertices: VertexBuffer<V>,
  vertexAttributeLocations: AttributeLocations<V>,
  instancesOrDrawMode?: VertexBuffer<E> | DrawMode,
  instancesAttributeLocations?: AttributeLocations<E>,
  drawMode?: DrawMode
): InstancedDrawable<V, E> {
  const vao = new VertexArray(gl).bind();
  vertices.bind();
  vao.mapAttributes(vertices, vertexAttributeLocations);
  let instances;
  if (instancesOrDrawMode instanceof VertexBuffer) {
    instances = instancesOrDrawMode;
    instances.bind();
    vao.mapAttributes(instances, instancesAttributeLocations, 1);
  } else {
    drawMode = instancesOrDrawMode;
    instances = undefined;
  }
  return new BufferDrawable(gl, vao, vertices, drawMode, instances, undefined);
}

export function newInstancedIndexedDrawable<V, E, I extends IndexBufferType>(
  gl: WebGL2RenderingContext,
  vertices: VertexBuffer<V>,
  vertexAttributeLocations: AttributeLocations<V>,
  instances: VertexBuffer<E>,
  instancesAttributeLocations: AttributeLocations<E>,
  indices: IndexBuffer<I>,
  drawMode?: DrawMode
): InstancedDrawable<V, E> & IndexedDrawable<V, I> {
  const vao = new VertexArray(gl).bind();
  vertices.bind();
  vao.mapAttributes(vertices, vertexAttributeLocations);
  instances.bind();
  vao.mapAttributes(instances, instancesAttributeLocations, 1);
  return new BufferDrawable(gl, vao, vertices, drawMode, instances, indices);
}

class BufferDrawable<V = unknown, E = unknown, I extends IndexBufferType = IndexBufferType>
  implements GLDrawable<V>, InstancedDrawable<V, E>, IndexedDrawable<V, I> {
  readonly draw: (count?: number, offset?: number, instances?: number) => void;

  constructor(
    readonly gl: WebGL2RenderingContext,
    readonly vao: VertexArray,
    private _vertices: VertexBuffer,
    readonly drawMode: DrawMode = DrawMode.TRIANGLES,
    private _instances?: VertexBuffer,
    private _indices?: IndexBuffer<I>
  ) {
    let draw;
    if (_instances && _indices) {
      draw = this.drawIndexedInstanced;
    } else if (_instances) {
      draw = this.drawInstanced;
    } else if (_indices) {
      draw = this.drawIndexed;
    } else {
      draw = this.drawVertices;
    }
    this.draw = draw.bind(this);
  }

  get vertices(): VertexBuffer<V> {
    return this._vertices;
  }

  get count(): number {
    if (this._instances) return this._instances.count;
    if (this._indices) return this._indices.count;
    return this._vertices.count;
  }

  get instances(): VertexBuffer<E> {
    if (!this._instances) throw new Error('No instances');
    return this._instances;
  }

  get indices(): IndexBuffer<I> {
    if (!this._indices) throw new Error('No indices');
    return this._indices;
  }

  bind(): BufferDrawable<V, E, I> {
    // this.vertices.bind();
    // this._instances?.bind();
    this._indices?.bind();
    this.vao.bind();
    return this;
  }

  unbind(): BufferDrawable<V, E, I> {
    this.vao.unbind();
    // this.vertices.unbind();
    // this._instances?.unbind();
    this._indices?.unbind();
    return this;
  }

  delete(): void {
    this.vao.delete();
    this.vertices.delete();
    this._instances?.delete();
    this._indices?.delete();
  }

  private drawVertices(count = this.vertices.count, offset = 0): void {
    this.gl.drawArrays(this.drawMode, offset, count);
  }

  private drawIndexed(count = this.indices.count, offset = 0): void {
    this.gl.drawElements(this.drawMode, count, this.indices.componentType, offset);
  }

  private drawInstanced(
    instanceCount = this.instances ? this.instances.count : 1,
    vertexCount = this.vertices.count,
    vertexOffset = 0
  ): void {
    this.gl.drawArraysInstanced(this.drawMode, vertexOffset, vertexCount, instanceCount);
  }

  private drawIndexedInstanced(
    instanceCount = this.instances ? this.instances.count : 1,
    indexCount = this.indices.count,
    indexOffset = 0
  ): void {
    this.gl.drawElementsInstanced(this.drawMode, indexCount, this.indices.componentType, indexOffset, instanceCount);
  }
}
