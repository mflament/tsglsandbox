import {
  AbstractGLSandbox,
  control,
  FrameBuffer,
  GLTexture2D,
  IndexedDrawable,
  InternalFormat,
  LOGGER,
  newQuadDrawable,
  newQuadProgram,
  PixelStoreParameter,
  QuadProgram,
  SandboxContainer,
  SandboxFactory,
  TextureMagFilter,
  TextureMinFilter,
  TextureWrappingMode
} from 'gl';

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
  static async create(container: SandboxContainer, name: string, parameters?: GOLParameters): Promise<GOLSandbox> {
    const renderProgram = await newQuadProgram(container.programLoader, {
      fspath: 'sandboxes/gol/gol-render.fs.glsl',
      uniformLocations: new RenderUniforms()
    });
    const updateProgram = await newQuadProgram(container.programLoader, {
      fspath: 'sandboxes/gol/gol-update.fs.glsl',
      uniformLocations: new UpdateUniforms()
    });
    return new GOLSandbox(container, name, parameters, renderProgram, updateProgram);
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
    parameters: GOLParameters | undefined,
    readonly renderProgram: QuadProgram<RenderUniforms>,
    readonly updateProgram: QuadProgram<UpdateUniforms>
  ) {
    super(container, name, parameters);
    this.quadBuffers = newQuadDrawable(this.gl).bind();

    this.frontTexture = this.createTexture();
    this.backTexture = this.createTexture();
    this.frontTexture.bind(0);

    this.frameBuffer = new FrameBuffer(this.gl);

    this.renderProgram.use();
    this.gl.uniform1i(renderProgram.uniformLocations.data, 0);

    this.updateProgram.use();
    this.gl.uniform1i(updateProgram.uniformLocations.data, 0);
    this.updateRule();

    this.updateTexturesSize();
  }

  createDefaultParameters(): GOLParameters {
    return new GOLParameters();
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
        ...pos,
        width: 1,
        height: 1,
        srcData: this.data,
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
      x: Math.floor((e.offsetX / this.canvas.width) * this.dataSize),
      y: Math.floor((1 - e.offsetY / this.canvas.height) * this.dataSize)
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
        width: size,
        height: size
      });
      this.randomizeData(size);
      return true;
    }
    return false;
  }

  private randomizeData(size = this.dataSize, odds = 0.8): void {
    const pixels = size * size;
    if (this.data.length < pixels) this.data = new Uint8Array(pixels);
    for (let index = 0; index < pixels; index++) {
      this.data[index] = Math.random() >= odds ? 0xff : 0x0;
    }

    this.frontTexture.bind().data(
      {
        width: size,
        height: size,
        srcData: this.data
      },
      [PixelStoreParameter.UNPACK_ALIGNMENT, 1]
    );
  }

  private swapTexture() {
    const buf = this.frontTexture;
    this.frontTexture = this.backTexture;
    this.backTexture = buf;
    this.frontTexture.bind(0);
  }

  private clearData() {
    this.data.fill(0);
    this.frontTexture.bind().data({
      width: this.dataSize,
      height: this.dataSize,
      srcData: this.data
    });
  }

  private createTexture(): GLTexture2D {
    return new GLTexture2D(this.gl, InternalFormat.R8)
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

export function gameOfLife(): SandboxFactory<GOLParameters> {
  return GOLSandbox.create;
}
