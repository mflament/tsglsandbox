import { FrameBuffer } from '../gl/buffers/FrameBuffer';
import { Deletable } from '../gl/utils/GLUtils';
import { AbstractGLSandbox, newSandboxFactory } from '../gl/sandbox/AbstractGLSandbox';
import { SandboxContainer, SandboxFactory } from '../gl/sandbox/GLSandbox';
import { Program } from '../gl/shader/Program';
import { GLTexture2D } from '../gl/texture/GLTexture';
import {
  InternalFormat,
  TextureComponentType,
  TextureFormat,
  TextureMinFilter,
  TextureMagFilter,
  TextureWrappingMode
} from '../gl/texture/TextureEnums';

import { newQuadDrawable, QUAD_VS } from '../gl/drawable/QuadDrawable';
import { vec2 } from 'gl-matrix';
import { IndexedDrawable } from '../gl/drawable/GLDrawable';

const DATA_TEXTURE_FORMAT = {
  internalFormat: InternalFormat.R8,
  format: TextureFormat.RED,
  type: TextureComponentType.UNSIGNED_BYTE
};

interface GOLParameters {
  rule: string;
  width: number;
  height: number;
}

class RenderUnforms {
  data: WebGLUniformLocation | null = null;
}
class UpdateUnforms {
  data: WebGLUniformLocation | null = null;
  states_matrix: WebGLUniformLocation | null = null;
}

class GOLResources implements Deletable {
  static async create(container: SandboxContainer): Promise<GOLResources> {
    const renderProgram = await container.programLoader.load({
      vspath: QUAD_VS,
      fspath: 'gol/gol-render.fs.glsl',
      uniformLocations: new RenderUnforms()
    });
    const updateProgram = await container.programLoader.load({
      vspath: QUAD_VS,
      fspath: 'gol/gol-update.fs.glsl',
      uniformLocations: new UpdateUnforms()
    });
    const parameters = { rule: 'B3S23', width: 128, height: 0 };
    window.hashlocation.parseParams(parameters);
    return new GOLResources(container, renderProgram, updateProgram, parameters);
  }

  readonly quadBuffers: IndexedDrawable;
  readonly frameBuffer: FrameBuffer;
  readonly dataDimension: vec2 = [0, 0];
  frontTexture: GLTexture2D;
  backTexture: GLTexture2D;
  data: Uint8Array = new Uint8Array();

  constructor(
    readonly container: SandboxContainer,
    readonly renderProgram: Program<RenderUnforms>,
    readonly updateProgram: Program<UpdateUnforms>,
    readonly parameters: GOLParameters
  ) {
    this.quadBuffers = newQuadDrawable(container.gl);
    this.frontTexture = this.createTexture();
    this.backTexture = this.createTexture();
    this.frontTexture.bind().activate(0);
    this.frameBuffer = new FrameBuffer(container.gl);
    this.renderProgram.use();
    container.gl.uniform1i(renderProgram.uniformLocations.data, 0);

    this.updateProgram.use();
    container.gl.uniform1i(updateProgram.uniformLocations.data, 0);
    this.updateRule();

    this.updateTexturesSize();
  }

  updateRule() {
    this.updateProgram.use();
    const stateMatrix = parseRule(this.parameters.rule);
    this.container.gl.uniform1uiv(this.updateProgram.uniformLocations.states_matrix, stateMatrix);
    this.renderProgram.use();
  }

  updateTexturesSize(): boolean {
    const newDimension = this.parseDimmension();
    if (!vec2.equals(newDimension, this.dataDimension)) {
      vec2.copy(this.dataDimension, newDimension);
      this.data = new Uint8Array(this.dataDimension[0] * this.dataDimension[1]);
      this.backTexture.bind().data({
        ...DATA_TEXTURE_FORMAT,
        width: this.dataDimension[0],
        height: this.dataDimension[1]
      });
      this.randomizeData();
      return true;
    }
    return false;
  }

  randomizeData(odds = 0.8): void {
    for (let index = 0; index < this.data.length; index++) {
      this.data[index] = Math.random() >= odds ? 0xff : 0x0;
    }
    this.frontTexture.bind().data({
      ...DATA_TEXTURE_FORMAT,
      width: this.dataDimension[0],
      height: this.dataDimension[1],
      buffer: this.data
    });
  }

  swapTexture() {
    const buf = this.frontTexture;
    this.frontTexture = this.backTexture;
    this.backTexture = buf;
    this.frontTexture.bind().activate(0);
  }

  delete(): void {
    [
      this.quadBuffers,
      this.frontTexture,
      this.backTexture,
      this.frameBuffer,
      this.renderProgram,
      this.updateProgram
    ].forEach(d => d.delete());
  }

