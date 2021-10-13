import { ParsingContext } from './ParsingContext';
import { LOGGER } from 'gl';

export function parseUnroll(line: string, context: ParsingContext, lines: Iterator<string>): boolean {
  const matches = line.match(/^\/\/\s*unroll\((\w+)\s*,\s*(\w+)\)$/);
  if (matches) {
    const varName = matches[1];
    const count = context.resolveInteger(matches[2]);
    if (count === undefined) return false;
    const block = new UnrollBlock(varName, count);
    let next = lines.next();
    while (!next.done) {
      const unrollLine = next.value;
      if (isUnrollEnd(unrollLine, varName)) {
        block.flush(context);
        return true;
      }
      block.push(line);
      next = lines.next();
    }
    LOGGER.error('Unroll end for variable ' + varName + '  not found');
  }
  return false;
}

function isUnrollEnd(line: string, varName: string): boolean {
  const matches = line.match(/^\/\/\s*end\((\w+)\)$/);
  return matches !== null && matches[1] === varName;
}

class UnrollBlock {
  readonly lines: string[] = [];

  constructor(readonly varName: string, readonly count: number) {}

  push(line: string) {
    this.lines.push(line);
  }

  flush(context: ParsingContext) {
    const varregex = new RegExp('\\$' + this.varName);
    for (let index = 0; index < this.count; index++) {
      this.lines.map(l => l.replace(varregex, index.toString())).forEach(l => context.addLine(l));
    }
  }
}
