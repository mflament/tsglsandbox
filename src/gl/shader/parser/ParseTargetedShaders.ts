import { ParsingContext } from './ParsingContext';
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

function parseTarget(s: string): ShaderType | null {
  s = s.trim().toLowerCase();
  if (s === 'vs') return ShaderType.VERTEX_SHADER;
  if (s === 'fs') return ShaderType.FRAGMENT_SHADER;
  return null;
}
