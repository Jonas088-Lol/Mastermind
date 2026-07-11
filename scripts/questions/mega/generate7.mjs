/**
 * MEGA-Fragen-Generator RUNDE 7 für MasterMind.
 *
 * Ergänzt die Fragenbank aus generate.mjs … generate6.mjs im GLEICHEN Format
 *   scripts/questions/mega/data/<fach>-klasse<k>.json
 * mit [{ topic, question, options[4], correct(Index), explanation }].
 *
 * Fächer/Umfang (nur NEUE Dateien mit den Präfixen mathematik5-, deutsch3-, englisch4-):
 *   1) mathematik5  Klasse 5–13, >= 500/Klasse
 *      5–7: Kopfrechnen-Vertiefung (große Zahlen, Teilbarkeit, kgV/ggT)
 *      8–10: binomische Formeln, Wurzelgesetze, Strahlensätze, lineare Funktionen
 *      11–13: Grenzwerte von Folgen, Tangentengleichungen, Baumdiagramme
 *   2) deutsch3     Klasse 5–10, >= 400/Klasse
 *      Synonyme/Antonyme, Fremdwörter, Sprichwörter, Silbentrennung, Groß-/Kleinschreibung
 *   3) englisch4    Klasse 5–13, >= 400/Klasse
 *      Phrasal verbs, Präpositionen, Wortfamilien; ab 11 Collocations + academic vocabulary
 *
 * Deterministisch (mulberry32-Seed). Keine Abhängigkeiten, reines Node.
 *
 * Aufruf (vom Repo-Root):
 *   node scripts/questions/mega/generate7.mjs
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

function pickN(rng, pool, exclude, n) {
  const out = [];
  const seen = new Set([String(exclude)]);
  for (const x of rng.shuffle(pool)) {
    const s = String(x);
    if (!seen.has(s)) { seen.add(s); out.push(s); }
    if (out.length === n) break;
  }
  return out;
}

function numDistractors(rng, correct, spread) {
  const set = new Set([correct]);
  const out = [];
  let guard = 0;
  while (out.length < 3 && guard < 100) {
    guard++;
    const delta = rng.int(1, spread) * (rng.next() < 0.5 ? -1 : 1);
    const cand = correct + delta;
    if (!set.has(cand)) { set.add(cand); out.push(cand); }
  }
  return out;
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

const LEADS = ["", "Wähle die richtige Antwort. ", "Aufgabe: ", "Teste dein Wissen: "];

function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { [a, b] = [b, a % b]; } return a; }
function frac(z, n) {
  const g = gcd(z, n) || 1;
  z /= g; n /= g;
  return n === 1 ? String(z) : `${z}/${n}`;
}

/* ══════════════════ 1) MATHEMATIK5 Klasse 5–13 ══════════════════ */

