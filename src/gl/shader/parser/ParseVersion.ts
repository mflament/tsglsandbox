import { ParsingContext } from './ParsingContext';
import { LOGGER } from 'gl';

export function parseVersion(line: string, context: ParsingContext): boolean {
  const matches = line.match(/^#version\s+(.*)$/);
  const newVersion = matches ? matches[1] : null;
  if (newVersion) {
    if (context.version && context.version !== newVersion) {
      LOGGER.error('Conflicting version ' + context.version + ' / ' + newVersion);
    } else {
      context.version = newVersion;
    }
    return true;
  }

  return false;
}
