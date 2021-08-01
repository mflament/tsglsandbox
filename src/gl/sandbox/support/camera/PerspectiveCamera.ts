import {mat4} from 'gl-matrix';
import {Partial} from "rollup-plugin-typescript2/dist/partial";

interface PerspectiveCameraConfig {
  fov: number;
  aspect: number;
  near: number;
  far: number;
}

function defaultConfig(): PerspectiveCameraConfig {
  return {
    fov: 50,
    aspect: 1,
    near: 0.1,
    far: 2000
  };
}

export class PerspectiveCamera implements PerspectiveCameraConfig {
  private readonly _projection = mat4.create();

  private readonly config: PerspectiveCameraConfig;
  private dirty = false;

  constructor(config?: Partial<PerspectiveCameraConfig>) {
    this.config = {...defaultConfig(), ...config};
  }

  get fov(): number {
    return this.config.fov;
  }

  set fov(fov: number) {
    this.config.fov = fov;
    this.dirty = true;
  }

  get aspect(): number {
    return this.config.aspect;
  }

  set aspect(aspect: number) {
    this.config.aspect = aspect;
    this.dirty = true;
  }

  get near(): number {
    return this.config.near;
  }

  set near(near: number) {
    this.config.near = near;
    this.dirty = true;
  }

  get far(): number {
    return this.config.far;
  }

  set far(far: number) {
    this.config.far = far;
    this.dirty = true;
  }

  get projection(): mat4 {
    if (this.dirty) {
      this.updateProjectionMatrix()
      this.dirty = false;
    }
    return this._projection;
  }

  private updateProjectionMatrix(): void {
    const config = this.config;
    mat4.perspective(this._projection, config.fov, config.aspect, config.near, config.far);
  }

}
