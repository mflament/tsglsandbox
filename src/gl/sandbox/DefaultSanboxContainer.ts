import { checkNull } from '../utils/GLUtils';
import { ProgramLoader } from '../shader/ProgramLoader';
import { GLSandbox, SandboxContainer, SandboxFactory } from './GLSandbox';
import { vec2 } from 'gl-matrix';

type SandboxFactories = { [name: string]: SandboxFactory };

export class DefaultSandboxContainer implements SandboxContainer {
  readonly containerElement: HTMLElement;
  readonly canvas: HTMLCanvasElement;
  readonly gl: WebGL2RenderingContext;

  readonly programLoader: ProgramLoader;

  private readonly overlay: OverlayPanel;

  private sandbox?: GLSandbox;

  private _time = 0;
  private lastUpdate?: number;

  private lastFPSUpdate = performance.now();
  private frames = 0;

  constructor(readonly sandboxes: SandboxFactories, container = document.getElementById('sandbox')) {
    if (!container) throw new Error('No container');
    this.containerElement = container;
    this.canvas = checkNull(() => document.getElementById('glcanvas') as HTMLCanvasElement);
    this.containerElement.focus();
    this.overlay = new OverlayPanel(container, sandboxes);
    //this.overlay.toggle();

    this.gl = checkNull(() => this.canvas.getContext('webgl2', { desynchronized: true, preserveDrawingBuffer: true }));
    window.addEventListener('resize', () => this.onresize());
    this.onresize();

    this.programLoader = new ProgramLoader(this.gl);

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

  get clientArea(): vec2 {
    const element = this.containerElement;
    const style = window.getComputedStyle(element);
    return [
      element.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight),
      element.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom)
    ];
  }

  get time(): number {
    return this._time;
  }

  get dimension(): vec2 {
    return [this.canvas.width, this.canvas.height];
  }

  set dimension(dimension: vec2) {
    this.canvas.width = dimension[0];
    this.canvas.height = dimension[1];
    this.gl.viewport(0, 0, dimension[0], dimension[1]);
  }

  private render(time: number): void {
    const dt = this.lastUpdate === undefined ? 0 : (time - this.lastUpdate) / 1000;
    this.lastUpdate = time;

    if (this.sandbox) {
      this.sandbox.render();
      if (this.sandbox.running && this.sandbox.update) {
        this.sandbox.update(this._time, dt);
        this._time += dt;
      }
    }

    this.frames++;

    const fpsTime = (time - this.lastFPSUpdate) / 1000;
    if (fpsTime > 1) {
      this.overlay.fps = Math.round(this.frames / fpsTime);
      this.frames = 0;
      this.lastFPSUpdate = time;
    }

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
    if (!this.sandbox) return;
    const sb = this.sandbox;
    if (sb.onkeydown) sb.onkeydown(e);
    if (e.defaultPrevented || e.altKey) return;
    switch (e.key.toLowerCase()) {
      case 'd':
        this.overlay.toggle();
        break;
      case ' ':
        this.lastUpdate = undefined;
        sb.running = !sb.running;
        break;
    }
  }

  private onkeyup(e: KeyboardEvent) {
    if (this.sandbox?.onkeyup) this.sandbox.onkeyup(e);
  }

  private onresize(): void {
    const dim = this.clientArea;
    if (this.sandbox?.onresize) {
      const sandboxDim = this.sandbox.onresize(dim);
      if (sandboxDim) vec2.set(dim, Math.min(sandboxDim[0], dim[0]), Math.min(sandboxDim[1], dim[1]));
    }
    this.dimension = dim;
  }

  private async hashchanged(): Promise<void> {
    const newName = this.sandboxName(window.hashlocation.path);
    // const newSandbox = this.sandboxFactory(hashPath());
    if (newName !== this.sandbox?.name) {
      if (this.sandbox) {
        if (this.sandbox.delete) this.sandbox.delete();
        this.containerElement.classList.remove(this.sandbox.name);
        this.sandbox = undefined;
      }

      this._time = 0;
      this.lastUpdate = undefined;
      this.containerElement.classList.add(newName);
      this.sandbox = await this.sandboxes[newName](this, newName);
      this.overlay.sandbox = newName;
      this.overlay.overlayContent = this.sandbox.overlayContent;
      this.onresize();
    }
  }

  private sandboxName(path: string): string {
    if (path.startsWith('/')) path = path.substring(1);
    const factory = this.sandboxes[path];
    if (!factory) return Object.keys(this.sandboxes)[0];
    return path;
  }
}

class OverlayPanel {
  private readonly overlayElement: HTMLElement;
  private readonly fpsElement: HTMLElement;
  private readonly sandboxPanel: HTMLElement;
  private dataElement?: HTMLElement;

  constructor(readonly container: HTMLElement, readonly sandboxes: SandboxFactories) {
    this.overlayElement = checkNull(() => document.getElementById('overlay'));
    this.fpsElement = checkNull(() => document.getElementById('fps'));
    this.sandboxPanel = checkNull(() => document.getElementById('sandbox-panel'));

    const sandboxesElement = checkNull(() => document.getElementById('sandboxes'));
    Object.keys(sandboxes).forEach(name => sandboxesElement.appendChild(sandboxLink(name)));
  }

  toggle() {
    this.overlayElement.classList.toggle('hidden');
  }

  set sandbox(name: string) {
    let li = this.overlayElement.querySelector('li.active');
    li?.classList.remove('active');
    li = this.overlayElement.querySelector('li.' + name);
    li?.classList.add('active');
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

  set fps(fps: number) {
    this.fpsElement.textContent = Math.round(fps) + ' FPS';
  }
}

function sandboxLink(name: string): HTMLElement {
  const a = document.createElement('a');
  a.href = '#/' + name;
  a.text = name;
  a.tabIndex = -1;
  const li = document.createElement('li');
  li.classList.add(name);
  li.appendChild(a);
  return li;
}
