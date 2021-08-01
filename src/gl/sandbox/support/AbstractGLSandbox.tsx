import {vec2, vec4} from 'gl-matrix';
import {AbstractDeletable, isDeletable} from '../../GLUtils';
import {GLSandbox, SandboxCanvas, SandboxContainer} from '../GLSandbox';
import React, {Component, RefObject} from "react";
import {createSandboxParameters, ObjectSandboxParameter, SandboxParameter} from "../SandboxParameter";
import {ParametersControls} from "./parameters/ParametersControls";

export abstract class AbstractGLSandbox<P = any> extends AbstractDeletable implements GLSandbox<P> {
  readonly defaultParameters: P;
  private _running = false;
  ups = 60;
  private readonly _parameters: P;

  private readonly _controls: JSX.Element;
  private readonly controlsRef: RefObject<SandboxControls>;

  protected constructor(readonly container: SandboxContainer, readonly name: string, parameters?: P) {
    super();
    this.defaultParameters = this.createDefaultParameters();
    const prototype = Object.getPrototypeOf(this.defaultParameters);
    this._parameters = new prototype.constructor();
    deepClone(parameters || this.defaultParameters, this._parameters);
    this.controlsRef = React.createRef();
    this._controls = this.createControls();
  }

  abstract createDefaultParameters(): P;

  abstract render(): void;

  get controls(): JSX.Element {
    return this._controls;
  }

  updateControls(): void {
    const controls = this.controlsRef.current;
    if (controls) controls.forceUpdate();
  }

  customControls(): JSX.Element | undefined {
    return undefined;
  }

  onparameterchange(_p?: SandboxParameter): void {
    // no op
  }

  protected createControls(): JSX.Element {
    return <SandboxControls ref={this.controlsRef} sandbox={this}/>;
  }

  protected clear(color: vec4 = [0, 0, 0, 1], mask = WebGL2RenderingContext.COLOR_BUFFER_BIT): void {
    this.gl.colorMask(true, true, true, true);
    this.gl.clearColor(color[0], color[1], color[2], color[3]);
    this.gl.clear(mask);
  }

  get parameters(): P {
    return this._parameters;
  }

  set parameters(params: P) {
    if (params === this._parameters)
      return;

    deepClone(params, this._parameters);
    this.updateControls();
    this.onparameterchange();
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
      y = e.touches[0].clientY;
    }
    vec2.set(out, (x / this.canvas.width) * 2 - 1, (1 - y / this.canvas.height) * 2 - 1);
    return out;
  }

}

function deepClone(src: any, dst: any): any {
  if (Array.isArray(src)) {
    const dstarray = dst as any[];
    dstarray.splice(0, dstarray.length, ...src);
    return dst;
  } else if (typeof src === 'object') {
    Object.keys(src)
      .filter(k => dst[k] !== undefined && typeof dst[k] === typeof src[k])
      .forEach(k => (dst[k] = deepClone(src[k], dst[k])));
    return dst;
  }
  return src;
}

interface SandboxControlsProps {
  sandbox: AbstractGLSandbox;
}

class SandboxControls extends Component<SandboxControlsProps, { parameter: ObjectSandboxParameter, customControls?: JSX.Element }> {
  constructor(props: SandboxControlsProps) {
    super(props);
    this.state = {parameter: this.createParameters(), customControls: this.props.sandbox.customControls()};
  }

  render(): JSX.Element {
    const sandbox = this.props.sandbox;
    return <div className="sandbox-controls parameters-table">
      <ParametersControls parameters={this.state.parameter.parameters}/>
      {sandbox.customControls()}
    </div>;
  }

  private createParameters(): ObjectSandboxParameter {
    return createSandboxParameters(this.props.sandbox, e => this.props.sandbox.onparameterchange(e));
  }

  componentDidUpdate(prevProps: Readonly<SandboxControlsProps>): void {
    if (prevProps.sandbox !== this.props.sandbox) {
      this.setState({parameter: this.createParameters(), customControls: this.props.sandbox.customControls()});
    }
  }
}
