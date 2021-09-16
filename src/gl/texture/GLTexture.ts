import { AbstractDeletable, Bindable, checkNull, Deletable } from '../GLUtils';
import {
  InternalFormat,
  TextureComponentType,
  TextureFormat,
  TextureMagFilter,
  TextureMinFilter,
  TextureParameter,
  TextureWrappingMode
} from './TextureEnums';
import { getFormatConfiguration, TextureArrayBuffer, TextureFormatConfiguration } from './TextureFormatConfiguration';
import { Partial } from 'rollup-plugin-typescript2/dist/partial';

const TARGET = WebGL2RenderingContext.TEXTURE_2D;

export class GLTexture2D extends AbstractDeletable implements Partial<Bindable>, Deletable {
  private static _activeUnit = 0;

  static setActiveUnit(gl: WebGL2RenderingContext, unit: number): void {
    if (GLTexture2D._activeUnit !== unit) {
      gl.activeTexture(WebGL2RenderingContext.TEXTURE0 + unit);
      GLTexture2D._activeUnit = unit;
    }
  }

  readonly gltexture: WebGLTexture;

  private readonly formatConfig: TextureFormatConfiguration;

  private _width = 0;
  private _height = 0;
  private _boundTo?: number;

  constructor(readonly gl: WebGL2RenderingContext, internalFormat: InternalFormat = InternalFormat.RGBA) {
    super();
    this.formatConfig = getFormatConfiguration(internalFormat);
    this.gltexture = checkNull(() => gl.createTexture());
  }

  get internalFormat(): InternalFormat {
    return this.formatConfig.internalFormat;
  }

  get format(): TextureFormat {
    return this.formatConfig.format;
  }

  get width(): number {
    return this._width;
  }

  get height(): number {
    return this._height;
  }

  get boundTo(): number | undefined {
    return this._boundTo;
  }

  bind(): GLTexture2D {
    this.gl.bindTexture(TARGET, this.gltexture);
    this._boundTo = GLTexture2D._activeUnit;
    return this;
  }

  unbind(): GLTexture2D {
    this.gl.bindTexture(TARGET, null);
    this._boundTo = undefined;
    return this;
  }

  activate(unit: number): GLTexture2D {
    GLTexture2D.setActiveUnit(this.gl, unit);
    return this;
  }

  delete(): GLTexture2D {
    this.gl.deleteTexture(this.gltexture);
    super.delete();
    return this;
  }

  async load(uri: string, type?: TextureComponentType): Promise<GLTexture2D> {
    type = this.defaultComponentType(type);
    const image = await loadImage(uri);
    this.bind().data({
      level: 0,
      type: this.defaultComponentType(type),
      width: image.width,
      height: image.height,
      source: image
    });
    this.generateMimap();
    return this;
  }

  freeze(width: number, height: number, levels = 1): GLTexture2D {
    this.gl.texStorage2D(TARGET, levels, this.formatConfig.internalFormat, width, height);
    this._width = width;
    this._height = height;
    return this;
  }

  data(param: BufferTextureData | UnpackBufferTextureData | ImageTextureData): GLTexture2D {
    const args = this.parseData(param);
    this.gl.texImage2D(
      TARGET,
      param.level || 0,
      this.internalFormat,
      this._width,
      this._height,
      0,
      this.format,
      this.checkType(param.type),
      // @ts-ignore
      ...args
    );
    return this;
  }

  subdata(param: (BufferTextureData | UnpackBufferTextureData | ImageTextureData) & TextureOffset): GLTexture2D {
    const args = this.parseData(param);
    this.gl.texSubImage2D(
      TARGET,
      param.level || 0,
      param.x || 0,
      param.y || 0,
      this._width,
      this._height,
      this.format,
      this.checkType(param.type),
      // @ts-ignore
      ...args
    );
    return this;
  }

  private parseData(param: BufferTextureData | UnpackBufferTextureData | ImageTextureData): any[] {
    if (isBufferTextureData(param)) {
      this._width = param.width;
      this._height = param.height;
      return [param.srcData, param.srcOffset];
    } else if (isImageTextureData(param)) {
      this._width = param.width === undefined ? param.source.width : param.width;
      this._height = param.height === undefined ? param.source.height : param.height;
      return [param.source];
    } else {
      this._width = param.width;
      this._height = param.height;
      return [param.offset];
    }
  }

  generateMimap(): GLTexture2D {
    this.gl.generateMipmap(TARGET);
    return this;
  }

  minFilter(f: TextureMinFilter): GLTexture2D {
    this.gl.texParameteri(TARGET, TextureParameter.MIN_FILTER, f);
    return this;
  }

  magFilter(f: TextureMagFilter): GLTexture2D {
    this.gl.texParameteri(TARGET, TextureParameter.MAG_FILTER, f);
    return this;
  }

  wrap(s: TextureWrappingMode, t = s): GLTexture2D {
    this.gl.texParameteri(TARGET, TextureParameter.WRAP_S, s);
    this.gl.texParameteri(TARGET, TextureParameter.WRAP_T, t);
    return this;
  }

  private defaultComponentType(type?: TextureComponentType): TextureComponentType {
    if (type !== undefined) return type;
    return this.formatConfig.types[0];
  }

  private checkType(type?: TextureComponentType): TextureComponentType {
    if (type === undefined) return this.formatConfig.types[0];
    if (this.formatConfig.types.indexOf(type) < 0)
      throw new Error('Invalid type ' + TextureComponentType[type] + ' for config ' + this.formatConfig);
    return type;
  }
}

export interface TextureData {
  level?: number;
  type?: TextureComponentType;
  width: number;
  height: number;
}

export interface TextureOffset {
  x?: number;
  y?: number;
}

export interface BufferTextureData extends TextureData {
  srcData: TextureArrayBuffer | null;
  srcOffset?: number;
}

export interface UnpackBufferTextureData extends TextureData {
  offset?: number;
}

export interface ImageTextureData extends TextureData {
  source: TexImageSource;
}

function isBufferTextureData(param: TextureData): param is BufferTextureData {
  const bd = param as Partial<BufferTextureData>;
  return bd.srcData !== undefined;
}

function isImageTextureData(param: TextureData): param is ImageTextureData {
  const id = param as Partial<ImageTextureData>;
  return typeof id.source !== undefined;
}

function loadImage(uri: string): Promise<HTMLImageElement> {
  return new Promise((resolve, _reject) => {
    const image = new Image();
    image.src = uri;
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', () => _reject());
  });
}

//interface PixelStore
