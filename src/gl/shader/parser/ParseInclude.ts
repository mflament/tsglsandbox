import { ParsingContext } from './ParsingContext';
import { Path } from 'utils';

export async function parseInclude(line: string, context: ParsingContext): Promise<boolean> {
  const matches = line.match(/^#include\s+"([^"]+)"$|(<([^>]+)>)$/);
  if (matches) {
    const includePath = matches[1];
    if (includePath) {
      const resolvedPath = Path.isRelative(includePath)
        ? Path.resolve(Path.dirname(context.path), includePath)
        : includePath;
      await context.parseShader(resolvedPath, context);
      return true;
    }
  }
  return false;
}
