import { Bindable, Deletable } from '../utils/GLUtils';
import { Dimension, SandboxContainer } from '../sandbox/GLSandbox';
import { Program } from '../shader/Program';
import { mat4, vec2 } from 'gl-matrix';
import { ArrayBufferDrawable, GLDrawable, MappedBuffer } from '../buffers/GLDrawable';
import { BufferUsage } from '../buffers/BufferEnums';
import { PartialVertexAttribute } from '../buffers/VertextArray';
import { Sprite } from './Sprite';
import { spriteFragmentShader, spriteVertexShader } from './SpriteShaders';
import { TextureAtlas } from './TextureAtlas';
import { UniformBuffer } from '../buffers/GLBuffers';

class SpritesAttributes {
  a_vertexPos = 0;
  a_vertexUV = 0;
  a_spriteMatrix = 0;
  a_texture = 0;
}

class SpritesUniforms {
  u_viewMatrix: WebGLUniformLocation | null = null;
  u_time: WebGLUniformLocation | null = null;
  u_textures: WebGLUniformLocation | null = null;
}

class SpritesUniformBlocks {
  u_regions = 0;
}

type SpritesProgram = Program<SpritesAttributes, SpritesUniforms, SpritesUniformBlocks>;

const FLOAT_BYTES = 4;
const MAT4_FLOATS = 4 * 4;
const SPRITE_FLOATS = MAT4_FLOATS + 4;
const SPRITE_BYTES = SPRITE_FLOATS * FLOAT_BYTES;

export class Sprites implements Deletable, Bindable, GLDrawable {
  readonly program: SpritesProgram;
  readonly drawable: ArrayBufferDrawable;

  private readonly viewMatrix = mat4.create();

  // instances buffer
  private readonly spritesBuffer: MappedBuffer;

  private readonly textureIndices: number[] = [];
  private readonly regionIndices: number[] = [];
  private readonly uniformBuffer: UniformBuffer;

  private _capacity = 0;

  readonly sprites: Sprite[] = [];

  constructor(readonly container: SandboxContainer, readonly atlases: TextureAtlas[], initialCapacity = 10) {
    const regionsCount = atlases.map(a => a.regions.length).reduce((prev, current) => prev + current, 0);
    this.program = this.newSpritesProgram(atlases.length, regionsCount);

    this.uniformBuffer = this.createUniformBuffer(regionsCount);

    this.drawable = new ArrayBufferDrawable(container.gl);
    this.newVertexBuffer();

    this.spritesBuffer = this.newSpriteInstancesBufffer();
    this.ensureCapacity(initialCapacity);
    this.updateViewMatrix(container.canvas);
  }

  get gl(): WebGL2RenderingContext {
    return this.container.gl;
  }

  get capacity(): number {
    return this._capacity;
  }

  addSprite(sprite: Partial<Sprite>): Sprite {
    return this.addSprites([sprite])[0];
  }

  addSprites(sprites: Partial<Sprite>[]): Sprite[] {
    this.ensureCapacity(this.sprites.length + sprites.length);
    const offset = this.sprites.length;
    const newSprites = sprites.map((s, i) => this.createSprite(offset + i, s));
    this.sprites.push(...newSprites);
    this.updateSprites(offset);
    return newSprites;
  }

  set time(time: number) {
    this.gl.uniform1f(this.program.uniformLocations.u_time, time);
  }

  updateSprite(index: number): void {
    this.updateSprites(index, 1);
  }

  updateSprites(offset = 0, length?: number): void {
    if (length === undefined) length = this.sprites.length - offset;
    const trs = mat4.create();
    if (length > 0) {
      const spritesBuffer = new Float32Array(length * SPRITE_FLOATS);
      for (let index = 0; index < length; index++) {
        const sprite = this.sprites[offset + index];
        sprite.transformMatrix(trs);
        const floatOffset = index * SPRITE_FLOATS;
        spritesBuffer.set(trs, floatOffset);
        if (sprite.animation) {
          if (sprite.animationStart < 0) sprite.animationStart = this.container.time;
          // x: animationStartTime (0 if not running), y : startFrame:int(region index), z : endFrame:int(region index), w: duration in seconds
          spritesBuffer[floatOffset + MAT4_FLOATS] = sprite.animationStart;
          spritesBuffer[floatOffset + MAT4_FLOATS + 1] = this.regionIndex(sprite.texture, sprite.animation.startRegion);
          spritesBuffer[floatOffset + MAT4_FLOATS + 2] = this.regionIndex(sprite.texture, sprite.animation.endRegion);
          spritesBuffer[floatOffset + MAT4_FLOATS + 3] = sprite.animation.duration;
        } else {
          spritesBuffer[floatOffset + MAT4_FLOATS] = -1;
          spritesBuffer[floatOffset + MAT4_FLOATS + 1] = this.regionIndex(sprite.texture, sprite.region);
          spritesBuffer[floatOffset + MAT4_FLOATS + 2] = 0;
          spritesBuffer[floatOffset + MAT4_FLOATS + 3] = 0;
        }
      }
      this.spritesBuffer.setsubdata(spritesBuffer, offset * SPRITE_BYTES);
    }
  }

