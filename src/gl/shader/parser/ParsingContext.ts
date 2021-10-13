import { ParsingResults } from './ParsingResults';
import { LOGGER, ShaderType } from 'gl';
import { Defines } from './Defines';
import { ShaderOutput } from './ShaderParser';

export class ParsingContext {
  readonly results: ParsingResults;
  readonly paths: string[] = [];
  targets: ShaderType[] = [ShaderType.VERTEX_SHADER, ShaderType.FRAGMENT_SHADER];

  constructor(
    readonly defines: Defines = {},
    readonly parseShader: (path: string, context: ParsingContext) => Promise<void>
  ) {
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

  get path(): string {
    return this.paths[this.paths.length - 1];
  }

  resolveInteger(code: string): number | undefined {
    let count = parseInt(code);
    if (isNaN(count) && this.defines) count = parseInt(this.defines[code]);
    if (isNaN(count)) {
      LOGGER.error('Can not parse resolve integer variable ' + code);
      return undefined;
    }
    return count;
  }
}
