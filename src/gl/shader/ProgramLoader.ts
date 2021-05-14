import { createShaderLoader, ShaderLoader } from './ShaderLoader';
import { Varyings, VaryingBufferMode, Program, ProgramLocations } from './Program';
import { CompiledShadersCache } from './CompiledShadersCache';
import { Shader, ShaderType } from './Shader';

export class ProgramLoader {
  private readonly shaderCompiler: CompiledShadersCache;
  constructor(readonly gl: WebGL2RenderingContext, readonly shaderLoader: ShaderLoader = createShaderLoader()) {
    this.shaderCompiler = new CompiledShadersCache(gl);
  }

  async load<U = any, B = any, A = any>(config: ProgramConfiguration<U, B, A>): Promise<Program<U, B, A>> {
    const results = new ParsingResults();
    if (isShadersConfig(config)) {
      await Promise.all([
        this.parseShader(config.vspath, [ShaderType.VERTEX_SHADER], config, results),
        this.parseShader(config.fspath, [ShaderType.FRAGMENT_SHADER], config, results)
      ]);
    } else {
      await this.parseShader(config.path, [ShaderType.VERTEX_SHADER, ShaderType.FRAGMENT_SHADER], config, results);
    }
    const shaders = [
      this.createShader(ShaderType.VERTEX_SHADER, results, config),
      this.createShader(ShaderType.FRAGMENT_SHADER, results, config)
    ];
    let varyings: Varyings | undefined;
    if (config.varyingMode) {
      varyings = { names: Object.keys(results.vs.outputs), mode: config.varyingMode };
    }
    return new Program<U, B, A>(this.gl, config).link(shaders, varyings);
  }

  private createShader(type: ShaderType, results: ParsingResults, config: BaseConfiguration): Shader {
    const lines = type === ShaderType.VERTEX_SHADER ? results.vs.lines : results.fs.lines;
    const version = results.version || '300 es';
    let source = `#version ${version}\n\n`;
    if (config.defines) {
      for (const key in config.defines) {
        const value = config.defines[key];
        source += `#define ${key} ${value}\n`;
      }
      source += '\n';
    }
    source += lines.join('\n') + '\n';
    return this.shaderCompiler.compile(type, source);
  }

