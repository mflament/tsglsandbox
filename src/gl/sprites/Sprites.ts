import {mat4, vec2} from 'gl-matrix';
import {BufferUsage, DrawMode} from '../buffers/BufferEnums';
import {UniformBuffer} from '../buffers/UniformBuffer';
import {BufferAttribute, VertexBuffer} from '../buffers/VertexBuffer';
import {InstancedDrawable} from '../drawable/GLDrawable';
import {AbstractDeletable, Bindable} from '../GLUtils';
import {SandboxContainer} from '../sandbox/GLSandbox';
import {Program} from '../shader/Program';
import {Sprite} from './Sprite';
import {TextureAtlas} from './TextureAtlas';

interface SpritesVertexAttributes {
  a_vertexPos: BufferAttribute;
  a_vertexUV: BufferAttribute;
}

interface SpritesInstancesAttributes {
  a_spriteMatrix0: BufferAttribute;
  a_spriteMatrix1: BufferAttribute;
  a_spriteMatrix2: BufferAttribute;
  a_spriteMatrix3: BufferAttribute;
  a_texture: BufferAttribute;
}

class SpritesUniforms {
  u_viewMatrix: WebGLUniformLocation | null = null;
  u_time: WebGLUniformLocation | null = null;
  u_textures: WebGLUniformLocation | null = null;
}

class SpritesUniformBlocks {
  u_regions = 0;
}

type SpritesProgram = Program<SpritesUniforms, SpritesUniformBlocks>;

const FLOAT_BYTES = 4;
const MAT4_FLOATS = 4 * 4;
const SPRITE_FLOATS = MAT4_FLOATS + 4;
const SPRITE_BYTES = SPRITE_FLOATS * FLOAT_BYTES;

export class Sprites extends AbstractDeletable implements Bindable {
  static async create(
    container: SandboxContainer,
    atlases: TextureAtlas[],
    initialCapacity?: number
  ): Promise<Sprites> {
    const regionsCount = atlases.map(a => a.regions.length).reduce((prev, current) => prev + current, 0);
    const program = await container.programLoader.load({
      path: 'sprites/sprites.glsl',
      uniformLocations: new SpritesUniforms(),
      uniformBlockIndices: new SpritesUniformBlocks(),
      defines: { REGIONS_COUNT: regionsCount, TEXTURES_COUNT: atlases.length }
    });
    return new Sprites(container, atlases, program, regionsCount, initialCapacity);
  }

  readonly drawable: InstancedDrawable;

  private readonly viewMatrix = mat4.create();

  // instances buffer
  private readonly spritesBuffer: VertexBuffer<SpritesInstancesAttributes>;

  private readonly textureIndices: number[] = [];
  private readonly regionIndices: number[] = [];
  private readonly uniformBuffer: UniformBuffer;

  private _capacity = 0;

  readonly sprites: Sprite[] = [];

  private constructor(
    readonly container: SandboxContainer,
    readonly atlases: TextureAtlas[],
    readonly program: SpritesProgram,
    readonly regionsCount: number,
    initialCapacity = 10
  ) {
    super();
    this.uniformBuffer = this.createUniformBuffer();
    const gl = container.canvas.gl;
    const vertices = new VertexBuffer<SpritesVertexAttributes>(gl, {
      a_vertexPos: { size: 2 },
      a_vertexUV: { size: 2 }
    })
      .bind()
      .setdata(SPRITE_VERTICES);

    const instances = new VertexBuffer<SpritesInstancesAttributes>(gl, {
      a_spriteMatrix0: { size: 4 },
      a_spriteMatrix1: { size: 4 },
      a_spriteMatrix2: { size: 4 },
      a_spriteMatrix3: { size: 4 },
      a_texture: { size: 4 }
    });
    this.drawable = new InstancedDrawable(
      gl,
      DrawMode.TRIANGLES,
      {
        buffer: vertices,
        locations: {
          a_vertexPos: 0,
          a_vertexUV: 1
        }
      },
      {
        buffer: instances,
        locations: {
          a_spriteMatrix0: 2,
          a_spriteMatrix1: 3,
          a_spriteMatrix2: 4,
          a_spriteMatrix3: 5,
          a_texture: 6
        }
      }
    );

    this.spritesBuffer = instances;
    this.ensureCapacity(initialCapacity);
    this.updateViewMatrix(container.canvas);
  }

  get gl(): WebGL2RenderingContext {
    return this.container.canvas.gl;
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

  clear(): void {
    this.sprites.splice(0, this.sprites.length);
    this.updateSprites();
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

  updateViewMatrix(dim: { width: number; height: number }): void {
    this.program.use();
    mat4.ortho(this.viewMatrix, 0, dim.width, dim.height, 0, 1, -1);
    this.gl.uniformMatrix4fv(this.program.uniformLocations.u_viewMatrix, false, this.viewMatrix);
  }

  draw(): void {
    this.drawable.draw(this.sprites.length);
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
    this.program.delete();
    super.delete();
  }

  private createSprite(index: number, config: Partial<Sprite>): Sprite {
    const sprite = new Sprite(index);
    if (config.origin) vec2.copy(sprite.origin, config.origin);

    if (config.pos) vec2.copy(sprite.pos, config.pos);

    if (typeof config.texture === 'number') sprite.texture = config.texture;
    if (typeof config.region === 'number') sprite.region = config.region;

    if (config.animation) Object.assign(sprite.animation, config.animation);

    if (config.scale) vec2.copy(sprite.scale, config.scale);

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

    if (typeof config.angle === 'number') sprite.angle = config.angle;

    if (typeof config.zindex === 'number') sprite.zindex = config.zindex;

    return sprite;
  }

  private ensureCapacity(required: number): void {
    if (required > this._capacity) {
      this.spritesBuffer.allocate(required * SPRITE_BYTES, BufferUsage.STATIC_DRAW);
      this._capacity = required;
      this.updateSprites();
    }
  }

  private createUniformBuffer(): UniformBuffer {
    const textures = new Int32Array(this.regionsCount * 4);
    const regions = new Float32Array(this.regionsCount * 4);
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

    const ubo = new UniformBuffer(this.gl).bind();
    ubo.allocate(this.regionsCount * 8 * 4); // foreach region : sizeof(ivec4 + vec4)
    ubo.setsubdata(textures, 0);
    ubo.setsubdata(regions, this.regionsCount * 4 * 4); // skip first floats
    this.gl.uniform1iv(this.program.uniformLocations.u_textures, this.textureIndices);
    this.program.bindUniformBlock(this.program.uniformBlockIndices.u_regions, 0);
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
