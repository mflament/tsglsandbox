import {vec2} from 'gl-matrix';
import React, {Component, ReactNode, RefObject} from 'react';
import {SandboxCanvas} from '../GLSandbox';
import {SandboxEventHandler} from '../ActionManager';

interface CanvasProps {
  glAttributes?: WebGLContextAttributes;
  eventHandler?: SandboxEventHandler;
}

export class GLCanvas extends Component<CanvasProps> implements SandboxCanvas {
  private readonly canvasRef: RefObject<HTMLCanvasElement>;
  private _gl?: WebGL2RenderingContext;
  private _dimension: vec2 = [0, 0];

  constructor(props: CanvasProps) {
    super(props);
    this.canvasRef = React.createRef();
    this.mouseEvent = this.mouseEvent.bind(this);
    this.touchEvent = this.touchEvent.bind(this);
  }

  get width(): number {
    return this._dimension[0];
  }

  get height(): number {
    return this._dimension[1];
  }

  get aspectRatio(): number {
    return this.width / this.height;
  }

  get gl(): WebGL2RenderingContext {
    if (!this._gl) throw new Error('WebGL2RenderingContext not created');
    return this._gl;
  }

  get element(): HTMLCanvasElement {
    if (!this.canvasRef.current) throw new Error('Canvas not created');
    return this.canvasRef.current;
  }

  render(): ReactNode {
    return (
      <canvas
        ref={this.canvasRef}
        onMouseDown={this.mouseEvent}
        onMouseUp={this.mouseEvent}
        onMouseMove={this.mouseEvent}
        onMouseEnter={this.mouseEvent}
        onMouseLeave={this.mouseEvent}
        onTouchStart={this.touchEvent}
        onTouchEnd={this.touchEvent}
        onTouchMove={this.touchEvent}
        onContextMenu={e => e.preventDefault()}
        onWheel={e => this.fire(e, 'onwheel')}
      />
    );
  }

  componentDidMount(): void {
    const canvas = this.canvasRef.current;
    if (!canvas) throw new Error('Canvas not created');
    const gl = canvas.getContext('webgl2', this.props.glAttributes);
    if (!gl) throw new Error('Can not create WebGL2RenderingContext');
    this._gl = gl;
    this.resizeCanvas(canvas);
  }

  resize(width: number, height: number): void {
    const canvas = this.canvasRef.current;
    this._dimension[0] = width;
    this._dimension[1] = height;
    if (canvas) this.resizeCanvas(canvas);
  }

  private resizeCanvas(canvas: HTMLCanvasElement): void {
    canvas.width = this.width;
    canvas.height = this.height;
    this.gl.viewport(0, 0, canvas.width, canvas.height);
  }

  private mouseEvent(evt: React.MouseEvent<HTMLCanvasElement>): void {
    let method: keyof SandboxEventHandler | undefined;
    switch (evt.type) {
      case 'mousedown':
        method = 'onmousedown';
        break;
      case 'mouseup':
        method = 'onmouseup';
        break;
      case 'mousemove':
        method = 'onmousemove';
        break;
      case 'mouseenter':
        method = 'onmouseenter';
        break;
      case 'mouseleave':
        method = 'onmouseleave';
        break;
    }
    if (method) this.fire(evt, method);
  }

  private touchEvent(evt: React.TouchEvent<HTMLCanvasElement>): void {
    let method: keyof SandboxEventHandler | undefined;
    switch (evt.type) {
      case 'touchstart':
        method = 'ontouchstart';
        break;
      case 'touchend':
        method = 'ontouchend';
        break;
      case 'touchmove':
        method = 'ontouchmove';
        break;
    }
    if (method) this.fire(evt, method);
  }

  private fire(evt: React.UIEvent, method: keyof SandboxEventHandler): void {
    const eventHandler = this.props.eventHandler;
    if (eventHandler && eventHandler[method]) {
      const handlerMethod = eventHandler[method] as (e: Event) => void;
      handlerMethod.apply(eventHandler, [evt.nativeEvent]);
    }
  }
}
