import { Deletable } from '../gl/utils/GLUtils';
import { AbstractGLSandbox, newSandboxFactory } from '../gl/sandbox/AbstractGLSandbox';
import { SandboxContainer, SandboxFactory } from '../gl/sandbox/GLSandbox';
import { Program } from '../gl/shader/Program';

// @ts-ignore
import QUADTREE_VS from 'assets/shaders/test/quadtree.vs.glsl';
// @ts-ignore
import QUADTREE_FS from 'assets/shaders/test/quadtree.fs.glsl';
import { BufferUsage, DrawMode } from '../gl/buffers/BufferEnums';
import { vec2, vec4 } from 'gl-matrix';
import { AABB, QuadTree as QuadTree } from '../utils/QuadTree';
import { GLDrawable, newDrawable } from '../gl/buffers/GLDrawable';
import { BufferAttribute, VertexBuffer } from '../gl/buffers/VertexBuffer';

const LINE_COLOR: vec4 = [0.7, 0.7, 0.7, 1];
const POINT_COLOR: vec4 = [0.2, 0.2, 0.9, 1];
const SELLINE_COLOR: vec4 = [0.3, 0.6, 0.3, 1];
const SELPOINT_COLOR: vec4 = [0, 1, 0, 1];
const POINT_FLOATS = 6;

interface QuadTreeAttributes {
  a_position: BufferAttribute;
  a_color: BufferAttribute;
}

type MappedDrawable = { drawable: GLDrawable; buffer: VertexBuffer<QuadTreeAttributes>; draw(): void };

class QuadTreeTestResources implements Deletable {
  readonly lines: MappedDrawable;
  readonly points: MappedDrawable;
  readonly sellines: MappedDrawable;
  readonly selpoints: MappedDrawable;

  private quadTree: QuadTree = new QuadTree();

  private _selbounds?: AABB;

  constructor(readonly container: SandboxContainer, readonly renderProgram: Program) {
    renderProgram.use();
    this.points = this.newMappedDrawable(DrawMode.POINTS);
    this.lines = this.newMappedDrawable(DrawMode.LINES);
    this.sellines = this.newMappedDrawable(DrawMode.LINES);
    this.selpoints = this.newMappedDrawable(DrawMode.POINTS);
  }

  get selbounds(): AABB | undefined {
    return this._selbounds;
  }

  insert(points: vec2[]): boolean {
    let updated = false;
    points.forEach(p => {
      updated = this.quadTree.insert(p) || updated;
    });
    if (updated) this.updateBuffers();
    return updated;
  }

  draw(): void {
    this.points.draw();
    this.lines.draw();
    if (this._selbounds) {
      this.sellines.draw();
      this.selpoints.draw();
    }
  }

  updateSelection(sel?: AABB): void {
    if (sel) {
      this.collectSelLines(sel).update(this.sellines.buffer);
      this.collectPoints(sel, SELPOINT_COLOR).update(this.selpoints.buffer);
      this._selbounds = sel;
    } else {
      this._selbounds = undefined;
    }
  }

  private updateBuffers(): void {
    this.collectPoints(this.quadTree.boundary, POINT_COLOR).update(this.points.buffer);
    this.collectLines().update(this.lines.buffer);
  }

  private collectPoints(aabb: AABB, color: vec4): PointsBuffer {
    const points = this.quadTree.query(aabb);
    const buffer = new PointsBuffer(points.length);
    points.forEach(p => buffer.push(p, color));
    return buffer;
  }

  private collectLines(quadTree: QuadTree = this.quadTree, buffer?: PointsBuffer): PointsBuffer {
    if (!buffer) buffer = new PointsBuffer(this.countLines(quadTree) * 2); // 2 points per line
    if (quadTree.children) {
      buffer.push([quadTree.boundary.xmin, quadTree.boundary.center[1]], LINE_COLOR);
      buffer.push([quadTree.boundary.xmax, quadTree.boundary.center[1]], LINE_COLOR);

      buffer.push([quadTree.boundary.center[0], quadTree.boundary.ymin], LINE_COLOR);
      buffer.push([quadTree.boundary.center[0], quadTree.boundary.ymax], LINE_COLOR);

      quadTree.children.forEach(child => this.collectLines(child, buffer));
    }
    return buffer;
  }

  private collectSelLines(bounds: AABB): PointsBuffer {
    const buffer = new PointsBuffer(4 * 2);
    buffer.push([bounds.xmin, bounds.ymin], SELLINE_COLOR);
    buffer.push([bounds.xmax, bounds.ymin], SELLINE_COLOR);

    buffer.push([bounds.xmax, bounds.ymin], SELLINE_COLOR);
    buffer.push([bounds.xmax, bounds.ymax], SELLINE_COLOR);

    buffer.push([bounds.xmax, bounds.ymax], SELLINE_COLOR);
    buffer.push([bounds.xmin, bounds.ymax], SELLINE_COLOR);

    buffer.push([bounds.xmin, bounds.ymax], SELLINE_COLOR);
    buffer.push([bounds.xmin, bounds.ymin], SELLINE_COLOR);
    return buffer;
  }

