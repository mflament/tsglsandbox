'use strict';
import { md5 } from '../../utils/MD5';
import { checkNull, Deletable } from '../utils/GLUtils';

export interface ProgramConfiguration<A = any, U = any> {
  vsSource: string | Promise<string>;
  fsSource: string | Promise<string>;
  varyings?: string[];
  attributeLocations?: A;
  uniformLocations?: U;
  defines?: any;
}

export class ProgramLoader implements Deletable {
  private readonly shadersCache: { [hash: string]: WebGLShader } = {};

  constructor(readonly gl: WebGL2RenderingContext) {}

  async loadProgram<A = any, U = any>(config: ProgramConfiguration<A, U>): Promise<Program<A, U>> {
    const sources = await Promise.all([config.vsSource, config.fsSource]);
    const shaders = [
      this.compileShader(ShaderType.VERTEX_SHADER, sources[0]),
      this.compileShader(ShaderType.FRAGMENT_SHADER, sources[1])
    ];
    const program = checkNull(() => this.gl.createProgram());
    shaders.forEach(shader => this.gl.attachShader(program, shader));
    if (config.varyings) {
      this.gl.transformFeedbackVaryings(program, config.varyings, WebGL2RenderingContext.INTERLEAVED_ATTRIBS);
    }

    this.gl.linkProgram(program);

    shaders.forEach(shader => this.gl.detachShader(program, shader));

    if (!this.gl.getProgramParameter(program, WebGL2RenderingContext.LINK_STATUS)) {
      const log = this.gl.getProgramInfoLog(program);
      this.gl.deleteProgram(program);
      throw 'Error linking program ' + log;
    }
    const attributeLocations = config.attributeLocations
      ? this.configureAttributeLocations(program, config.attributeLocations)
      : ({} as A);
    const uniformLocations = config.uniformLocations
      ? this.configureUniformLocations(program, config.uniformLocations)
      : ({} as U);
    return new Program(this.gl, program, attributeLocations, uniformLocations);
  }

  delete(): void {
    Object.values(this.shadersCache).forEach(shader => this.gl.deleteShader(shader));
  }

  private compileShader(type: ShaderType, source: string): WebGLShader {
    const hash = md5(source);
    if (!this.shadersCache[hash]) {
      const shader = checkNull(() => this.gl.createShader(type));
      this.gl.shaderSource(shader, source);
      this.gl.compileShader(shader);
      if (!this.gl.getShaderParameter(shader, WebGL2RenderingContext.COMPILE_STATUS)) {
        const log = this.gl.getShaderInfoLog(shader);
        this.gl.deleteShader(shader);
        throw 'Error creating shader ' + source + '\n' + log;
      }
      this.shadersCache[hash] = shader;
    }
    return this.shadersCache[hash];
  }

  private configureAttributeLocations<A = any>(program: WebGLProgram, locations: A): A {
    const names = Object.keys(locations);
    const target = locations as any;
    for (const name of names) {
      const location = this.gl.getAttribLocation(program, name);
      if (location) target[name] = location;
    }
    return locations;
  }

  private configureUniformLocations<U = any>(program: WebGLProgram, locations: U): U {
    const names = Object.keys(locations);
    const target = locations as any;
    for (const name of names) {
      const location = this.gl.getUniformLocation(program, name);
      if (location) target[name] = location;
    }
    return locations;
  }
}

export class Program<A = any, U = any> {
  constructor(
    readonly gl: WebGL2RenderingContext,
    readonly program: WebGLProgram,
    readonly attributeLocations: A,
    readonly uniformLocations: U
  ) {
    this.use();
  }

  use(): Program {
    this.gl.useProgram(this.program);
    return this;
  }

  delete(): void {
    this.gl.deleteProgram(this.program);
  }
}

export enum ShaderType {
  VERTEX_SHADER = WebGL2RenderingContext.VERTEX_SHADER,
  FRAGMENT_SHADER = WebGL2RenderingContext.FRAGMENT_SHADER
}
