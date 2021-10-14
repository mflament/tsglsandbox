import { ParsingContext } from './ParsingContext';
import { Path } from 'utils';

export async function parseInclude(line: string, context: ParsingContext): Promise<boolean> {
  const matches = line.match(/^#include\s+"([^"]+)"$|(<([^>]+)>)$/);
  if (matches) {
    const includePath = matches[1];
    if (includePath) {
      let resolvedPath;

      if (Path.isRelative(includePath)) {
        resolvedPath = Path.resolve(Path.dirname(context.path), includePath);
        console.log('resolving ', context.path, Path.dirname(context.path), includePath, resolvedPath);
      } else resolvedPath = includePath;

      await context.parseShader(resolvedPath, context);

      return true;
    }
  }
  return false;
}
