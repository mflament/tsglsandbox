import { Program } from '../shader/Program';
import { PartialVertexAttribute } from '../buffers/VertextArray';
import { GLTexture2D } from '../texture/GLTexture';
import { Sprites, SpritesAttributes, SpritesUniforms, FLOAT_BYTES, Sprite } from './Sprites';
import { vec2 } from 'gl-matrix';
import { SandboxContainer } from '../sandbox/GLSandbox';
// @ts-ignore
import SPRITES_VS from 'assets/shaders/sprites/textured-sprites.vs.glsl';
// @ts-ignore
import SPRITES_FS from 'assets/shaders/sprites/textured-sprites.fs.glsl';

interface TexturedSpritesAttributes extends SpritesAttributes {
  a_textureRegion: number;
}

interface TexturedSpritesUniforms extends SpritesUniforms {
  u_texture: WebGLUniformLocation | null;
}

export interface TextureRegion {
  textureOffset: vec2;
  textureSize: vec2;
}

export type TexturedSprite = Sprite & TextureRegion;

export function createRegions(rows: number, columns: number, count = rows * columns): TextureRegion[] {
  const cellSize: vec2 = [1 / columns, 1 / rows];
  const regions: TextureRegion[] = [];
  for (let row = 0; regions.length < count && row < rows; row++) {
    for (let col = 0; regions.length < count && col < columns; col++) {
      regions.push({
        textureOffset: [col * cellSize[0], 1 - (row + 1) * cellSize[1]],
        textureSize: cellSize
      });
    }
  }
  return regions;
}

export async function newTexturedSprites(container: SandboxContainer, texture: GLTexture2D): Promise<TexturedSprites> {
  return new TexturedSprites(
    container.gl,
    await container.programLoader.loadProgram({
      vsSource: SPRITES_VS,
      fsSource: SPRITES_FS,
      attributeLocations: { a_vertexPos: 0, a_vertexUV: 0, a_spriteMatrix: 0, a_textureRegion: 0 },
      uniformLocations: { u_viewMatrix: null, u_texture: null }
    }),
    texture
  );
}

export class TexturedSprites extends Sprites<TexturedSprite> {
  constructor(
    gl: WebGL2RenderingContext,
    program: Program<TexturedSpritesAttributes, TexturedSpritesUniforms>,
    readonly texture: GLTexture2D,
    capacity?: number
  ) {
    super(gl, program, capacity);
    texture.activate(0).bind();
    this.gl.uniform1i(program.uniformLocations.u_texture, 0);
  }

  bind(): TexturedSprites {
    super.bind();
    this.texture.activate(0).bind();
    return this;
  }

  unbind(): TexturedSprites {
    this.texture.unbind();
    return this;
  }

  protected get spriteFloats(): number {
    return 4 * 4 + 4;
  }

  protected writeSpriteAttributes(sprite: TexturedSprite, buffer: Float32Array, offset: number): number {
    let length = super.writeSpriteAttributes(sprite, buffer, offset);
    buffer.set(sprite.textureOffset, offset + length);
    length += 2;
    buffer.set(sprite.textureSize, offset + length);
    length += 2;
    return length;
  }

  protected createInstanceAttributes(partialAttribute: Partial<PartialVertexAttribute>): PartialVertexAttribute[] {
    const attributes = super.createInstanceAttributes(partialAttribute);
    const textureLocation = this.program.attributeLocations.a_textureRegion;
    if (typeof textureLocation !== 'undefined') {
      attributes.push({
        location: textureLocation,
        ...partialAttribute,
        size: 4,
        offset: super.spriteFloats * FLOAT_BYTES
      });
    }
    return attributes;
  }
}
