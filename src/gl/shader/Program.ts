'use strict';
import { md5 } from '../../utils/MD5';
import { checkNull, Deletable } from '../utils/GLUtils';
import { Shader } from './Shader';
import { VaryingBufferMode } from './TransformFeedback';

export interface ProgramLocations<A = never, U = never, B = never> {
  attributeLocations?: A;
  uniformLocations?: U;
  uniformBlockLocations?: B;
}

export interface ProgramConfiguration<A = never, U = never, B = never> extends ProgramLocations<A, U, B> {
  vsSource: string | Promise<string>;
  fsSource: string | Promise<string>;
  varyings?: string[];
}

export class ProgramLoader implements Deletable {
  private readonly shadersCache: { [hash: string]: Shader } = {};

  constructor(readonly gl: WebGL2RenderingContext) {}

  async loadProgram<A = never, U = never, B = never>(config: ProgramConfiguration<A, U, B>): Promise<Program<A, U, B>> {
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

export class Program<A = never, U = never, B = never> {
  readonly glprogram: WebGLProgram;

  constructor(readonly gl: WebGL2RenderingContext, private readonly locations: ProgramLocations<A, U, B> = {}) {
    this.glprogram = checkNull(() => this.gl.createProgram());
  }

  get attributeLocations(): A {
    if (!this.locations.attributeLocations) throw new Error('No attribute locations');
    return this.locations.attributeLocations;
  }
  get uniformLocations(): U {
    if (!this.locations.uniformLocations) throw new Error('No uniform locations');
    return this.locations.uniformLocations;
  }

  get uniformBlockLocations(): B {
    if (!this.locations.uniformBlockLocations) throw new Error('No uniform block locations');
    return this.locations.uniformBlockLocations;
  }

  link(
    shaders: Shader[],
    varyings?: string[],
    bufferMode: VaryingBufferMode = VaryingBufferMode.INTERLEAVED_ATTRIBS
  ): Program<A, U, B> {
    shaders.forEach(shader => this.gl.attachShader(this.glprogram, shader.glshader));

    if (varyings) this.gl.transformFeedbackVaryings(this.glprogram, varyings, bufferMode);

    this.gl.linkProgram(this.glprogram);

    shaders.forEach(shader => this.gl.detachShader(this.glprogram, shader.glshader));

    if (!this.gl.getProgramParameter(this.glprogram, WebGL2RenderingContext.LINK_STATUS)) {
      const log = this.gl.getProgramInfoLog(this.glprogram);
      this.gl.deleteProgram(this.glprogram);
      throw 'Error linking program ' + log;
    }

    this.use();

    if (this.locations.attributeLocations) this.configureAttributeLocations(this.locations.attributeLocations);
    if (this.locations.uniformLocations) this.configureUniformLocations(this.locations.uniformLocations);
    if (this.locations.uniformBlockLocations) this.configureUniformBlockLocations(this.locations.uniformBlockLocations);

    return this;
  }

  attributeLocation(name: string): number {
    return this.gl.getAttribLocation(this.glprogram, name);
  }

  uniformLocation(name: string): WebGLUniformLocation | null {
    return this.gl.getUniformLocation(this.glprogram, name);
  }

  uniformBlockLocation(name: string): number {
    let index = this.gl.getUniformBlockIndex(this.glprogram, name);
    if (index === WebGL2RenderingContext.INVALID_INDEX) index = -1;
    return index;
  }

  bindUniformBlock(blockIndex: number, blockBinding: number): Program<A, U, B> {
    this.gl.uniformBlockBinding(this.glprogram, blockIndex, blockBinding);
    return this;
  }

  use(): Program<A, U, B> {
    this.gl.useProgram(this.glprogram);
    return this;
  }

  delete(): void {
    this.gl.deleteProgram(this.glprogram);
  }

  private configureAttributeLocations(locations: A): void {
    const names = Object.keys(locations);
    const target = locations as any;
    for (const name of names) {
      const location = this.attributeLocation(name);
      target[name] = location;
      if (location < 0 || location === WebGL2RenderingContext.INVALID_INDEX) {
        console.error(`attribute '${name}' not found`);
      }
    }
  }

  private configureUniformLocations(locations: U): void {
    const names = Object.keys(locations);
    const target = locations as any;
    for (const name of names) {
      const location = this.uniformLocation(name);
      if (location !== null) target[name] = location;
      else console.error(`uniform '${name}' not found`);
    }
  }

  private configureUniformBlockLocations(locations: B): void {
    const names = Object.keys(locations);
    const target = locations as any;
    for (const name of names) {
      const location = this.uniformBlockLocation(name);
      target[name] = location;
      if (location === WebGL2RenderingContext.INVALID_INDEX) console.error(`uniform block '${name}' not found`);
    }
  }
}

export enum ShaderType {
  VERTEX_SHADER = WebGL2RenderingContext.VERTEX_SHADER,
  FRAGMENT_SHADER = WebGL2RenderingContext.FRAGMENT_SHADER
}