function mathematik5Generators(klasse) {
  const gens = [];

  if (klasse <= 7) {
    // Große Zahlen: Addition
    gens.push((r) => {
      const a = r.int(1000, 90000);
      const b = r.int(1000, 90000);
      const c = a + b;
      return mc(r, "Kopfrechnen", `${r.pick(LEADS)}Berechne: ${a} + ${b}`,
        c, numDistractors(r, c, 120), `${a} + ${b} = ${c}.`);
    });
    // Große Zahlen: Subtraktion
    gens.push((r) => {
      const b = r.int(1000, 50000);
      const a = b + r.int(1000, 60000);
      const c = a - b;
      return mc(r, "Kopfrechnen", `${r.pick(LEADS)}Berechne: ${a} − ${b}`,
        c, numDistractors(r, c, 120), `${a} − ${b} = ${c}.`);
    });
    // Multiplikation mit glatten Zahlen
    gens.push((r) => {
      const a = r.int(12, 99);
      const b = r.pick([20, 30, 40, 50, 60, 70, 80, 90, 200, 300, 400]);
      const c = a * b;
      return mc(r, "Kopfrechnen", `${r.pick(LEADS)}Berechne: ${a} · ${b}`,
        c, [c + b, c - b, c + 10 * a], `${a} · ${b} = ${c}. Tipp: ${a} · ${b / 10} · 10 rechnen.`);
    });
    // Division ohne Rest
    gens.push((r) => {
      const q = r.int(12, 250);
      const d = r.pick([3, 4, 6, 7, 8, 9, 12, 15, 25]);
      const a = q * d;
      return mc(r, "Kopfrechnen", `${r.pick(LEADS)}Berechne: ${a} : ${d}`,
        q, numDistractors(r, q, Math.max(3, Math.floor(q / 10))), `${a} : ${d} = ${q}, denn ${q} · ${d} = ${a}.`);
    });
    // Teilbarkeitsregeln: welche Zahl ist teilbar?
    gens.push((r) => {
      const d = r.pick([2, 3, 4, 5, 6, 9, 10, 25]);
      const correct = d * r.int(20, 400);
      const dist = [];
      let guard = 0;
      while (dist.length < 3 && guard < 60) {
        guard++;
        const cand = d * r.int(20, 400) + r.int(1, d - 1);
        if (cand % d !== 0 && !dist.includes(cand) && cand !== correct) dist.push(cand);
      }
      const rules = {
        2: "Eine Zahl ist durch 2 teilbar, wenn die letzte Ziffer gerade ist",
        3: "Eine Zahl ist durch 3 teilbar, wenn ihre Quersumme durch 3 teilbar ist",
        4: "Eine Zahl ist durch 4 teilbar, wenn die letzten beiden Ziffern eine durch 4 teilbare Zahl bilden",
        5: "Eine Zahl ist durch 5 teilbar, wenn sie auf 0 oder 5 endet",
        6: "Eine Zahl ist durch 6 teilbar, wenn sie durch 2 und durch 3 teilbar ist",
        9: "Eine Zahl ist durch 9 teilbar, wenn ihre Quersumme durch 9 teilbar ist",
        10: "Eine Zahl ist durch 10 teilbar, wenn sie auf 0 endet",
        25: "Eine Zahl ist durch 25 teilbar, wenn sie auf 00, 25, 50 oder 75 endet",
      };
      return mc(r, "Teilbarkeit", `${r.pick(LEADS)}Welche dieser Zahlen ist durch ${d} teilbar?`,
        correct, dist, `${rules[d]}: ${correct} = ${d} · ${correct / d}.`);
    });
    // ggT
    gens.push((r) => {
      const g = r.pick([2, 3, 4, 5, 6, 7, 8, 9, 12]);
      const pairs = [[2, 3], [3, 4], [2, 5], [3, 5], [4, 5], [5, 6], [2, 7], [3, 7], [4, 7], [5, 7], [2, 9], [4, 9], [5, 9], [3, 8], [5, 8], [7, 8]];
      const [m, n] = r.pick(pairs);
      const a = g * m, b = g * n;
      return mc(r, "ggT", `${r.pick(LEADS)}Bestimme den größten gemeinsamen Teiler: ggT(${a}, ${b})`,
        g, pickN(r, [1, 2, 3, 4, 5, 6, 7, 8, 9, 12, m * g, n * g].filter((x) => x !== g), g, 3),
        `${a} = ${g} · ${m} und ${b} = ${g} · ${n}; da ${m} und ${n} teilerfremd sind, ist ggT(${a}, ${b}) = ${g}.`);
    });
    // kgV
    gens.push((r) => {
      const g = r.pick([1, 2, 3, 4, 5, 6]);
      const pairs = [[2, 3], [3, 4], [2, 5], [3, 5], [4, 5], [5, 6], [2, 7], [3, 7], [4, 7], [2, 9], [4, 9], [3, 8]];
      const [m, n] = r.pick(pairs);
      const a = g * m, b = g * n;
      const kgv = g * m * n;
      return mc(r, "kgV", `${r.pick(LEADS)}Bestimme das kleinste gemeinsame Vielfache: kgV(${a}, ${b})`,
        kgv, pickN(r, [a * b, kgv * 2, kgv + g, a + b, kgv - g].filter((x) => x !== kgv && x > 0), kgv, 3),
        `kgV(${a}, ${b}) = (${a} · ${b}) / ggT(${a}, ${b}) = ${a * b} / ${g} = ${kgv}.`);
    });
    // Quersumme
    gens.push((r) => {
      const n = r.int(1234, 98765);
      const qs = String(n).split("").reduce((s, z) => s + Number(z), 0);
      return mc(r, "Quersumme", `${r.pick(LEADS)}Wie groß ist die Quersumme von ${n}?`,
        qs, numDistractors(r, qs, 4).filter((x) => x > 0), `Quersumme von ${n}: ${String(n).split("").join(" + ")} = ${qs}.`);
    });
  }

  if (klasse >= 8 && klasse <= 10) {
    // Binomische Formeln (Terme)
    gens.push((r) => {
      const a = r.int(1, 12);
      const kind = r.pick([1, 2, 3]);
      if (kind === 1) {
        return mc(r, "Binomische Formeln", `${r.pick(LEADS)}Multipliziere aus: (x + ${a})²`,
          `x² + ${2 * a}x + ${a * a}`,
          [`x² + ${a}x + ${a * a}`, `x² + ${2 * a}x + ${2 * a}`, `x² + ${a * a}`],
          `1. binomische Formel: (x + ${a})² = x² + 2·${a}·x + ${a}² = x² + ${2 * a}x + ${a * a}.`);
      }
      if (kind === 2) {
        return mc(r, "Binomische Formeln", `${r.pick(LEADS)}Multipliziere aus: (x − ${a})²`,
          `x² − ${2 * a}x + ${a * a}`,
          [`x² − ${a * a}`, `x² + ${2 * a}x + ${a * a}`, `x² − ${2 * a}x − ${a * a}`],
          `2. binomische Formel: (x − ${a})² = x² − 2·${a}·x + ${a}² = x² − ${2 * a}x + ${a * a}.`);
      }
      return mc(r, "Binomische Formeln", `${r.pick(LEADS)}Multipliziere aus: (x + ${a})(x − ${a})`,
        `x² − ${a * a}`,
        [`x² + ${a * a}`, `x² − ${2 * a}x + ${a * a}`, `x² − ${2 * a}x − ${a * a}`],
        `3. binomische Formel: (x + ${a})(x − ${a}) = x² − ${a}² = x² − ${a * a}.`);
    });
    // Binomisch rechnen: z. B. 31² = (30+1)²
    gens.push((r) => {
      const t = r.pick([20, 30, 40, 50, 60, 70, 80, 90, 100]);
      const d = r.pick([1, 2, 3]);
      const plus = r.next() < 0.5;
      const n = plus ? t + d : t - d;
      const c = n * n;
      return mc(r, "Binomische Formeln", `${r.pick(LEADS)}Berechne mit einer binomischen Formel: ${n}²`,
        c, [c + 2 * d, c - 2 * d, c + t],
        `${n}² = (${t} ${plus ? "+" : "−"} ${d})² = ${t * t} ${plus ? "+" : "−"} ${2 * t * d} + ${d * d} = ${c}.`);
    });
    // Wurzelgesetze: √a · √b
    gens.push((r) => {
      const k = r.pick([4, 6, 8, 9, 10, 12, 14, 15, 16, 18, 20]);
      const m = r.pick([2, 3, 4, 5, 6, 8].filter((x) => (k * k) % x === 0));
      const a = m, b = (k * k) / m;
      return mc(r, "Wurzelgesetze", `${r.pick(LEADS)}Berechne: √${a} · √${b}`,
        k, numDistractors(r, k, 4).filter((x) => x > 0), `√${a} · √${b} = √(${a} · ${b}) = √${k * k} = ${k}.`);
    });
    // Wurzelgesetze: √(a/b)
    gens.push((r) => {
      const z = r.pick([2, 3, 4, 5, 6, 7, 8, 9, 10]);
      const n = r.pick([2, 3, 4, 5].filter((x) => x !== z));
      return mc(r, "Wurzelgesetze", `${r.pick(LEADS)}Vereinfache: √${z * z * n * n} : √${n * n}`,
        z, numDistractors(r, z, 3).filter((x) => x > 0),
        `√${z * z * n * n} : √${n * n} = √(${z * z * n * n} / ${n * n}) = √${z * z} = ${z}.`);
    });
    // Strahlensatz
    gens.push((r) => {
      const f = r.pick([2, 3, 4, 5]);
      const za = r.int(2, 9);
      const zb = r.int(2, 9);
      const zap = za * f, zbp = zb * f;
      return mc(r, "Strahlensätze", `${r.pick(LEADS)}Zwei Strahlen von Z werden von Parallelen geschnitten. Es gilt ZA = ${za} cm, ZA' = ${zap} cm, ZB = ${zb} cm. Wie lang ist ZB'?`,
        `${zbp} cm`, numDistractors(r, zbp, 6).filter((x) => x > 0).map((x) => `${x} cm`),
        `1. Strahlensatz: ZA' / ZA = ZB' / ZB, also ZB' = ${zb} · ${zap}/${za} = ${zb} · ${f} = ${zbp} cm.`);
    });
    // Lineare Funktion: liegt Punkt auf Gerade?
    gens.push((r) => {
      const m = r.pick([-3, -2, -1, 1, 2, 3, 4]);
      const b = r.int(-8, 8);
      const px = r.int(-6, 6);
      const py = m * px + b;
      const bStr = b === 0 ? "" : b > 0 ? ` + ${b}` : ` − ${-b}`;
      const dist = [`(${px} | ${py + 1})`, `(${px} | ${py - 2})`, `(${px + 1} | ${py})`];
      // Sicherstellen, dass Distraktoren NICHT auf der Geraden liegen
      const bad = dist.filter((p) => {
        const mm = p.match(/\((-?\d+) \| (-?\d+)\)/);
        return mm && m * Number(mm[1]) + b === Number(mm[2]);
      });
      if (bad.length) return null;
      return mc(r, "Lineare Funktionen", `${r.pick(LEADS)}Welcher Punkt liegt auf dem Graphen von f(x) = ${m}x${bStr}?`,
        `(${px} | ${py})`, dist, `f(${px}) = ${m} · ${px}${bStr} = ${py}, also liegt (${px} | ${py}) auf dem Graphen.`);
    });
    // Lineare Funktion: Steigung aus zwei Punkten
    gens.push((r) => {
      const m = r.pick([-3, -2, -1, 1, 2, 3]);
      const x1 = r.int(-5, 3);
      const dx = r.int(1, 4);
      const x2 = x1 + dx;
      const b = r.int(-5, 5);
      const y1 = m * x1 + b, y2 = m * x2 + b;
      return mc(r, "Lineare Funktionen", `${r.pick(LEADS)}Eine Gerade verläuft durch P(${x1} | ${y1}) und Q(${x2} | ${y2}). Wie groß ist die Steigung m?`,
        m, pickN(r, [-4, -3, -2, -1, 0, 1, 2, 3, 4].filter((x) => x !== m), m, 3),
        `m = (y₂ − y₁) / (x₂ − x₁) = (${y2} − (${y1})) / (${x2} − (${x1})) = ${y2 - y1}/${dx} = ${m}.`);
    });
  }

  if (klasse >= 11) {
    // Grenzwert rationaler Folgen (gleicher Grad)
    gens.push((r) => {
      const c = r.int(2, 6);
      const a2 = r.int(1, 9);
      const b = r.int(1, 9);
      const d = r.int(1, 9);
      const lim = frac(a2, c);
      return mc(r, "Grenzwerte", `${r.pick(LEADS)}Bestimme den Grenzwert der Folge aₙ = (${a2}n + ${b}) / (${c}n + ${d}) für n → ∞.`,
        lim, pickN(r, [frac(b, d), frac(c, a2), "0", "∞", frac(a2 + 1, c)].filter((x) => x !== lim), lim, 3),
        `Für n → ∞ zählen nur die höchsten Potenzen: aₙ → ${a2}/${c} = ${lim}.`);
    });
    // Grenzwert: Zählergrad < Nennergrad
    gens.push((r) => {
      const a = r.int(1, 9);
      const b = r.int(1, 9);
      const c = r.int(1, 9);
      return mc(r, "Grenzwerte", `${r.pick(LEADS)}Bestimme den Grenzwert der Folge aₙ = (${a}n + ${b}) / (${c}n² + 1) für n → ∞.`,
        "0", [frac(a, c), "∞", frac(b, 1)], `Der Nennergrad (2) ist größer als der Zählergrad (1), also gilt aₙ → 0.`);
    });
    // Geometrische Folge q^n
    gens.push((r) => {
      const z = r.int(1, 4);
      const n = z + r.int(1, 4);
      return mc(r, "Grenzwerte", `${r.pick(LEADS)}Gegen welchen Wert konvergiert die Folge aₙ = (${z}/${n})ⁿ für n → ∞?`,
        "0", ["1", `${z}/${n}`, "∞"], `Wegen |${z}/${n}| < 1 gilt (${z}/${n})ⁿ → 0 für n → ∞.`);
    });
    // Tangente an f(x)=x² bzw. x²+c
    gens.push((r) => {
      const x0 = r.pick([-3, -2, -1, 1, 2, 3]);
      const c = r.int(0, 5);
      const m = 2 * x0;
      const y0 = x0 * x0 + c;
      const b = y0 - m * x0; // = c - x0²
      const fStr = c === 0 ? "x²" : `x² + ${c}`;
      const bStr = b === 0 ? "" : b > 0 ? ` + ${b}` : ` − ${-b}`;
      const t = `y = ${m}x${bStr}`;
      const dist = [
        `y = ${m}x${y0 === 0 ? "" : y0 > 0 ? ` + ${y0}` : ` − ${-y0}`}`,
        `y = ${x0}x${bStr}`,
        `y = ${m}x${b + 1 > 0 ? ` + ${b + 1}` : b + 1 === 0 ? "" : ` − ${-(b + 1)}`}`,
      ];
      return mc(r, "Tangenten", `${r.pick(LEADS)}Wie lautet die Tangente an f(x) = ${fStr} im Punkt x₀ = ${x0}?`,
        t, dist, `f'(x) = 2x, also m = f'(${x0}) = ${m}; f(${x0}) = ${y0}. Tangente: y = ${m}(x − (${x0})) + ${y0} = ${m}x${bStr}.`);
    });
    // Baumdiagramm: 2× Ziehen ohne Zurücklegen, beide rot
    gens.push((r) => {
      const rot = r.int(2, 6);
      const blau = r.int(2, 6);
      const n = rot + blau;
      const p = frac(rot * (rot - 1), n * (n - 1));
      return mc(r, "Baumdiagramme", `${r.pick(LEADS)}In einer Urne liegen ${rot} rote und ${blau} blaue Kugeln. Es wird zweimal ohne Zurücklegen gezogen. Wie groß ist P(beide rot)?`,
        p, pickN(r, [frac(rot * rot, n * n), frac(rot, n), frac(rot - 1, n - 1), frac(blau * (blau - 1), n * (n - 1))].filter((x) => x !== p), p, 3),
        `P = (${rot}/${n}) · (${rot - 1}/${n - 1}) = ${frac(rot * (rot - 1), n * (n - 1))}.`);
    });
    // Baumdiagramm: mindestens eine rote (Gegenereignis)
    gens.push((r) => {
      const rot = r.int(2, 5);
      const blau = r.int(2, 5);
      const n = rot + blau;
      const keine = blau * (blau - 1);
      const p = frac(n * (n - 1) - keine, n * (n - 1));
      return mc(r, "Baumdiagramme", `${r.pick(LEADS)}Urne mit ${rot} roten und ${blau} blauen Kugeln, zweimal Ziehen ohne Zurücklegen. Wie groß ist P(mindestens eine rote)?`,
        p, pickN(r, [frac(keine, n * (n - 1)), frac(rot, n), frac(rot * (rot - 1), n * (n - 1))].filter((x) => x !== p), p, 3),
        `Gegenereignis „keine rote“: P = (${blau}/${n}) · (${blau - 1}/${n - 1}) = ${frac(keine, n * (n - 1))}; also P(mind. eine rote) = 1 − ${frac(keine, n * (n - 1))} = ${p}.`);
    });
    // Zweistufiges Ziehen MIT Zurücklegen
    gens.push((r) => {
      const rot = r.int(1, 5);
      const blau = r.int(1, 5);
      const n = rot + blau;
      const p = frac(rot * blau, n * n);
      return mc(r, "Baumdiagramme", `${r.pick(LEADS)}Urne mit ${rot} roten und ${blau} blauen Kugeln, zweimal Ziehen mit Zurücklegen. Wie groß ist P(erst rot, dann blau)?`,
        p, pickN(r, [frac(rot * blau, n * (n - 1)), frac(rot + blau, n * n), frac(rot * rot, n * n), frac(blau, n)].filter((x) => x !== p), p, 3),
        `Pfadregel: P = (${rot}/${n}) · (${blau}/${n}) = ${p}.`);
    });
  }

  return gens;
}

