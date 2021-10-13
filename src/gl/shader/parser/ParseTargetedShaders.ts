import { ParsingContext } from './ParsingContext';
import { parseTarget } from './ParseTarget';
import { ShaderType } from 'gl';

export function parseTargetedShaders(line: string, context: ParsingContext): boolean {
  const matches = line
    .trim()
    .toLowerCase()
    .match(/^\/\/\s*in\s+((?:vs|fs|,|\s)+)$/);
  if (matches) {
    context.targets = matches[1]
      .split(/[,\s]/)
      .map(s => parseTarget(s.trim()))
      .filter(t => t !== null) as ShaderType[];
    return true;
  }
  return false;
}