  toggle(index: number, pos: { x: number; y: number }) {
    this.data[index] = this.data[index] ? 0 : 0xff;
    this.frontTexture.subdata({
      ...DATA_TEXTURE_FORMAT,
      ...pos,
      width: 1,
      height: 1,
      buffer: this.data,
      srcOffset: index
    });
  }

  clearData() {
    this.data.fill(0);
    this.frontTexture.bind().data({
      ...DATA_TEXTURE_FORMAT,
      width: this.dataDimension[0],
      height: this.dataDimension[1],
      buffer: this.data
    });
  }

  private parseDimmension(): vec2 {
    this.parameters.width = Math.max(this.parameters.width, 3);
    const width = this.parameters.width;
    const height = this.parameters.height > 0 ? this.parameters.height : this.parameters.width;
    return [width, height];
  }

  private createTexture(): GLTexture2D {
    return new GLTexture2D(this.container.gl)
      .bind()
      .minFilter(TextureMinFilter.NEAREST)
      .magFilter(TextureMagFilter.NEAREST)
      .wrap(TextureWrappingMode.REPEAT)
      .unbind();
  }
}

export class GameOfLife extends AbstractGLSandbox<GOLResources, GOLParameters> {
  private lastCellIndex = -1;

  constructor(container: SandboxContainer, name: string, resources: GOLResources) {
    super(container, name, resources, resources.parameters);
    resources.quadBuffers.bind();
    this.resources.renderProgram.use();
  }

  render(): void {
    this.resources.quadBuffers.draw();
  }

  update(): void {
    this.resources.frameBuffer.bind().attach(this.resources.backTexture);

    this.gl.viewport(0, 0, this.dataWidth, this.dataHeight);
    this.gl.clearColor(0, 0, 0, 1);
    this.gl.clear(WebGL2RenderingContext.COLOR_BUFFER_BIT);

    this.resources.updateProgram.use();
    this.resources.quadBuffers.draw();

    this.resources.frameBuffer.detach().unbind();

    this.gl.viewport(0, 0, this.dimension[0], this.dimension[1]);
    this.resources.swapTexture();

    this.resources.renderProgram.use();
  }

  delete(): void {
    this.resources.delete();
    super.delete();
  }

  onkeydown(e: KeyboardEvent): void {
    if (e.key === 'r') {
      this.resources.randomizeData();
    } else if (e.key === 'x') {
      this.resources.clearData();
    } else if (e.key === 'n') {
      this.update();
    }
  }

  onmousedown(e: MouseEvent): void {
    if (e.button === 0) {
      this.toggle(this.toGrid(e));
    }
  }

  onmouseup(e: MouseEvent): void {
    if (e.button === 0) this.lastCellIndex = -1;
  }

  onmousemove(e: MouseEvent): void {
    if (this.isDrawing) {
      this.toggle(this.toGrid(e));
    }
  }

  onParametersChanged(): void {
    this.resources.updateTexturesSize();
    this.resources.updateRule();
  }

  onresize(dimension: vec2): vec2 {
    const ar = this.dataWidth / this.dataHeight;
    return [Math.min(dimension[1] * ar, dimension[0]), Math.min(dimension[0] / ar, dimension[1])];
  }

  private get dataWidth(): number {
    return this.resources.dataDimension[0];
  }

  private get dataHeight(): number {
    return this.resources.dataDimension[1];
  }

  private toggle(pos: { x: number; y: number }) {
    const index = pos.x + pos.y * this.dataWidth;
    if (this.lastCellIndex !== index) {
      this.resources.toggle(index, pos);
      this.lastCellIndex = index;
    }
  }

  private get isDrawing(): boolean {
    return this.lastCellIndex >= 0;
  }

  private toGrid(e: MouseEvent): { x: number; y: number } {
    return {
      x: Math.floor((e.offsetX / this.dimension[0]) * this.dataWidth),
      y: Math.floor((1 - e.offsetY / this.dimension[1]) * this.dataHeight)
    };
  }
}

function parseRule(rule: string): Uint32Array {
  const res = new Uint32Array(18);
  const match = rule.match(/B(\d+)S(\d+)/);
  if (match) {
    const born = match[1];
    for (let i = 0; i < born.length; i++) {
      const n = parseInt(born.charAt(i));
      if (n <= 8) res[n] = 1;
      else console.warn('Invalid neighbors count ' + n + ' in ' + rule);
    }
    const survive = match[2];
    for (let i = 0; i < survive.length; i++) {
      const n = parseInt(survive.charAt(i));
      if (n <= 8) res[9 + n] = 1;
      else console.warn('Invalid neighbors count ' + n + ' in ' + rule);
    }
  }
  return res;
}

export function gameofLife(): SandboxFactory<GOLParameters> {
  return newSandboxFactory(
    GOLResources.create,
    (container, name, resources) => new GameOfLife(container, name, resources)
  );
}
