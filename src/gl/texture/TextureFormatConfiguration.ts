import { InternalFormat, TextureComponentType, TextureFormat } from './TextureEnums';

export class TextureFormatConfiguration {
  static create(
    internalFormat: InternalFormat,
    format: TextureFormat,
    ...types: TextureComponentType[]
  ): TextureFormatConfiguration {
    return new TextureFormatConfiguration(internalFormat, format, types);
  }

  constructor(
    readonly internalFormat: InternalFormat,
    readonly format: TextureFormat,
    readonly types: TextureComponentType[]
  ) {}

  toString = (): string => {
    return `{internalFormat: ${InternalFormat[this.internalFormat]}, format: ${
      TextureFormat[this.format]
    }, types: ${this.types.map(t => TextureComponentType[t])}`;
  };
}

function newConfig(
  internalFormat: InternalFormat,
  format: TextureFormat,
  ...types: TextureComponentType[]
): TextureFormatConfiguration {
  return new TextureFormatConfiguration(internalFormat, format, types);
}

function mapConfigs(configs: TextureFormatConfiguration[]): Map<InternalFormat, TextureFormatConfiguration> {
  const map = new Map<InternalFormat, TextureFormatConfiguration>();
  configs.forEach(conf => {
    if (map.has(conf.internalFormat)) throw new Error('Duplicate format ' + InternalFormat[conf.internalFormat]);
    map.set(conf.internalFormat, conf);
  });
  return map;
}

const UNSIGNED_BYTE = TextureComponentType.UNSIGNED_BYTE;
const UNSIGNED_SHORT_5_6_5 = TextureComponentType.UNSIGNED_SHORT_5_6_5;
const UNSIGNED_SHORT_4_4_4_4 = TextureComponentType.UNSIGNED_SHORT_4_4_4_4;
const UNSIGNED_SHORT_5_5_5_1 = TextureComponentType.UNSIGNED_SHORT_5_5_5_1;
const HALF_FLOAT = TextureComponentType.HALF_FLOAT;
const FLOAT = TextureComponentType.FLOAT;
const UNSIGNED_INT_10F_11F_11F_REV = TextureComponentType.UNSIGNED_INT_10F_11F_11F_REV;

/**
 * https://www.khronos.org/registry/webgl/specs/2.0/#3.7.6
 */
const CONFIGURATIONS = mapConfigs([
  newConfig(InternalFormat.RGB, TextureFormat.RGB, UNSIGNED_BYTE, UNSIGNED_SHORT_5_6_5),
  newConfig(InternalFormat.RGBA, TextureFormat.RGBA, UNSIGNED_BYTE, UNSIGNED_SHORT_4_4_4_4, UNSIGNED_SHORT_5_5_5_1),
  newConfig(InternalFormat.LUMINANCE_ALPHA, TextureFormat.LUMINANCE_ALPHA, UNSIGNED_BYTE),
  newConfig(InternalFormat.LUMINANCE, TextureFormat.LUMINANCE, UNSIGNED_BYTE),
  newConfig(InternalFormat.ALPHA, TextureFormat.ALPHA, UNSIGNED_BYTE),
  newConfig(InternalFormat.R8, TextureFormat.RED, UNSIGNED_BYTE),
  newConfig(InternalFormat.R16F, TextureFormat.RED, HALF_FLOAT, FLOAT),
  newConfig(InternalFormat.R32F, TextureFormat.RED, FLOAT),
  newConfig(InternalFormat.R8UI, TextureFormat.RED_INTEGER, UNSIGNED_BYTE),
  newConfig(InternalFormat.RG8, TextureFormat.RG, UNSIGNED_BYTE),
  newConfig(InternalFormat.RG16F, TextureFormat.RG, HALF_FLOAT, FLOAT),
  newConfig(InternalFormat.RG32F, TextureFormat.RG, FLOAT),
  newConfig(InternalFormat.RG8UI, TextureFormat.RG_INTEGER, UNSIGNED_BYTE),
  newConfig(InternalFormat.RGB8, TextureFormat.RGB, UNSIGNED_BYTE),
  newConfig(InternalFormat.SRGB8, TextureFormat.RGB, UNSIGNED_BYTE),
  newConfig(InternalFormat.RGB565, TextureFormat.RGB, UNSIGNED_BYTE, UNSIGNED_SHORT_5_6_5),
  newConfig(InternalFormat.R11F_G11F_B10F, TextureFormat.RGB, UNSIGNED_INT_10F_11F_11F_REV, HALF_FLOAT, FLOAT),
  newConfig(InternalFormat.RGB9_E5, TextureFormat.RGB, HALF_FLOAT, FLOAT),
  newConfig(InternalFormat.RGB16F, TextureFormat.RGB, HALF_FLOAT, FLOAT),
  newConfig(InternalFormat.RGB32F, TextureFormat.RGB, FLOAT),
  newConfig(InternalFormat.RGB8UI, TextureFormat.RGB_INTEGER, UNSIGNED_BYTE),
  newConfig(InternalFormat.RGBA8, TextureFormat.RGBA, UNSIGNED_BYTE),
  newConfig(InternalFormat.SRGB8_ALPHA8, TextureFormat.RGBA, UNSIGNED_BYTE),
  newConfig(InternalFormat.RGB5_A1, TextureFormat.RGBA, UNSIGNED_BYTE, UNSIGNED_SHORT_5_5_5_1),
  newConfig(InternalFormat.RGBA4, TextureFormat.RGBA, UNSIGNED_BYTE, UNSIGNED_SHORT_4_4_4_4),
  newConfig(InternalFormat.RGBA16F, TextureFormat.RGBA, HALF_FLOAT, FLOAT),
  newConfig(InternalFormat.RGBA32F, TextureFormat.RGBA, FLOAT),
  newConfig(InternalFormat.RGBA8UI, TextureFormat.RGBA_INTEGER, UNSIGNED_BYTE)
]);

export function getFormatConfiguration(internalFormat: InternalFormat): TextureFormatConfiguration {
  const config = CONFIGURATIONS.get(internalFormat);
  if (!config)
    throw new Error('No texture format configuration found for internale format ' + InternalFormat[internalFormat]);
  return config;
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

export function getBufferComponentTypes(buffer: TextureArrayBuffer): TextureComponentType[] {
  if (buffer instanceof Int8Array) {
    return [TextureComponentType.BYTE];
  }

  if (buffer instanceof Uint8Array || buffer instanceof Uint8ClampedArray) {
    return [TextureComponentType.UNSIGNED_BYTE];
  }

  if (buffer instanceof Int16Array) {
    return [TextureComponentType.SHORT];
  }

  if (buffer instanceof Uint16Array) {
    return [
      TextureComponentType.UNSIGNED_SHORT,
      TextureComponentType.UNSIGNED_SHORT_5_6_5,
      TextureComponentType.UNSIGNED_SHORT_5_5_5_1,
      TextureComponentType.UNSIGNED_SHORT_4_4_4_4,
      TextureComponentType.HALF_FLOAT
    ];
  }

  if (buffer instanceof Int32Array) {
    return [TextureComponentType.INT];
  }

  if (buffer instanceof Uint32Array) {
    return [
      TextureComponentType.UNSIGNED_INT,
      TextureComponentType.UNSIGNED_INT_5_9_9_9_REV,
      TextureComponentType.UNSIGNED_INT_2_10_10_10_REV,
      TextureComponentType.UNSIGNED_INT_10F_11F_11F_REV,
      TextureComponentType.UNSIGNED_INT_24_8
    ];
  }

  return [TextureComponentType.FLOAT];
}
