/**
 * MEGA-Fragen-Generator RUNDE 6 für MasterMind.
 *
 * Ergänzt die Fragenbank aus generate.mjs … generate5.mjs im GLEICHEN Format
 *   scripts/questions/mega/data/<fach>-klasse<k>.json
 * mit [{ topic, question, options[4], correct(Index), explanation }].
 *
 * Fächer/Umfang (nur NEUE Dateien, Bestehendes wird NICHT verändert):
 *   1) mathematik4  Klasse 1–4, >= 400/Klasse
 *      (Uhrzeiten, Geld/Wechselgeld, Längen/Gewichte umrechnen, Zahlenfolgen)
 *   2) informatik2  Klasse 11–13, >= 400/Klasse
 *      (SQL-SELECT-Ausgaben, Netzwerk/IP/Subnetz, O-Notation, Boolesche Algebra)
 *   3) biologie     Klasse 11–13, >= 400/Klasse
 *      (Genetik/Mendel berechnet, Ökologie, Neurobiologie, Evolution)
 *   4) englisch3    Klasse 7–10, >= 300/Klasse
 *      (UK/USA/Australien-Landeskunde, false friends)
 *   5) sport        Klasse 5–10, >= 250/Klasse
 *      (Regeln großer Sportarten, Trainingslehre ab Kl. 9, Puls-Rechnungen)
 *   6) technik      Klasse 5–10, >= 250/Klasse
 *      (Werkstoffe, Werkzeuge, technisches Zeichnen, Getriebe-Übersetzungen)
 *
 * Deterministisch (mulberry32-Seed). Keine Abhängigkeiten, reines Node.
 *
 * Aufruf (vom Repo-Root):
 *   node scripts/questions/mega/generate6.mjs
 * Danach Import wie gehabt:
 *   npx tsx scripts/questions/mega/import-mega.ts
 */

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
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

/** Baut eine MC-Frage aus korrekter Antwort + Distraktoren (Text). */
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

/** Zieht n eindeutige Elemente aus pool, ungleich `exclude`. */
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

/** Baut numerische Distraktoren nahe am Zielwert. */
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

/** Sammelt count Fragen mit eindeutigem Fragetext. */
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

/* ══════════════════ 1) MATHEMATIK Klasse 1–4 ══════════════════ */

function pad2(n) { return String(n).padStart(2, "0"); }
function fmtTime(h, m) { return `${pad2(h)}:${pad2(m)} Uhr`; }
function euro(cents) {
  const e = Math.floor(cents / 100);
  const c = cents % 100;
  return `${e},${pad2(c)} €`;
}

function mathematik4Generators(klasse) {
  const gens = [];

  // Uhrzeiten lesen (Umgangssprache -> digital)
  gens.push((r) => {
    const h = r.int(1, 12);
    const variants = [
      [0, `${h} Uhr`],
      [15, `Viertel nach ${h}`],
      [30, `halb ${h === 12 ? 1 : h + 1}`],
      [45, `Viertel vor ${h === 12 ? 1 : h + 1}`],
    ];
    const [min, phrase] = r.pick(variants);
    const correct = fmtTime(h % 12, min);
    const dist = [fmtTime(h % 12, (min + 15) % 60), fmtTime((h % 12) + 1, min), fmtTime(h % 12, (min + 45) % 60)];
    return mc(r, "Uhrzeit", `${r.pick(LEADS)}Wie schreibt man „${phrase}“ als Uhrzeit?`,
      correct, dist, `„${phrase}“ entspricht ${correct}.`);
  });

  // Uhrzeit-Rechnung: später
  gens.push((r) => {
    const h = r.int(6, 20);
    const m = r.int(0, 55);
    const add = r.int(1, 3) * 15;
    const total = h * 60 + m + add;
    const nh = Math.floor(total / 60) % 24;
    const nm = total % 60;
    const correct = fmtTime(nh, nm);
    const dist = [fmtTime((nh + 1) % 24, nm), fmtTime(nh, (nm + 10) % 60), fmtTime(nh === 0 ? 23 : nh - 1, nm)];
    return mc(r, "Uhrzeit rechnen", `${r.pick(LEADS)}Es ist ${fmtTime(h, m)}. Wie spät ist es in ${add} Minuten?`,
      correct, dist, `${h * 60 + m} + ${add} Minuten = ${correct}.`);
  });

  // Geld: Wechselgeld
  gens.push((r) => {
    const priceC = r.int(50, klasse >= 3 ? 4500 : 900);
    const paidE = Math.ceil(priceC / 100) + r.int(0, 5);
    const paidC = paidE * 100;
    if (paidC <= priceC) return null;
    const change = paidC - priceC;
    const correct = euro(change);
    const dist = [euro(change + r.int(1, 50)), euro(Math.max(0, change - r.int(1, 40))), euro(change + 100)];
    return mc(r, "Geld", `${r.pick(LEADS)}Eine Ware kostet ${euro(priceC)}. Du zahlst mit ${paidE} €. Wie viel Wechselgeld bekommst du?`,
      correct, dist, `${paidE},00 € − ${euro(priceC)} = ${correct}.`);
  });

  // Geld: Summe
  gens.push((r) => {
    const a = r.int(20, 800);
    const b = r.int(20, 800);
    const sum = a + b;
    const correct = euro(sum);
    const dist = [euro(sum + r.int(5, 60)), euro(sum - r.int(5, 19)), euro(a * 2)];
    return mc(r, "Geld", `${r.pick(LEADS)}Du kaufst zwei Dinge für ${euro(a)} und ${euro(b)}. Was kostet alles zusammen?`,
      correct, dist, `${euro(a)} + ${euro(b)} = ${correct}.`);
  });

  // Längen umrechnen
  gens.push((r) => {
    const kinds = [
      ["m", "cm", 100],
      ["cm", "mm", 10],
      ["km", "m", 1000],
      ["m", "mm", 1000],
    ];
    const [from, to, factor] = r.pick(kinds);
    const val = r.int(1, klasse >= 3 ? 40 : 9);
    const correct = val * factor;
    const dist = [val * factor * 10, Math.round(val * factor / 10), val + factor];
    return mc(r, "Längen", `${r.pick(LEADS)}Wie viel ${to} sind ${val} ${from}?`,
      `${correct} ${to}`, dist.map((d) => `${d} ${to}`), `1 ${from} = ${factor} ${to}, also ${val} ${from} = ${correct} ${to}.`);
  });

  // Gewichte umrechnen
  gens.push((r) => {
    const kinds = [
      ["kg", "g", 1000],
      ["t", "kg", 1000],
      ["g", "mg", 1000],
    ];
    const [from, to, factor] = r.pick(kinds);
    const val = r.int(1, klasse >= 3 ? 25 : 8);
    const correct = val * factor;
    const dist = [val * factor * 10, Math.round(val * factor / 10), val * 100];
    return mc(r, "Gewichte", `${r.pick(LEADS)}Wie viel ${to} sind ${val} ${from}?`,
      `${correct} ${to}`, dist.map((d) => `${d} ${to}`), `1 ${from} = ${factor} ${to}, also ${val} ${from} = ${correct} ${to}.`);
  });

  // Zahlenfolgen fortsetzen (arithmetisch)
  gens.push((r) => {
    const start = r.int(1, klasse >= 3 ? 90 : 15);
    const step = r.pick(klasse >= 3 ? [2, 3, 4, 5, 10, 25, -3, -5] : [1, 2, 3, 5, -2]);
    const seq = [start, start + step, start + 2 * step, start + 3 * step];
    const correct = start + 4 * step;
    const dist = numDistractors(r, correct, Math.max(2, Math.abs(step) + 3)).map(String);
    return mc(r, "Zahlenfolgen", `${r.pick(LEADS)}Setze die Zahlenfolge fort: ${seq.join(", ")}, ___`,
      String(correct), dist, `Es wird jeweils ${step > 0 ? "+" : ""}${step} gerechnet, also ${seq[3]} ${step > 0 ? "+" : "−"} ${Math.abs(step)} = ${correct}.`);
  });

  // Zahlenfolgen fortsetzen (Verdopplung) ab Kl. 3
  if (klasse >= 3) {
    gens.push((r) => {
      const start = r.int(1, 6);
      const seq = [start, start * 2, start * 4, start * 8];
      const correct = start * 16;
      const dist = [String(start * 12), String(start * 8 + 2), String(start * 32)];
      return mc(r, "Zahlenfolgen", `${r.pick(LEADS)}Setze die Zahlenfolge fort: ${seq.join(", ")}, ___`,
        String(correct), dist, `Jede Zahl wird verdoppelt, also ${seq[3]} · 2 = ${correct}.`);
    });
  }

  return gens;
}

