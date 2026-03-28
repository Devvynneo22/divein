/**
 * Formula engine for computed table columns.
 *
 * Supports:
 *   Functions : SUM, AVG, COUNT, MIN, MAX, IF
 *   Arithmetic: +  -  *  /  (with parentheses)
 *   Column refs: bare names resolved against the current row
 *
 * Returns a primitive (number | string | boolean) or an error sentinel
 * ('#ERROR', '#REF', '#DIV/0!').
 */

import type { ColumnDef } from '@/shared/types/table';

// ─── Public API ───────────────────────────────────────────────────────────────

export type FormulaResult = number | string | boolean;

/**
 * Evaluate a formula string against a single row of data.
 *
 * @param formula  – the formula expression (e.g. `SUM(Price, Tax)`)
 * @param row      – column-id → value mapping for the current row
 * @param columns  – full column definitions (used to resolve names → ids)
 */
export function evaluateFormula(
  formula: string,
  row: Record<string, unknown>,
  columns: ColumnDef[],
): FormulaResult {
  try {
    const trimmed = formula.trim();
    if (!trimmed) return '';
    const tokens = tokenize(trimmed);
    const nameToId = buildNameMap(columns);
    const resolved = resolveNames(tokens, nameToId, row);
    const result = parseExpression(resolved, 0);
    return result.value;
  } catch (e) {
    if (e instanceof FormulaError) return e.message;
    return '#ERROR';
  }
}

// ─── Error type ───────────────────────────────────────────────────────────────

class FormulaError extends Error {
  constructor(msg: string) {
    super(msg);
  }
}

// ─── Tokenizer ────────────────────────────────────────────────────────────────

type TokenKind =
  | 'number'
  | 'string'
  | 'ident'
  | 'op'
  | 'lparen'
  | 'rparen'
  | 'comma'
  | 'compare';

interface Token {
  kind: TokenKind;
  value: string;
}

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < input.length) {
    const ch = input[i];

    // Whitespace
    if (/\s/.test(ch)) {
      i++;
      continue;
    }

    // Numbers (including decimals)
    if (/\d/.test(ch) || (ch === '.' && i + 1 < input.length && /\d/.test(input[i + 1]))) {
      let num = '';
      while (i < input.length && (/\d/.test(input[i]) || input[i] === '.')) {
        num += input[i++];
      }
      tokens.push({ kind: 'number', value: num });
      continue;
    }

    // Comparison operators: >=, <=, !=, ==, >, <
    if (ch === '>' || ch === '<' || ch === '!' || ch === '=') {
      if (i + 1 < input.length && input[i + 1] === '=') {
        tokens.push({ kind: 'compare', value: ch + '=' });
        i += 2;
        continue;
      }
      if (ch === '>' || ch === '<') {
        tokens.push({ kind: 'compare', value: ch });
        i++;
        continue;
      }
      // Lone '=' treated as '=='
      if (ch === '=') {
        tokens.push({ kind: 'compare', value: '==' });
        i++;
        continue;
      }
    }

    // Arithmetic ops
    if ('+-*/'.includes(ch)) {
      tokens.push({ kind: 'op', value: ch });
      i++;
      continue;
    }

    // Parens / comma
    if (ch === '(') { tokens.push({ kind: 'lparen', value: '(' }); i++; continue; }
    if (ch === ')') { tokens.push({ kind: 'rparen', value: ')' }); i++; continue; }
    if (ch === ',') { tokens.push({ kind: 'comma', value: ',' }); i++; continue; }

    // Quoted strings
    if (ch === '"' || ch === "'") {
      const quote = ch;
      i++;
      let str = '';
      while (i < input.length && input[i] !== quote) {
        str += input[i++];
      }
      i++; // skip closing quote
      tokens.push({ kind: 'string', value: str });
      continue;
    }

    // Identifiers (column names / function names) — allow letters, digits, underscore, space-separated words
    if (/[a-zA-Z_]/.test(ch)) {
      let ident = '';
      while (i < input.length && /[a-zA-Z0-9_ ]/.test(input[i])) {
        ident += input[i++];
      }
      tokens.push({ kind: 'ident', value: ident.trimEnd() });
      continue;
    }

    // Unknown character — skip
    i++;
  }

  return tokens;
}

