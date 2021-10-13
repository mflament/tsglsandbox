import { ParsingContext } from './ParsingContext';

const SAMPLERS_UNIFORM = /uniform\s+sampler2D\s+(\w+)\[([\w\d$]+)\]/;
const SAMPLER_REF = /texture\(\s*(\w+)\[\s*(\w+)\s*]\s*,.*/;

export function parseSamplers(line: string, context: ParsingContext, lines: Iterator<string>): boolean {
  let match = line.match(SAMPLERS_UNIFORM);
  if (match) {
    context.addLine(line);
    const uniformName = match[1];
    const count = context.resolveInteger(match[2]);
    if (count === undefined) return false;
    console.log('parseSamplers ' + uniformName + ' ' + count);
    return true;
  }
  match = line.match(SAMPLER_REF);
  if (match) {
    const uniformName = match[1];
    const indexName = match[2];
    console.log('sampler ref ' + uniformName + ' ' + indexName);
  }
  return false;
}