/* ══════════════════ 2) INFORMATIK Klasse 11–13 ══════════════════ */

function informatik2Generators(klasse) {
  const gens = [];

  // SQL: COUNT
  const TAB_SCHUELER = [
    ["Anna", 16, "10a"], ["Ben", 17, "10a"], ["Clara", 16, "10b"],
    ["David", 18, "10b"], ["Emma", 17, "10a"], ["Finn", 16, "10b"],
  ];
  gens.push((r) => {
    const klasseFilter = r.pick(["10a", "10b"]);
    const count = TAB_SCHUELER.filter((s) => s[2] === klasseFilter).length;
    return mc(r, "SQL", `${r.pick(LEADS)}Tabelle schueler(name, alter, klasse) hat 6 Zeilen. Was liefert: SELECT COUNT(*) FROM schueler WHERE klasse='${klasseFilter}'; (drei Schüler pro Klasse)?`,
      "3", ["2", "6", "4"], `In der Klasse ${klasseFilter} befinden sich 3 Schüler.`);
  });

  // SQL: WHERE alter > x
  gens.push((r) => {
    const grenze = r.pick([16, 17]);
    const count = TAB_SCHUELER.filter((s) => s[1] > grenze).length;
    return mc(r, "SQL", `${r.pick(LEADS)}Für Tabelle schueler mit Altern {16,17,16,18,17,16}: Wie viele Zeilen liefert SELECT * FROM schueler WHERE alter > ${grenze};?`,
      String(count), numDistractors(r, count, 3).map(String), `Werte > ${grenze}: ${TAB_SCHUELER.filter((s) => s[1] > grenze).length} Einträge.`);
  });

  // SQL: MAX / MIN
  gens.push((r) => {
    const alters = TAB_SCHUELER.map((s) => s[1]);
    const fn = r.pick(["MAX", "MIN"]);
    const correct = fn === "MAX" ? Math.max(...alters) : Math.min(...alters);
    return mc(r, "SQL", `${r.pick(LEADS)}Alter in schueler: {16,17,16,18,17,16}. Was liefert SELECT ${fn}(alter) FROM schueler;?`,
      String(correct), numDistractors(r, correct, 2).map(String), `${fn} der Werte ist ${correct}.`);
  });

  // SQL: ORDER BY LIMIT
  gens.push((r) => {
    return mc(r, "SQL", `${r.pick(LEADS)}Was bewirkt „ORDER BY alter DESC LIMIT 1“?`,
      "Liefert die Zeile mit dem höchsten Alter",
      ["Liefert die Zeile mit dem niedrigsten Alter", "Löscht die älteste Zeile", "Zählt alle Zeilen"],
      "DESC sortiert absteigend, LIMIT 1 nimmt die erste (also größte) Zeile.");
  });

  // Netzwerk: private IP erkennen
  gens.push((r) => {
    const privat = r.pick(["192.168.1.10", "10.0.0.5", "172.16.4.1"]);
    const oeff = ["8.8.8.8", "93.184.216.34", "1.1.1.1"];
    return mc(r, "Netzwerk", `${r.pick(LEADS)}Welche IP-Adresse gehört zu einem privaten Netz?`,
      privat, oeff, "Private Netze: 10.0.0.0/8, 172.16.0.0/12 und 192.168.0.0/16.");
  });

  // Netzwerk: Hosts in /24
  gens.push((r) => {
    const suffix = r.pick([24, 25, 26]);
    const hosts = Math.pow(2, 32 - suffix) - 2;
    return mc(r, "Netzwerk", `${r.pick(LEADS)}Wie viele nutzbare Host-Adressen hat ein IPv4-Netz mit Präfix /${suffix}?`,
      String(hosts), numDistractors(r, hosts, 30).filter((d) => d > 0).slice(0, 3).map(String),
      `2^(32−${suffix}) − 2 (Netz- und Broadcast-Adresse) = ${hosts}.`);
  });

  // Netzwerk: Subnetzmaske /24
  gens.push((r) => {
    const map = [[24, "255.255.255.0"], [16, "255.255.0.0"], [8, "255.0.0.0"], [25, "255.255.255.128"]];
    const [suffix, mask] = r.pick(map);
    const dist = map.filter((m) => m[0] !== suffix).map((m) => m[1]);
    return mc(r, "Netzwerk", `${r.pick(LEADS)}Welche Subnetzmaske gehört zum Präfix /${suffix}?`,
      mask, dist, `/${suffix} entspricht der Maske ${mask}.`);
  });

  // O-Notation zuordnen
  const O_ALGO = [
    ["Binäre Suche in einem sortierten Array", "O(log n)"],
    ["Zugriff auf ein Array-Element per Index", "O(1)"],
    ["Lineare Suche im Array", "O(n)"],
    ["Bubblesort im schlechtesten Fall", "O(n²)"],
    ["Zwei verschachtelte Schleifen über n Elemente", "O(n²)"],
    ["Mergesort", "O(n log n)"],
  ];
  gens.push((r) => {
    const [algo, o] = r.pick(O_ALGO);
    const dist = pickN(r, ["O(1)", "O(log n)", "O(n)", "O(n log n)", "O(n²)", "O(2^n)"], o, 3);
    return mc(r, "O-Notation", `${r.pick(LEADS)}Welche Zeitkomplexität hat: ${algo}?`,
      o, dist, `${algo}: ${o}.`);
  });

  // Boolesche Algebra vereinfachen
  const BOOL = [
    ["A ∧ A", "A"],
    ["A ∨ A", "A"],
    ["A ∧ 1", "A"],
    ["A ∨ 0", "A"],
    ["A ∧ 0", "0"],
    ["A ∨ 1", "1"],
    ["A ∧ ¬A", "0"],
    ["A ∨ ¬A", "1"],
    ["¬(¬A)", "A"],
    ["A ∨ (A ∧ B)", "A"],
    ["A ∧ (A ∨ B)", "A"],
  ];
  gens.push((r) => {
    const [term, res] = r.pick(BOOL);
    const dist = pickN(r, ["A", "B", "0", "1", "¬A", "A ∧ B", "A ∨ B"], res, 3);
    return mc(r, "Boolesche Algebra", `${r.pick(LEADS)}Vereinfache den Ausdruck: ${term}`,
      res, dist, `${term} = ${res}.`);
  });

  // De Morgan
  gens.push((r) => {
    const forms = [
      ["¬(A ∧ B)", "¬A ∨ ¬B"],
      ["¬(A ∨ B)", "¬A ∧ ¬B"],
    ];
    const [term, res] = r.pick(forms);
    const dist = ["¬A ∧ ¬B", "¬A ∨ ¬B", "A ∧ B", "A ∨ B"].filter((x) => x !== res);
    return mc(r, "Boolesche Algebra", `${r.pick(LEADS)}Wende das Gesetz von De Morgan an: ${term} = ?`,
      res, dist, `De Morgan: ${term} = ${res}.`);
  });

  // SQL SUM über zufällige Inline-Tabelle (berechnet)
  gens.push((r) => {
    const werte = Array.from({ length: r.int(4, 6) }, () => r.int(1, 40));
    const sum = werte.reduce((a, b) => a + b, 0);
    return mc(r, "SQL", `${r.pick(LEADS)}Die Spalte punkte enthält die Werte {${werte.join(", ")}}. Was liefert SELECT SUM(punkte) FROM t;?`,
      String(sum), numDistractors(r, sum, 12).map(String), `Die Summe der Werte ist ${sum}.`);
  });

  // SQL AVG (teilbar) berechnet
  gens.push((r) => {
    const n = r.int(3, 5);
    const avg = r.int(5, 30);
    const werte = Array.from({ length: n }, () => avg + r.int(-3, 3) * n / n); // Platzhalter
    // Baue Werte so, dass die Summe = avg*n ist
    let rest = avg * n;
    const vals = [];
    for (let i = 0; i < n - 1; i++) { const v = r.int(1, Math.min(rest - (n - 1 - i), avg * 2)); vals.push(v); rest -= v; }
    vals.push(rest);
    if (vals.some((v) => v <= 0)) return null;
    return mc(r, "SQL", `${r.pick(LEADS)}Die Spalte note enthält {${vals.join(", ")}}. Was liefert SELECT AVG(note) FROM t;?`,
      String(avg), numDistractors(r, avg, 5).map(String), `Durchschnitt = ${vals.join("+")} = ${avg * n}, geteilt durch ${n} = ${avg}.`);
  });

  // SQL COUNT WHERE > x über zufällige Tabelle
  gens.push((r) => {
    const werte = Array.from({ length: r.int(5, 7) }, () => r.int(1, 20));
    const grenze = r.int(5, 15);
    const count = werte.filter((v) => v > grenze).length;
    return mc(r, "SQL", `${r.pick(LEADS)}Die Spalte alter enthält {${werte.join(", ")}}. Wie viele Zeilen liefert SELECT COUNT(*) FROM t WHERE alter > ${grenze};?`,
      String(count), numDistractors(r, count, 3).filter((d) => d >= 0).slice(0, 3).map(String),
      `Werte > ${grenze}: ${werte.filter((v) => v > grenze).join(", ") || "keine"} → ${count}.`);
  });

  // Netzwerk: Netz-Adresse bei /24 (berechnet)
  gens.push((r) => {
    const a = r.int(1, 223); const b = r.int(0, 255); const c = r.int(0, 255); const d = r.int(1, 254);
    const ip = `${a}.${b}.${c}.${d}`;
    const netz = `${a}.${b}.${c}.0`;
    const dist = [`${a}.${b}.${c}.1`, `${a}.${b}.${c}.255`, `${a}.${b}.0.0`];
    return mc(r, "Netzwerk", `${r.pick(LEADS)}Wie lautet die Netz-Adresse zur IP ${ip} mit der Maske /24 (255.255.255.0)?`,
      netz, dist, `Bei /24 wird das letzte Oktett 0 gesetzt: ${netz}.`);
  });

  // Netzwerk: Broadcast-Adresse bei /24 (berechnet)
  gens.push((r) => {
    const a = r.int(1, 223); const b = r.int(0, 255); const c = r.int(0, 255); const d = r.int(1, 254);
    const ip = `${a}.${b}.${c}.${d}`;
    const bc = `${a}.${b}.${c}.255`;
    const dist = [`${a}.${b}.${c}.0`, `${a}.${b}.${c}.254`, `${a}.${b}.255.255`];
    return mc(r, "Netzwerk", `${r.pick(LEADS)}Wie lautet die Broadcast-Adresse zur IP ${ip} mit Präfix /24?`,
      bc, dist, `Bei /24 ist das letzte Oktett 255: ${bc}.`);
  });

  return gens;
}

