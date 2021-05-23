import {
  AbstractGLSandbox,
  SandboxContainer,
  SandboxFactory,
  newQuadDrawable,
  QUAD_VS,
  Program,
  IndexedDrawable
} from 'gl';

interface FlowerParameters {
  flowersCount: number;
}

class RenderUnforms {}

class FlowersSandbox extends AbstractGLSandbox<FlowerParameters> {
  static async create(container: SandboxContainer, name: string): Promise<FlowersSandbox> {
    const programs = {
      render: await container.programLoader.load({
        vspath: QUAD_VS,
        fspath: 'flowers/render-flowers.fs.glsl',
        uniformLocations: new RenderUnforms()
      })
    };
    // const updateProgram = await container.programLoader.load({
    //   vspath: QUAD_VS,
    //   fspath: 'gol/gol-update.fs.glsl',
    //   uniformLocations: new UpdateUnforms()
    // });
    const parameters: FlowerParameters = { flowersCount: 100 };
    window.hashLocation.parseParams(parameters);
    return new FlowersSandbox(container, name, parameters, programs);
  }

  private readonly quadDrawable: IndexedDrawable;

  constructor(
    container: SandboxContainer,
    name: string,
    readonly parameters: FlowerParameters,
    readonly programs: { render: Program<RenderUnforms> }
  ) {
    super(container, name, parameters);
    this.quadDrawable = newQuadDrawable(this.gl);
  }

  render(): void {
    super.clear([0, 0, 0, 1]);
    this.quadDrawable.draw();
  }
}

export function flowers(): SandboxFactory<FlowerParameters> {
  return FlowersSandbox.create;
}
