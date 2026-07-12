/* Copyright 2026 Elian Schock, Jonas Schwenk */
/**
 * MEGA-Fragen-Generator RUNDE 3 für MasterMind.
 *
 * Ergänzt die Fragenbank aus generate.mjs / generate2.mjs im GLEICHEN Format
 *   scripts/questions/mega/data/<fach>-klasse<k>.json
 * mit [{ topic, question, options[4], correct(Index), explanation }].
 *
 * Fächer/Umfang:
 *   - informatik     Klasse 7–13, >= 600 Fragen pro Klasse
 *   - franzoesisch   Klasse 6–10, >= 600 Fragen pro Klasse
 *   - latein         Klasse 6–10, >= 500 Fragen pro Klasse
 *   - spanisch       Klasse 8–10, >= 500 Fragen pro Klasse
 *   - mathematik2    Klasse 11–13, >= 400 Fragen pro Klasse (Ergänzung, eigener Dateiname)
 *
 * Deterministisch (mulberry32-Seed). Keine Abhängigkeiten, reines Node.
 * generate.mjs / generate2.mjs / import-mega.ts werden NICHT verändert.
 *
 * Aufruf (vom Repo-Root):
 *   node scripts/questions/mega/generate3.mjs
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
  if (opts.length < 3) return null; // zu wenige eindeutige Distraktoren → verwerfen
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

/** Sammelt count Fragen mit eindeutigem Fragetext. */
function generateBank(seed, count, generators) {
  const rng = makeRng(seed);
  const out = [];
  const texts = new Set();
  let attempts = 0;
  const maxAttempts = count * 200;
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

/**
 * Faktenbank-Generator: Tabelle [term, beschreibung].
 * Vorwärts (term→beschreibung) und Rückwärts (beschreibung→term).
 * NUR verwenden, wenn Terme UND Beschreibungen eindeutig sind.
 */
function factGens(topic, table, fwd, rev, leads) {
  const L = leads && leads.length ? leads : [""];
  const terms = table.map((t) => t[0]);
  const descs = table.map((t) => t[1]);
  return [
    (r) => {
      const [t, d] = r.pick(table);
      const lead = r.pick(L);
      return mc(r, topic, lead + fwd(t), d, pickN(r, descs, d, 3), `${t}: ${d}.`);
    },
    (r) => {
      const [t, d] = r.pick(table);
      const lead = r.pick(L);
      return mc(r, topic, lead + rev(d), t, pickN(r, terms, t, 3), `${t}: ${d}.`);
    },
  ];
}

/** Nur Vorwärts-Faktenfrage (für Tabellen mit mehrdeutigen Beschreibungen). */
function factGensFwd(topic, table, fwd, leads) {
  const L = leads && leads.length ? leads : [""];
  const descs = table.map((t) => t[1]);
  return [
    (r) => {
      const [t, d] = r.pick(table);
      const lead = r.pick(L);
      return mc(r, topic, lead + fwd(t), d, pickN(r, descs, d, 3), `${t}: ${d}.`);
    },
  ];
}

/**
 * Vokabel-Generatoren: Tabelle [wortA, wortB] (z.B. [deutsch, fremdsprache]).
 * Erzeugt Fragen in beide Richtungen. Distraktoren aus derselben Spalte.
 */
function vocabGens(topic, table, labelA, labelB, leads) {
  const L = leads && leads.length ? leads : [""];
  const colA = table.map((t) => t[0]);
  const colB = table.map((t) => t[1]);
  return [
    (r) => {
      const [a, b] = r.pick(table);
      const lead = r.pick(L);
      return mc(r, topic, `${lead}Was heißt „${a}“ auf ${labelB}?`, b, pickN(r, colB, b, 3), `„${a}“ heißt auf ${labelB}: „${b}“.`);
    },
    (r) => {
      const [a, b] = r.pick(table);
      const lead = r.pick(L);
      return mc(r, topic, `${lead}Was bedeutet „${b}“ auf ${labelA}?`, a, pickN(r, colA, a, 3), `„${b}“ bedeutet auf ${labelA}: „${a}“.`);
    },
  ];
}

/**
 * Konjugations-Generator: verbLabel + forms[6] (an pronouns[6] ausgerichtet).
 * Nur Richtung Pronomen→Form (Form→Pronomen wäre mehrdeutig).
 */
function conjGens(topic, verbLabel, forms, pronouns, leads) {
  const L = leads && leads.length ? leads : [""];
  return [
    (r) => {
      const i = r.int(0, forms.length - 1);
      const lead = r.pick(L);
      return mc(
        r, topic,
        `${lead}Wie lautet die Form von „${verbLabel}“ für „${pronouns[i]}“?`,
        forms[i], pickN(r, forms, forms[i], 3),
        `„${verbLabel}“ für „${pronouns[i]}“: ${forms[i]}.`,
      );
    },
  ];
}

/* ══════════════════════════════ INFORMATIK ══════════════════════════════ */

const INF_LEADS = ["", "Informatik: ", "Wähle die richtige Antwort. ", "Frage: "];

function bin(n) { return (n >>> 0).toString(2); }

function informatikBinaryGens() {
  return [
    // Binär → Dezimal
    (r) => {
      const n = r.int(1, 255);
      const b = bin(n);
      const dist = [n + 1, n - 1, n + 2, n - 2, n ^ (1 << r.int(0, 3))]
        .filter((x) => x >= 0 && x !== n);
      return mc(r, "Zahlensysteme", `${r.pick(INF_LEADS)}Welche Dezimalzahl entspricht der Binärzahl ${b}?`,
        n, pickN(r, dist.map(String), String(n), 3), `${b}₂ = ${n}₁₀.`);
    },
    // Dezimal → Binär
    (r) => {
      const n = r.int(1, 255);
      const b = bin(n);
      const dist = [bin(n + 1), bin(n - 1), bin(n + 2), bin(n ^ (1 << r.int(0, 3)))]
        .filter((x) => x !== b);
      return mc(r, "Zahlensysteme", `${r.pick(INF_LEADS)}Wie lautet die Binärdarstellung der Dezimalzahl ${n}?`,
        b, pickN(r, dist, b, 3), `${n}₁₀ = ${b}₂.`);
    },
  ];
}

function informatikPythonGens() {
  const words = ["Hallo", "Python", "Schule", "Katze", "Computer", "Apfel", "Haus", "Baum", "Informatik", "Roboter"];
  return [
    // Arithmetik + - *
    (r) => {
      const a = r.int(1, 20), b = r.int(1, 20);
      const op = r.pick(["+", "-", "*"]);
      const res = op === "+" ? a + b : op === "-" ? a - b : a * b;
      const dist = [res + 1, res - 1, res + 2, a + b, a * b, a - b].filter((x) => x !== res);
      return mc(r, "Python-Ausgaben", `Was gibt print(${a} ${op} ${b}) aus?`,
        res, pickN(r, dist.map(String), String(res), 3), `${a} ${op} ${b} = ${res}.`);
    },
    // Ganzzahldivision //
    (r) => {
      const b = r.int(2, 12), a = r.int(b, 100);
      const res = Math.floor(a / b);
      const dist = [res + 1, res - 1, Math.round(a / b), Math.ceil(a / b), a % b].filter((x) => x !== res);
      return mc(r, "Python-Ausgaben", `Was gibt print(${a} // ${b}) aus?`,
        res, pickN(r, dist.map(String), String(res), 3), `${a} // ${b} = ${res} (Ganzzahldivision).`);
    },
    // Modulo %
    (r) => {
      const b = r.int(2, 12), a = r.int(b, 100);
      const res = a % b;
      const dist = [res + 1, res - 1, Math.floor(a / b), b - res, res + 2].filter((x) => x !== res && x >= 0);
      return mc(r, "Python-Ausgaben", `Was gibt print(${a} % ${b}) aus?`,
        res, pickN(r, dist.map(String), String(res), 3), `${a} % ${b} = ${res} (Rest der Division).`);
    },
    // Potenz **
    (r) => {
      const base = r.int(2, 6), exp = r.int(2, 4);
      const res = base ** exp;
      const dist = [base * exp, res + base, res - base, base ** (exp + 1), (base + 1) ** exp].filter((x) => x !== res);
      return mc(r, "Python-Ausgaben", `Was gibt print(${base} ** ${exp}) aus?`,
        res, pickN(r, dist.map(String), String(res), 3), `${base} ** ${exp} = ${res} (Potenz).`);
    },
    // String-Verkettung
    (r) => {
      const x = r.pick(words), y = r.pick(words);
      if (x === y) return null;
      const res = x + y;
      const dist = [y + x, x, y, x + " " + y].filter((v) => v !== res);
      return mc(r, "Python-Ausgaben", `Was gibt print("${x}" + "${y}") aus?`,
        res, pickN(r, dist, res, 3), `Die Verkettung "${x}" + "${y}" ergibt ${res}.`);
    },
    // String-Wiederholung
    (r) => {
      const x = r.pick(["ab", "ha", "xy", "12", "na"]), n = r.int(2, 4);
      const res = x.repeat(n);
      const dist = [x.repeat(n + 1), x.repeat(n - 1), x + String(n), (x + " ").repeat(n).trim()].filter((v) => v !== res);
      return mc(r, "Python-Ausgaben", `Was gibt print("${x}" * ${n}) aus?`,
        res, pickN(r, dist, res, 3), `"${x}" * ${n} wiederholt den String ${n}-mal: ${res}.`);
    },
    // len()
    (r) => {
      const x = r.pick(words);
      const res = x.length;
      const dist = [res + 1, res - 1, res + 2, res - 2].filter((v) => v > 0 && v !== res);
      return mc(r, "Python-Ausgaben", `Was gibt print(len("${x}")) aus?`,
        res, pickN(r, dist.map(String), String(res), 3), `Das Wort "${x}" hat ${res} Zeichen.`);
    },
  ];
}

// Logische Ausdrücke mit bekanntem Wahrheitswert (Python-Notation)
const LOGIK_EXPR = [
  ["True and True", true], ["True and False", false], ["False and True", false], ["False and False", false],
  ["True or True", true], ["True or False", true], ["False or True", true], ["False or False", false],
  ["not True", false], ["not False", true],
  ["not (True and False)", true], ["not (True or False)", false],
  ["True and not False", true], ["False or not True", false],
  ["not True or True", true], ["not False and False", false],
  ["(True or False) and True", true], ["(True and False) or False", false],
  ["not (False or False)", true], ["not (True and True)", false],
];

function informatikLogikGens() {
  const truePool = LOGIK_EXPR.filter((e) => e[1]).map((e) => e[0]);
  const falsePool = LOGIK_EXPR.filter((e) => !e[1]).map((e) => e[0]);
  return [
    (r) => {
      const target = r.next() < 0.5;
      const cPool = target ? truePool : falsePool;
      const dPool = target ? falsePool : truePool;
      const correct = r.pick(cPool);
      const dist = pickN(r, dPool, "", 3);
      return mc(r, "Logik", `Welcher Ausdruck ergibt in Python ${target ? "True" : "False"}?`,
        correct, dist, `${correct} ergibt ${target ? "True" : "False"}.`);
    },
  ];
}

const LOGIK_FAKTEN = [
  ["a and b (logisches UND)", "ist nur True, wenn a und b beide True sind"],
  ["a or b (logisches ODER)", "ist True, wenn mindestens einer von beiden True ist"],
  ["not a (Negation)", "kehrt den Wahrheitswert von a um"],
  ["True and False", "ergibt False"],
  ["False or True", "ergibt True"],
  ["not (True and True)", "ergibt False"],
  ["Exklusiv-Oder (XOR)", "ist True, wenn genau einer der beiden Werte True ist"],
];

const HTML_TAGS = [
  ["<a>", "erzeugt einen Hyperlink (Verweis)"],
  ["<img>", "bindet ein Bild ein"],
  ["<p>", "kennzeichnet einen Textabsatz"],
  ["<h1>", "ist die wichtigste Überschrift"],
  ["<ul>", "erzeugt eine ungeordnete Liste"],
  ["<ol>", "erzeugt eine nummerierte (geordnete) Liste"],
  ["<li>", "ist ein einzelnes Listenelement"],
  ["<table>", "erzeugt eine Tabelle"],
  ["<br>", "erzwingt einen Zeilenumbruch"],
  ["<strong>", "hebt Text (meist fett) hervor"],
  ["<em>", "betont Text (meist kursiv)"],
  ["<div>", "ist ein Block-Container zur Gruppierung"],
  ["<span>", "ist ein Inline-Container"],
  ["<form>", "erzeugt ein Formular"],
  ["<input>", "ist ein Eingabefeld"],
  ["<head>", "enthält Metadaten der Seite"],
  ["<body>", "enthält den sichtbaren Seiteninhalt"],
  ["<title>", "legt den Titel im Browser-Tab fest"],
];

const CSS_EIGENSCHAFTEN = [
  ["color", "legt die Textfarbe fest"],
  ["background-color", "legt die Hintergrundfarbe fest"],
  ["font-size", "legt die Schriftgröße fest"],
  ["margin", "legt den Außenabstand fest"],
  ["padding", "legt den Innenabstand fest"],
  ["border", "legt den Rahmen fest"],
  ["text-align", "legt die horizontale Ausrichtung des Textes fest"],
  ["width", "legt die Breite eines Elements fest"],
  ["height", "legt die Höhe eines Elements fest"],
  ["font-weight", "legt die Schriftstärke (z.B. fett) fest"],
  ["display", "legt das Anzeigeverhalten (z.B. block, inline, flex) fest"],
];

const KOMPLEXITAET = [
  ["Zugriff auf ein Array-Element per Index", "O(1)"],
  ["Lineare Suche in einer unsortierten Liste", "O(n)"],
  ["Binäre Suche in einem sortierten Array", "O(log n)"],
  ["Bubble Sort (Worst Case)", "O(n²)"],
  ["Insertion Sort (Worst Case)", "O(n²)"],
  ["Merge Sort", "O(n log n)"],
  ["Quick Sort (durchschnittlich)", "O(n log n)"],
  ["Einfügen am Ende einer dynamischen Liste (amortisiert)", "O(1)"],
  ["Alle Paare in einer Liste vergleichen (verschachtelte Schleife)", "O(n²)"],
  ["Suchen in einer Hashtabelle (durchschnittlich)", "O(1)"],
];

const DATENSTRUKTUR = [
  ["Stack (Stapel)", "arbeitet nach dem LIFO-Prinzip (Last In, First Out)"],
  ["Queue (Warteschlange)", "arbeitet nach dem FIFO-Prinzip (First In, First Out)"],
  ["Array", "hat feste Größe und erlaubt Zugriff per Index in O(1)"],
  ["Verkettete Liste", "verbindet Elemente über Zeiger (Referenzen)"],
  ["Hashtabelle", "ordnet Schlüssel Werten zu, Zugriff im Schnitt O(1)"],
  ["Binärbaum", "ist ein Baum, in dem jeder Knoten höchstens zwei Kinder hat"],
  ["Graph", "besteht aus Knoten und Kanten"],
  ["Binärer Suchbaum", "hält kleinere Werte links, größere rechts vom Knoten"],
];

function informatikGenerators(k) {
  const gens = [];
  gens.push(...informatikBinaryGens());
  gens.push(...informatikPythonGens());
  gens.push(...informatikLogikGens());
  gens.push(...factGensFwd("Logik", LOGIK_FAKTEN, (t) => `Was gilt für „${t}“?`, INF_LEADS));
  gens.push(...factGens("HTML", HTML_TAGS, (t) => `Wofür wird das HTML-Tag ${t} verwendet?`,
    (d) => `Welches HTML-Tag ${d}?`, INF_LEADS));
  gens.push(...factGens("CSS", CSS_EIGENSCHAFTEN, (t) => `Was bewirkt die CSS-Eigenschaft „${t}“?`,
    (d) => `Welche CSS-Eigenschaft ${d}?`, INF_LEADS));
  if (k >= 11) {
    gens.push(...factGensFwd("Laufzeit", KOMPLEXITAET,
      (t) => `Welche Zeit-Komplexität (Landau) hat: ${t}?`, INF_LEADS));
    gens.push(...factGens("Datenstrukturen", DATENSTRUKTUR,
      (t) => `Welche Eigenschaft hat die Datenstruktur „${t}“?`,
      (d) => `Welche Datenstruktur ${d}?`, INF_LEADS));
  }
  return gens;
}

/* ══════════════════════════════ FRANZÖSISCH ══════════════════════════════ */

const FR_LEADS = ["", "Französisch: ", "Vokabel: ", "Wähle die richtige Antwort. "];

// Zahlwörter Französisch (0–100), korrekt konstruiert.
const FR_TENS = { 20: "vingt", 30: "trente", 40: "quarante", 50: "cinquante", 60: "soixante" };
const FR_UNITS = ["zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf"];
const FR_10_19 = ["dix", "onze", "douze", "treize", "quatorze", "quinze", "seize", "dix-sept", "dix-huit", "dix-neuf"];

function frNumber(n) {
  if (n < 10) return FR_UNITS[n];
  if (n < 20) return FR_10_19[n - 10];
  if (n < 70) {
    const t = Math.floor(n / 10) * 10, u = n % 10;
    const base = FR_TENS[t];
    if (u === 0) return base;
    if (u === 1) return `${base} et un`;
    return `${base}-${FR_UNITS[u]}`;
  }
  if (n < 80) { // 70–79 = soixante + 10..19
    const r = n - 60; // 10..19
    if (r === 11) return "soixante et onze";
    return `soixante-${FR_10_19[r - 10]}`;
  }
  if (n < 100) { // 80–99
    if (n === 80) return "quatre-vingts";
    const r = n - 80; // 1..19
    if (r < 10) return `quatre-vingt-${FR_UNITS[r]}`;
    return `quatre-vingt-${FR_10_19[r - 10]}`;
  }
  return "cent";
}

function frNumberGens() {
  return [
    (r) => {
      const n = r.int(0, 100);
      const w = frNumber(n);
      const dist = [n + 1, n - 1, n + 2, n - 2, n + 10, n - 10].filter((x) => x >= 0 && x <= 100 && x !== n);
      return mc(r, "Zahlen", `Wie schreibt man die Zahl ${n} auf Französisch?`,
        w, pickN(r, dist.map(frNumber), w, 3), `${n} heißt auf Französisch „${w}“.`);
    },
    (r) => {
      const n = r.int(0, 100);
      const w = frNumber(n);
      const dist = [n + 1, n - 1, n + 2, n - 2, n + 10, n - 10].filter((x) => x >= 0 && x <= 100 && x !== n);
      return mc(r, "Zahlen", `Welche Zahl ist „${w}“ (Französisch)?`,
        n, pickN(r, dist.map(String), String(n), 3), `„${w}“ ist die Zahl ${n}.`);
    },
  ];
}

// Konjugationstabellen Präsens
const FR_PRON = ["je (ich)", "tu (du)", "il/elle (er/sie)", "nous (wir)", "vous (ihr)", "ils/elles (sie)"];
const FR_ETRE = ["suis", "es", "est", "sommes", "êtes", "sont"];
const FR_AVOIR = ["ai", "as", "a", "avons", "avez", "ont"];
const FR_ALLER = ["vais", "vas", "va", "allons", "allez", "vont"];
// Regelmäßige -er-Verben (ohne Rechtschreib-Sonderfälle)
const FR_ER_VERBEN = [
  ["parler", "sprechen"], ["regarder", "schauen"], ["jouer", "spielen"], ["chanter", "singen"],
  ["danser", "tanzen"], ["travailler", "arbeiten"], ["donner", "geben"], ["trouver", "finden"],
  ["chercher", "suchen"], ["penser", "denken"], ["porter", "tragen"], ["montrer", "zeigen"],
  ["rester", "bleiben"], ["tomber", "fallen"], ["marcher", "gehen/laufen"], ["rentrer", "heimkehren"],
];
const FR_ER_ENDUNGEN = ["e", "es", "e", "ons", "ez", "ent"];

function frKonjugationGens() {
  const gens = [];
  gens.push(...conjGens("Konjugation être", "être (sein)", FR_ETRE, FR_PRON, FR_LEADS));
  gens.push(...conjGens("Konjugation avoir", "avoir (haben)", FR_AVOIR, FR_PRON, FR_LEADS));
  gens.push(...conjGens("Konjugation aller", "aller (gehen)", FR_ALLER, FR_PRON, FR_LEADS));
  gens.push((r) => {
    const [verb, de] = r.pick(FR_ER_VERBEN);
    const stem = verb.slice(0, -2);
    const forms = FR_ER_ENDUNGEN.map((e) => stem + e);
    const i = r.int(0, 5);
    return mc(r, "Konjugation -er-Verben",
      `Wie lautet die Präsensform von „${verb}“ (${de}) für „${FR_PRON[i]}“?`,
      forms[i], pickN(r, forms, forms[i], 3),
      `„${verb}“ für „${FR_PRON[i]}“: ${forms[i]}.`);
  });
  return gens;
}

// Vokabeln Deutsch↔Französisch (>= 120 Paare)
const FR_VOKABELN = [
  ["Hallo", "bonjour"], ["danke", "merci"], ["bitte", "s'il vous plaît"], ["ja", "oui"], ["nein", "non"],
  ["das Haus", "la maison"], ["die Schule", "l'école"], ["der Lehrer", "le professeur"], ["der Freund", "l'ami"],
  ["die Katze", "le chat"], ["der Hund", "le chien"], ["das Wasser", "l'eau"], ["das Brot", "le pain"],
  ["der Käse", "le fromage"], ["der Apfel", "la pomme"], ["die Milch", "le lait"], ["der Tag", "le jour"],
  ["die Nacht", "la nuit"], ["der Morgen", "le matin"], ["der Abend", "le soir"], ["die Woche", "la semaine"],
  ["das Jahr", "l'année"], ["die Stunde", "l'heure"], ["die Zeit", "le temps"], ["die Sonne", "le soleil"],
  ["der Mond", "la lune"], ["der Himmel", "le ciel"], ["das Meer", "la mer"], ["der Berg", "la montagne"],
  ["der Fluss", "la rivière"], ["der Baum", "l'arbre"], ["die Blume", "la fleur"], ["der Garten", "le jardin"],
  ["die Stadt", "la ville"], ["das Dorf", "le village"], ["die Straße", "la rue"], ["das Auto", "la voiture"],
  ["der Zug", "le train"], ["das Fahrrad", "le vélo"], ["das Flugzeug", "l'avion"], ["das Buch", "le livre"],
  ["der Stift", "le stylo"], ["das Papier", "le papier"], ["der Tisch", "la table"], ["der Stuhl", "la chaise"],
  ["das Fenster", "la fenêtre"], ["die Tür", "la porte"], ["das Zimmer", "la chambre"], ["die Küche", "la cuisine"],
  ["der Mann", "l'homme"], ["die Frau", "la femme"], ["das Kind", "l'enfant"], ["der Junge", "le garçon"],
  ["das Mädchen", "la fille"], ["die Mutter", "la mère"], ["der Vater", "le père"], ["der Bruder", "le frère"],
  ["die Schwester", "la sœur"], ["die Familie", "la famille"], ["die Hand", "la main"], ["der Kopf", "la tête"],
  ["das Auge", "l'œil"], ["das Ohr", "l'oreille"], ["die Nase", "le nez"], ["der Mund", "la bouche"],
  ["der Fuß", "le pied"], ["das Bein", "la jambe"], ["der Arm", "le bras"], ["das Herz", "le cœur"],
  ["rot", "rouge"], ["blau", "bleu"], ["grün", "vert"], ["gelb", "jaune"], ["schwarz", "noir"],
  ["weiß", "blanc"], ["groß", "grand"], ["klein", "petit"], ["gut", "bon"], ["schlecht", "mauvais"],
  ["schön", "beau"], ["neu", "nouveau"], ["alt", "vieux"], ["jung", "jeune"], ["schnell", "rapide"],
  ["langsam", "lent"], ["warm", "chaud"], ["kalt", "froid"], ["glücklich", "heureux"], ["traurig", "triste"],
  ["essen", "manger"], ["trinken", "boire"], ["schlafen", "dormir"], ["lesen", "lire"], ["schreiben", "écrire"],
  ["sprechen", "parler"], ["hören", "écouter"], ["sehen", "voir"], ["kommen", "venir"], ["gehen", "aller"],
  ["machen", "faire"], ["nehmen", "prendre"], ["geben", "donner"], ["kaufen", "acheter"], ["verkaufen", "vendre"],
  ["spielen", "jouer"], ["arbeiten", "travailler"], ["lernen", "apprendre"], ["wissen", "savoir"], ["wollen", "vouloir"],
  ["können", "pouvoir"], ["müssen", "devoir"], ["lieben", "aimer"], ["finden", "trouver"], ["suchen", "chercher"],
  ["heute", "aujourd'hui"], ["morgen", "demain"], ["gestern", "hier"], ["immer", "toujours"], ["nie", "jamais"],
  ["oft", "souvent"], ["hier", "ici"], ["dort", "là"], ["links", "à gauche"], ["rechts", "à droite"],
  ["oben", "en haut"], ["unten", "en bas"], ["viel", "beaucoup"], ["wenig", "peu"], ["mit", "avec"],
  ["ohne", "sans"], ["für", "pour"], ["und", "et"], ["oder", "ou"], ["aber", "mais"],
];

function franzoesischGenerators() {
  const gens = [];
  gens.push(...vocabGens("Vokabeln", FR_VOKABELN, "Deutsch", "Französisch", FR_LEADS));
  gens.push(...frNumberGens());
  gens.push(...frKonjugationGens());
  return gens;
}

/* ══════════════════════════════ LATEIN ══════════════════════════════ */

const LA_LEADS = ["", "Latein: ", "Vokabel: ", "Wähle die richtige Antwort. "];

// Vokabeln Latein↔Deutsch (>= 100 Paare)
const LA_VOKABELN = [
  ["puella", "das Mädchen"], ["puer", "der Junge"], ["vir", "der Mann"], ["femina", "die Frau"],
  ["servus", "der Sklave"], ["dominus", "der Herr"], ["amicus", "der Freund"], ["poeta", "der Dichter"],
  ["agricola", "der Bauer"], ["nauta", "der Seemann"], ["rex", "der König"], ["miles", "der Soldat"],
  ["deus", "der Gott"], ["dea", "die Göttin"], ["templum", "der Tempel"], ["aqua", "das Wasser"],
  ["terra", "die Erde/das Land"], ["silva", "der Wald"], ["via", "der Weg/die Straße"], ["porta", "das Tor"],
  ["villa", "das Landhaus"], ["oppidum", "die Stadt"], ["urbs", "die (Groß-)Stadt"], ["forum", "der Marktplatz"],
  ["bellum", "der Krieg"], ["pax", "der Frieden"], ["gladius", "das Schwert"], ["scutum", "der Schild"],
  ["equus", "das Pferd"], ["canis", "der Hund"], ["leo", "der Löwe"], ["avis", "der Vogel"],
  ["liber", "das Buch"], ["littera", "der Buchstabe"], ["verbum", "das Wort"], ["nomen", "der Name"],
  ["vita", "das Leben"], ["mors", "der Tod"], ["corpus", "der Körper"], ["animus", "der Geist/Mut"],
  ["caput", "der Kopf"], ["manus", "die Hand"], ["oculus", "das Auge"], ["cor", "das Herz"],
  ["pater", "der Vater"], ["mater", "die Mutter"], ["filius", "der Sohn"], ["filia", "die Tochter"],
  ["frater", "der Bruder"], ["soror", "die Schwester"], ["magister", "der Lehrer"], ["discipulus", "der Schüler"],
  ["sol", "die Sonne"], ["luna", "der Mond"], ["stella", "der Stern"], ["caelum", "der Himmel"],
  ["ignis", "das Feuer"], ["ventus", "der Wind"], ["mare", "das Meer"], ["flumen", "der Fluss"],
  ["mons", "der Berg"], ["ager", "das Feld/der Acker"], ["hortus", "der Garten"], ["arbor", "der Baum"],
  ["flos", "die Blume"], ["cibus", "die Speise"], ["panis", "das Brot"], ["vinum", "der Wein"],
  ["annus", "das Jahr"], ["dies", "der Tag"], ["nox", "die Nacht"], ["hora", "die Stunde"],
  ["tempus", "die Zeit"], ["locus", "der Ort"], ["domus", "das Haus"], ["res", "die Sache"],
  ["magnus", "groß"], ["parvus", "klein"], ["bonus", "gut"], ["malus", "schlecht"],
  ["longus", "lang"], ["altus", "hoch/tief"], ["novus", "neu"], ["multus", "viel"],
  ["clarus", "berühmt/hell"], ["fortis", "tapfer/stark"], ["laetus", "fröhlich"], ["felix", "glücklich"],
  ["amare", "lieben"], ["laudare", "loben"], ["vocare", "rufen"], ["dare", "geben"],
  ["videre", "sehen"], ["audire", "hören"], ["dicere", "sagen"], ["facere", "machen"],
  ["venire", "kommen"], ["ire", "gehen"], ["esse", "sein"], ["habere", "haben"],
  ["scribere", "schreiben"], ["legere", "lesen"], ["docere", "lehren"], ["discere", "lernen"],
  ["pugnare", "kämpfen"], ["superare", "besiegen"], ["portare", "tragen"], ["parare", "vorbereiten"],
  ["semper", "immer"], ["numquam", "niemals"], ["saepe", "oft"], ["nunc", "jetzt"],
  ["hodie", "heute"], ["cras", "morgen"], ["heri", "gestern"], ["ibi", "dort"],
  ["hic", "hier"], ["ubi", "wo"], ["cur", "warum"], ["quis", "wer"],
  ["et", "und"], ["sed", "aber"], ["non", "nicht"], ["cum", "mit"],
];

// Deklinationen: Endungen an Stamm
const LA_A_ENDUNGEN = [
  ["Nominativ Singular", "a"], ["Genitiv Singular", "ae"], ["Dativ Singular", "ae"],
  ["Akkusativ Singular", "am"], ["Ablativ Singular", "a"], ["Nominativ Plural", "ae"],
  ["Genitiv Plural", "arum"], ["Dativ Plural", "is"], ["Akkusativ Plural", "as"], ["Ablativ Plural", "is"],
];
const LA_O_ENDUNGEN = [
  ["Nominativ Singular", "us"], ["Genitiv Singular", "i"], ["Dativ Singular", "o"],
  ["Akkusativ Singular", "um"], ["Ablativ Singular", "o"], ["Nominativ Plural", "i"],
  ["Genitiv Plural", "orum"], ["Dativ Plural", "is"], ["Akkusativ Plural", "os"], ["Ablativ Plural", "is"],
];
const LA_A_NOMEN = [["puell", "puella (Mädchen)"], ["silv", "silva (Wald)"], ["port", "porta (Tor)"], ["aqu", "aqua (Wasser)"], ["vi", "via (Weg)"], ["terr", "terra (Land)"]];
const LA_O_NOMEN = [["serv", "servus (Sklave)"], ["domin", "dominus (Herr)"], ["amic", "amicus (Freund)"], ["equ", "equus (Pferd)"], ["mur", "murus (Mauer)"]];

function lateinDeklinationGens() {
  return [
    (r) => {
      const [stem, label] = r.pick(LA_A_NOMEN);
      const [caseLabel, ending] = r.pick(LA_A_ENDUNGEN);
      const correct = stem + ending;
      const forms = LA_A_ENDUNGEN.map((e) => stem + e[1]);
      return mc(r, "a-Deklination",
        `Wie lautet der ${caseLabel} von ${label} (a-Deklination)?`,
        correct, pickN(r, forms, correct, 3),
        `${caseLabel} von ${label}: ${correct}.`);
    },
    (r) => {
      const [stem, label] = r.pick(LA_O_NOMEN);
      const [caseLabel, ending] = r.pick(LA_O_ENDUNGEN);
      const correct = stem + ending;
      const forms = LA_O_ENDUNGEN.map((e) => stem + e[1]);
      return mc(r, "o-Deklination",
        `Wie lautet der ${caseLabel} von ${label} (o-Deklination)?`,
        correct, pickN(r, forms, correct, 3),
        `${caseLabel} von ${label}: ${correct}.`);
    },
  ];
}

const LA_PRON = ["1. Person Singular (ich)", "2. Person Singular (du)", "3. Person Singular (er/sie/es)",
  "1. Person Plural (wir)", "2. Person Plural (ihr)", "3. Person Plural (sie)"];
const LA_AMARE_PRAES = ["amo", "amas", "amat", "amamus", "amatis", "amant"];
const LA_ESSE_PRAES = ["sum", "es", "est", "sumus", "estis", "sunt"];
const LA_VENIRE_PRAES = ["venio", "venis", "venit", "venimus", "venitis", "veniunt"];
const LA_AMARE_PERF = ["amavi", "amavisti", "amavit", "amavimus", "amavistis", "amaverunt"];
const LA_ESSE_PERF = ["fui", "fuisti", "fuit", "fuimus", "fuistis", "fuerunt"];
const LA_VENIRE_PERF = ["veni", "venisti", "venit", "venimus", "venistis", "venerunt"];

function lateinKonjugationGens() {
  const gens = [];
  gens.push(...conjGens("Präsens amare", "amare (lieben) – Präsens", LA_AMARE_PRAES, LA_PRON, LA_LEADS));
  gens.push(...conjGens("Präsens esse", "esse (sein) – Präsens", LA_ESSE_PRAES, LA_PRON, LA_LEADS));
  gens.push(...conjGens("Präsens venire", "venire (kommen) – Präsens", LA_VENIRE_PRAES, LA_PRON, LA_LEADS));
  gens.push(...conjGens("Perfekt amare", "amare (lieben) – Perfekt", LA_AMARE_PERF, LA_PRON, LA_LEADS));
  gens.push(...conjGens("Perfekt esse", "esse (sein) – Perfekt", LA_ESSE_PERF, LA_PRON, LA_LEADS));
  gens.push(...conjGens("Perfekt venire", "venire (kommen) – Perfekt", LA_VENIRE_PERF, LA_PRON, LA_LEADS));
  return gens;
}

// Berühmte lateinische Zitate → deutsche Bedeutung
const LA_ZITATE = [
  ["Veni, vidi, vici", "Ich kam, ich sah, ich siegte"],
  ["Alea iacta est", "Der Würfel ist gefallen"],
  ["Carpe diem", "Nutze den Tag"],
  ["Cogito, ergo sum", "Ich denke, also bin ich"],
  ["Errare humanum est", "Irren ist menschlich"],
  ["Panem et circenses", "Brot und Spiele"],
  ["Divide et impera", "Teile und herrsche"],
  ["Tempus fugit", "Die Zeit flieht"],
  ["Mens sana in corpore sano", "Ein gesunder Geist in einem gesunden Körper"],
  ["Vox populi, vox dei", "Die Stimme des Volkes ist die Stimme Gottes"],
  ["Dum spiro, spero", "Solange ich atme, hoffe ich"],
  ["Nomen est omen", "Der Name ist ein Zeichen (Vorbedeutung)"],
  ["In vino veritas", "Im Wein liegt die Wahrheit"],
  ["Festina lente", "Eile mit Weile"],
  ["Ars longa, vita brevis", "Die Kunst ist lang, das Leben kurz"],
];

function lateinGenerators() {
  const gens = [];
  gens.push(...vocabGens("Vokabeln", LA_VOKABELN, "Deutsch", "Latein", LA_LEADS));
  gens.push(...lateinDeklinationGens());
  gens.push(...lateinKonjugationGens());
  gens.push(...factGens("Zitate", LA_ZITATE, (t) => `Was bedeutet das Zitat „${t}“?`,
    (d) => `Welches lateinische Zitat bedeutet „${d}“?`, LA_LEADS));
  return gens;
}

/* ══════════════════════════════ SPANISCH ══════════════════════════════ */

const ES_LEADS = ["", "Spanisch: ", "Vokabel: ", "Wähle die richtige Antwort. "];

const ES_BASE = ["cero", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve",
  "diez", "once", "doce", "trece", "catorce", "quince", "dieciséis", "diecisiete", "dieciocho", "diecinueve",
  "veinte", "veintiuno", "veintidós", "veintitrés", "veinticuatro", "veinticinco", "veintiséis", "veintisiete", "veintiocho", "veintinueve"];
const ES_TENS = { 30: "treinta", 40: "cuarenta", 50: "cincuenta", 60: "sesenta", 70: "setenta", 80: "ochenta", 90: "noventa" };

function esNumber(n) {
  if (n < 30) return ES_BASE[n];
  if (n === 100) return "cien";
  const t = Math.floor(n / 10) * 10, u = n % 10;
  const base = ES_TENS[t];
  if (u === 0) return base;
  return `${base} y ${ES_BASE[u]}`;
}

function esNumberGens() {
  return [
    (r) => {
      const n = r.int(0, 100);
      const w = esNumber(n);
      const dist = [n + 1, n - 1, n + 2, n - 2, n + 10, n - 10].filter((x) => x >= 0 && x <= 100 && x !== n);
      return mc(r, "Zahlen", `Wie schreibt man die Zahl ${n} auf Spanisch?`,
        w, pickN(r, dist.map(esNumber), w, 3), `${n} heißt auf Spanisch „${w}“.`);
    },
    (r) => {
      const n = r.int(0, 100);
      const w = esNumber(n);
      const dist = [n + 1, n - 1, n + 2, n - 2, n + 10, n - 10].filter((x) => x >= 0 && x <= 100 && x !== n);
      return mc(r, "Zahlen", `Welche Zahl ist „${w}“ (Spanisch)?`,
        n, pickN(r, dist.map(String), String(n), 3), `„${w}“ ist die Zahl ${n}.`);
    },
  ];
}

const ES_PRON = ["yo (ich)", "tú (du)", "él/ella (er/sie)", "nosotros (wir)", "vosotros (ihr)", "ellos/ellas (sie)"];
const ES_SER = ["soy", "eres", "es", "somos", "sois", "son"];
const ES_ESTAR = ["estoy", "estás", "está", "estamos", "estáis", "están"];
const ES_TENER = ["tengo", "tienes", "tiene", "tenemos", "tenéis", "tienen"];

function esKonjugationGens() {
  const gens = [];
  gens.push(...conjGens("Konjugation ser", "ser (sein – dauerhaft)", ES_SER, ES_PRON, ES_LEADS));
  gens.push(...conjGens("Konjugation estar", "estar (sein – Zustand/Ort)", ES_ESTAR, ES_PRON, ES_LEADS));
  gens.push(...conjGens("Konjugation tener", "tener (haben)", ES_TENER, ES_PRON, ES_LEADS));
  return gens;
}

// Vokabeln Deutsch↔Spanisch (>= 120 Paare)
const ES_VOKABELN = [
  ["Hallo", "hola"], ["danke", "gracias"], ["bitte", "por favor"], ["ja", "sí"], ["nein", "no"],
  ["das Haus", "la casa"], ["die Schule", "la escuela"], ["der Lehrer", "el profesor"], ["der Freund", "el amigo"],
  ["die Katze", "el gato"], ["der Hund", "el perro"], ["das Wasser", "el agua"], ["das Brot", "el pan"],
  ["der Käse", "el queso"], ["der Apfel", "la manzana"], ["die Milch", "la leche"], ["der Tag", "el día"],
  ["die Nacht", "la noche"], ["der Morgen", "la mañana"], ["der Abend", "la tarde"], ["die Woche", "la semana"],
  ["das Jahr", "el año"], ["die Stunde", "la hora"], ["die Zeit", "el tiempo"], ["die Sonne", "el sol"],
  ["der Mond", "la luna"], ["der Himmel", "el cielo"], ["das Meer", "el mar"], ["der Berg", "la montaña"],
  ["der Fluss", "el río"], ["der Baum", "el árbol"], ["die Blume", "la flor"], ["der Garten", "el jardín"],
  ["die Stadt", "la ciudad"], ["das Dorf", "el pueblo"], ["die Straße", "la calle"], ["das Auto", "el coche"],
  ["der Zug", "el tren"], ["das Fahrrad", "la bicicleta"], ["das Flugzeug", "el avión"], ["das Buch", "el libro"],
  ["der Stift", "el bolígrafo"], ["das Papier", "el papel"], ["der Tisch", "la mesa"], ["der Stuhl", "la silla"],
  ["das Fenster", "la ventana"], ["die Tür", "la puerta"], ["das Zimmer", "la habitación"], ["die Küche", "la cocina"],
  ["der Mann", "el hombre"], ["die Frau", "la mujer"], ["das Kind", "el niño"], ["das Mädchen", "la niña"],
  ["die Mutter", "la madre"], ["der Vater", "el padre"], ["der Bruder", "el hermano"], ["die Schwester", "la hermana"],
  ["die Familie", "la familia"], ["die Hand", "la mano"], ["der Kopf", "la cabeza"], ["das Auge", "el ojo"],
  ["das Ohr", "la oreja"], ["die Nase", "la nariz"], ["der Mund", "la boca"], ["der Fuß", "el pie"],
  ["das Bein", "la pierna"], ["der Arm", "el brazo"], ["das Herz", "el corazón"], ["rot", "rojo"],
  ["blau", "azul"], ["grün", "verde"], ["gelb", "amarillo"], ["schwarz", "negro"], ["weiß", "blanco"],
  ["groß", "grande"], ["klein", "pequeño"], ["gut", "bueno"], ["schlecht", "malo"], ["schön", "bonito"],
  ["neu", "nuevo"], ["alt", "viejo"], ["jung", "joven"], ["schnell", "rápido"], ["langsam", "lento"],
  ["warm", "caliente"], ["kalt", "frío"], ["glücklich", "feliz"], ["traurig", "triste"], ["essen", "comer"],
  ["trinken", "beber"], ["schlafen", "dormir"], ["lesen", "leer"], ["schreiben", "escribir"], ["sprechen", "hablar"],
  ["hören", "escuchar"], ["sehen", "ver"], ["kommen", "venir"], ["gehen", "ir"], ["machen", "hacer"],
  ["nehmen", "tomar"], ["geben", "dar"], ["kaufen", "comprar"], ["verkaufen", "vender"], ["spielen", "jugar"],
  ["arbeiten", "trabajar"], ["lernen", "aprender"], ["wissen", "saber"], ["wollen", "querer"], ["können", "poder"],
  ["müssen", "deber"], ["lieben", "amar"], ["finden", "encontrar"], ["suchen", "buscar"], ["heute", "hoy"],
  ["morgen", "mañana"], ["gestern", "ayer"], ["immer", "siempre"], ["nie", "nunca"], ["oft", "a menudo"],
  ["hier", "aquí"], ["dort", "allí"], ["links", "a la izquierda"], ["rechts", "a la derecha"], ["viel", "mucho"],
  ["wenig", "poco"], ["mit", "con"], ["ohne", "sin"], ["für", "para"], ["und", "y"],
  ["oder", "o"], ["aber", "pero"], ["sehr", "muy"], ["auch", "también"], ["jetzt", "ahora"],
];

function spanischGenerators() {
  const gens = [];
  gens.push(...vocabGens("Vokabeln", ES_VOKABELN, "Deutsch", "Spanisch", ES_LEADS));
  gens.push(...esNumberGens());
  gens.push(...esKonjugationGens());
  return gens;
}

/* ══════════════════════════════ MATHEMATIK 11–13 (ERGÄNZUNG) ══════════════════════════════ */

const MA_LEADS = ["", "Mathematik: ", "Berechne. ", "Analysis/Geometrie: "];

/** Formatiert ein Monom coef·x^power als lesbaren String. */
function mono(coef, power) {
  if (power === 0) return `${coef}`;
  const xp = power === 1 ? "x" : `x^${power}`;
  if (coef === 1) return xp;
  if (coef === -1) return `-${xp}`;
  return `${coef}${xp}`;
}

/** Formatiert ein Polynom ax² + bx + c (b,c dürfen 0/negativ sein). */
function quad(a, b, c) {
  let s = mono(a, 2);
  if (b !== 0) s += (b > 0 ? ` + ${mono(b, 1)}` : ` - ${mono(-b, 1)}`);
  if (c !== 0) s += (c > 0 ? ` + ${c}` : ` - ${-c}`);
  return s;
}

function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { [a, b] = [b, a % b]; } return a; }
function binom(n, k) {
  if (k < 0 || k > n) return 0;
  let res = 1;
  for (let i = 1; i <= k; i++) res = (res * (n - i + 1)) / i;
  return Math.round(res);
}

