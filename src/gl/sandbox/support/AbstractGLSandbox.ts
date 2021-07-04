import { vec2, vec4 } from 'gl-matrix';
import { AbstractDeletable, isDeletable } from '../../GLUtils';
import { GLSandbox, SandboxCanvas, SandboxContainer, SandboxEventHandler } from '../GLSandbox';

function deepClone(src: any, dst: any): any {
  if (Array.isArray(src)) {
    const dstar = dst as any[];
    dstar.splice(0, dstar.length, ...src);
  } else if (typeof src === 'object') {
    Object.keys(src)
      .filter(k => dst[k] !== undefined && typeof dst[k] === typeof src[k])
      .forEach(k => (dst[k] = deepClone(src[k], dst[k])));
  } else {
    dst = src;
  }
  return dst;
}

export abstract class AbstractGLSandbox<P = any> extends AbstractDeletable implements GLSandbox<P> {
  private _running = false;
  ups = 60;
  private _parameters: P;

  constructor(readonly container: SandboxContainer, readonly name: string, readonly defaultParameters: P) {
    super();
    const prototype = Object.getPrototypeOf(defaultParameters);
    this._parameters = new prototype.constructor();
    deepClone(defaultParameters, this._parameters);
  }

  abstract render(): void;

  protected clear(color: vec4 = [0, 0, 0, 1], mask = WebGL2RenderingContext.COLOR_BUFFER_BIT): void {
    this.gl.colorMask(true, true, true, true);
    this.gl.clearColor(color[0], color[1], color[2], color[3]);
    this.gl.clear(mask);
  }

  onparameterchange(): void {
    // noop
  }

  get parameters(): P {
    return this._parameters;
  }

  set parameters(params: P) {
    deepClone(params, this._parameters);
    this.onparameterchange();
  }

  get eventHandler(): Partial<SandboxEventHandler> | undefined {
    return this as Partial<SandboxEventHandler>;
  }

  delete(): void {
    for (const value of Object.values(this)) {
      if (isDeletable(value)) value.delete();
    }
    super.delete();
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

  protected get canvas(): SandboxCanvas {
    return this.container.canvas;
  }

  protected get gl(): WebGL2RenderingContext {
    return this.canvas.gl;
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
    vec2.set(out, (x / this.canvas.width) * 2 - 1, (1 - y / this.canvas.height) * 2 - 1);
    return out;
  }
}
