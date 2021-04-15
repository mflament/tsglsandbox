import { getHashParams, hashPath, updateHashParameters } from '../../utils/HashUtils';
import { checkNull } from '../gl-utils';
import { Dimension, GLSandbox, SandboxContainer } from './GLSandbox';

export class SandboxRunner implements SandboxContainer {
  readonly containerElement: HTMLElement;
  readonly canvas: HTMLCanvasElement;
  readonly gl: WebGL2RenderingContext;

  private readonly overlay: OverlayPanel;

  private sandbox?: GLSandbox;

  constructor(readonly sandboxes: GLSandbox[], container = document.getElementById('sandbox')) {
    if (!container) throw new Error('No container');
    this.containerElement = container;
    this.canvas = checkNull(() => document.getElementById('glcanvas') as HTMLCanvasElement);
    this.overlay = new OverlayPanel(container, sandboxes);
    //this.overlay.toggle();

    this.gl = checkNull(() => this.canvas.getContext('webgl2', { desynchronized: true, preserveDrawingBuffer: true }));
    window.addEventListener('resize', () => this.onresize());
    this.onresize();

    this.canvas.onmousedown = e => this.onmousedown(e);
    this.canvas.ontouchstart = e => this.ontouchstart(e);
    this.canvas.onmouseup = e => this.onmouseup(e);
    this.canvas.ontouchend = e => this.ontouchend(e);
    this.canvas.onmousemove = e => this.onmousemove(e);
    this.canvas.ontouchmove = e => this.ontouchmove(e);
    this.canvas.oncontextmenu = e => e.preventDefault();

    this.canvas.onwheel = e => this.onwheel(e);
    this.containerElement.onkeydown = e => this.onkeydown(e);
    this.containerElement.onkeyup = e => this.onkeyup(e);

    window.onhashchange = () => this.hashchanged();
    this.hashchanged();
  }

  start(): void {
    this.render = this.render.bind(this);
    requestAnimationFrame(this.render);
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

  private render(time: number): void {
    this.gl.clearColor(0, 0, 0, 1);
    this.gl.clear(WebGL2RenderingContext.COLOR_BUFFER_BIT);
    if (this.sandbox) {
      this.sandbox.render(time);
    }
    this.gl.flush();
    this.overlay.frames++;
    requestAnimationFrame(this.render);
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

  private ontouchstart(e: TouchEvent) {
    if (this.sandbox?.ontouchstart) this.sandbox.ontouchstart(e);
  }

  private ontouchend(e: TouchEvent) {
    if (this.sandbox?.ontouchend) this.sandbox.ontouchend(e);
  }

  private ontouchmove(e: TouchEvent) {
    if (this.sandbox?.ontouchmove) this.sandbox.ontouchmove(e);
  }

  private onwheel(e: WheelEvent) {
    if (this.sandbox?.onwheel) this.sandbox.onwheel(e);
  }

  private onkeydown(e: KeyboardEvent) {
    if (this.sandbox?.onkeydown) this.sandbox.onkeydown(e);
    if (!e.defaultPrevented) {
      if (e.key === 'd' && !e.altKey) this.overlay.toggle();
    }
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
    const newSandbox = this.findSandbox(hashPath());
    if (newSandbox && newSandbox !== this.sandbox) {
      if (this.sandbox) {
        this.containerElement.classList.remove(this.sandbox.name);
        if (this.sandbox.delete) this.sandbox.delete();
      } else {
        // initialize first sandbox parameters from hash parameters
        getHashParams(newSandbox.parameters);
      }

      this.containerElement.classList.add(newSandbox.name);
      if (newSandbox.setup) await newSandbox.setup(this);
      this.sandbox = newSandbox;
      // replace current hash parameters with new sandbox parameters
      updateHashParameters(newSandbox.name, newSandbox.parameters);
      this.overlay.overlayContent = newSandbox.overlayContent;
      this.onresize();
    } else if (this.sandbox?.onParametersChanged) {
      getHashParams(this.sandbox.parameters);
      this.sandbox.onParametersChanged();
    }
  }

  private findSandbox(sandboxName: string): GLSandbox {
    if (sandboxName.startsWith('/')) sandboxName = sandboxName.substring(1);
    let newSandbox = this.sandboxes.filter(s => s.name === sandboxName)[0];
    if (!newSandbox) newSandbox = this.sandboxes[0];
    return newSandbox;
  }
}

function sandboxLink(sb: GLSandbox): HTMLElement {
  const a = document.createElement('a');
  a.href = '#/' + sb.name;
  a.text = sb.name;
  const li = document.createElement('li');
  li.appendChild(a);
  return li;
}

class OverlayPanel {
  private readonly overlayElement: HTMLElement;
  private readonly fpsElement: HTMLElement;
  private readonly sandboxPanel: HTMLElement;
  private fpsTimeout = 0;
  private fpsStart = 0;
  private dataElement?: HTMLElement;
  frames = 0;

  constructor(readonly container: HTMLElement, readonly sandboxes: GLSandbox[]) {
    this.overlayElement = checkNull(() => document.getElementById('overlay'));
    this.fpsElement = checkNull(() => document.getElementById('fps'));
    this.sandboxPanel = checkNull(() => document.getElementById('sandbox-panel'));

    const sandboxesElement = checkNull(() => document.getElementById('sandboxes'));
    sandboxes.forEach(sb => sandboxesElement.appendChild(sandboxLink(sb)));
  }

  toggle() {
    if (this.overlayElement.classList.toggle('hidden')) {
      window.clearTimeout(this.fpsTimeout);
    } else {
      this.startFPSTimer();
    }
  }

  set overlayContent(dataElement: HTMLElement | undefined) {
    if (dataElement) {
      this.dataElement = dataElement;
      this.sandboxPanel.appendChild(dataElement);
      this.sandboxPanel.classList.remove('hidden');
    } else if (this.dataElement) {
      this.dataElement.remove();
      this.dataElement = undefined;
      this.sandboxPanel.classList.add('hidden');
    }
  }

  private startFPSTimer() {
    this.fpsStart = performance.now();
    this.frames = 0;
    this.fpsTimeout = window.setTimeout(() => this.updateFPS(), 1000);
  }

  private updateFPS() {
    const fps = Math.round((this.frames / (performance.now() - this.fpsStart)) * 1000);
    this.fpsElement.textContent = fps + ' FPS';
    this.frames = 0;
    this.fpsStart = performance.now();
  }
}
