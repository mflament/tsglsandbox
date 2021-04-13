export interface Dimension {
  width: number;
  height: number;
}

export interface SandboxContainer {
  readonly gl: WebGL2RenderingContext;
  readonly containerElement: HTMLElement;
  readonly canvas: HTMLCanvasElement;
  readonly clientArea: Dimension;
  dimension: Dimension;
}

export interface GLSandbox<P = any> {
  name: string;
  parameters: P;
  overlayContent?: HTMLElement;

  render(runningSeconds: number): void;
  setup?: (container: SandboxContainer) => Promise<void>;
  delete?: () => void;

  onParametersChanged?: () => void;

  onresize?: (dimension: Dimension) => Dimension | void;

  onmousedown?: (event: MouseEvent) => void;
  onmouseup?: (event: MouseEvent) => void;
  onmousemove?: (event: MouseEvent) => void;

  ontouchstart?: (e: TouchEvent) => void;
  ontouchend?: (e: TouchEvent) => void;
  ontouchmove?: (e: TouchEvent) => void;

  onwheel?: (event: WheelEvent) => void;
  onkeydown?: (event: KeyboardEvent) => void;
  onkeyup?: (event: KeyboardEvent) => void;
}
