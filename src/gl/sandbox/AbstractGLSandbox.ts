import { vec2, vec4 } from 'gl-matrix';
import { GLSandbox, SandboxContainer, SandboxFactory } from './GLSandbox';

export function newSandboxFactory<R, P>(
  loader: ResourceLoader<R>,
  factory: AbstractSandboxFactory<R, P>
): SandboxFactory<P> {
  return async (container, name) => {
    const resource = await loader(container);
    return factory(container, name, resource);
  };
}

type ResourceLoader<R> = (container: SandboxContainer) => Promise<R>;

type AbstractSandboxFactory<R, P> = (
  container: SandboxContainer,
  name: string,
  resources: R
) => AbstractGLSandbox<R, P>;

export abstract class AbstractGLSandbox<R, P> implements GLSandbox<P> {
  protected _lastUpdate?: number;

  private _running = false;

  constructor(
    readonly container: SandboxContainer,
    readonly name: string,
    readonly resources: R,
    readonly parameters: P
  ) {
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
}