/* ══════════════════ 2) DEUTSCH3 Klasse 5–10 ══════════════════ */

// [Wort, Synonym] — bewusst eindeutige Paare
const SYNONYME = [
  ["rasch", "schnell"], ["betagt", "alt"], ["froh", "glücklich"], ["mutig", "tapfer"],
  ["beginnen", "anfangen"], ["beenden", "abschließen"], ["sprechen", "reden"], ["schauen", "blicken"],
  ["rufen", "schreien"], ["gehen", "laufen"], ["klug", "intelligent"], ["hübsch", "schön"],
  ["riesig", "gewaltig"], ["winzig", "sehr klein"], ["müde", "erschöpft"], ["ängstlich", "furchtsam"],
  ["sparsam", "geizig"], ["freundlich", "nett"], ["zornig", "wütend"], ["traurig", "betrübt"],
  ["prüfen", "kontrollieren"], ["erlauben", "gestatten"], ["verbieten", "untersagen"], ["helfen", "unterstützen"],
  ["kaufen", "erwerben"], ["senden", "schicken"], ["bekommen", "erhalten"], ["antworten", "erwidern"],
  ["fragen", "sich erkundigen"], ["denken", "überlegen"], ["berühmt", "bekannt"], ["seltsam", "merkwürdig"],
  ["gewiss", "sicher"], ["vielleicht", "möglicherweise"], ["sofort", "unverzüglich"], ["oft", "häufig"],
  ["selten", "rar"], ["gefährlich", "riskant"], ["einfach", "leicht"], ["schwierig", "kompliziert"],
  ["sauber", "rein"], ["schmutzig", "dreckig"], ["leise", "kaum hörbar"], ["laut", "geräuschvoll"],
  ["nass", "feucht"], ["kalt", "frostig"], ["heiß", "glühend"], ["dunkel", "finster"],
  ["hell", "licht"], ["reich", "wohlhabend"], ["arm", "mittellos"], ["stark", "kräftig"],
  ["schwach", "kraftlos"], ["dick", "beleibt"], ["dünn", "schmal"], ["hungrig", "ausgehungert"],
  ["essen", "speisen"], ["trinken", "sich erfrischen"], ["schlafen", "ruhen"], ["arbeiten", "schaffen"],
  ["spielen", "sich vergnügen"], ["lachen", "kichern"], ["weinen", "schluchzen"], ["bummeln", "schlendern"],
  ["rennen", "sprinten"], ["springen", "hüpfen"], ["werfen", "schleudern"], ["fangen", "ergreifen"],
  ["suchen", "fahnden"], ["finden", "entdecken"], ["verlieren", "einbüßen"], ["gewinnen", "siegen"],
  ["zeigen", "vorführen"], ["verstecken", "verbergen"], ["öffnen", "aufmachen"], ["schließen", "zumachen"],
  ["bauen", "errichten"], ["zerstören", "vernichten"], ["reparieren", "instand setzen"], ["ändern", "verändern"],
  ["wählen", "aussuchen"], ["brauchen", "benötigen"], ["wollen", "wünschen"], ["dürfen", "die Erlaubnis haben"],
  ["müssen", "verpflichtet sein"], ["können", "imstande sein"], ["wissen", "Kenntnis haben"], ["glauben", "vermuten"],
  ["hoffen", "erwarten"], ["fürchten", "sich ängstigen"], ["lieben", "mögen"], ["hassen", "verabscheuen"],
  ["loben", "würdigen"], ["tadeln", "kritisieren"], ["ehrlich", "aufrichtig"], ["falsch", "unwahr"],
  ["treu", "loyal"], ["höflich", "zuvorkommend"], ["frech", "unverschämt"], ["ruhig", "gelassen"],
  ["nervös", "unruhig"], ["stolz", "selbstbewusst"], ["bescheiden", "zurückhaltend"], ["neugierig", "wissbegierig"],
  ["fleißig", "eifrig"], ["faul", "träge"], ["ordentlich", "sorgfältig"], ["chaotisch", "unordentlich"],
  ["pünktlich", "rechtzeitig"], ["verspätet", "zu spät"], ["gesund", "wohlauf"], ["krank", "leidend"],
  ["Beginn", "Anfang"], ["Ende", "Schluss"], ["Weg", "Pfad"], ["Haus", "Gebäude"],
  ["Auto", "Wagen"], ["Arzt", "Mediziner"], ["Lehrer", "Pädagoge"], ["Kind", "Sprössling"],
  ["Angst", "Furcht"], ["Freude", "Vergnügen"], ["Aufgabe", "Auftrag"], ["Fehler", "Irrtum"],
];

// [Wort, Antonym]
const ANTONYME = [
  ["groß", "klein"], ["hell", "dunkel"], ["laut", "leise"], ["schnell", "langsam"],
  ["alt", "jung"], ["neu", "alt"], ["warm", "kalt"], ["nass", "trocken"],
  ["voll", "leer"], ["schwer", "leicht"], ["hart", "weich"], ["breit", "schmal"],
  ["hoch", "tief"], ["lang", "kurz"], ["dick", "dünn"], ["stark", "schwach"],
  ["reich", "arm"], ["fleißig", "faul"], ["mutig", "feige"], ["freundlich", "unfreundlich"],
  ["ehrlich", "verlogen"], ["höflich", "unhöflich"], ["ordentlich", "unordentlich"], ["ruhig", "unruhig"],
  ["gesund", "krank"], ["glücklich", "unglücklich"], ["sauber", "schmutzig"], ["scharf", "stumpf"],
  ["süß", "sauer"], ["früh", "spät"], ["oben", "unten"], ["vorne", "hinten"],
  ["innen", "außen"], ["links", "rechts"], ["nah", "fern"], ["immer", "nie"],
  ["viel", "wenig"], ["alles", "nichts"], ["gemeinsam", "allein"], ["Anfang", "Ende"],
  ["Tag", "Nacht"], ["Sommer", "Winter"], ["Liebe", "Hass"], ["Freund", "Feind"],
  ["Sieg", "Niederlage"], ["Frage", "Antwort"], ["Lob", "Tadel"], ["Wahrheit", "Lüge"],
  ["Mut", "Angst"], ["Freude", "Trauer"], ["Erfolg", "Misserfolg"], ["Ordnung", "Chaos"],
  ["kaufen", "verkaufen"], ["geben", "nehmen"], ["kommen", "gehen"], ["öffnen", "schließen"],
  ["beginnen", "beenden"], ["erlauben", "verbieten"], ["finden", "verlieren"], ["lachen", "weinen"],
  ["lieben", "hassen"], ["loben", "tadeln"], ["fragen", "antworten"], ["steigen", "sinken"],
  ["bauen", "abreißen"], ["gewinnen", "verlieren"], ["erinnern", "vergessen"], ["anziehen", "ausziehen"],
  ["einschalten", "ausschalten"], ["zunehmen", "abnehmen"], ["ankommen", "abfahren"], ["aufwachen", "einschlafen"],
  ["beschleunigen", "bremsen"], ["füllen", "leeren"], ["heben", "senken"], ["binden", "lösen"],
  ["schweigen", "sprechen"], ["arbeiten", "faulenzen"], ["sparen", "verschwenden"], ["erlauben", "untersagen"],
  ["billig", "teuer"], ["einfach", "schwierig"], ["möglich", "unmöglich"], ["sichtbar", "unsichtbar"],
  ["bekannt", "unbekannt"], ["wichtig", "unwichtig"], ["freiwillig", "gezwungen"], ["natürlich", "künstlich"],
  ["flüssig", "fest"], ["wach", "müde"], ["satt", "hungrig"], ["stolz", "bescheiden"],
  ["aktiv", "passiv"], ["positiv", "negativ"], ["maximal", "minimal"], ["Import", "Export"],
  ["Optimist", "Pessimist"], ["Mehrheit", "Minderheit"], ["Vergangenheit", "Zukunft"], ["Ebbe", "Flut"],
];

