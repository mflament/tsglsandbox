import { ShaderLoader } from '../ShaderLoader';
import { ParsingResults } from './ParsingResults';
import { Defines } from './Defines';
import { ParsingContext } from './ParsingContext';
import { parseUnroll } from './ParseUnroll';
import { parseOutput } from './ParseOutput';
import { parseTargetedShaders } from './ParseTargetedShaders';
import { parseInclude } from './ParseInclude';
import { parseVersion } from './ParseVersion';
import { parseSamplers } from './ParseSamplers';

type LineParser = (line: string, context: ParsingContext, nextLines: Iterator<string>) => boolean | Promise<boolean>;

const lineParsers: LineParser[] = [
  parseVersion,
  parseInclude,
  parseTargetedShaders,
  parseOutput,
  parseUnroll,
  parseSamplers
];

export class ShaderParser {
  constructor(readonly shaderLoader: ShaderLoader) {}

  async parse(path: string | Promise<string>, defines?: Defines): Promise<ParsingResults> {
    const context = new ParsingContext(defines, (p, c) => this.parseShader(p, c));
    await this.parseShader(await path, context);
    return context.results;
  }

  private async parseShader(path: string, context: ParsingContext): Promise<void> {
    const source = await this.shaderLoader.load(path);
    context.paths.push(path);
    const lines = source.split(/\r?\n/)[Symbol.iterator]();
    let next = lines.next();
    while (!next.done) {
      const line = next.value;
      let handled = false;
      for (const lineParser of lineParsers) {
        if (await lineParser(line, context, lines)) {
          handled = true;
          break;
        }
      }
      if (!handled) context.addLine(line);
      next = lines.next();
    }
  }
}

export type ShaderOutput = { name: string; type: string };
