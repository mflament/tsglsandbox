import { Deletable } from '../gl/utils/GLUtils';
import { AbstractGLSandbox, sandboxFactory } from '../gl/sandbox/AbstractGLSandbox';
import { SandboxContainer, SandboxFactory } from '../gl/sandbox/GLSandbox';
import { Program } from '../gl/shader/Program';

// @ts-ignore
import quadVertexShader from 'assets/shaders/quad.vs.glsl';
// @ts-ignore
import quadTreeFragmentShader from 'assets/shaders/test/quadtree.fs.glsl';
import { ArrayBufferDrawable, MappedBuffer } from '../gl/buffers/GLDrawable';
import { DrawMode } from '../gl/buffers/BufferEnums';
import { vec2 } from 'gl-matrix';
import { QuadTreeNode as QuadTree } from '../utils/QuadTree';

type MappedDrawable = { drawable: ArrayBufferDrawable; buffer: MappedBuffer };

class QuadTreeTestResources implements Deletable {
  readonly lines: MappedDrawable;
  readonly points: MappedDrawable;

  private quadTree: QuadTree = new QuadTree();

  constructor(readonly container: SandboxContainer, readonly renderProgram: Program) {
    renderProgram.use();
    this.points = this.newMappedDrawable(DrawMode.POINTS);
    this.lines = this.newMappedDrawable(DrawMode.LINES);
  }

  insert(point: vec2): boolean {
    if (this.quadTree.insert(point)) {
      this.updateBuffers();
      return true;
    }
    return false;
  }

  draw(): void {
    this.points.drawable.bind().draw();
    this.lines.drawable.bind().draw();
  }

  private updateBuffers(): void {
    const points = this.quadTree.query();
    let array = new Float32Array(points.length * 2);
    points.forEach((p, i) => array.set(p, i * 2));
    this.points.buffer.bind().setdata(array);

    const lines: vec2[] = [];
    this.collectLines(this.quadTree, lines);
    array = new Float32Array(lines.length * 2);
    lines.forEach((p, i) => array.set(p, i * 2));
    this.lines.buffer.bind().setdata(array);
  }

  private collectLines(quadTree: QuadTree, lines: vec2[]): void {
    if (quadTree.children) {
      lines.push([quadTree.boundary.xmin, quadTree.boundary.center[1]]);
      lines.push([quadTree.boundary.xmax, quadTree.boundary.center[1]]);

      lines.push([quadTree.boundary.center[0], quadTree.boundary.ymin]);
      lines.push([quadTree.boundary.center[0], quadTree.boundary.ymax]);
      quadTree.children.forEach(child => this.collectLines(child, lines));
    }
  }

  private newMappedDrawable(drawMode: DrawMode): MappedDrawable {
    const drawable = new ArrayBufferDrawable(this.container.gl, drawMode);
    const buffer = drawable.mapPositions([{ location: 0, size: 2 }]);
    return { drawable: drawable, buffer: buffer };
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
    vsSource: quadVertexShader,
    fsSource: quadTreeFragmentShader
  });
  return new QuadTreeTestResources(container, program);
}

class QuadTreeTestSandbox extends AbstractGLSandbox<QuadTreeTestResources, never> {
  constructor(container: SandboxContainer, name: string, resources: QuadTreeTestResources) {
    super(container, name, resources, {} as never);
  }

  onmouseup(e: MouseEvent): void {
    const dx = (e.offsetX / this.dimension.width) * 2 - 1;
    const dy = (1 - e.offsetY / this.dimension.height) * 2 - 1;
    this.resources.insert([dx, dy]);
  }

  delete(): void {
    this.resources.delete();
    super.delete();
  }

  render(): void {
    const resources = this.resources;
    resources.draw();
  }

  update(time: number) {
    this.gl.uniform1f(this.resources.renderProgram.uniformLocations.seconds, time / 1000);
  }
}

export function quadTreeTest(): SandboxFactory {
  return sandboxFactory(
    loadResources,
    (container, name, resources) => new QuadTreeTestSandbox(container, name, resources)
  );
}
