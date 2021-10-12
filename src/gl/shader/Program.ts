'use strict';
import { AbstractDeletable, checkNull, LOGGER } from '../GLUtils';
import { Shader } from './Shader';

export interface ProgramLocations<U = any, B = any, A = any> {
  uniformLocations?: U;
  uniformBlockIndices?: B;
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

enum ProgramParameter {
  DELETE_STATUS = WebGL2RenderingContext.DELETE_STATUS,
  LINK_STATUS = WebGL2RenderingContext.LINK_STATUS,
  VALIDATE_STATUS = WebGL2RenderingContext.VALIDATE_STATUS,
  ATTACHED_SHADERS = WebGL2RenderingContext.ATTACHED_SHADERS,
  ACTIVE_ATTRIBUTES = WebGL2RenderingContext.ACTIVE_ATTRIBUTES,
  ACTIVE_UNIFORMS = WebGL2RenderingContext.ACTIVE_UNIFORMS,
  TRANSFORM_FEEDBACK_BUFFER_MODE = WebGL2RenderingContext.TRANSFORM_FEEDBACK_BUFFER_MODE,
  TRANSFORM_FEEDBACK_VARYINGS = WebGL2RenderingContext.TRANSFORM_FEEDBACK_VARYINGS,
  ACTIVE_UNIFORM_BLOCKS = WebGL2RenderingContext.ACTIVE_UNIFORM_BLOCKS
}

enum UniformBlockParameter {
  BINDING = WebGL2RenderingContext.UNIFORM_BLOCK_BINDING,
  DATA_SIZE = WebGL2RenderingContext.UNIFORM_BLOCK_DATA_SIZE,
  ACTIVE_UNIFORMS = WebGL2RenderingContext.UNIFORM_BLOCK_ACTIVE_UNIFORMS,
  ACTIVE_UNIFORM_INDICES = WebGL2RenderingContext.UNIFORM_BLOCK_ACTIVE_UNIFORM_INDICES,
  REFERENCED_BY_VERTEX_SHADER = WebGL2RenderingContext.UNIFORM_BLOCK_REFERENCED_BY_VERTEX_SHADER,
  REFERENCED_BY_FRAGMENT_SHADER = WebGL2RenderingContext.UNIFORM_BLOCK_REFERENCED_BY_FRAGMENT_SHADER
}

enum UniformParameter {
  TYPE = WebGL2RenderingContext.UNIFORM_TYPE,
  SIZE = WebGL2RenderingContext.UNIFORM_SIZE,
  BLOCK_INDEX = WebGL2RenderingContext.UNIFORM_BLOCK_INDEX,
  OFFSET = WebGL2RenderingContext.UNIFORM_OFFSET,
  ARRAY_STRIDE = WebGL2RenderingContext.UNIFORM_ARRAY_STRIDE,
  MATRIX_STRIDE = WebGL2RenderingContext.UNIFORM_MATRIX_STRIDE,
  IS_ROW_MAJOR = WebGL2RenderingContext.UNIFORM_IS_ROW_MAJOR
}

interface ProgramParameters {
  readonly deleteStatus: boolean;
  readonly linkStatus: boolean;
  readonly validateStatus: boolean;
  readonly attachedShaders: number;
  readonly activeAttributes: number;
  readonly activeUniforms: number;
  readonly transformFeedbackBufferMode: VaryingBufferMode;
  readonly transformFeedbackVaryings: number;
  readonly activeUniformBlocks: number;
}

interface BlockInfo {
  name: string;
  binding: number;
  dataSize: number;
  referencedByVertexShader: boolean;
  referencedByFragmentShader: boolean;
  uniforms: BlockUniformInfo[];
}

interface UniformInfo {
  index: number;
  name: string;
  type: string;
  size: number;
}

interface BlockUniformInfo extends UniformInfo {
  blockIndex: number;
  offset: number;
  arrayStride: number;
  matrixStride: number;
  isRowMajor: boolean;
}

interface ProgramUniformInfo {
  uniforms: UniformInfo[];
  blocks: BlockInfo[];
}

export class Program<U = any, B = any, A = any> extends AbstractDeletable {
  private static _activeProgram?: Program;

  readonly glprogram: WebGLProgram;

