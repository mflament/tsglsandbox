import { Deletable } from '../gl/utils/GLUtils';
import { Dimension, SandboxContainer, SandboxFactory } from '../gl/sandbox/GLSandbox';
import { AbstractGLSandbox, sandboxFactory } from '../gl/sandbox/AbstractGLSandbox';
import { Sprites } from '../gl/sprites/Sprites';
import { Sprite } from '../gl/sprites/Sprite';
import { GLTexture2D } from '../gl/texture/GLTexture';
import { splitRegions, TextureAtlas } from '../gl/sprites/TextureAtlas';

interface BoidsParameters {
  count: number;
  accel: number;
  speed: number;
}

const ANT_REGIONS = 8 * 8 - 2;

async function loadResources(container: SandboxContainer): Promise<BoidsResources> {
  // const texture = await new GLTexture2D(container.gl).bind().load({ uri: 'images/ant-walk.png' });
  const texture1 = await new GLTexture2D(container.gl).bind().load({ uri: 'images/momotte.jpg' });
  const texture2 = await new GLTexture2D(container.gl).bind().load({ uri: 'images/ant-walk.png' });
  const sprites = new Sprites(container, [
    new TextureAtlas(texture1),
    new TextureAtlas(texture2, splitRegions(8, 8, ANT_REGIONS))
  ]).bind();
  const parameters = { count: 1, accel: 4, speed: 2 };
  window.hashlocation.parseParams(parameters);
  return new BoidsResources(container, sprites, parameters);
}

class BoidsResources implements Deletable {
  // readonly textureRegions: TextureRegion[];
  readonly antSprite: Sprite;

  constructor(readonly container: SandboxContainer, readonly sprites: Sprites, readonly parameters: BoidsParameters) {
    container.gl.enable(WebGL2RenderingContext.DEPTH_TEST);
    container.gl.enable(WebGL2RenderingContext.BLEND);
    container.gl.blendFunc(WebGL2RenderingContext.SRC_ALPHA, WebGL2RenderingContext.ONE_MINUS_SRC_ALPHA);
    // this.sprites.addSprite({ pos: [150, 100], size: [64, 64] });
    const scale = 0.6;
    this.antSprite = this.sprites.addSprite({ pos: [120, 200], scale: [scale, scale], texture: 1, region: 0 });
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

class GLBoids extends AbstractGLSandbox<BoidsResources, BoidsParameters> {
  constructor(container: SandboxContainer, name: string, resources: BoidsResources) {
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
      let dirty = false;
      switch (e.key.toLowerCase()) {
        case '+':
          sprite.animation.duration -= 0.1;
          dirty = true;
          break;
        case '-':
          sprite.animation.duration += 0.1;
          dirty = true;
          break;
      }
      if (dirty) this.resources.sprites.updateSprite(sprite.index);
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
    this.resources.sprites.updateViewMatrix(dim);
  }
}

export function boids(): SandboxFactory<BoidsParameters> {
  return sandboxFactory(loadResources, (container, name, resources) => new GLBoids(container, name, resources));
}
