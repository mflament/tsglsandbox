import { VertexArray, AttributeLocations } from './VertextArray';
import { Bindable, Deletable } from '../utils/GLUtils';
import { DrawMode, IndexBufferType } from './BufferEnums';
import { VertexBuffer } from './VertexBuffer';
import { IndexBuffer } from './IndexBuffer';

export interface GLDrawable extends Bindable, Deletable {
  readonly vao: VertexArray;
  vertices: VertexBuffer;
  readonly drawMode: DrawMode;
  draw(count?: number, offset?: number): void;
}

export interface InstancedDrawable extends GLDrawable {
  instances: VertexBuffer;
}

export interface IndexedDrawable<I extends IndexBufferType = never> extends GLDrawable {
  indices: IndexBuffer<I>;
}

export function newDrawable<V>(
  gl: WebGL2RenderingContext,
  vertices: VertexBuffer<V>,
  attributeLocations: AttributeLocations<V>,
  drawMode?: DrawMode
): GLDrawable;
export function newDrawable<V, E>(
  gl: WebGL2RenderingContext,
  vertices: VertexBuffer<V>,
  instances: VertexBuffer<E>,
  attributeLocations: AttributeLocations<V & E>,
  drawMode?: DrawMode
): InstancedDrawable;
export function newDrawable<V, I extends IndexBufferType>(
  gl: WebGL2RenderingContext,
  vertices: VertexBuffer,
  attributeLocations: AttributeLocations<V>,
  indices: IndexBuffer<I>,
  drawMode?: DrawMode
): IndexedDrawable<I>;
export function newDrawable<V, E, I extends IndexBufferType>(
  gl: WebGL2RenderingContext,
  vertices: VertexBuffer<V>,
  instances: VertexBuffer<E>,
  attributeLocations: AttributeLocations<V & E>,
  indices: IndexBuffer<I>,
  drawMode?: DrawMode
): InstancedDrawable & IndexedDrawable<I>;
export function newDrawable<V, E>(
  gl: WebGL2RenderingContext,
  vertices: VertexBuffer<V>,
  p3: AttributeLocations<V> | VertexBuffer,
  p4?: IndexBuffer | AttributeLocations<V & E> | DrawMode,
  p5?: IndexBuffer | DrawMode,
  p6?: DrawMode
): GLDrawable {
  let locations: AttributeLocations<any>;
  let instances: VertexBuffer | undefined;
  let indices: IndexBuffer | undefined;
  let drawMode: DrawMode | undefined;
  if (p3 instanceof VertexBuffer) {
    instances = p3;
    locations = p4 as AttributeLocations;
    if (p5 instanceof IndexBuffer) {
      indices = p5;
      drawMode = p6;
    } else {
      drawMode = p5;
    }
  } else {
    locations = p3;
    if (p4 instanceof IndexBuffer) {
      indices = p4;
      drawMode = p5 as DrawMode;
    } else {
      drawMode = p4 as DrawMode;
    }
  }
  const vao = new VertexArray(gl).bind();
  vertices.bind();
  vao.mapAttributes(vertices, locations);
  if (instances) {
    instances.bind();
    vao.mapAttributes(instances, locations, 1);
  }
  return new BufferDrawable(gl, vao, vertices, drawMode, instances, indices);
}

class BufferDrawable<I extends IndexBufferType = never> implements GLDrawable, InstancedDrawable, IndexedDrawable<I> {
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

  get vertices(): VertexBuffer {
    return this._vertices;
  }

  set vertices(vertices: VertexBuffer) {
    this._vertices = vertices;
  }

  get count(): number {
    if (this._instances) return this._instances.count;
    if (this._indices) return this._indices.count;
    return this.vertices.count;
  }

  get instances(): VertexBuffer {
    if (!this._instances) throw new Error('No instances');
    return this._instances;
  }

  set instances(instances: VertexBuffer) {
    this._instances = instances;
  }

  get indices(): IndexBuffer<I> {
    if (!this._indices) throw new Error('No indices');
    return this._indices;
  }

  set indices(indices: IndexBuffer<I>) {
    this._indices = indices;
  }

  bind(): BufferDrawable {
    this.vertices.bind();
    this._instances?.bind();
    this._indices?.bind();
    this.vao.bind();
    return this;
  }

  unbind(): BufferDrawable {
    this.vao.unbind();
    this.vertices.unbind();
    this._instances?.unbind();
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

  private drawInstanced(count = this.instances.count, offset = 0): void {
    this.gl.drawArraysInstanced(this.drawMode, offset, this.vertices.count, count);
  }

  private drawIndexedInstanced(count = this.instances.count, offset = 0): void {
    this.gl.drawElementsInstanced(this.drawMode, count, this.indices.componentType, offset, count);
  }
}
