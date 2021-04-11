import { AbstractGLSandbox } from '../gl/sandbox/AbstractGLSandbox';
import { Dimension, SandboxContainer } from '../gl/sandbox/GLSandbox';
import { QuadBuffers } from '../gl/sandbox/QuadBuffers';
import { Program } from '../gl/shader/Program';
import { GLTexture2D } from '../gl/texture/GLTexture';

interface UniformLocation {
  viewportSize: WebGLUniformLocation | null;
  seconds: WebGLUniformLocation | null;
  texture: WebGLUniformLocation | null;
}

type Resources = { program: Program; quadBuffers: QuadBuffers; texture: GLTexture2D };

export class TestSandbox extends AbstractGLSandbox {
  private _resources?: Resources;
  private uniformLocations: UniformLocation = { viewportSize: null, seconds: null, texture: null };

  constructor() {
    super('test');
  }

  private get resources(): Resources {
    if (!this._resources) throw new Error('Not initialized');
    return this._resources;
  }

  async setup(container: SandboxContainer): Promise<void> {
    super.setup(container);
    const program = await this.loadProgram('shaders/quad-vs.glsl', 'shaders/test/test-fs.glsl');
    program.use();
    this.uniformLocations = {
      viewportSize: program.uniformLocation('viewportSize'),
      seconds: program.uniformLocation('seconds'),
      texture: program.uniformLocation('u_sampler')
    };
    this.gl.uniform2f(this.uniformLocations.viewportSize, container.dimension.width, container.dimension.height);
    this.gl.uniform1f(this.uniformLocations.seconds, 0);

    const quadBuffers = new QuadBuffers(this.gl);
    const texture = new GLTexture2D(this.gl);
    texture
      .bind()
      .data({ width: 1, height: 1, buffer: new Uint8Array([0, 255, 0, 255]) })
      .data({ uri: 'images/momotte.jpg' })
      .unbind();
    this.gl.uniform1i(this.uniformLocations.texture, 0);

    this._resources = { texture: texture, program: program, quadBuffers: quadBuffers };
  }

  delete(): void {
    if (this._resources) {
      this._resources.quadBuffers.delete();
      this._resources.program.delete();
      this._resources.texture.delete();
      this._resources = undefined;
    }
  }

  onresize(dimension: Dimension) {
    this.gl.uniform2f(this.uniformLocations.viewportSize, dimension.width, dimension.height);
  }

  render(elapsedSeconds: number): void {
    this.gl.uniform1f(this.uniformLocations.seconds, elapsedSeconds);

    // this.gl.activeTexture(WebGL2RenderingContext.TEXTURE0);
    const resources = this.resources;

    resources.texture.bind().activate(0);
    resources.program.use();
    resources.texture.bind();
    resources.quadBuffers.draw();
    resources.texture.unbind();
  }
}