// [Fremdwort, Bedeutung]
const FREMDWOERTER = [
  ["Dialog", "Zwiegespräch"], ["Monolog", "Selbstgespräch"], ["anonym", "ohne Namensnennung"],
  ["Chaos", "völlige Unordnung"], ["Diskussion", "Streitgespräch, Erörterung"], ["Information", "Auskunft, Mitteilung"],
  ["Interview", "gezielte Befragung"], ["Katastrophe", "schweres Unglück"], ["kompliziert", "schwierig, verwickelt"],
  ["Konflikt", "Streit, Auseinandersetzung"], ["kreativ", "schöpferisch"], ["Kritik", "prüfende Beurteilung"],
  ["Legende", "sagenhafte Erzählung"], ["Metapher", "bildhafter Ausdruck"], ["Motiv", "Beweggrund"],
  ["negativ", "verneinend, ungünstig"], ["neutral", "unparteiisch"], ["Original", "Urfassung, echtes Stück"],
  ["Phase", "Abschnitt, Stufe"], ["positiv", "bejahend, günstig"], ["Prinzip", "Grundsatz"],
  ["Problem", "schwierige Aufgabe"], ["Produkt", "Erzeugnis"], ["Provokation", "Herausforderung"],
  ["Publikum", "Zuschauerschaft"], ["Region", "Gebiet, Gegend"], ["Reserve", "Vorrat, Rücklage"],
  ["Resultat", "Ergebnis"], ["Risiko", "Wagnis, Gefahr"], ["Routine", "eingespielte Übung"],
  ["Saison", "Hauptzeit, Jahreszeit"], ["skeptisch", "misstrauisch, zweifelnd"], ["spontan", "aus plötzlichem Antrieb"],
  ["Struktur", "Aufbau, Gliederung"], ["Symbol", "Sinnbild"], ["sympathisch", "angenehm wirkend"],
  ["Talent", "Begabung"], ["Team", "Arbeitsgruppe, Mannschaft"], ["Tempo", "Geschwindigkeit"],
  ["Theorie", "wissenschaftliche Erklärung"], ["tolerant", "duldsam, nachsichtig"], ["Tradition", "Überlieferung, Brauch"],
  ["Transport", "Beförderung"], ["Trend", "Entwicklungsrichtung"], ["typisch", "kennzeichnend"],
  ["Utopie", "unerfüllbarer Wunschtraum"], ["Variante", "Abwandlung"], ["Version", "Fassung, Ausführung"],
  ["visuell", "das Sehen betreffend"], ["Zitat", "wörtlich übernommene Textstelle"], ["absurd", "widersinnig"],
  ["Aggression", "Angriffsverhalten"], ["akut", "dringend, plötzlich auftretend"], ["Ambition", "Ehrgeiz, Streben"],
  ["analysieren", "genau untersuchen, zergliedern"], ["Argument", "Begründung"], ["Autorität", "anerkanntes Ansehen"],
  ["Basis", "Grundlage"], ["brutal", "roh, gewalttätig"], ["Debatte", "Streitgespräch"],
  ["definieren", "genau bestimmen"], ["demonstrieren", "öffentlich zeigen, protestieren"], ["diskret", "vertraulich, taktvoll"],
  ["Distanz", "Abstand, Entfernung"], ["Dokument", "Urkunde, Schriftstück"], ["dominieren", "vorherrschen"],
  ["effektiv", "wirksam"], ["egoistisch", "selbstsüchtig"], ["elegant", "geschmackvoll, gewandt"],
  ["Emotion", "Gefühlsregung"], ["Energie", "Tatkraft, Arbeitsvermögen"], ["enorm", "außerordentlich groß"],
  ["Epoche", "Zeitabschnitt"], ["exakt", "genau"], ["Experiment", "wissenschaftlicher Versuch"],
  ["extrem", "äußerst, übertrieben"], ["fair", "gerecht, anständig"], ["Fantasie", "Vorstellungskraft"],
  ["Fazit", "Schlussfolgerung, Ergebnis"], ["flexibel", "anpassungsfähig, biegsam"], ["Funktion", "Aufgabe, Zweck"],
  ["Generation", "Altersstufe, Menschenalter"], ["genial", "überragend begabt"], ["Hypothese", "unbewiesene Annahme"],
  ["Ideal", "Vorbild, Wunschbild"], ["identisch", "völlig gleich"], ["Illusion", "Wunschvorstellung, Trugbild"],
  ["improvisieren", "ohne Vorbereitung ausführen"], ["individuell", "persönlich, einzeln"], ["Initiative", "erster Anstoß, Unternehmungsgeist"],
  ["intensiv", "gründlich, stark"], ["ironisch", "spöttisch, das Gegenteil meinend"], ["Kompromiss", "gütlicher Ausgleich"],
  ["konkret", "anschaulich, gegenständlich"], ["konsequent", "folgerichtig, beharrlich"], ["Konzept", "Entwurf, Plan"],
];

// [Anfang, richtige Fortsetzung, 3 falsche Fortsetzungen]
const SPRICHWOERTER = [
  ["Wer anderen eine Grube gräbt, …", "fällt selbst hinein", ["hat bald viel Sand", "braucht eine Schaufel", "findet einen Schatz"]],
  ["Morgenstund hat …", "Gold im Mund", ["viel Verdruss", "keine Eile", "Brot im Ofen"]],
  ["Wer zuletzt lacht, …", "lacht am besten", ["hat nichts verstanden", "geht nach Hause", "weint zuerst"]],
  ["Lügen haben …", "kurze Beine", ["lange Arme", "große Ohren", "schnelle Füße"]],
  ["Übung macht …", "den Meister", ["den Anfang", "müde Beine", "das Talent"]],
  ["Was du heute kannst besorgen, …", "das verschiebe nicht auf morgen", ["das erledige übermorgen", "das lass lieber liegen", "das kauf dir lieber morgen"]],
  ["Der Apfel fällt …", "nicht weit vom Stamm", ["immer auf den Kopf", "gern in den Korb", "weit über den Zaun"]],
  ["Wer rastet, …", "der rostet", ["der ruht gut", "der gewinnt", "der verliert nichts"]],
  ["Aller Anfang ist …", "schwer", ["leicht", "umsonst", "verboten"]],
  ["Reden ist Silber, …", "Schweigen ist Gold", ["Schreiben ist Gold", "Hören ist Eisen", "Schweigen ist Blei"]],
  ["Es ist noch kein Meister …", "vom Himmel gefallen", ["über Nacht gekommen", "aus dem Ei geschlüpft", "durch die Tür gegangen"]],
  ["Wie man in den Wald hineinruft, …", "so schallt es heraus", ["so bleibt es still", "so wächst er weiter", "so kommt man hinein"]],
  ["Hochmut kommt …", "vor dem Fall", ["nach dem Sieg", "vor der Ehre", "selten allein"]],
  ["Ein Unglück kommt …", "selten allein", ["immer zu spät", "meist am Morgen", "nie zurück"]],
  ["Wer nicht wagt, …", "der nicht gewinnt", ["der bleibt gesund", "der spart Geld", "der schläft gut"]],
  ["Ohne Fleiß …", "kein Preis", ["kein Schweiß", "keine Reise", "kein Verlust"]],
  ["Kleider machen …", "Leute", ["Falten", "Freude", "Arbeit"]],
  ["Stille Wasser …", "sind tief", ["sind klar", "fließen schnell", "trocknen aus"]],
  ["Der frühe Vogel …", "fängt den Wurm", ["singt am schönsten", "fliegt am weitesten", "schläft am längsten"]],
  ["Viele Köche …", "verderben den Brei", ["kochen besser", "würzen kräftig", "sparen Zeit"]],
  ["Was Hänschen nicht lernt, …", "lernt Hans nimmermehr", ["lernt Hans doppelt", "vergisst Hans nie", "lernt Hans morgen"]],
  ["Ende gut, …", "alles gut", ["nichts gut", "Anfang gut", "halb so gut"]],
  ["Eine Schwalbe macht …", "noch keinen Sommer", ["noch keinen Winter", "das Nest allein", "den Himmel blau"]],
  ["Wer im Glashaus sitzt, …", "sollte nicht mit Steinen werfen", ["sieht alles besser", "hat es immer warm", "sollte lüften"]],
  ["Auch ein blindes Huhn …", "findet mal ein Korn", ["legt goldene Eier", "kräht am Morgen", "findet den Stall"]],
  ["Wer den Pfennig nicht ehrt, …", "ist des Talers nicht wert", ["bekommt kein Gold", "spart am falschen Ende", "zahlt am Ende mehr"]],
  ["Man soll den Tag nicht …", "vor dem Abend loben", ["mit Arbeit füllen", "zu früh beginnen", "nach der Nacht messen"]],
  ["Gelegenheit macht …", "Diebe", ["Freunde", "Mut", "Arbeit"]],
  ["Einem geschenkten Gaul …", "schaut man nicht ins Maul", ["gibt man kein Futter", "traut man nicht", "putzt man die Hufe"]],
  ["Wo ein Wille ist, …", "ist auch ein Weg", ["ist auch ein Ziel", "fehlt oft die Kraft", "ist auch ein Zaun"]],
  ["Hunde, die bellen, …", "beißen nicht", ["schlafen nicht", "jagen gern", "hören schlecht"]],
  ["Wer schön sein will, …", "muss leiden", ["muss lachen", "braucht Geld", "muss schlafen"]],
  ["Scherben bringen …", "Glück", ["Ärger", "Arbeit", "Besuch"]],
  ["Was sich liebt, …", "das neckt sich", ["das trennt sich", "das schweigt", "das streitet nie"]],
  ["Der Klügere …", "gibt nach", ["gewinnt immer", "spricht zuerst", "bleibt stur"]],
  ["Jeder ist seines Glückes …", "Schmied", ["Gärtner", "Meister", "Bäcker"]],
  ["In der Not frisst der Teufel …", "Fliegen", ["Steine", "Brot", "Suppe"]],
  ["Man muss das Eisen schmieden, …", "solange es heiß ist", ["bevor es rostet", "wenn es kalt ist", "solange es glänzt"]],
  ["Wer A sagt, …", "muss auch B sagen", ["darf schweigen", "hat Recht", "kennt das Alphabet"]],
  ["Erst die Arbeit, …", "dann das Vergnügen", ["dann die Pause", "dann der Ärger", "dann das Essen"]],
  ["Unter Blinden ist der Einäugige …", "König", ["Bettler", "Wächter", "Gast"]],
  ["Vorfreude ist …", "die schönste Freude", ["oft vergebens", "die halbe Miete", "schnell vorbei"]],
  ["Kommt Zeit, …", "kommt Rat", ["kommt Geld", "kommt Glück", "kommt Arbeit"]],
  ["Aus den Augen, …", "aus dem Sinn", ["aus dem Haus", "aus der Zeit", "in den Sinn"]],
  ["Neue Besen …", "kehren gut", ["stauben mehr", "kosten viel", "halten kurz"]],
  ["Wes Brot ich ess, …", "des Lied ich sing", ["des Haus ich bau", "dem dank ich nie", "des Wein ich trink"]],
  ["Not macht …", "erfinderisch", ["müde", "einsam", "sparsam"]],
  ["Pech im Spiel, …", "Glück in der Liebe", ["Pech im Leben", "Glück im Beruf", "Pech in der Liebe"]],
  ["Wie der Vater, …", "so der Sohn", ["so die Arbeit", "so das Haus", "so der Nachbar"]],
  ["Zeit ist …", "Geld", ["Arbeit", "Glück", "Schlaf"]],
  ["Wer zu spät kommt, …", "den bestraft das Leben", ["der schläft besser", "der spart Kraft", "den lobt der Lehrer"]],
  ["Gegensätze …", "ziehen sich an", ["stoßen sich ab", "bleiben fern", "gleichen sich aus"]],
  ["Der Ton macht …", "die Musik", ["den Lärm", "das Lied", "die Stimme"]],
  ["Einigkeit macht …", "stark", ["müde", "reich", "satt"]],
  ["Auf Regen folgt …", "Sonnenschein", ["Schnee", "Nebel", "Sturm"]],
  ["Besser den Spatz in der Hand …", "als die Taube auf dem Dach", ["als den Adler im Käfig", "als zwei im Nest", "als den Raben im Baum"]],
  ["Wer Wind sät, …", "wird Sturm ernten", ["erntet Regen", "bleibt trocken", "braucht Geduld"]],
  ["Steter Tropfen …", "höhlt den Stein", ["füllt das Fass", "nässt die Erde", "wäscht den Fels"]],
  ["Das letzte Hemd …", "hat keine Taschen", ["ist immer weiß", "passt jedem", "bleibt im Schrank"]],
  ["Träume sind …", "Schäume", ["Räume", "Ziele", "Bäume"]],
];