/* ══════════════════ 3) BIOLOGIE Klasse 11–13 ══════════════════ */

function biologieGenerators(klasse) {
  const gens = [];

  // Mendel: monohybrid, dominant-rezessiv Phänotyp-Verhältnis F2
  gens.push((r) => {
    return mc(r, "Genetik", `${r.pick(LEADS)}Kreuzt man zwei mischerbige (heterozygote) Individuen Aa × Aa, welches Phänotyp-Verhältnis erhält man in der F2 bei dominant-rezessivem Erbgang?`,
      "3 : 1", ["1 : 1", "9 : 3 : 3 : 1", "1 : 2 : 1"],
      "Aa × Aa ergibt 1 AA : 2 Aa : 1 aa, also 3 dominante zu 1 rezessiven Phänotyp.");
  });

  // Mendel: Genotyp-Verhältnis F2
  gens.push((r) => {
    return mc(r, "Genetik", `${r.pick(LEADS)}Welches Genotyp-Verhältnis ergibt die Kreuzung Aa × Aa?`,
      "1 : 2 : 1 (AA : Aa : aa)", ["3 : 1", "1 : 1", "9 : 3 : 3 : 1"],
      "Das Punnett-Quadrat liefert 1 AA : 2 Aa : 1 aa.");
  });

  // Mendel: dihybrid
  gens.push((r) => {
    return mc(r, "Genetik", `${r.pick(LEADS)}Welches Phänotyp-Verhältnis erwartet man in der F2 einer dihybriden Kreuzung (AaBb × AaBb) bei unabhängiger Vererbung?`,
      "9 : 3 : 3 : 1", ["3 : 1", "1 : 2 : 1", "1 : 1 : 1 : 1"],
      "Bei zwei unabhängigen Merkmalen ergibt sich das klassische 9:3:3:1-Verhältnis.");
  });

  // Mendel: Rückkreuzung
  gens.push((r) => {
    return mc(r, "Genetik", `${r.pick(LEADS)}Bei der Kreuzung Aa × aa (Testkreuzung): Welches Phänotyp-Verhältnis ergibt sich?`,
      "1 : 1", ["3 : 1", "1 : 2 : 1", "9 : 3 : 3 : 1"],
      "Aa × aa liefert 1 Aa : 1 aa, also 1:1.");
  });

  // Mendel: reinerbig × reinerbig
  gens.push((r) => {
    return mc(r, "Genetik", `${r.pick(LEADS)}Kreuzt man zwei reinerbige Eltern AA × aa, wie sehen die F1-Individuen genotypisch aus?`,
      "alle Aa (heterozygot)", ["alle AA", "alle aa", "1 AA : 1 aa"],
      "Jedes Elternteil gibt nur einen Allel-Typ weiter, alle Nachkommen sind Aa.");
  });

  // Mendel berechnet: erwartete Anzahl rezessiver Nachkommen (Aa × Aa)
  gens.push((r) => {
    const n = r.int(2, 30) * 4;
    const rez = n / 4;
    return mc(r, "Genetik", `${r.pick(LEADS)}Kreuzung Aa × Aa: Wie viele von ${n} Nachkommen zeigen erwartungsgemäß den rezessiven Phänotyp?`,
      String(rez), numDistractors(r, rez, Math.max(3, n / 8)).filter((d) => d > 0).slice(0, 3).map(String),
      `Der rezessive Anteil beträgt 1/4, also ${n} · 1/4 = ${rez}.`);
  });

  // Mendel berechnet: erwartete Anzahl dominanter Nachkommen
  gens.push((r) => {
    const n = r.int(2, 30) * 4;
    const dom = 3 * n / 4;
    return mc(r, "Genetik", `${r.pick(LEADS)}Kreuzung Aa × Aa: Wie viele von ${n} Nachkommen zeigen erwartungsgemäß den dominanten Phänotyp?`,
      String(dom), numDistractors(r, dom, Math.max(3, n / 8)).filter((d) => d > 0).slice(0, 3).map(String),
      `Der dominante Anteil beträgt 3/4, also ${n} · 3/4 = ${dom}.`);
  });

  // Mendel berechnet: erwartete Anzahl heterozygoter (Aa) Nachkommen
  gens.push((r) => {
    const n = r.int(2, 30) * 4;
    const het = n / 2;
    return mc(r, "Genetik", `${r.pick(LEADS)}Kreuzung Aa × Aa: Wie viele von ${n} Nachkommen sind erwartungsgemäß mischerbig (Aa)?`,
      String(het), numDistractors(r, het, Math.max(3, n / 8)).filter((d) => d > 0).slice(0, 3).map(String),
      `Der Anteil Aa beträgt 1/2 (2 von 4), also ${n} · 1/2 = ${het}.`);
  });

  // Mendel dihybrid berechnet: beide dominant (9/16)
  gens.push((r) => {
    const n = r.int(2, 12) * 16;
    const both = 9 * n / 16;
    return mc(r, "Genetik", `${r.pick(LEADS)}Dihybride Kreuzung AaBb × AaBb: Wie viele von ${n} Nachkommen zeigen beide dominanten Merkmale (Verhältnis 9:3:3:1)?`,
      String(both), numDistractors(r, both, Math.max(4, n / 12)).filter((d) => d > 0).slice(0, 3).map(String),
      `Beide dominant = 9/16, also ${n} · 9/16 = ${both}.`);
  });

  // Genetik-Begriffe
  const GEN_BEGRIFFE = [
    ["Genotyp", "die genetische Ausstattung (Allelkombination) eines Organismus"],
    ["Phänotyp", "das äußere Erscheinungsbild eines Organismus"],
    ["homozygot", "reinerbig, beide Allele eines Gens sind gleich"],
    ["heterozygot", "mischerbig, die beiden Allele eines Gens sind verschieden"],
    ["dominant", "ein Allel, das sich im Phänotyp gegenüber dem anderen durchsetzt"],
    ["rezessiv", "ein Allel, das nur reinerbig im Phänotyp sichtbar wird"],
    ["Allel", "eine von mehreren Zustandsformen eines Gens"],
  ];
  gens.push((r) => {
    const [b, d] = r.pick(GEN_BEGRIFFE);
    return mc(r, "Genetik", `${r.pick(LEADS)}Was bedeutet der Begriff „${b}“?`,
      d, pickN(r, GEN_BEGRIFFE.map((x) => x[1]), d, 3), `${b}: ${d}.`);
  });

  // Ökologie-Begriffe
  const OEKO = [
    ["Biotop", "der Lebensraum einer Lebensgemeinschaft"],
    ["Biozönose", "die Lebensgemeinschaft aller Organismen eines Lebensraums"],
    ["Ökosystem", "Biotop und Biozönose als Wirkungsgefüge"],
    ["Produzenten", "autotrophe Organismen, die organische Stoffe aus anorganischen bilden"],
    ["Konsumenten", "heterotrophe Organismen, die sich von anderen Lebewesen ernähren"],
    ["Destruenten", "Organismen, die totes organisches Material abbauen"],
    ["Population", "alle Individuen einer Art in einem bestimmten Gebiet"],
    ["Symbiose", "Zusammenleben zweier Arten zum gegenseitigen Nutzen"],
    ["Parasitismus", "eine Art lebt auf Kosten einer anderen (Wirt)"],
    ["Konkurrenz", "Wettbewerb zwischen Organismen um begrenzte Ressourcen"],
  ];
  gens.push((r) => {
    const [b, d] = r.pick(OEKO);
    return mc(r, "Ökologie", `${r.pick(LEADS)}Was versteht man unter „${b}“?`,
      d, pickN(r, OEKO.map((x) => x[1]), d, 3), `${b}: ${d}.`);
  });
  gens.push((r) => {
    const [b, d] = r.pick(OEKO);
    return mc(r, "Ökologie", `${r.pick(LEADS)}Welcher Begriff wird beschrieben: ${d}?`,
      b, pickN(r, OEKO.map((x) => x[0]), b, 3), `${b}: ${d}.`);
  });

  // Neurobiologie-Faktenbank
  const NEURO = [
    ["Welcher Zellteil eines Neurons leitet Erregungen zum Zellkörper hin?", "Dendrit", ["Axon", "Synapse", "Myelinscheide"], "Dendriten empfangen Signale und leiten sie zum Soma."],
    ["Welcher Zellteil leitet das Aktionspotenzial vom Zellkörper weg?", "Axon", ["Dendrit", "Synapse", "Ranvier-Schnürring"], "Das Axon leitet Erregungen vom Soma weg."],
    ["Wie heißt die Kontaktstelle zwischen zwei Nervenzellen?", "Synapse", ["Axon", "Dendrit", "Soma"], "An der Synapse wird das Signal chemisch übertragen."],
    ["Welches Ion strömt beim Aktionspotenzial in der Depolarisation in die Zelle?", "Natrium (Na⁺)", ["Kalium (K⁺)", "Chlorid (Cl⁻)", "Calcium in den Muskel"], "Öffnende Na⁺-Kanäle lassen Natrium einströmen (Depolarisation)."],
    ["Welches Ion strömt bei der Repolarisation aus der Zelle?", "Kalium (K⁺)", ["Natrium (Na⁺)", "Chlorid (Cl⁻)", "Magnesium"], "K⁺-Ausstrom stellt das Ruhepotenzial wieder her."],
    ["Wie nennt man den chemischen Botenstoff an der Synapse?", "Neurotransmitter", ["Hormon", "Enzym", "Antikörper"], "Neurotransmitter übertragen das Signal über den synaptischen Spalt."],
    ["Was beschleunigt die Erregungsleitung entlang eines Axons?", "die Myelinscheide (saltatorische Erregungsleitung)", ["ein dünneres Axon", "weniger Ionen", "mehr Dendriten"], "Myelin ermöglicht die schnelle saltatorische Erregungsleitung."],
    ["Wie hoch ist das Ruhepotenzial eines typischen Neurons ungefähr?", "etwa −70 mV", ["etwa +30 mV", "0 mV", "etwa −140 mV"], "Das Ruhepotenzial liegt bei ca. −70 mV."],
  ];
  gens.push((r) => {
    const [q, a, d, e] = r.pick(NEURO);
    return mc(r, "Neurobiologie", `${r.pick(LEADS)}${q}`, a, r.shuffle(d), e);
  });

  // Evolution
  const EVO = [
    ["Wer formulierte die Theorie der natürlichen Selektion?", "Charles Darwin", ["Gregor Mendel", "Carl von Linné", "Jean-Baptiste Lamarck"], "Darwin begründete die Selektionstheorie (1859)."],
    ["Was versteht man unter „Selektion“?", "die naturbedingte Auslese der am besten angepassten Individuen", ["die zufällige Vermischung von Genen", "die künstliche Veränderung des Erbguts", "das Aussterben aller Arten"], "Selektion begünstigt besser angepasste Individuen."],
    ["Was sind homologe Organe?", "Organe gleicher Bauplan-Herkunft, aber ggf. unterschiedlicher Funktion", ["Organe gleicher Funktion, aber verschiedener Herkunft", "funktionslose Rückbildungen", "identische Organe ohne Verwandtschaft"], "Homologie beruht auf gemeinsamer Abstammung (z. B. Wirbeltier-Vordergliedmaßen)."],
    ["Was sind analoge Organe?", "Organe gleicher Funktion bei nicht näher verwandten Arten", ["Organe gleicher Herkunft", "reduzierte Rudimente", "Chromosomen-Paare"], "Analogie entsteht durch konvergente Anpassung (z. B. Vogel- und Insektenflügel)."],
    ["Was ist ein Rudiment?", "ein funktionslos gewordenes, zurückgebildetes Organ", ["ein neu entstandenes Organ", "ein besonders leistungsfähiges Organ", "ein Fossil"], "Rudimente (z. B. menschlicher Blinddarm-Wurmfortsatz) belegen die Evolution."],
    ["Was beschreibt die Gendrift?", "zufällige Änderung der Allelhäufigkeiten in kleinen Populationen", ["gerichtete Anpassung durch Selektion", "den Genaustausch zwischen Arten", "Mutation der DNA"], "Gendrift wirkt besonders stark in kleinen Populationen."],
    ["Was liefert die Grundlage (das 'Rohmaterial') der Evolution?", "Mutation und Rekombination", ["nur Selektion", "Gebrauch und Nichtgebrauch von Organen", "der Wille der Organismen"], "Mutationen und Rekombination erzeugen die genetische Variabilität."],
  ];
  gens.push((r) => {
    const [q, a, d, e] = r.pick(EVO);
    return mc(r, "Evolution", `${r.pick(LEADS)}${q}`, a, r.shuffle(d), e);
  });

  return gens;
}

