import React, {Component, ReactNode, RefObject} from 'react';
import {RenderPanel} from './RenderPanel';
import {GLSandbox, SandboxContainer, SandboxFactories} from '../GLSandbox';
import {hashLocation} from 'utils';
import {ProgramLoader} from '../../shader/ProgramLoader';
import {GLCanvas} from './GLCanvas';
import {SandboxSelect} from './SandboxSelect';
import {SandboxStorage, StoredState} from './SandboxStorage';

interface ContainerProps {
  readonly sandboxes: SandboxFactories;
  readonly glAttributes?: WebGLContextAttributes;
}

interface SandboxControllerState extends StoredState {
  sandbox?: GLSandbox;
  loading?: boolean;
}

interface ParsedHash {
  sandboxName?: string;
}

function parseHash(): ParsedHash {
  const hash = hashLocation.path;
  const matches = hash.match(/\/?(\w+).*/);
  return {sandboxName: matches ? matches[1] : undefined};
}

export class SandboxController extends Component<ContainerProps, SandboxControllerState> implements SandboxContainer {
  private readonly storage = new SandboxStorage();
  private readonly canvasRef: RefObject<GLCanvas>;
  private readonly controlPanelRef: RefObject<ControlPanel>;

  private _programLoader?: ProgramLoader;

  private _lastUpdate = 0;
  private _frames = 0;
  private _time = 0;

  constructor(props: ContainerProps) {
    super(props);
    this.canvasRef = React.createRef();
    this.controlPanelRef = React.createRef();
    this.renderFrame = this.renderFrame.bind(this);
    this.state = {
      showOverlay: true,
      showControls: false,
      selectedSandbox: this.sandboxNames[0],
      ...this.storage.state
    };
    window.onhashchange = () => this.hashChanged();
    window.onkeydown = (e: KeyboardEvent) => this.onKeyDown(e);
    window.onkeyup = (e: KeyboardEvent) => this.onKeyUp(e);
  }

  get time(): number {
    return this._time;
  }

  get canvas(): GLCanvas {
    const canvas = this.canvasRef.current;
    if (!canvas) throw new Error('Canvas not created');
    return canvas;
  }

  get programLoader(): ProgramLoader {
    if (!this._programLoader) {
      this._programLoader = new ProgramLoader(this.canvas.gl);
    }
    return this._programLoader;
  }

  render(): ReactNode {
    const sandbox = this.state.sandbox;
    return (
      <div id="glsandbox" className={'full-screen ' + this.sandbox?.name}>
        <RenderPanel onResize={(w, h) => this.resizeCanvas(w, h)}>
          <GLCanvas
            glAttributes={this.props.glAttributes}
            ref={this.canvasRef}
            eventHandler={this.state.sandbox?.eventHandler}
          />
          <CanvasOverlay
            showOverlay={sandbox !== undefined && this.state.showOverlay}
            showControls={this.state.showControls}
            onShowControls={() => this.toggleControls()}
            getFPS={() => this._frames}
          />
        </RenderPanel>

        <ControlPanel visible={this.state.showControls} ref={this.controlPanelRef}>
          <SandboxSelect
            sandboxes={this.sandboxNames}
            sandbox={sandbox}
            selectedName={this.state.selectedSandbox}
            onChange={n => this.selectSandbox(n)}/>
          <SandboxHeader sandbox={sandbox} onReset={() => this.resetParameters()} onShare={() => this.shareSandbox()}/>
          <hr/>
          {sandbox?.controls}
        </ControlPanel>
      </div>
    );
  }

  async componentDidMount(): Promise<void> {
    self.onbeforeunload = () => this.unload();
    await this.selectSandbox(this.state.selectedSandbox);
    requestAnimationFrame(this.renderFrame);
  }

  updateControls(): void {
    const cp = this.controlPanelRef.current;
    if (cp)
      cp.forceUpdate();
  }

  private renderFrame(time: number): void {
    const sandbox = this.state?.sandbox;
    if (sandbox) {
      sandbox.render();
      if (sandbox.running && sandbox.update) {
        const updateFreq = 1 / sandbox.ups;
        const dt = Math.min((time - this._lastUpdate) / 1000, updateFreq);
        if (dt >= updateFreq) {
          sandbox.update(this._time, dt);
          this._lastUpdate = time;
        }
        this._time += dt;
      }
    }
    this._frames++;
    requestAnimationFrame(this.renderFrame);
  }

  private selectSandbox(name: string): void {
    this.setState(
      currentState => {
        if (currentState.loading) return currentState;
        if (currentState.sandbox) {
          this.saveSandbox();
          currentState.sandbox.delete && currentState.sandbox.delete();
        }
        return {
          ...currentState,
          selectedSandbox: name,
          sandbox: undefined,
          loading: true
        };
      },
      () => this.loadSandbox(name)
    );
  }

  private unload(): void {
    this.saveSandbox();
    const sandbox = this.state.sandbox;
    sandbox?.delete && sandbox.delete();
    if (this.programLoader) this.programLoader.delete();
  }

  private resetParameters(): void {
    if (this.sandbox) {
      this.sandbox.parameters = this.sandbox.defaultParameters;
      this.forceUpdate();
    }
  }

  private shareSandbox(): void {
    const sandbox = this.sandbox;
    if (sandbox) {
      const json = JSON.stringify(sandbox.parameters);
      console.log('initial json ' + json);
    }
  }

  private async hashChanged(): Promise<void> {
    const parsedHash = parseHash();
    const newName = parsedHash.sandboxName || this.sandboxNames[0];
    if (newName !== this.state.selectedSandbox) {
      if (this.sandboxes[newName]) {
        await this.selectSandbox(newName);
      } else {
        window.location.hash = this.state.selectedSandbox;
      }
    }
  }

