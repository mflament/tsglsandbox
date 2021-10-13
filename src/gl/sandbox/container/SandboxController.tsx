import React, { Component, ReactNode, RefObject } from 'react';
import { GLSandbox, SandboxContainer, SandboxFactories } from '../GLSandbox';
import { hashLocation } from 'utils';
import { ProgramLoader } from '../../shader/ProgramLoader';
import { GLCanvas } from './GLCanvas';
import { SandboxStorage, StoredState } from './SandboxStorage';
import { createShaderLoader, ShaderLoader } from '../../shader/ShaderLoader';
import { ShaderParser } from '../../shader/parser/ShaderParser';
import { SandboxHeader } from './SandboxHeader';
import { ControlPanel } from './ControlPanel';
import { CanvasOverlay } from './CanvasOverlay';

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
  return { sandboxName: matches ? matches[1] : undefined };
}

export class SandboxController extends Component<ContainerProps, SandboxControllerState> implements SandboxContainer {
  private readonly storage = new SandboxStorage();
  private readonly canvasRef: RefObject<GLCanvas>;
  private readonly controlPanelRef: RefObject<ControlPanel>;

  private _programLoader?: ProgramLoader;
  private _shaderParser?: ShaderParser;
  private _shaderLoader?: ShaderLoader;

  private _lastUpdate = 0;
  private _frames = 0;
  private _time = 0;

  constructor(props: ContainerProps) {
    super(props);
    this.canvasRef = React.createRef();
    this.controlPanelRef = React.createRef();
    this.renderFrame = this.renderFrame.bind(this);
    this.canvasResized = this.canvasResized.bind(this);
    const state = {
      showOverlay: true,
      showControls: false,
      selectedSandbox: this.sandboxNames[0],
      ...this.storage.state
    };
    if (!this.sandboxes[state.selectedSandbox]) state.selectedSandbox = this.sandboxNames[0];
    this.state = state;
    window.onhashchange = () => this.hashChanged();

    window.onkeydown = (e: KeyboardEvent) => this.onKeyDown(e);
    window.onkeyup = (e: KeyboardEvent) => this.onKeyUp(e);
  }

  get hasTouchDevice(): boolean {
    return 'ontouchstart' in window;
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
    if (!this._programLoader) this._programLoader = new ProgramLoader(this.canvas.gl, this.shaderParser);
    return this._programLoader;
  }

  get shaderParser(): ShaderParser {
    if (!this._shaderParser) this._shaderParser = new ShaderParser(this.shaderLoader);
    return this._shaderParser;
  }

  get shaderLoader(): ShaderLoader {
    if (!this._shaderLoader) this._shaderLoader = createShaderLoader();
    return this._shaderLoader;
  }

  async componentDidMount(): Promise<void> {
    window.onbeforeunload = () => this.unload();
    await this.selectSandbox(this.state.selectedSandbox);
    requestAnimationFrame(this.renderFrame);
  }

  render(): ReactNode {
    const sandbox = this.state.sandbox;
    return (
      <div id="glsandbox" className={'full-screen ' + this.sandbox?.name}>
        <div className="render-panel">
          <GLCanvas
            glAttributes={this.props.glAttributes}
            ref={this.canvasRef}
            inputHandler={this.state.sandbox}
            onResize={this.canvasResized}
          />
          <CanvasOverlay
            showOverlay={sandbox !== undefined && this.state.showOverlay}
            showControls={this.state.showControls}
            onShowControls={() => this.toggleControls()}
            getFrames={() => this._frames}
          />
        </div>

        <ControlPanel visible={this.state.showControls} ref={this.controlPanelRef}>
          <SandboxHeader controller={this} />
          <hr />
          {sandbox?.controls}
        </ControlPanel>
      </div>
    );
  }

  updateControls(): void {
    const cp = this.controlPanelRef.current;
    if (cp) cp.forceUpdate();
  }

  selectSandbox(name: string): void {
    if (!this.sandboxes[name]) return;
    this.setState(
      currentState => {
        if (currentState.loading) return currentState;
        if (currentState.sandbox) {
          this.saveSandbox(currentState.sandbox);
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

  private unload(): void {
    const sandbox = this.state.sandbox;
    if (sandbox) {
      this.saveSandbox(sandbox);
      sandbox.delete && sandbox.delete();
    }
    if (this.programLoader) this.programLoader.delete();
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
    let sandbox;
    try {
      sandbox = await factory(this, name, storedParams);
    } catch (e) {
      sandbox = await factory(this, name);
    }
    sandbox.onresize && sandbox.onresize({ width: this.canvas.width, height: this.canvas.height });
    this.setState({ sandbox: sandbox, loading: undefined });
  }

  private saveSandbox(sandbox: GLSandbox): void {
    this.storage.state = {
      showOverlay: this.state.showOverlay,
      showControls: this.state.showControls,
      selectedSandbox: this.state.selectedSandbox
    };
    this.storage.setSandboxParameters(sandbox);
  }

  get selectedSandbox(): string {
    return this.state.selectedSandbox;
  }

  get sandboxNames(): string[] {
    return Object.keys(this.props.sandboxes);
  }

  get sandbox(): GLSandbox | undefined {
    return this.state.sandbox;
  }

  private onKeyDown(evt: KeyboardEvent): void {
    const sandbox = this.sandbox;
    if (!sandbox) return;
    if (sandbox.onkeydown) {
      sandbox.onkeydown(evt);
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
    if (sandbox?.onkeyup) sandbox.onkeyup(evt);
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

  private canvasResized(): void {
    if (this.sandbox) {
      this.sandbox.onresize && this.sandbox.onresize(this.canvas);
      this.sandbox.render();
    }
  }

  private toggleControls(): void {
    this.setState(current => {
      if (this.controlPanelRef.current) this.controlPanelRef.current.toggle();
      return { ...current, showControls: !current.showControls };
    });
  }

  get sandboxes(): SandboxFactories {
    return this.props.sandboxes;
  }
}