/* ══════════════════ 4) ENGLISCH Landeskunde Kl. 7–10 ══════════════════ */

function englisch3Generators(klasse) {
  const gens = [];

  const LK = [
    ["What is the capital of the United Kingdom?", "London", ["Manchester", "Edinburgh", "Birmingham"], "London is the capital of the UK."],
    ["What is the capital of the USA?", "Washington, D.C.", ["New York", "Los Angeles", "Chicago"], "Washington, D.C. is the capital of the USA."],
    ["What is the capital of Australia?", "Canberra", ["Sydney", "Melbourne", "Perth"], "Canberra – not Sydney – is Australia's capital."],
    ["What is the capital of Scotland?", "Edinburgh", ["Glasgow", "London", "Cardiff"], "Edinburgh is Scotland's capital."],
    ["What is the capital of Wales?", "Cardiff", ["Swansea", "Newport", "London"], "Cardiff is the capital of Wales."],
    ["What is the capital of the Republic of Ireland?", "Dublin", ["Belfast", "Cork", "Galway"], "Dublin is the capital of the Republic of Ireland."],
    ["Which river flows through London?", "the Thames", ["the Severn", "the Hudson", "the Mersey"], "The Thames flows through London."],
    ["Where is the official residence of the British monarch in London?", "Buckingham Palace", ["The White House", "Downing Street", "Westminster Abbey"], "Buckingham Palace is the monarch's London residence."],
    ["Where does the US President live and work?", "The White House", ["Buckingham Palace", "Capitol Hill only", "Camp David"], "The White House is the President's residence."],
    ["What is the residence of the British Prime Minister?", "10 Downing Street", ["Buckingham Palace", "Westminster Abbey", "The White House"], "The PM lives at 10 Downing Street."],
    ["Which building houses the US Congress?", "The Capitol", ["The White House", "The Pentagon", "Wall Street"], "Congress meets in the Capitol."],
    ["When is Independence Day celebrated in the USA?", "4th of July", ["4th of June", "26th of January", "25th of December"], "The USA celebrates Independence Day on July 4th."],
    ["When is Thanksgiving celebrated in the USA?", "the fourth Thursday in November", ["the last Monday in May", "1st of January", "31st of October"], "US Thanksgiving is the fourth Thursday of November."],
    ["When is Australia Day celebrated?", "26th of January", ["4th of July", "1st of May", "25th of December"], "Australia Day is on 26 January."],
    ["What holiday is celebrated on 31st October?", "Halloween", ["Thanksgiving", "Easter", "Boxing Day"], "Halloween is on October 31st."],
    ["What is 'Boxing Day' and when is it?", "26th of December, the day after Christmas", ["a boxing match on New Year", "the last day of school", "US election day"], "Boxing Day (26 Dec) is a UK/Commonwealth holiday."],
    ["What is the largest city in Australia?", "Sydney", ["Canberra", "Perth", "Adelaide"], "Sydney is Australia's largest city (but not the capital)."],
    ["What famous opera house is in Sydney?", "the Sydney Opera House", ["the Royal Albert Hall", "Carnegie Hall", "the Globe Theatre"], "The Sydney Opera House is a landmark of Sydney."],
    ["Which US city is known as 'the Big Apple'?", "New York City", ["Los Angeles", "Boston", "Miami"], "New York is nicknamed 'the Big Apple'."],
    ["What is the national symbol animal of Australia often on its coat of arms?", "the kangaroo", ["the bald eagle", "the lion", "the kiwi"], "The kangaroo and emu appear on Australia's coat of arms."],
    ["What is the national bird of the USA?", "the bald eagle", ["the kangaroo", "the robin", "the swan"], "The bald eagle is the US national bird."],
    ["Which currency is used in the United Kingdom?", "the pound sterling (£)", ["the euro", "the US dollar", "the Australian dollar"], "The UK uses pounds sterling (£)."],
    ["Which flag is called the 'Union Jack'?", "the flag of the United Kingdom", ["the flag of the USA", "the flag of Australia", "the flag of Canada"], "The Union Jack is the UK's flag."],
    ["How many states does the USA have?", "50", ["48", "52", "13"], "The USA has 50 states."],
    ["What is the capital of Canada?", "Ottawa", ["Toronto", "Vancouver", "Montreal"], "Ottawa is the capital of Canada."],
    ["What is the capital of New Zealand?", "Wellington", ["Auckland", "Christchurch", "Hamilton"], "Wellington is New Zealand's capital."],
    ["What is the capital of Northern Ireland?", "Belfast", ["Dublin", "Cork", "Derry"], "Belfast is the capital of Northern Ireland."],
    ["Which ocean lies between the UK and the USA?", "the Atlantic Ocean", ["the Pacific Ocean", "the Indian Ocean", "the Arctic Ocean"], "The Atlantic Ocean separates the UK and the USA."],
    ["What is the tallest mountain in Australia?", "Mount Kosciuszko", ["Mount Everest", "Uluru", "Ben Nevis"], "Mount Kosciuszko is Australia's highest peak."],
    ["What is the famous large rock in central Australia called?", "Uluru (Ayers Rock)", ["Table Mountain", "Ben Nevis", "Mount Rushmore"], "Uluru is a sacred sandstone monolith in central Australia."],
    ["Which US monument shows four presidents' faces carved in rock?", "Mount Rushmore", ["the Statue of Liberty", "the Lincoln Memorial", "Uluru"], "Mount Rushmore depicts four US presidents."],
    ["Which statue in New York was a gift from France?", "the Statue of Liberty", ["Big Ben", "the Sphinx", "Christ the Redeemer"], "France gave the Statue of Liberty to the USA in 1886."],
    ["What is the famous clock tower at the Houses of Parliament often called?", "Big Ben", ["Big John", "the Eye", "the Shard"], "Big Ben is the nickname of the bell/clock tower in Westminster."],
    ["Which large Ferris wheel is a London landmark on the Thames?", "the London Eye", ["the Wheel of Fortune", "the Millennium Dome", "the Gherkin"], "The London Eye stands on the South Bank of the Thames."],
    ["What is the highest mountain in Scotland (and the UK)?", "Ben Nevis", ["Snowdon", "Scafell Pike", "Mount Kosciuszko"], "Ben Nevis is the highest mountain in the UK."],
    ["Which sport is associated with Wimbledon?", "tennis", ["cricket", "rugby", "golf"], "Wimbledon is a famous tennis tournament in London."],
    ["Which typically British sport uses a bat, wickets and is played in whites?", "cricket", ["baseball", "American football", "ice hockey"], "Cricket is a traditional British sport."],
    ["Which sport is hugely popular in the USA and played with helmets and a Super Bowl final?", "American football", ["cricket", "rugby league", "netball"], "American football's championship is the Super Bowl."],
    ["What is the currency of the USA?", "the US dollar ($)", ["the pound", "the euro", "the peso"], "The USA uses the US dollar."],
    ["What is the currency of Australia?", "the Australian dollar (A$)", ["the pound", "the euro", "the US dollar"], "Australia uses the Australian dollar."],
    ["Who is the head of state of the United Kingdom?", "the monarch (King/Queen)", ["the President", "the Prime Minister only", "the Chancellor"], "The UK is a constitutional monarchy; the monarch is head of state."],
    ["What do Americans call the season 'autumn'?", "fall", ["harvest", "spring", "downtime"], "In American English, autumn is called 'fall'."],
    ["What do British people call an 'elevator'?", "a lift", ["a stair", "a ramp", "a hoist"], "British English uses 'lift' for elevator."],
    ["What do Americans call a 'lorry'?", "a truck", ["a van only", "a cab", "a wagon"], "American English uses 'truck' for the British 'lorry'."],
    ["What do British people call the 'trunk' of a car?", "the boot", ["the hood", "the bonnet", "the deck"], "In British English the car's trunk is the 'boot'."],
    ["What do British people call an 'apartment'?", "a flat", ["a block", "a suite", "a lodge"], "British English uses 'flat' for apartment."],
    ["Which holiday is celebrated on 17 March, especially in Ireland?", "St Patrick's Day", ["Thanksgiving", "Anzac Day", "Independence Day"], "St Patrick's Day (17 March) is Ireland's national day."],
    ["What is commemorated on Anzac Day in Australia and New Zealand?", "the soldiers who served and died in wars", ["the founding of Sydney", "the Queen's birthday", "the gold rush"], "Anzac Day (25 April) honours Australian and NZ servicepeople."],
    ["Which festival on the first Monday of September is a US public holiday for workers?", "Labor Day", ["Boxing Day", "Guy Fawkes Night", "Australia Day"], "US Labor Day is the first Monday in September."],
    ["What is celebrated on 5 November in the UK with fireworks?", "Guy Fawkes Night (Bonfire Night)", ["Halloween", "Independence Day", "St Patrick's Day"], "Bonfire Night marks the failed Gunpowder Plot of 1605."],
    ["Which US city is famous for Hollywood and the film industry?", "Los Angeles", ["Chicago", "Boston", "Seattle"], "Hollywood is a district of Los Angeles."],
    ["Which UK city is famous as the birthplace of the Beatles?", "Liverpool", ["Manchester", "Leeds", "Bristol"], "The Beatles came from Liverpool."],
    ["What is the name of the US national parliament?", "Congress", ["Parliament", "the Senate only", "the Bundestag"], "The US legislature is called Congress (Senate + House)."],
    ["What is the name of the UK national parliament?", "Parliament (Westminster)", ["Congress", "the Assembly", "the Diet"], "The UK Parliament sits at Westminster."],
    ["What colour are traditional London taxis and buses?", "the buses are red", ["the buses are yellow", "the buses are green", "the buses are blue"], "London's iconic double-decker buses are red."],
    ["What colour are the famous New York City taxis?", "yellow", ["black", "red", "green"], "New York taxis are traditionally yellow cabs."],
  ];
  gens.push((r) => {
    const [q, a, d, e] = r.pick(LK);
    return mc(r, "Landeskunde", `${r.pick(LEADS)}${q}`, a, r.shuffle(d), e);
  });

  // false friends
  const FF = [
    ["gift (englisch)", "Geschenk", ["Gift", "Gabel", "Gips"], "Englisch 'gift' heißt Geschenk, NICHT Gift (=poison)."],
    ["become (englisch)", "werden", ["bekommen", "begrüßen", "besuchen"], "'become' heißt werden; bekommen = to get/receive."],
    ["actual (englisch)", "tatsächlich", ["aktuell", "gegenwärtig", "modern"], "'actual' = tatsächlich; aktuell = current."],
    ["eventually (englisch)", "schließlich / letztendlich", ["eventuell", "vielleicht", "ereignisreich"], "'eventually' = schließlich; eventuell = possibly."],
    ["sensible (englisch)", "vernünftig", ["sensibel", "empfindlich", "spürbar"], "'sensible' = vernünftig; sensibel = sensitive."],
    ["chef (englisch)", "Küchenchef / Koch", ["Chef (Vorgesetzter)", "Kellner", "Gast"], "'chef' = Koch; Chef (Boss) = boss/manager."],
    ["rent (englisch)", "Miete / mieten", ["Rente", "Rennen", "Rand"], "'rent' = Miete; Rente = pension."],
    ["handy (englisch)", "praktisch / griffbereit", ["Handy (Mobiltelefon)", "Hand", "Handel"], "'handy' = praktisch; Handy (Mobiltelefon) = mobile/cell phone."],
    ["billion (englisch)", "Milliarde", ["Billion", "Billiarde", "Million"], "Englisch 'billion' = Milliarde (10⁹)."],
    ["note (englisch)", "Notiz / Anmerkung", ["Note (Schulnote)", "Notausgang", "Nummer"], "'note' = Notiz; Schulnote = grade/mark."],
    ["map (englisch)", "Landkarte", ["Mappe", "Matte", "Mopp"], "'map' = Landkarte; Mappe = folder."],
    ["bekommen — Welches englische Wort passt?", "to get / to receive", ["to become", "to begin", "to belong"], "bekommen = to get/receive; to become = werden."],
    ["brave (englisch)", "mutig / tapfer", ["brav (artig)", "böse", "brauchbar"], "'brave' = mutig; brav = well-behaved/good."],
    ["fabric (englisch)", "Stoff / Gewebe", ["Fabrik", "Fabel", "Fassade"], "'fabric' = Stoff; Fabrik = factory."],
    ["stadium (englisch)", "Stadion", ["Stadium (Phase)", "Stadt", "Studium"], "'stadium' = Stadion; ein Stadium (Phase) = stage/phase."],
    ["blame (englisch)", "beschuldigen / Schuld geben", ["blamieren", "blenden", "blühen"], "'to blame' = beschuldigen; blamieren = to embarrass."],
    ["curious (englisch)", "neugierig", ["kurios (seltsam)", "kurz", "kurvig"], "'curious' = neugierig; kurios = odd/strange."],
    ["genial (englisch)", "freundlich / heiter", ["genial (großartig)", "genau", "gemein"], "Englisch 'genial' = freundlich; genial (great) = brilliant."],
    ["spot (englisch)", "Fleck / Stelle", ["Spott", "Sport", "Spaten"], "'spot' = Fleck/Stelle; Spott = mockery."],
    ["taste (englisch)", "Geschmack / schmecken", ["Taste (Knopf)", "Tasche", "Tasse"], "'taste' = Geschmack; die Taste = key/button."],
    ["will (englisch, Hilfsverb)", "Zukunft/Wille (werden/wollen)", ["Wille als Testament nur", "Weile", "wild"], "'will' bildet die Zukunft (I will go)."],
    ["pregnant (englisch)", "schwanger", ["prägnant (knapp)", "praktisch", "präsent"], "'pregnant' = schwanger; prägnant = concise/succinct."],
    ["mist (englisch)", "Nebel / Dunst", ["Mist (Dung/Ärger)", "Mistel", "Messer"], "'mist' = Nebel; Mist = manure/nonsense."],
    ["also (englisch)", "auch / ebenfalls", ["also (deshalb)", "alles", "als"], "'also' = auch; das deutsche 'also' = so/therefore."],
  ];
  gens.push((r) => {
    const [term, a, d, e] = r.pick(FF);
    const q = term.includes("?") ? term : `Was bedeutet das englische Wort „${term}“?`;
    return mc(r, "False Friends", `${r.pick(LEADS)}${q}`, a, r.shuffle(d), e);
  });

  return gens;
}

