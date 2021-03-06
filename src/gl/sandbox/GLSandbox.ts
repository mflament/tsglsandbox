import { ProgramLoader } from '../shader/ProgramLoader';
import { SandboxInputHandler } from './ActionManager';
import { ShaderLoader } from '../shader/ShaderLoader';
import { ShaderParser } from '../shader/parser/ShaderParser';

export type SandboxFactories = { [name: string]: SandboxFactory };

export interface SandboxCanvas {
  readonly element: HTMLCanvasElement;
  readonly gl: WebGL2RenderingContext;
  readonly width: number;
  readonly height: number;
  readonly aspectRatio: number;
  eventHandler?: SandboxInputHandler;
}

export interface SandboxContainer {
  readonly canvas: SandboxCanvas;
  readonly shaderLoader: ShaderLoader;
  readonly shaderParser: ShaderParser;
  readonly programLoader: ProgramLoader;
  readonly time: number;

  updateControls(): void;
}

export type SandboxFactory<P = any> = (
  container: SandboxContainer,
  name: string,
  parameters?: P
) => Promise<GLSandbox<P>>;

export interface GLSandbox<P = any> extends SandboxInputHandler {
  readonly container: SandboxContainer;
  readonly name: string;
  readonly defaultParameters: P;
  readonly displayName?: string;
  readonly controls?: JSX.Element;
  readonly parameters: P;

  ups: number;
  running: boolean;

  render(): void;

  /**
   * time: current time in s
   * dt: delta time (~ 1 / ups)
   */
  update?: (time: number, dt: number) => void;

  delete?: () => void;

  onresize?: (dimension: { width: number; height: number }) => void;

  resetParameters(): void;
}
