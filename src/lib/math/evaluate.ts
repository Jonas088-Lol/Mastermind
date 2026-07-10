/**
 * Sicherer mathematischer Ausdruck-Evaluator (KEIN eval).
 *
 * Parst einen arithmetischen Ausdruck per Shunting-Yard-Algorithmus und wertet
 * ihn aus. Unterstützt: + - * / ^, Klammern, Konstanten (pi, e), und Funktionen
 * (sqrt, sin, cos, tan, log, ln, abs, exp, round, floor, ceil).
 *
 * Nimmt auch einfaches LaTeX an: \times, \cdot, \div, \sqrt{...}, \frac{a}{b},
 * ^{...} werden vor dem Parsen in Normalform gebracht.
 *
 * Gibt { ok, value } oder { ok:false, error } zurück — wirft nie.
 */

export type EvalResult = { ok: true; value: number } | { ok: false; error: string };

const CONSTANTS: Record<string, number> = { pi: Math.PI, e: Math.E };

const FUNCTIONS: Record<string, (x: number) => number> = {
  sqrt: Math.sqrt, sin: Math.sin, cos: Math.cos, tan: Math.tan,
  asin: Math.asin, acos: Math.acos, atan: Math.atan,
  log: (x) => Math.log10(x), ln: Math.log, exp: Math.exp,
  abs: Math.abs, round: Math.round, floor: Math.floor, ceil: Math.ceil,
};

/** Wandelt einfaches LaTeX in eine parsebare Normalform um. */
function fromLatex(input: string): string {
  let s = input;
  // Mehrere Durchläufe, damit auch verschachtelte Konstrukte
  // (\frac im \sqrt und umgekehrt) schrittweise aufgelöst werden.
  for (let pass = 0; pass < 6; pass++) {
    // \sqrt{a} → sqrt(a) — innerste zuerst (kein { } im Argument)
    s = s.replace(/\\sqrt\s*\{([^{}]+)\}/g, "sqrt($1)");
    // \frac{a}{b} → (a)/(b) — innerste zuerst
    s = s.replace(/\\frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g, "($1)/($2)");
    // ^{...} → ^(...)
    s = s.replace(/\^\s*\{([^{}]+)\}/g, "^($1)");
  }
  // Operatoren
  s = s.replace(/\\times|\\cdot/g, "*").replace(/\\div/g, "/");
  // Übrige LaTeX-Backslash-Befehle
  s = s.replace(/\\left|\\right/g, "");
  s = s.replace(/\\[a-zA-Z]+/g, (m) => m.slice(1)); // \pi → pi
  return s;
}

type Token = { type: "num" | "op" | "lparen" | "rparen" | "func" | "const" | "comma"; value: string };

function tokenize(input: string): Token[] | null {
  const tokens: Token[] = [];
  let i = 0;
  const s = input.replace(/\s+/g, "");
  while (i < s.length) {
    const c = s[i];
    if (/[0-9.]/.test(c)) {
      let num = "";
      while (i < s.length && /[0-9.]/.test(s[i])) num += s[i++];
      tokens.push({ type: "num", value: num });
      continue;
    }
    if (/[a-zA-Z]/.test(c)) {
      let name = "";
      while (i < s.length && /[a-zA-Z]/.test(s[i])) name += s[i++];
      const lower = name.toLowerCase();
      if (lower in FUNCTIONS) tokens.push({ type: "func", value: lower });
      else if (lower in CONSTANTS) tokens.push({ type: "const", value: lower });
      else return null; // unbekannter Name
      continue;
    }
    if ("+-*/^".includes(c)) { tokens.push({ type: "op", value: c }); i++; continue; }
    if (c === "(") { tokens.push({ type: "lparen", value: c }); i++; continue; }
    if (c === ")") { tokens.push({ type: "rparen", value: c }); i++; continue; }
    if (c === ",") { tokens.push({ type: "comma", value: c }); i++; continue; }
    return null; // ungültiges Zeichen
  }
  return tokens;
}

