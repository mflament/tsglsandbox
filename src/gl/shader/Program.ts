'use strict';
import { checkNull } from '../gl-utils';

export interface ProgramConfiguration<T = any> {
  gl: WebGL2RenderingContext;
  vsSource: string;
  fsSource: string;
  varyings?: string[];
  uniformLocations: T;
}

export class Program<T = any> {
  private readonly gl: WebGL2RenderingContext;
  private readonly program: WebGLProgram;
  private readonly _uniformLocations: T;

  constructor(config: ProgramConfiguration<T>) {
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

  use(): Program {
    this.gl.useProgram(this.program);
    return this;
  }

  delete(): void {
    this.gl.deleteProgram(this.program);
  }

  private createShader(type: number, source: string): WebGLShader {
    const gl = this.gl;
    const shader = checkNull(() => gl.createShader(type));
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (gl.getShaderParameter(shader, WebGL2RenderingContext.COMPILE_STATUS)) {
      gl.attachShader(this.program, shader);
      return shader;
    }

    const log = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw 'Error creating shader ' + source + '\n' + log;
  }

  private configureUniformLocations(locations: T): T {
    const names = Object.keys(locations);
    const target = locations as any;
    for (const name of names) {
      target[name] = this.gl.getUniformLocation(this.program, name);
    }
    return locations;
  }
}
