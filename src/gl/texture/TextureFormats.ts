import {InternalFormat, TextureComponentType, TextureFormat} from './TextureEnums';

export interface TextureFormats {
  internalFormat: InternalFormat;
  format: TextureFormat;
  componentType: TextureComponentType;
}

// @formatter:off
const CONFIGURATIONS :TextureFormats[] = [
  { internalFormat: InternalFormat.R8,  format: TextureFormat.RED, componentType: TextureComponentType.BYTE },
  { internalFormat: InternalFormat.R8_SNORM,  format: TextureFormat.RED, componentType: TextureComponentType.BYTE },
  { internalFormat: InternalFormat.RG8,  format: TextureFormat.RG, componentType: TextureComponentType.BYTE },
  { internalFormat: InternalFormat.RG8_SNORM,  format: TextureFormat.RG, componentType: TextureComponentType.BYTE },
  { internalFormat: InternalFormat.RGB8,  format: TextureFormat.RGB, componentType: TextureComponentType.BYTE },
  { internalFormat: InternalFormat.RGB8_SNORM,  format: TextureFormat.RGB, componentType: TextureComponentType.BYTE },
  { internalFormat: InternalFormat.RGB565,  format: TextureFormat.RGB, componentType: TextureComponentType.UNSIGNED_SHORT_5_6_5 },
  { internalFormat: InternalFormat.RGBA4,  format: TextureFormat.RGBA, componentType: TextureComponentType.UNSIGNED_SHORT_4_4_4_4 },
  { internalFormat: InternalFormat.RGB5_A1,  format: TextureFormat.RGBA, componentType: TextureComponentType.UNSIGNED_SHORT_5_5_5_1 },
  { internalFormat: InternalFormat.RGBA8,  format: TextureFormat.RGBA, componentType: TextureComponentType.BYTE },
  { internalFormat: InternalFormat.RGBA8_SNORM,  format: TextureFormat.RGBA, componentType: TextureComponentType.BYTE },
  { internalFormat: InternalFormat.RGB10_A2,  format: TextureFormat.RGBA, componentType: TextureComponentType.UNSIGNED_INT_2_10_10_10_REV },
  { internalFormat: InternalFormat.RGB10_A2UI,  format: TextureFormat.RGBA_INTEGER, componentType: TextureComponentType.UNSIGNED_INT_2_10_10_10_REV },
  { internalFormat: InternalFormat.SRGB8,  format: TextureFormat.RGB, componentType: TextureComponentType.BYTE },
  { internalFormat: InternalFormat.SRGB8_ALPHA8,  format: TextureFormat.RGBA, componentType: TextureComponentType.BYTE },
  { internalFormat: InternalFormat.R16F,  format: TextureFormat.RED, componentType: TextureComponentType.HALF_FLOAT },
  { internalFormat: InternalFormat.RG16F,  format: TextureFormat.RG, componentType: TextureComponentType.HALF_FLOAT },
  { internalFormat: InternalFormat.RGB16F,  format: TextureFormat.RGB, componentType: TextureComponentType.HALF_FLOAT },
  { internalFormat: InternalFormat.RGBA16F,  format: TextureFormat.RGBA, componentType: TextureComponentType.HALF_FLOAT },
  { internalFormat: InternalFormat.R32F,  format: TextureFormat.RED, componentType: TextureComponentType.FLOAT },
  { internalFormat: InternalFormat.RG32F,  format: TextureFormat.RG, componentType: TextureComponentType.FLOAT },
  { internalFormat: InternalFormat.RGB32F,  format: TextureFormat.RGB, componentType: TextureComponentType.FLOAT },
  { internalFormat: InternalFormat.RGBA32F,  format: TextureFormat.RGBA, componentType: TextureComponentType.FLOAT },
  { internalFormat: InternalFormat.R11F_G11F_B10F,  format: TextureFormat.RGB, componentType: TextureComponentType.UNSIGNED_INT_10F_11F_11F_REV },
  { internalFormat: InternalFormat.RGB9_E5,  format: TextureFormat.RGB, componentType: TextureComponentType.UNSIGNED_INT_5_9_9_9_REV },
  { internalFormat: InternalFormat.R8I,  format: TextureFormat.RED_INTEGER, componentType: TextureComponentType.BYTE },
  { internalFormat: InternalFormat.R8UI,  format: TextureFormat.RED_INTEGER, componentType: TextureComponentType.BYTE },
  { internalFormat: InternalFormat.R16I,  format: TextureFormat.RED_INTEGER, componentType: TextureComponentType.SHORT },
  { internalFormat: InternalFormat.R16UI,  format: TextureFormat.RED_INTEGER, componentType: TextureComponentType.UNSIGNED_SHORT },
  { internalFormat: InternalFormat.R32I,  format: TextureFormat.RED_INTEGER, componentType: TextureComponentType.INT },
  { internalFormat: InternalFormat.R32UI,  format: TextureFormat.RED_INTEGER, componentType: TextureComponentType.UNSIGNED_INT },
  { internalFormat: InternalFormat.RG8I,  format: TextureFormat.RG_INTEGER, componentType: TextureComponentType.BYTE },
  { internalFormat: InternalFormat.RG8UI,  format: TextureFormat.RG_INTEGER, componentType: TextureComponentType.BYTE },
  { internalFormat: InternalFormat.RG16I,  format: TextureFormat.RG_INTEGER, componentType: TextureComponentType.SHORT },
  { internalFormat: InternalFormat.RG16UI,  format: TextureFormat.RG_INTEGER, componentType: TextureComponentType.UNSIGNED_SHORT },
  { internalFormat: InternalFormat.RG32I,  format: TextureFormat.RG_INTEGER, componentType: TextureComponentType.INT },
  { internalFormat: InternalFormat.RG32UI,  format: TextureFormat.RG_INTEGER, componentType: TextureComponentType.UNSIGNED_INT },
  { internalFormat: InternalFormat.RGB8I,  format: TextureFormat.RGB_INTEGER, componentType: TextureComponentType.BYTE },
  { internalFormat: InternalFormat.RGB8UI,  format: TextureFormat.RGB_INTEGER, componentType: TextureComponentType.BYTE },
  { internalFormat: InternalFormat.RGB16I,  format: TextureFormat.RGB_INTEGER, componentType: TextureComponentType.SHORT },
  { internalFormat: InternalFormat.RGB16UI,  format: TextureFormat.RGB_INTEGER, componentType: TextureComponentType.UNSIGNED_SHORT },
  { internalFormat: InternalFormat.RGB32I,  format: TextureFormat.RGB_INTEGER, componentType: TextureComponentType.INT },
  { internalFormat: InternalFormat.RGB32UI,  format: TextureFormat.RGB_INTEGER, componentType: TextureComponentType.UNSIGNED_INT },
  { internalFormat: InternalFormat.RGBA8I,  format: TextureFormat.RGBA_INTEGER, componentType: TextureComponentType.BYTE },
  { internalFormat: InternalFormat.RGBA8UI,  format: TextureFormat.RGBA_INTEGER, componentType: TextureComponentType.BYTE },
  { internalFormat: InternalFormat.RGBA16I,  format: TextureFormat.RGBA_INTEGER, componentType: TextureComponentType.SHORT },
  { internalFormat: InternalFormat.RGBA16UI,  format: TextureFormat.RGBA_INTEGER, componentType: TextureComponentType.UNSIGNED_SHORT },
  { internalFormat: InternalFormat.RGBA32I,  format: TextureFormat.RGBA_INTEGER, componentType: TextureComponentType.INT },
  { internalFormat: InternalFormat.RGBA32UI,  format: TextureFormat.RGBA_INTEGER, componentType: TextureComponentType.UNSIGNED_INT },
];
// @formatter:on

