/* Copyright 2026 Elian Schock, Jonas Schwenk */
/**
 * MEGA-Fragen-Generator für MasterMind.
 *
 * Erzeugt prozedural eine große, fachlich korrekte Multiple-Choice-Fragenbank
 * (4 Optionen, genau 1 richtig, mit Erklärung) als JSON-Dateien unter
 *   scripts/questions/mega/data/<fach>-klasse<k>.json
 * im Format [{ topic, question, options[4], correct(Index), explanation }].
 *
 * Fächer/Umfang:
 *   - mathematik  Klasse 1–13, >= 1000 Fragen pro Klasse
 *   - englisch    Klasse 5–10,  >= 1000 Fragen pro Klasse
 *   - physik      Klasse 7–10,  >=  500 Fragen pro Klasse
 *   - chemie      Klasse 7–10,  >=  500 Fragen pro Klasse
 *
 * Deterministisch (seeded PRNG mulberry32) — gleicher Aufruf, gleiche Dateien.
 * Keine Abhängigkeiten, reines Node.
 *
 * Aufruf (vom Repo-Root):
 *   node scripts/questions/mega/generate.mjs
 *
 * Import in die DB danach (siehe Header dort):
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

const gcd = (a, b) => (b === 0 ? Math.abs(a) : gcd(b, a % b));

/** Deutsche Zahlformatierung (Komma), max. 4 Nachkommastellen, ohne Float-Müll. */
function fmt(x) {
  const r = Math.round(x * 10000) / 10000;
  return String(r).replace(".", ",");
}

/**
 * Baut eine MC-Frage: mischt korrekte Antwort + 3 Distraktoren,
 * garantiert 4 einzigartige Optionen. Distraktoren, die mit der korrekten
 * Antwort kollidieren, werden numerisch "weggeschoben".
 */
function mc(rng, topic, question, correct, distractors, explanation) {
  const correctStr = String(correct);
  const opts = [];
  const seen = new Set([correctStr]);
  // Zerlegt "111,5 g" in Zahl + Einheit, damit Kollisionen sauber "weggeschoben" werden können
  const numeric = (s) => {
    const m = /^(−?-?\d+(?:,\d+)?)(.*)$/.exec(s);
    if (!m) return null;
    const n = Number(m[1].replace("−", "-").replace(",", "."));
    return Number.isFinite(n) ? { n, unit: m[2] } : null;
  };
  for (const d of distractors) {
    let s = String(d);
    let bump = 1;
    while (seen.has(s)) {
      const p = numeric(s);
      if (!p) { s = null; break; }
      s = fmt(p.n + bump) + p.unit;
      bump += 1;
      if (bump > 50) { s = null; break; }
    }
    if (s !== null) { seen.add(s); opts.push(s); }
    if (opts.length === 3) break;
  }
  // Numerisch auffüllen falls zu wenige Distraktoren übrig; sonst Frage verwerfen
  let filler = 2;
  while (opts.length < 3) {
    const p = numeric(correctStr);
    if (!p) return null;
    const cand = fmt(p.n + filler * 3 + 1) + p.unit;
    if (!seen.has(cand)) { seen.add(cand); opts.push(cand); }
    filler++;
  }
  const all = rng.shuffle([correctStr, ...opts]);
  return {
    topic,
    question,
    options: all,
    correct: all.indexOf(correctStr),
    explanation,
  };
}

/** Erzeugt 3 plausible numerische Distraktoren (typische Fehler). */
function numDistractors(rng, v, spread = null) {
  const s = spread ?? Math.max(1, Math.round(Math.abs(v) * 0.15));
  let pool = [
    v + 1, v - 1, v + s, v - s, v + 2, v - 2, v * 2, -v,
    v + 10, v - 10, Math.round(v * 1.1 * 100) / 100,
  ];
  // Bei positiven Ganzzahl-Ergebnissen keine negativen/dezimalen Distraktoren
  if (Number.isInteger(v)) pool = pool.map((x) => Math.round(x));
  if (v >= 0) pool = pool.filter((x) => x >= 0);
  const out = [];
  const seen = new Set([fmt(v)]);
  for (const c of rng.shuffle(pool)) {
    const f = fmt(c);
    if (!seen.has(f)) { seen.add(f); out.push(f); }
    if (out.length === 3) break;
  }
  return out;
}

/**
 * Rahmen: zieht solange zufällig aus den Generatoren, bis `count` Fragen mit
 * einzigartigem Fragetext gesammelt sind (oder Versuchslimit erreicht).
 */
