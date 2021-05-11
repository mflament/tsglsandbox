'use strict';
import { checkNull } from '../utils/GLUtils';
import { Shader } from './Shader';

export interface ProgramLocations<U = any, B = any, A = any> {
  uniformLocations?: U;
  uniformBlockLocations?: B;
  attributeLocations?: A;
}

export enum VaryingBufferMode {
  INTERLEAVED = WebGL2RenderingContext.INTERLEAVED_ATTRIBS,
  SEPARATE = WebGL2RenderingContext.SEPARATE_ATTRIBS
}
export interface Varyings {
  names: string[];
  mode?: VaryingBufferMode;
}

export class Program<U = any, B = any, A = any> {
  readonly glprogram: WebGLProgram;

  constructor(readonly gl: WebGL2RenderingContext, private readonly locations: ProgramLocations<U, B, A> = {}) {
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

  link(shaders: Shader[], varyings?: Varyings): Program<U, B, A> {
    shaders.forEach(shader => this.gl.attachShader(this.glprogram, shader.glshader));

    if (varyings) {
      this.gl.transformFeedbackVaryings(this.glprogram, varyings.names, varyings.mode || VaryingBufferMode.INTERLEAVED);
    }

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

  bindUniformBlock(blockIndex: number, blockBinding: number): Program<U, B, A> {
    this.gl.uniformBlockBinding(this.glprogram, blockIndex, blockBinding);
    return this;
  }

  use(): Program<U, B, A> {
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
