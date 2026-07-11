/**
 * MEGA-Fragen-Generator RUNDE 15 für MasterMind.
 *
 * Ergänzt die Fragenbank aus generate.mjs … generate14.mjs im GLEICHEN Format
 *   scripts/questions/mega/data/<fach>-klasse<k>.json
 * mit [{ topic, question, options[4], correct(Index), explanation }].
 *
 * Fächer/Umfang (nur NEUE Dateien mit Präfix mathematik9-/englisch7-):
 *   1) mathematik9  Klasse 7–13, >= 600/Klasse
 *      (Terme mit Klammern auflösen — berechnet; lineare Gleichungssysteme
 *       2x2 — berechnet; Kl. 9–10 quadratische Ergänzung/Scheitelpunkt —
 *       berechnet; Trigonometrie sin/cos/tan Standardwinkel; Kl. 11–13
 *       e-Funktion-Ableitungen, Kettenregel einfache Fälle,
 *       Normalverteilung Standardfälle — Sigma-Regeln)
 *   2) englisch7    Klasse 5–10, >= 500/Klasse
 *      (Satzbau-Umstellungen: welche Wortreihenfolge ist korrekt — berechnet;
 *       reported speech Umformungen — tabellenbasiert; passive voice —
 *       berechnet aus Aktiv-Sätzen; relative clauses who/which/whose)
 *
 * Deterministisch (mulberry32-Seed). Keine Abhängigkeiten, reines Node.
 *
 * Aufruf (vom Repo-Root):
 *   node scripts/questions/mega/generate15.mjs
 * Danach Import wie gehabt:
 *   npx tsx scripts/questions/mega/import-mega.ts
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const DATA_DIR = join(dirname(fileURLToPath(import.meta.url)), "data");

/* ────────────────────────── PRNG & Helfer ────────────────────────── */

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeRng(seed) {
  const next = mulberry32(seed);
  return {
    next,
    int(min, max) { return min + Math.floor(next() * (max - min + 1)); },
    pick(arr) { return arr[Math.floor(next() * arr.length)]; },
    shuffle(arr) {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    },
  };
}

function mc(rng, topic, question, correct, distractors, explanation) {
  const correctStr = String(correct);
  const opts = [];
  const seen = new Set([correctStr]);
  for (const d of distractors) {
    const s = String(d);
    if (!seen.has(s)) { seen.add(s); opts.push(s); }
    if (opts.length === 3) break;
  }
  if (opts.length < 3) return null;
  const all = rng.shuffle([correctStr, ...opts]);
  return { topic, question, options: all, correct: all.indexOf(correctStr), explanation };
}

function generateBank(seed, count, generators) {
  const rng = makeRng(seed);
  const out = [];
  const texts = new Set();
  let attempts = 0;
  const maxAttempts = count * 500;
  while (out.length < count && attempts < maxAttempts) {
    attempts++;
    const gen = rng.pick(generators);
    let q;
    try { q = gen(rng); } catch { continue; }
    if (!q || texts.has(q.question)) continue;
    if (new Set(q.options).size !== 4) continue;
    texts.add(q.question);
    out.push(q);
  }
  return out;
}

const LEADS = ["", "Wähle die richtige Antwort. ", "Aufgabe: ", "Rechne nach: "];

/* ─────────────────── Mathe-Formatierungs-Helfer ─────────────────── */

/** "3x + 5" / "3x − 5" / "x − 5" mit Vorzeichen-Formatierung. */
function lin(a, b) {
  const ax = a === 1 ? "x" : a === -1 ? "−x" : `${a < 0 ? "−" : ""}${Math.abs(a)}x`;
  if (b === 0) return ax;
  return `${ax} ${b < 0 ? "−" : "+"} ${Math.abs(b)}`;
}

/** "x² + 5x + 6" (Koeffizienten 1, x-Koeffizient p, Konstante q). */
function quadStr(p, q) {
  let s = "x²";
  if (p !== 0) s += ` ${p < 0 ? "−" : "+"} ${Math.abs(p) === 1 ? "" : Math.abs(p)}x`;
  if (q !== 0) s += ` ${q < 0 ? "−" : "+"} ${Math.abs(q)}`;
  return s;
}

