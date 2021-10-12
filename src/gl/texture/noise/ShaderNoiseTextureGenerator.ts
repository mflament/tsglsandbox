import {
  AbstractNoiseTextureGenerator,
  createVec2,
  isFractalNoiseParameters,
  NoiseParameters
} from './NoiseTextureGenerator';
import { vec2 } from 'gl-matrix';
import { GLTexture2D } from '../GLTexture';
import { Deletable } from '../../GLUtils';
import { newQuadDrawable, newQuadProgram, QuadProgram } from '../../drawable/QuadDrawable';
import { IndexedDrawable } from '../../drawable/GLDrawable';
import { FrameBuffer } from '../../buffers/FrameBuffer';
import { SandboxContainer } from '../../sandbox/GLSandbox';

class NoiseUniforms {
  offset: WebGLUniformLocation | null = null;
  scale: WebGLUniformLocation | null = null;
  range: WebGLUniformLocation | null = null;
  octaves: WebGLUniformLocation | null = null;
  persistence: WebGLUniformLocation | null = null;
}

export class ShaderNoiseTextureGenerator extends AbstractNoiseTextureGenerator implements Deletable {
  private readonly quad: IndexedDrawable;
  private readonly fb: FrameBuffer;

  private program?: QuadProgram<NoiseUniforms>;

  constructor(readonly container: SandboxContainer) {
    super(container.canvas.gl);
    this.quad = newQuadDrawable(this.gl);
    this.fb = new FrameBuffer(this.gl);
  }

  delete(): void {
    this.quad.delete();
    this.fb.delete();
  }

  protected async doGenerate(_size: vec2, params: NoiseParameters, target: GLTexture2D): Promise<void> {
    if (!this.program) {
      if (!this.gl.getExtension('EXT_color_buffer_float')) {
        throw new Error('No required extension EXT_color_buffer_float');
      }

      this.program = await newQuadProgram(this.container.programLoader, {
        fspath: 'gl/texture/noise/generate-noise.glsl',
        uniformLocations: new NoiseUniforms()
      });
    }

    this.program.use();
    const locations = this.program.uniformLocations;
    this.uvec2(locations.offset, params.offset);
    this.uvec2(locations.scale, params.scale);
    this.uvec2(locations.range, params.range);
    let octaves = 1,
      persistence = 0;
    if (isFractalNoiseParameters(params)) {
      octaves = params.octaves;
      persistence = params.persistence;
    }
    this.gl.uniform1i(locations.octaves, octaves);
    this.gl.uniform1f(locations.persistence, persistence);

    target.unbind();
    this.fb.bind().attach(target);
    this.gl.viewport(0, 0, target.width, target.height);
    this.quad.bind().draw();
    const canvas = this.container.canvas;
    this.gl.viewport(0, 0, canvas.width, canvas.height);
    this.fb.checkStatus();
    this.fb.detach().unbind();
  }

  private uvec2(l: WebGLUniformLocation | null, v: vec2 | number): void {
    if (l) {
      v = createVec2(v);
      this.gl.uniform2f(l, v[0], v[1]);
    }
  }
}