// ─── Name resolution ──────────────────────────────────────────────────────────

const FUNCTIONS = new Set(['SUM', 'AVG', 'COUNT', 'MIN', 'MAX', 'IF']);

function buildNameMap(columns: ColumnDef[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const col of columns) {
    map.set(col.name.toLowerCase(), col.id);
  }
  return map;
}

interface ResolvedToken {
  kind: 'number' | 'string' | 'boolean' | 'op' | 'lparen' | 'rparen' | 'comma' | 'func' | 'compare';
  value: string | number | boolean;
}

function resolveNames(
  tokens: Token[],
  nameToId: Map<string, string>,
  row: Record<string, unknown>,
): ResolvedToken[] {
  const resolved: ResolvedToken[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];

    if (tok.kind === 'number') {
      resolved.push({ kind: 'number', value: parseFloat(tok.value) });
      continue;
    }

    if (tok.kind === 'string') {
      resolved.push({ kind: 'string', value: tok.value });
      continue;
    }

    if (tok.kind === 'ident') {
      const upper = tok.value.toUpperCase();
      // Check if it's a function name followed by '('
      if (FUNCTIONS.has(upper) && i + 1 < tokens.length && tokens[i + 1].kind === 'lparen') {
        resolved.push({ kind: 'func', value: upper });
        continue;
      }

      // Boolean literals
      if (upper === 'TRUE') { resolved.push({ kind: 'boolean', value: true }); continue; }
      if (upper === 'FALSE') { resolved.push({ kind: 'boolean', value: false }); continue; }

      // Column reference
      const colId = nameToId.get(tok.value.toLowerCase());
      if (colId === undefined) throw new FormulaError('#REF');
      const cellValue = row[colId];
      if (cellValue === null || cellValue === undefined || cellValue === '') {
        resolved.push({ kind: 'number', value: 0 });
      } else if (typeof cellValue === 'number') {
        resolved.push({ kind: 'number', value: cellValue });
      } else if (typeof cellValue === 'boolean') {
        resolved.push({ kind: 'boolean', value: cellValue });
      } else {
        const n = Number(cellValue);
        if (!isNaN(n)) {
          resolved.push({ kind: 'number', value: n });
        } else {
          resolved.push({ kind: 'string', value: String(cellValue) });
        }
      }
      continue;
    }

    if (tok.kind === 'op') { resolved.push({ kind: 'op', value: tok.value }); continue; }
    if (tok.kind === 'compare') { resolved.push({ kind: 'compare', value: tok.value }); continue; }
    if (tok.kind === 'lparen') { resolved.push({ kind: 'lparen', value: '(' }); continue; }
    if (tok.kind === 'rparen') { resolved.push({ kind: 'rparen', value: ')' }); continue; }
    if (tok.kind === 'comma') { resolved.push({ kind: 'comma', value: ',' }); continue; }
  }

  return resolved;
}

// ─── Recursive-descent parser / evaluator ─────────────────────────────────────

interface ParseResult {
  value: FormulaResult;
  pos: number;
}

function parseExpression(tokens: ResolvedToken[], pos: number): ParseResult {
  // comparison level
  let left = parseAddSub(tokens, pos);
  while (left.pos < tokens.length && tokens[left.pos]?.kind === 'compare') {
    const op = tokens[left.pos].value as string;
    const right = parseAddSub(tokens, left.pos + 1);
    left = { value: evalCompare(left.value, op, right.value), pos: right.pos };
  }
  return left;
}

function parseAddSub(tokens: ResolvedToken[], pos: number): ParseResult {
  let left = parseMulDiv(tokens, pos);
  while (left.pos < tokens.length) {
    const tok = tokens[left.pos];
    if (tok?.kind === 'op' && (tok.value === '+' || tok.value === '-')) {
      const right = parseMulDiv(tokens, left.pos + 1);
      const a = toNumber(left.value);
      const b = toNumber(right.value);
      left = { value: tok.value === '+' ? a + b : a - b, pos: right.pos };
    } else break;
  }
  return left;
}