/** Zahl als deutscher String (Komma statt Punkt). */
function de(n) {
  return String(Math.round(n * 100) / 100).replace(".", ",").replace("-", "−");
}

/* ══════════════ 1) MATHEMATIK Klasse 7–13 (mathematik9) ══════════════ */

// Terme mit Klammern: a(bx + c) = abx + ac
function genKlammer(r) {
  const a = r.int(2, 9);
  const b = r.int(1, 9);
  const c = r.int(1, 9) * (r.next() < 0.5 ? -1 : 1);
  const neg = r.next() < 0.3;
  const fac = neg ? -a : a;
  const term = `${neg ? "−" : ""}${a}(${lin(b, c)})`;
  const correct = lin(fac * b, fac * c);
  const distractors = [
    lin(fac * b, c),            // Konstante nicht multipliziert
    lin(fac * b, -fac * c),     // Vorzeichenfehler
    lin(fac + b, fac * c),      // addiert statt multipliziert
    lin(fac * b, fac * Math.abs(c)),
  ];
  return mc(r, "Terme & Klammern",
    `${r.pick(LEADS)}Löse die Klammer auf: ${term}`,
    correct, distractors,
    `Jeder Summand in der Klammer wird mit ${neg ? "−" : ""}${a} multipliziert (Distributivgesetz): ${term} = ${correct}.`);
}

// Binomische Multiplikation: (x + a)(x + b) = x² + (a+b)x + ab (ab Kl. 8)
function genBinom(r) {
  const a = r.int(1, 9) * (r.next() < 0.5 ? -1 : 1);
  const b = r.int(1, 9) * (r.next() < 0.5 ? -1 : 1);
  const term = `(${lin(1, a)})(${lin(1, b)})`;
  const correct = quadStr(a + b, a * b);
  const distractors = [
    quadStr(a + b, a + b),
    quadStr(a * b, a + b),
    quadStr(a + b, -a * b),
    quadStr(2 * (a + b), a * b),
  ];
  return mc(r, "Terme & Klammern",
    `${r.pick(LEADS)}Multipliziere aus: ${term}`,
    correct, distractors,
    `(x + a)(x + b) = x² + (a + b)x + a·b. Hier: x² + (${de(a)} + ${de(b)})x + (${de(a)})·(${de(b)}) = ${correct}.`);
}

// LGS 2x2 mit ganzzahliger Lösung (Lösung wird vorgegeben, Gleichungen daraus gebaut)
function genLgs(r) {
  const x = r.int(-6, 6);
  const y = r.int(-6, 6);
  const a1 = r.int(1, 4), b1 = r.int(1, 4);
  let a2 = r.int(1, 4), b2 = r.int(1, 4) * -1;
  if (a1 * b2 - a2 * b1 === 0) a2 += 1;
  if (a1 * b2 - a2 * b1 === 0) return null;
  const c1 = a1 * x + b1 * y;
  const c2 = a2 * x + b2 * y;
  const eq = (a, b, c) => {
    const ax = a === 1 ? "x" : `${a}x`;
    const by = Math.abs(b) === 1 ? "y" : `${Math.abs(b)}y`;
    return `${ax} ${b < 0 ? "−" : "+"} ${by} = ${de(c)}`;
  };
  const askX = r.next() < 0.5;
  const correct = askX ? x : y;
  const other = askX ? y : x;
  const distractors = [other, -correct, correct + 1, correct - 1, correct + 2]
    .filter((v) => v !== correct).map(de);
  return mc(r, "Lineare Gleichungssysteme",
    `${r.pick(LEADS)}Löse das Gleichungssystem: I) ${eq(a1, b1, c1)}   II) ${eq(a2, b2, c2)}. Welchen Wert hat ${askX ? "x" : "y"}?`,
    de(correct), distractors,
    `Additionsverfahren: Beide Gleichungen so kombinieren, dass eine Variable wegfällt. Die Lösung ist x = ${de(x)} und y = ${de(y)}, also ${askX ? "x" : "y"} = ${de(correct)}.`);
}

