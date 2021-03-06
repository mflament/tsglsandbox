import {
  AbstractGLSandbox,
  GLTexture2D,
  IndexedDrawable,
  newQuadDrawable,
  newQuadProgram,
  Program,
  SandboxContainer,
  SandboxFactory
} from 'gl';

class TestUniforms {
  seconds: WebGLUniformLocation | null = null;
  u_sampler: WebGLUniformLocation | null = null;
}

class TestSandbox extends AbstractGLSandbox {
  static async create(container: SandboxContainer, name: string): Promise<TestSandbox> {
    const program = await newQuadProgram(container.programLoader, {
      fspath: 'sandboxes/test/test.fs.glsl',
      uniformLocations: new TestUniforms()
    });
    return new TestSandbox(container, name, program);
  }

  readonly quadBuffers: IndexedDrawable;
  readonly texture: GLTexture2D;

  constructor(container: SandboxContainer, name: string, readonly renderProgram: Program<TestUniforms>) {
    super(container, name);
    const gl = container.canvas.gl;
    this.texture = new GLTexture2D(gl).bind();
    this.texture.load('images/momotte.jpg').catch(e => console.error('Error loading texture', e));
    renderProgram.use();
    gl.uniform1i(renderProgram.uniformLocations.u_sampler, 0);
    this.quadBuffers = newQuadDrawable(gl).bind();
  }

  createDefaultParameters(): any {
    return {};
  }

  render(): void {
    this.quadBuffers.draw();
  }

  update(time: number) {
    this.gl.uniform1f(this.renderProgram.uniformLocations.seconds, time);
  }
}

export function testSandbox(): SandboxFactory {
  return TestSandbox.create;
}
