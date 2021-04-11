'use strict';
import { checkNull } from '../gl-utils';

export interface ProgramConfiguration {
  gl: WebGL2RenderingContext;
  vsSource: string;
  fsSource: string;
  varyings?: string[];
}

export type UniformLocations = {
  [name: string]: WebGLUniformLocation | null;
};

export class Program {
  private readonly gl: WebGL2RenderingContext;
  private readonly program: WebGLProgram;
  constructor(config: ProgramConfiguration) {
    const gl = config.gl;
    this.gl = gl;
    this.program = checkNull(() => gl.createProgram());

    const vs = this.createShader(WebGL2RenderingContext.VERTEX_SHADER, config.vsSource);
    const fs = this.createShader(WebGL2RenderingContext.FRAGMENT_SHADER, config.fsSource);
    if (config.varyings)
      gl.transformFeedbackVaryings(this.program, config.varyings, WebGL2RenderingContext.INTERLEAVED_ATTRIBS);

    gl.linkProgram(this.program);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    if (!gl.getProgramParameter(this.program, WebGL2RenderingContext.LINK_STATUS)) {
      let log = this.gl.getProgramInfoLog(this.program);
      this.gl.deleteProgram(this.program);
      throw 'Error linking program ' + log;
    }
  }

  uniformLocation(name: string): WebGLUniformLocation | null {
    return this.gl.getUniformLocation(this.program, name);
  }

  uniformLocations<T extends UniformLocations>(locations: T): T {
    const names = Object.keys(locations);
    const target = locations as any;
    for (const name of names) {
      target[name] = this.uniformLocation(name);
    }
    return locations;
  }

  use(): Program {
    this.gl.useProgram(this.program);
    return this;
  }

  delete() {
    this.gl.deleteProgram(this.program);
  }

  private createShader(type: number, source: string): WebGLShader {
    const gl = this.gl;
    let shader = checkNull(() => gl.createShader(type));
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (gl.getShaderParameter(shader, WebGL2RenderingContext.COMPILE_STATUS)) {
      gl.attachShader(this.program, shader);
      return shader;
    }

    let log = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw 'Error creating shader ' + source + '\n' + log;
  }
}
