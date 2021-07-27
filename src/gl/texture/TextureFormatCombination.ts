import {InternalFormat, TextureComponentType, TextureFormat} from './TextureEnums';

interface CombinationConfiguration {
  internalFormat: InternalFormat;
  format: TextureFormat;
  componentTypes: TextureComponentType[];
}

interface Combination {
  internalFormat: InternalFormat;
  format: TextureFormat;
  type: TextureComponentType;
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

const COMBINATIONS: CombinationConfiguration[] = [
  {
    internalFormat: InternalFormat.RGB,
    format: TextureFormat.RGB,
    componentTypes: [TextureComponentType.UNSIGNED_BYTE, TextureComponentType.UNSIGNED_SHORT_5_6_5]
  },
  {
    internalFormat: InternalFormat.RGBA,
    format: TextureFormat.RGBA,
    componentTypes: [
      TextureComponentType.UNSIGNED_BYTE,
      TextureComponentType.UNSIGNED_SHORT_4_4_4_4,
      TextureComponentType.UNSIGNED_SHORT_5_5_5_1
    ]
  },
  {
    internalFormat: InternalFormat.LUMINANCE_ALPHA,
    format: TextureFormat.LUMINANCE_ALPHA,
    componentTypes: [TextureComponentType.UNSIGNED_BYTE]
  },
  {
    internalFormat: InternalFormat.LUMINANCE,
    format: TextureFormat.LUMINANCE,
    componentTypes: [TextureComponentType.UNSIGNED_BYTE]
  },
  {
    internalFormat: InternalFormat.ALPHA,
    format: TextureFormat.ALPHA,
    componentTypes: [TextureComponentType.UNSIGNED_BYTE]
  },
  {
    internalFormat: InternalFormat.R8,
    format: TextureFormat.RED,
    componentTypes: [TextureComponentType.UNSIGNED_BYTE]
  },
  {
    internalFormat: InternalFormat.R16F,
    format: TextureFormat.RED,
    componentTypes: [TextureComponentType.HALF_FLOAT, TextureComponentType.FLOAT]
  },
  {
    internalFormat: InternalFormat.R32F,
    format: TextureFormat.RED,
    componentTypes: [TextureComponentType.FLOAT]
  },
  {
    internalFormat: InternalFormat.R8UI,
    format: TextureFormat.RED_INTEGER,
    componentTypes: [TextureComponentType.UNSIGNED_BYTE]
  },
  {
    internalFormat: InternalFormat.RG8,
    format: TextureFormat.RG,
    componentTypes: [TextureComponentType.UNSIGNED_BYTE]
  },
  {
    internalFormat: InternalFormat.RG16F,
    format: TextureFormat.RG,
    componentTypes: [TextureComponentType.HALF_FLOAT, TextureComponentType.FLOAT]
  },
  {
    internalFormat: InternalFormat.RG32F,
    format: TextureFormat.RG,
    componentTypes: [TextureComponentType.FLOAT]
  },
  {
    internalFormat: InternalFormat.RG8UI,
    format: TextureFormat.RG_INTEGER,
    componentTypes: [TextureComponentType.UNSIGNED_BYTE]
  },
  {
    internalFormat: InternalFormat.RGB8,
    format: TextureFormat.RGB,
    componentTypes: [TextureComponentType.UNSIGNED_BYTE]
  },
  {
    internalFormat: InternalFormat.SRGB8,
    format: TextureFormat.RGB,
    componentTypes: [TextureComponentType.UNSIGNED_BYTE]
  },
  {
    internalFormat: InternalFormat.RGB565,
    format: TextureFormat.RGB,
    componentTypes: [TextureComponentType.UNSIGNED_BYTE, TextureComponentType.UNSIGNED_SHORT_5_6_5]
  },
  {
    internalFormat: InternalFormat.R11F_G11F_B10F,
    format: TextureFormat.RGB,
    componentTypes: [
      TextureComponentType.UNSIGNED_INT_10F_11F_11F_REV,
      TextureComponentType.HALF_FLOAT,
      TextureComponentType.FLOAT
    ]
  },
  {
    internalFormat: InternalFormat.RGB9_E5,
    format: TextureFormat.RGB,
    componentTypes: [TextureComponentType.HALF_FLOAT, TextureComponentType.FLOAT]
  },
  {
    internalFormat: InternalFormat.RGB16F,
    format: TextureFormat.RGB,
    componentTypes: [TextureComponentType.HALF_FLOAT, TextureComponentType.FLOAT]
  },
  {
    internalFormat: InternalFormat.RGB32F,
    format: TextureFormat.RGB,
    componentTypes: [TextureComponentType.FLOAT]
  },
  {
    internalFormat: InternalFormat.RGB8UI,
    format: TextureFormat.RGB_INTEGER,
    componentTypes: [TextureComponentType.UNSIGNED_BYTE]
  },
  {
    internalFormat: InternalFormat.RGBA8,
    format: TextureFormat.RGBA,
    componentTypes: [TextureComponentType.UNSIGNED_BYTE]
  },
  {
    internalFormat: InternalFormat.SRGB8_ALPHA8,
    format: TextureFormat.RGBA,
    componentTypes: [TextureComponentType.UNSIGNED_BYTE]
  },
  {
    internalFormat: InternalFormat.RGB5_A1,
    format: TextureFormat.RGBA,
    componentTypes: [TextureComponentType.UNSIGNED_BYTE, TextureComponentType.UNSIGNED_SHORT_5_5_5_1]
  },
  {
    internalFormat: InternalFormat.RGB10_A2,
    format: TextureFormat.RGBA,
    componentTypes: [TextureComponentType.UNSIGNED_INT_2_10_10_10_REV]
  },
  {
    internalFormat: InternalFormat.RGBA4,
    format: TextureFormat.RGBA,
    componentTypes: [TextureComponentType.UNSIGNED_BYTE, TextureComponentType.UNSIGNED_SHORT_4_4_4_4]
  },
  {
    internalFormat: InternalFormat.RGBA16F,
    format: TextureFormat.RGBA,
    componentTypes: [TextureComponentType.HALF_FLOAT, TextureComponentType.FLOAT]
  },
  {
    internalFormat: InternalFormat.RGBA32F,
    format: TextureFormat.RGBA,
    componentTypes: [TextureComponentType.FLOAT]
  },
  {
    internalFormat: InternalFormat.RGBA8UI,
    format: TextureFormat.RGBA_INTEGER,
    componentTypes: [TextureComponentType.UNSIGNED_BYTE]
  }
];

export function validateFormatsCombination(combination: Combination): void {
  if (COMBINATIONS.filter(c => match(c, combination)).length === 0)
    throw new Error('Invalid formats combination ' + JSON.stringify(combination));
}

export function validateBufferType(buffer: ArrayBuffer, componentType: TextureComponentType): void {
  const name = buffer.constructor.name;
  const types = ArrayBufferComponentTypes[name];
  if (types.indexOf(componentType) < 0)
    throw new Error(
      'Invalid ArrayBuffer type ' + name + ' for texture component type ' + TextureComponentType[componentType]
    );
}

export function defaultFormat(internalFormat: InternalFormat): TextureFormat {
  return COMBINATIONS.filter(cc => cc.internalFormat === internalFormat)[0].format;
}

export function defaultType(internalFormat: InternalFormat, format: TextureFormat): TextureComponentType {
  return COMBINATIONS.filter(cc => cc.internalFormat === internalFormat && cc.format === format)[0].componentTypes[0];
}

function match(c: CombinationConfiguration, combination: Combination): boolean {
  return (
    c.internalFormat === combination.internalFormat &&
    c.format === combination.format &&
    c.componentTypes.indexOf(combination.type) >= 0
  );
}
