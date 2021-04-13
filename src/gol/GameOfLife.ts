import { FrameBuffer } from '../gl/buffers/FrameBuffer';
import { Deletable } from '../gl/gl-utils';
import { AbstractGLSandbox } from '../gl/sandbox/AbstractGLSandbox';
import { Dimension, SandboxContainer } from '../gl/sandbox/GLSandbox';
import { QuadBuffers } from '../gl/sandbox/QuadBuffers';
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

const DATA_TEXTURE_FORMAT = {
  internalFormat: InternalFormat.R8,
  format: TextureFormat.RED,
  type: TextureComponentType.UNSIGNED_BYTE
};

interface Resources extends Deletable {
  renderProgram: Program;
  updateProgram: Program;
  quadBuffers: QuadBuffers;
  textures: GLTexture2D[];
  frameBuffer: FrameBuffer;
  data: Uint8Array;
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

interface GolParameters {
  rule: string;
  width: number;
  height: number;
}

function createDataDimension(params: GolParameters): Dimension {
  return { width: params.width, height: params.height <= 0 ? params.width : params.height };
}

interface RenderUniforms {
  data: WebGLUniformLocation | null;
}

interface UpdateUniforms {
  data: WebGLUniformLocation | null;
  states_matrix: WebGLUniformLocation | null;
}

export class GameOfLife extends AbstractGLSandbox<GolParameters> {
  private dataDimension: Dimension = { width: 0, height: 0 };

  private _resources?: Resources;
  private renderUniforms: RenderUniforms = { data: null };
  private updateUniforms: UpdateUniforms = { data: null, states_matrix: null };
  private dataIndex = 0;
  private running = false;
  private lastCellIndex = -1;

  constructor() {
    super('gol', { rule: 'B3S23', width: 16, height: -1 });
  }

  async setup(container: SandboxContainer): Promise<void> {
    super.setup(container);
    const programs = await Promise.all([
      this.loadProgram({
        vsSource: 'shaders/quad.vs.glsl',
        fsSource: 'shaders/gol/gol-render.fs.glsl',
        uniformLocations: this.renderUniforms
      }),
      this.loadProgram({
        vsSource: 'shaders/quad.vs.glsl',
        fsSource: 'shaders/gol/gol-update.fs.glsl',
        uniformLocations: this.updateUniforms
      })
    ]);

    this.dataDimension = createDataDimension(this.parameters);
    this.dataIndex = 0;

    const resources: Resources = {
      renderProgram: programs[0],
      updateProgram: programs[1],
      data: this.createData(),
      textures: [this.createTexture(), this.createTexture()],
      frameBuffer: new FrameBuffer(this.gl),
      quadBuffers: new QuadBuffers(this.gl),
      delete() {
        this.renderProgram.delete();
        this.updateProgram.delete();
        this.textures.forEach(t => t.delete());
        this.quadBuffers.delete();
        this.frameBuffer.delete();
      }
    };

    this._resources = resources;
    resources.renderProgram.use();
    this.gl.uniform1i(this.renderUniforms.data, 0);

    resources.updateProgram.use();
    this.gl.uniform1i(this.updateUniforms.data, 0);

    this.updateRule();

    this.randomizeData();
    this.updateDataTexture();
    this.allocateTargetTexture();
  }

  onkeydown(e: KeyboardEvent) {
    if (!this._resources) return;
    if (e.key === ' ') {
      this.running = !this.running;
    } else if (e.key === 'r') {
      this.randomizeData();
      this.updateDataTexture();
    } else if (e.key === 'x') {
      this.clearData();
    } else if (e.key === 'n') {
      this.update(this._resources);
    }
  }

  onmousedown(e: MouseEvent) {
    if (e.button === 0) {
      this.toggle(this.togrid(e));
    }
  }

  onmouseup(e: MouseEvent) {
    if (e.button === 0) this.lastCellIndex = -1;
  }

  onmousemove(e: MouseEvent) {
    if (this.isDrawing) {
      this.toggle(this.togrid(e));
    }
  }

  onParametersChanged() {
    this.dataDimension = createDataDimension(this.parameters);
    if (this._resources) {
      this._resources.data = this.createData();
      this.randomizeData();
      this.updateDataTexture();
      this.allocateTargetTexture();
      this.container.dimension = this.onresize(this.container.clientArea);
      this.updateRule();
    }
  }