// Quadratische Ergänzung / Scheitelpunkt (Kl. 9–10): f(x) = x² + px + q
function genScheitel(r) {
  const half = r.int(1, 6) * (r.next() < 0.5 ? -1 : 1); // p = 2·half → xs ganzzahlig
  const p = 2 * half;
  const q = r.int(-9, 9);
  const xs = -half;
  const ys = q - half * half;
  const S = (u, v) => `S(${de(u)}|${de(v)})`;
  const correct = S(xs, ys);
  const distractors = [S(-xs, ys), S(xs, q), S(-xs, -ys), S(xs, ys + 1)]
    .filter((s) => s !== correct);
  return mc(r, "Quadratische Funktionen",
    `${r.pick(LEADS)}Bestimme mit quadratischer Ergänzung den Scheitelpunkt der Parabel f(x) = ${quadStr(p, q)}.`,
    correct, distractors,
    `f(x) = x² + ${de(p)}x + ${de(q)} = (x ${xs < 0 ? "+" : "−"} ${Math.abs(xs)})² + ${de(ys)}. Scheitelform f(x) = (x − d)² + e ⇒ Scheitel ${correct}.`);
}

// Trigonometrie: Standardwinkel (ab Kl. 9)
const TRIG = [
  ["sin", 0, "0"], ["sin", 30, "1/2"], ["sin", 45, "√2/2"], ["sin", 60, "√3/2"], ["sin", 90, "1"],
  ["cos", 0, "1"], ["cos", 30, "√3/2"], ["cos", 45, "√2/2"], ["cos", 60, "1/2"], ["cos", 90, "0"],
  ["tan", 0, "0"], ["tan", 30, "√3/3"], ["tan", 45, "1"], ["tan", 60, "√3"],
];
const TRIG_POOL = ["0", "1/2", "√2/2", "√3/2", "1", "√3/3", "√3", "2", "−1/2"];
function genTrig(r) {
  const [fn, deg, val] = r.pick(TRIG);
  const distractors = r.shuffle(TRIG_POOL.filter((v) => v !== val));
  return mc(r, "Trigonometrie",
    `${r.pick(LEADS)}Welchen exakten Wert hat ${fn}(${deg}°)?`,
    val, distractors,
    `${fn}(${deg}°) = ${val} ist einer der Standardwerte (Tabelle der besonderen Winkel 0°, 30°, 45°, 60°, 90°).`);
}

// e-Funktion ableiten (Kl. 11–13): f(x) = a·e^(kx) → f'(x) = a·k·e^(kx)
function genEFunk(r) {
  const a = r.int(2, 9);
  let k = r.int(-4, 4);
  if (k === 0 || k === 1) k = 2 + r.int(0, 2);
  const eterm = (coef, kk) => `${de(coef)}·e^(${kk === 1 ? "" : de(kk)}x)`;
  const f = eterm(a, k);
  const correct = eterm(a * k, k);
  const distractors = [eterm(a, k), eterm(a * k, k - 1), `${de(a * k)}·x·e^(${de(k)}x)`, eterm(a + k, k)]
    .filter((s) => s !== correct);
  return mc(r, "Analysis: e-Funktion",
    `${r.pick(LEADS)}Leite ab: f(x) = ${f}. Wie lautet f'(x)?`,
    correct, distractors,
    `Kettenregel für e-Funktionen: (a·e^(kx))' = a·k·e^(kx). Der Exponent bleibt unverändert, der Faktor k kommt nach vorn: f'(x) = ${correct}.`);
}

// Kettenregel einfacher Fall (Kl. 11–13): f(x) = (ax + b)^n
function genKette(r) {
  const a = r.int(2, 5);
  const b = r.int(1, 9);
  const n = r.int(2, 5);
  const inner = lin(a, b);
  const pw = (coef, ex) => ex === 1 ? `${de(coef)}·(${inner})` : `${de(coef)}·(${inner})^${ex}`;
  const correct = pw(n * a, n - 1);
  const distractors = [pw(n, n - 1), pw(n * a, n), pw(a, n - 1), pw(n + a, n - 1)]
    .filter((s) => s !== correct);
  return mc(r, "Analysis: Kettenregel",
    `${r.pick(LEADS)}Leite mit der Kettenregel ab: f(x) = (${inner})^${n}. Wie lautet f'(x)?`,
    correct, distractors,
    `Kettenregel: äußere Ableitung mal innere Ableitung. Außen: n·(…)^(n−1) = ${n}·(${inner})^${n - 1}, innen: (${inner})' = ${a}. Also f'(x) = ${correct}.`);
}

