import { AbstractDeletable } from '../GLUtils';
import { Program, ProgramLocations, VaryingBufferMode, Varyings } from './Program';
import { CompiledShadersCache } from './CompiledShadersCache';
import { Shader, ShaderType } from './Shader';
import { Defines, ParsingResults, ShaderParser } from './ShaderParser';

export class ProgramLoader extends AbstractDeletable {
  private readonly shadersCache: CompiledShadersCache;

  constructor(readonly gl: WebGL2RenderingContext, readonly shaderParser: ShaderParser) {
    super();
    this.shadersCache = new CompiledShadersCache(gl);
  }

  delete(): void {
    this.shadersCache.delete();
    super.delete();
  }

  async load<U = any, B = any, A = any>(config: ProgramConfiguration<U, B, A>): Promise<Program<U, B, A>> {
    let shaders: Shader[];
    let outputs;
    if (isShadersConfig(config)) {
      const results = await Promise.all([
        this.shaderParser.parse(config.vspath, config.defines),
        this.shaderParser.parse(config.fspath, config.defines)
      ]);
      shaders = [
        this.createShader(ShaderType.VERTEX_SHADER, results[0]),
        this.createShader(ShaderType.FRAGMENT_SHADER, results[1])
      ];
      outputs = results[0].get(ShaderType.VERTEX_SHADER).outputs;
    } else {
      const results = await this.shaderParser.parse(config.path, config.defines);
      shaders = [
        this.createShader(ShaderType.VERTEX_SHADER, results),
        this.createShader(ShaderType.FRAGMENT_SHADER, results)
      ];
      outputs = results.get(ShaderType.VERTEX_SHADER).outputs;
    }

    let varyings: Varyings | undefined;
    if (config.varyings) {
      varyings = { names: config.varyings, mode: config.varyingMode || VaryingBufferMode.SEPARATE };
    } else if (config.varyingMode) {
      varyings = { names: Object.keys(outputs), mode: config.varyingMode };
    }
    return new Program<U, B, A>(this.gl, config).link(shaders, varyings);
  }

  private createShader(type: ShaderType, results: ParsingResults): Shader {
    return this.shadersCache.compile(type, results.printShader(type));
  }
}

interface BaseConfiguration<U = any, B = any, A = any> extends ProgramLocations<U, B, A> {
  defines?: Defines;
  varyingMode?: VaryingBufferMode;
  varyings?: string[];
}

export interface ShadersConfiguration<U = any, B = any, A = any> extends BaseConfiguration<U, B, A> {
  vspath: string | Promise<string>;
  fspath: string | Promise<string>;
}

export interface MergedConfiguration<U = any, B = any, A = any> extends BaseConfiguration<U, B, A> {
  path: string | Promise<string>;
}

export type ProgramConfiguration<U = any, B = any, A = any> =
  | ShadersConfiguration<U, B, A>
  | MergedConfiguration<U, B, A>;

function isShadersConfig<U, B, A>(config: BaseConfiguration<U, B, A>): config is ShadersConfiguration<U, B, A> {
  const cfg = config as Partial<ShadersConfiguration>;
  return typeof cfg.fspath === 'string' && typeof cfg.vspath === 'string';
}
