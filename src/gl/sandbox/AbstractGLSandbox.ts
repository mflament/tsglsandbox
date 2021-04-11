import { Program } from '../shader/Program';
import { ShaderLoader } from '../shader/ShaderLoader';
import { GLSandbox, Dimension, SandboxContainer } from './GLSandbox';

export abstract class AbstractGLSandbox implements GLSandbox {
  protected readonly shaderLoader = new ShaderLoader();
  protected _container?: SandboxContainer;

  constructor(readonly name: string) {}

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

  protected async loadProgram(vsSource: string, fsSource: string, varyings?: string[]): Promise<Program> {
    const vss = await this.shaderLoader.loadShader(vsSource);
    const fss = await this.shaderLoader.loadShader(fsSource);
    return new Program({
      gl: this.gl,
      vsSource: vss,
      fsSource: fss,
      varyings: varyings
    });
  }
}