// [richtig getrennt] — korrekte Silbentrennung nach amtlichem Regelwerk
const SILBEN = [
  ["Fenster", "Fens-ter", ["Fen-ster", "Fenst-er", "Fe-nster"]],
  ["Computer", "Com-pu-ter", ["Comp-u-ter", "Co-mpu-ter", "Com-put-er"]],
  ["wandern", "wan-dern", ["wa-ndern", "wand-ern", "wande-rn"]],
  ["Lehrerin", "Leh-re-rin", ["Lehr-er-in", "Le-hre-rin", "Lehre-rin"]],
  ["Katze", "Kat-ze", ["Ka-tze", "Katz-e", "K-atze"]],
  ["backen", "ba-cken", ["bak-ken", "bac-ken", "back-en"]],
  ["Zucker", "Zu-cker", ["Zuk-ker", "Zuc-ker", "Zuck-er"]],
  ["Straße", "Stra-ße", ["Str-aße", "Straß-e", "St-raße"]],
  ["Wasser", "Was-ser", ["Wa-sser", "Wass-er", "W-asser"]],
  ["Sommer", "Som-mer", ["So-mmer", "Somm-er", "Somme-r"]],
  ["Mutter", "Mut-ter", ["Mu-tter", "Mutt-er", "Mutte-r"]],
  ["Blume", "Blu-me", ["Bl-ume", "Blum-e", "B-lume"]],
  ["Schule", "Schu-le", ["Sch-ule", "Schul-e", "S-chule"]],
  ["spielen", "spie-len", ["spi-elen", "spiel-en", "sp-ielen"]],
  ["Garten", "Gar-ten", ["Ga-rten", "Gart-en", "Garte-n"]],
  ["Mantel", "Man-tel", ["Ma-ntel", "Mant-el", "Mante-l"]],
  ["Bruder", "Bru-der", ["Br-uder", "Brud-er", "B-ruder"]],
  ["Schwester", "Schwes-ter", ["Schwe-ster", "Schwest-er", "Sch-wester"]],
  ["Pflanze", "Pflan-ze", ["Pfla-nze", "Pflanz-e", "Pf-lanze"]],
  ["Frühling", "Früh-ling", ["Frü-hling", "Frühl-ing", "Frühli-ng"]],
  ["Vögel", "Vö-gel", ["Vög-el", "V-ögel", "Vöge-l"]],
  ["singen", "sin-gen", ["si-ngen", "sing-en", "singe-n"]],
  ["Kirsche", "Kir-sche", ["Kirs-che", "Kirsch-e", "Ki-rsche"]],
  ["Tasche", "Ta-sche", ["Tas-che", "Tasch-e", "T-asche"]],
  ["waschen", "wa-schen", ["was-chen", "wasch-en", "w-aschen"]],
  ["Deutschland", "Deutsch-land", ["Deut-schland", "Deutschl-and", "De-utschland"]],
  ["Nachmittag", "Nach-mit-tag", ["Na-chmit-tag", "Nach-mi-ttag", "Nachm-it-tag"]],
  ["Apfelbaum", "Ap-fel-baum", ["Apf-el-baum", "A-pfel-baum", "Ap-felb-aum"]],
  ["Handschuh", "Hand-schuh", ["Han-dschuh", "Hands-chuh", "Handsch-uh"]],
  ["Butterbrot", "But-ter-brot", ["Bu-tter-brot", "Butt-er-brot", "But-terb-rot"]],
  ["Regenbogen", "Re-gen-bo-gen", ["Reg-en-bo-gen", "Re-genb-o-gen", "Re-gen-bog-en"]],
  ["Fahrrad", "Fahr-rad", ["Fah-rrad", "Fahrr-ad", "Fa-hrrad"]],
  ["arbeiten", "ar-bei-ten", ["arb-ei-ten", "ar-beit-en", "a-rbei-ten"]],
  ["Ferien", "Fe-ri-en", ["Fer-i-en", "Feri-en", "F-eri-en"]],
  ["Familie", "Fa-mi-li-e", ["Fam-i-li-e", "Fa-mil-i-e", "Fa-mi-lie-"]],
  ["Banane", "Ba-na-ne", ["Ban-a-ne", "Ba-nan-e", "B-ana-ne"]],
  ["Tomate", "To-ma-te", ["Tom-a-te", "To-mat-e", "T-oma-te"]],
  ["Elefant", "E-le-fant", ["El-e-fant", "Ele-fa-nt", "E-lef-ant"]],
  ["Giraffe", "Gi-raf-fe", ["Gir-af-fe", "Gi-ra-ffe", "G-iraf-fe"]],
  ["Papagei", "Pa-pa-gei", ["Pap-a-gei", "Pa-pag-ei", "P-apa-gei"]],
  ["Schokolade", "Scho-ko-la-de", ["Schok-o-la-de", "Scho-kol-a-de", "Scho-ko-lad-e"]],
  ["Marmelade", "Mar-me-la-de", ["Marm-e-la-de", "Mar-mel-a-de", "Ma-rme-la-de"]],
  ["Bibliothek", "Bi-blio-thek", ["Bib-lio-thek", "Bi-bli-othek", "Bibl-io-thek"]],
  ["Geburtstag", "Ge-burts-tag", ["Geb-urts-tag", "Ge-burt-stag", "Ge-bur-tstag"]],
  ["Kindergarten", "Kin-der-gar-ten", ["Ki-nder-gar-ten", "Kind-er-gar-ten", "Kin-derg-ar-ten"]],
  ["Übung", "Ü-bung", ["Üb-ung", "Übu-ng", "Übun-g"]],
  ["Straßenbahn", "Stra-ßen-bahn", ["Straß-en-bahn", "Stra-ße-nbahn", "St-raßen-bahn"]],
  ["Zeitung", "Zei-tung", ["Zeit-ung", "Ze-itung", "Zeitu-ng"]],
  ["Wolke", "Wol-ke", ["Wo-lke", "Wolk-e", "W-olke"]],
  ["Winter", "Win-ter", ["Wi-nter", "Wint-er", "Winte-r"]],
];

