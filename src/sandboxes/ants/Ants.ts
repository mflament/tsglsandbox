import {
  AbstractGLSandbox,
  SandboxContainer,
  SandboxFactory,
  Sprites,
  Sprite,
  GLTexture2D,
  splitRegions,
  TextureAtlas
} from 'gl';

import { vec2 } from 'gl-matrix';

interface AntsParameters {
  count: number;
  accel: number;
  speed: number;
}

const ANT_REGIONS = 8 * 8 - 2;

class GLAnts extends AbstractGLSandbox<AntsParameters> {
  static async create(container: SandboxContainer, name: string): Promise<GLAnts> {
    const texture = await new GLTexture2D(container.gl).bind().load({ uri: 'images/ant-walk.png' });
    const sprites = await Sprites.create(container, [new TextureAtlas(texture, splitRegions(8, 8, ANT_REGIONS))]);
    sprites.bind();
    const parameters = { count: 1, accel: 4, speed: 2 };
    window.hashLocation.parseParams(parameters);
    return new GLAnts(container, name, parameters, sprites);
  }

  readonly antSprite: Sprite;

  constructor(container: SandboxContainer, name: string, parameters: AntsParameters, readonly sprites: Sprites) {
    super(container, name, parameters);
    container.gl.enable(WebGL2RenderingContext.DEPTH_TEST);
    container.gl.enable(WebGL2RenderingContext.BLEND);
    container.gl.blendFunc(WebGL2RenderingContext.SRC_ALPHA, WebGL2RenderingContext.ONE_MINUS_SRC_ALPHA);
    const scale = 0.6;
    this.sprites.bind();
    this.antSprite = this.sprites.addSprite({ pos: [120, 200], scale: [scale, scale], texture: 0, region: 0 });
    this.antSprite.animation = { startRegion: 0, endRegion: ANT_REGIONS, duration: 0.8 };
    this.sprites.updateSprite(this.antSprite.index);
  }

  render(): void {
    this.clear([0.9, 0.9, 0.9, 1], WebGL2RenderingContext.COLOR_BUFFER_BIT | WebGL2RenderingContext.DEPTH_BUFFER_BIT);
    this.sprites.draw();
  }

  onkeydown(e: KeyboardEvent): void {
    const sprite = this.antSprite;
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
        this.sprites.updateSprite(sprite.index);
      }
    }
  }

  update(time: number): void {
    this.sprites.time = time;
  }

  onresize(dim: vec2): void {
    this.sprites.updateViewMatrix(dim);
  }

  delete(): void {
    this.sprites.delete();
    this.container.gl.disable(WebGL2RenderingContext.DEPTH_TEST);
    this.container.gl.disable(WebGL2RenderingContext.BLEND);
  }
}

export function ants(): SandboxFactory<AntsParameters> {
  return GLAnts.create;
}
