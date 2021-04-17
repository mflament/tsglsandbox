'use strict';
import { md5 } from '../../utils/MD5';
import { checkNull } from '../GLUtils';

export interface ProgramConfiguration<T = any> {
  gl: WebGL2RenderingContext;
  vsSource: string;
  fsSource: string;
  varyings?: string[];
  uniformLocations: T;
}

export enum ShaderType {
  VERTEX_SHADER = WebGL2RenderingContext.VERTEX_SHADER,
  FRAGMENT_SHADER = WebGL2RenderingContext.FRAGMENT_SHADER
}

const shadersCache: { [hash: string]: WebGLShader } = {};

function compileShader(gl: WebGL2RenderingContext, type: ShaderType, source: string): WebGLShader {
  const hash = md5(source);
  if (!shadersCache[hash]) {
    const shader = checkNull(() => gl.createShader(type));
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, WebGL2RenderingContext.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw 'Error creating shader ' + source + '\n' + log;
    }
    shadersCache[hash] = shader;
  }
  return shadersCache[hash];
}

export class Program<T = any> {
  private readonly gl: WebGL2RenderingContext;
  private readonly program: WebGLProgram;
  private readonly _uniformLocations: T;

  constructor(config: ProgramConfiguration<T>) {
    const gl = config.gl;
    this.gl = gl;
    this.program = checkNull(() => gl.createProgram());

    gl.attachShader(this.program, compileShader(gl, ShaderType.VERTEX_SHADER, config.vsSource));
    gl.attachShader(this.program, compileShader(gl, ShaderType.FRAGMENT_SHADER, config.fsSource));
    if (config.varyings)
      gl.transformFeedbackVaryings(this.program, config.varyings, WebGL2RenderingContext.INTERLEAVED_ATTRIBS);
    gl.linkProgram(this.program);
    if (!gl.getProgramParameter(this.program, WebGL2RenderingContext.LINK_STATUS)) {
      const log = this.gl.getProgramInfoLog(this.program);
      this.gl.deleteProgram(this.program);
      throw 'Error linking program ' + log;
    }
    this.use();
    this._uniformLocations = this.configureUniformLocations(config.uniformLocations);
  }

  get uniformLocations(): T {
    return this._uniformLocations;
  }

  get attributeLocations(): { [name: string]: number } {
    const count = this.gl.getProgramParameter(this.program, WebGL2RenderingContext.ACTIVE_ATTRIBUTES);
    const res: { [name: string]: number } = {};
    for (let index = 0; index < count; index++) {
      const name = this.gl.getActiveAttrib(this.program, index)?.name;
      if (name) {
        const location = this.gl.getAttribLocation(this.program, name);
        res[name] = location;
      }
    }
    return res;
  }

  use(): Program {
    this.gl.useProgram(this.program);
    return this;
  }

  delete(): void {
    this.gl.deleteProgram(this.program);
  }

  private configureUniformLocations(locations: T): T {
    const names = Object.keys(locations);
    const target = locations as any;
    for (const name of names) {
      const location = this.gl.getUniformLocation(this.program, name);
      if (location) target[name] = location;
    }
    return locations;
  }
}
