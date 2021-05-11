import { Deletable } from '../gl/utils/GLUtils';
import { AbstractGLSandbox, newSandboxFactory } from '../gl/sandbox/AbstractGLSandbox';
import { SandboxContainer, SandboxFactory } from '../gl/sandbox/GLSandbox';
import { newQuadDrawable, QUAD_VS } from '../gl/drawable/QuadDrawable';
import { Program } from '../gl/shader/Program';
import { GLTexture2D } from '../gl/texture/GLTexture';
import { IndexedDrawable } from '../gl/drawable/GLDrawable';

class TestUniforms {
  seconds: WebGLUniformLocation | null = null;
  u_sampler: WebGLUniformLocation | null = null;
}

class TestResources implements Deletable {
  static async create(container: SandboxContainer): Promise<TestResources> {
    const program = await container.programLoader.load({
      vspath: QUAD_VS,
      fspath: 'test/test.fs.glsl',
      uniformLocations: new TestUniforms()
    });
    return new TestResources(container, program);
  }

  readonly quadBuffers: IndexedDrawable;
  readonly texture: GLTexture2D;
  constructor(readonly container: SandboxContainer, readonly renderProgram: Program<TestUniforms>) {
    this.texture = new GLTexture2D(container.gl)
      .bind()
      .data({ width: 1, height: 1, buffer: new Uint8Array([0, 255, 0, 255]) })
      .data({ uri: 'images/momotte.jpg' })
      .activate(0);
    renderProgram.use();
    container.gl.uniform1i(renderProgram.uniformLocations.u_sampler, 0);
    this.quadBuffers = newQuadDrawable(container.gl).bind();
  }
  delete(): void {
    this.quadBuffers.unbind().delete();
    this.texture.unbind().delete();
    this.container.gl.useProgram(null);
    this.renderProgram.delete();
  }
}

class TestSandbox extends AbstractGLSandbox<TestResources, never> {
  constructor(container: SandboxContainer, name: string, resources: TestResources) {
    super(container, name, resources, {} as never);
  }

  delete(): void {
    this.resources.delete();
    super.delete();
  }

  render(): void {
    const resources = this.resources;
    resources.quadBuffers.draw();
  }

  update(time: number) {
    this.gl.uniform1f(this.resources.renderProgram.uniformLocations.seconds, time);
  }
}

export function test(): SandboxFactory {
  return newSandboxFactory(
    TestResources.create,
    (container, name, resources) => new TestSandbox(container, name, resources)
  );
}