  private async loadSandbox(name: string): Promise<void> {
    const factory = this.sandboxes[name];
    if (!factory) return;

    const storedParams = this.storage.getSandboxParameters(name);
    const sandbox = await factory(this, name, storedParams);
    sandbox.onresize && sandbox.onresize({width: this.canvas.width, height: this.canvas.height});
    this.setState({sandbox: sandbox, loading: undefined});
  }

  private saveSandbox(): void {
    this.storage.state = {
      showOverlay: this.state.showOverlay,
      showControls: this.state.showControls,
      selectedSandbox: this.state.selectedSandbox
    };
    const sandbox = this.sandbox;
    if (sandbox) this.storage.setSandboxParameters(sandbox);
  }

  private get sandboxNames(): string[] {
    return Object.keys(this.props.sandboxes);
  }

  private get sandbox(): GLSandbox | undefined {
    return this.state.sandbox;
  }

  private onKeyDown(evt: KeyboardEvent): void {
    const sandbox = this.sandbox;
    if (!sandbox) return;

    if (sandbox.eventHandler?.onkeydown) {
      sandbox.eventHandler.onkeydown(evt);
      if (evt.defaultPrevented) return;
    }

    switch (evt.code) {
      case 'Space':
        sandbox.running = !sandbox.running;
        break;
      case 'KeyH':
        this.setState(state => SandboxController.nextControlsState(state));
        break;
    }
  }

  private onKeyUp(evt: KeyboardEvent): void {
    const sandbox = this.sandbox;
    if (sandbox?.eventHandler?.onkeyup) sandbox.eventHandler.onkeyup(evt);
  }

  private static nextControlsState(state: SandboxControllerState): SandboxControllerState {
    const showOverlay = !(state.showOverlay && state.showControls);
    const showControls = state.showOverlay && showOverlay;
    return {
      ...state,
      showOverlay: showOverlay,
      showControls: showControls
    };
  }

  private resizeCanvas(width: number, height: number): void {
    this.canvas.resize(width, height);
    if (this.sandbox) {
      this.sandbox.onresize && this.sandbox.onresize(this.canvas);
      this.sandbox.render();
    }
  }

  private toggleControls(): void {
    this.setState(current => ({...current, showControls: !current.showControls}));
  }

  get sandboxes(): SandboxFactories {
    return this.props.sandboxes;
  }
}

interface CanvasOverlayProps {
  showOverlay: boolean;
  showControls: boolean;

  getFPS(): number;

  onShowControls: () => void;
}

class CanvasOverlay extends Component<CanvasOverlayProps, { fps: number }> {
  private lastFramesCount = 0;
  private lastFrameTime = 0;
  private timerId = 0;

  constructor(props: CanvasOverlayProps) {
    super(props);
    this.state = {fps: 0};
  }

  render(): ReactNode {
    return (
      <div className={this.className}>
        <div className="fps">{this.state.fps}</div>
        <div className="button toggle-controls" onClick={this.props.onShowControls}>
          <img src="/images/arrow.png" alt="Toggle menu"/>
        </div>
      </div>
    );
  }

  componentDidMount(): void {
    this.lastFrameTime = performance.now();
    this.lastFramesCount = this.props.getFPS();
    this.timerId = window.setInterval(() => this.updateFPS(), 1000);
  }

  componentWillUnmount(): void {
    if (this.timerId) window.clearTimeout(this.timerId);
  }

  private get className(): string {
    let res = 'canvas-overlay';
    if (!this.props.showOverlay) res += ' hidden';
    if (this.props.showControls) res += ' open';
    return res;
  }

  private updateFPS(): void {
    const now = performance.now();
    const elapsedSec = (this.lastFrameTime - now) / 1000;
    const totalFrames = this.props.getFPS();
    const frames = this.lastFramesCount - totalFrames;
    this.setState({fps: Math.round(frames / elapsedSec)});
    this.lastFrameTime = now;
    this.lastFramesCount = totalFrames;
  }
}

class ControlPanel extends Component<{ visible: boolean }> {
  private readonly _panelRef: RefObject<HTMLDivElement>;

  constructor(props: { visible: boolean }) {
    super(props);
    this._panelRef = React.createRef();
  }

  render(): JSX.Element {
    return (
      <div ref={this._panelRef} className="control-panel hidden">
        <div className="control-panel-content parameters-table">{this.props.children}</div>
      </div>
    );
  }

  componentDidMount(): void {
    const div = this._panelRef.current;
    if (div) {
      this.updateMargin(div);
      setTimeout(() => div.classList.remove('hidden'), 100);
    }
  }

  componentDidUpdate(): void {
    const div = this._panelRef.current;
    div && this.updateMargin(div);
  }

  private updateMargin(div: HTMLDivElement): void {
    const width = div.getBoundingClientRect().width;
    div.style.marginRight = this.props.visible ? '' : -width + 'px';
  }
}

function SandboxHeader(props: { sandbox?: GLSandbox; onReset: () => void; onShare: () => void }): JSX.Element {
  const sandbox = props.sandbox;
  if (!sandbox) return <></>;
  return (
    <div className="sandbox-title">
      <span>{sandbox.displayName || sandbox.name}</span>
      <img src="/images/reset.png" title="Reset parameters" onClick={props.onReset} alt="Reset"/>
      <img src="/images/share.png" title="Share this sandbox" onClick={props.onShare} alt="Share"/>
    </div>
  );
}