/* ══════════════════ 5) SPORT-Theorie Kl. 5–10 ══════════════════ */

function sportGenerators(klasse) {
  const gens = [];

  // Spieleranzahl pro Mannschaft (auf dem Feld)
  const SPIELER = [
    ["Fußball", 11], ["Basketball", 5], ["Volleyball", 6], ["Handball", 7],
    ["Eishockey", 6], ["Wasserball", 7], ["Rugby (Union)", 15],
  ];
  gens.push((r) => {
    const [sport, n] = r.pick(SPIELER);
    return mc(r, "Regeln", `${r.pick(LEADS)}Wie viele Spieler einer Mannschaft stehen beim ${sport} gleichzeitig auf dem Feld?`,
      String(n), numDistractors(r, n, 4).filter((d) => d > 0).slice(0, 3).map(String),
      `Beim ${sport} spielt eine Mannschaft mit ${n} Spielern.`);
  });

  // Spielzeit
  const ZEIT = [
    ["Fußball", "2 × 45 Minuten"],
    ["Basketball (FIBA)", "4 × 10 Minuten"],
    ["Handball", "2 × 30 Minuten"],
    ["Eishockey", "3 × 20 Minuten"],
  ];
  gens.push((r) => {
    const [sport, zeit] = r.pick(ZEIT);
    const dist = ZEIT.filter((z) => z[1] !== zeit).map((z) => z[1]);
    return mc(r, "Regeln", `${r.pick(LEADS)}Wie lange dauert regulär ein ${sport}-Spiel?`,
      zeit, dist, `Ein ${sport}-Spiel dauert ${zeit}.`);
  });

  // Regel-Fakten
  const FAKTEN = [
    ["Wie viele Punkte gibt ein erfolgreicher Freiwurf im Basketball?", "1 Punkt", ["2 Punkte", "3 Punkte", "0 Punkte"], "Ein Freiwurf zählt 1 Punkt."],
    ["Wie viele Punkte gibt ein Korb hinter der Dreierlinie im Basketball?", "3 Punkte", ["1 Punkt", "2 Punkte", "4 Punkte"], "Ein Wurf hinter der Dreierlinie zählt 3 Punkte."],
    ["Welche Karte bedeutet im Fußball einen Platzverweis?", "die Rote Karte", ["die Gelbe Karte", "die Blaue Karte", "die Grüne Karte"], "Die Rote Karte bedeutet Feldverweis."],
    ["Wie viele Sätze braucht man in der Regel zum Sieg im Volleyball (best of 5)?", "3 Sätze", ["2 Sätze", "4 Sätze", "5 Sätze"], "Wer zuerst 3 Sätze gewinnt, siegt."],
    ["Was bedeutet 'Aus' beim Tennis, wenn der Ball hinter der Grundlinie landet?", "Punkt für den Gegner", ["Wiederholung des Aufschlags", "Punkt für den Schläger", "Netzball"], "Ein Ball außerhalb des Feldes bringt dem Gegner den Punkt."],
    ["Wie viele Ringe hat das olympische Symbol?", "5 Ringe", ["4 Ringe", "6 Ringe", "3 Ringe"], "Die fünf Ringe stehen für die fünf Kontinente."],
  ];
  gens.push((r) => {
    const [q, a, d, e] = r.pick(FAKTEN);
    return mc(r, "Regeln", `${r.pick(LEADS)}${q}`, a, r.shuffle(d), e);
  });

  // Puls messen: 15-Sekunden-Puls × 4 (berechnet, große Vielfalt)
  gens.push((r) => {
    const p15 = r.int(15, 45);
    const perMin = p15 * 4;
    return mc(r, "Puls", `${r.pick(LEADS)}Du misst deinen Puls 15 Sekunden lang und zählst ${p15} Schläge. Wie hoch ist dein Puls pro Minute?`,
      String(perMin), numDistractors(r, perMin, 12).map(String),
      `${p15} Schläge in 15 s · 4 = ${perMin} Schläge/Minute.`);
  });

  // Puls messen: 10-Sekunden-Puls × 6 (berechnet)
  gens.push((r) => {
    const p10 = r.int(10, 30);
    const perMin = p10 * 6;
    return mc(r, "Puls", `${r.pick(LEADS)}Du zählst in 10 Sekunden ${p10} Herzschläge. Wie hoch ist der Puls pro Minute?`,
      String(perMin), numDistractors(r, perMin, 12).map(String),
      `${p10} Schläge in 10 s · 6 = ${perMin} Schläge/Minute.`);
  });

  // Rundenrechnung 400-m-Bahn (berechnet)
  gens.push((r) => {
    const runden = r.int(2, 25);
    const meter = runden * 400;
    return mc(r, "Ausdauer", `${r.pick(LEADS)}Eine Laufbahn ist 400 m lang. Wie viele Meter läufst du in ${runden} Runden?`,
      `${meter} m`, numDistractors(r, meter, 400).filter((d) => d > 0).slice(0, 3).map((d) => `${d} m`),
      `${runden} · 400 m = ${meter} m.`);
  });

  // Puls-Rechnungen (berechnet) – ab Kl. 9 ohnehin, aber Max-Puls einfach
  gens.push((r) => {
    const alter = r.int(10, 17);
    const maxPuls = 220 - alter;
    return mc(r, "Puls", `${r.pick(LEADS)}Berechne den maximalen Puls (Faustformel 220 − Alter) für eine ${alter}-jährige Person.`,
      String(maxPuls), numDistractors(r, maxPuls, 8).map(String),
      `220 − ${alter} = ${maxPuls} Schläge/Minute.`);
  });

  if (klasse >= 9) {
    // Trainingsbereich: % vom Maxpuls
    gens.push((r) => {
      const alter = r.int(14, 17);
      const maxPuls = 220 - alter;
      const pct = r.pick([60, 70, 80]);
      const target = Math.round(maxPuls * pct / 100);
      return mc(r, "Trainingslehre", `${r.pick(LEADS)}Maximalpuls einer Person: ${maxPuls}. Wie hoch ist der Trainingspuls bei ${pct}% des Maximalpulses (gerundet)?`,
        String(target), numDistractors(r, target, 10).map(String),
        `${maxPuls} · ${pct}% = ${target} Schläge/Minute.`);
    });

    // Trainingslehre-Begriffe
    const TL = [
      ["Ausdauer", "die Fähigkeit, eine Belastung über lange Zeit durchzuhalten und Ermüdung zu widerstehen"],
      ["Kraft", "die Fähigkeit, Widerstände durch Muskelkontraktion zu überwinden"],
      ["Schnelligkeit", "die Fähigkeit, Bewegungen in kürzester Zeit auszuführen"],
      ["Beweglichkeit", "die Fähigkeit, Bewegungen mit großer Schwingungsweite auszuführen"],
      ["Koordination", "das Zusammenspiel von Nerven und Muskeln zur Bewegungssteuerung"],
      ["Superkompensation", "die Anpassung des Körpers über das Ausgangsniveau hinaus nach Belastung und Erholung"],
    ];
    gens.push((r) => {
      const [b, d] = r.pick(TL);
      return mc(r, "Trainingslehre", `${r.pick(LEADS)}Was versteht man unter „${b}“?`,
        d, pickN(r, TL.map((x) => x[1]), d, 3), `${b}: ${d}.`);
    });
  }

  return gens;
}