// Normalverteilung Standardfälle (Kl. 11–13): Sigma-Regeln, Symmetrie
const NV_PARAMS = [[100, 15], [50, 5], [200, 20], [70, 8], [120, 10], [60, 6], [80, 12], [150, 25]];
function genNormal(r) {
  const [mu, sig] = r.pick(NV_PARAMS);
  const variant = r.int(0, 3);
  if (variant === 0) {
    const kFac = r.int(1, 3);
    const pct = kFac === 1 ? "ca. 68 %" : kFac === 2 ? "ca. 95,4 %" : "ca. 99,7 %";
    const distractors = ["ca. 50 %", "ca. 68 %", "ca. 95,4 %", "ca. 99,7 %", "ca. 34 %"].filter((s) => s !== pct);
    return mc(r, "Stochastik: Normalverteilung",
      `${r.pick(LEADS)}X ist normalverteilt mit μ = ${mu} und σ = ${sig}. Wie groß ist ungefähr P(${mu - kFac * sig} ≤ X ≤ ${mu + kFac * sig})?`,
      pct, distractors,
      `Sigma-Regeln: Im Intervall μ ± σ liegen ca. 68 %, in μ ± 2σ ca. 95,4 %, in μ ± 3σ ca. 99,7 % der Werte. Hier ist das Intervall μ ± ${kFac}σ ⇒ ${pct}.`);
  }
  if (variant === 1) {
    const distractors = ["ca. 68 %", "ca. 34 %", "0 %", "ca. 95 %"];
    return mc(r, "Stochastik: Normalverteilung",
      `${r.pick(LEADS)}X ist normalverteilt mit μ = ${mu} und σ = ${sig}. Wie groß ist P(X ≤ ${mu})?`,
      "50 %", distractors,
      `Die Normalverteilung ist symmetrisch um den Erwartungswert μ = ${mu}: Genau die Hälfte der Werte liegt darunter ⇒ P(X ≤ μ) = 50 %.`);
  }
  if (variant === 2) {
    const distractors = ["ca. 68 %", "50 %", "ca. 95 %", "ca. 16 %"];
    return mc(r, "Stochastik: Normalverteilung",
      `${r.pick(LEADS)}X ist normalverteilt mit μ = ${mu} und σ = ${sig}. Wie groß ist ungefähr P(X ≤ ${mu + sig})?`,
      "ca. 84 %", distractors,
      `P(X ≤ μ + σ) = 50 % + 34 % ≈ 84 %, denn zwischen μ und μ + σ liegen ca. 34 % der Werte (halbe 68-%-Regel).`);
  }
  return mc(r, "Stochastik: Normalverteilung",
    `${r.pick(LEADS)}X ist normalverteilt mit μ = ${mu} und σ = ${sig}. An welcher Stelle hat die Glockenkurve ihr Maximum?`,
    `bei x = ${mu}`, [`bei x = ${sig}`, `bei x = ${mu + sig}`, `bei x = ${mu - sig}`, "bei x = 0"],
    `Die Dichte der Normalverteilung ist eine um μ symmetrische Glockenkurve – ihr Maximum liegt genau beim Erwartungswert μ = ${mu}.`);
}

function mathematik9Generators(k) {
  const gens = [genKlammer, genLgs];
  if (k >= 8) gens.push(genBinom);
  if (k === 9 || k === 10) gens.push(genScheitel);
  if (k >= 9) gens.push(genTrig);
  if (k >= 11) gens.push(genEFunk, genKette, genNormal);
  return gens;
}

/* ══════════════ 2) ENGLISCH Klasse 5–10 (englisch7) ══════════════ */

// Satzbau: Subjekt + Verb (Basis / 3. Person) + Objekt + Ort + Zeit
const EN_SUBJECTS = [
  ["Tom", true], ["My sister", true], ["Our teacher", true], ["Anna", true], ["My best friend", true],
  ["The children", false], ["We", false], ["They", false], ["The boys", false], ["Anna and Ben", false],
];
const EN_VERBOBJ = [
  ["play", "plays", "football"], ["read", "reads", "comics"], ["eat", "eats", "pizza"],
  ["watch", "watches", "films"], ["sing", "sings", "songs"], ["buy", "buys", "fruit"],
  ["write", "writes", "e-mails"], ["learn", "learns", "English"], ["drink", "drinks", "tea"],
  ["do", "does", "their homework"],
];
const EN_PLACES = ["in the park", "at school", "at home", "in the garden", "in the kitchen", "at the club", "in the library", "in the classroom"];
const EN_TIMES = ["every day", "on Mondays", "in the afternoon", "at the weekend", "after school", "in the evening", "once a week", "every morning"];

