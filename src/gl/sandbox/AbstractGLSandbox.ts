import { Program, ProgramConfiguration } from '../shader/Program';
import { ShaderLoader } from '../shader/ShaderLoader';
import { GLSandbox, Dimension, SandboxContainer } from './GLSandbox';

export abstract class AbstractGLSandbox<P> implements GLSandbox<P> {
  protected readonly shaderLoader = new ShaderLoader();
  protected _container?: SandboxContainer;

  constructor(readonly name: string, readonly parameters: P) {}

  abstract render(runningSeconds: number): void;

  async setup(container: SandboxContainer): Promise<void> {
    this._container = container;
  }

  protected get container(): SandboxContainer {
    if (!this._container) throw new Error('Setup not called');
    return this._container;
  }

  protected get gl(): WebGL2RenderingContext {
    return this.container.gl;
  }

  protected get dimension(): Dimension {
    return this.container.dimension;
  }

  protected async loadProgram<T = any>(configuration: Omit<ProgramConfiguration<T>, 'gl'>): Promise<Program<T>> {
    const vss = await this.shaderLoader.loadShader(configuration.vsSource);
    const fss = await this.shaderLoader.loadShader(configuration.fsSource);
    return new Program({ gl: this.gl, ...configuration, vsSource: vss, fsSource: fss });
  }
}
