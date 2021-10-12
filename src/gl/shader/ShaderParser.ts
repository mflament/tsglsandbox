import { ShaderLoader } from './ShaderLoader';
import { ShaderType } from './Shader';
import { LOGGER, Path } from 'utils';

class ParsingContext {
  readonly results: ParsingResults;
  targets: ShaderType[] = [ShaderType.VERTEX_SHADER, ShaderType.FRAGMENT_SHADER];

  constructor(readonly defines: Defines = {}) {
    this.results = new ParsingResults(defines);
  }

  get version(): string | undefined {
    return this.results.version;
  }

  set version(v: string | undefined) {
    this.results.version = v;
  }

  addLine(line: string): void {
    this.targets.map(t => this.results.get(t)).forEach(r => r.lines.push(line));
  }

  addOutput(output: ShaderOutput): void {
    this.targets.map(t => this.results.get(t)).forEach(r => (r.outputs[output.name] = output.type));
  }
}

export class ShaderParser {
  constructor(readonly shaderLoader: ShaderLoader) {}

  async parse(path: string | Promise<string>, defines?: Defines): Promise<ParsingResults> {
    const context = new ParsingContext(defines);
    await this.parseShader(await path, context);
    return context.results;
  }

  private async parseShader(path: string, context: ParsingContext): Promise<void> {
    const source = await this.shaderLoader.load(path);

    const lines = source.split(/\r?\n/);
    let unrolling: UnrollBlock | null = null;
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.length > 0) {
        if (unrolling) {
          if (isUnrollEnd(trimmedLine, unrolling.varName)) {
            unrolling.flush(context);
            unrolling = null;
          } else {
            unrolling.push(line);
          }
          continue;
        }

        const newVersion = ShaderParser.parseVersion(trimmedLine);
        if (newVersion) {
          if (context.version && context.version !== newVersion) {
            LOGGER.error('Conflicting version ' + context.version + ' / ' + newVersion);
          } else {
            context.version = newVersion;
          }
          continue;
        }

        const newTargets = parseTargets(trimmedLine);
        if (newTargets) {
          context.targets = newTargets;
          continue;
        }

        const includePath = parseInclude(trimmedLine);
        if (includePath) {
          const resolvedPath = Path.isRelative(includePath)
            ? Path.resolve(Path.dirname(path), includePath)
            : includePath;
          await this.parseShader(resolvedPath, context);
          continue;
        }

        unrolling = parseUnroll(trimmedLine, context.defines);
        if (unrolling) continue;

        const output = parseOutput(trimmedLine);
        if (output) context.addOutput(output);
      }
      context.addLine(line);
    }
  }

  private static parseVersion(line: string): string | null {
    const matches = line.match(/^#version\s+(.*)$/);
    return matches ? matches[1] : null;
  }
}

class UnrollBlock {
  readonly lines: string[] = [];

  constructor(readonly varName: string, readonly count: number) {}

  push(line: string) {
    this.lines.push(line);
  }

  flush(context: ParsingContext) {
    const varregex = new RegExp('\\$' + this.varName);
    for (let index = 0; index < this.count; index++) {
      this.lines.map(l => l.replace(varregex, index.toString())).forEach(l => context.addLine(l));
    }
  }
}

export class ParsingResults {
  readonly results = new Map<ShaderType, ParsingResult>();
  version?: string;

  constructor(private readonly defines: Defines = {}) {}

  get(target: ShaderType): ParsingResult {
    let res = this.results.get(target);
    if (!res) {
      res = new ParsingResult();
      this.results.set(target, res);
    }
    return res;
  }

  printShader(type: ShaderType, addVersion = true): string {
    const lines = this.get(type).lines;
    if (!this.version) this.version = '300 es';
    let source = '';
    if (addVersion) {
      source += '#version ' + this.version + '\n';
    }

    if (this.defines && Object.keys(this.defines).length > 0) {
      source += Object.getOwnPropertyNames(this.defines)
        .map(d => `#define ${d} ${this.defines[d]}\n`)
        .reduce((p, nd) => p + nd, '');
      source += '\n';
    }
    source += lines.join('\n') + '\n';
    return source;
  }
}

export type ShaderOutput = { name: string; type: string };

export type Defines = { [name: string]: any };

export class ParsingResult {
  lines: string[] = [];
  outputs: { [name: string]: string } = {};
}

function parseOutput(line: string): ShaderOutput | null {
  const matches = line.match(/^(?:flat\s+)?out\s+(\w+)\s+(\w+);$/);
  if (matches) return { name: matches[2], type: matches[1] };
  return null;
}

function parseUnroll(line: string, defines?: Defines): UnrollBlock | null {
  const matches = line.match(/^\/\/\s*unroll\((\w+)\s*,\s*(\w+)\)$/);
  if (matches) {
    const varName = matches[1];
    let count = parseInt(matches[2]);
    if (isNaN(count) && defines) count = parseInt(defines[matches[2]]);
    if (isNaN(count)) LOGGER.error('Can not parse unroll count from ' + line);
    else return new UnrollBlock(varName, count);
  }
  return null;
}

function isUnrollEnd(line: string, varName: string): boolean {
  const matches = line.match(/^\/\/\s*end\((\w+)\)$/);
  return matches !== null && matches[1] === varName;
}

function parseTargets(line: string): ShaderType[] | null {
  const matches = line
    .trim()
    .toLowerCase()
    .match(/^\/\/\s*in\s+((?:vs|fs|,|\s)+)$/);
  if (matches) {
    return matches[1]
      .split(/[,\s]/)
      .map(s => parseTarget(s.trim()))
      .filter(t => t !== null) as ShaderType[];
  }
  return null;
}

function parseTarget(s: string): ShaderType | null {
  s = s.trim().toLowerCase();
  if (s === 'vs') return ShaderType.VERTEX_SHADER;
  if (s === 'fs') return ShaderType.FRAGMENT_SHADER;
  return null;
}

function parseInclude(line: string): string | null {
  const matches = line.match(/^#include\s+"([^"]+)"$|(<([^>]+)>)$/);
  if (matches) return matches[1];
  return null;
}
