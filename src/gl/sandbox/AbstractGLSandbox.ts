import { vec2, vec4 } from 'gl-matrix';
import { isDeletable } from '../utils/GLUtils';
import { GLSandbox, SandboxContainer } from './GLSandbox';

export abstract class AbstractGLSandbox<P = any> implements GLSandbox<P> {
  protected _lastUpdate?: number;

  private _running = false;

  constructor(readonly container: SandboxContainer, readonly name: string, readonly parameters: P) {
    window.hashlocation.parseParams(parameters);
    // replace current hash parameters with updated sandbox parameters
    window.hashlocation.update(name, parameters);
    this.hashchanged = this.hashchanged.bind(this);
    window.addEventListener('hashchange', this.hashchanged);
  }

  abstract render(): void;

  protected clear(color: vec4 = [0, 0, 0, 1], mask = WebGL2RenderingContext.COLOR_BUFFER_BIT): void {
    this.gl.colorMask(true, true, true, true);
    this.gl.clearColor(color[0], color[1], color[2], color[3]);
    this.gl.clear(mask);
  }

  delete(): void {
    window.removeEventListener('hashchange', this.hashchanged);
    for (const value of Object.values(this)) {
      if (isDeletable(value)) value.delete();
    }
  }

  protected onParametersChanged(): void {
    // no op
  }

  get running(): boolean {
    return this._running;
  }

  set running(r: boolean) {
    if (this._running && !r) this.stop();
    else if (!this._running && r) this.start();
  }

  protected start(): void {
    this._running = true;
  }

  protected stop(): void {
    this._running = false;
  }

  private hashchanged(): void {
    window.hashlocation.parseParams(this.parameters);
    this.onParametersChanged();
  }

  protected get gl(): WebGL2RenderingContext {
    return this.container.gl;
  }

  protected get dimension(): vec2 {
    return this.container.dimension;
  }

  clientToWorld(e: MouseEvent | TouchEvent, out?: vec2): vec2 {
    out = out ? out : vec2.create();
    let x, y;
    if (e instanceof MouseEvent) {
      x = e.offsetX;
      y = e.offsetY;
    } else {
      x = e.touches[0].clientX;
      y = e.touches[0].clientX;
    }
    vec2.set(out, (x / this.dimension[0]) * 2 - 1, (1 - y / this.dimension[1]) * 2 - 1);
    return out;
  }
}
