import { FrameBuffer } from '../gl/buffers/FrameBuffer';
import { Deletable } from '../gl/GLUtils';
import { AbstractGLSandbox, sandboxFactory } from '../gl/sandbox/AbstractGLSandbox';
import { Dimension, SandboxContainer, SandboxFactory } from '../gl/sandbox/GLSandbox';
import { QuadBuffers } from '../gl/buffers/QuadBuffers';
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

// @ts-ignore
import quadVertexShader from 'assets/shaders/quad.vs.glsl';
// @ts-ignore
import golRenderShader from 'assets/shaders/gol/gol-render.fs.glsl';
// @ts-ignore
import golUpdateShader from 'assets/shaders/gol/gol-update.fs.glsl';

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

class GOLResources implements Deletable {
  readonly quadBuffers: QuadBuffers;
  readonly textures: GLTexture2D[];
  readonly frameBuffer: FrameBuffer;
  data: Uint8Array;
  dataDimension: Dimension = { width: 0, height: 0 };
  dataIndex = 0;

  constructor(
    readonly container: SandboxContainer,
    readonly renderProgram: Program<{
      data: WebGLUniformLocation | null;
    }>,
    readonly updateProgram: Program<{
      data: WebGLUniformLocation | null;
      states_matrix: WebGLUniformLocation | null;
    }>,
    readonly parameters: GOLParameters
  ) {
    this.quadBuffers = new QuadBuffers(container.gl);
    this.textures = [this.createTexture(), this.createTexture()];
    this.frameBuffer = new FrameBuffer(container.gl);
    this.data = new Uint8Array();
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
  }

  updateTexturesSize(): boolean {
    const newDimension = this.parseDimmension();
    if (newDimension.width !== this.dataDimension.width || newDimension.height != this.dataDimension.height) {
      this.dataDimension = newDimension;
      this.updateTexture.bind().data({ ...DATA_TEXTURE_FORMAT, ...newDimension });
      this.data = new Uint8Array(newDimension.width * newDimension.height);
      this.randomizeData();
      return true;
    }
    return false;
  }

  randomizeData(odds = 0.8): void {
    this.data.fill(0);
    for (let index = 0; index < this.data.length; index++) {
      this.data[index] = Math.random() >= odds ? 0xff : 0x0;
    }
    this.dataTexture.bind().data({ ...DATA_TEXTURE_FORMAT, ...this.dataDimension, buffer: this.data });
  }

  swapTexture() {
    this.dataIndex = 1 - this.dataIndex;
    this.dataTexture.bind();
  }

  delete(): void {
    this.quadBuffers.unbind().delete();
    this.textures.forEach(t => t.unbind().delete());
    this.frameBuffer.delete();
    this.container.gl.useProgram(null);
    this.renderProgram.delete();
    this.updateProgram.delete();
  }

  toggle(index: number, pos: { x: number; y: number }) {
    this.data[index] = this.data[index] ? 0 : 0xff;
    this.dataTexture.subdata({
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
    this.dataTexture.bind().data({
      ...DATA_TEXTURE_FORMAT,
      ...this.dataDimension,
      buffer: this.data
    });
  }

  get dataTexture(): GLTexture2D {
    return this.textures[this.dataIndex];
  }

  get updateTexture(): GLTexture2D {
    return this.textures[1 - this.dataIndex];
  }

  private parseDimmension(): Dimension {
    this.parameters.width = Math.max(this.parameters.width, 3);
    const width = this.parameters.width;
    const height = this.parameters.height > 0 ? this.parameters.height : this.parameters.width;
    return { width: width, height: height };
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

async function loadResources(container: SandboxContainer): Promise<GOLResources> {
  const programs = await Promise.all([
    container.loadProgram({
      vsSource: quadVertexShader,
      fsSource: golRenderShader,
      uniformLocations: { data: null }
    }),
    container.loadProgram({
      vsSource: quadVertexShader,
      fsSource: golUpdateShader,
      uniformLocations: { data: null, states_matrix: null }
    })
  ]);
  const parameters = { rule: 'B3S23', width: 512, height: 0 };
  window.hashlocation.parseParams(parameters);
  return new GOLResources(container, programs[0], programs[1], parameters);
}

export class GameOfLife extends AbstractGLSandbox<GOLResources, GOLParameters> {
  private lastCellIndex = -1;

  constructor(container: SandboxContainer, name: string, resources: GOLResources) {
    super(container, name, resources, resources.parameters);
    resources.quadBuffers.bind();
    resources.dataTexture.bind().activate(0);
  }

  render(): void {
    this.resources.renderProgram.use();
    this.resources.quadBuffers.draw();
  }

  update(): void {
    this.resources.frameBuffer.bind().attach(this.resources.updateTexture);

    this.gl.viewport(0, 0, this.dataWidth, this.dataHeight);
    this.gl.clearColor(0, 0, 0, 1);
    this.gl.clear(WebGL2RenderingContext.COLOR_BUFFER_BIT);

    this.resources.updateProgram.use();
    this.resources.quadBuffers.draw();

    this.resources.frameBuffer.detach().unbind();

    this.gl.viewport(0, 0, this.dimension.width, this.dimension.height);
    this.resources.swapTexture();
  }

  delete(): void {
    super.delete();
    this.resources.dataTexture.unbind();
    this.gl.useProgram(null);
    this.resources.delete();
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

  onresize(dimension: Dimension): Dimension {
    const ar = this.dataWidth / this.dataHeight;
    return {
      width: Math.min(dimension.height * ar, dimension.width),
      height: Math.min(dimension.width / ar, dimension.height)
    };
  }

  private get dataWidth(): number {
    return this.resources.dataDimension.width;
  }

  private get dataHeight(): number {
    return this.resources.dataDimension.height;
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
      x: Math.floor((e.offsetX / this.dimension.width) * this.dataWidth),
      y: Math.floor((1 - e.offsetY / this.dimension.height) * this.dataHeight)
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
  return sandboxFactory(loadResources, (container, name, resources) => new GameOfLife(container, name, resources));
}