  private countLines(quadTree: QuadTree): number {
    if (quadTree.children) {
      let count = 2;
      quadTree.children.forEach(child => (count += this.countLines(child)));
      return count;
    }
    return 0;
  }

  get gl(): WebGL2RenderingContext {
    return this.container.gl;
  }

  private newMappedDrawable(drawMode: DrawMode): MappedDrawable {
    const vertices = new VertexBuffer<QuadTreeAttributes>(this.gl, {
      a_position: { size: 2 },
      a_color: { size: 4 }
    });
    const drawable = newDrawable(
      this.gl,
      vertices,
      {
        a_position: 0,
        a_color: 1
      },
      drawMode
    );
    return {
      drawable: drawable,
      buffer: vertices,
      draw: () => drawable.bind().draw()
    };
  }

  delete(): void {
    this.lines.drawable.unbind().delete();
    this.points.drawable.unbind().delete();
    this.container.gl.useProgram(null);
    this.renderProgram.delete();
  }
}

async function loadResources(container: SandboxContainer): Promise<QuadTreeTestResources> {
  const program = await container.programLoader.loadProgram({
    vsSource: QUADTREE_VS,
    fsSource: QUADTREE_FS
  });
  return new QuadTreeTestResources(container, program);
}

class QuadTreeTestSandbox extends AbstractGLSandbox<QuadTreeTestResources, never> {
  private _clickPos?: vec2;
  private readonly _currentPos: vec2 = [0, 0];

  constructor(container: SandboxContainer, name: string, resources: QuadTreeTestResources) {
    super(container, name, resources, {} as never);
  }

  onkeydown(e: KeyboardEvent): void {
    switch (e.key) {
      case 'r':
        this.addRandomPoints(50);
        break;
    }
  }

  private addRandomPoints(count: number): void {
    const points: vec2[] = new Array(count);
    for (let i = 0; i < count; i++) points[i] = [Math.random() * 2 - 1, Math.random() * 2 - 1];
    this.resources.insert(points);
  }

  onmousedown(e: MouseEvent): void {
    this._clickPos = this.toWorld(e);
    vec2.copy(this._currentPos, this._clickPos);
  }

  onmouseup(): void {
    if (this._clickPos) {
      if (!this.resources.selbounds) this.resources.insert([this._clickPos]);
      this._clickPos = undefined;
      this.resources.updateSelection(undefined);
    }
  }

  onmousemove(e: MouseEvent): void {
    if (this._clickPos) {
      this.toWorld(e, this._currentPos);
      let bounds = this.resources.selbounds;
      if (bounds || vec2.sqrDist(this._clickPos, this._currentPos) > 0.0001) {
        if (!bounds) bounds = new AABB([0, 0], [1, 1]);
        const xmin = Math.min(this._clickPos[0], this._currentPos[0]);
        const xmax = Math.max(this._clickPos[0], this._currentPos[0]);
        const ymin = Math.min(this._clickPos[1], this._currentPos[1]);
        const ymax = Math.max(this._clickPos[1], this._currentPos[1]);
        const hw = (xmax - xmin) / 2;
        const hh = (ymax - ymin) / 2;
        vec2.set(bounds.center, xmin + hw, ymin + hh);
        vec2.set(bounds.halfDimension, hw, hh);
        this.resources.updateSelection(bounds);
      }
    }
  }

  private toWorld(e: MouseEvent, out?: vec2): vec2 {
    out = out ? out : vec2.create();
    vec2.set(out, (e.offsetX / this.dimension[0]) * 2 - 1, (1 - e.offsetY / this.dimension[1]) * 2 - 1);
    return out;
  }

  delete(): void {
    this.resources.delete();
    super.delete();
  }

  render(): void {
    super.clear();
    const resources = this.resources;
    resources.draw();
  }
}

export function quadTreeTest(): SandboxFactory {
  return newSandboxFactory(
    loadResources,
    (container, name, resources) => new QuadTreeTestSandbox(container, name, resources)
  );
}

class PointsBuffer {
  readonly array: Float32Array;
  private _count = 0;
  constructor(capacity: number) {
    this.array = new Float32Array(capacity * POINT_FLOATS);
  }

  get count(): number {
    return this._count;
  }

  push(pos: vec2, color: vec4): PointsBuffer {
    const offset = this._count * POINT_FLOATS;
    this.array.set(pos, offset);
    this.array.set(color, offset + 2);
    this._count++;
    return this;
  }

  update(glbuffer: VertexBuffer, usage: BufferUsage = BufferUsage.DYNAMIC_DRAW): PointsBuffer {
    glbuffer.bind().setdata(this.array, usage, 0, this._count * POINT_FLOATS);
    return this;
  }
}
