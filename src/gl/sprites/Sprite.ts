import { mat4, vec2, vec3 } from 'gl-matrix';

export interface Animation {
  startRegion: number;
  endRegion: number;
  duration: number;
}

export class Sprite {
  private static readonly spriteVector = vec3.create();

  readonly origin: vec2 = [0, 0];
  readonly pos: vec2 = [0, 0];
  readonly size: vec2 = [32, 32];
  readonly scale: vec2 = [1, 1];

  angle = 0;
  zindex = 0;

  texture = 0;
  region = 0;

  private _animation?: Animation;
  animationStart = -1;

  constructor(readonly index: number) {}

  get animation(): Animation | undefined {
    return this._animation;
  }

  set animation(animation: Animation | undefined) {
    this._animation = animation;
    this.animationStart = 0;
  }

  setRegion(texture: number, region: number): void {
    this.texture = texture;
    this.region = region;
  }

  transformMatrix(trs: mat4): mat4 {
    const v = Sprite.spriteVector;
    mat4.identity(trs);
    mat4.translate(trs, trs, vec3.set(v, this.pos[0], this.pos[1], -this.zindex));
    mat4.rotateZ(trs, trs, this.angle);
    mat4.scale(trs, trs, vec3.set(v, this.scale[0], this.scale[1], 1));
    mat4.translate(trs, trs, vec3.set(v, -this.origin[0], -this.origin[1], 0));
    mat4.scale(trs, trs, vec3.set(v, this.size[0], this.size[1], 1));
    return trs;
  }
}
