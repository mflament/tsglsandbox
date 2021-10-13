import { ParsingContext } from './ParsingContext';
import { ShaderOutput } from './ShaderParser';

export function parseOutput(line: string, context: ParsingContext): boolean {
  const matches = line.match(/^(?:flat\s+)?out\s+(\w+)\s+(\w+);$/);
  if (matches) {
    const output: ShaderOutput = { name: matches[2], type: matches[1] };
    context.addOutput(output);
    context.addLine(line);
    return true;
  }
  return false;
}
