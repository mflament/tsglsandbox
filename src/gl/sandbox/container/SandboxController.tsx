import React, { Component, ReactNode, RefObject } from 'react';
import { RenderPanel } from './RenderPanel';
import { GLSandbox, SandboxContainer, SandboxFactories } from '../GLSandbox';
import { hashLocation } from '../../../utils/browser/HashLocation';
import { ProgramLoader } from '../../shader/ProgramLoader';
import { GLCanvas } from './GLCanvas';
import { SandboxSelect } from './SandboxSelect';
import { ParameterControls } from './parameters/ParameterControls';
import { createSandboxParameters, ParameterChangeListener } from '../SandboxParameter';
import { StoredState, SandboxStorage } from './SandboxStorage';
import { LOGGER } from '../../GLUtils';

interface ContainerProps {
  readonly sandboxes: SandboxFactories;
  readonly glAttributes?: WebGLContextAttributes;
}

interface SandboxControllerState extends StoredState {
  sandbox?: GLSandbox;
  loading?: boolean;
}

export class SandboxController extends Component<ContainerProps, SandboxControllerState> implements SandboxContainer {
  private readonly storage = new SandboxStorage();
  private canvasRef: RefObject<GLCanvas>;

  private _programLoader?: ProgramLoader;

  private _lastUpdate = 0;
  private _frames = 0;
  private _time = 0;

  constructor(props: ContainerProps) {
    super(props);
    this.canvasRef = React.createRef();
    this.renderFrame = this.renderFrame.bind(this);
    this.state = {
      showOverlay: true,
      showControls: false,
      selectedSandbox: this.sandboxNames[0],
      ...this.storage.state
    };
    window.onhashchange = () => this.hashChanged();
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
      <div
        id="glsandbox"
        className="full-screen"
        onKeyDown={e => this.handleKeyDown(e.nativeEvent)}
        onKeyUp={e => this.handleKeyUp(e.nativeEvent)}
        tabIndex={0}
      >
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
        <ControlPanel visible={this.state.showControls}>
          <SandboxSelect
            sandboxes={this.sandboxNames}
            sandbox={sandbox}
            selectedName={this.state.selectedSandbox}
            onChange={n => this.selectSandbox(n)}
          />
          <SandboxHeader sandbox={sandbox} onReset={() => this.resetParameters()} onShare={() => this.shareSandbox()} />
          <hr />
          <SandboxPanel sandbox={this.state.sandbox} onchange={() => this.paramChanged()} />
        </ControlPanel>
      </div>
    );
  }

  componentDidMount(): void {
    self.onbeforeunload = () => this.unload();
    this.selectSandbox(this.state.selectedSandbox);
    requestAnimationFrame(this.renderFrame);
  }

  private unload(): void {
    this.saveSandbox();
    const sandbox = this.state.sandbox;
    sandbox?.delete && sandbox.delete();
    if (this.programLoader) this.programLoader.delete();
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

  private async loadSandbox(name: string): Promise<void> {
    const factory = this.sandboxes[name];
    if (!factory) return;

    const sandbox = await factory(this, name);
    const storedParams = this.storage.getSandboxParameters(name);
    if (storedParams) {
      sandbox.parameters = storedParams;
    }
    sandbox.onresize && sandbox.onresize({ width: this.canvas.width, height: this.canvas.height });
    this.setState({ sandbox: sandbox, loading: undefined });
  }

  private resetParameters(): void {
    if (this.sandbox) {
      this.sandbox.parameters = this.sandbox.defaultParameters;
      this.forceUpdate();
    }
  }

  private shareSandbox(): void {
    LOGGER.info('shareSandbox');
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

  private async hashChanged(): Promise<void> {
    let tag = hashLocation.path;
    if (tag.startsWith('/')) tag = tag.substring(1);
    LOGGER.debug(tag);
  }

  private paramChanged(): void {
    const sandbox = this.sandbox;
    sandbox?.onparameterchange && sandbox.onparameterchange();
  }

  private get sandboxNames(): string[] {
    return Object.keys(this.props.sandboxes);
  }

  private get sandbox(): GLSandbox | undefined {
    return this.state.sandbox;
  }

  private handleKeyDown(evt: KeyboardEvent): void {
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
        this.setState(state => this.nextControlsState(state));
        break;
    }
  }

  private nextControlsState(state: SandboxControllerState): SandboxControllerState {
    const showOverlay = state.showOverlay && state.showControls ? false : true;
    const showControls = state.showOverlay && showOverlay;
    return {
      ...state,
      showOverlay: showOverlay,
      showControls: showControls
    };
  }

  private handleKeyUp(evt: KeyboardEvent): void {
    const sandbox = this.sandbox;
    if (sandbox?.eventHandler?.onkeyup) sandbox.eventHandler.onkeyup(evt);
  }

  private resizeCanvas(width: number, height: number): void {
    this.canvas.resize(width, height);
    if (this.sandbox) {
      this.sandbox.onresize && this.sandbox.onresize(this.canvas);
      this.sandbox.render();
    }
  }

  private toggleControls(): void {
    this.setState(current => ({ ...current, showControls: !current.showControls }));
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
    this.state = { fps: 0 };
  }

  render(): ReactNode {
    return (
      <div className={this.className}>
        <div className="fps">{this.state.fps}</div>
        <div className="button toggle-controls" onClick={this.props.onShowControls}>
          <img src="./images/arrow.png" />
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
    this.setState({ fps: Math.round(frames / elapsedSec) });
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
        <div className="control-panel-content">{this.props.children}</div>
      </div>
    );
  }

  componentDidMount(): void {
    this.updateMargin();
  }

  componentDidUpdate(): void {
    this.updateMargin();
  }

  private updateMargin(): void {
    const div = this._panelRef.current;
    if (div) {
      const width = div.getBoundingClientRect().width;
      div.style.marginRight = this.props.visible ? '' : -width + 'px';
      setTimeout(() => div.classList.remove('hidden'), 10);
    }
  }
}

function SandboxPanel(props: { sandbox?: GLSandbox; onchange?: ParameterChangeListener }): JSX.Element {
  const sandbox = props.sandbox;
  if (!sandbox) return <></>;
  const sbp = createSandboxParameters(sandbox, props.onchange);
  return (
    <>
      <ParameterControls parameters={sbp.parameters} />
      <CustomControls sandbox={sandbox} />
    </>
  );
}

function CustomControls(props: { sandbox: GLSandbox }): JSX.Element {
  const cc = props.sandbox.customControls;
  if (cc) return <div className={'custom-controls ' + props.sandbox.name}>{cc}</div>;
  else return <></>;
}

function SandboxHeader(props: { sandbox?: GLSandbox; onReset: () => void; onShare: () => void }): JSX.Element {
  const sandbox = props.sandbox;
  if (!sandbox) return <></>;
  return (
    <div className="sandbox-title">
      <span>{sandbox.displayName || sandbox.name}</span>
      <img src="./images/reset.png" title="Reset parameters" onClick={props.onReset} />
      <img src="./images/share.png" title="Share this sandbox" onClick={props.onShare} />
    </div>
  );
}
