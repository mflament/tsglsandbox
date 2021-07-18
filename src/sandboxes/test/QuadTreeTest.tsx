import React, { RefObject } from 'react';
import { vec2, vec4 } from 'gl-matrix';
import {
  AbstractGLSandbox,
  SandboxContainer,
  SandboxFactory,
  Program,
  BufferAttribute,
  GLDrawable,
  VertexBuffer,
  DrawMode,
  BufferUsage
} from 'gl';
import { AABB, QuadTree } from 'utils';

const LINE_COLOR: vec4 = [0.7, 0.7, 0.7, 1];
const POINT_COLOR: vec4 = [0.2, 0.2, 0.9, 1];
const SELLINE_COLOR: vec4 = [0.3, 0.6, 0.3, 1];
const SELPOINT_COLOR: vec4 = [0, 1, 0, 1];
const POINT_FLOATS = 6;

interface QuadTreeAttributes {
  a_position: BufferAttribute;
  a_color: BufferAttribute;
}

type MappedDrawable = {
  drawable: GLDrawable<QuadTreeAttributes>;
  buffer: VertexBuffer<QuadTreeAttributes>;
  draw(): void;
  delete(): void;
};

class QuadTreeTestSandbox extends AbstractGLSandbox {
  static async create(container: SandboxContainer, name: string): Promise<QuadTreeTestSandbox> {
    const program = await container.programLoader.load({ path: 'test/quadtree.glsl' });
    return new QuadTreeTestSandbox(container, name, program);
  }

  readonly lines: MappedDrawable;
  readonly points: MappedDrawable;
  readonly sellines: MappedDrawable;
  readonly selpoints: MappedDrawable;

  private readonly quadTree: QuadTree = new QuadTree();

  private _selbounds?: AABB;
  private _clickPos?: vec2;
  private readonly _currentPos: vec2 = [0, 0];
  private readonly controlsRef: RefObject<HTMLDivElement> = React.createRef();

  constructor(container: SandboxContainer, name: string, readonly renderProgram: Program) {
    super(container, name, {});
    renderProgram.use();
    this.points = this.newMappedDrawable(DrawMode.POINTS);
    this.lines = this.newMappedDrawable(DrawMode.LINES);
    this.sellines = this.newMappedDrawable(DrawMode.LINES);
    this.selpoints = this.newMappedDrawable(DrawMode.POINTS);
  }

  get selbounds(): AABB | undefined {
    return this._selbounds;
  }

  onkeydown(e: KeyboardEvent): void {
    switch (e.key) {
      case 'r':
        this.addRandomPoints(50);
        break;
      case 'R':
        this.addRandomPoints(500);
        break;
    }
  }

  private addRandomPoints(count: number): void {
    const points: vec2[] = new Array(count);
    for (let i = 0; i < count; i++) points[i] = [Math.random() * 2 - 1, Math.random() * 2 - 1];
    this.insert(points);
  }

  onmousedown(e: MouseEvent): void {
    this._clickPos = this.clientToWorld(e);
    vec2.copy(this._currentPos, this._clickPos);
  }

  onmouseup(): void {
    if (this._clickPos) {
      if (!this.selbounds) this.insert([this._clickPos]);
      this._clickPos = undefined;
      this.updateSelection(undefined);
    }
  }

  onmousemove(e: MouseEvent): void {
    if (this._clickPos) {
      this.clientToWorld(e, this._currentPos);
      let bounds = this.selbounds;
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
        this.updateSelection(bounds);
      }
    }
  }

  render(): void {
    super.clear();
    this.points.draw();
    this.lines.draw();
    if (this._selbounds) {
      this.sellines.draw();
      this.selpoints.draw();
    }
  }

  private insert(points: vec2[]): void {
    points.forEach(p => this.quadTree.insert(p));
    this.updateBuffers();
  }

  updateSelection(sel?: AABB): void {
    if (sel) {
      this.collectSelLines(sel).update(this.sellines.buffer);
      this.collectPoints(sel, SELPOINT_COLOR).update(this.selpoints.buffer);
      this._selbounds = sel;
    } else {
      this._selbounds = undefined;
    }
    this.updateControls();
  }

  private updateBuffers(): void {
    this.collectPoints(this.quadTree.boundary, POINT_COLOR).update(this.points.buffer);
    this.collectLines().update(this.lines.buffer);
    this.updateControls();
  }

  get customControls(): JSX.Element {
    return <div ref={this.controlsRef}>{this.description}</div>;
  }

  private updateControls(): void {
    if (this.controlsRef.current) this.controlsRef.current.textContent = this.description;
  }

  private get description(): string {
    return `${this._selbounds ? this.selpoints.buffer.count : 0} / ${this.points.buffer.count}`;
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

  private newMappedDrawable(drawMode: DrawMode): MappedDrawable {
    const vertices = new VertexBuffer<QuadTreeAttributes>(this.gl, {
      a_position: { size: 2 },
      a_color: { size: 4 }
    });
    const drawable = new GLDrawable<QuadTreeAttributes>(
      this.gl,
      {
        buffer: vertices,
        locations: {
          a_position: 0,
          a_color: 1
        }
      },
      drawMode
    );
    return {
      drawable: drawable,
      buffer: vertices,
      draw: () => drawable.bind().draw(),
      delete: () => drawable.delete()
    };
  }
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

  update(glbuffer: VertexBuffer, usage: BufferUsage = BufferUsage.STATIC_DRAW): PointsBuffer {
    glbuffer.bind().setdata(this.array, usage, 0, this._count * POINT_FLOATS);
    return this;
  }
}

export function quadTreeTest(): SandboxFactory {
  return QuadTreeTestSandbox.create;
}