// "u-" = unäre Negation (höchste Präzedenz, rechts-assoziativ), damit z. B.
// 3*-2 korrekt als 3*(-2) = -6 gerechnet wird, nicht (3*0)-2.
const PRECEDENCE: Record<string, number> = { "+": 1, "-": 1, "*": 2, "/": 2, "^": 3, "u-": 4 };
const RIGHT_ASSOC = new Set(["^", "u-"]);

/** Shunting-Yard → RPN, dann auswerten. */
export function evaluateExpression(raw: string): EvalResult {
  if (!raw || !raw.trim()) return { ok: false, error: "Leerer Ausdruck" };

  // "= x" am Ende / Gleichungen: nur die linke Seite vor "=" auswerten
  let expr = fromLatex(raw);
  if (expr.includes("=")) expr = expr.split("=")[0];

  const tokens = tokenize(expr);
  if (!tokens) return { ok: false, error: "Ungültiger Ausdruck" };

  // Unäres Minus als eigenen Operator "u-" markieren (statt 0 - x), damit die
  // Präzedenz stimmt: 3*-2 = 3*(-2) = -6, nicht (3*0)-2 = -2.
  const norm: Token[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    const prev = tokens[i - 1];
    if (t.type === "op" && t.value === "-" && (!prev || prev.type === "op" || prev.type === "lparen" || prev.type === "comma")) {
      norm.push({ type: "op", value: "u-" });
    } else {
      norm.push(t);
    }
  }

  const output: Token[] = [];
  const ops: Token[] = [];
  for (const t of norm) {
    if (t.type === "num" || t.type === "const") output.push(t);
    else if (t.type === "func") ops.push(t);
    else if (t.type === "op") {
      while (
        ops.length &&
        ops[ops.length - 1].type === "op" &&
        (RIGHT_ASSOC.has(t.value)
          ? PRECEDENCE[ops[ops.length - 1].value] > PRECEDENCE[t.value]
          : PRECEDENCE[ops[ops.length - 1].value] >= PRECEDENCE[t.value])
      ) {
        output.push(ops.pop()!);
      }
      ops.push(t);
    } else if (t.type === "lparen") ops.push(t);
    else if (t.type === "rparen") {
      while (ops.length && ops[ops.length - 1].type !== "lparen") output.push(ops.pop()!);
      if (!ops.length) return { ok: false, error: "Klammerfehler" };
      ops.pop(); // lparen weg
      if (ops.length && ops[ops.length - 1].type === "func") output.push(ops.pop()!);
    }
  }
  while (ops.length) {
    const op = ops.pop()!;
    if (op.type === "lparen") return { ok: false, error: "Klammerfehler" };
    output.push(op);
  }

  // RPN auswerten
  const stack: number[] = [];
  for (const t of output) {
    if (t.type === "num") stack.push(parseFloat(t.value));
    else if (t.type === "const") stack.push(CONSTANTS[t.value]);
    else if (t.type === "func") {
      const a = stack.pop();
      if (a === undefined) return { ok: false, error: "Ungültiger Ausdruck" };
      stack.push(FUNCTIONS[t.value](a));
    } else if (t.type === "op" && t.value === "u-") {
      const a = stack.pop();
      if (a === undefined) return { ok: false, error: "Ungültiger Ausdruck" };
      stack.push(-a);
    } else if (t.type === "op") {
      const b = stack.pop(), a = stack.pop();
      if (a === undefined || b === undefined) return { ok: false, error: "Ungültiger Ausdruck" };
      switch (t.value) {
        case "+": stack.push(a + b); break;
        case "-": stack.push(a - b); break;
        case "*": stack.push(a * b); break;
        case "/": stack.push(a / b); break;
        case "^": stack.push(Math.pow(a, b)); break;
      }
    }
  }
  if (stack.length !== 1 || !Number.isFinite(stack[0])) {
    return { ok: false, error: "Ausdruck nicht berechenbar" };
  }
  // Auf sinnvolle Stellen runden (Gleitkomma-Artefakte vermeiden)
  const v = Math.round(stack[0] * 1e10) / 1e10;
  return { ok: true, value: v };
}
