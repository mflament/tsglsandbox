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

async function loadResources(container: SandboxContainer): Promise<BoidsResources> {
  // const texture = await new GLTexture2D(container.gl).bind().load({ uri: 'images/ant-walk.png' });
  const texture1 = await new GLTexture2D(container.gl).bind().load({ uri: 'images/momotte.jpg' });
  const texture2 = await new GLTexture2D(container.gl).bind().load({ uri: 'images/ant-walk.png' });
  const antRegions = 8 * 8 - 2;
  const sprites = new Sprites(container.gl, [
    new TextureAtlas(texture1),
    new TextureAtlas(texture2, splitRegions(8, 8, antRegions), [{ start: 0, duration: 0.8, frames: antRegions }])
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
    this.antSprite = this.sprites.addSprite({ pos: [120, 200], scale: [0.1, 0.1], texture: 1, region: 0 });
  }

  update(time = 0): void {
    this.sprites.time = time / 1000;
  }

  updateParams(): void {
    // TODO
  }

  delete(): void {
    this.sprites.delete();
    this.container.gl.useProgram(null);
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

  protected start(): void {
    super.start();
    const sprite = this.resources.antSprite;
    sprite.startAnimation(1, 0);
    this.resources.sprites.updateSprite(sprite.index);
  }

  onkeydown(e: KeyboardEvent): void {
    if (e.key.toLowerCase() === 'n') {
      // this.resources.updateAntSprite();
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
