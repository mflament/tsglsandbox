import { vec2 } from 'gl-matrix';
import { ProgramLoader } from '../shader/ProgramLoader';

export interface SandboxContainer {
  readonly gl: WebGL2RenderingContext;
  readonly containerElement: HTMLElement;
  readonly canvas: HTMLCanvasElement;
  readonly clientArea: vec2;
  dimension: vec2;
  programLoader: ProgramLoader;
  time: number;
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

  onresize?: (dimension: vec2) => vec2 | void;

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
