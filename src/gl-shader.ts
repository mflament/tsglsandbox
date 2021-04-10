'use strict';

import { glCreate } from './gl-utils';

export interface ProgramConfiguration {
  gl: WebGL2RenderingContext;
  vsSource: string;
  fsSource: string;
  varyings?: string[];
}

export class Program {
  readonly _uniformLocations: { [name: string]: WebGLUniformLocation } = {};
  private readonly gl: WebGL2RenderingContext;
  private readonly program: WebGLProgram;
  constructor(config: ProgramConfiguration) {
    const gl = config.gl;
    this.gl = gl;
    this.program = glCreate(() => gl.createProgram());

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

    const numUniforms = gl.getProgramParameter(this.program, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < numUniforms; ++i) {
      const info = gl.getActiveUniform(this.program, i);
      if (info) {
        const location = gl.getUniformLocation(this.program, info.name);
        if (location) this._uniformLocations[info.name] = location;
      }
    }
  }

  private createShader(type: number, source: string): WebGLShader {
    const gl = this.gl;
    let shader = glCreate(() => gl.createShader(type));
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

  use() {
    this.gl.useProgram(this.program);
  }

  delete() {
    this.gl.deleteProgram(this.program);
  }
}
