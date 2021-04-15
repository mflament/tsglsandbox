import { ArrayBuffer, checkNull } from '../gl-utils';
import {
  InternalFormat,
  TextureComponentType,
  TextureFormat,
  TextureMagFilter,
  TextureMinFilter,
  TextureParameter,
  TextureWrappingMode
} from './TextureEnums';
import { Bindable, Deletable } from '../gl-utils';
import {
  defaultFormat,
  defaultType as defaultComponentType,
  validateBufferType,
  validateFormatsCombination
} from './TextureFormatCombination';

const TARGET = WebGL2RenderingContext.TEXTURE_2D;

export class GLTexture2D implements Partial<Bindable>, Deletable {
  private _texture: WebGLTexture;
  private _internalFormat?: InternalFormat;
  private _width = 0;
  private _height = 0;

  constructor(readonly gl: WebGL2RenderingContext) {
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

  get internalFormat(): InternalFormat {
    if (!this._internalFormat) throw new Error('Not initiazed');
    return this._internalFormat;
  }

  bind(): GLTexture2D {
    this.gl.bindTexture(TARGET, this._texture);
    return this;
  }

  unbind(): GLTexture2D {
    this.gl.bindTexture(TARGET, null);
    return this;
  }

  activate(index: number): GLTexture2D {
    this.gl.activeTexture(WebGL2RenderingContext.TEXTURE0 + index);
    return this;
  }

  delete(): GLTexture2D {
    this.gl.deleteTexture(this._texture);
    return this;
  }

  data(param: TextureData): GLTexture2D {
    const intformat = param.internalFormat ? param.internalFormat : InternalFormat.RGBA;
    const format = param.format ? param.format : defaultFormat(intformat);
    const type = param.type ? param.type : defaultComponentType(intformat, format);
    validateFormatsCombination({ internalFormat: intformat, format: format, type: type });
    const level = param.level ? param.level : 0;
    if (isSizedData(param)) {
      const w = param.width;
      const h = param.height;
      if (isBufferData(param)) {
        validateBufferType(param.buffer, type);
        const srcOffset = param.srcOffset ? param.srcOffset : 0;
        this.gl.texImage2D(TARGET, level, intformat, w, h, 0, format, type, param.buffer, srcOffset);
      } else if (isPBOData(param)) {
        this.gl.texImage2D(TARGET, level, intformat, w, h, 0, format, type, param.pboOffset);
      } else {
        this.gl.texImage2D(TARGET, level, intformat, w, h, 0, format, type, null);
      }
      this._width = w;
      this._height = h;
    } else if (isImageSourceData(param)) {
      this.gl.texImage2D(TARGET, level, intformat, format, type, param.source);
      this._width = param.source.width;
      this._height = param.source.height;
    } else if (isLoadImageData(param)) {
      loadImage(param.uri).then(image => {
        this.bind().data({ ...param, source: image, generateMipmap: true } as ImageSourceData);
      });
      return this;
    }
    if (param.generateMipmap) this.generateMimap();
    this._internalFormat = intformat;
    return this;
  }

  subdata(param: TextureSubdata): GLTexture2D {
    const intformat = this.internalFormat;
    const format = param.format ? param.format : defaultFormat(intformat);
    const type = param.type ? param.type : defaultComponentType(intformat, format);
    const level = param.level ? param.level : 0;
    if (isSizedData(param)) {
      const w = param.width;
      const h = param.height;
      if (isBufferData(param)) {
        validateBufferType(param.buffer, type);
        const srcOffset = param.srcOffset ? param.srcOffset : 0;
        this.gl.texSubImage2D(TARGET, level, param.x, param.y, w, h, format, type, param.buffer, srcOffset);
      } else if (isPBOData(param)) {
        this.gl.texSubImage2D(TARGET, level, param.x, param.y, w, h, format, type, param.pboOffset);
      }
    } else if (isImageSourceData(param)) {
      this.gl.texSubImage2D(TARGET, level, param.x, param.y, format, type, param.source);
    }
    return this;
  }

  generateMimap(): void {
    this.gl.generateMipmap(TARGET);
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

interface BaseTextureData {
  format?: TextureFormat;
  type?: TextureComponentType;
  level?: number;
}

interface InitTextureData extends BaseTextureData {
  internalFormat?: InternalFormat;
  generateMipmap?: boolean;
}

interface SizedData {
  width: number;
  height: number;
}

interface BufferData extends SizedData {
  buffer: ArrayBuffer;
  srcOffset?: number;
}

interface PBOData extends SizedData {
  pboOffset: number;
}

interface ImageSourceData {
  source: TexImageSource;
}

interface LoadImageData {
  uri: string;
  flipy?: boolean;
  onload?: (texture: GLTexture2D) => any;
}

type TextureData = InitTextureData & (SizedData | BufferData | PBOData | ImageSourceData | LoadImageData);
type TextureSubdata = BaseTextureData & {
  x: number;
  y: number;
} & (BufferData | PBOData | ImageSourceData);

function isSizedData(data: any): data is SizedData {
  const sd = data as SizedData;
  return typeof sd.width === 'number' && typeof sd.height === 'number';
}

function isBufferData(data: any): data is BufferData {
  return isSizedData(data) && (data as BufferData).buffer !== undefined;
}

function isImageSourceData(data: any): data is ImageSourceData {
  return (data as ImageSourceData).source !== undefined;
}

function isLoadImageData(data: any): data is LoadImageData {
  return typeof (data as LoadImageData).uri === 'string';
}

function isPBOData(data: any): data is PBOData {
  return typeof (data as PBOData).pboOffset === 'number';
}

function loadImage(uri: string): Promise<HTMLImageElement> {
  return new Promise((resolve, _reject) => {
    const image = new Image();
    image.src = uri;
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', () => _reject());
  });
}
