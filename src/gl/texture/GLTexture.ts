import {AbstractDeletable, Bindable, checkNull, Deletable} from '../GLUtils';
import {
  InternalFormat,
  TextureArrayBuffer,
  TextureComponentType,
  TextureFormat,
  TextureMagFilter,
  TextureMinFilter,
  TextureParameter,
  TextureWrappingMode
} from './TextureEnums';
import {checkTextureCombination, TextureFormats, validateBufferType} from "./TextureFormats";

const TARGET = WebGL2RenderingContext.TEXTURE_2D;

export class GLTexture2D extends AbstractDeletable implements Partial<Bindable>, Deletable {
  private static _activeUnit = 0;

  private readonly _texture: WebGLTexture;
  private _formats?: TextureFormats;
  private _width = 0;
  private _height = 0;
  private _boundTo?: number;

  constructor(readonly gl: WebGL2RenderingContext) {
    super();
    this._texture = checkNull(() => gl.createTexture());
  }

  get gltexture(): WebGLTexture {
    return this._texture;
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

  get formats(): TextureFormats {
    if (!this._formats) throw new Error('Not initiazed');
    return this._formats;
  }

  bind(): GLTexture2D {
    this.gl.bindTexture(TARGET, this._texture);
    this._boundTo = GLTexture2D._activeUnit;
    return this;
  }

  unbind(): GLTexture2D {
    this.gl.bindTexture(TARGET, null);
    this._boundTo = undefined;
    return this;
  }

  activate(unit: number): GLTexture2D {
    this.activeUnit = unit;
    return this;
  }

  get activeUnit(): number {
    return GLTexture2D._activeUnit;
  }

  set activeUnit(unit: number) {
    if (GLTexture2D._activeUnit !== unit) {
      this.gl.activeTexture(WebGL2RenderingContext.TEXTURE0 + unit);
      GLTexture2D._activeUnit = unit;
    }
  }

  delete(): GLTexture2D {
    this.gl.deleteTexture(this._texture);
    super.delete();
    return this;
  }

  async load(param: LoadImageData): Promise<GLTexture2D> {
    const image = await loadImage(param.uri);
    this.bind().data({...param, source: image, generateMipmap: true});
    if (param.onload) param.onload(this);
    return this;
  }

  data(param: TextureData): GLTexture2D {
    const formats = checkTextureCombination(param);
    const level = param.level ? param.level : 0;
    if (isSizedData(param)) {
      const w = param.width;
      const h = param.height;
      if (isBufferData(param)) {
        validateBufferType(param.buffer, formats.componentType);
        if (param.unpackAlignment !== undefined)
          this.gl.pixelStorei(WebGL2RenderingContext.UNPACK_ALIGNMENT, param.unpackAlignment);
        const srcOffset = param.srcOffset ? param.srcOffset : 0;
        this.gl.texImage2D(TARGET, level, formats.internalFormat, w, h, 0, formats.format, formats.componentType, param.buffer, srcOffset);
      } else if (isPBOData(param)) {
        this.gl.texImage2D(TARGET, level, formats.internalFormat, w, h, 0, formats.format, formats.componentType, param.pboOffset);
      } else {
        this.gl.texImage2D(TARGET, level, formats.internalFormat, w, h, 0, formats.format, formats.componentType, null);
      }
      this._width = w;
      this._height = h;
    } else if (isImageSourceData(param)) {
      this.gl.texImage2D(TARGET, level, formats.internalFormat, formats.format, formats.componentType, param.source);
      this._width = param.source.width;
      this._height = param.source.height;
    } else if (isLoadImageData(param)) {
      loadImage(param.uri).then(image => {
        this.bind().data({...param, source: image, generateMipmap: true} as ImageSourceData);
        if (param.onload) param.onload(this);
      });
      return this;
    }
    if (param.generateMipmap) this.generateMimap();
    this._formats = formats;
    return this;
  }

  printFormats(): string {
    if (!this._formats) return "undefined";
    return JSON.stringify({
      internaleFormat: InternalFormat[this._formats.internalFormat],
      format: TextureFormat[this._formats.format],
      componentType: TextureComponentType[this._formats.componentType]
    });
  }

  subdata(param: TextureSubdata): GLTexture2D {
    if (!this._formats) throw new Error("formats not configured yet, call data first");
    checkTextureCombination({...param, internalFormat: this._formats?.internalFormat});
    const level = param.level ? param.level : 0;
    if (isSizedData(param)) {
      const w = param.width;
      const h = param.height;
      if (isBufferData(param)) {
        validateBufferType(param.buffer, this.formats.componentType);
        if (param.unpackAlignment !== undefined)
          this.gl.pixelStorei(WebGL2RenderingContext.UNPACK_ALIGNMENT, param.unpackAlignment);
        const srcOffset = param.srcOffset ? param.srcOffset : 0;
        this.gl.texSubImage2D(TARGET, level, param.x, param.y, w, h, this.formats.format, this.formats.componentType, param.buffer, srcOffset);
      } else if (isPBOData(param)) {
        this.gl.texSubImage2D(TARGET, level, param.x, param.y, w, h, this.formats.format, this.formats.componentType, param.pboOffset);
      }
    } else if (isImageSourceData(param)) {
      this.gl.texSubImage2D(TARGET, level, param.x, param.y, this.formats.format, this.formats.componentType, param.source);
    }
    return this;
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
}

export interface BaseTextureData {
  format?: TextureFormat;
  type?: TextureComponentType;
  level?: number;
}

export interface InitTextureData extends BaseTextureData {
  internalFormat?: InternalFormat;
  generateMipmap?: boolean;
}

export interface SizedData {
  width: number;
  height: number;
}

export interface BufferData extends SizedData {
  buffer: TextureArrayBuffer;
  srcOffset?: number;
  unpackAlignment?: number;
}

export interface PBOData extends SizedData {
  pboOffset: number;
}

export interface ImageSourceData {
  source: TexImageSource;
}

export interface LoadImageData {
  uri: string;
  onload?: (texture: GLTexture2D) => any;
}

export type TextureData = InitTextureData & (SizedData | BufferData | PBOData | ImageSourceData | LoadImageData);
export type TextureSubdata = BaseTextureData & {
  x: number;
  y: number;
} & (BufferData | PBOData | ImageSourceData);

function isSizedData(data: any): data is SizedData {
  const sd = data as Partial<SizedData>;
  return typeof sd.width === 'number' && typeof sd.height === 'number';
}

function isBufferData(data: any): data is BufferData {
  return isSizedData(data) && (data as BufferData).buffer !== undefined;
}

function isImageSourceData(data: any): data is ImageSourceData {
  return (data as ImageSourceData).source !== undefined;
}

function isLoadImageData(data: any): data is LoadImageData {
  return typeof (data as Partial<LoadImageData>).uri === 'string';
}

function isPBOData(data: any): data is PBOData {
  return typeof (data as Partial<PBOData>).pboOffset === 'number';
}

function loadImage(uri: string): Promise<HTMLImageElement> {
  return new Promise((resolve, _reject) => {
    const image = new Image();
    image.src = uri;
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', () => _reject());
  });
}