// Groß-/Kleinschreibung: [Satz mit Lücke, richtig, falsch-Varianten, Regel]
const GROSSKLEIN = [
  ["Beim ___ macht Tim oft Fehler.", "Schreiben", ["schreiben", "SCHREIBEN", "schrei-ben"], "Substantivierte Verben (mit Artikel „beim“ = bei dem) werden großgeschrieben."],
  ["Das ___ fällt ihr leicht.", "Lesen", ["lesen", "LESEN", "le-sen"], "Nach einem Artikel („das“) wird das Verb substantiviert und großgeschrieben."],
  ["Er hat ___ gesagt.", "nichts Genaues", ["nichts genaues", "Nichts genaues", "nichts GENAUES"], "Substantivierte Adjektive nach „nichts/etwas/viel/wenig“ werden großgeschrieben."],
  ["Sie wünscht uns alles ___.", "Gute", ["gute", "GUTE", "gu-te"], "„alles Gute“: substantiviertes Adjektiv nach „alles“ wird großgeschrieben."],
  ["Wir treffen uns ___ um drei.", "morgen", ["Morgen", "MORGEN", "mor-gen"], "„morgen“ als Zeitadverb wird kleingeschrieben (aber: „der Morgen“)."],
  ["___ war ich im Kino.", "Gestern", ["gestern", "GESTERN", "ges-Tern"], "Am Satzanfang wird großgeschrieben; „gestern“ ist sonst ein kleingeschriebenes Adverb."],
  ["Am ___ schlafe ich lange.", "Sonntag", ["sonntag", "SONNTAG", "sonn-tag"], "Wochentage sind Substantive und werden großgeschrieben."],
  ["Er kommt ___ zu spät.", "sonntags", ["Sonntags", "SONNTAGS", "sonn-tags"], "Adverbien auf -s wie „sonntags, abends“ werden kleingeschrieben."],
  ["Sie hat ___ zu tun.", "viel Wichtiges", ["viel wichtiges", "Viel wichtiges", "viel WICHTIGES"], "Substantivierte Adjektive nach „viel“ werden großgeschrieben."],
  ["Das ist mein ___ Fahrrad.", "neues", ["Neues", "NEUES", "neu-es"], "Adjektive vor einem Substantiv werden kleingeschrieben."],
  ["Zum ___ braucht man Geduld.", "Angeln", ["angeln", "ANGELN", "an-geln"], "„zum Angeln“ = zu dem Angeln: substantiviertes Verb, großgeschrieben."],
  ["Ihr ___ freut mich sehr.", "Kommen", ["kommen", "KOMMEN", "kom-men"], "Nach Possessivpronomen („ihr“) wird das Verb substantiviert und großgeschrieben."],
  ["Wir gehen heute ___ .", "schwimmen", ["Schwimmen", "SCHWIMMEN", "schwim-Men"], "Nach „gehen“ steht der Infinitiv als Verb und wird kleingeschrieben."],
  ["Im ___ fahren wir ans Meer.", "Sommer", ["sommer", "SOMMER", "som-mer"], "Jahreszeiten sind Substantive und werden großgeschrieben."],
  ["___ Abend essen wir zusammen.", "Heute", ["heute", "HEUTE", "heu-Te"], "Am Satzanfang wird großgeschrieben."],
  ["Er möchte etwas ___ trinken.", "Kaltes", ["kaltes", "KALTES", "kal-tes"], "Substantivierte Adjektive nach „etwas“ werden großgeschrieben."],
  ["Sie kann gut ___ .", "rechnen", ["Rechnen", "RECHNEN", "rech-Nen"], "Nach „können“ steht der Infinitiv als Verb und wird kleingeschrieben."],
  ["Das ___ der Vögel weckt mich.", "Zwitschern", ["zwitschern", "ZWITSCHERN", "zwit-schern"], "Nach dem Artikel „das“ wird das Verb substantiviert und großgeschrieben."],
  ["Mir gefällt das ___ Kleid.", "rote", ["Rote", "ROTE", "ro-Te"], "Adjektive vor einem Substantiv werden kleingeschrieben."],
  ["Beim ___ hört sie Musik.", "Joggen", ["joggen", "JOGGEN", "jog-gen"], "„beim Joggen“ = bei dem Joggen: substantiviertes Verb, großgeschrieben."],
  ["Es gibt nichts ___ zu berichten.", "Neues", ["neues", "NEUES", "neu-es"], "Substantivierte Adjektive nach „nichts“ werden großgeschrieben."],
  ["Am ___ ist die Luft frisch.", "Morgen", ["morgen", "MORGEN", "mor-Gen"], "Mit Artikel („am“ = an dem) ist „Morgen“ ein Substantiv und wird großgeschrieben."],
  ["Wir haben ___ frei.", "montags", ["Montags", "MONTAGS", "mon-Tags"], "Adverbien auf -s wie „montags“ werden kleingeschrieben."],
  ["Das ___ macht müde.", "Laufen", ["laufen", "LAUFEN", "lau-fen"], "Substantiviertes Verb nach Artikel „das“ wird großgeschrieben."],
  ["Sie erzählte etwas ___ .", "Lustiges", ["lustiges", "LUSTIGES", "lus-tiges"], "Substantivierte Adjektive nach „etwas“ werden großgeschrieben."],
  ["Ich lerne gerade ___ .", "Englisch", ["englisch", "ENGLISCH", "eng-lisch"], "Sprachbezeichnungen als Substantiv (das Fach) werden großgeschrieben."],
  ["Der Brief ist auf ___ verfasst.", "Deutsch", ["deutsch", "DEUTSCH", "deu-tsch"], "Nach „auf“ ist die Sprachbezeichnung substantiviert: auf Deutsch."],
  ["Zum ___ nehme ich ein Brot mit.", "Frühstück", ["frühstück", "FRÜHSTÜCK", "früh-stück"], "„Frühstück“ ist ein Substantiv und wird großgeschrieben."],
  ["Er bleibt ___ ruhig.", "immer", ["Immer", "IMMER", "im-Mer"], "„immer“ ist ein Adverb und wird kleingeschrieben."],
  ["Wir sind ___ ins Kino gegangen.", "abends", ["Abends", "ABENDS", "a-Bends"], "Adverbien auf -s wie „abends“ werden kleingeschrieben."],
];

function deutsch3Generators(klasse) {
  const gens = [];
  const synPool = SYNONYME;
  const antPool = ANTONYME;

  // Synonyme
  gens.push((r) => {
    const [wort, syn] = r.pick(synPool);
    const dist = pickN(r, synPool.map((p) => p[1]).filter((s) => s !== syn), syn, 3);
    return mc(r, "Synonyme", `${r.pick(LEADS)}Welches Wort bedeutet (fast) dasselbe wie „${wort}“?`,
      syn, dist, `„${syn}“ ist ein Synonym zu „${wort}“.`);
  });
  // Antonyme
  gens.push((r) => {
    const [wort, ant] = r.pick(antPool);
    const dist = pickN(r, antPool.map((p) => p[1]).filter((s) => s !== ant), ant, 3);
    return mc(r, "Antonyme", `${r.pick(LEADS)}Welches Wort ist das Gegenteil von „${wort}“?`,
      ant, dist, `Das Gegenteil (Antonym) von „${wort}“ ist „${ant}“.`);
  });
  // Fremdwörter
  gens.push((r) => {
    const [wort, bed] = r.pick(FREMDWOERTER);
    const dist = pickN(r, FREMDWOERTER.map((p) => p[1]).filter((s) => s !== bed), bed, 3);
    return mc(r, "Fremdwörter", `${r.pick(LEADS)}Was bedeutet das Fremdwort „${wort}“?`,
      bed, dist, `„${wort}“ bedeutet: ${bed}.`);
  });
  // Sprichwörter
  gens.push((r) => {
    const [anfang, richtig, falsch] = r.pick(SPRICHWOERTER);
    return mc(r, "Sprichwörter", `${r.pick(LEADS)}Vervollständige das Sprichwort: „${anfang}“`,
      richtig, r.shuffle(falsch), `Das Sprichwort lautet: „${anfang.replace(" …", "")} ${richtig}.“`);
  });
  // Silbentrennung
  gens.push((r) => {
    const [wort, richtig, falsch] = r.pick(SILBEN);
    return mc(r, "Silbentrennung", `${r.pick(LEADS)}Wie wird „${wort}“ richtig in Silben getrennt?`,
      richtig, r.shuffle(falsch), `Richtig getrennt: ${richtig}.`);
  });
  // Groß-/Kleinschreibung
  gens.push((r) => {
    const [satz, richtig, falsch, regel] = r.pick(GROSSKLEIN);
    return mc(r, "Groß- und Kleinschreibung", `${r.pick(LEADS)}Welche Schreibweise ist richtig? ${satz}`,
      richtig, r.shuffle(falsch), regel);
  });

  // Ab Klasse 8: Umkehrrichtung Synonyme (Definition → Fremdwort) für mehr Vielfalt
  if (klasse >= 8) {
    gens.push((r) => {
      const [wort, bed] = r.pick(FREMDWOERTER);
      const dist = pickN(r, FREMDWOERTER.map((p) => p[0]).filter((s) => s !== wort), wort, 3);
      return mc(r, "Fremdwörter", `${r.pick(LEADS)}Welches Fremdwort passt zur Bedeutung „${bed}“?`,
        wort, dist, `„${wort}“ bedeutet: ${bed}.`);
    });
  }

  return gens;
}

/* ══════════════════ 3) ENGLISCH4 Klasse 5–13 ══════════════════ */

// [phrasal verb, deutsche Bedeutung, ab Klasse]
const PHRASAL_VERBS = [
  ["get up", "aufstehen", 5], ["wake up", "aufwachen", 5], ["sit down", "sich hinsetzen", 5],
  ["stand up", "aufstehen (vom Stuhl)", 5], ["come in", "hereinkommen", 5], ["go out", "ausgehen", 5],
  ["put on", "anziehen (Kleidung)", 5], ["take off", "ausziehen; abheben (Flugzeug)", 5],
  ["turn on", "einschalten", 5], ["turn off", "ausschalten", 5], ["look for", "suchen", 5],
  ["look after", "sich kümmern um", 6], ["look forward to", "sich freuen auf", 6],
  ["give up", "aufgeben", 6], ["give back", "zurückgeben", 6], ["find out", "herausfinden", 6],
  ["write down", "aufschreiben", 6], ["hand in", "abgeben (z. B. Hausaufgaben)", 6],
  ["pick up", "abholen; aufheben", 6], ["throw away", "wegwerfen", 6], ["clean up", "aufräumen", 6],
  ["hurry up", "sich beeilen", 6], ["come back", "zurückkommen", 5], ["run away", "weglaufen", 5],
  ["get on", "einsteigen (Bus/Zug)", 7], ["get off", "aussteigen (Bus/Zug)", 7],
  ["get along with", "gut auskommen mit", 7], ["grow up", "aufwachsen", 7],
  ["set up", "gründen; aufbauen", 8], ["take part in", "teilnehmen an", 7],
  ["carry on", "weitermachen", 8], ["work out", "trainieren; lösen", 8],
  ["break down", "eine Panne haben; zusammenbrechen", 8], ["call off", "absagen", 8],
  ["put off", "verschieben", 8], ["turn down", "ablehnen; leiser stellen", 9],
  ["turn up", "auftauchen; lauter stellen", 9], ["show up", "erscheinen, auftauchen", 9],
  ["run out of", "etwas geht einem aus", 9], ["look up", "nachschlagen (im Wörterbuch)", 7],
  ["look into", "untersuchen, prüfen", 10], ["bring up", "erziehen; ein Thema ansprechen", 10],
  ["come across", "zufällig stoßen auf", 10], ["come up with", "sich ausdenken, einfallen lassen", 10],
  ["figure out", "herausfinden, verstehen", 9], ["fill in", "ausfüllen", 8],
  ["get over", "hinwegkommen über", 10], ["put up with", "sich abfinden mit, ertragen", 10],
  ["take after", "jemandem ähneln (z. B. den Eltern)", 10], ["make up", "erfinden; sich versöhnen", 9],
  ["point out", "hinweisen auf", 10], ["sort out", "klären, in Ordnung bringen", 10],
  ["deal with", "sich befassen mit, umgehen mit", 10], ["rely on", "sich verlassen auf", 10],
  ["carry out", "durchführen", 11], ["account for", "erklären; ausmachen (Anteil)", 11],
  ["rule out", "ausschließen", 11], ["bring about", "herbeiführen, bewirken", 11],
  ["draw up", "aufsetzen, entwerfen (Dokument)", 12], ["set out", "darlegen; aufbrechen", 12],
];

