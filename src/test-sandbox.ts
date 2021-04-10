import { AbstractGLSandbox, Dimension, QuadBuffer } from './gl-sandbox';
import { Program } from './gl-shader';

export class TestSandbox extends AbstractGLSandbox {
  private _program?: Program;
  private _quadBuffer?: QuadBuffer;
  private startTime = 0;

  get program(): Program {
    if (!this._program) throw new Error('Not initialized');
    return this._program;
  }

  get quadBuffer(): QuadBuffer {
    if (!this._quadBuffer) throw new Error('Not initialized');
    return this._quadBuffer;
  }

  async setup(gl: WebGL2RenderingContext, dimension: Dimension): Promise<void> {
    super.setup(gl, dimension);
    this._program = await this.loadProgram('shaders/test/test-vs.glsl', 'shaders/test/test-fs.glsl');
    this._program.use();
    gl.uniform2f(this._program._uniformLocations['viewportSize'], dimension.width, dimension.height);
    gl.uniform1f(this._program._uniformLocations['seconds'], 0);
    this.startTime = performance.now();
    this._quadBuffer = this.newQuadBuffer();
  }

  resize(dimension: Dimension): void {
    super.resize(dimension);
    this.gl.uniform2f(this.program._uniformLocations['viewportSize'], dimension.width, dimension.height);
  }

  render(): void {
    this.gl.uniform1f(this.program._uniformLocations['seconds'], (performance.now() - this.startTime) / 1000);
    this.program.use();
    this.quadBuffer.bind();
    this.quadBuffer.draw();
    this.quadBuffer.unbind();
  }
}
