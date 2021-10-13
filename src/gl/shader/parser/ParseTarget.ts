import { ShaderType } from 'gl';

export function parseTarget(s: string): ShaderType | null {
  s = s.trim().toLowerCase();
  if (s === 'vs') return ShaderType.VERTEX_SHADER;
  if (s === 'fs') return ShaderType.FRAGMENT_SHADER;
  return null;
}
