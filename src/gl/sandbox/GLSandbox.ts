import { ProgramLoader } from '../shader/Program';

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
  programLoader: ProgramLoader;
}

export type SandboxFactory<P = any> = (container: SandboxContainer, name: string) => Promise<GLSandbox<P>>;

export interface GLSandbox<P = any> {
  readonly name: string;
  readonly parameters: P;
  readonly overlayContent?: HTMLElement;
  running: boolean;

  render(): void;

  /**
   * time: current time in ms
   * dt: delta time
   */
  update?: (time: number, dt: number) => void;

  delete?: () => void;

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
