import { Deletable } from '../gl/utils/GLUtils';
import { AbstractGLSandbox, sandboxFactory } from '../gl/sandbox/AbstractGLSandbox';
import { Dimension, SandboxContainer, SandboxFactory } from '../gl/sandbox/GLSandbox';
import { newQuadBuffer } from '../gl/buffers/GLDrawables';
import { Program } from '../gl/shader/Program';
import { GLTexture2D } from '../gl/texture/GLTexture';

// @ts-ignore
import quadVertexShader from 'assets/shaders/quad.vs.glsl';
// @ts-ignore
import testFragmentShader from 'assets/shaders/test/test.fs.glsl';
import { IndexedBufferDrawable } from '../gl/buffers/GLDrawable';

class TestResources implements Deletable {
  readonly quadBuffers: IndexedBufferDrawable;
  readonly texture: GLTexture2D;
  constructor(
    readonly container: SandboxContainer,
    readonly renderProgram: Program<
      any,
      {
        viewportSize: null;
        seconds: null;
        u_sampler: null;
      }
    >
  ) {
    this.texture = new GLTexture2D(container.gl)
      .bind()
      .data({ width: 1, height: 1, buffer: new Uint8Array([0, 255, 0, 255]) })
      .data({ uri: 'images/momotte.jpg' })
      .activate(0);
    renderProgram.use();
    container.gl.uniform1i(renderProgram.uniformLocations.u_sampler, 0);
    this.quadBuffers = newQuadBuffer(container.gl).bind();
  }
  delete(): void {
    this.quadBuffers.unbind().delete();
    this.texture.unbind().delete();
    this.container.gl.useProgram(null);
    this.renderProgram.delete();
  }
}

async function loadResources(container: SandboxContainer): Promise<TestResources> {
  const program = await container.programLoader.loadProgram({
    vsSource: quadVertexShader,
    fsSource: testFragmentShader,
    attributeLocations: {},
    uniformLocations: {
      viewportSize: null,
      seconds: null,
      u_sampler: null
    }
  });
  return new TestResources(container, program);
}

class TestSandbox extends AbstractGLSandbox<TestResources, never> {
  private newDimension?: Dimension;
  constructor(container: SandboxContainer, name: string, resources: TestResources) {
    super(container, name, resources, {} as never);
    this.newDimension = container.dimension;
  }

  delete(): void {
    this.resources.delete();
    super.delete();
  }

  onresize(dimension: Dimension): void {
    this.newDimension = dimension;
  }

  render(): void {
    if (this.newDimension) {
      this.gl.uniform2f(
        this.resources.renderProgram.uniformLocations.viewportSize,
        this.newDimension.width,
        this.newDimension.height
      );
      this.newDimension = undefined;
    }
    const resources = this.resources;
    resources.quadBuffers.draw();
  }

  update(time: number) {
    this.gl.uniform1f(this.resources.renderProgram.uniformLocations.seconds, time / 1000);
  }
}

export function test(): SandboxFactory {
  return sandboxFactory(loadResources, (container, name, resources) => new TestSandbox(container, name, resources));
}
