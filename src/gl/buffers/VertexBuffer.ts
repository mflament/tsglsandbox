import { AbstractBuffer } from './AbstractBuffer';
import { BufferTarget, sizeOf, VertexBufferType, VertexComponentType } from './BufferEnums';

export interface PartialBufferAttribute {
  size: number;
  type?: VertexComponentType;
  normalized?: boolean;
}

export interface BufferAttribute extends PartialBufferAttribute {
  index: number;
  offset: number;
  bytes: number;
  stride: number;
}

type BufferAttributes<A> = {
  [P in keyof A]: Readonly<BufferAttribute>;
};

export type PartialBufferAttributes<A> = {
  [P in keyof A]: PartialBufferAttribute;
};

function isPartialAttribute(o: any): o is PartialBufferAttribute {
  return typeof o === 'object' && typeof (o as Partial<PartialBufferAttribute>).size === 'number';
}

export class VertexBuffer<A = any> extends AbstractBuffer<VertexBufferType, VertexBuffer<A>> {
  private readonly _attributeNames: string[];
  private readonly _attributes: BufferAttributes<A>;
  readonly stride: number;

  constructor(gl: WebGL2RenderingContext, attributes: PartialBufferAttributes<A>) {
    super(gl, BufferTarget.ARRAY_BUFFER);

    this._attributeNames = Object.keys(attributes);
    if (this._attributeNames.length === 0) throw Error('No attributes');

    const attrBytes = Object.values(attributes).filter(isPartialAttribute).map(attributeBytes);
    this.stride = attrBytes.reduce((p, c) => p + c, 0);

    let index = 0;
    let offset = 0;
    const attrs: { [key: string]: Readonly<BufferAttribute> } = {};
    for (const name in attributes) {
      if (Object.prototype.hasOwnProperty.call(attributes, name)) {
        const pa = attributes[name];
        const bytes = attrBytes[index];
        attrs[name] = {
          ...pa,
          type: attributeType(pa),
          index: index,
          offset: offset,
          bytes: bytes,
          stride: this.stride
        };
        offset += bytes;
        index++;
      }
    }
    this._attributes = attrs as BufferAttributes<A>;
  }

  get attributes(): BufferAttributes<A> {
    return this._attributes;
  }

  get attributesCount(): number {
    return this._attributeNames.length;
  }

  attribute(p: keyof A | number): BufferAttribute {
    if (typeof p === 'number') return this._attributes[this._attributeNames[p] as keyof A];
    return this._attributes[p];
  }

  get count(): number {
    return this.size / this.stride;
  }

  protected self(): VertexBuffer<A> {
    return this;
  }
}

function attributeType(attribute: PartialBufferAttribute): VertexComponentType {
  return attribute.type === undefined ? WebGL2RenderingContext.FLOAT : attribute.type;
}

function attributeBytes(attribute: PartialBufferAttribute): number {
  return sizeOf(attributeType(attribute)) * attribute.size;
}
