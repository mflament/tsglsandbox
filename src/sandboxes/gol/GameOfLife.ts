import {
  FrameBuffer,
  QuadProgram,
  GLTexture2D,
  InternalFormat,
  TextureComponentType,
  TextureFormat,
  TextureMinFilter,
  TextureMagFilter,
  TextureWrappingMode,
  newQuadDrawable,
  IndexedDrawable,
  AbstractGLSandbox,
  SandboxContainer,
  SandboxFactory,
  quadProgram,
  control,
  LOGGER
} from 'gl';

const DATA_TEXTURE_FORMAT = {
  internalFormat: InternalFormat.R8,
  format: TextureFormat.RED,
  type: TextureComponentType.UNSIGNED_BYTE
};

class GOLParameters {
  @control({ pattern: 'B\\d+S\\d+' })
  rule = 'B3S23';
  @control({ min: 8, max: 2048, step: 1 })
  size = 512;
}

class RenderUniforms {
  data: WebGLUniformLocation | null = null;
}

class UpdateUniforms {
  data: WebGLUniformLocation | null = null;
  states_matrix: WebGLUniformLocation | null = null;
}

class GOLSandbox extends AbstractGLSandbox<GOLParameters> {
  static async create(container: SandboxContainer, name: string): Promise<GOLSandbox> {
    const renderProgram = await quadProgram(container.programLoader, {
      fspath: 'gol/gol-render.fs.glsl',
      uniformLocations: new RenderUniforms()
    });
    const updateProgram = await quadProgram(container.programLoader, {
      fspath: 'gol/gol-update.fs.glsl',
      uniformLocations: new UpdateUniforms()
    });
    return new GOLSandbox(container, name, new GOLParameters(), renderProgram, updateProgram);
  }

  private readonly quadBuffers: IndexedDrawable;
  private readonly frameBuffer: FrameBuffer;

  readonly displayName = 'Game of Life';

  private lastCellIndex = -1;
  private frontTexture: GLTexture2D;
  private backTexture: GLTexture2D;
  private data: Uint8Array = new Uint8Array();

  constructor(
    container: SandboxContainer,
    name: string,
    parameters: GOLParameters,
    readonly renderProgram: QuadProgram<RenderUniforms>,
    readonly updateProgram: QuadProgram<UpdateUniforms>
  ) {
    super(container, name, parameters);
    this.quadBuffers = newQuadDrawable(this.gl).bind();

    this.frontTexture = this.createTexture();
    this.backTexture = this.createTexture();
    this.frontTexture.activate(0);

    this.frameBuffer = new FrameBuffer(this.gl);

    this.renderProgram.use();
    this.gl.uniform1i(renderProgram.uniformLocations.data, 0);

    this.updateProgram.use();
    this.gl.uniform1i(updateProgram.uniformLocations.data, 0);
    this.updateRule();

    this.updateTexturesSize();
  }

  render(): void {
    super.clear();
    this.quadBuffers.draw();
  }

  update(): void {
    this.frameBuffer.bind().attach(this.backTexture);

    this.gl.viewport(0, 0, this.dataSize, this.dataSize);
    this.gl.clearColor(0, 0, 0, 1);
    this.gl.clear(WebGL2RenderingContext.COLOR_BUFFER_BIT);

    this.updateProgram.use();
    this.quadBuffers.draw();

    this.frameBuffer.detach().unbind();

    this.swapTexture();
    this.renderProgram.use();
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
  }

  onkeydown(e: KeyboardEvent): void {
    if (e.key === 'r') {
      this.randomizeData();
    } else if (e.key === 'x') {
      this.clearData();
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

  onparameterchange(): void {
    this.updateTexturesSize();
    this.updateRule();
  }

  private get dataSize(): number {
    return this.frontTexture.width;
  }

  private toggle(pos: { x: number; y: number }) {
    const index = pos.x + pos.y * this.dataSize;
    if (this.lastCellIndex !== index) {
      this.data[index] = this.data[index] ? 0 : 0xff;
      this.frontTexture.subdata({
        ...DATA_TEXTURE_FORMAT,
        ...pos,
        width: 1,
        height: 1,
        buffer: this.data,
        srcOffset: index
      });
      this.lastCellIndex = index;
    }
  }

  private get isDrawing(): boolean {
    return this.lastCellIndex >= 0;
  }

  private toGrid(e: MouseEvent): { x: number; y: number } {
    return {
      x: Math.floor((e.offsetX / this.dimension[0]) * this.dataSize),
      y: Math.floor((1 - e.offsetY / this.dimension[1]) * this.dataSize)
    };
  }

  private updateRule() {
    this.updateProgram.use();
    const stateMatrix = parseRule(this.parameters.rule);
    this.gl.uniform1uiv(this.updateProgram.uniformLocations.states_matrix, stateMatrix);
    this.renderProgram.use();
  }

  private updateTexturesSize(): boolean {
    const size = this.parameters.size;
    if (this.dataSize !== size) {
      this.backTexture.bind().data({
        ...DATA_TEXTURE_FORMAT,
        width: size,
        height: size
      });
      this.randomizeData(size);
      return true;
    }
    return false;
  }

  private randomizeData(size = this.dataSize, odds = 0.8): void {
    const length = size * size;
    if (this.data.length < length) this.data = new Uint8Array(length);
    for (let index = 0; index < length; index++) {
      this.data[index] = Math.random() >= odds ? 0xff : 0x0;
    }

    this.frontTexture.bind().data({
      ...DATA_TEXTURE_FORMAT,
      width: size,
      height: size,
      buffer: this.data
    });
  }

  private swapTexture() {
    const buf = this.frontTexture;
    this.frontTexture = this.backTexture;
    this.backTexture = buf;
    this.frontTexture.bind().activate(0);
  }

  private clearData() {
    this.data.fill(0);
    this.frontTexture.bind().data({
      ...DATA_TEXTURE_FORMAT,
      width: this.dataSize,
      height: this.dataSize,
      buffer: this.data
    });
  }

  private createTexture(): GLTexture2D {
    return new GLTexture2D(this.gl)
      .bind()
      .minFilter(TextureMinFilter.NEAREST)
      .magFilter(TextureMagFilter.NEAREST)
      .wrap(TextureWrappingMode.REPEAT)
      .unbind();
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
      else LOGGER.warn('Invalid neighbors count ' + n + ' in ' + rule);
    }
    const survive = match[2];
    for (let i = 0; i < survive.length; i++) {
      const n = parseInt(survive.charAt(i));
      if (n <= 8) res[9 + n] = 1;
      else LOGGER.warn('Invalid neighbors count ' + n + ' in ' + rule);
    }
  }
  return res;
}

export function gameofLife(): SandboxFactory<GOLParameters> {
  return GOLSandbox.create;
}