/* ══════════════════ 6) TECHNIK/WERKEN Kl. 5–10 ══════════════════ */

function technikGenerators(klasse) {
  const gens = [];

  // Werkzeuge
  const WERKZEUG = [
    ["Womit sägt man gerade Schnitte in Holz?", "Fuchsschwanz (Handsäge)", ["Feile", "Raspel", "Hobel"], "Der Fuchsschwanz ist eine Handsäge für Holz."],
    ["Welches Werkzeug glättet und formt Holzoberflächen durch Spanabnahme?", "Hobel", ["Zange", "Schraubstock", "Bohrer"], "Der Hobel trägt dünne Späne ab und glättet Holz."],
    ["Womit werden Werkstücke fest eingespannt?", "Schraubstock", ["Feile", "Säge", "Hammer"], "Der Schraubstock hält das Werkstück fest."],
    ["Welches Werkzeug dient zum Bohren von Löchern?", "Bohrmaschine / Bohrer", ["Feile", "Hobel", "Zange"], "Mit Bohrer/Bohrmaschine erzeugt man Löcher."],
    ["Womit misst man Längen am genauesten im Werkraum?", "Messschieber (Schieblehre)", ["Zollstock ungefähr", "Bandmaß grob", "Winkel"], "Der Messschieber misst auf Zehntel-Millimeter genau."],
    ["Welches Werkzeug prüft den rechten Winkel (90°)?", "Anschlagwinkel", ["Zange", "Feile", "Hammer"], "Der Anschlagwinkel prüft 90°-Winkel."],
    ["Womit entfernt man Material fein und glättet Metallkanten?", "Feile", ["Säge", "Bohrer", "Hobel"], "Die Feile trägt feine Späne ab und glättet Kanten."],
  ];
  gens.push((r) => {
    const [q, a, d, e] = r.pick(WERKZEUG);
    return mc(r, "Werkzeuge", `${r.pick(LEADS)}${q}`, a, r.shuffle(d), e);
  });

  // Werkstoffe
  const WERKSTOFF = [
    ["Welcher Werkstoff ist ein Naturwerkstoff?", "Holz", ["Kunststoff (PVC)", "Aluminium", "Stahl"], "Holz ist ein nachwachsender Naturwerkstoff."],
    ["Welcher Werkstoff leitet Strom besonders gut?", "Kupfer", ["Holz", "Glas", "Gummi"], "Kupfer ist ein sehr guter elektrischer Leiter."],
    ["Welches Material ist ein Isolator (leitet Strom NICHT)?", "Gummi", ["Kupfer", "Aluminium", "Eisen"], "Gummi ist ein elektrischer Isolator."],
    ["Was entsteht, wenn Eisen mit Sauerstoff und Feuchtigkeit reagiert?", "Rost (Korrosion)", ["Patina aus Silber", "Grünspan aus Gold", "Kalk"], "Eisen rostet durch Korrosion."],
    ["Welcher Werkstoff ist ein Metall?", "Aluminium", ["Holz", "Kunststoff", "Keramik"], "Aluminium ist ein Leichtmetall."],
    ["Welcher Werkstoff ist besonders leicht formbar (thermoplastisch) beim Erwärmen?", "Thermoplast (Kunststoff)", ["Stahl", "Beton", "Glas bei Zimmertemperatur"], "Thermoplaste werden beim Erwärmen weich und formbar."],
    ["Wie nennt man eine Mischung aus Metallen, z. B. Messing?", "Legierung", ["Verbundstoff aus Holz", "Elektrolyt", "Emulsion"], "Messing ist eine Legierung aus Kupfer und Zink."],
  ];
  gens.push((r) => {
    const [q, a, d, e] = r.pick(WERKSTOFF);
    return mc(r, "Werkstoffe", `${r.pick(LEADS)}${q}`, a, r.shuffle(d), e);
  });

  // Technisches Zeichnen
  const TZ = [
    ["Welche Linienart stellt sichtbare Kanten in einer technischen Zeichnung dar?", "die breite Volllinie", ["die gestrichelte Linie", "die Strichpunktlinie", "die Freihandlinie"], "Sichtbare Kanten zeichnet man mit breiter Volllinie."],
    ["Wofür verwendet man in technischen Zeichnungen die Strichpunktlinie?", "für Mittel- und Symmetrieachsen", ["für sichtbare Kanten", "für Maßangaben", "für Schraffuren"], "Die Strichpunktlinie kennzeichnet Mittellinien/Achsen."],
    ["Wofür steht in technischen Zeichnungen die gestrichelte Linie?", "für verdeckte (unsichtbare) Kanten", ["für sichtbare Kanten", "für Mittelachsen", "für Text"], "Verdeckte Kanten werden gestrichelt gezeichnet."],
    ["Was bedeutet der Maßstab 1:2 auf einer Zeichnung?", "Die Zeichnung ist halb so groß wie das Original", ["doppelt so groß wie das Original", "genau gleich groß", "zehnmal so groß"], "1:2 bedeutet Verkleinerung auf die Hälfte."],
    ["Was bedeutet der Maßstab 2:1?", "Die Zeichnung ist doppelt so groß wie das Original", ["halb so groß", "gleich groß", "zehnmal kleiner"], "2:1 ist eine Vergrößerung auf das Doppelte."],
    ["Welche Projektionsart nutzt man in Deutschland üblich für technische Ansichten?", "die Dreitafelprojektion (Vorder-, Seiten-, Draufsicht)", ["die Zentralperspektive", "die Isometrie ohne Maße", "die Freihandskizze"], "Die Dreitafelprojektion zeigt drei senkrechte Ansichten."],
  ];
  gens.push((r) => {
    const [q, a, d, e] = r.pick(TZ);
    return mc(r, "Technisches Zeichnen", `${r.pick(LEADS)}${q}`, a, r.shuffle(d), e);
  });

  // Maßstab berechnet
  gens.push((r) => {
    const orig = r.int(4, 40) * 10; // mm
    const faktor = r.pick([2, 4, 5, 10]);
    const gezeichnet = orig / faktor;
    return mc(r, "Maßstab", `${r.pick(LEADS)}Ein Werkstück ist ${orig} mm lang und wird im Maßstab 1:${faktor} gezeichnet. Wie lang ist die Zeichnung?`,
      `${gezeichnet} mm`, numDistractors(r, gezeichnet, 15).filter((d) => d > 0).slice(0, 3).map((d) => `${d} mm`),
      `${orig} mm ÷ ${faktor} = ${gezeichnet} mm.`);
  });

  // Getriebe-Übersetzung (berechnet)
  gens.push((r) => {
    const antrieb = r.int(10, 20);
    const abtrieb = r.int(2, 5) * antrieb; // ganzzahliges Verhältnis
    const i = abtrieb / antrieb;
    return mc(r, "Getriebe", `${r.pick(LEADS)}Ein Antriebszahnrad hat ${antrieb} Zähne, das Abtriebszahnrad ${abtrieb} Zähne. Wie groß ist die Übersetzung i (= Abtrieb/Antrieb)?`,
      String(i), numDistractors(r, i, 3).filter((d) => d > 0).slice(0, 3).map(String),
      `i = ${abtrieb} / ${antrieb} = ${i}. (Übersetzung ins Langsame, Drehmoment steigt.)`);
  });

  // Getriebe: Drehzahl
  gens.push((r) => {
    const i = r.pick([2, 3, 4, 5]);
    const nAn = r.int(2, 12) * 100;
    const nAb = nAn / i;
    return mc(r, "Getriebe", `${r.pick(LEADS)}Bei einer Übersetzung i = ${i} dreht das Antriebsrad mit ${nAn} U/min. Wie schnell dreht das Abtriebsrad?`,
      `${nAb} U/min`, numDistractors(r, nAb, 50).filter((d) => d > 0).slice(0, 3).map((d) => `${d} U/min`),
      `n_Abtrieb = ${nAn} / ${i} = ${nAb} U/min.`);
  });

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

  console.log("Mathematik Grundschule-Ergänzung (Klasse 1–4, je >= 400):");
  for (let k = 1; k <= 4; k++)
    total += writeBank("mathematik4", k, generateBank(61000 + k, 400, mathematik4Generators(k)), 400);

  console.log("Informatik Oberstufe-Ergänzung (Klasse 11–13, je >= 400):");
  for (let k = 11; k <= 13; k++)
    total += writeBank("informatik2", k, generateBank(62000 + k, 400, informatik2Generators(k)), 400);

  console.log("Biologie Oberstufe (Klasse 11–13, je >= 400):");
  for (let k = 11; k <= 13; k++)
    total += writeBank("biologie", k, generateBank(63000 + k, 400, biologieGenerators(k)), 400);

  console.log("Englisch Landeskunde (Klasse 7–10, je >= 300):");
  for (let k = 7; k <= 10; k++)
    total += writeBank("englisch3", k, generateBank(64000 + k, 300, englisch3Generators(k)), 300);

  console.log("Sport-Theorie (Klasse 5–10, je >= 250):");
  for (let k = 5; k <= 10; k++)
    total += writeBank("sport", k, generateBank(65000 + k, 250, sportGenerators(k)), 250);

  console.log("Technik/Werken (Klasse 5–10, je >= 250):");
  for (let k = 5; k <= 10; k++)
    total += writeBank("technik", k, generateBank(66000 + k, 250, technikGenerators(k)), 250);

  console.log(`\nGesamt (Runde 6): ${total} Fragen.`);
}

main();