function mathematik2Generators() {
  const gens = [];

  // 1) Stammfunktion eines Monoms
  gens.push((r) => {
    const n = r.int(1, 4), c = r.int(1, 6);
    const a = c * (n + 1); // f = a x^n → F = c x^(n+1)
    const correct = mono(c, n + 1) + " + C";
    const dist = [
      mono(a, n) + " + C",
      mono(c, n) + " + C",
      mono(a, n + 1) + " + C",
      mono(c + 1, n + 1) + " + C",
    ].filter((v) => v !== correct);
    return mc(r, "Integralrechnung",
      `${r.pick(MA_LEADS)}Welche Funktion ist eine Stammfunktion von f(x) = ${mono(a, n)}?`,
      correct, pickN(r, dist, correct, 3),
      `∫ ${mono(a, n)} dx = ${mono(c, n + 1)} + C.`);
  });

  // 2) Bestimmtes Integral eines Monoms von 0 bis b
  gens.push((r) => {
    const n = r.int(1, 3), c = r.int(1, 5), b = r.int(2, 4);
    const a = c * (n + 1);
    const val = c * b ** (n + 1); // ∫0..b a x^n dx = c·b^(n+1)
    const dist = [val + 1, val - 1, a * b ** n, c * b ** n, val + b].filter((x) => x !== val);
    return mc(r, "Integralrechnung",
      `${r.pick(MA_LEADS)}Berechne das bestimmte Integral von f(x) = ${mono(a, n)} in den Grenzen von 0 bis ${b}.`,
      val, pickN(r, dist.map(String), String(val), 3),
      `∫₀^${b} ${mono(a, n)} dx = [${mono(c, n + 1)}]₀^${b} = ${val}.`);
  });

  // 3) Extremstelle einer quadratischen Funktion
  gens.push((r) => {
    const a = r.pick([-3, -2, -1, 1, 2, 3]);
    const hx = r.int(-5, 5);
    const b = -2 * a * hx;
    const c = r.int(-6, 6);
    const dist = [hx + 1, hx - 1, hx + 2, -hx, hx + 3].filter((x) => x !== hx);
    return mc(r, "Extremstellen",
      `${r.pick(MA_LEADS)}An welcher Stelle x hat die Funktion f(x) = ${quad(a, b, c)} ihr Extremum?`,
      `x = ${hx}`, pickN(r, dist.map((x) => `x = ${x}`), `x = ${hx}`, 3),
      `Scheitel bei x = -b/(2a) = ${hx}.`);
  });

  // 4) Minimum oder Maximum (quadratisch)
  gens.push((r) => {
    const a = r.pick([-3, -2, -1, 1, 2, 3]);
    const hx = r.int(-4, 4);
    const b = -2 * a * hx;
    const c = r.int(-6, 6);
    const type = a > 0 ? "Minimum" : "Maximum";
    return mc(r, "Extremstellen",
      `Hat die Funktion f(x) = ${quad(a, b, c)} an ihrer Extremstelle ein Minimum oder ein Maximum?`,
      type, [a > 0 ? "Maximum" : "Minimum", "Sattelpunkt", "Wendepunkt", "kein Extremum"],
      `Da a = ${a} ${a > 0 ? "> 0" : "< 0"}, ist die Parabel nach ${a > 0 ? "oben" : "unten"} geöffnet → ${type}.`);
  });

  // 5) Extremstellen einer kubischen Funktion über f'(x)=0
  gens.push((r) => {
    let r1 = r.int(-4, 4), r2 = r.int(-4, 4);
    if (r1 === r2) return null;
    if (r1 > r2) [r1, r2] = [r2, r1];
    const A = 3, B = -3 * (r1 + r2), C = 3 * r1 * r2;
    const correct = `x = ${r1} und x = ${r2}`;
    const dist = [
      `x = ${r1} und x = ${r2 + 1}`,
      `x = ${r1 - 1} und x = ${r2}`,
      `x = ${-r1} und x = ${-r2}`,
      `x = ${r1 + 1} und x = ${r2 + 1}`,
    ].filter((v) => v !== correct);
    return mc(r, "Extremstellen",
      `Die Ableitung einer Funktion f ist f'(x) = ${quad(A, B, C)}. An welchen Stellen liegen die Extremstellen?`,
      correct, pickN(r, dist, correct, 3),
      `f'(x) = 0 ⇒ 3(x - ${r1})(x - ${r2}) = 0 ⇒ x = ${r1} oder x = ${r2}.`);
  });

  // 6) Skalarprodukt (2D/3D)
  gens.push((r) => {
    const dim = r.pick([2, 3]);
    const a = Array.from({ length: dim }, () => r.int(-5, 5));
    const b = Array.from({ length: dim }, () => r.int(-5, 5));
    const dot = a.reduce((s, x, i) => s + x * b[i], 0);
    const va = `(${a.join("; ")})`, vb = `(${b.join("; ")})`;
    const dist = [dot + 1, dot - 1, dot + 2, dot - 2, dot + 5].filter((x) => x !== dot);
    return mc(r, "Vektoren",
      `Berechne das Skalarprodukt der Vektoren ${va} und ${vb}.`,
      dot, pickN(r, dist.map(String), String(dot), 3),
      `${va} · ${vb} = ${a.map((x, i) => `${x}·${b[i]}`).join(" + ")} = ${dot}.`);
  });

  // 7) Vektorlänge (mit ganzzahligem Ergebnis)
  const LEN2 = [[3, 4, 5], [6, 8, 10], [5, 12, 13], [8, 15, 17], [9, 12, 15], [20, 21, 29], [7, 24, 25]];
  const LEN3 = [[1, 2, 2, 3], [2, 3, 6, 7], [4, 0, 3, 5], [2, 6, 9, 11], [1, 4, 8, 9], [2, 10, 11, 15]];
  gens.push((r) => {
    const use3 = r.next() < 0.5;
    const t = r.pick(use3 ? LEN3 : LEN2);
    const comps = t.slice(0, -1).map((x) => (r.next() < 0.5 ? -x : x));
    const len = t[t.length - 1];
    const v = `(${comps.join("; ")})`;
    const dist = [len + 1, len - 1, len + 2, len - 2, Math.abs(comps.reduce((s, x) => s + x, 0))].filter((x) => x > 0 && x !== len);
    return mc(r, "Vektoren",
      `Wie lang ist der Vektor ${v}? (Betrag)`,
      len, pickN(r, dist.map(String), String(len), 3),
      `|${v}| = √(${comps.map((x) => `${x}²`).join(" + ")}) = ${len}.`);
  });

  // 8) Binomialverteilung P(X=k) mit p = 1/2
  gens.push((r) => {
    const n = r.int(2, 8), k = r.int(0, n);
    const num = binom(n, k), den = 2 ** n;
    const g = gcd(num, den);
    const correct = `${num / g}/${den / g}`;
    const cand = [];
    for (let j = 0; j <= n; j++) {
      if (j === k) continue;
      const b2 = binom(n, j), g2 = gcd(b2, den);
      cand.push(`${b2 / g2}/${den / g2}`);
    }
    return mc(r, "Binomialverteilung",
      `Eine faire Münze wird ${n}-mal geworfen. Wie groß ist die Wahrscheinlichkeit für genau ${k}-mal Kopf?`,
      correct, pickN(r, cand, correct, 3),
      `P(X=${k}) = C(${n},${k})·(1/2)^${n} = ${num}/${den} = ${correct}.`);
  });

  // 9) Erwartungswert der Binomialverteilung
  gens.push((r) => {
    const n = r.int(2, 40), p = r.pick([[1 / 2, "1/2"], [1 / 4, "1/4"], [1 / 5, "1/5"], [1 / 10, "1/10"]]);
    const ev = n * p[0];
    if (!Number.isInteger(ev)) return null;
    const dist = [ev + 1, ev - 1, ev + 2, n, Math.round(n * p[0] * (1 - p[0]))].filter((x) => x !== ev);
    return mc(r, "Binomialverteilung",
      `Eine binomialverteilte Zufallsgröße X hat n = ${n} und p = ${p[1]}. Wie groß ist der Erwartungswert E(X)?`,
      ev, pickN(r, dist.map(String), String(ev), 3),
      `E(X) = n·p = ${n}·${p[1]} = ${ev}.`);
  });

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

  console.log("Informatik (Klasse 7–13, je >= 600):");
  for (let k = 7; k <= 13; k++) total += writeBank("informatik", k, generateBank(11000 + k, 600, informatikGenerators(k)));

  console.log("Französisch (Klasse 6–10, je >= 600):");
  for (let k = 6; k <= 10; k++) total += writeBank("franzoesisch", k, generateBank(12000 + k, 600, franzoesischGenerators()));

  console.log("Latein (Klasse 6–10, je >= 500):");
  for (let k = 6; k <= 10; k++) total += writeBank("latein", k, generateBank(13000 + k, 500, lateinGenerators()));

  console.log("Spanisch (Klasse 8–10, je >= 500):");
  for (let k = 8; k <= 10; k++) total += writeBank("spanisch", k, generateBank(14000 + k, 500, spanischGenerators()));

  console.log("Mathematik-Ergänzung (Klasse 11–13, je >= 400):");
  for (let k = 11; k <= 13; k++) total += writeBank("mathematik2", k, generateBank(15000 + k, 400, mathematik2Generators()));

  console.log(`\nGesamt (Runde 3): ${total} Fragen.`);
}

main();
