import { md5 } from '../../utils/MD5';
import { Shader, ShaderType } from './Shader';
export class CompiledShadersCache {
  private readonly shadersCache: { [hash: string]: Shader } = {};

  constructor(readonly gl: WebGL2RenderingContext) {}

  compile(type: ShaderType, source: string): Shader {
    const hash = md5(source);
    let shader = this.shadersCache[hash];
    if (!shader) {
      shader = new Shader(this.gl, type).compile(source);
      this.shadersCache[hash] = shader;
    }
    return shader;
  }
}
