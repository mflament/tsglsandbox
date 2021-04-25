import { Bindable, Deletable } from '../utils/GLUtils';
import { Dimension, SandboxContainer } from '../sandbox/GLSandbox';
import { Program } from '../shader/Program';

// @ts-ignore
import SPRITES_VS from 'assets/shaders/sprites/sprites.vs.glsl';
// @ts-ignore
import SPRITES_FS from 'assets/shaders/sprites/sprites.fs.glsl';
import { mat4, vec2, vec3 } from 'gl-matrix';
import { ArrayBufferDrawable, GLDrawable, MappedBuffer } from '../buffers/GLDrawable';
import { BufferUsage } from '../buffers/BufferEnums';
import { PartialVertexAttribute } from '../buffers/VertextArray';

export async function newSprites(container: SandboxContainer): Promise<Sprites> {
  return new Sprites(
    container.gl,
    await container.programLoader.loadProgram({
      vsSource: SPRITES_VS,
      fsSource: SPRITES_FS,
      attributeLocations: { a_vertexPos: 0, a_vertexUV: 0, a_spriteMatrix: 0 },
      uniformLocations: { u_viewMatrix: null }
    })
  );
}

export interface SpritesAttributes {
  a_vertexPos: number;
  a_vertexUV: number;
  a_spriteMatrix: number;
  a_textureRegion?: number;
}

export interface SpritesUniforms {
  u_viewMatrix: WebGLUniformLocation | null;
}

export const FLOAT_BYTES = 4;

export interface Sprite {
  origin: vec2;
  pos: vec2;
  size: vec2;
  angle: number;
  scale: vec2;
  zindex: number;
}

export class Sprites<S extends Sprite = Sprite> implements Deletable, Bindable, GLDrawable {
  private static readonly spriteMatrix = mat4.create();
  private static readonly spriteVector = vec3.create();

  readonly drawable: ArrayBufferDrawable;
  private readonly viewMatrix = mat4.create();
  private readonly instancesBuffer: MappedBuffer;

  readonly sprites: S[] = [];

  constructor(
    readonly gl: WebGL2RenderingContext,
    readonly program: Program<SpritesAttributes, SpritesUniforms>,
    readonly capacity = 100
  ) {
    this.drawable = new ArrayBufferDrawable(gl);
    this.newVertexBuffer();

    this.instancesBuffer = this.newInstancesBufffer();
    this.instancesBuffer.allocate(capacity * this.spriteFloats * FLOAT_BYTES, BufferUsage.DYNAMIC_DRAW);

    this.updateViewMatrix(gl.canvas);
  }

  add(...sprites: S[]): void {
    const spritesBuffer = new Float32Array(sprites.length * this.spriteFloats);
    let offset = 0;
    sprites.forEach(sprite => (offset += this.writeSpriteAttributes(sprite, spritesBuffer, offset)));
    this.instancesBuffer.setsubdata(spritesBuffer, this.sprites.length * this.spriteFloats * FLOAT_BYTES);
    this.sprites.push(...sprites);
  }

  updateSprite(index: number): void {
    this.updateSprites(index, 1);
  }

  updateSprites(offset = 0, length?: number): void {
    if (length === undefined) length = this.sprites.length - offset;
    const spritesBuffer = new Float32Array(length * this.spriteFloats);
    let floatOffset = 0;
    for (let index = 0; index < length; index++) {
      const sprite = this.sprites[offset + index];
      floatOffset += this.writeSpriteAttributes(sprite, spritesBuffer, floatOffset);
    }
    this.instancesBuffer.setsubdata(spritesBuffer, offset * this.spriteFloats * FLOAT_BYTES);
  }

  /**
   * Sprite attributes size in bytes
   */
  protected get spriteFloats(): number {
    return 4 * 4;
  }

  protected writeSpriteAttributes(sprite: S, buffer: Float32Array, offset: number): number {
    const trs = this.spriteMatrix(sprite, Sprites.spriteMatrix);
    buffer.set(trs, offset);
    return trs.length;
  }

  updateViewMatrix(dim: Dimension): void {
    this.program.use();
    mat4.ortho(this.viewMatrix, 0, dim.width, dim.height, 0, 1, -1);
    this.gl.uniformMatrix4fv(this.program.uniformLocations.u_viewMatrix, false, this.viewMatrix);
  }

  private spriteMatrix(sprite: S, trs: mat4): mat4 {
    const v = Sprites.spriteVector;
    mat4.identity(trs);
    mat4.translate(trs, trs, vec3.set(v, sprite.pos[0], sprite.pos[1], -sprite.zindex));
    mat4.rotateZ(trs, trs, sprite.angle);
    mat4.scale(trs, trs, vec3.set(v, sprite.scale[0], sprite.scale[1], 1));
    mat4.translate(trs, trs, vec3.set(v, -sprite.origin[0], -sprite.origin[1], 0));
    mat4.scale(trs, trs, vec3.set(v, sprite.size[0], sprite.size[1], 1));
    return trs;
  }

  private newInstancesBufffer(): MappedBuffer {
    const attributes = this.createInstanceAttributes({ stride: this.spriteFloats * FLOAT_BYTES, attribDivisor: 1 });
    return this.drawable.mapInstances(attributes);
  }

  protected createInstanceAttributes(partialAttribute: Partial<PartialVertexAttribute>): PartialVertexAttribute[] {
    const attribute = { ...partialAttribute, size: 4 };
    const attributes: PartialVertexAttribute[] = [];
    let offset = 0;
    const matrixLocation = this.program.attributeLocations.a_spriteMatrix;
    for (let col = 0; col < 4; col++) {
      attributes.push({ ...attribute, location: matrixLocation + col, offset: offset });
      offset += 4 * FLOAT_BYTES;
    }
    return attributes;
  }

  private newVertexBuffer(): MappedBuffer {
    const stride = 2 * 2 * 4;
    const attributes = [
      { location: this.program.attributeLocations.a_vertexPos, size: 2, stride: stride },
      { location: this.program.attributeLocations.a_vertexUV, size: 2, stride: stride, offset: 2 * 4 }
    ];
    const buffer = this.drawable.mapPositions(attributes);
    buffer.setdata(SPRITE_VERTICES);
    return buffer;
  }

  draw(): void {
    this.drawable.draw(6, 0, this.sprites.length);
  }

  bind(): Sprites {
    this.program.use();
    this.drawable.bind();
    return this;
  }

  unbind(): Sprites {
    this.drawable.unbind();
    return this;
  }

  delete(): void {
    this.drawable.delete();
  }
}

// prettier-ignore
const SPRITE_VERTICES = new Float32Array([
      0, 1, 0, 0,
      1, 0, 1, 1,
      0, 0, 0, 1,
      0, 1, 0, 0,
      1, 1, 1, 0,
      1, 0, 1, 1,
    ]);
