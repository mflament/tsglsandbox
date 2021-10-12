import { Token } from '../../tokenier/GlslTokenizer';

export type ASTStatementType =
  | 'ident'
  | 'stmt'
  | 'stmtlist'
  | 'struct'
  | 'function'
  | 'functionargs'
  | 'decl'
  | 'decllist'
  | 'forloop'
  | 'whileloop'
  | 'if'
  | 'expr'
  | 'precision'
  | 'comment'
  | 'preprocessor'
  | 'keyword'
  | 'keyword_or_ident'
  | 'return'
  | 'break'
  | 'continue'
  | 'discard'
  | 'do-while'
  | 'placeholder'
  | 'quantifier'
  | 'operator'
  | 'assign'
  | 'call'
  | 'builtin';

interface ParserState {
  unexpected: (message: string) => void;
}

let state: ParserState,
  token: Token,
  tokens: Token[],
  idx = 0;

class GlslSymbol {
  readonly nud: () => GlslSymbol = () => {
    return this.children.length ? this : fail('unexpected')();
  };

  readonly led: () => GlslSymbol = fail('missing operator');

  readonly children: GlslSymbol[] = [];

  constructor(readonly id: string, readonly lbp = 0, nud?: () => GlslSymbol, led?: () => GlslSymbol) {
    if (nud) this.nud = nud;
    if (nud) this.led = led;
  }
}

const original_symbol: Partial<GlslSymbol> = {
  nud: function () {
    return this.children && this.children.length ? this : fail('unexpected')();
  },
  led: fail('missing operator')
};

const symbol_table: Record<string, GlslSymbol> = {};

function itself() {
  return this;
}

symbol('(ident)').nud = itself;
symbol('(keyword)').nud = itself;
symbol('(builtin)').nud = itself;
symbol('(literal)').nud = itself;
symbol('(end)');

symbol(':');
symbol(';');
symbol(',');
symbol(')');
symbol(']');
symbol('}');

infixr('&&', 30);
infixr('||', 30);
infix('|', 43);
infix('^', 44);
infix('&', 45);
infix('==', 46);
infix('!=', 46);
infix('<', 47);
infix('<=', 47);
infix('>', 47);
infix('>=', 47);
infix('>>', 48);
infix('<<', 48);
infix('+', 50);
infix('-', 50);
infix('*', 60);
infix('/', 60);
infix('%', 60);
infix('?', 20, function (left) {
  this.children = [left, expression(0), (advance(':'), expression(0))];
  this.type = 'ternary';
  return this;
});
infix('.', 80, function (left) {
  token.type = 'literal';
  state.fake(token);
  this.children = [left, token];
  advance();
  return this;
});
infix('[', 80, function (left) {
  this.children = [left, expression(0)];
  this.type = 'binary';
  advance(']');
  return this;
});
infix('(', 80, function (left) {
  this.children = [left];
  this.type = 'call';

  if (token.data !== ')') {
    while (true) {
      this.children.push(expression(0));
      if (token.data !== ',') break;
      advance(',');
    }
  }
  advance(')');
  return this;
});

prefix('-');
prefix('+');
prefix('!');
prefix('~');
prefix('defined');
prefix('(', function () {
  this.type = 'group';
  this.children = [expression(0)];
  advance(')');
  return this;
});
prefix('++');
prefix('--');
suffix('++');
suffix('--');

assignment('=');
assignment('+=');
assignment('-=');
assignment('*=');
assignment('/=');
assignment('%=');
assignment('&=');
assignment('|=');
assignment('^=');
assignment('>>=');
assignment('<<=');

export function parse(incoming_state, incoming_tokens) {
  state = incoming_state;
  tokens = incoming_tokens;
  idx = 0;
  var result;

  if (!tokens.length) return;

  advance();
  result = expression(0);
  result.parent = state[0];
  emit(result);

  if (idx < tokens.length) {
    throw new Error('did not use all tokens');
  }

  result.parent.children = [result];

  function emit(node) {
    state.unshift(node, false);
    for (var i = 0, len = node.children.length; i < len; ++i) {
      emit(node.children[i]);
    }
    state.shift();
  }
}

function symbol(id: string, binding_power?: number): GlslSymbol {
  let sym = symbol_table[id];
  binding_power = binding_power || 0;
  if (sym) {
    if (binding_power > sym.lbp) {
      sym.lbp = binding_power;
    }
  } else {
    sym = Object.create(original_symbol);
    sym.id = id;
    sym.lbp = binding_power;
    symbol_table[id] = sym;
  }
  return sym;
}

function expression(rbp) {
  var left,
    t = token;
  advance();

  left = t.nud();
  while (rbp < token.lbp) {
    t = token;
    advance();
    left = t.led(left);
  }
  return left;
}

function infix(id, bp, led) {
  var sym = symbol(id, bp);
  sym.led =
    led ||
    function (left) {
      this.children = [left, expression(bp)];
      this.type = 'binary';
      return this;
    };
}

function infixr(id, bp, led) {
  var sym = symbol(id, bp);
  sym.led =
    led ||
    function (left) {
      this.children = [left, expression(bp - 1)];
      this.type = 'binary';
      return this;
    };
  return sym;
}

function prefix(id, nud) {
  var sym = symbol(id);
  sym.nud =
    nud ||
    function () {
      this.children = [expression(70)];
      this.type = 'unary';
      return this;
    };
  return sym;
}

function suffix(id) {
  var sym = symbol(id, 150);
  sym.led = function (left) {
    this.children = [left];
    this.type = 'suffix';
    return this;
  };
}

function assignment(id) {
  return infixr(id, 10, function (left) {
    this.children = [left, expression(9)];
    this.assignment = true;
    this.type = 'assign';
    return this;
  });
}

function advance(id: string): Token | undefined {
  let next, value, type, output;

  if (id && token.data !== id) {
    state.unexpected('expected `' + id + '`, got `' + token.data + '`');
    return;
  }

  if (idx >= tokens.length) {
    token = symbol_table['(end)'];
    return;
  }

  next = tokens[idx++];
  value = next.data;
  type = next.type;

  if (type === 'ident') {
    output = state.scope.find(value) || state.create_node();
    type = output.type;
  } else if (type === 'builtin') {
    output = symbol_table['(builtin)'];
  } else if (type === 'keyword') {
    output = symbol_table['(keyword)'];
  } else if (type === 'operator') {
    output = symbol_table[value];
    if (!output) {
      state.unexpected('unknown operator `' + value + '`');
      return;
    }
  } else if (type === 'float' || type === 'integer') {
    type = 'literal';
    output = symbol_table['(literal)'];
  } else {
    state.unexpected('unexpected token.');
    return;
  }

  if (output) {
    if (!output.nud) {
      output.nud = itself;
    }
    if (!output.children) {
      output.children = [];
    }
  }

  output = Object.create(output);
  output.token = next;
  output.type = type;
  if (!output.data) output.data = value;

  return (token = output);
}

function fail(message: string): () => void {
  return function () {
    return state.unexpected(message);
  };
}
