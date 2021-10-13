import { ShaderType } from 'gl';
import { Defines } from './Defines';

export class ParsingResult {
  lines: string[] = [];
  outputs: { [name: string]: string } = {};
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
