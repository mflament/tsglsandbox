export enum InternalFormat {
  RGBA = WebGL2RenderingContext.RGBA,
  RGB = WebGL2RenderingContext.RGB,
  LUMINANCE_ALPHA = WebGL2RenderingContext.LUMINANCE_ALPHA,
  LUMINANCE = WebGL2RenderingContext.LUMINANCE,
  ALPHA = WebGL2RenderingContext.ALPHA,
  DEPTH_COMPONENT = WebGL2RenderingContext.DEPTH_COMPONENT,
  DEPTH_STENCIL = WebGL2RenderingContext.DEPTH_STENCIL,
  R8 = WebGL2RenderingContext.R8,
  R8_SNORM = WebGL2RenderingContext.R8_SNORM,
  RG8 = WebGL2RenderingContext.RG8,
  RG8_SNORM = WebGL2RenderingContext.RG8_SNORM,
  RGB8 = WebGL2RenderingContext.RGB8,
  RGB8_SNORM = WebGL2RenderingContext.RGB8_SNORM,
  RGB565 = WebGL2RenderingContext.RGB565,
  RGBA4 = WebGL2RenderingContext.RGBA4,
  RGB5_A1 = WebGL2RenderingContext.RGB5_A1,
  RGBA8 = WebGL2RenderingContext.RGBA8,
  RGBA8_SNORM = WebGL2RenderingContext.RGBA8_SNORM,
  RGB10_A2 = WebGL2RenderingContext.RGB10_A2,
  RGB10_A2UI = WebGL2RenderingContext.RGB10_A2UI,
  SRGB8 = WebGL2RenderingContext.SRGB8,
  SRGB8_ALPHA8 = WebGL2RenderingContext.SRGB8_ALPHA8,
  R16F = WebGL2RenderingContext.R16F,
  RG16F = WebGL2RenderingContext.RG16F,
  RGB16F = WebGL2RenderingContext.RGB16F,
  RGBA16F = WebGL2RenderingContext.RGBA16F,
  R32F = WebGL2RenderingContext.R32F,
  RG32F = WebGL2RenderingContext.RG32F,
  RGB32F = WebGL2RenderingContext.RGB32F,
  RGBA32F = WebGL2RenderingContext.RGBA32F,
  R11F_G11F_B10F = WebGL2RenderingContext.R11F_G11F_B10F,
  RGB9_E5 = WebGL2RenderingContext.RGB9_E5,
  R8I = WebGL2RenderingContext.R8I,
  R8UI = WebGL2RenderingContext.R8UI,
  R16I = WebGL2RenderingContext.R16I,
  R16UI = WebGL2RenderingContext.R16UI,
  R32I = WebGL2RenderingContext.R32I,
  R32UI = WebGL2RenderingContext.R32UI,
  RG8I = WebGL2RenderingContext.RG8I,
  RG8UI = WebGL2RenderingContext.RG8UI,
  RG16I = WebGL2RenderingContext.RG16I,
  RG16UI = WebGL2RenderingContext.RG16UI,
  RG32I = WebGL2RenderingContext.RG32I,
  RG32UI = WebGL2RenderingContext.RG32UI,
  RGB8I = WebGL2RenderingContext.RGB8I,
  RGB8UI = WebGL2RenderingContext.RGB8UI,
  RGB16I = WebGL2RenderingContext.RGB16I,
  RGB16UI = WebGL2RenderingContext.RGB16UI,
  RGB32I = WebGL2RenderingContext.RGB32I,
  RGB32UI = WebGL2RenderingContext.RGB32UI,
  RGBA8I = WebGL2RenderingContext.RGBA8I,
  RGBA8UI = WebGL2RenderingContext.RGBA8UI,
  RGBA16I = WebGL2RenderingContext.RGBA16I,
  RGBA16UI = WebGL2RenderingContext.RGBA16UI,
  RGBA32I = WebGL2RenderingContext.RGBA32I,
  RGBA32UI = WebGL2RenderingContext.RGBA32UI
}

export enum TextureFormat {
  RGB = WebGL2RenderingContext.RGB,
  RGBA = WebGL2RenderingContext.RGBA,
  LUMINANCE_ALPHA = WebGL2RenderingContext.LUMINANCE_ALPHA,
  LUMINANCE = WebGL2RenderingContext.LUMINANCE,
  ALPHA = WebGL2RenderingContext.ALPHA,
  RED = WebGL2RenderingContext.RED,
  RED_INTEGER = WebGL2RenderingContext.RED_INTEGER,
  RG = WebGL2RenderingContext.RG,
  RG_INTEGER = WebGL2RenderingContext.RG_INTEGER,
  RGB_INTEGER = WebGL2RenderingContext.RGB_INTEGER,
  RGBA_INTEGER = WebGL2RenderingContext.RGBA_INTEGER
}

