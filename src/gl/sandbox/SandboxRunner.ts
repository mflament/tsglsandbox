import { parseHash } from '../../utils/HashParser';
import { checkNull } from '../gl-utils';
import { Dimension, GLSandbox, SandboxContainer, SandboxParams } from './GLSandbox';

export class SandboxRunner implements SandboxContainer {
  readonly containerElement: HTMLElement;
  readonly canvas: HTMLCanvasElement;
  readonly gl: WebGL2RenderingContext;
  private _params: SandboxParams = {};

  private sandbox?: GLSandbox;

  constructor(readonly sandboxes: GLSandbox[], container = document.getElementById('sandbox')) {
    if (!container) throw new Error('No container');
    this.containerElement = container;

    this.canvas = document.createElement('canvas');
    container.append(this.canvas);

    this.gl = checkNull(() => this.canvas.getContext('webgl2'));
    window.addEventListener('resize', () => this.onresize());
    this.onresize();

    this.canvas.onmousedown = e => this.onmousedown(e);
    this.canvas.onmouseup = e => this.onmouseup(e);
    this.canvas.onmousemove = e => this.onmousemove(e);
    this.canvas.onwheel = e => this.onwheel(e);
    this.containerElement.onkeydown = e => this.onkeydown(e);
    this.containerElement.onkeyup = e => this.onkeyup(e);

    window.onhashchange = () => this.hashchanged();
    this.hashchanged();
  }

  start() {
    const loop = (time: number) => {
      this.render(time);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  get clientArea(): Dimension {
    const element = this.containerElement;
    const style = window.getComputedStyle(element);
    return {
      width: element.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight),
      height: element.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom)
    };
  }

  get dimension(): Dimension {
    return { width: this.canvas.width, height: this.canvas.height };
  }

  set dimension(dimension: Dimension) {
    this.canvas.width = dimension.width;
    this.canvas.height = dimension.height;
    this.gl.viewport(0, 0, dimension.width, dimension.height);
  }

  get params(): SandboxParams {
    return this._params;
  }

  set params(params: SandboxParams) {
    this._params = { ...params };
  }

  private render(time: number): void {
    this.gl.clearColor(0, 0, 0, 1);
    this.gl.clear(WebGL2RenderingContext.COLOR_BUFFER_BIT);
    if (this.sandbox) {
      this.sandbox.render(time);
    }
  }

  private onmousedown(e: MouseEvent) {
    if (this.sandbox?.onmousedown) this.sandbox.onmousedown(e);
  }

  private onmouseup(e: MouseEvent) {
    if (this.sandbox?.onmouseup) this.sandbox.onmouseup(e);
  }

  private onmousemove(e: MouseEvent) {
    if (this.sandbox?.onmousemove) this.sandbox.onmousemove(e);
  }

  private onwheel(e: WheelEvent) {
    if (this.sandbox?.onwheel) this.sandbox.onwheel(e);
  }

  private onkeydown(e: KeyboardEvent) {
    if (this.sandbox?.onkeydown) this.sandbox.onkeydown(e);
  }

  private onkeyup(e: KeyboardEvent) {
    if (this.sandbox?.onkeyup) this.sandbox.onkeyup(e);
  }

  private onresize(): void {
    let dim = this.clientArea;
    if (this.sandbox?.onresize) {
      const sandboxDim = this.sandbox.onresize(dim);
      if (sandboxDim)
        dim = { width: Math.min(sandboxDim.width, dim.width), height: Math.min(sandboxDim.height, dim.height) };
    }
    this.dimension = dim;
  }

  private async hashchanged(): Promise<void> {
    let parsedHash = parseHash();
    if (!parsedHash) {
      parsedHash = { path: this.sandboxes[0].name, params: {} };
    }
    this._params = { ...parsedHash.params };
    const newSandbox = this.findSandbox(parsedHash.path);
    if (newSandbox && newSandbox !== this.sandbox) {
      if (this.sandbox?.delete) this.sandbox.delete();
      this.sandbox = undefined;
      if (newSandbox.setup) await newSandbox.setup(this);
      this.sandbox = newSandbox;
      this.onresize();
    } else if (this.sandbox?.onParamsChanged) {
      this.sandbox.onParamsChanged(parsedHash.params);
    }
  }

  private findSandbox(sandboxName: string): GLSandbox {
    if (sandboxName.startsWith('/')) sandboxName = sandboxName.substring(1);
    let newSandbox = this.sandboxes.filter(s => s.name === sandboxName)[0];
    if (!newSandbox) newSandbox = this.sandboxes[0];
    return newSandbox;
  }
}
