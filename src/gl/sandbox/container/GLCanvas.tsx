import React, { Component, ReactNode, RefObject } from 'react';
import { SandboxCanvas } from '../GLSandbox';
import { SandboxInputHandler } from '../ActionManager';

interface CanvasProps {
  glAttributes?: WebGLContextAttributes;
  inputHandler?: SandboxInputHandler;
  onResize: () => void;
}

export class GLCanvas extends Component<CanvasProps> implements SandboxCanvas {
  private readonly canvasRef: RefObject<HTMLCanvasElement>;
  private readonly resizeObserver: ResizeObserver;
  private _gl?: WebGL2RenderingContext;

  constructor(props: CanvasProps) {
    super(props);
    this.canvasRef = React.createRef();
    this.resizeCanvas = this.resizeCanvas.bind(this);
    this.resizeObserver = new ResizeObserver(this.resizeCanvas);
    this.mouseEvent = this.mouseEvent.bind(this);
    this.touchEvent = this.touchEvent.bind(this);
  }

  get width(): number {
    return this.canvasRef.current?.width || 0;
  }

  get height(): number {
    return this.canvasRef.current?.height || 0;
  }

  get aspectRatio(): number {
    const canvas = this.canvasRef.current;
    if (canvas && canvas.height > 0) return canvas.width / canvas.height;
    return 0;
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

    this.resizeObserver.observe(canvas);
    this.resizeCanvas();
  }

  componentWillUnmount(): void {
    if (this.canvasRef.current) this.resizeObserver.unobserve(this.canvasRef.current);
  }

  resizeCanvas(): void {
    const canvas = this.canvasRef.current;
    if (canvas) {
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
      this.gl.viewport(0, 0, canvas.width, canvas.height);
      this.props.onResize();
    }
  }

  private mouseEvent(evt: React.MouseEvent<HTMLCanvasElement>): void {
    let method: keyof SandboxInputHandler | undefined;
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
    let method: keyof SandboxInputHandler | undefined;
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

  private fire(evt: React.UIEvent, method: keyof SandboxInputHandler): void {
    const eventHandler = this.props.inputHandler;
    if (eventHandler && eventHandler[method]) {
      const handlerMethod = eventHandler[method] as (e: Event) => void;
      handlerMethod.apply(eventHandler, [evt.nativeEvent]);
    }
  }
}