export enum TextureComponentType {
  BYTE = WebGL2RenderingContext.BYTE,
  UNSIGNED_BYTE = WebGL2RenderingContext.UNSIGNED_BYTE,
  SHORT = WebGL2RenderingContext.SHORT,
  UNSIGNED_SHORT = WebGL2RenderingContext.UNSIGNED_SHORT,
  UNSIGNED_SHORT_5_6_5 = WebGL2RenderingContext.UNSIGNED_SHORT_5_6_5,
  UNSIGNED_SHORT_5_5_5_1 = WebGL2RenderingContext.UNSIGNED_SHORT_5_5_5_1,
  UNSIGNED_SHORT_4_4_4_4 = WebGL2RenderingContext.UNSIGNED_SHORT_4_4_4_4,
  INT = WebGL2RenderingContext.INT,
  UNSIGNED_INT = WebGL2RenderingContext.UNSIGNED_INT,
  UNSIGNED_INT_5_9_9_9_REV = WebGL2RenderingContext.UNSIGNED_INT_5_9_9_9_REV,
  UNSIGNED_INT_2_10_10_10_REV = WebGL2RenderingContext.UNSIGNED_INT_2_10_10_10_REV,
  UNSIGNED_INT_10F_11F_11F_REV = WebGL2RenderingContext.UNSIGNED_INT_10F_11F_11F_REV,
  UNSIGNED_INT_24_8 = WebGL2RenderingContext.UNSIGNED_INT_24_8,
  HALF_FLOAT = WebGL2RenderingContext.HALF_FLOAT,
  FLOAT = WebGL2RenderingContext.FLOAT
}

export enum TextureParameter {
  BASE_LEVEL = WebGL2RenderingContext.TEXTURE_BASE_LEVEL,
  COMPARE_FUNC = WebGL2RenderingContext.TEXTURE_COMPARE_FUNC,
  COMPARE_MODE = WebGL2RenderingContext.TEXTURE_COMPARE_MODE,
  MIN_FILTER = WebGL2RenderingContext.TEXTURE_MIN_FILTER,
  MAG_FILTER = WebGL2RenderingContext.TEXTURE_MAG_FILTER,
  MIN_LOD = WebGL2RenderingContext.TEXTURE_MIN_LOD,
  MAX_LOD = WebGL2RenderingContext.TEXTURE_MAX_LOD,
  MAX_LEVEL = WebGL2RenderingContext.TEXTURE_MAX_LEVEL,
  WRAP_S = WebGL2RenderingContext.TEXTURE_WRAP_S,
  WRAP_T = WebGL2RenderingContext.TEXTURE_WRAP_T,
  WRAP_R = WebGL2RenderingContext.TEXTURE_WRAP_R
}

export enum TextureMinFilter {
  NEAREST = WebGL2RenderingContext.NEAREST,
  LINEAR = WebGL2RenderingContext.LINEAR,
  NEAREST_MIPMAP_NEAREST = WebGL2RenderingContext.NEAREST_MIPMAP_NEAREST,
  LINEAR_MIPMAP_NEAREST = WebGL2RenderingContext.LINEAR_MIPMAP_NEAREST,
  NENEAREST_MIPMAP_LINEARAREST = WebGL2RenderingContext.NEAREST_MIPMAP_LINEAR,
  LINEAR_MIPMAP_LINEAR = WebGL2RenderingContext.LINEAR_MIPMAP_LINEAR
}

export enum TextureMagFilter {
  NEAREST = WebGL2RenderingContext.NEAREST,
  LINEAR = WebGL2RenderingContext.LINEAR
}

export enum TextureWrappingMode {
  CLAMP_TO_EDGE = WebGL2RenderingContext.CLAMP_TO_EDGE,
  MIRRORED_REPEAT = WebGL2RenderingContext.MIRRORED_REPEAT,
  REPEAT = WebGL2RenderingContext.REPEAT
}

export type TextureArrayBuffer =
  | Int8Array
  | Uint8Array
  | Uint8ClampedArray
  | Int16Array
  | Uint16Array
  | Int32Array
  | Uint32Array
  | Float32Array;

export function isTextureArrayBuffer(obj: unknown): obj is TextureArrayBuffer {
  return (
    obj instanceof Int8Array ||
    obj instanceof Uint8Array ||
    obj instanceof Uint8ClampedArray ||
    obj instanceof Int16Array ||
    obj instanceof Uint16Array ||
    obj instanceof Int32Array ||
    obj instanceof Uint32Array ||
    obj instanceof Float32Array
  );
}
