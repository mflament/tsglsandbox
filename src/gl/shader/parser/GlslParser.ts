import { Token } from '../tokenier/GlslTokenizer';
import { ASTStatementType } from './lib/expr';

export type AbstractTokenType = '(implied)' | '(program)';

export interface AbstractToken {
  type?: AbstractTokenType;
  data: Token['data'];
  position?: Token['position'];
}

export const enum ASTNodeMode {
  _ = 0,
  IDENT,
  STMT,
  STMTLIST,
  STRUCT,
  FUNCTION,
  FUNCTIONARGS,
  DECL,
  DECLLIST,
  FORLOOP,
  WHILELOOP,
  IF,
  EXPR,
  PRECISION,
  COMMENT,
  PREPROCESSOR,
  KEYWORD,
  KEYWORD_OR_IDENT,
  RETURN,
  BREAK,
  CONTINUE,
  DISCARD,
  DOWHILELOOP,
  PLACEHOLDER,
  QUANTIFIER
}

export interface ASTNode {
  mode: ASTNodeMode;
  token: AbstractToken | Token;
  parent?: ASTNode;
  children: ASTNode[];
  type: ASTStatementType;
  id: string;
  expecting?: string[];
  scope?: { [name: string]: ASTNode };
}