function parseMulDiv(tokens: ResolvedToken[], pos: number): ParseResult {
  let left = parseUnary(tokens, pos);
  while (left.pos < tokens.length) {
    const tok = tokens[left.pos];
    if (tok?.kind === 'op' && (tok.value === '*' || tok.value === '/')) {
      const right = parseUnary(tokens, left.pos + 1);
      const a = toNumber(left.value);
      const b = toNumber(right.value);
      if (tok.value === '/' && b === 0) throw new FormulaError('#DIV/0!');
      left = { value: tok.value === '*' ? a * b : a / b, pos: right.pos };
    } else break;
  }
  return left;
}

function parseUnary(tokens: ResolvedToken[], pos: number): ParseResult {
  if (pos < tokens.length && tokens[pos].kind === 'op' && tokens[pos].value === '-') {
    const inner = parsePrimary(tokens, pos + 1);
    return { value: -toNumber(inner.value), pos: inner.pos };
  }
  return parsePrimary(tokens, pos);
}

function parsePrimary(tokens: ResolvedToken[], pos: number): ParseResult {
  if (pos >= tokens.length) throw new FormulaError('#ERROR');
  const tok = tokens[pos];

  // Function call
  if (tok.kind === 'func') {
    const funcName = tok.value as string;
    if (pos + 1 >= tokens.length || tokens[pos + 1].kind !== 'lparen') throw new FormulaError('#ERROR');
    const args: FormulaResult[] = [];
    let p = pos + 2; // skip func name and '('

    if (p < tokens.length && tokens[p].kind !== 'rparen') {
      const first = parseExpression(tokens, p);
      args.push(first.value);
      p = first.pos;
      while (p < tokens.length && tokens[p].kind === 'comma') {
        const next = parseExpression(tokens, p + 1);
        args.push(next.value);
        p = next.pos;
      }
    }
    if (p >= tokens.length || tokens[p].kind !== 'rparen') throw new FormulaError('#ERROR');
    return { value: evalFunc(funcName, args), pos: p + 1 };
  }

  // Parenthesised expression
  if (tok.kind === 'lparen') {
    const inner = parseExpression(tokens, pos + 1);
    if (inner.pos >= tokens.length || tokens[inner.pos].kind !== 'rparen') throw new FormulaError('#ERROR');
    return { value: inner.value, pos: inner.pos + 1 };
  }

  // Primitives
  if (tok.kind === 'number' || tok.kind === 'string' || tok.kind === 'boolean') {
    return { value: tok.value as FormulaResult, pos: pos + 1 };
  }

  throw new FormulaError('#ERROR');
}

// ─── Built-in functions ───────────────────────────────────────────────────────

function evalFunc(name: string, args: FormulaResult[]): FormulaResult {
  const nums = args.map(toNumber);

  switch (name) {
    case 'SUM':
      return nums.reduce((a, b) => a + b, 0);
    case 'AVG':
      if (nums.length === 0) return 0;
      return nums.reduce((a, b) => a + b, 0) / nums.length;
    case 'COUNT':
      return args.length;
    case 'MIN':
      if (nums.length === 0) return 0;
      return Math.min(...nums);
    case 'MAX':
      if (nums.length === 0) return 0;
      return Math.max(...nums);
    case 'IF': {
      if (args.length < 2) throw new FormulaError('#ERROR');
      const condition = toBool(args[0]);
      return condition ? args[1] : (args[2] ?? false);
    }
    default:
      throw new FormulaError('#ERROR');
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toNumber(v: FormulaResult): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'boolean') return v ? 1 : 0;
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

function toBool(v: FormulaResult): boolean {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  return v !== '' && v !== '0' && v !== 'false';
}

function evalCompare(left: FormulaResult, op: string, right: FormulaResult): boolean {
  const a = typeof left === 'string' || typeof right === 'string' ? String(left) : toNumber(left);
  const b = typeof left === 'string' || typeof right === 'string' ? String(right) : toNumber(right);

  switch (op) {
    case '==': return a === b;
    case '!=': return a !== b;
    case '>':  return a > b;
    case '<':  return a < b;
    case '>=': return a >= b;
    case '<=': return a <= b;
    default:   return false;
  }
}
