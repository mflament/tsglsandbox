import {
  AbstractGLSandbox,
  GLTexture2D,
  SandboxContainer,
  SandboxFactory,
  splitRegions,
  Sprite,
  Sprites,
  TextureAtlas
} from 'gl';
import {SandboxEventHandler} from "../../gl/sandbox/ActionManager";

class AntsParameters {
}

const ANT_REGIONS = 8 * 8 - 2;

class GLAnts extends AbstractGLSandbox<AntsParameters> implements SandboxEventHandler {
  static async create(container: SandboxContainer, name: string, parameters?: AntsParameters): Promise<GLAnts> {
    const texture = await new GLTexture2D(container.canvas.gl).bind().load({uri: 'images/ant-walk.png'});
    const sprites = await Sprites.create(container, [new TextureAtlas(texture, splitRegions(8, 8, ANT_REGIONS))]);
    sprites.bind();
    return new GLAnts(container, name, sprites, parameters);
  }

  readonly antSprite: Sprite;

  constructor(container: SandboxContainer, name: string, readonly sprites: Sprites, parameters?: AntsParameters) {
    super(container, name, parameters);
    const gl = container.canvas.gl;
    gl.enable(WebGL2RenderingContext.DEPTH_TEST);
    gl.enable(WebGL2RenderingContext.BLEND);
    gl.blendFunc(WebGL2RenderingContext.SRC_ALPHA, WebGL2RenderingContext.ONE_MINUS_SRC_ALPHA);
    const scale = 0.6;
    this.sprites.bind();
    this.antSprite = this.sprites.addSprite({pos: [120, 200], scale: [scale, scale], texture: 0, region: 0});
    this.antSprite.animation = {startRegion: 0, endRegion: ANT_REGIONS, duration: 0.8};
    this.sprites.updateSprite(this.antSprite.index);
  }

  createDefaultParameters(): AntsParameters {
    return new AntsParameters();
  }

  render(): void {
    this.clear(
      [0.23, 0.15, 0.15, 1],
      WebGL2RenderingContext.COLOR_BUFFER_BIT | WebGL2RenderingContext.DEPTH_BUFFER_BIT
    );
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
        this.sprites.updateSprite(sprite.index);
      }
    }
  }

  update(time: number): void {
    this.sprites.time = time;
  }

  onresize(dim: { width: number; height: number }): void {
    this.sprites.updateViewMatrix(dim);
  }

  delete(): void {
    this.sprites.delete();
    this.gl.disable(WebGL2RenderingContext.DEPTH_TEST);
    this.gl.disable(WebGL2RenderingContext.BLEND);
  }
}

export function ants(): SandboxFactory<AntsParameters> {
  return GLAnts.create;
}