// Präpositionen-Lücken: [Satz, richtig, [falsch], ab Klasse]
const PREPOSITIONS = [
  ["School starts ___ eight o'clock.", "at", ["on", "in", "by"], 5],
  ["My birthday is ___ May.", "in", ["at", "on", "by"], 5],
  ["We play football ___ Saturdays.", "on", ["in", "at", "by"], 5],
  ["The cat is sleeping ___ the sofa.", "on", ["at", "of", "by"], 5],
  ["The book is ___ the bag.", "in", ["on", "at", "by"], 5],
  ["He is waiting ___ the bus stop.", "at", ["on", "in", "under"], 5],
  ["We go to school ___ bus.", "by", ["with", "on", "in"], 5],
  ["She lives ___ London.", "in", ["at", "on", "by"], 5],
  ["The picture hangs ___ the wall.", "on", ["in", "at", "over"], 5],
  ["I get up ___ seven o'clock every day.", "at", ["on", "in", "for"], 5],
  ["We have been friends ___ 2019.", "since", ["for", "from", "at"], 6],
  ["I have lived here ___ five years.", "for", ["since", "from", "at"], 6],
  ["He is afraid ___ spiders.", "of", ["from", "about", "for"], 6],
  ["She is good ___ maths.", "at", ["in", "on", "for"], 6],
  ["Thank you ___ your help.", "for", ["of", "about", "at"], 6],
  ["He is interested ___ history.", "in", ["at", "on", "for"], 7],
  ["We are proud ___ our team.", "of", ["on", "about", "for"], 7],
  ["It depends ___ the weather.", "on", ["of", "from", "at"], 7],
  ["She is married ___ a doctor.", "to", ["with", "at", "by"], 7],
  ["I am looking forward ___ the holidays.", "to", ["for", "at", "on"], 7],
  ["He apologized ___ being late.", "for", ["of", "about", "to"], 8],
  ["This book was written ___ a famous author.", "by", ["from", "of", "with"], 8],
  ["She is responsible ___ the project.", "for", ["of", "about", "with"], 8],
  ["The movie is based ___ a true story.", "on", ["in", "at", "of"], 8],
  ["He succeeded ___ passing the exam.", "in", ["at", "on", "with"], 9],
  ["They accused him ___ stealing.", "of", ["for", "about", "with"], 9],
  ["She insisted ___ paying the bill.", "on", ["in", "at", "for"], 9],
  ["I am fed up ___ this noise.", "with", ["of", "about", "at"], 9],
  ["He was arrested ___ dangerous driving.", "for", ["of", "by", "about"], 10],
  ["The results are consistent ___ our hypothesis.", "with", ["to", "of", "at"], 11],
  ["This law applies ___ all citizens.", "to", ["for", "on", "at"], 11],
  ["The company benefits ___ low taxes.", "from", ["of", "by", "with"], 11],
  ["Access ___ clean water is a human right.", "to", ["for", "of", "at"], 11],
  ["There has been an increase ___ unemployment.", "in", ["of", "at", "on"], 11],
  ["The professor commented ___ the essay.", "on", ["about", "at", "to"], 12],
];

// Wortfamilien: [verb, noun, adjective, ab Klasse]
const WORD_FAMILIES = [
  ["decide", "decision", "decisive", 7],
  ["succeed", "success", "successful", 7],
  ["differ", "difference", "different", 7],
  ["create", "creation", "creative", 7],
  ["inform", "information", "informative", 7],
  ["act", "action", "active", 6],
  ["care", "care", "careful", 6],
  ["help", "help", "helpful", 5],
  ["use", "use", "useful", 5],
  ["beautify", "beauty", "beautiful", 6],
  ["strengthen", "strength", "strong", 8],
  ["deepen", "depth", "deep", 8],
  ["widen", "width", "wide", 8],
  ["explain", "explanation", "explanatory", 9],
  ["describe", "description", "descriptive", 8],
  ["compare", "comparison", "comparable", 9],
  ["compete", "competition", "competitive", 8],
  ["produce", "production", "productive", 8],
  ["attract", "attraction", "attractive", 8],
  ["protect", "protection", "protective", 7],
  ["pollute", "pollution", "polluted", 7],
  ["employ", "employment", "employed", 9],
  ["develop", "development", "developed", 8],
  ["improve", "improvement", "improved", 8],
  ["argue", "argument", "argumentative", 9],
  ["persuade", "persuasion", "persuasive", 10],
  ["conclude", "conclusion", "conclusive", 10],
  ["analyze", "analysis", "analytical", 10],
  ["economize", "economy", "economic", 10],
  ["vary", "variety", "various", 9],
  ["imagine", "imagination", "imaginative", 8],
  ["educate", "education", "educational", 8],
  ["celebrate", "celebration", "celebratory", 7],
  ["invite", "invitation", "inviting", 6],
  ["organize", "organization", "organized", 7],
];

// Collocations (ab 11): [Frage-Lücke, richtig, [falsch], Erklärung]
const COLLOCATIONS = [
  ["___ a decision", "make", ["do", "take on", "put"], "Im Englischen heißt es „make a decision“ (eine Entscheidung treffen)."],
  ["___ your homework", "do", ["make", "take", "give"], "Es heißt „do your homework“ — „make“ wäre hier falsch."],
  ["___ a mistake", "make", ["do", "hold", "put"], "Es heißt „make a mistake“ (einen Fehler machen)."],
  ["___ attention", "pay", ["give away", "make", "do"], "„pay attention“ = aufpassen, aufmerksam sein."],
  ["___ a photo", "take", ["make", "do", "shoot up"], "Im Englischen „take a photo“, nicht „make a photo“."],
  ["___ a risk", "take", ["make", "do", "run over"], "„take a risk“ = ein Risiko eingehen."],
  ["___ research", "conduct", ["make", "drive", "put"], "Akademisch: „conduct research“ (Forschung betreiben)."],
  ["___ a conclusion", "draw", ["make up", "pull", "do"], "„draw a conclusion“ = eine Schlussfolgerung ziehen."],
  ["___ an exam", "sit", ["write down", "stand", "put"], "Britisches Englisch: „sit an exam“ (eine Prüfung ablegen)."],
  ["___ progress", "make", ["do", "take", "give"], "„make progress“ = Fortschritte machen."],
  ["heavy ___", "rain", ["sunshine", "warmth", "brightness"], "„heavy rain“ = starker Regen (nicht „strong rain“)."],
  ["a ___ smoker", "heavy", ["strong", "big", "hard"], "„a heavy smoker“ = ein starker Raucher."],
  ["fast ___", "food", ["meal", "kitchen", "dinner"], "„fast food“ ist die feste Verbindung."],
  ["___ a promise", "keep", ["hold", "save", "stay"], "„keep a promise“ = ein Versprechen halten."],
  ["___ the truth", "tell", ["say", "speak out loud", "talk"], "„tell the truth“ = die Wahrheit sagen."],
  ["___ a speech", "give", ["make out", "say", "talk"], "„give a speech“ = eine Rede halten."],
  ["___ evidence", "provide", ["make", "do", "put on"], "Akademisch: „provide evidence“ (Belege liefern)."],
  ["___ a goal", "achieve", ["make out", "win over", "do"], "„achieve a goal“ = ein Ziel erreichen."],
  ["___ into account", "take", ["put", "get", "make"], "„take into account“ = berücksichtigen."],
  ["___ a role", "play", ["make", "hold on", "do"], "„play a role“ = eine Rolle spielen."],
];

// Unregelmäßige Verben: [infinitive, simple past, past participle]
const IRREGULAR_VERBS = [
  ["be", "was/were", "been"], ["begin", "began", "begun"], ["break", "broke", "broken"],
  ["bring", "brought", "brought"], ["build", "built", "built"], ["buy", "bought", "bought"],
  ["catch", "caught", "caught"], ["choose", "chose", "chosen"], ["come", "came", "come"],
  ["do", "did", "done"], ["draw", "drew", "drawn"], ["drink", "drank", "drunk"],
  ["drive", "drove", "driven"], ["eat", "ate", "eaten"], ["fall", "fell", "fallen"],
  ["feel", "felt", "felt"], ["find", "found", "found"], ["fly", "flew", "flown"],
  ["forget", "forgot", "forgotten"], ["get", "got", "got"], ["give", "gave", "given"],
  ["go", "went", "gone"], ["grow", "grew", "grown"], ["have", "had", "had"],
  ["hear", "heard", "heard"], ["hide", "hid", "hidden"], ["hold", "held", "held"],
  ["keep", "kept", "kept"], ["know", "knew", "known"], ["leave", "left", "left"],
  ["lose", "lost", "lost"], ["make", "made", "made"], ["meet", "met", "met"],
  ["pay", "paid", "paid"], ["read", "read", "read"], ["ride", "rode", "ridden"],
  ["ring", "rang", "rung"], ["run", "ran", "run"], ["say", "said", "said"],
  ["see", "saw", "seen"], ["sell", "sold", "sold"], ["send", "sent", "sent"],
  ["sing", "sang", "sung"], ["sit", "sat", "sat"], ["sleep", "slept", "slept"],
  ["speak", "spoke", "spoken"], ["spend", "spent", "spent"], ["stand", "stood", "stood"],
  ["steal", "stole", "stolen"], ["swim", "swam", "swum"], ["take", "took", "taken"],
  ["teach", "taught", "taught"], ["tell", "told", "told"], ["think", "thought", "thought"],
  ["throw", "threw", "thrown"], ["understand", "understood", "understood"], ["wear", "wore", "worn"],
  ["win", "won", "won"], ["write", "wrote", "written"],
];

