import { Deletable } from '../gl/utils/GLUtils';
import { Dimension, SandboxContainer, SandboxFactory } from '../gl/sandbox/GLSandbox';
import { AbstractGLSandbox, sandboxFactory } from '../gl/sandbox/AbstractGLSandbox';
import { Sprites } from '../gl/sprites/Sprites';
import { GLTexture2D } from '../gl/texture/GLTexture';
import {
  createRegions,
  newTexturedSprites,
  TexturedSprite,
  TexturedSprites,
  TextureRegion
} from '../gl/sprites/TexturedSprites';
import { vec2 } from 'gl-matrix';

interface BoidsParameters {
  count: number;
  accel: number;
  speed: number;
}

export type AntSprite = TexturedSprite & { textureIndex: number };

async function loadResources(container: SandboxContainer): Promise<BoidsResources> {
  const texture = await new GLTexture2D(container.gl).bind().load({ uri: 'images/ant-walk.png' });
  const texturedSprites = await newTexturedSprites(container, texture);
  const parameters = { count: 1, accel: 4, speed: 2 };
  window.hashlocation.parseParams(parameters);
  return new BoidsResources(container, texturedSprites, parameters);
}

class BoidsResources implements Deletable {
  readonly textureRegions: TextureRegion[];
  readonly antSprite: AntSprite;

  constructor(
    readonly container: SandboxContainer,
    readonly texturedSprites: TexturedSprites,
    readonly parameters: BoidsParameters
  ) {
    container.gl.enable(WebGL2RenderingContext.DEPTH_TEST);
    container.gl.enable(WebGL2RenderingContext.BLEND);
    container.gl.blendFunc(WebGL2RenderingContext.SRC_ALPHA, WebGL2RenderingContext.ONE_MINUS_SRC_ALPHA);
    this.textureRegions = createRegions(8, 8, 8 * 8 - 2);
    const antWidht = texturedSprites.texture.width * this.textureRegions[0].textureSize[0];
    const antHeight = texturedSprites.texture.height * this.textureRegions[0].textureSize[1];
    this.antSprite = {
      pos: [500, 250],
      origin: [antWidht / 2, antHeight / 2],
      size: [antWidht, antHeight],
      angle: Math.PI / 2,
      scale: [0.2, 0.2],
      zindex: 0,
      textureIndex: 0,
      ...this.textureRegions[0]
    };
    texturedSprites.add(this.antSprite);
  }

  get sprites(): Sprites[] {
    return [this.texturedSprites];
  }

  update(time = 0): void {
    const textureRegions = this.textureRegions;
    if (textureRegions.length === 0) return;
    const mod = time % ANIMATION_TIME;
    const newIndex = Math.floor((mod / ANIMATION_TIME) * textureRegions.length);
    this.updateAntSprite(newIndex);
  }

  updateAntSprite(newIndex = this.antSprite.textureIndex + 1): void {
    if (newIndex >= this.textureRegions.length) newIndex = 0;
    //this.antSprite.angle -= Math.PI / 360;
    vec2.add(this.antSprite.pos, this.antSprite.pos, [0.5, 0]);
    if (newIndex !== this.antSprite.textureIndex) {
      const region = this.textureRegions[newIndex];
      vec2.copy(this.antSprite.textureOffset, region.textureOffset);
      vec2.copy(this.antSprite.textureSize, region.textureSize);
      this.antSprite.textureIndex = newIndex;
    }
    this.texturedSprites.updateSprite(0);
  }

  updateParams(): void {
    // TODO
  }

  delete(): void {
    this.sprites.forEach(sprites => sprites.unbind().delete());
    this.texturedSprites.texture.unbind().delete();
    this.container.gl.useProgram(null);
    this.container.gl.disable(WebGL2RenderingContext.DEPTH_TEST);
    this.container.gl.disable(WebGL2RenderingContext.BLEND);
  }
}

const ANIMATION_TIME = 800;

class GLBoids extends AbstractGLSandbox<BoidsResources, BoidsParameters> {
  constructor(container: SandboxContainer, name: string, resources: BoidsResources) {
    super(container, name, resources, resources.parameters);

    // this.running = true;
  }

  render(): void {
    this.clear([0.9, 0.9, 0.9, 1], WebGL2RenderingContext.COLOR_BUFFER_BIT | WebGL2RenderingContext.DEPTH_BUFFER_BIT);
    this.resources.sprites.forEach(sprites => sprites.bind().draw());
  }

  onkeydown(e: KeyboardEvent): void {
    if (e.key.toLowerCase() === 'n') {
      this.resources.updateAntSprite();
    }
  }

  update(time: number): void {
    this.resources.update(time);
  }

  delete(): void {
    super.delete();
    this.resources.delete();
  }

  onParametersChanged(): void {
    this.resources.updateParams();
  }

  onresize(dim: Dimension): void {
    this.resources.sprites.forEach(sprites => sprites.updateViewMatrix(dim));
  }
}

export function boids(): SandboxFactory<BoidsParameters> {
  return sandboxFactory(loadResources, (container, name, resources) => new GLBoids(container, name, resources));
}