export function checkTextureCombination(combination: Partial<TextureFormats>): TextureFormats {
  const internalFormat = combination.internalFormat || InternalFormat.RGBA;
  const config = CONFIGURATIONS.find(c => c.internalFormat === internalFormat);
  if (!config) throw new Error("No texture format configuration found for internale format " + internalFormat);
  const format = combination.format || config.format;
  if (format !== config.format) throw new Error("Invalid format " + format);
  const componentType = combination.componentType || config.componentType;
  if (componentType !== config.componentType) throw new Error("Invalid componentType " + componentType);
  return {internalFormat: internalFormat, format: format, componentType: componentType};
}

const ArrayBufferComponentTypes: { [key: string]: TextureComponentType[] } = {
  Int8Array: [TextureComponentType.BYTE],
  Uint8Array: [TextureComponentType.UNSIGNED_BYTE],
  Uint8ClampedArray: [TextureComponentType.UNSIGNED_BYTE],
  Int16Array: [TextureComponentType.SHORT],
  Uint16Array: [
    TextureComponentType.UNSIGNED_SHORT,
    TextureComponentType.UNSIGNED_SHORT_5_6_5,
    TextureComponentType.UNSIGNED_SHORT_5_5_5_1,
    TextureComponentType.UNSIGNED_SHORT_4_4_4_4,
    TextureComponentType.HALF_FLOAT
  ],
  Int32Array: [TextureComponentType.INT],
  Uint32Array: [
    TextureComponentType.UNSIGNED_INT,
    TextureComponentType.UNSIGNED_INT_5_9_9_9_REV,
    TextureComponentType.UNSIGNED_INT_2_10_10_10_REV,
    TextureComponentType.UNSIGNED_INT_10F_11F_11F_REV,
    TextureComponentType.UNSIGNED_INT_24_8
  ],
  Float32Array: [TextureComponentType.FLOAT]
};

export function validateBufferType(buffer: ArrayBuffer, componentType: TextureComponentType): void {
  const name = buffer.constructor.name;
  const types = ArrayBufferComponentTypes[name];
  if (types.indexOf(componentType) < 0)
    throw new Error(
      'Invalid ArrayBuffer type ' + name + ' for texture component type ' + TextureComponentType[componentType]
    );
}