  private async parseShader(
    path: string,
    targets: ShaderType[],
    config: BaseConfiguration,
    results: ParsingResults
  ): Promise<void> {
    const source = await this.shaderLoader.load(path);
    const lines = source.split(/\r?\n/);
    let currentTargets: ShaderType[] = targets;
    let unrolling: UnrollBlock | null = null;
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.length > 0) {
        if (unrolling) {
          if (this.isUnrollEnd(trimmedLine, unrolling.varName)) {
            unrolling.flush(currentTargets, results);
            unrolling = null;
          } else {
            unrolling.push(line);
          }
          continue;
        }

        const version = this.parseVersion(trimmedLine);
        if (version) {
          if (results.version && results.version !== version) {
            console.error('Conflicting version ' + version + ' / ' + results.version);
          } else {
            results.version = version;
          }
          continue;
        }

        const newTargets = this.parseTargets(trimmedLine);
        if (newTargets) {
          currentTargets = newTargets;
          continue;
        }

        const includePath = this.parseInclude(trimmedLine);
        if (includePath) {
          await this.parseShader(includePath, currentTargets, config, results);
          continue;
        }

        unrolling = this.parseUnroll(trimmedLine, config.defines);
        if (unrolling) continue;

        const output = this.parseOutput(trimmedLine);
        if (output) results.addOutput(output, currentTargets);
      }
      results.addLine(line, currentTargets);
    }
  }

  private parseOutput(line: string): ShaderOutput | null {
    const matches = line.match(/^(?:flat\s+)?out\s+(\w+)\s+(\w+);$/);
    if (matches) return { name: matches[2], type: matches[1] };
    return null;
  }

  private parseUnroll(line: string, defines?: Defines): UnrollBlock | null {
    const matches = line.match(/^\/\/\s*unroll\((\w+)\s*,\s*(\w+)\)$/);
    if (matches) {
      const varName = matches[1];
      let count = parseInt(matches[2]);
      if (isNaN(count) && defines) count = parseInt(defines[matches[2]]);
      if (isNaN(count)) console.error('Can not parse unroll count from ' + line);
      else return new UnrollBlock(varName, count);
    }
    return null;
  }

  private isUnrollEnd(line: string, varName: string): boolean {
    const matches = line.match(/^\/\/\s*end\((\w+)\)$/);
    return matches !== null && matches[1] === varName;
  }

  private parseVersion(line: string): string | null {
    const matches = line.match(/^#version\s+(.*)$/);
    return matches ? matches[1] : null;
  }

  private parseTargets(line: string): ShaderType[] | null {
    const matches = line
      .trim()
      .toLowerCase()
      .match(/^\/\/\s*in\s+((?:vs|fs|,|\s)+)$/);
    if (matches) {
      return matches[1]
        .split(/[,\s]/)
        .map(s => this.parseTarget(s.trim()))
        .filter(t => t !== null) as ShaderType[];
    }
    return null;
  }

  private parseTarget(s: string): ShaderType | null {
    s = s.trim().toLowerCase();
    if (s === 'vs') return ShaderType.VERTEX_SHADER;
    if (s === 'fs') return ShaderType.FRAGMENT_SHADER;
    return null;
  }

  private parseInclude(line: string): string | null {
    const matches = line.match(/^#include\s+(?:"([^"]+)")$|(?:<([^>]+)>)$/);
    if (matches) return matches[1];
    return null;
  }
}

class UnrollBlock {
  readonly lines: string[] = [];
  constructor(readonly varName: string, readonly count: number) {}
  push(line: string) {
    this.lines.push(line);
  }
  flush(targets: ShaderType[], res: ParsingResults) {
    const unrolledLines = [];
    const varregex = new RegExp('\\$' + this.varName);
    for (let index = 0; index < this.count; index++) {
      unrolledLines.push(...this.lines.map(l => l.replace(varregex, index.toString())));
    }
    for (const target of targets) {
      const lines = target === ShaderType.VERTEX_SHADER ? res.vs.lines : res.fs.lines;
      lines.push(...unrolledLines);
    }
  }
}

class ParsingResults {
  version?: string;
  readonly vs = new ParsingResult();
  readonly fs = new ParsingResult();

  addLine(line: string, targets: ShaderType[]): void {
    targets.map(t => this.parsingResult(t)).forEach(r => r.lines.push(line));
  }

  addOutput(output: ShaderOutput, targets: ShaderType[]): void {
    targets.map(t => this.parsingResult(t)).forEach(r => (r.outputs[output.name] = output.type));
  }

  parsingResult(target: ShaderType): ParsingResult {
    return target === ShaderType.VERTEX_SHADER ? this.vs : this.fs;
  }
}

type ShaderOutput = { name: string; type: string };

class ParsingResult {
  lines: string[] = [];
  outputs: { [name: string]: string } = {};
}

type Defines = { [name: string]: any };

interface BaseConfiguration<U = any, B = any, A = any> extends ProgramLocations<U, B, A> {
  defines?: Defines;
  varyingMode?: VaryingBufferMode;
}

interface ShadersConfiguration<U = any, B = any, A = any> extends BaseConfiguration<U, B, A> {
  vspath: string;
  fspath: string;
}

interface MergedConfiguration<U = any, B = any, A = any> extends BaseConfiguration<U, B, A> {
  path: string;
}

type ProgramConfiguration<U = any, B = any, A = any> = ShadersConfiguration<U, B, A> | MergedConfiguration<U, B, A>;

function isShadersConfig<U, B, A>(config: BaseConfiguration<U, B, A>): config is ShadersConfiguration<U, B, A> {
  const cfg = config as ShadersConfiguration;
  return typeof cfg.fspath === 'string' && typeof cfg.vspath === 'string';
}
