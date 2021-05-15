import { AbstractGLSandbox } from '../gl/sandbox/AbstractGLSandbox';
import { SandboxContainer, SandboxFactory } from '../gl/sandbox/GLSandbox';
import { newQuadDrawable, QUAD_VS } from '../gl/drawable/QuadDrawable';
import { Program } from '../gl/shader/Program';
import { GLTexture2D } from '../gl/texture/GLTexture';
import { IndexedDrawable } from '../gl/drawable/GLDrawable';

class TestUniforms {
  seconds: WebGLUniformLocation | null = null;
  u_sampler: WebGLUniformLocation | null = null;
}

class TestSandbox extends AbstractGLSandbox {
  static async create(container: SandboxContainer, name: string): Promise<TestSandbox> {
    const program = await container.programLoader.load({
      vspath: QUAD_VS,
      fspath: 'test/test.fs.glsl',
      uniformLocations: new TestUniforms()
    });
    return new TestSandbox(container, name, program);
  }

  readonly quadBuffers: IndexedDrawable;
  readonly texture: GLTexture2D;

  constructor(container: SandboxContainer, name: string, readonly renderProgram: Program<TestUniforms>) {
    super(container, name, {});
    this.texture = new GLTexture2D(container.gl)
      .activate(0)
      .bind()
      .data({ width: 1, height: 1, buffer: new Uint8Array([0, 255, 0, 255]) })
      .data({ uri: 'images/momotte.jpg' });
    renderProgram.use();
    container.gl.uniform1i(renderProgram.uniformLocations.u_sampler, 0);
    this.quadBuffers = newQuadDrawable(container.gl).bind();
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