function generateBank(seed, count, generators) {
  const rng = makeRng(seed);
  const out = [];
  const texts = new Set();
  let attempts = 0;
  const maxAttempts = count * 80;
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

/* ────────────────────────── MATHEMATIK ────────────────────────── */

const NAMEN = ["Mia", "Ben", "Emma", "Leon", "Lina", "Paul", "Sofia", "Noah", "Clara", "Finn", "Lea", "Jonas", "Anna", "Luis", "Marie", "Tim", "Nele", "Max", "Ida", "Erik"];
const DINGE = ["Äpfel", "Murmeln", "Sticker", "Bonbons", "Stifte", "Karten", "Bausteine", "Muscheln", "Perlen", "Bücher", "Kekse", "Blumen"];

function mathGenerators(k) {
  const gens = [];

  if (k <= 4) {
    const lim = k === 1 ? 20 : k === 2 ? 100 : k === 3 ? 1000 : 10000;
    // Addition
    gens.push((r) => {
      const a = r.int(1, Math.floor(lim * 0.6));
      const b = r.int(1, lim - a);
      const v = a + b;
      return mc(r, "Addition", `Was ist ${a} + ${b}?`, v, numDistractors(r, v), `${a} + ${b} = ${v}.`);
    });
    // Subtraktion
    gens.push((r) => {
      const a = r.int(2, lim);
      const b = r.int(1, a - 1);
      const v = a - b;
      return mc(r, "Subtraktion", `Was ist ${a} − ${b}?`, v, numDistractors(r, v), `${a} − ${b} = ${v}.`);
    });
    // Sachaufgaben
    gens.push((r) => {
      const n1 = r.pick(NAMEN); const d = r.pick(DINGE);
      const a = r.int(2, Math.min(lim, 50)); const b = r.int(1, Math.min(lim - a, 40));
      const v = a + b;
      return mc(r, "Sachaufgaben", `${n1} hat ${a} ${d} und bekommt ${b} dazu. Wie viele ${d} hat ${n1} jetzt?`, v, numDistractors(r, v), `${a} + ${b} = ${v} ${d}.`);
    });
    gens.push((r) => {
      const n1 = r.pick(NAMEN); const d = r.pick(DINGE);
      const a = r.int(5, Math.min(lim, 60)); const b = r.int(1, a - 1);
      const v = a - b;
      return mc(r, "Sachaufgaben", `${n1} hat ${a} ${d} und verschenkt ${b} davon. Wie viele ${d} bleiben übrig?`, v, numDistractors(r, v), `${a} − ${b} = ${v} ${d}.`);
    });
    if (k === 1) {
      gens.push((r) => {
        const n = r.int(1, 19);
        return mc(r, "Zahlenreihe", `Welche Zahl kommt direkt nach ${n}?`, n + 1, [n - 1, n + 2, n].map(fmt), `Nach ${n} kommt ${n + 1}.`);
      });
      gens.push((r) => {
        const n = r.int(1, 10);
        return mc(r, "Verdoppeln", `Was ist das Doppelte von ${n}?`, 2 * n, numDistractors(r, 2 * n), `${n} + ${n} = ${2 * n}.`);
      });
    }
    if (k >= 2) {
      // Einmaleins
      gens.push((r) => {
        const a = r.int(2, 10); const b = r.int(2, 10);
        const v = a * b;
        return mc(r, "Einmaleins", `Was ist ${a} · ${b}?`, v, [a * (b + 1), a * (b - 1), v + a - 1].map(fmt), `${a} · ${b} = ${v}.`);
      });
      gens.push((r) => {
        const b = r.int(2, 10); const q = r.int(2, 10); const a = b * q;
        return mc(r, "Einmaleins", `Was ist ${a} : ${b}?`, q, [q + 1, q - 1, q + 2].map(fmt), `${b} · ${q} = ${a}, also ${a} : ${b} = ${q}.`);
      });
    }
    if (k >= 3) {
      gens.push((r) => {
        const n = r.int(11, 989);
        const v = Math.round(n / 10) * 10;
        return mc(r, "Runden", `Runde ${n} auf Zehner.`, v, [v + 10, v - 10, n].map(fmt).filter((x) => x !== fmt(v)), `Die Einerstelle von ${n} entscheidet: gerundet ${v}.`);
      });
      gens.push((r) => {
        const a = r.int(2, 9); const b = r.int(11, 99);
        const v = a * b;
        return mc(r, "Multiplikation", `Was ist ${a} · ${b}?`, v, [a * (b + 1), a * (b - 1), v + 10].map(fmt), `${a} · ${b} = ${a} · ${b - (b % 10)} + ${a} · ${b % 10} = ${v}.`);
      });
    }
    if (k === 4) {
      gens.push((r) => {
        const a = r.int(11, 99); const b = r.int(11, 99);
        const v = a * b;
        return mc(r, "Schriftliche Multiplikation", `Was ist ${a} · ${b}?`, v, [a * (b + 1), (a + 1) * b, v + 100].map(fmt), `${a} · ${b} = ${a} · ${b - (b % 10)} + ${a} · ${b % 10} = ${v}.`);
      });
      gens.push((r) => {
        const b = r.int(3, 9); const q = r.int(12, 120); const rest = r.int(1, b - 1);
        const a = b * q + rest;
        return mc(r, "Division mit Rest", `Was ist ${a} : ${b}? (Ergebnis mit Rest)`, `${q} Rest ${rest}`, [`${q + 1} Rest ${rest}`, `${q} Rest ${rest === 1 ? 2 : rest - 1}`, `${q - 1} Rest ${rest}`], `${b} · ${q} = ${b * q}, es bleibt Rest ${rest}.`);
      });
      gens.push((r) => {
        const m = r.int(2, 90);
        return mc(r, "Einheiten", `Wie viele Zentimeter sind ${m} m?`, `${m * 100} cm`, [`${m * 10} cm`, `${m * 1000} cm`, `${m * 100 + 10} cm`], `1 m = 100 cm, also ${m} m = ${m * 100} cm.`);
      });
      gens.push((r) => {
        const kg = r.int(2, 50);
        return mc(r, "Einheiten", `Wie viele Gramm sind ${kg} kg?`, `${kg * 1000} g`, [`${kg * 100} g`, `${kg * 10000} g`, `${kg * 1000 + 100} g`], `1 kg = 1000 g, also ${kg} kg = ${kg * 1000} g.`);
      });
    }
  }

  if (k >= 5 && k <= 7) {
    // Brüche kürzen
    gens.push((r) => {
      const z = r.int(1, 9); const n = r.int(z + 1, 12);
      const g = gcd(z, n); if (g === 1) return null;
      const f = r.int(2, 6);
      const Z = z * f, N = n * f;
      return mc(r, "Brüche", `Kürze den Bruch ${Z}/${N} vollständig.`, `${z / g}/${n / g}`, [`${Z / f}/${N}`, `${z}/${n * 2}`, `${z / g + 1}/${n / g}`], `ggT(${Z}, ${N}) = ${f * g}, also ${Z}/${N} = ${z / g}/${n / g}.`);
    });
    // Bruch von einer Zahl
    gens.push((r) => {
      const n = r.int(2, 8); const z = r.int(1, n - 1);
      const ganze = n * r.int(2, 12);
      const v = (ganze / n) * z;
      return mc(r, "Brüche", `Was ist ${z}/${n} von ${ganze}?`, v, [ganze / n, v + z, v - n].map(fmt), `${ganze} : ${n} = ${ganze / n}, dann ${ganze / n} · ${z} = ${v}.`);
    });
    // Brüche addieren (gleicher Nenner Kl.5, ungleich ab Kl.6)
    gens.push((r) => {
      const n = r.int(3, 12);
      const a = r.int(1, n - 2); const b = r.int(1, n - a - 1);
      const s = a + b; const g = gcd(s, n);
      return mc(r, "Brüche", `Was ist ${a}/${n} + ${b}/${n}? (vollständig gekürzt)`, `${s / g}/${n / g}`, [`${s}/${2 * n}`, `${a + b}/${n + n}`, `${s / g}/${n / g + 1}`], `Gleicher Nenner: ${a}/${n} + ${b}/${n} = ${s}/${n}${g > 1 ? ` = ${s / g}/${n / g}` : ""}.`);
    });
    // Dezimalzahlen
    gens.push((r) => {
      const a = r.int(11, 899) / 10; const b = r.int(11, 899) / 10;
      const v = Math.round((a + b) * 10) / 10;
      return mc(r, "Dezimalzahlen", `Was ist ${fmt(a)} + ${fmt(b)}?`, fmt(v), numDistractors(r, v, 1), `Stellenweise addieren: ${fmt(a)} + ${fmt(b)} = ${fmt(v)}.`);
    });
    gens.push((r) => {
      const a = r.int(2, 9); const b = r.int(11, 99) / 10;
      const v = Math.round(a * b * 10) / 10;
      return mc(r, "Dezimalzahlen", `Was ist ${a} · ${fmt(b)}?`, fmt(v), numDistractors(r, v, 2), `${a} · ${fmt(b)} = ${fmt(v)} (Komma beachten).`);
    });
    // Negative Zahlen
    gens.push((r) => {
      const a = r.int(1, 30); const b = r.int(1, 30);
      const v = -a + b;
      return mc(r, "Negative Zahlen", `Was ist (−${a}) + ${b}?`, v, [a + b, -(a + b), v - 2].map(fmt), `−${a} + ${b} = ${v}.`);
    });
    gens.push((r) => {
      const a = r.int(1, 25); const b = r.int(1, 25);
      const v = -a - b;
      return mc(r, "Negative Zahlen", `Was ist (−${a}) − ${b}?`, v, [b - a, a + b, v + 2].map(fmt), `Minus und Minus: −${a} − ${b} = −(${a} + ${b}) = ${v}.`);
    });
  }
  if (k === 6 || k === 7) {
    // Prozent
    gens.push((r) => {
      const p = r.pick([5, 10, 20, 25, 50, 75]);
      const g = r.pick([40, 60, 80, 120, 160, 200, 240, 300, 400, 500, 640, 800]);
      const v = (g * p) / 100;
      return mc(r, "Prozentrechnung", `Was sind ${p} % von ${g}?`, fmt(v), numDistractors(r, v), `${p} % von ${g} = ${g} · ${p}/100 = ${fmt(v)}.`);
    });
    // Brüche ungleichnamig
    gens.push((r) => {
      const n1 = r.pick([2, 3, 4, 5, 6]); let n2 = r.pick([2, 3, 4, 5, 6, 8]);
      if (n1 === n2) n2 = n1 + 1;
      const a = r.int(1, n1 - 1); const b = r.int(1, n2 - 1);
      const N = (n1 * n2) / gcd(n1, n2);
      const S = a * (N / n1) + b * (N / n2);
      const g = gcd(S, N);
      return mc(r, "Brüche", `Was ist ${a}/${n1} + ${b}/${n2}? (vollständig gekürzt)`, `${S / g}/${N / g}`, [`${a + b}/${n1 + n2}`, `${S}/${N * 2}`, `${S / g + 1}/${N / g}`], `Hauptnenner ${N}: ${a * (N / n1)}/${N} + ${b * (N / n2)}/${N} = ${S}/${N}${g > 1 ? ` = ${S / g}/${N / g}` : ""}.`);
    });
    // Negative multiplizieren
    gens.push((r) => {
      const a = r.int(2, 12); const b = r.int(2, 12);
      const v = -a * b;
      return mc(r, "Negative Zahlen", `Was ist (−${a}) · ${b}?`, v, [a * b, -a - b, v + a].map(fmt), `Minus mal Plus ergibt Minus: (−${a}) · ${b} = ${v}.`);
    });
  }
  if (k === 7) {
    // einfache Gleichungen
    gens.push((r) => {
      const x = r.int(2, 20); const a = r.int(2, 30);
      return mc(r, "Gleichungen", `Löse: x + ${a} = ${x + a}. Was ist x?`, x, [x + 1, x - 1, x + a].map(fmt), `x = ${x + a} − ${a} = ${x}.`);
    });
    gens.push((r) => {
      const x = r.int(2, 15); const a = r.int(2, 9); const b = r.int(1, 20);
      return mc(r, "Gleichungen", `Löse: ${a}x + ${b} = ${a * x + b}. Was ist x?`, x, [x + 1, x - 1, a * x].map(fmt), `${a}x = ${a * x + b} − ${b} = ${a * x} → x = ${a * x} : ${a} = ${x}.`);
    });
    // Dreisatz
    gens.push((r) => {
      const stueck = r.int(2, 8); const preisEins = r.int(2, 12);
      const ziel = r.int(2, 12);
      const gesamt = stueck * preisEins;
      const v = ziel * preisEins;
      return mc(r, "Dreisatz", `${stueck} Hefte kosten ${gesamt} €. Wie viel kosten ${ziel} Hefte?`, `${v} €`, [`${v + preisEins} €`, `${v - preisEins} €`, `${gesamt} €`].filter((s) => s !== `${v} €`), `1 Heft kostet ${gesamt} : ${stueck} = ${preisEins} €, also ${ziel} · ${preisEins} = ${v} €.`);
    });
    gens.push((r) => {
      const W = r.pick([12, 15, 18, 24, 30, 36, 45, 60, 90]);
      const G = W * r.pick([2, 4, 5, 10]);
      const p = (W / G) * 100;
      return mc(r, "Prozentrechnung", `Wie viel Prozent sind ${W} von ${G}?`, `${fmt(p)} %`, [`${fmt(p * 2)} %`, `${fmt(p / 2)} %`, `${fmt(p + 5)} %`], `p = ${W}/${G} · 100 % = ${fmt(p)} %.`);
    });
  }

  if (k >= 8 && k <= 10) {
    // lineare Gleichungen ax+b = cx+d
    gens.push((r) => {
      const x = r.int(-9, 12); const a = r.int(2, 9); let c = r.int(1, 8);
      if (c === a) c = a - 1 || a + 1;
      const b = r.int(-15, 15);
      const d = a * x + b - c * x;
      return mc(r, "Lineare Gleichungen", `Löse: ${a}x ${b >= 0 ? "+ " + b : "− " + (-b)} = ${c}x ${d >= 0 ? "+ " + d : "− " + (-d)}. Was ist x?`, x, [-x, x + 1, x - 1].map(fmt), `${a}x − ${c}x = ${d} − (${b}) → ${a - c}x = ${d - b} → x = ${x}.`);
    });
    // Binomische Formeln
    gens.push((r) => {
      const a = r.int(1, 9);
      const sign = r.pick(["+", "−"]);
      const mid = 2 * a;
      const correct = sign === "+" ? `x² + ${mid}x + ${a * a}` : `x² − ${mid}x + ${a * a}`;
      const wrong1 = sign === "+" ? `x² + ${a * a}` : `x² − ${a * a}`;
      const wrong2 = sign === "+" ? `x² + ${a}x + ${a * a}` : `x² − ${a}x + ${a * a}`;
      const wrong3 = sign === "+" ? `x² + ${mid}x − ${a * a}` : `x² − ${mid}x − ${a * a}`;
      return mc(r, "Binomische Formeln", `Multipliziere aus: (x ${sign} ${a})²`, correct, [wrong1, wrong2, wrong3], `(x ${sign} ${a})² = x² ${sign} 2·${a}·x + ${a}² = ${correct}.`);
    });
    // Terme
    gens.push((r) => {
      const kf = r.int(2, 9); const a = r.int(1, 12);
      return mc(r, "Terme", `Multipliziere aus: ${kf}(x + ${a})`, `${kf}x + ${kf * a}`, [`${kf}x + ${a}`, `${kf + a}x`, `${kf}x + ${kf + a}`], `${kf}(x + ${a}) = ${kf}·x + ${kf}·${a} = ${kf}x + ${kf * a}.`);
    });
    // Zinsen
    gens.push((r) => {
      const K = r.pick([500, 800, 1000, 1200, 1500, 2000, 2500, 4000, 5000, 8000, 10000]);
      const p = r.pick([1, 2, 2.5, 3, 4, 5]);
      const Z = (K * p) / 100;
      return mc(r, "Zinsrechnung", `Kapital ${K} €, Zinssatz ${fmt(p)} % pro Jahr. Wie hoch sind die Zinsen nach einem Jahr?`, `${fmt(Z)} €`, [`${fmt(Z * 10)} €`, `${fmt(Z / 2)} €`, `${fmt(Z + 10)} €`], `Z = K · p/100 = ${K} · ${fmt(p)}/100 = ${fmt(Z)} €.`);
    });
  }
  if (k >= 9 && k <= 10) {
    const TRIPEL = [[3, 4, 5], [6, 8, 10], [5, 12, 13], [9, 12, 15], [8, 15, 17], [12, 16, 20], [7, 24, 25], [20, 21, 29], [10, 24, 26], [15, 20, 25], [9, 40, 41], [18, 24, 30]];
    gens.push((r) => {
      const [a, b, c] = r.pick(TRIPEL);
      return mc(r, "Satz des Pythagoras", `Ein rechtwinkliges Dreieck hat die Katheten a = ${a} cm und b = ${b} cm. Wie lang ist die Hypotenuse c?`, `${c} cm`, [`${a + b} cm`, `${c + 1} cm`, `${c - 1} cm`], `c = √(a² + b²) = √(${a * a} + ${b * b}) = √${c * c} = ${c} cm.`);
    });
    gens.push((r) => {
      const [a, b, c] = r.pick(TRIPEL);
      return mc(r, "Satz des Pythagoras", `Ein rechtwinkliges Dreieck hat die Hypotenuse c = ${c} cm und die Kathete a = ${a} cm. Wie lang ist die Kathete b?`, `${b} cm`, [`${c - a} cm`, `${b + 1} cm`, `${b - 1} cm`], `b = √(c² − a²) = √(${c * c} − ${a * a}) = √${b * b} = ${b} cm.`);
    });
    // Quadratische Gleichungen x² = n
    gens.push((r) => {
      const x = r.int(2, 20);
      return mc(r, "Quadratische Gleichungen", `Löse: x² = ${x * x}. Welche Lösungen hat die Gleichung?`, `x = ${x} oder x = −${x}`, [`nur x = ${x}`, `x = ${x * x / 2} oder x = −${x * x / 2}`, `nur x = −${x}`], `x² = ${x * x} → x = ±√${x * x} = ±${x}.`);
    });
    // faktorisiert
    gens.push((r) => {
      let x1 = r.int(-8, 8); let x2 = r.int(-8, 8);
      if (x1 === 0) x1 = 9; if (x2 === x1) x2 = x1 - 3 || 5;
      return mc(r, "Quadratische Gleichungen", `Löse: (x ${x1 >= 0 ? "− " + x1 : "+ " + (-x1)})(x ${x2 >= 0 ? "− " + x2 : "+ " + (-x2)}) = 0`, `x = ${x1} oder x = ${x2}`, [`x = ${-x1} oder x = ${-x2}`, `x = ${x1 * x2}`, `x = ${x1 + x2} oder x = 0`], `Ein Produkt ist 0, wenn ein Faktor 0 ist: x = ${x1} oder x = ${x2}.`);
    });
    gens.push((r) => {
      const n = r.pick([49, 64, 81, 100, 121, 144, 169, 196, 225, 256, 289, 324, 361, 400, 441, 484, 529, 576, 625]);
      const v = Math.sqrt(n);
      return mc(r, "Wurzeln", `Was ist √${n}?`, v, [v + 1, v - 1, n / 2].map(fmt), `${v} · ${v} = ${n}, also √${n} = ${v}.`);
    });
  }
  if (k === 10) {
    gens.push((r) => {
      const K = r.pick([1000, 2000, 2500, 5000, 10000]);
      const p = r.pick([2, 5, 10]);
      const q = 1 + p / 100;
      const v = Math.round(K * q * q * 100) / 100;
      return mc(r, "Zinseszins", `Kapital ${K} €, ${p} % Zinsen pro Jahr mit Zinseszins. Wie hoch ist das Kapital nach 2 Jahren?`, `${fmt(v)} €`, [`${fmt(K * (1 + (2 * p) / 100))} €`, `${fmt(K * q)} €`, `${fmt(v + 10)} €`], `K₂ = ${K} · ${fmt(q)}² = ${fmt(v)} €.`);
    });
    gens.push((r) => {
      const a = r.int(2, 5); const n = r.int(2, 4); const m = r.int(2, 4);
      return mc(r, "Potenzen", `Vereinfache: ${a}^${n} · ${a}^${m}`, `${a}^${n + m}`, [`${a}^${n * m}`, `${a * a}^${n + m}`, `${a}^${n + m + 1}`], `Bei gleicher Basis Exponenten addieren: ${a}^${n} · ${a}^${m} = ${a}^${n + m}.`);
    });
  }

  if (k >= 11) {
    // Ableitung ax^n
    gens.push((r) => {
      const a = r.int(1, 9); const n = r.int(2, 6);
      const c = a * n;
      const correct = `f'(x) = ${c}x${n - 1 === 1 ? "" : "^" + (n - 1)}`;
      return mc(r, "Ableitungen", `Leite ab: f(x) = ${a === 1 ? "" : a}x^${n}`, correct, [`f'(x) = ${a}x^${n - 1}`, `f'(x) = ${c}x^${n}`, `f'(x) = ${a * (n + 1)}x^${n - 1}`], `Potenzregel: (${a === 1 ? "" : a}x^${n})' = ${a}·${n}·x^${n - 1} = ${c}x${n - 1 === 1 ? "" : "^" + (n - 1)}.`);
    });
    // f'(x0) für ax²+bx+c
    gens.push((r) => {
      const a = r.int(1, 6); const b = r.int(-9, 9); const c0 = r.int(-9, 9); const x0 = r.int(-4, 5);
      const v = 2 * a * x0 + b;
      return mc(r, "Ableitungen", `f(x) = ${a}x² ${b >= 0 ? "+ " + b : "− " + (-b)}x ${c0 >= 0 ? "+ " + c0 : "− " + (-c0)}. Was ist f'(${x0})?`, v, [a * x0 * x0 + b * x0 + c0, 2 * a * x0, v + b === v ? v + 1 : v - b].map(fmt), `f'(x) = ${2 * a}x ${b >= 0 ? "+ " + b : "− " + (-b)} → f'(${x0}) = ${2 * a}·(${x0}) ${b >= 0 ? "+ " + b : "− " + (-b)} = ${v}.`);
    });
    // Wahrscheinlichkeit Würfel
    gens.push((r) => {
      const s = r.int(2, 5);
      const guenstig = 7 - s; // Augenzahl >= s bei einem Würfel: 6-s+1
      return mc(r, "Wahrscheinlichkeit", `Ein fairer Würfel wird einmal geworfen. Wie groß ist P(Augenzahl ≥ ${s})?`, `${guenstig}/6`, [`${s}/6`, `${guenstig - 1}/6`, `1/${s}`], `Günstig sind die Zahlen ${s} bis 6, das sind ${guenstig} von 6: P = ${guenstig}/6.`);
    });
    // Urne
    gens.push((r) => {
      const rot = r.int(2, 8); const blau = r.int(2, 8);
      const ges = rot + blau; const g = gcd(rot, ges);
      return mc(r, "Wahrscheinlichkeit", `In einer Urne liegen ${rot} rote und ${blau} blaue Kugeln. Wie groß ist die Wahrscheinlichkeit, rot zu ziehen?`, `${rot / g}/${ges / g}`, [`${blau}/${ges}`, `${rot}/${blau}`, `1/${rot}`], `P(rot) = ${rot}/${ges}${g > 1 ? ` = ${rot / g}/${ges / g}` : ""}.`);
    });
  }
  if (k >= 12) {
    // Vektoren addieren
    gens.push((r) => {
      const a = [r.int(-9, 9), r.int(-9, 9), r.int(-9, 9)];
      const b = [r.int(-9, 9), r.int(-9, 9), r.int(-9, 9)];
      const s = [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
      const w1 = [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
      return mc(r, "Vektoren", `Berechne (${a.join(" | ")}) + (${b.join(" | ")}).`, `(${s.join(" | ")})`, [`(${w1.join(" | ")})`, `(${s[0] + 1} | ${s[1]} | ${s[2]})`, `(${s[2]} | ${s[1]} | ${s[0] + (s[0] === s[2] ? 1 : 0)})`], `Komponentenweise: (${a[0]}+${b[0]} | ${a[1]}+${b[1]} | ${a[2]}+${b[2]}) = (${s.join(" | ")}).`);
    });
    // Skalarprodukt
    gens.push((r) => {
      const a = [r.int(-6, 6), r.int(-6, 6), r.int(-6, 6)];
      const b = [r.int(-6, 6), r.int(-6, 6), r.int(-6, 6)];
      const v = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
      return mc(r, "Vektoren", `Berechne das Skalarprodukt (${a.join(" | ")}) · (${b.join(" | ")}).`, v, [v + 1, -v, v + a[0] === v ? v - 1 : v + a[0]].map(fmt), `${a[0]}·${b[0]} + ${a[1]}·${b[1]} + ${a[2]}·${b[2]} = ${a[0] * b[0]} + ${a[1] * b[1]} + ${a[2] * b[2]} = ${v}.`);
    });
    // Vektorlänge (ganzzahlige Tripel)
    const LTRIPEL = [[1, 2, 2, 3], [2, 3, 6, 7], [1, 4, 8, 9], [4, 4, 7, 9], [2, 6, 9, 11], [6, 6, 7, 11], [3, 4, 12, 13], [2, 5, 14, 15], [2, 4, 4, 6], [4, 6, 12, 14], [8, 9, 12, 17], [1, 12, 12, 17], [6, 10, 15, 19], [4, 8, 19, 21], [2, 10, 25, 27]];
    gens.push((r) => {
      const t = r.pick(LTRIPEL);
      const perm = r.shuffle([t[0], t[1], t[2]]);
      const L = t[3];
      return mc(r, "Vektoren", `Wie lang ist der Vektor (${perm.join(" | ")})?`, L, [L + 1, L - 1, perm[0] + perm[1] + perm[2]].map(fmt), `|v| = √(${perm[0]}² + ${perm[1]}² + ${perm[2]}²) = √${L * L} = ${L}.`);
    });
    // Ableitung Polynom Grad 3
    gens.push((r) => {
      const a = r.int(1, 5); const b = r.int(1, 9); const c0 = r.int(1, 9);
      return mc(r, "Ableitungen", `Leite ab: f(x) = ${a}x³ − ${b}x² + ${c0}x`, `f'(x) = ${3 * a}x² − ${2 * b}x + ${c0}`, [`f'(x) = ${3 * a}x² − ${2 * b}x`, `f'(x) = ${a}x² − ${b}x + ${c0}`, `f'(x) = ${3 * a}x² − ${b}x + ${c0}`], `Summandenweise Potenzregel: f'(x) = 3·${a}x² − 2·${b}x + ${c0}.`);
    });
  }
  if (k === 13) {
    // Stammfunktion
    gens.push((r) => {
      const n = r.int(1, 5); const a = (n + 1) * r.int(1, 5);
      const c = a / (n + 1);
      return mc(r, "Integralrechnung", `Welche Funktion ist eine Stammfunktion von f(x) = ${a}x^${n}?`, `F(x) = ${c === 1 ? "" : c}x^${n + 1}`, [`F(x) = ${a * n}x^${n - 1}`, `F(x) = ${a}x^${n + 1}`, `F(x) = ${c === 1 ? "" : c}x^${n}`], `F(x) = ${a}/(${n}+1) · x^${n + 1} = ${c === 1 ? "" : c}x^${n + 1}; Probe: F'(x) = ${a}x^${n}.`);
    });
    // Orthogonalität
    gens.push((r) => {
      const a = [r.int(1, 6), r.int(1, 6)];
      const b = [a[1] * r.int(1, 3), -a[0] * r.int(1, 3)];
      // b orthogonal machen: (a1,a2)·(k·a2, -k·a1)=0 nur wenn gleiche k → neu:
      const kk = r.int(1, 3);
      const bo = [kk * a[1], -kk * a[0]];
      const wrong = [[a[0], a[1]], [a[1], a[0]], [bo[0], bo[1] + 1]];
      return mc(r, "Vektoren", `Welcher Vektor steht senkrecht auf (${a[0]} | ${a[1]})?`, `(${bo[0]} | ${bo[1]})`, wrong.map((w) => `(${w[0]} | ${w[1]})`), `Skalarprodukt: ${a[0]}·${bo[0]} + ${a[1]}·(${bo[1]}) = ${a[0] * bo[0]} ${a[1] * bo[1] >= 0 ? "+ " + a[1] * bo[1] : "− " + -(a[1] * bo[1])} = 0 → senkrecht.`);
    });
    // Zweistufiges Zufallsexperiment
    gens.push((r) => {
      const n = r.int(4, 10);
      return mc(r, "Wahrscheinlichkeit", `Eine Münze wird ${n}-mal geworfen. Wie groß ist die Wahrscheinlichkeit für ${n}-mal „Kopf“?`, `1/${2 ** n}`, [`1/${2 * n}`, `${n}/${2 ** n}`, `1/${2 ** (n - 1)}`], `Jeder Wurf: P = 1/2. Unabhängig: (1/2)^${n} = 1/${2 ** n}.`);
    });
  }

  return gens.filter(Boolean);
}

/* ────────────────────────── ENGLISCH ────────────────────────── */

// >= 300 Wortpaare de ↔ en; pro Klasse wird ein Fenster von 130 Wörtern genutzt,
// von Alltagswortschatz (Kl. 5) bis abstrakterem Wortschatz (Kl. 10).
const WORDS = [
  ["der Hund", "dog"], ["die Katze", "cat"], ["das Haus", "house"], ["die Schule", "school"], ["der Tisch", "table"],
  ["der Stuhl", "chair"], ["das Buch", "book"], ["der Stift", "pen"], ["die Tür", "door"], ["das Fenster", "window"],
  ["der Apfel", "apple"], ["das Brot", "bread"], ["die Milch", "milk"], ["das Wasser", "water"], ["der Käse", "cheese"],
  ["das Ei", "egg"], ["der Fisch", "fish"], ["das Fleisch", "meat"], ["der Kuchen", "cake"], ["die Butter", "butter"],
  ["die Mutter", "mother"], ["der Vater", "father"], ["die Schwester", "sister"], ["der Bruder", "brother"], ["die Großmutter", "grandmother"],
  ["der Großvater", "grandfather"], ["die Familie", "family"], ["der Freund", "friend"], ["das Kind", "child"], ["das Baby", "baby"],
  ["der Kopf", "head"], ["die Hand", "hand"], ["der Fuß", "foot"], ["das Auge", "eye"], ["das Ohr", "ear"],
  ["die Nase", "nose"], ["der Mund", "mouth"], ["das Haar", "hair"], ["der Arm", "arm"], ["das Bein", "leg"],
  ["rot", "red"], ["blau", "blue"], ["grün", "green"], ["gelb", "yellow"], ["schwarz", "black"],
  ["weiß", "white"], ["braun", "brown"], ["klein", "small"], ["groß", "big"], ["alt", "old"],
  ["jung", "young"], ["schnell", "fast"], ["langsam", "slow"], ["glücklich", "happy"], ["traurig", "sad"],
  ["der Montag", "Monday"], ["der Dienstag", "Tuesday"], ["der Mittwoch", "Wednesday"], ["der Donnerstag", "Thursday"], ["der Freitag", "Friday"],
  ["der Samstag", "Saturday"], ["der Sonntag", "Sunday"], ["das Jahr", "year"], ["der Monat", "month"], ["die Woche", "week"],
  ["der Tag", "day"], ["die Nacht", "night"], ["der Morgen", "morning"], ["der Abend", "evening"], ["die Stunde", "hour"],
  ["das Auto", "car"], ["das Fahrrad", "bicycle"], ["der Bus", "bus"], ["der Zug", "train"], ["das Flugzeug", "plane"],
  ["das Schiff", "ship"], ["die Straße", "street"], ["die Stadt", "city"], ["das Dorf", "village"], ["das Land", "country"],
  ["der Baum", "tree"], ["die Blume", "flower"], ["das Gras", "grass"], ["der Wald", "forest"], ["der Fluss", "river"],
  ["der See", "lake"], ["das Meer", "sea"], ["der Berg", "mountain"], ["die Sonne", "sun"], ["der Mond", "moon"],
  ["der Stern", "star"], ["der Himmel", "sky"], ["der Regen", "rain"], ["der Schnee", "snow"], ["der Wind", "wind"],
  ["das Wetter", "weather"], ["der Winter", "winter"], ["der Sommer", "summer"], ["der Frühling", "spring"], ["der Herbst", "autumn"],
  ["das Zimmer", "room"], ["die Küche", "kitchen"], ["das Badezimmer", "bathroom"], ["das Bett", "bed"], ["die Lampe", "lamp"],
  ["der Garten", "garden"], ["die Wand", "wall"], ["der Boden", "floor"], ["die Treppe", "stairs"], ["der Schlüssel", "key"],
  ["das Geld", "money"], ["der Laden", "shop"], ["der Markt", "market"], ["der Preis", "price"], ["die Tasche", "bag"],
  ["die Kleidung", "clothes"], ["das Hemd", "shirt"], ["die Hose", "trousers"], ["der Schuh", "shoe"], ["die Jacke", "jacket"],
  ["der Hut", "hat"], ["das Kleid", "dress"], ["der Pullover", "jumper"], ["der Lehrer", "teacher"], ["der Schüler", "pupil"],
  ["die Klasse", "class"], ["die Hausaufgabe", "homework"], ["die Pause", "break"], ["die Tafel", "blackboard"], ["das Heft", "exercise book"],
  ["die Antwort", "answer"], ["die Frage", "question"], ["das Wort", "word"], ["der Satz", "sentence"], ["die Sprache", "language"],
  ["die Musik", "music"], ["das Lied", "song"], ["der Film", "film"], ["das Spiel", "game"], ["der Sport", "sport"],
  ["der Fußball", "football"], ["das Schwimmbad", "swimming pool"], ["die Mannschaft", "team"], ["der Gewinner", "winner"], ["das Ziel", "goal"],
  ["der Arzt", "doctor"], ["das Krankenhaus", "hospital"], ["die Polizei", "police"], ["der Feuerwehrmann", "firefighter"], ["der Bäcker", "baker"],
  ["der Bauer", "farmer"], ["der Koch", "cook"], ["die Arbeit", "work"], ["der Beruf", "job"], ["das Büro", "office"],
  ["der Brief", "letter"], ["die Zeitung", "newspaper"], ["die Geschichte", "story"], ["die Bibliothek", "library"], ["das Wörterbuch", "dictionary"],
  ["der Urlaub", "holiday"], ["die Reise", "journey"], ["der Koffer", "suitcase"], ["das Hotel", "hotel"], ["der Strand", "beach"],
  ["die Insel", "island"], ["die Karte", "map"], ["das Ausland", "abroad"], ["die Grenze", "border"], ["der Flughafen", "airport"],
  ["das Frühstück", "breakfast"], ["das Mittagessen", "lunch"], ["das Abendessen", "dinner"], ["der Hunger", "hunger"], ["der Durst", "thirst"],
  ["das Gemüse", "vegetables"], ["das Obst", "fruit"], ["die Kartoffel", "potato"], ["die Zwiebel", "onion"], ["die Erdbeere", "strawberry"],
  ["der Vogel", "bird"], ["das Pferd", "horse"], ["die Kuh", "cow"], ["das Schwein", "pig"], ["das Schaf", "sheep"],
  ["die Maus", "mouse"], ["der Bär", "bear"], ["der Löwe", "lion"], ["der Elefant", "elephant"], ["der Affe", "monkey"],
  ["die Gesundheit", "health"], ["die Krankheit", "illness"], ["der Schmerz", "pain"], ["die Medizin", "medicine"], ["der Zahn", "tooth"],
  ["müde", "tired"], ["krank", "ill"], ["gesund", "healthy"], ["stark", "strong"], ["schwach", "weak"],
  ["die Umwelt", "environment"], ["die Verschmutzung", "pollution"], ["der Müll", "rubbish"], ["die Zukunft", "future"], ["die Vergangenheit", "past"],
  ["die Gegenwart", "present"], ["die Erfahrung", "experience"], ["die Meinung", "opinion"], ["der Grund", "reason"], ["die Wahrheit", "truth"],
  ["die Lüge", "lie"], ["das Gesetz", "law"], ["die Regierung", "government"], ["die Wahl", "election"], ["die Freiheit", "freedom"],
  ["die Gesellschaft", "society"], ["die Wissenschaft", "science"], ["die Forschung", "research"], ["die Erfindung", "invention"], ["die Entdeckung", "discovery"],
  ["die Entwicklung", "development"], ["der Fortschritt", "progress"], ["die Verantwortung", "responsibility"], ["die Entscheidung", "decision"], ["der Vorteil", "advantage"],
  ["der Nachteil", "disadvantage"], ["der Unterschied", "difference"], ["die Ähnlichkeit", "similarity"], ["der Vergleich", "comparison"], ["das Beispiel", "example"],
  ["der Erfolg", "success"], ["der Misserfolg", "failure"], ["das Verhalten", "behaviour"], ["die Beziehung", "relationship"], ["das Vertrauen", "trust"],
  ["der Respekt", "respect"], ["die Höflichkeit", "politeness"], ["der Streit", "argument"], ["die Lösung", "solution"], ["das Problem", "problem"],
  ["die Herausforderung", "challenge"], ["das Wissen", "knowledge"], ["die Bildung", "education"], ["die Fähigkeit", "ability"], ["das Talent", "talent"],
  ["das Gedächtnis", "memory"], ["die Aufmerksamkeit", "attention"], ["die Bedeutung", "meaning"], ["der Zweck", "purpose"], ["die Absicht", "intention"],
  ["das Gefühl", "feeling"], ["die Angst", "fear"], ["die Hoffnung", "hope"], ["der Mut", "courage"], ["die Geduld", "patience"],
  ["der Stolz", "pride"], ["die Scham", "shame"], ["die Überraschung", "surprise"], ["die Enttäuschung", "disappointment"], ["die Begeisterung", "enthusiasm"],
  ["die Wirtschaft", "economy"], ["die Industrie", "industry"], ["die Firma", "company"], ["der Kunde", "customer"], ["der Vertrag", "contract"],
  ["das Gehalt", "salary"], ["die Steuer", "tax"], ["die Versicherung", "insurance"], ["das Eigentum", "property"], ["die Armut", "poverty"],
  ["der Reichtum", "wealth"], ["die Arbeitslosigkeit", "unemployment"], ["die Bevölkerung", "population"], ["die Einwanderung", "immigration"], ["der Flüchtling", "refugee"],
  ["die Gerechtigkeit", "justice"], ["die Gleichheit", "equality"], ["das Vorurteil", "prejudice"], ["die Gewalt", "violence"], ["der Frieden", "peace"],
  ["der Krieg", "war"], ["die Bedrohung", "threat"], ["die Sicherheit", "security"], ["der Klimawandel", "climate change"], ["die Erderwärmung", "global warming"],
  ["erneuerbar", "renewable"], ["nachhaltig", "sustainable"], ["verfügbar", "available"], ["notwendig", "necessary"], ["ausreichend", "sufficient"],
  ["zuverlässig", "reliable"], ["verantwortlich", "responsible"], ["unabhängig", "independent"], ["erfolgreich", "successful"], ["bedeutend", "significant"],
  ["offensichtlich", "obvious"], ["merkwürdig", "strange"], ["gewöhnlich", "ordinary"], ["außergewöhnlich", "extraordinary"], ["ehrgeizig", "ambitious"],
];

// Unregelmäßige Verben: [Infinitiv, Simple Past, Past Participle, deutsch]
const VERBS = [
  ["go", "went", "gone", "gehen"], ["see", "saw", "seen", "sehen"], ["eat", "ate", "eaten", "essen"],
  ["drink", "drank", "drunk", "trinken"], ["come", "came", "come", "kommen"], ["run", "ran", "run", "laufen"],
  ["take", "took", "taken", "nehmen"], ["give", "gave", "given", "geben"], ["write", "wrote", "written", "schreiben"],
  ["read", "read", "read", "lesen"], ["speak", "spoke", "spoken", "sprechen"], ["swim", "swam", "swum", "schwimmen"],
  ["sing", "sang", "sung", "singen"], ["begin", "began", "begun", "beginnen"], ["break", "broke", "broken", "zerbrechen"],
  ["bring", "brought", "brought", "bringen"], ["buy", "bought", "bought", "kaufen"], ["catch", "caught", "caught", "fangen"],
  ["choose", "chose", "chosen", "wählen"], ["do", "did", "done", "tun"], ["draw", "drew", "drawn", "zeichnen"],
  ["drive", "drove", "driven", "fahren"], ["fall", "fell", "fallen", "fallen"], ["feel", "felt", "felt", "fühlen"],
  ["find", "found", "found", "finden"], ["fly", "flew", "flown", "fliegen"], ["forget", "forgot", "forgotten", "vergessen"],
  ["get", "got", "got", "bekommen"], ["grow", "grew", "grown", "wachsen"], ["have", "had", "had", "haben"],
  ["hear", "heard", "heard", "hören"], ["hide", "hid", "hidden", "verstecken"], ["hold", "held", "held", "halten"],
  ["keep", "kept", "kept", "behalten"], ["know", "knew", "known", "wissen"], ["leave", "left", "left", "verlassen"],
  ["lose", "lost", "lost", "verlieren"], ["make", "made", "made", "machen"], ["meet", "met", "met", "treffen"],
  ["pay", "paid", "paid", "bezahlen"], ["ride", "rode", "ridden", "reiten"], ["ring", "rang", "rung", "klingeln"],
  ["say", "said", "said", "sagen"], ["sell", "sold", "sold", "verkaufen"], ["send", "sent", "sent", "senden"],
  ["sit", "sat", "sat", "sitzen"], ["sleep", "slept", "slept", "schlafen"], ["stand", "stood", "stood", "stehen"],
  ["steal", "stole", "stolen", "stehlen"], ["teach", "taught", "taught", "unterrichten"], ["tell", "told", "told", "erzählen"],
  ["think", "thought", "thought", "denken"], ["throw", "threw", "thrown", "werfen"], ["understand", "understood", "understood", "verstehen"],
  ["wear", "wore", "worn", "tragen"], ["win", "won", "won", "gewinnen"], ["fight", "fought", "fought", "kämpfen"],
  ["build", "built", "built", "bauen"], ["spend", "spent", "spent", "verbringen"], ["cut", "cut", "cut", "schneiden"],
];

function englishGenerators(k) {
  // Fenster mit steigender Schwierigkeit: Kl.5 → Alltagswörter, Kl.10 → abstrakt
  const step = Math.floor((WORDS.length - 130) / 5); // 5 Schritte für Kl. 5–10
  const start = (k - 5) * step;
  const pool = WORDS.slice(start, start + 130);
  const verbStart = Math.min((k - 5) * 8, VERBS.length - 30);
  const verbs = VERBS.slice(verbStart, verbStart + 30);

  function distractEn(r, correct) {
    const out = new Set();
    while (out.size < 3) {
      const w = r.pick(pool)[1];
      if (w !== correct) out.add(w);
    }
    return [...out];
  }
  function distractDe(r, correct) {
    const out = new Set();
    while (out.size < 3) {
      const w = r.pick(pool)[0];
      if (w !== correct) out.add(w);
    }
    return [...out];
  }

  return [
    (r) => { const [de, en] = r.pick(pool); return mc(r, "Vokabeln", `Was heißt „${de}“ auf Englisch?`, en, distractEn(r, en), `„${de}“ heißt auf Englisch „${en}“.`); },
    (r) => { const [de, en] = r.pick(pool); return mc(r, "Vokabeln", `Wähle die richtige englische Übersetzung von „${de}“.`, en, distractEn(r, en), `„${de}“ = „${en}“.`); },
    (r) => { const [de, en] = r.pick(pool); return mc(r, "Vokabeln", `Welches englische Wort bedeutet „${de}“?`, en, distractEn(r, en), `„${de}“ bedeutet „${en}“.`); },
    (r) => { const [de, en] = r.pick(pool); return mc(r, "Vokabeln", `Ergänze: The English word for „${de}“ is ___.`, en, distractEn(r, en), `„${de}“ heißt „${en}“.`); },
    (r) => { const [de, en] = r.pick(pool); return mc(r, "Vokabeln", `Was bedeutet „${en}“ auf Deutsch?`, de, distractDe(r, de), `„${en}“ bedeutet „${de}“.`); },
    (r) => { const [de, en] = r.pick(pool); return mc(r, "Vokabeln", `Wähle die richtige deutsche Übersetzung von „${en}“.`, de, distractDe(r, de), `„${en}“ = „${de}“.`); },
    (r) => { const [de, en] = r.pick(pool); return mc(r, "Vokabeln", `Welche deutsche Bedeutung passt zu „${en}“?`, de, distractDe(r, de), `„${en}“ heißt „${de}“.`); },
    // Unregelmäßige Verben
    (r) => {
      const [inf, past, , de] = r.pick(verbs);
      const wrong = new Set();
      while (wrong.size < 3) { const w = r.pick(VERBS); if (w[1] !== past) wrong.add(w[1] === w[0] ? w[0] + "ed" : w[1]); }
      return mc(r, "Unregelmäßige Verben", `Wie lautet das Simple Past von „${inf}“ (${de})?`, past, [...wrong], `„${inf}“ ist unregelmäßig: ${inf} – ${past}.`);
    },
    (r) => {
      const [inf, , part, de] = r.pick(verbs);
      const wrong = new Set([inf + "ed"]);
      while (wrong.size < 3) { const w = r.pick(VERBS); if (w[2] !== part) wrong.add(w[2]); }
      return mc(r, "Unregelmäßige Verben", `Wie lautet das Past Participle von „${inf}“ (${de})?`, part, [...wrong].filter((w) => w !== part).slice(0, 3), `„${inf}“ ist unregelmäßig: ${inf} – ${part} (3. Form).`);
    },
    (r) => {
      const [inf, past] = r.pick(verbs);
      return mc(r, "Unregelmäßige Verben", `Ergänze im Simple Past: Yesterday she ___ (${inf}).`, past, [inf + "s", inf + "ing", "will " + inf], `Simple Past von „${inf}“ ist „${past}“.`);
    },
  ];
}

/* ────────────────────────── PHYSIK ────────────────────────── */

function physicsGenerators(k) {
  const gens = [
    // v = s / t
    (r) => {
      const t = r.int(2, 8); const v = r.int(5, 40); const s = v * t;
      return mc(r, "Geschwindigkeit", `Ein Fahrzeug legt ${s} km in ${t} Stunden zurück. Wie groß ist die Geschwindigkeit?`, `${v} km/h`, [`${s * t} km/h`, `${v + 5} km/h`, `${v - 2} km/h`], `v = s/t = ${s} km / ${t} h = ${v} km/h.`);
    },
    (r) => {
      const t = r.int(2, 9); const v = r.int(10, 90); const s = v * t;
      return mc(r, "Geschwindigkeit", `Ein Zug fährt ${t} Stunden lang mit ${v} km/h. Welche Strecke legt er zurück?`, `${s} km`, [`${v + t} km`, `${s + v} km`, `${Math.round(s / 2)} km`], `s = v · t = ${v} km/h · ${t} h = ${s} km.`);
    },
    (r) => {
      const t = r.int(2, 8); const v = r.int(4, 25); const s = v * t;
      return mc(r, "Geschwindigkeit", `Ein Radfahrer fährt ${s} km mit ${v} km/h. Wie lange braucht er?`, `${t} h`, [`${t + 1} h`, `${t - 1} h`, `${s - v} h`], `t = s/v = ${s} km / ${v} km/h = ${t} h.`);
    },
    // Dichte
    (r) => {
      const V = r.int(2, 50); const rho = r.pick([0.7, 0.9, 1, 2.7, 7.9, 8.9, 11.3, 19.3]);
      const m = Math.round(rho * V * 10) / 10;
      return mc(r, "Dichte", `Ein Körper hat das Volumen ${V} cm³ und die Masse ${fmt(m)} g. Welche Dichte hat er?`, `${fmt(rho)} g/cm³`, [`${fmt(rho * 2)} g/cm³`, `${fmt(rho + 0.5)} g/cm³`, `${fmt(Math.round(m * V * 10) / 10)} g/cm³`], `ρ = m/V = ${fmt(m)} g / ${V} cm³ = ${fmt(rho)} g/cm³.`);
    },
    (r) => {
      const V = r.int(2, 40); const rho = r.pick([1, 2.7, 7.9, 8.9, 11.3]);
      const m = Math.round(rho * V * 10) / 10;
      return mc(r, "Dichte", `Wie groß ist die Masse eines Körpers mit ρ = ${fmt(rho)} g/cm³ und V = ${V} cm³?`, `${fmt(m)} g`, [`${fmt(rho + V)} g`, `${fmt(m * 10)} g`, `${fmt(Math.round((m / 2) * 10) / 10)} g`], `m = ρ · V = ${fmt(rho)} · ${V} = ${fmt(m)} g.`);
    },
  ];
  if (k >= 8) {
    gens.push(
      // Ohmsches Gesetz
      (r) => {
        const I = r.pick([0.5, 1, 2, 3, 4, 5]); const R = r.int(2, 100);
        const U = Math.round(I * R * 10) / 10;
        return mc(r, "Ohmsches Gesetz", `Durch einen Widerstand von ${R} Ω fließt ein Strom von ${fmt(I)} A. Wie groß ist die Spannung?`, `${fmt(U)} V`, [`${fmt(R / I)} V`, `${fmt(U * 2)} V`, `${fmt(U + 5)} V`], `U = R · I = ${R} Ω · ${fmt(I)} A = ${fmt(U)} V.`);
      },
      (r) => {
        const I = r.pick([0.5, 1, 2, 4, 5]); const R = r.int(3, 80);
        const U = Math.round(I * R * 10) / 10;
        return mc(r, "Ohmsches Gesetz", `An einem Widerstand liegen ${fmt(U)} V an, es fließen ${fmt(I)} A. Wie groß ist der Widerstand?`, `${R} Ω`, [`${fmt(Math.round(U * I * 10) / 10)} Ω`, `${R + 5} Ω`, `${R - 2} Ω`], `R = U/I = ${fmt(U)} V / ${fmt(I)} A = ${R} Ω.`);
      },
      (r) => {
        const R = r.pick([2, 4, 5, 10, 20, 25, 50]); const I = r.int(1, 6);
        const U = R * I;
        return mc(r, "Ohmsches Gesetz", `U = ${U} V, R = ${R} Ω. Wie groß ist die Stromstärke I?`, `${I} A`, [`${U * R} A`, `${I + 1} A`, `${I + 2} A`], `I = U/R = ${U} V / ${R} Ω = ${I} A.`);
      }
    );
  }
  if (k >= 9) {
    gens.push(
      (r) => {
        const U = r.pick([12, 24, 110, 230]); const I = r.pick([0.5, 1, 2, 3, 5, 10]);
        const P = Math.round(U * I * 10) / 10;
        return mc(r, "Elektrische Leistung", `Ein Gerät wird mit ${U} V betrieben, es fließen ${fmt(I)} A. Welche Leistung hat es?`, `${fmt(P)} W`, [`${fmt(U / I)} W`, `${fmt(P * 2)} W`, `${fmt(P + 20)} W`], `P = U · I = ${U} V · ${fmt(I)} A = ${fmt(P)} W.`);
      },
      (r) => {
        const P = r.pick([100, 200, 500, 1000, 1500, 2000]); const t = r.int(2, 10);
        const W = (P * t) / 1000;
        return mc(r, "Elektrische Energie", `Ein Gerät mit ${P} W läuft ${t} Stunden. Wie viel Energie verbraucht es in kWh?`, `${fmt(W)} kWh`, [`${fmt(P * t)} kWh`, `${fmt(W * 2)} kWh`, `${fmt(W + 1)} kWh`], `E = P · t = ${P} W · ${t} h = ${P * t} Wh = ${fmt(W)} kWh.`);
      }
    );
  }
  if (k >= 10) {
    gens.push((r) => {
      const m = r.int(2, 50);
      const F = Math.round(m * 9.81 * 100) / 100;
      return mc(r, "Kräfte", `Welche Gewichtskraft wirkt auf einen Körper der Masse ${m} kg? (g = 9,81 N/kg)`, `${fmt(F)} N`, [`${fmt(m)} N`, `${fmt(m * 10)} N`, `${fmt(Math.round(F / 2 * 100) / 100)} N`], `F = m · g = ${m} kg · 9,81 N/kg = ${fmt(F)} N.`);
    });
  }
  return gens;
}

/* ────────────────────────── CHEMIE ────────────────────────── */

// Atommassen (gerundet, g/mol)
const ELEMENTS = { H: 1, C: 12, N: 14, O: 16, F: 19, Na: 23, Mg: 24, Al: 27, Si: 28, P: 31, S: 32, Cl: 35.5, K: 39, Ca: 40, Fe: 56, Cu: 63.5, Zn: 65, Ag: 108, I: 127, Ba: 137, Pb: 207 };

/** Parst eine Summenformel inkl. Klammern, z.B. Al2(SO4)3 → {Al:2,S:3,O:12}. */
function parseFormula(f) {
  const counts = {};
  function add(el, n) { counts[el] = (counts[el] || 0) + n; }
  let i = 0;
  function block(mult) {
    while (i < f.length && f[i] !== ")") {
      if (f[i] === "(") {
        i++;
        const inner = {};
        const save = counts; // rekursiv über zweite Map wäre schöner; einfacher Trick:
        // wir parsen die Klammer separat
        let depth = 1; let sub = "";
        while (i < f.length && depth > 0) {
          if (f[i] === "(") depth++;
          if (f[i] === ")") { depth--; if (depth === 0) break; }
          sub += f[i]; i++;
        }
        i++; // schließende Klammer
        let num = "";
        while (i < f.length && /\d/.test(f[i])) { num += f[i]; i++; }
        const m = (num ? parseInt(num, 10) : 1) * mult;
        const subCounts = parseFormula(sub);
        for (const [el, n] of Object.entries(subCounts)) add(el, n * m);
        void inner; void save;
        continue;
      }
      let el = f[i]; i++;
      if (i < f.length && /[a-z]/.test(f[i])) { el += f[i]; i++; }
      let num = "";
      while (i < f.length && /\d/.test(f[i])) { num += f[i]; i++; }
      add(el, (num ? parseInt(num, 10) : 1) * mult);
    }
  }
  block(1);
  return counts;
}

function molarMass(formula) {
  let m = 0;
  for (const [el, n] of Object.entries(parseFormula(formula))) {
    if (!(el in ELEMENTS)) throw new Error(`Unbekanntes Element ${el}`);
    m += ELEMENTS[el] * n;
  }
  return Math.round(m * 10) / 10;
}

const COMPOUNDS = [
  ["H2O", "Wasser"], ["CO2", "Kohlenstoffdioxid"], ["O2", "Sauerstoff"], ["N2", "Stickstoff"], ["H2", "Wasserstoff"],
  ["NaCl", "Natriumchlorid (Kochsalz)"], ["HCl", "Chlorwasserstoff"], ["NH3", "Ammoniak"], ["CH4", "Methan"], ["C2H6", "Ethan"],
  ["C3H8", "Propan"], ["C4H10", "Butan"], ["C2H5OH", "Ethanol"], ["C6H12O6", "Glucose"], ["CaCO3", "Calciumcarbonat (Kalk)"],
  ["CaO", "Calciumoxid"], ["MgO", "Magnesiumoxid"], ["Al2O3", "Aluminiumoxid"], ["Fe2O3", "Eisen(III)-oxid (Rost)"], ["FeS", "Eisensulfid"],
  ["SO2", "Schwefeldioxid"], ["SO3", "Schwefeltrioxid"], ["H2SO4", "Schwefelsäure"], ["HNO3", "Salpetersäure"], ["NaOH", "Natronlauge (Natriumhydroxid)"],
  ["KOH", "Kaliumhydroxid"], ["KCl", "Kaliumchlorid"], ["MgCl2", "Magnesiumchlorid"], ["CaCl2", "Calciumchlorid"], ["Na2CO3", "Natriumcarbonat (Soda)"],
  ["NaHCO3", "Natriumhydrogencarbonat (Natron)"], ["CuO", "Kupfer(II)-oxid"], ["CuSO4", "Kupfersulfat"], ["ZnO", "Zinkoxid"], ["ZnS", "Zinksulfid"],
  ["AgCl", "Silberchlorid"], ["AgNO3", "Silbernitrat"], ["BaSO4", "Bariumsulfat"], ["PbO", "Blei(II)-oxid"], ["P2O5", "Phosphorpentoxid"],
  ["NO2", "Stickstoffdioxid"], ["N2O", "Lachgas (Distickstoffmonoxid)"], ["H2O2", "Wasserstoffperoxid"], ["Ca(OH)2", "Calciumhydroxid (Kalkwasser)"], ["Mg(OH)2", "Magnesiumhydroxid"],
  ["Al2(SO4)3", "Aluminiumsulfat"], ["K2CO3", "Kaliumcarbonat (Pottasche)"], ["Na2SO4", "Natriumsulfat"], ["NH4Cl", "Ammoniumchlorid (Salmiak)"], ["SiO2", "Siliciumdioxid (Quarz)"],
];

// Ausbalancierte Gleichungen: [Gleichung mit "?" an einer Stelle, richtiger Koeffizient, volle Gleichung]
const EQUATIONS = [
  ["? H₂ + O₂ → 2 H₂O", 2, "2 H₂ + O₂ → 2 H₂O"],
  ["2 H₂ + O₂ → ? H₂O", 2, "2 H₂ + O₂ → 2 H₂O"],
  ["? Na + Cl₂ → 2 NaCl", 2, "2 Na + Cl₂ → 2 NaCl"],
  ["CH₄ + ? O₂ → CO₂ + 2 H₂O", 2, "CH₄ + 2 O₂ → CO₂ + 2 H₂O"],
  ["CH₄ + 2 O₂ → CO₂ + ? H₂O", 2, "CH₄ + 2 O₂ → CO₂ + 2 H₂O"],
  ["? Mg + O₂ → 2 MgO", 2, "2 Mg + O₂ → 2 MgO"],
  ["4 Al + ? O₂ → 2 Al₂O₃", 3, "4 Al + 3 O₂ → 2 Al₂O₃"],
  ["? Al + 3 O₂ → 2 Al₂O₃", 4, "4 Al + 3 O₂ → 2 Al₂O₃"],
  ["4 Fe + 3 O₂ → ? Fe₂O₃", 2, "4 Fe + 3 O₂ → 2 Fe₂O₃"],
  ["? Fe + 3 O₂ → 2 Fe₂O₃", 4, "4 Fe + 3 O₂ → 2 Fe₂O₃"],
  ["N₂ + ? H₂ → 2 NH₃", 3, "N₂ + 3 H₂ → 2 NH₃"],
  ["N₂ + 3 H₂ → ? NH₃", 2, "N₂ + 3 H₂ → 2 NH₃"],
  ["2 K + 2 H₂O → 2 KOH + ? H₂", 1, "2 K + 2 H₂O → 2 KOH + H₂"],
  ["C₃H₈ + ? O₂ → 3 CO₂ + 4 H₂O", 5, "C₃H₈ + 5 O₂ → 3 CO₂ + 4 H₂O"],
  ["C₃H₈ + 5 O₂ → ? CO₂ + 4 H₂O", 3, "C₃H₈ + 5 O₂ → 3 CO₂ + 4 H₂O"],
  ["C₃H₈ + 5 O₂ → 3 CO₂ + ? H₂O", 4, "C₃H₈ + 5 O₂ → 3 CO₂ + 4 H₂O"],
  ["2 C₂H₆ + ? O₂ → 4 CO₂ + 6 H₂O", 7, "2 C₂H₆ + 7 O₂ → 4 CO₂ + 6 H₂O"],
  ["? Cu + O₂ → 2 CuO", 2, "2 Cu + O₂ → 2 CuO"],
  ["? H₂O₂ → 2 H₂O + O₂", 2, "2 H₂O₂ → 2 H₂O + O₂"],
  ["Zn + ? HCl → ZnCl₂ + H₂", 2, "Zn + 2 HCl → ZnCl₂ + H₂"],
  ["Mg + ? HCl → MgCl₂ + H₂", 2, "Mg + 2 HCl → MgCl₂ + H₂"],
  ["CaCO₃ → CaO + ? CO₂", 1, "CaCO₃ → CaO + CO₂"],
  ["? Na + 2 H₂O → 2 NaOH + H₂", 2, "2 Na + 2 H₂O → 2 NaOH + H₂"],
  ["S + ? O₂ → SO₂", 1, "S + O₂ → SO₂"],
  ["2 SO₂ + ? O₂ → 2 SO₃", 1, "2 SO₂ + O₂ → 2 SO₃"],
];

function chemistryGenerators(k) {
  // ab Kl. 9 auch komplexere Formeln
  const pool = k <= 8 ? COMPOUNDS.filter(([f]) => !f.includes("(") && molarMass(f) <= 200) : COMPOUNDS;
  const gens = [
    (r) => {
      const [f, name] = r.pick(pool);
      const M = molarMass(f);
      return mc(r, "Molare Masse", `Welche molare Masse hat ${name} (${f})? (Atommassen gerundet)`, `${fmt(M)} g/mol`, [`${fmt(M + 2)} g/mol`, `${fmt(M - 2)} g/mol`, `${fmt(M + 16)} g/mol`], `M(${f}) = ${Object.entries(parseFormula(f)).map(([el, n]) => `${n}·${fmt(ELEMENTS[el])}`).join(" + ")} = ${fmt(M)} g/mol.`);
    },
    (r) => {
      const [f, name] = r.pick(pool);
      const M = molarMass(f);
      const n = r.pick([0.5, 1, 2, 3, 4, 5, 10]);
      const m = Math.round(M * n * 10) / 10;
      return mc(r, "Stoffmenge", `Wie viel Gramm sind ${fmt(n)} mol ${name} (${f})? (M = ${fmt(M)} g/mol)`, `${fmt(m)} g`, [`${fmt(M)} g`, `${fmt(m * 2)} g`, `${fmt(m + 10)} g`], `m = n · M = ${fmt(n)} mol · ${fmt(M)} g/mol = ${fmt(m)} g.`);
    },
    (r) => {
      const [f, name] = r.pick(pool);
      const M = molarMass(f);
      const n = r.pick([0.5, 1, 2, 4, 5]);
      const m = Math.round(M * n * 10) / 10;
      return mc(r, "Stoffmenge", `Wie viel mol sind ${fmt(m)} g ${name} (${f})? (M = ${fmt(M)} g/mol)`, `${fmt(n)} mol`, [`${fmt(n * 2)} mol`, `${fmt(n + 1)} mol`, `${fmt(Math.round(n / 2 * 100) / 100)} mol`], `n = m/M = ${fmt(m)} g / ${fmt(M)} g/mol = ${fmt(n)} mol.`);
    },
    (r) => {
      const [f, name] = r.pick(pool);
      const counts = parseFormula(f);
      const els = Object.keys(counts);
      const el = r.pick(els);
      const v = counts[el];
      return mc(r, "Summenformeln", `Wie viele ${el}-Atome enthält eine Formeleinheit ${name} (${f})?`, v, [v + 1, v + 2, Math.max(1, v - 1)].map(fmt), `Aus der Formel ${f} ablesen: ${v} × ${el}.`);
    },
    (r) => {
      const [eq, coef, full] = r.pick(EQUATIONS);
      const wrong = [coef + 1, coef + 2, Math.max(1, coef - 1)].filter((w) => w !== coef).slice(0, 3);
      while (wrong.length < 3) wrong.push(coef + wrong.length + 1);
      return mc(r, "Reaktionsgleichungen", `Welcher Koeffizient gehört an die Stelle des „?“: ${eq}`, coef, wrong.map(fmt), `Ausgeglichen lautet die Gleichung: ${full}.`);
    },
  ];
  if (k >= 9) {
    gens.push((r) => {
      const [f, name] = r.pick(pool);
      const counts = parseFormula(f);
      const els = Object.keys(counts);
      if (els.length < 2) return null;
      const el = r.pick(els);
      const M = molarMass(f);
      const anteil = Math.round(((ELEMENTS[el] * counts[el]) / M) * 1000) / 10;
      return mc(r, "Massenanteil", `Wie groß ist der Massenanteil von ${el} in ${name} (${f})? (gerundet)`, `${fmt(anteil)} %`, [`${fmt(Math.round((anteil / 2) * 10) / 10)} %`, `${fmt(Math.min(99, anteil + 10))} %`, `${fmt(Math.max(1, anteil - 8))} %`], `w(${el}) = ${counts[el]}·${fmt(ELEMENTS[el])} / ${fmt(M)} = ${fmt(anteil)} %.`);
    });
  }
  return gens;
}

/* ────────────────────────── Hauptprogramm ────────────────────────── */

function writeBank(fach, klasse, questions) {
  const file = join(DATA_DIR, `${fach}-klasse${klasse}.json`);
  writeFileSync(file, JSON.stringify(questions, null, 1) + "\n");
  console.log(`  ${fach} Klasse ${klasse}: ${questions.length} Fragen → ${file}`);
  return questions.length;
}

function main() {
  mkdirSync(DATA_DIR, { recursive: true });
  let total = 0;

  console.log("Mathematik (Klasse 1–13, je >= 1000):");
  for (let k = 1; k <= 13; k++) {
    total += writeBank("mathematik", k, generateBank(1000 + k, 1000, mathGenerators(k)));
  }

  console.log("Englisch (Klasse 5–10, je >= 1000):");
  for (let k = 5; k <= 10; k++) {
    total += writeBank("englisch", k, generateBank(2000 + k, 1000, englishGenerators(k)));
  }

  console.log("Physik (Klasse 7–10, je >= 500):");
  for (let k = 7; k <= 10; k++) {
    total += writeBank("physik", k, generateBank(3000 + k, 500, physicsGenerators(k)));
  }

  console.log("Chemie (Klasse 7–10, je >= 500):");
  for (let k = 7; k <= 10; k++) {
    total += writeBank("chemie", k, generateBank(4000 + k, 500, chemistryGenerators(k)));
  }

  console.log(`\nGesamt: ${total} Fragen.`);
}

main();