function genWordOrder(r) {
  const [subj, third] = r.pick(EN_SUBJECTS);
  const [base, s3, obj] = r.pick(EN_VERBOBJ);
  const verb = third ? s3 : base;
  const place = r.pick(EN_PLACES);
  const time = r.pick(EN_TIMES);
  const correct = `${subj} ${verb} ${obj} ${place} ${time}.`;
  const distractors = [
    `${subj} ${obj} ${verb} ${place} ${time}.`,          // Objekt vor Verb
    `${subj} ${verb} ${place} ${obj} ${time}.`,          // Objekt hinter Ort
    `${subj} ${verb} ${obj} ${time} in ${place.split(" ").slice(1).join(" ")} the.`, // zerrissen
  ];
  return mc(r, "Satzbau (word order)",
    `Which sentence has the correct word order? (Wörter: ${r.shuffle([subj, verb, obj, place, time]).join(" / ")})`,
    correct, distractors,
    `Englischer Satzbau: Subjekt – Verb – Objekt, dann Ort vor Zeit (place before time): „${correct}“`);
}

// Reported speech: [direkter Satz, reported (mit {P}/{POSS}), falsche Varianten]
const EN_SPEAKERS = [["Tom", "he", "his"], ["Anna", "she", "her"], ["Ben", "he", "his"], ["Lucy", "she", "her"], ["Mr Smith", "he", "his"], ["Mrs Miller", "she", "her"]];
const REPORTED = [
  ["I am tired", "{P} was tired", ["{P} is tired", "{P} has been tired", "{P} were tired"]],
  ["I like pizza", "{P} liked pizza", ["{P} likes pizza", "{P} had liked pizza", "{P} like pizza"]],
  ["I can swim", "{P} could swim", ["{P} can swim", "{P} could swam", "{P} can swam"]],
  ["I will help you", "{P} would help me", ["{P} will help me", "{P} would helped me", "{P} will helped you"]],
  ["I am reading a book", "{P} was reading a book", ["{P} is reading a book", "{P} has read a book", "{P} were reading a book"]],
  ["I have finished my homework", "{P} had finished {POSS} homework", ["{P} has finished {POSS} homework", "{P} finished {POSS} homework yesterday", "{P} have finished {POSS} homework"]],
  ["I visited London", "{P} had visited London", ["{P} visited London", "{P} has visited London", "{P} had visit London"]],
  ["I don't like tea", "{P} didn't like tea", ["{P} doesn't like tea", "{P} don't like tea", "{P} hadn't like tea"]],
  ["I must go now", "{P} had to go then", ["{P} must go now", "{P} must went then", "{P} has to go now"]],
  ["I live in Berlin", "{P} lived in Berlin", ["{P} lives in Berlin", "{P} had lived in Berlin always", "{P} live in Berlin"]],
  ["I am hungry", "{P} was hungry", ["{P} is hungry", "{P} has been hungry", "{P} were hungry"]],
  ["I play tennis every week", "{P} played tennis every week", ["{P} plays tennis every week", "{P} had played tennis every week", "{P} play tennis every week"]],
  ["I have lost my key", "{P} had lost {POSS} key", ["{P} has lost {POSS} key", "{P} lost {POSS} key today", "{P} have lost {POSS} key"]],
  ["I will call you tomorrow", "{P} would call me the next day", ["{P} will call me tomorrow", "{P} would called me the next day", "{P} will calls me the next day"]],
  ["I can't come to the party", "{P} couldn't come to the party", ["{P} can't come to the party", "{P} couldn't came to the party", "{P} can't came to the party"]],
  ["I am learning French", "{P} was learning French", ["{P} is learning French", "{P} has learned French", "{P} were learning French"]],
  ["I want a new bike", "{P} wanted a new bike", ["{P} wants a new bike", "{P} had wanted a new bike", "{P} want a new bike"]],
  ["I saw a great film", "{P} had seen a great film", ["{P} saw a great film", "{P} has seen a great film", "{P} had saw a great film"]],
];
function genReported(r) {
  const [name, pron, poss] = r.pick(EN_SPEAKERS);
  const [direct, rep, wrong] = r.pick(REPORTED);
  const fill = (s) => s.replaceAll("{P}", pron).replaceAll("{POSS}", poss);
  const correct = `${name} said (that) ${fill(rep)}.`;
  const distractors = wrong.map((w) => `${name} said (that) ${fill(w)}.`);
  return mc(r, "Reported speech",
    `${name} said: "${direct}." — Turn it into reported speech:`,
    correct, distractors,
    `Beim reported speech rückt die Zeit einen Schritt zurück (backshift) und Pronomen werden angepasst: „${direct}“ → ${correct}`);
}

