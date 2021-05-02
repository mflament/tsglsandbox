import { Deletable } from '../gl/utils/GLUtils';
import { SandboxContainer, SandboxFactory } from '../gl/sandbox/GLSandbox';
import { AbstractGLSandbox, newSandboxFactory } from '../gl/sandbox/AbstractGLSandbox';
import { Sprites } from '../gl/sprites/Sprites';
import { Sprite } from '../gl/sprites/Sprite';
import { GLTexture2D } from '../gl/texture/GLTexture';
import { splitRegions, TextureAtlas } from '../gl/sprites/TextureAtlas';
import { vec2 } from 'gl-matrix';

interface AntsParameters {
  count: number;
  accel: number;
  speed: number;
}

const ANT_REGIONS = 8 * 8 - 2;

async function loadResources(container: SandboxContainer): Promise<AntsResources> {
  const texture = await new GLTexture2D(container.gl).bind().load({ uri: 'images/ant-walk.png' });
  const sprites = new Sprites(container, [new TextureAtlas(texture, splitRegions(8, 8, ANT_REGIONS))]).bind();
  const parameters = { count: 1, accel: 4, speed: 2 };
  window.hashlocation.parseParams(parameters);
  return new AntsResources(container, sprites, parameters);
}

class AntsResources implements Deletable {
  readonly antSprite: Sprite;

  constructor(readonly container: SandboxContainer, readonly sprites: Sprites, readonly parameters: AntsParameters) {
    container.gl.enable(WebGL2RenderingContext.DEPTH_TEST);
    container.gl.enable(WebGL2RenderingContext.BLEND);
    container.gl.blendFunc(WebGL2RenderingContext.SRC_ALPHA, WebGL2RenderingContext.ONE_MINUS_SRC_ALPHA);
    const scale = 0.6;
    this.antSprite = this.sprites.addSprite({ pos: [120, 200], scale: [scale, scale], texture: 0, region: 0 });
    this.antSprite.animation = { startRegion: 0, endRegion: ANT_REGIONS, duration: 0.8 };
    this.sprites.updateSprite(this.antSprite.index);
  }

  update(time = 0): void {
    this.sprites.time = time;
  }

  updateParams(): void {
    // TODO
  }

  delete(): void {
    this.sprites.delete();
    this.container.gl.disable(WebGL2RenderingContext.DEPTH_TEST);
    this.container.gl.disable(WebGL2RenderingContext.BLEND);
  }
}

class GLAnts extends AbstractGLSandbox<AntsResources, AntsParameters> {
  constructor(container: SandboxContainer, name: string, resources: AntsResources) {
    super(container, name, resources, resources.parameters);
    // this.running = true;
  }

  render(): void {
    this.clear([0.9, 0.9, 0.9, 1], WebGL2RenderingContext.COLOR_BUFFER_BIT | WebGL2RenderingContext.DEPTH_BUFFER_BIT);
    this.resources.sprites.bind().draw();
  }

  onkeydown(e: KeyboardEvent): void {
    const sprite = this.resources.antSprite;
    if (sprite.animation) {
      let newDuration = sprite.animation.duration;
      switch (e.key.toLowerCase()) {
        case '+':
          newDuration -= 0.1;
          break;
        case '-':
          newDuration += 0.1;
          break;
      }

      newDuration = Math.max(newDuration, 1 / 1000);
      if (newDuration != sprite.animation.duration) {
        const elapsed = this.container.time - sprite.animationStart;
        const cpct = (elapsed % sprite.animation.duration) / sprite.animation.duration;
        sprite.animation.duration = newDuration;
        sprite.animationStart = this.container.time - newDuration * cpct;
        console.log('new duration : ' + sprite.animation.duration);
        this.resources.sprites.updateSprite(sprite.index);
      }
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

  onresize(dim: vec2): void {
    this.resources.sprites.updateViewMatrix(dim);
  }
}

export function ants(): SandboxFactory<AntsParameters> {
  return newSandboxFactory(loadResources, (container, name, resources) => new GLAnts(container, name, resources));
}