  regionIndex(sprite: Sprite): number;
  regionIndex(texture: number, region: number): number;
  regionIndex(param: Sprite | number, region?: number): number {
    if (param instanceof Sprite) return this.regionIndex(param.texture, param.region);
    return this.regionIndices[param] + (region === undefined ? 0 : region);
  }

  updateViewMatrix(dim: Dimension): void {
    this.program.use();
    mat4.ortho(this.viewMatrix, 0, dim.width, dim.height, 0, 1, -1);
    this.gl.uniformMatrix4fv(this.program.uniformLocations.u_viewMatrix, false, this.viewMatrix);
  }

  draw(): void {
    this.drawable.draw(6, 0, this.sprites.length);
  }

  bind(): Sprites {
    this.program.use();
    this.drawable.bind();
    this.uniformBuffer.bind(0);
    this.atlases.forEach((a, i) => a.texture.activate(this.textureIndices[i]).bind());
    return this;
  }

  unbind(): Sprites {
    this.drawable.unbind();
    this.uniformBuffer.unbind(0);
    this.atlases.forEach(a => a.texture.unbind());
    return this;
  }

  delete(): void {
    this.drawable.delete();
    this.gl.useProgram(null);
    this.program.delete();
  }

  private createSprite(index: number, config: Partial<Sprite>): Sprite {
    const sprite = new Sprite(index);
    if (config.origin) vec2.copy(sprite.origin, config.origin);

    if (config.pos) vec2.copy(sprite.pos, config.pos);

    if (typeof config.texture === 'number') sprite.texture = config.texture;
    if (typeof config.region === 'number') sprite.region = config.region;

    if (config.animation) Object.assign(sprite.animation, config.animation);

    if (config.size) {
      vec2.copy(sprite.size, config.size);
    } else {
      const atlas = this.atlases[sprite.texture];
      const regionIndex = sprite.animation ? sprite.animation.startRegion : sprite.region;
      const region = atlas.regions[regionIndex];
      const texture = atlas.texture;
      sprite.size[0] = region.textureSize[0] * texture.width;
      sprite.size[1] = region.textureSize[1] * texture.height;
    }

    if (config.scale) vec2.copy(sprite.scale, config.scale);

    if (typeof config.angle === 'number') sprite.angle = config.angle;

    if (typeof config.zindex === 'number') sprite.zindex = config.zindex;

    return sprite;
  }

  private ensureCapacity(required: number): void {
    if (required > this._capacity) {
      this.spritesBuffer.allocate(required * SPRITE_BYTES, BufferUsage.DYNAMIC_DRAW);
      this._capacity = required;
      this.updateSprites();
    }
  }

  private newSpritesProgram(textures: number, regions: number): Program {
    const vs = spriteVertexShader(this.gl, regions);
    const fs = spriteFragmentShader(this.gl, textures);
    return new Program(this.gl, {
      attributeLocations: new SpritesAttributes(),
      uniformLocations: new SpritesUniforms(),
      uniformBlockLocations: new SpritesUniformBlocks()
    }).link([vs, fs]);
  }

  private newSpriteInstancesBufffer(): MappedBuffer {
    const attribute = { stride: SPRITE_BYTES, size: 4, attribDivisor: 1 };
    const attributes: PartialVertexAttribute[] = [];
    let offset = 0;
    const matrixLocation = this.program.attributeLocations.a_spriteMatrix;
    for (let col = 0; col < 4; col++) {
      attributes.push({ ...attribute, location: matrixLocation + col, offset: offset });
      offset += 4 * FLOAT_BYTES;
    }
    const textureLocation = this.program.attributeLocations.a_texture;
    attributes.push({
      ...attribute,
      location: textureLocation,
      offset: offset
    });
    return this.drawable.mapInstances(attributes);
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

  private createUniformBuffer(regionsCount: number): UniformBuffer {
    const textures = new Int32Array(regionsCount * 4);
    const regions = new Float32Array(regionsCount * 4);
    let regionIndex = 0;
    for (let atlasIndex = 0; atlasIndex < this.atlases.length; atlasIndex++) {
      const atlas = this.atlases[atlasIndex];
      const textureIndex = atlas.textureIndex === undefined ? atlasIndex : atlas.textureIndex;
      this.textureIndices[atlasIndex] = textureIndex;
      this.regionIndices[atlasIndex] = regionIndex;
      for (let i = 0; i < atlas.regions.length; i++) {
        const region = atlas.regions[i];
        const offset = regionIndex * 4;
        textures[offset] = textureIndex;
        regions.set(region.textureOffset, offset);
        regions.set(region.textureSize, offset + 2);
        regionIndex++;
      }
    }

    const ubo = new UniformBuffer(this.gl);
    ubo.allocate(regionsCount * 8 * 4); // foreach region : sizeof(ivec4 + vec4)
    ubo.setsubdata(textures, 0);
    ubo.setsubdata(regions, regionsCount * 4 * 4); // skip first floats
    this.gl.uniform1iv(this.program.uniformLocations.u_textures, this.textureIndices);
    this.program.bindUniformBlock(this.program.uniformBlockLocations.u_regions, 0);
    return ubo;
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