// Passive voice: [Verb 3. Person, Verb past, past participle, Objekt, Objekt-Plural?]
const EN_AGENTS = ["Tom", "Anna", "the teacher", "my brother", "the gardener", "Mrs Miller", "the chef", "Ben"];
const EN_PASSIVE_VERBS = [
  ["writes", "wrote", "written", "the letter", false],
  ["cleans", "cleaned", "cleaned", "the windows", true],
  ["repairs", "repaired", "repaired", "the bike", false],
  ["paints", "painted", "painted", "the walls", true],
  ["bakes", "baked", "baked", "the cakes", true],
  ["waters", "watered", "watered", "the flowers", true],
  ["opens", "opened", "opened", "the door", false],
  ["feeds", "fed", "fed", "the animals", true],
  ["builds", "built", "built", "the house", false],
  ["makes", "made", "made", "the beds", true],
  ["reads", "read", "read", "the story", false],
  ["buys", "bought", "bought", "the tickets", true],
];
function genPassive(r, allowPast) {
  const agent = r.pick(EN_AGENTS);
  const [v3, vPast, pp, obj, plural] = r.pick(EN_PASSIVE_VERBS);
  const past = allowPast && r.next() < 0.5;
  const active = `${agent} ${past ? vPast : v3} ${obj}.`;
  const objCap = obj[0].toUpperCase() + obj.slice(1);
  const be = past ? (plural ? "were" : "was") : (plural ? "are" : "is");
  const beWrong = past ? (plural ? "was" : "were") : (plural ? "is" : "are");
  const beOther = past ? (plural ? "are" : "is") : (plural ? "were" : "was");
  const correct = `${objCap} ${be} ${pp} by ${agent}.`;
  const distractors = [
    `${objCap} ${beWrong} ${pp} by ${agent}.`,       // Numerus falsch
    `${objCap} ${beOther} ${pp} by ${agent}.`,       // Zeit falsch
    `${objCap} ${be} ${past ? v3 : vPast} by ${agent}.`, // falsche Verbform
  ];
  return mc(r, "Passive voice",
    `Turn the sentence into the passive voice: "${active}"`,
    correct, distractors,
    `Passiv: Objekt wird Subjekt + ${past ? "was/were" : "is/are"} + past participle (+ by-agent): ${correct}`);
}

