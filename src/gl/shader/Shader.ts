import { checkNull, Deletable } from '../utils/GLUtils';
import { ShaderType } from './Program';

function numberize(source: string): string {
  return source
    .split(/\r?\n/)
    .map((line, index) => pad(index + 1, 2) + ': ' + line)
    .join('\n');
}

function pad(n: number, width: number, z = ' '): string {
  const s = n + '';
  return s.length >= width ? n.toString() : new Array(width - s.length + 1).join(z) + n;
}

export class Shader implements Deletable {
  readonly glshader: WebGLShader;

  constructor(readonly gl: WebGL2RenderingContext, readonly type: ShaderType) {
    this.glshader = checkNull(() => gl.createShader(type));
  }

  compile(source: string): Shader {
    this.gl.shaderSource(this.glshader, source);
    this.gl.compileShader(this.glshader);
    if (!this.gl.getShaderParameter(this.glshader, WebGL2RenderingContext.COMPILE_STATUS)) {
      const log = this.gl.getShaderInfoLog(this.glshader);
      this.delete();
      throw `Error compiling ${this.typeName} shader:\n${numberize(source)}\n${log}`;
    }
    return this;
  }

  get typeName(): string {
    return this.type === ShaderType.VERTEX_SHADER ? 'vertex' : 'fragment';
  }

  delete(): void {
    this.gl.deleteShader(this.glshader);
  }
}
