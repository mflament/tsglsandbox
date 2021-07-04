import {
  AbstractGLSandbox,
  SandboxContainer,
  SandboxFactory,
  Program,
  IndexedDrawable,
  GLTexture2D,
  newQuadDrawable,
  quadProgram
} from 'gl';

class TestUniforms {
  seconds: WebGLUniformLocation | null = null;
  u_sampler: WebGLUniformLocation | null = null;
}

class TestSandbox extends AbstractGLSandbox {
  static async create(container: SandboxContainer, name: string): Promise<TestSandbox> {
    const program = await quadProgram(container.programLoader, {
      fspath: 'test/test.fs.glsl',
      uniformLocations: new TestUniforms()
    });
    return new TestSandbox(container, name, program);
  }

  readonly quadBuffers: IndexedDrawable;
  readonly texture: GLTexture2D;

  constructor(container: SandboxContainer, name: string, readonly renderProgram: Program<TestUniforms>) {
    super(container, name, {});
    const gl = container.canvas.gl;
    this.texture = new GLTexture2D(gl)
      .activate(0)
      .bind()
      .data({ width: 1, height: 1, buffer: new Uint8Array([0, 255, 0, 255]) })
      .data({ uri: 'images/momotte.jpg' });
    renderProgram.use();
    gl.uniform1i(renderProgram.uniformLocations.u_sampler, 0);
    this.quadBuffers = newQuadDrawable(gl).bind();
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