// Relative clauses: [Satz mit ___, richtiges Pronomen, Begründung]
const RELATIVE = [
  ["The man ___ lives next door is a doctor.", "who", "Bei Personen als Subjekt des Relativsatzes steht „who“."],
  ["The woman ___ teaches us maths is very nice.", "who", "Bei Personen als Subjekt des Relativsatzes steht „who“."],
  ["The boy ___ won the race is my cousin.", "who", "Bei Personen als Subjekt des Relativsatzes steht „who“."],
  ["The girl ___ sits next to me is from Spain.", "who", "Bei Personen als Subjekt des Relativsatzes steht „who“."],
  ["The pupils ___ study hard get good marks.", "who", "Bei Personen als Subjekt des Relativsatzes steht „who“."],
  ["The singer ___ performed last night was amazing.", "who", "Bei Personen als Subjekt des Relativsatzes steht „who“."],
  ["The doctor ___ helped my grandma works at the hospital.", "who", "Bei Personen als Subjekt des Relativsatzes steht „who“."],
  ["The neighbour ___ has a big dog is very friendly.", "who", "Bei Personen als Subjekt des Relativsatzes steht „who“."],
  ["The book ___ is on the table belongs to Sarah.", "which", "Bei Sachen und Tieren steht „which“ (oder „that“)."],
  ["The car ___ is parked outside is very old.", "which", "Bei Sachen und Tieren steht „which“ (oder „that“)."],
  ["The film ___ we watched yesterday was boring.", "which", "Bei Sachen und Tieren steht „which“ (oder „that“)."],
  ["The house ___ has a red roof is ours.", "which", "Bei Sachen und Tieren steht „which“ (oder „that“)."],
  ["The cake ___ my mum baked tastes delicious.", "which", "Bei Sachen und Tieren steht „which“ (oder „that“)."],
  ["The phone ___ I bought last week is broken.", "which", "Bei Sachen und Tieren steht „which“ (oder „that“)."],
  ["The song ___ is playing on the radio is my favourite.", "which", "Bei Sachen und Tieren steht „which“ (oder „that“)."],
  ["The bag ___ is under the chair is mine.", "which", "Bei Sachen und Tieren steht „which“ (oder „that“)."],
  ["The dog ___ barks all night belongs to our neighbours.", "which", "Bei Sachen und Tieren steht „which“ (oder „that“)."],
  ["The museum ___ we visited was really interesting.", "which", "Bei Sachen und Tieren steht „which“ (oder „that“)."],
  ["The boy ___ bike was stolen is very sad.", "whose", "„Whose“ drückt Besitz aus (dessen/deren)."],
  ["The girl ___ father is a pilot travels a lot.", "whose", "„Whose“ drückt Besitz aus (dessen/deren)."],
  ["The teacher ___ car broke down came by bus.", "whose", "„Whose“ drückt Besitz aus (dessen/deren)."],
  ["The woman ___ dog ran away is looking for it.", "whose", "„Whose“ drückt Besitz aus (dessen/deren)."],
  ["The man ___ house burnt down lives with his brother now.", "whose", "„Whose“ drückt Besitz aus (dessen/deren)."],
  ["The pupil ___ project won the prize is in my class.", "whose", "„Whose“ drückt Besitz aus (dessen/deren)."],
  ["The author ___ books are famous lives in London.", "whose", "„Whose“ drückt Besitz aus (dessen/deren)."],
  ["The children ___ parents work late stay at school longer.", "whose", "„Whose“ drückt Besitz aus (dessen/deren)."],
];
function genRelative(r) {
  const [sentence, answer, why] = r.pick(RELATIVE);
  const distractors = ["who", "which", "whose", "what"].filter((w) => w !== answer);
  return mc(r, "Relative clauses",
    `Choose the correct relative pronoun: ${sentence}`,
    answer, distractors,
    `${why} Richtig: „${sentence.replace("___", answer)}“`);
}

function englisch7Generators(k) {
  const gens = [genWordOrder, genRelative];
  if (k >= 6) gens.push((r) => genPassive(r, k >= 7)); // ab Kl. 6 Präsens-Passiv, ab Kl. 7 auch past
  if (k >= 8) gens.push(genReported);
  return gens;
}

/* ────────────────────────── Hauptprogramm ────────────────────────── */

function writeBank(fileBase, klasse, questions, minCount) {
  const file = join(DATA_DIR, `${fileBase}-klasse${klasse}.json`);
  writeFileSync(file, JSON.stringify(questions, null, 1) + "\n");
  const warn = questions.length < minCount ? `  ⚠ unter Soll (${minCount})` : "";
  console.log(`  ${fileBase} Klasse ${klasse}: ${questions.length} Fragen → ${file}${warn}`);
  return questions.length;
}

function main() {
  mkdirSync(DATA_DIR, { recursive: true });
  let total = 0;

  console.log("Mathematik (Klasse 7–13, je >= 600):");
  for (let k = 7; k <= 13; k++)
    total += writeBank("mathematik9", k, generateBank(150000 + k, 600, mathematik9Generators(k)), 600);

  console.log("Englisch (Klasse 5–10, je >= 500):");
  for (let k = 5; k <= 10; k++)
    total += writeBank("englisch7", k, generateBank(151000 + k, 500, englisch7Generators(k)), 500);

  console.log(`\nGesamt (Runde 15): ${total} Fragen.`);
}

main();