  constructor(readonly gl: WebGL2RenderingContext, private readonly locations: ProgramLocations<U, B, A> = {}) {
    super();
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

  get uniformBlockIndices(): B {
    if (!this.locations.uniformBlockIndices) throw new Error('No uniform block indices');
    return this.locations.uniformBlockIndices;
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
    if (this.locations.uniformBlockIndices) this.configureUniformBlockIndices(this.locations.uniformBlockIndices);

    return this;
  }

  attributeLocation(name: string): number {
    return this.gl.getAttribLocation(this.glprogram, name);
  }

  uniformLocation(name: string): WebGLUniformLocation | null {
    return this.gl.getUniformLocation(this.glprogram, name);
  }

  uniformBlockIndex(name: string): number {
    return this.gl.getUniformBlockIndex(this.glprogram, name);
  }

  bindUniformBlock(blockIndex: number, blockBinding: number): Program<U, B, A> {
    this.gl.uniformBlockBinding(this.glprogram, blockIndex, blockBinding);
    return this;
  }

  use(): Program<U, B, A> {
    this.gl.useProgram(this.glprogram);
    // if (Program._activeProgram !== this) {
    //   this.gl.useProgram(this.glprogram);
    //   Program._activeProgram = this;
    // }
    return this;
  }

  delete(): void {
    if (Program._activeProgram === this) {
      this.gl.useProgram(null);
      Program._activeProgram = undefined;
    }
    this.gl.deleteProgram(this.glprogram);
    super.delete();
  }

  queryProgramParameters(): ProgramParameters {
    return {
      deleteStatus: this.getProgramParameter(ProgramParameter.DELETE_STATUS),
      linkStatus: this.getProgramParameter(ProgramParameter.LINK_STATUS),
      validateStatus: this.getProgramParameter(ProgramParameter.VALIDATE_STATUS),
      attachedShaders: this.getProgramParameter(ProgramParameter.ATTACHED_SHADERS),
      activeAttributes: this.getProgramParameter(ProgramParameter.ACTIVE_ATTRIBUTES),
      activeUniforms: this.getProgramParameter(ProgramParameter.ACTIVE_UNIFORMS),
      transformFeedbackBufferMode: this.getProgramParameter(ProgramParameter.TRANSFORM_FEEDBACK_BUFFER_MODE),
      transformFeedbackVaryings: this.getProgramParameter(ProgramParameter.TRANSFORM_FEEDBACK_VARYINGS),
      activeUniformBlocks: this.getProgramParameter(ProgramParameter.ACTIVE_UNIFORM_BLOCKS)
    };
  }

  queryUniformInfos(): ProgramUniformInfo {
    const activeUniforms = this.getProgramParameter(ProgramParameter.ACTIVE_UNIFORMS);
    const indices = [];
    for (let i = 0; i < activeUniforms; i++) indices[i] = i;
    const blockIndices: number[] = this.getUniformsParameter(indices, UniformParameter.BLOCK_INDEX);
    const res: ProgramUniformInfo = { uniforms: [], blocks: [] };
    const blockUniforms: BlockUniformInfo[] = [];
    indices.map(index => {
      const ai = this.gl.getActiveUniform(this.glprogram, index);
      if (ai) {
        const blockIndex = blockIndices[index];
        const info = {
          name: ai.name,
          index: index,
          size: ai.size,
          type: uniformType(this.gl, ai.type)
        };
        if (blockIndex < 0) res.uniforms.push(info);
        else blockUniforms.push({ ...info, blockIndex: blockIndex } as BlockUniformInfo);
      }
    });
    if (blockUniforms.length > 0) {
      const buindices = blockUniforms.map(ui => ui.index);
      const offsets = this.getUniformsParameter(buindices, UniformParameter.OFFSET);
      const arrayStrides = this.getUniformsParameter(buindices, UniformParameter.ARRAY_STRIDE);
      const matrixStrides = this.getUniformsParameter(buindices, UniformParameter.MATRIX_STRIDE);
      const rowMajors = this.getUniformsParameter(buindices, UniformParameter.IS_ROW_MAJOR);
      blockUniforms.forEach((bu, index) => {
        const bi = bu.blockIndex;
        if (!res.blocks[bi]) {
          res.blocks[bi] = {
            name: this.gl.getActiveUniformBlockName(this.glprogram, bi) || '',
            binding: this.getUniformBlockParameter(bi, UniformBlockParameter.BINDING),
            dataSize: this.getUniformBlockParameter(bi, UniformBlockParameter.DATA_SIZE),
            referencedByVertexShader: this.getUniformBlockParameter(
              bi,
              UniformBlockParameter.REFERENCED_BY_VERTEX_SHADER
            ),
            referencedByFragmentShader: this.getUniformBlockParameter(
              bi,
              UniformBlockParameter.REFERENCED_BY_FRAGMENT_SHADER
            ),
            uniforms: []
          };
        }
        res.blocks[bi].uniforms.push({
          ...bu,
          offset: offsets[index],
          arrayStride: arrayStrides[index],
          matrixStride: matrixStrides[index],
          isRowMajor: rowMajors[index]
        });
      });
    }
    return res;
  }

  private getProgramParameter(pname: ProgramParameter): any {
    return this.gl.getProgramParameter(this.glprogram, pname);
  }

  private getUniformBlockParameter(blockIndex: number, pname: UniformBlockParameter): any {
    return this.gl.getActiveUniformBlockParameter(this.glprogram, blockIndex, pname);
  }

  private getUniformsParameter(indices: Iterable<number>, pname: UniformParameter): any[] {
    return this.gl.getActiveUniforms(this.glprogram, indices, pname);
  }

  private configureAttributeLocations(locations: A): void {
    const names = Object.keys(locations);
    const target = locations as any;
    for (const name of names) {
      const location = this.attributeLocation(name);
      target[name] = location;
      if (location < 0 || location === WebGL2RenderingContext.INVALID_INDEX) {
        LOGGER.error(`attribute '${name}' not found`);
      }
    }
  }

  private configureUniformLocations(locations: U): void {
    const names = Object.keys(locations);
    const target = locations as any;
    for (const name of names) {
      const location = this.uniformLocation(name);
      if (location !== null) target[name] = location;
    }
  }

  private configureUniformBlockIndices(indices: B): void {
    const names = Object.keys(indices);
    const target = indices as any;
    for (const name of names) {
      const location = this.uniformBlockIndex(name);
      target[name] = location;
      if (location === WebGL2RenderingContext.INVALID_INDEX) LOGGER.error(`uniform block '${name}' not found`);
    }
  }
}

function uniformType(gl: WebGL2RenderingContext, t: GLenum): string {
  const keys = Object.keys(WebGL2RenderingContext);
  for (const k of keys) {
    if (gl[k as keyof WebGL2RenderingContext] === t) return k;
  }
  return 'Unknown ' + t.toString();
}