// Englische Gegensatzpaare: [Wort, Gegenteil]
const EN_OPPOSITES = [
  ["big", "small"], ["fast", "slow"], ["hot", "cold"], ["old", "young"],
  ["new", "old"], ["light", "dark"], ["loud", "quiet"], ["happy", "sad"],
  ["rich", "poor"], ["strong", "weak"], ["long", "short"], ["high", "low"],
  ["full", "empty"], ["heavy", "light"], ["hard", "soft"], ["clean", "dirty"],
  ["wet", "dry"], ["early", "late"], ["easy", "difficult"], ["cheap", "expensive"],
  ["open", "closed"], ["right", "wrong"], ["safe", "dangerous"], ["thick", "thin"],
  ["wide", "narrow"], ["deep", "shallow"], ["far", "near"], ["first", "last"],
  ["always", "never"], ["begin", "end"], ["buy", "sell"], ["remember", "forget"],
  ["win", "lose"], ["love", "hate"], ["laugh", "cry"], ["push", "pull"],
  ["arrive", "leave"], ["ask", "answer"], ["give", "take"], ["friend", "enemy"],
  ["day", "night"], ["summer", "winter"], ["north", "south"], ["inside", "outside"],
  ["up", "down"], ["before", "after"], ["polite", "rude"], ["brave", "cowardly"],
  ["healthy", "ill"], ["hungry", "full up"],
];

// Academic vocabulary (ab 11): [Wort, Bedeutung (deutsch)]
const ACADEMIC_VOCAB = [
  ["assess", "beurteilen, bewerten"], ["assume", "annehmen, voraussetzen"], ["cite", "zitieren, anführen"],
  ["coherent", "schlüssig, zusammenhängend"], ["comprise", "umfassen, bestehen aus"], ["constitute", "darstellen, bilden"],
  ["contradict", "widersprechen"], ["crucial", "entscheidend"], ["derive", "ableiten, herleiten"],
  ["emphasize", "betonen, hervorheben"], ["evaluate", "auswerten, bewerten"], ["evident", "offensichtlich"],
  ["feasible", "machbar, durchführbar"], ["hypothesis", "unbewiesene Annahme, Arbeitshypothese"], ["imply", "andeuten, implizieren"],
  ["inevitable", "unvermeidlich"], ["infer", "schlussfolgern"], ["justify", "rechtfertigen, begründen"],
  ["notion", "Vorstellung, Begriff"], ["objective", "sachlich, unvoreingenommen"], ["plausible", "einleuchtend, glaubhaft"],
  ["preliminary", "vorläufig, einleitend"], ["profound", "tiefgreifend"], ["refute", "widerlegen"],
  ["relevant", "bedeutsam, einschlägig"], ["scope", "Umfang, Rahmen"], ["significant", "bedeutend, erheblich"],
  ["subsequent", "nachfolgend"], ["sufficient", "ausreichend"], ["undermine", "untergraben, schwächen"],
  ["valid", "gültig, stichhaltig"], ["ambiguous", "mehrdeutig"], ["bias", "Voreingenommenheit, Verzerrung"],
  ["controversial", "umstritten"], ["deteriorate", "sich verschlechtern"], ["diminish", "verringern, abnehmen"],
  ["explicit", "ausdrücklich, deutlich"], ["implicit", "unausgesprochen, mitgemeint"], ["neglect", "vernachlässigen"],
  ["obtain", "erhalten, erlangen"], ["perceive", "wahrnehmen"], ["pursue", "verfolgen (Ziel), nachgehen"],
];

function englisch4Generators(klasse) {
  const gens = [];
  const pv = PHRASAL_VERBS.filter(([, , k]) => k <= klasse);
  const preps = PREPOSITIONS.filter(([, , , k]) => k <= klasse);
  const wf = WORD_FAMILIES.filter(([, , , k]) => k <= klasse);

  // Phrasal verb -> Bedeutung
  if (pv.length >= 8) {
    gens.push((r) => {
      const [verb, bed] = r.pick(pv);
      const dist = pickN(r, pv.map((p) => p[1]).filter((s) => s !== bed), bed, 3);
      return mc(r, "Phrasal Verbs", `${r.pick(LEADS)}Was bedeutet das phrasal verb „${verb}“?`,
        bed, dist, `„${verb}“ bedeutet: ${bed}.`);
    });
    // Bedeutung -> Phrasal verb
    gens.push((r) => {
      const [verb, bed] = r.pick(pv);
      const dist = pickN(r, pv.map((p) => p[0]).filter((s) => s !== verb), verb, 3);
      return mc(r, "Phrasal Verbs", `${r.pick(LEADS)}Welches phrasal verb bedeutet „${bed}“?`,
        verb, dist, `„${verb}“ = ${bed}.`);
    });
  }

  // Präpositionen
  if (preps.length >= 8) {
    gens.push((r) => {
      const [satz, richtig, falsch] = r.pick(preps);
      return mc(r, "Prepositions", `${r.pick(LEADS)}Welche Präposition fehlt? ${satz}`,
        richtig, r.shuffle(falsch), `Richtig: ${satz.replace("___", richtig)}`);
    });
  }

  // Wortfamilien
  if (wf.length >= 8) {
    gens.push((r) => {
      const [verb, noun, adj] = r.pick(wf);
      const kind = r.pick(["noun", "adjective", "verb"]);
      if (kind === "noun") {
        const dist = pickN(r, wf.map((p) => p[1]).filter((s) => s !== noun), noun, 3);
        return mc(r, "Word Families", `${r.pick(LEADS)}Wie lautet das Substantiv (noun) zum Verb „to ${verb}“?`,
          noun, dist, `to ${verb} → ${noun} → ${adj}.`);
      }
      if (kind === "adjective") {
        const dist = pickN(r, wf.map((p) => p[2]).filter((s) => s !== adj), adj, 3);
        return mc(r, "Word Families", `${r.pick(LEADS)}Wie lautet das Adjektiv zum Substantiv „${noun}“?`,
          adj, dist, `to ${verb} → ${noun} → ${adj}.`);
      }
      const dist = pickN(r, wf.map((p) => p[0]).filter((s) => s !== verb), verb, 3);
      return mc(r, "Word Families", `${r.pick(LEADS)}Wie lautet das Verb zum Adjektiv „${adj}“?`,
        verb, dist, `to ${verb} → ${noun} → ${adj}.`);
    });
  }

  // Wortformen: unregelmäßige Verben (simple past / past participle)
  if (klasse <= 10) {
    gens.push((r) => {
      const [inf, past, part] = r.pick(IRREGULAR_VERBS);
      const askPast = klasse <= 6 || r.next() < 0.5;
      const correct = askPast ? past : part;
      const pool = IRREGULAR_VERBS.map((v) => (askPast ? v[1] : v[2])).filter((s) => s !== correct);
      const wrongForm = askPast ? part : past;
      const dist = (wrongForm !== correct ? [wrongForm] : []).concat(pickN(r, pool, correct, 3)).slice(0, 3);
      return mc(r, "Irregular Verbs",
        `${r.pick(LEADS)}Wie lautet ${askPast ? "das simple past" : "das past participle"} von „to ${inf}“?`,
        correct, dist, `to ${inf} – ${past} – ${part}.`);
    });
  }

  // Gegensatzpaare (Unter-/Mittelstufe)
  if (klasse <= 8) {
    gens.push((r) => {
      const [wort, opp] = r.pick(EN_OPPOSITES);
      const dist = pickN(r, EN_OPPOSITES.map((p) => p[1]).filter((s) => s !== opp), opp, 3);
      return mc(r, "Opposites", `${r.pick(LEADS)}What is the opposite of “${wort}”?`,
        opp, dist, `The opposite of “${wort}” is “${opp}”.`);
    });
  }

  // Ab Klasse 11: Collocations + academic vocabulary
  if (klasse >= 11) {
    gens.push((r) => {
      const [lücke, richtig, falsch, erk] = r.pick(COLLOCATIONS);
      return mc(r, "Collocations", `${r.pick(LEADS)}Welche Kollokation ist richtig: ${lücke}?`,
        richtig, r.shuffle(falsch), erk);
    });
    gens.push((r) => {
      const [wort, bed] = r.pick(ACADEMIC_VOCAB);
      const dist = pickN(r, ACADEMIC_VOCAB.map((p) => p[1]).filter((s) => s !== bed), bed, 3);
      return mc(r, "Academic Vocabulary", `${r.pick(LEADS)}Was bedeutet das akademische Wort „${wort}“?`,
        bed, dist, `„${wort}“ bedeutet: ${bed}.`);
    });
    gens.push((r) => {
      const [wort, bed] = r.pick(ACADEMIC_VOCAB);
      const dist = pickN(r, ACADEMIC_VOCAB.map((p) => p[0]).filter((s) => s !== wort), wort, 3);
      return mc(r, "Academic Vocabulary", `${r.pick(LEADS)}Welches englische Wort bedeutet „${bed}“?`,
        wort, dist, `„${wort}“ = ${bed}.`);
    });
  }

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

  console.log("Mathematik-Vertiefung (Klasse 5–13, je >= 500):");
  for (let k = 5; k <= 13; k++)
    total += writeBank("mathematik5", k, generateBank(71000 + k, 500, mathematik5Generators(k)), 500);

  console.log("Deutsch Wortschatz & Rechtschreibung (Klasse 5–10, je >= 400):");
  for (let k = 5; k <= 10; k++)
    total += writeBank("deutsch3", k, generateBank(72000 + k, 400, deutsch3Generators(k)), 400);

  console.log("Englisch Wortschatz-Vertiefung (Klasse 5–13, je >= 400):");
  for (let k = 5; k <= 13; k++)
    total += writeBank("englisch4", k, generateBank(73000 + k, 400, englisch4Generators(k)), 400);

  console.log(`\nGesamt (Runde 7): ${total} Fragen.`);
}

main();
