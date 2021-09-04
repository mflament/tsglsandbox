import {
  AbstractDeletable,
  FrameBuffer,
  GLTexture2D,
  IndexedDrawable,
  InternalFormat,
  newQuadDrawable,
  Program,
  ProgramLoader,
  TextureMagFilter,
  TextureMinFilter,
  TextureWrappingMode
} from "gl";
import {PlanetGeneratorSettings} from "./PlanetGeneratorSettings";
import {PlanetGeneratorSupport} from "./PlanetGeneratorSupport";


class GenerateProgramUniforms {
  resolution: WebGLUniformLocation | null = null;
  textureSize: WebGLUniformLocation | null = null;
}

class GeneratePositionUniforms extends GenerateProgramUniforms {

}

interface GeneratorPrograms {
  positions: Program<GeneratePositionUniforms>;
  index: Program<GenerateProgramUniforms>;
}

export class ShaderPlanetGenerator {

  static async load(gl: WebGL2RenderingContext, programLoader: ProgramLoader): Promise<ShaderPlanetGenerator> {
    const positions = await programLoader.load({
      path: 'planetgenerator/generate-position.glsl',
      uniformLocations: new GeneratePositionUniforms()
    });
    const index = await programLoader.load({
      path: 'planetgenerator/generate-index.glsl',
      uniformLocations: new GenerateProgramUniforms()
    });
    return new ShaderPlanetGenerator(gl, {positions: positions, index: index});
  }

  private indexTexture?: DataTexture;
  private readonly textureUpdater: DataTextureUpdater;

  // private positionTexture?: DataTexture;

  constructor(readonly gl: WebGL2RenderingContext, readonly programs: GeneratorPrograms) {
    this.textureUpdater = new DataTextureUpdater(gl);
  }

  generate(settings: PlanetGeneratorSettings): void {
    const indexCount = PlanetGeneratorSupport.indexCount(settings);
    if (!this.indexTexture || this.indexTexture.width < indexCount) {
      this.indexTexture?.delete();
      this.indexTexture = new DataTexture(this.gl, 1, 'uint', indexCount);
    }

    if (this.indexTexture.count !== indexCount) {
      this.indexTexture.count = indexCount;
      this.computeIndex(settings, this.indexTexture);
    }
  }

  private computeIndex(settings: PlanetGeneratorSettings, indexTexture: DataTexture): void {
    this.programs.index.use();
    this.gl.uniform1ui(this.programs.index.uniformLocations.resolution, settings.resolution);
    this.gl.uniform1ui(this.programs.index.uniformLocations.textureSize, indexTexture.width);
    this.textureUpdater.compute([], [indexTexture]);
  }
}

class DataTextureUpdater extends AbstractDeletable {
  private readonly drawable: IndexedDrawable;
  private readonly frameBuffer: FrameBuffer;

  constructor(readonly gl: WebGL2RenderingContext) {
    super();
    this.drawable = newQuadDrawable(gl);
    this.frameBuffer = new FrameBuffer(gl);
  }

  compute(inputs: DataTexture[], outputs: DataTexture[]): void {
    this.drawable.bind();
    inputs.forEach((input, index) => input.activate(index).bind());
    this.frameBuffer.bind().attach(outputs);

    this.gl.viewport(0, 0, outputs[0].width, outputs[0].height);
    // this.gl.clearColor(0, 0, 0, 1);
    // this.gl.clear(WebGL2RenderingContext.COLOR_BUFFER_BIT);

    this.drawable.draw();

    const indexTexture = outputs[0];
    const index = new Uint32Array(indexTexture.width * indexTexture.height);
    this.gl.readBuffer(WebGL2RenderingContext.COLOR_ATTACHMENT0);
    indexTexture.read(index);
    console.log(index);

    this.frameBuffer.detach().unbind();
    inputs.forEach((input, index) => input.activate(index).unbind());
  }

  delete(): void {
    this.drawable.delete();
    this.frameBuffer.delete();
  }
}

type ComponentType = 'int' | 'uint' | 'float';
type ComponentCount = 1 | 2 | 3 | 4;

class DataTexture extends GLTexture2D {
  private static _maxSize?: number;

  private static maxSize(gl: WebGL2RenderingContext): number {
    if (typeof DataTexture._maxSize === 'undefined')
      DataTexture._maxSize = gl.getParameter(WebGL2RenderingContext.MAX_TEXTURE_SIZE);
    if (typeof DataTexture._maxSize === 'undefined')
      throw new Error("Unable to get MAX_TEXTURE_SIZE parameter");
    return DataTexture._maxSize;
  }

  count = 0;

  constructor(gl: WebGL2RenderingContext, readonly componentCount: ComponentCount, componentType: ComponentType, capacity: number) {
    super(gl)
    const maxSize = DataTexture.maxSize(gl);
    const size = Math.ceil(Math.sqrt(capacity));
    if (size > maxSize)
      throw new Error("Size " + size + " overflow " + maxSize);
    this.bind()
      .wrap(TextureWrappingMode.CLAMP_TO_EDGE)
      .minFilter(TextureMinFilter.NEAREST)
      .magFilter(TextureMagFilter.NEAREST)
      .data({
        internalFormat: textureInternalFormat(componentCount, componentType),
        width: size,
        height: size
      });
  }

  read(target: Uint8Array | Int32Array | Uint32Array | Float32Array): void {
    this.activate(0).bind();
    this.gl.readPixels(0, 0, this.width, this.height, this.formats.format, this.formats.componentType, target);
  }
}

function textureInternalFormat(componentCount: ComponentCount, compnentType: ComponentType): InternalFormat {
  switch (componentCount) {
    case 1:
      return rInternalFormat(compnentType);
    case 2:
      return rgInternalFormat(compnentType);
    case 3:
      return rgbInternalFormat(compnentType);
    case 4:
      return rgbaInternalFormat(compnentType);
  }
}

function rInternalFormat(componentType: ComponentType): InternalFormat {
  switch (componentType) {
    case 'int':
      return InternalFormat.R32I;
    case 'uint':
      return InternalFormat.R32UI;
    case 'float':
      return InternalFormat.R32F;
  }
}

function rgInternalFormat(componentType: ComponentType): InternalFormat {
  switch (componentType) {
    case 'int':
      return InternalFormat.RG32I;
    case 'uint':
      return InternalFormat.RG32UI;
    case 'float':
      return InternalFormat.RG32F;
  }
}

function rgbInternalFormat(componentType: ComponentType): InternalFormat {
  switch (componentType) {
    case 'int':
      return InternalFormat.RGB32I;
    case 'uint':
      return InternalFormat.RGB32UI;
    case 'float':
      return InternalFormat.RGB32F;
  }
}

function rgbaInternalFormat(componentType: ComponentType): InternalFormat {
  switch (componentType) {
    case 'int':
      return InternalFormat.RGBA32I;
    case 'uint':
      return InternalFormat.RGBA32UI;
    case 'float':
      return InternalFormat.RGBA32F;
  }
}
