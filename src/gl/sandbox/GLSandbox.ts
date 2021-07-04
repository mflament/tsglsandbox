import { ProgramLoader } from 'gl';

export type SandboxFactories = { [name: string]: SandboxFactory };

export interface SandboxCanvas {
  readonly element: HTMLCanvasElement;
  readonly gl: WebGL2RenderingContext;
  readonly width: number;
  readonly height: number;
  readonly aspectRatio: number;
  eventHandler?: SandboxEventHandler;
  resize(width: number, height: number): void;
}

export interface SandboxContainer {
  readonly canvas: SandboxCanvas;
  readonly programLoader: ProgramLoader;
  readonly time: number;
}

export type SandboxFactory<P = any> = (container: SandboxContainer, name: string) => Promise<GLSandbox<P>>;

export interface SandboxEventHandler {
  onmousedown: (event: MouseEvent) => void;
  onmouseup: (event: MouseEvent) => void;
  onmousemove: (event: MouseEvent) => void;

  onmouseenter: (event: MouseEvent) => void;
  onmouseleave: (event: MouseEvent) => void;

  ontouchstart: (e: TouchEvent) => void;
  ontouchend: (e: TouchEvent) => void;
  ontouchmove: (e: TouchEvent) => void;

  onwheel: (event: WheelEvent) => void;

  onkeydown: (event: KeyboardEvent) => void;
  onkeyup: (event: KeyboardEvent) => void;
}

export interface GLSandbox<P = any> {
  readonly container: SandboxContainer;
  readonly name: string;
  readonly defaultParameters: P;
  readonly displayName?: string;
  readonly customControls?: JSX.Element;
  parameters: P;

  ups: number;
  running: boolean;

  readonly eventHandler?: Partial<SandboxEventHandler>;

  render(): void;
  /**
   * time: current time in s
   * dt: delta time (~ 1 / ups)
   */
  update?: (time: number, dt: number) => void;

  delete?: () => void;

  onparameterchange?: () => any;
  onresize?: (dimension: { width: number; height: number }) => void;
}
