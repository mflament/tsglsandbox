export interface Dimension {
  width: number;
  height: number;
}
export type SandboxParams = { [key: string]: string };

export interface SandboxContainer {
  readonly gl: WebGL2RenderingContext;
  readonly containerElement: HTMLElement;
  readonly canvas: HTMLCanvasElement;
  readonly clientArea: Dimension;
  dimension: Dimension;
  params: SandboxParams;
}

export interface GLSandbox {
  name: string;
  render(runningSeconds: number): void;
  setup?: (container: SandboxContainer) => Promise<void>;
  onParamsChanged?: (newParams: SandboxParams) => void;
  delete?: () => void;
  onresize?: (dimension: Dimension) => Dimension | void;
  onmousemove?: (event: MouseEvent) => void;
  onmouseup?: (event: MouseEvent) => void;
  onmousedown?: (event: MouseEvent) => void;
  onwheel?: (event: WheelEvent) => void;
  onkeydown?: (event: KeyboardEvent) => void;
  onkeyup?: (event: KeyboardEvent) => void;
}