  onresize(dimension: Dimension): Dimension {
    const ar = this.dataDimension.width / this.dataDimension.height;
    return {
      width: Math.min(dimension.height * ar, dimension.width),
      height: Math.min(dimension.width / ar, dimension.height)
    };
  }

  delete(): void {
    if (this._resources) {
      this._resources.delete();
      this._resources = undefined;
    }
  }

  render(_elapsedSeconds: number): void {
    if (this._resources) {
      if (this.running) {
        this.update(this._resources);
      }
      this.draw(this._resources);
    }
  }

  private get isDrawing(): boolean {
    return this.lastCellIndex >= 0;
  }

  private togrid(e: MouseEvent): { x: number; y: number } {
    return {
      x: Math.floor((e.offsetX / this.dimension.width) * this.dataDimension.width),
      y: Math.floor((1 - e.offsetY / this.dimension.height) * this.dataDimension.height)
    };
  }

  private toggle(datapos: { x: number; y: number }) {
    const index = datapos.x + datapos.y * this.dataDimension.width;
    if (this.lastCellIndex === index) return;
    this.lastCellIndex = index;
    this.data[index] = this.data[index] ? 0 : 0xff;
    this.dataTexture
      .bind()
      .subdata({
        x: datapos.x,
        y: datapos.y,
        width: 1,
        height: 1,
        buffer: this.data,
        srcOffset: index,
        ...DATA_TEXTURE_FORMAT
      })
      .unbind();
  }

  private updateRule() {
    const stateMatrix = parseRule(this.parameters.rule);
    this.resources.updateProgram.use();
    this.gl.uniform1uiv(this.updateUniforms.states_matrix, stateMatrix);
  }

  private get dataTexture(): GLTexture2D {
    return this.resources.textures[this.dataIndex];
  }

  private get targetTexture(): GLTexture2D {
    return this.resources.textures[1 - this.dataIndex];
  }

  private get data(): Uint8Array {
    return this.resources.data;
  }

  private get resources(): Resources {
    if (!this._resources) throw new Error('Not initialized');
    return this._resources;
  }

  private createTexture(): GLTexture2D {
    return new GLTexture2D(this.gl)
      .bind()
      .minFilter(TextureMinFilter.NEAREST)
      .magFilter(TextureMagFilter.NEAREST)
      .wrap(TextureWrappingMode.CLAMP_TO_EDGE)
      .unbind();
  }

  private allocateTargetTexture() {
    this.gl.pixelStorei(WebGL2RenderingContext.UNPACK_ALIGNMENT, 1);
    this.targetTexture
      .bind()
      .data({ ...this.dataDimension, ...DATA_TEXTURE_FORMAT })
      .unbind();
  }

  private createData(): Uint8Array {
    const pixels = this.dataDimension.width * this.dataDimension.height;
    return new Uint8Array(pixels);
  }

  private randomizeData() {
    this.data.fill(0);
    for (let index = 0; index < this.data.length; index++) {
      this.data[index] = Math.random() > 0.8 ? 0xff : 0x0;
    }
  }

  private updateDataTexture() {
    this.gl.pixelStorei(WebGL2RenderingContext.UNPACK_ALIGNMENT, 1);
    this.dataTexture
      .bind()
      .data({ ...this.dataDimension, ...DATA_TEXTURE_FORMAT, buffer: this.data })
      .unbind();
  }

  private clearData() {
    const dim = this.dataDimension;
    const pixels = dim.width * dim.height;
    const buffer = new Uint8Array(pixels);
    this.dataTexture.bind().data({ width: dim.width, height: dim.height, buffer: buffer, ...DATA_TEXTURE_FORMAT });
  }

  private update(res: Resources) {
    res.frameBuffer.bind().attach(this.targetTexture);

    this.gl.viewport(0, 0, this.dataDimension.width, this.dataDimension.height);
    this.gl.clearColor(0, 0, 0, 1);
    this.gl.clear(WebGL2RenderingContext.COLOR_BUFFER_BIT | WebGL2RenderingContext.DEPTH_BUFFER_BIT);

    const data = this.dataTexture;
    data.bind().activate(0);
    res.updateProgram.use();
    res.quadBuffers.draw();

    res.frameBuffer.detach().unbind();
    data.unbind();

    this.gl.viewport(0, 0, this.dimension.width, this.dimension.height);
    this.dataIndex = this.dataIndex === 0 ? 1 : 0;
  }

  private draw(res: Resources) {
    this.dataTexture.bind().activate(0);
    res.renderProgram.use();
    res.quadBuffers.draw();
  }
}
