'use strict';
import { md5 } from '../../utils/MD5';
import { checkNull, Deletable } from '../utils/GLUtils';
import { Shader } from './Shader';
import { VaryingBufferMode } from './TransformFeedback';

export interface ProgramLocations<A = any, U = any, B = any> {
  attributeLocations?: A;
  uniformLocations?: U;
  uniformBlockLocations?: B;
}

export interface ProgramConfiguration<A = any, U = any, B = any> extends ProgramLocations<A, U, B> {
  vsSource: string | Promise<string>;
  fsSource: string | Promise<string>;
  varyings?: string[];
}

export class ProgramLoader implements Deletable {
  private readonly shadersCache: { [hash: string]: Shader } = {};

  constructor(readonly gl: WebGL2RenderingContext) {}

  async loadProgram<A = any, U = any, B = any>(config: ProgramConfiguration<A, U, B>): Promise<Program<A, U, B>> {
    const sources = await Promise.all([config.vsSource, config.fsSource]);
    const shaders = [
      this.compileShader(ShaderType.VERTEX_SHADER, sources[0]),
      this.compileShader(ShaderType.FRAGMENT_SHADER, sources[1])
    ];
    return new Program(this.gl, config).link(shaders, config.varyings);
  }

  delete(): void {
    Object.values(this.shadersCache).forEach(shader => this.gl.deleteShader(shader));
  }

  private compileShader(type: ShaderType, source: string): Shader {
    const hash = md5(source);
    let shader = this.shadersCache[hash];
    if (!shader) {
      shader = new Shader(this.gl, type).compile(source);
      this.shadersCache[hash] = shader;
    }
    return shader;
  }
}

export class Program<A = any, U = any, B = any> {
  readonly glprogram: WebGLProgram;
  readonly attributeLocations: A;
  readonly uniformLocations: U;
  readonly uniformBlockLocations: B;

  constructor(readonly gl: WebGL2RenderingContext, locations?: ProgramLocations) {
    this.glprogram = checkNull(() => this.gl.createProgram());
    this.attributeLocations = locations?.attributeLocations ? locations?.attributeLocations : ({} as A);
    this.uniformLocations = locations?.uniformLocations ? locations?.uniformLocations : ({} as U);
    this.uniformBlockLocations = locations?.uniformBlockLocations ? locations?.uniformBlockLocations : ({} as U);
  }

  link(
    shaders: Shader[],
    varyings?: string[],
    bufferMode: VaryingBufferMode = VaryingBufferMode.INTERLEAVED_ATTRIBS
  ): Program {
    shaders.forEach(s => s.attach(this));

    if (varyings) this.gl.transformFeedbackVaryings(this.glprogram, varyings, bufferMode);

    this.gl.linkProgram(this.glprogram);

    shaders.forEach(shader => shader.detach(this));

    if (!this.gl.getProgramParameter(this.glprogram, WebGL2RenderingContext.LINK_STATUS)) {
      const log = this.gl.getProgramInfoLog(this.glprogram);
      this.gl.deleteProgram(this.glprogram);
      throw 'Error linking program ' + log;
    }

    this.use();
    this.configureAttributeLocations();
    this.configureUniformLocations();
    this.configureUniformBlockLocations();
    return this;
  }

  bindUniformBlock(blockIndex: number, blockBinding: number): Program {
    this.gl.uniformBlockBinding(this.glprogram, blockIndex, blockBinding);
    return this;
  }

  use(): Program {
    this.gl.useProgram(this.glprogram);
    return this;
  }

  delete(): void {
    this.gl.deleteProgram(this.glprogram);
  }

  private configureAttributeLocations(): void {
    const names = Object.keys(this.attributeLocations);
    const target = this.attributeLocations as any;
    for (const name of names) {
      const location = this.gl.getAttribLocation(this.glprogram, name);
      target[name] = location;
      if (location === WebGL2RenderingContext.INVALID_INDEX) console.error(`attribute '${name}' not found`);
    }
  }

  private configureUniformLocations(): void {
    const names = Object.keys(this.uniformLocations);
    const target = this.uniformLocations as any;
    for (const name of names) {
      const location = this.gl.getUniformLocation(this.glprogram, name);
      if (location !== null) target[name] = location;
      else console.error(`uniform '${name}' not found`);
    }
  }

  private configureUniformBlockLocations(): void {
    const names = Object.keys(this.uniformBlockLocations);
    const target = this.uniformBlockLocations as any;
    for (const name of names) {
      const location = this.gl.getUniformBlockIndex(this.glprogram, name);
      target[name] = location;
      if (location === WebGL2RenderingContext.INVALID_INDEX) console.error(`uniform block '${name}' not found`);
    }
  }
}

export enum ShaderType {
  VERTEX_SHADER = WebGL2RenderingContext.VERTEX_SHADER,
  FRAGMENT_SHADER = WebGL2RenderingContext.FRAGMENT_SHADER
}
