/**
 * MEGA-Fragen-Generator RUNDE 12 für MasterMind.
 *
 * Ergänzt die Fragenbank aus generate.mjs … generate11.mjs im GLEICHEN Format
 *   scripts/questions/mega/data/<fach>-klasse<k>.json
 * mit [{ topic, question, options[4], correct(Index), explanation }].
 *
 * Fächer/Umfang (nur NEUE Dateien mit Präfix mathematik8-/englisch6-/musik2-/kunst2-):
 *   1) mathematik8  Klasse 3–6,  >= 400/Klasse
 *      (Zahlenstrahl ablesen, Runden-Vertiefung, schriftliche Verfahren
 *       Addition/Subtraktion/Multiplikation mehrstellig — exakt berechnet,
 *       Geometrie Grundschule: Formen, Symmetrie, rechte Winkel, römische Zahlen)
 *   2) englisch6    Klasse 3–4,  >= 350/Klasse
 *      (Grundschulenglisch: Farben, Zahlen 1–20, Tiere, Familie, Schulsachen,
 *       Wochentage — Wortliste >= 100 Paare; einfache Sätze mit am/are/is)
 *   3) musik2       Klasse 5–10, >= 250/Klasse
 *      (Dur-Kreuz-Reihenfolge, Dynamik-Zeichen, Taktarten zählen — berechnet,
 *       Komponisten-Werke, Musikrichtungen-Merkmale)
 *   4) kunst2       Klasse 5–10, >= 250/Klasse
 *      (Perspektive-Begriffe, Farbkontraste nach Itten, Künstler-Werke,
 *       Drucktechniken, Bildaufbau-Begriffe)
 *
 * Deterministisch (mulberry32-Seed). Keine Abhängigkeiten, reines Node.
 *
 * Aufruf (vom Repo-Root):
 *   node scripts/questions/mega/generate12.mjs
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

/** Zahlen-Distraktoren nahe an der Lösung (nie negativ, nie gleich). */
function nearNumbers(rng, correct, spread = 2) {
  const set = new Set([correct]);
  const out = [];
  let guard = 0;
  while (out.length < 3 && guard < 100) {
    guard++;
    const delta = rng.int(1, spread) * (rng.next() < 0.5 ? -1 : 1);
    const cand = correct + delta;
    if (cand < 0 || set.has(cand)) continue;
    set.add(cand);
    out.push(cand);
  }
  let up = correct + spread + 1;
  while (out.length < 3) { if (!set.has(up)) { set.add(up); out.push(up); } up++; }
  return out;
}

/** Distraktoren für große berechnete Ergebnisse (Rechenfehler-typisch). */
function calcDistractors(rng, correct) {
  const deltas = rng.shuffle([1, -1, 2, -2, 10, -10, 100, -100, 9, 11]);
  const set = new Set([correct]);
  const out = [];
  for (const d of deltas) {
    const cand = correct + d;
    if (cand < 0 || set.has(cand)) continue;
    set.add(cand);
    out.push(cand);
    if (out.length === 3) break;
  }
  let up = correct + 3;
  while (out.length < 3) { if (!set.has(up)) { set.add(up); out.push(up); } up++; }
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

/* ══════════════════ 1) MATHEMATIK Klasse 3–6 ══════════════════ */

const ROEMISCH_MAP = [
  [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"],
  [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
];

function toRoman(n) {
  let rest = n;
  let out = "";
  for (const [v, s] of ROEMISCH_MAP) {
    while (rest >= v) { out += s; rest -= v; }
  }
  return out;
}

// [Figur, Ecken, Seiten]
const FORMEN = [
  ["Dreieck", 3, 3], ["Viereck", 4, 4], ["Quadrat", 4, 4], ["Rechteck", 4, 4],
  ["Fünfeck", 5, 5], ["Sechseck", 6, 6], ["Achteck", 8, 8],
];

// [Figur, Anzahl Symmetrieachsen als String, Erklärung]
const SYMMETRIE = [
  ["Quadrat", "4", "Ein Quadrat hat 4 Symmetrieachsen: 2 durch die Seitenmitten und 2 durch die Diagonalen."],
  ["Rechteck (kein Quadrat)", "2", "Ein Rechteck hat 2 Symmetrieachsen durch die Seitenmitten. Die Diagonalen sind KEINE Symmetrieachsen."],
  ["gleichseitiges Dreieck", "3", "Beim gleichseitigen Dreieck geht durch jede Ecke eine Symmetrieachse: 3 Achsen."],
  ["gleichschenkliges Dreieck (nicht gleichseitig)", "1", "Ein gleichschenkliges Dreieck hat genau 1 Symmetrieachse durch die Spitze."],
  ["Kreis", "unendlich viele", "Jede Gerade durch den Mittelpunkt ist Symmetrieachse — der Kreis hat unendlich viele."],
  ["regelmäßiges Sechseck", "6", "Ein regelmäßiges Sechseck hat 6 Symmetrieachsen."],
  ["Parallelogramm (kein Rechteck, keine Raute)", "0", "Ein allgemeines Parallelogramm hat keine Symmetrieachse, nur einen Drehpunkt."],
];

// [Figur, Anzahl rechte Winkel, Erklärung]
const RECHTE_WINKEL = [
  ["Quadrat", 4, "Im Quadrat sind alle 4 Innenwinkel rechte Winkel (90°)."],
  ["Rechteck", 4, "Im Rechteck sind alle 4 Innenwinkel rechte Winkel (90°)."],
  ["rechtwinkliges Dreieck", 1, "Ein rechtwinkliges Dreieck hat genau 1 rechten Winkel."],
  ["gleichseitiges Dreieck", 0, "Im gleichseitigen Dreieck sind alle Winkel 60° — kein rechter Winkel."],
  ["regelmäßiges Sechseck", 0, "Im regelmäßigen Sechseck sind alle Winkel 120° — kein rechter Winkel."],
];

// [Körper, Flächen, Kanten, Ecken]
const KOERPER = [
  ["Würfel", 6, 12, 8], ["Quader", 6, 12, 8],
  ["quadratische Pyramide", 5, 8, 5], ["Dreiecksprisma", 5, 9, 6],
];

const GROSSE_BUCHSTABEN_SYM = [
  ["A", "senkrecht"], ["M", "senkrecht"], ["T", "senkrecht"], ["U", "senkrecht"], ["V", "senkrecht"], ["W", "senkrecht"],
  ["B", "waagerecht"], ["C", "waagerecht"], ["D", "waagerecht"], ["E", "waagerecht"], ["K", "waagerecht"],
];
const KEINE_SYM_BUCHSTABEN = ["F", "G", "J", "L", "P", "Q", "R", "S", "Z", "N"];

function mathematik8Generators(klasse) {
  const gens = [];

  // ── Zahlenstrahl ablesen (berechnet) ──
  const strahlSchritte = klasse === 3 ? [1, 2, 5, 10] : klasse === 4 ? [5, 10, 25, 50, 100] : klasse === 5 ? [10, 50, 100, 250, 500] : [100, 250, 500, 1000];
  gens.push((r) => {
    const schritt = r.pick(strahlSchritte);
    const start = r.int(0, 9) * schritt;
    const pos = r.int(1, 8);
    const wert = start + pos * schritt;
    return mc(r, "Zahlenstrahl",
      `${r.pick(LEADS)}Ein Zahlenstrahl beginnt bei ${start}, von Strich zu Strich sind es ${schritt}. Welche Zahl steht am ${pos}. Strich nach ${start}?`,
      wert, nearNumbers(r, wert, 1).map((n) => start + (n - start)).concat([wert + schritt, wert - schritt, wert + 2 * schritt].filter((x) => x >= 0 && x !== wert)),
      `${pos} Schritte à ${schritt}: ${start} + ${pos} · ${schritt} = ${wert}.`);
  });
  gens.push((r) => {
    const schritt = r.pick(strahlSchritte);
    const a = r.int(0, 9) * schritt;
    const b = a + r.int(2, 9) * schritt;
    const anzahl = (b - a) / schritt;
    return mc(r, "Zahlenstrahl",
      `${r.pick(LEADS)}Auf einem Zahlenstrahl sind es von Strich zu Strich ${schritt}. Wie viele Schritte sind es von ${a} bis ${b}?`,
      anzahl, nearNumbers(r, anzahl, 2),
      `(${b} − ${a}) : ${schritt} = ${anzahl} Schritte.`);
  });
  gens.push((r) => {
    const schritt = r.pick(strahlSchritte);
    const a = r.int(1, 9) * schritt;
    const b = a + 2 * schritt;
    const mitte = a + schritt;
    return mc(r, "Zahlenstrahl",
      `${r.pick(LEADS)}Welche Zahl liegt auf dem Zahlenstrahl genau in der Mitte zwischen ${a} und ${b}?`,
      mitte, [a + Math.round(schritt / 2), mitte + schritt, mitte - schritt, b + schritt].filter((x) => x !== mitte && x >= 0),
      `Die Mitte zwischen ${a} und ${b} ist (${a} + ${b}) : 2 = ${mitte}.`);
  });

  // ── Runden (Vertiefung) ──
  const rundenStufen = klasse === 3 ? [10] : klasse === 4 ? [10, 100] : klasse === 5 ? [100, 1000] : [1000, 10000];
  gens.push((r) => {
    const stufe = r.pick(rundenStufen);
    const n = r.int(stufe + 1, stufe * (klasse >= 5 ? 90 : 9));
    if (n % stufe === 0) return null;
    const gerundet = Math.round(n / stufe) * stufe;
    const stufenName = { 10: "Zehner", 100: "Hunderter", 1000: "Tausender", 10000: "Zehntausender" }[stufe];
    const rest = n % stufe;
    const richtung = rest >= stufe / 2 ? "aufgerundet" : "abgerundet";
    return mc(r, "Runden",
      `${r.pick(LEADS)}Runde ${n} auf den nächsten ${stufenName}.`,
      gerundet,
      [gerundet + stufe, gerundet - stufe, n - rest === gerundet ? gerundet + 2 * stufe : n - rest].filter((x) => x >= 0 && x !== gerundet),
      `Die Ziffer dahinter entscheidet: ab 5 wird aufgerundet. ${n} wird ${richtung} zu ${gerundet}.`);
  });
  gens.push((r) => {
    const stufe = r.pick(rundenStufen);
    const ziel = r.int(2, klasse >= 5 ? 80 : 9) * stufe;
    const richtig = ziel - Math.floor(stufe / 2); // rundet auf → ziel
    const falsch1 = ziel - Math.floor(stufe / 2) - 1; // rundet ab
    const stufenName = { 10: "Zehner", 100: "Hunderter", 1000: "Tausender", 10000: "Zehntausender" }[stufe];
    return mc(r, "Runden",
      `${r.pick(LEADS)}Welche Zahl ergibt auf den ${stufenName} gerundet ${ziel}?`,
      richtig, [falsch1, ziel + Math.ceil(stufe / 2), ziel - stufe - 1].filter((x) => x !== richtig),
      `${richtig} liegt näher an ${ziel} (Rest ${stufe / 2} → aufrunden), also gerundet ${ziel}.`);
  });

  // ── Schriftliche Verfahren (exakt berechnet) ──
  const addMax = klasse === 3 ? 999 : klasse === 4 ? 9999 : 99999;
  gens.push((r) => {
    const a = r.int(Math.floor(addMax / 10), addMax);
    const b = r.int(Math.floor(addMax / 10), addMax);
    return mc(r, "Schriftliche Addition",
      `${r.pick(LEADS)}Rechne schriftlich: ${a} + ${b} = ?`,
      a + b, calcDistractors(r, a + b),
      `Stellenweise von rechts addieren (mit Übertrag): ${a} + ${b} = ${a + b}.`);
  });
  gens.push((r) => {
    const b = r.int(Math.floor(addMax / 10), Math.floor(addMax / 2));
    const a = b + r.int(Math.floor(addMax / 10), Math.floor(addMax / 2));
    return mc(r, "Schriftliche Subtraktion",
      `${r.pick(LEADS)}Rechne schriftlich: ${a} − ${b} = ?`,
      a - b, calcDistractors(r, a - b),
      `Stellenweise von rechts subtrahieren (mit Entbündeln): ${a} − ${b} = ${a - b}. Probe: ${a - b} + ${b} = ${a}.`);
  });
  gens.push((r) => {
    let a, b;
    if (klasse === 3) { a = r.int(12, 99); b = r.int(2, 9); }
    else if (klasse === 4) { a = r.int(102, 999); b = r.int(2, 9); }
    else if (klasse === 5) { a = r.int(12, 99); b = r.int(12, 99); }
    else { a = r.int(102, 999); b = r.int(12, 99); }
    return mc(r, "Schriftliche Multiplikation",
      `${r.pick(LEADS)}Rechne schriftlich: ${a} · ${b} = ?`,
      a * b, [a * b + a, a * b - a, a * b + 10, a * b - 10, a * b + b].filter((x) => x > 0 && x !== a * b),
      `${a} · ${b} = ${a * b}.`);
  });

  // ── Geometrie: Formen erkennen ──
  gens.push((r) => {
    const [figur, ecken] = r.pick(FORMEN);
    return mc(r, "Formen",
      `${r.pick(LEADS)}Wie viele Ecken hat ein ${figur}?`,
      ecken, nearNumbers(r, ecken, 2).filter((n) => n >= 0),
      `Ein ${figur} hat ${ecken} Ecken und ebenso viele Seiten.`);
  });
  gens.push((r) => {
    const anzahl = r.pick([3, 4, 5, 6, 8]);
    const namen = { 3: "Dreieck", 4: "Viereck", 5: "Fünfeck", 6: "Sechseck", 8: "Achteck" };
    const richtig = namen[anzahl];
    return mc(r, "Formen",
      `${r.pick(LEADS)}Wie heißt eine Figur mit genau ${anzahl} Ecken?`,
      richtig, pickN(r, Object.values(namen), richtig, 3),
      `Eine Figur mit ${anzahl} Ecken heißt ${richtig}.`);
  });
  gens.push((r) => {
    const eigenschaften = [
      ["Alle 4 Seiten sind gleich lang und alle Winkel sind rechte Winkel.", "Quadrat", ["Rechteck", "Raute", "Parallelogramm"]],
      ["Gegenüberliegende Seiten sind gleich lang, alle Winkel sind rechte Winkel, aber nicht alle Seiten gleich lang.", "Rechteck", ["Quadrat", "Raute", "Trapez"]],
      ["Alle 4 Seiten sind gleich lang, aber die Winkel müssen keine rechten Winkel sein.", "Raute", ["Quadrat", "Rechteck", "Trapez"]],
      ["Die Figur hat keine Ecken und keinen Anfang und kein Ende.", "Kreis", ["Quadrat", "Dreieck", "Achteck"]],
      ["Genau zwei Seiten sind parallel zueinander.", "Trapez", ["Rechteck", "Raute", "Dreieck"]],
    ];
    const [beschr, richtig, falsch] = r.pick(eigenschaften);
    return mc(r, "Formen",
      `${r.pick(LEADS)}Welche Figur ist gemeint? ${beschr}`,
      richtig, r.shuffle(falsch),
      `Diese Beschreibung passt zum ${richtig === "Raute" ? "zur Raute" : richtig}: ${beschr}`);
  });

  // ── Geometrie: Symmetrie ──
  gens.push((r) => {
    const [figur, achsen, erkl] = r.pick(SYMMETRIE);
    return mc(r, "Symmetrie",
      `${r.pick(LEADS)}Wie viele Symmetrieachsen hat ein ${figur}?`,
      achsen, pickN(r, ["0", "1", "2", "3", "4", "6", "unendlich viele"], achsen, 3),
      erkl);
  });
  gens.push((r) => {
    const [buchstabe, richtung] = r.pick(GROSSE_BUCHSTABEN_SYM);
    const ohne = pickN(r, KEINE_SYM_BUCHSTABEN, buchstabe, 3);
    return mc(r, "Symmetrie",
      `${r.pick(LEADS)}Welcher dieser Großbuchstaben ist achsensymmetrisch: ${r.shuffle([buchstabe, ...ohne]).join(", ")}?`,
      buchstabe, ohne,
      `Der Buchstabe ${buchstabe} hat eine ${richtung}e Symmetrieachse, die anderen (${ohne.join(", ")}) nicht.`);
  });

  // ── Geometrie: rechte Winkel zählen ──
  gens.push((r) => {
    const [figur, anzahl, erkl] = r.pick(RECHTE_WINKEL);
    return mc(r, "Rechte Winkel",
      `${r.pick(LEADS)}Wie viele rechte Winkel hat ein ${figur}?`,
      anzahl, pickN(r, [0, 1, 2, 3, 4, 6], anzahl, 3),
      erkl);
  });
  gens.push((r) => {
    return mc(r, "Rechte Winkel",
      `${r.pick(LEADS)}Wie viel Grad hat ein rechter Winkel?`,
      "90°", ["45°", "100°", "180°", "60°"],
      "Ein rechter Winkel misst genau 90°. Man erkennt ihn z. B. am Geodreieck.");
  });
  if (klasse >= 4) {
    gens.push((r) => {
      const [koerper, flaechen, kanten, ecken] = r.pick(KOERPER);
      const was = r.pick(["Flächen", "Kanten", "Ecken"]);
      const wert = was === "Flächen" ? flaechen : was === "Kanten" ? kanten : ecken;
      return mc(r, "Körper",
        `${r.pick(LEADS)}Wie viele ${was} hat ein ${koerper}?`,
        wert, nearNumbers(r, wert, 2),
        `Ein ${koerper} hat ${flaechen} Flächen, ${kanten} Kanten und ${ecken} Ecken.`);
    });
  }

  // ── Römische Zahlen ──
  const roemMax = klasse === 3 ? 12 : klasse === 4 ? 39 : klasse === 5 ? 100 : 500;
  gens.push((r) => {
    const n = r.int(1, roemMax);
    return mc(r, "Römische Zahlen",
      `${r.pick(LEADS)}Wie schreibt man die Zahl ${n} in römischen Zahlen?`,
      toRoman(n), nearNumbers(r, n, 3).filter((x) => x >= 1).map(toRoman),
      `${n} = ${toRoman(n)}. Grundzeichen: I=1, V=5, X=10, L=50, C=100, D=500, M=1000.`);
  });
  gens.push((r) => {
    const n = r.int(1, roemMax);
    return mc(r, "Römische Zahlen",
      `${r.pick(LEADS)}Welche Zahl bedeutet die römische Zahl ${toRoman(n)}?`,
      n, nearNumbers(r, n, 3).filter((x) => x >= 1),
      `${toRoman(n)} = ${n}. Kleineres Zeichen vor größerem wird abgezogen (z. B. IV = 4).`);
  });

  return gens;
}

/* ══════════════════ 2) ENGLISCH Klasse 3–4 ══════════════════ */

// [deutsch, englisch, Kategorie] — >= 100 Paare pro Klasse (Liste: 105 Paare)
const EN_VOKABELN = [
  // Farben (11)
  ["rot", "red", "Farben"], ["blau", "blue", "Farben"], ["grün", "green", "Farben"],
  ["gelb", "yellow", "Farben"], ["schwarz", "black", "Farben"], ["weiß", "white", "Farben"],
  ["orange (Farbe)", "orange", "Farben"], ["rosa", "pink", "Farben"], ["lila", "purple", "Farben"],
  ["braun", "brown", "Farben"], ["grau", "grey", "Farben"],
  // Zahlen 1–20 (20)
  ["eins", "one", "Zahlen"], ["zwei", "two", "Zahlen"], ["drei", "three", "Zahlen"],
  ["vier", "four", "Zahlen"], ["fünf", "five", "Zahlen"], ["sechs", "six", "Zahlen"],
  ["sieben", "seven", "Zahlen"], ["acht", "eight", "Zahlen"], ["neun", "nine", "Zahlen"],
  ["zehn", "ten", "Zahlen"], ["elf", "eleven", "Zahlen"], ["zwölf", "twelve", "Zahlen"],
  ["dreizehn", "thirteen", "Zahlen"], ["vierzehn", "fourteen", "Zahlen"], ["fünfzehn", "fifteen", "Zahlen"],
  ["sechzehn", "sixteen", "Zahlen"], ["siebzehn", "seventeen", "Zahlen"], ["achtzehn", "eighteen", "Zahlen"],
  ["neunzehn", "nineteen", "Zahlen"], ["zwanzig", "twenty", "Zahlen"],
  // Tiere (25)
  ["der Hund", "dog", "Tiere"], ["die Katze", "cat", "Tiere"], ["die Maus", "mouse", "Tiere"],
  ["das Pferd", "horse", "Tiere"], ["die Kuh", "cow", "Tiere"], ["das Schwein", "pig", "Tiere"],
  ["das Schaf", "sheep", "Tiere"], ["der Vogel", "bird", "Tiere"], ["der Fisch", "fish", "Tiere"],
  ["das Kaninchen", "rabbit", "Tiere"], ["der Bär", "bear", "Tiere"], ["der Löwe", "lion", "Tiere"],
  ["der Tiger", "tiger", "Tiere"], ["der Elefant", "elephant", "Tiere"], ["der Affe", "monkey", "Tiere"],
  ["der Frosch", "frog", "Tiere"], ["die Ente", "duck", "Tiere"], ["das Huhn", "hen", "Tiere"],
  ["der Fuchs", "fox", "Tiere"], ["die Eule", "owl", "Tiere"], ["die Schlange", "snake", "Tiere"],
  ["die Spinne", "spider", "Tiere"], ["die Biene", "bee", "Tiere"], ["der Schmetterling", "butterfly", "Tiere"],
  ["der Wolf", "wolf", "Tiere"],
  // Familie (12)
  ["die Mutter", "mother", "Familie"], ["der Vater", "father", "Familie"],
  ["der Bruder", "brother", "Familie"], ["die Schwester", "sister", "Familie"],
  ["die Oma", "grandma", "Familie"], ["der Opa", "grandpa", "Familie"],
  ["die Tante", "aunt", "Familie"], ["der Onkel", "uncle", "Familie"],
  ["das Baby", "baby", "Familie"], ["die Familie", "family", "Familie"],
  ["die Eltern", "parents", "Familie"], ["das Kind", "child", "Familie"],
  // Schulsachen (15)
  ["der Füller/Stift", "pen", "Schulsachen"], ["der Bleistift", "pencil", "Schulsachen"],
  ["das Buch", "book", "Schulsachen"], ["der Schulranzen", "school bag", "Schulsachen"],
  ["die Schere", "scissors", "Schulsachen"], ["das Lineal", "ruler", "Schulsachen"],
  ["der Radiergummi", "rubber", "Schulsachen"], ["der Klebstoff", "glue", "Schulsachen"],
  ["der Tisch", "table", "Schulsachen"], ["der Stuhl", "chair", "Schulsachen"],
  ["die Tafel", "blackboard", "Schulsachen"], ["das Fenster", "window", "Schulsachen"],
  ["die Tür", "door", "Schulsachen"], ["der Lehrer/die Lehrerin", "teacher", "Schulsachen"],
  ["der Schüler/die Schülerin", "pupil", "Schulsachen"],
  // Wochentage (7)
  ["Montag", "Monday", "Wochentage"], ["Dienstag", "Tuesday", "Wochentage"],
  ["Mittwoch", "Wednesday", "Wochentage"], ["Donnerstag", "Thursday", "Wochentage"],
  ["Freitag", "Friday", "Wochentage"], ["Samstag", "Saturday", "Wochentage"],
  ["Sonntag", "Sunday", "Wochentage"],
  // Körper & Essen (15)
  ["der Kopf", "head", "Körper und Essen"], ["die Hand", "hand", "Körper und Essen"],
  ["der Fuß", "foot", "Körper und Essen"], ["die Nase", "nose", "Körper und Essen"],
  ["das Auge", "eye", "Körper und Essen"], ["das Ohr", "ear", "Körper und Essen"],
  ["der Apfel", "apple", "Körper und Essen"], ["das Brot", "bread", "Körper und Essen"],
  ["die Milch", "milk", "Körper und Essen"], ["das Wasser", "water", "Körper und Essen"],
  ["der Käse", "cheese", "Körper und Essen"], ["das Ei", "egg", "Körper und Essen"],
  ["der Kuchen", "cake", "Körper und Essen"], ["das Eis", "ice cream", "Körper und Essen"],
  ["die Banane", "banana", "Körper und Essen"],
];

const EN_ZAHLWOERTER = ["one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
  "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty"];

// [Satz mit Lücke, richtig, falsche Formen, Erklärung]
const EN_SAETZE = [
  ["I ___ a boy.", "am", ["are", "is", "be"], "Nach „I“ steht immer „am“: I am a boy."],
  ["I ___ eight years old.", "am", ["are", "is", "be"], "Nach „I“ steht immer „am“: I am eight years old."],
  ["I ___ happy today.", "am", ["are", "is", "amn't"], "Nach „I“ steht immer „am“: I am happy."],
  ["I ___ from Germany.", "am", ["are", "is", "be"], "Nach „I“ steht immer „am“: I am from Germany."],
  ["You ___ my friend.", "are", ["am", "is", "be"], "Nach „you“ steht immer „are“: You are my friend."],
  ["You ___ very tall.", "are", ["am", "is", "be"], "Nach „you“ steht immer „are“: You are very tall."],
  ["You ___ nine years old.", "are", ["am", "is", "be"], "Nach „you“ steht immer „are“: You are nine years old."],
  ["You ___ in my class.", "are", ["am", "is", "be"], "Nach „you“ steht immer „are“: You are in my class."],
  ["He ___ my brother.", "is", ["am", "are", "be"], "Nach „he/she/it“ steht „is“: He is my brother."],
  ["She ___ my sister.", "is", ["am", "are", "be"], "Nach „he/she/it“ steht „is“: She is my sister."],
  ["It ___ a dog.", "is", ["am", "are", "be"], "Nach „he/she/it“ steht „is“: It is a dog."],
  ["My cat ___ black.", "is", ["am", "are", "be"], "„My cat“ = it → „is“: My cat is black."],
  ["We ___ at school.", "are", ["am", "is", "be"], "Nach „we“ steht „are“: We are at school."],
  ["They ___ my parents.", "are", ["am", "is", "be"], "Nach „they“ steht „are“: They are my parents."],
  ["___ you ten years old?", "Are", ["Am", "Is", "Be"], "Frage mit „you“: Are you ten years old?"],
  ["My name ___ Tom.", "is", ["am", "are", "be"], "„My name“ = it → „is“: My name is Tom."],
];

// [Frage, Antwort, Distraktoren, Erklärung]
const EN_ALLTAG = [
  ["Was antwortest du auf „How are you?“", "I am fine, thank you.", ["I am a table.", "Yes, please.", "Good night."], "„How are you?“ heißt „Wie geht es dir?“ — Antwort: „I am fine, thank you.“"],
  ["Was sagst du am Morgen zur Begrüßung?", "Good morning!", ["Good night!", "Goodbye!", "Thank you!"], "Am Morgen begrüßt man sich mit „Good morning!“"],
  ["Was sagst du vor dem Schlafengehen?", "Good night!", ["Good morning!", "Hello!", "How are you?"], "Vor dem Schlafengehen sagt man „Good night!“"],
  ["Was heißt „Auf Wiedersehen“ auf Englisch?", "Goodbye", ["Hello", "Please", "Sorry"], "„Goodbye“ (oder „Bye“) heißt „Auf Wiedersehen“."],
  ["Was heißt „Danke“ auf Englisch?", "Thank you", ["Please", "Sorry", "Hello"], "„Thank you“ (oder „Thanks“) heißt „Danke“."],
  ["Was heißt „Bitte“ (wenn du um etwas bittest) auf Englisch?", "please", ["thanks", "sorry", "yes"], "Bei einer Bitte hängt man „please“ an: „A pencil, please.“"],
  ["Wie fragst du nach dem Namen?", "What is your name?", ["How old are you?", "Where do you live?", "What time is it?"], "„What is your name?“ heißt „Wie heißt du?“"],
  ["Wie fragst du nach dem Alter?", "How old are you?", ["What is your name?", "How are you?", "What colour is it?"], "„How old are you?“ heißt „Wie alt bist du?“"],
];

function englisch6Generators(klasse) {
  const gens = [];
  const kategorien = [...new Set(EN_VOKABELN.map(([, , k]) => k))];

  // DE → EN
  gens.push((r) => {
    const [de, en, kat] = r.pick(EN_VOKABELN);
    const pool = EN_VOKABELN.filter(([, e, k]) => k === kat && e !== en).map(([, e]) => e);
    const extra = EN_VOKABELN.filter(([, e]) => e !== en).map(([, e]) => e);
    return mc(r, kat,
      `${r.pick(LEADS)}Was heißt „${de}“ auf Englisch?`,
      en, pickN(r, pool.length >= 3 ? pool : extra, en, 3),
      `„${de}“ heißt auf Englisch „${en}“.`);
  });

  // EN → DE
  gens.push((r) => {
    const [de, en, kat] = r.pick(EN_VOKABELN);
    const pool = EN_VOKABELN.filter(([d, , k]) => k === kat && d !== de).map(([d]) => d);
    const extra = EN_VOKABELN.filter(([d]) => d !== de).map(([d]) => d);
    return mc(r, kat,
      `${r.pick(LEADS)}Was bedeutet das englische Wort „${en}“?`,
      de, pickN(r, pool.length >= 3 ? pool : extra, de, 3),
      `„${en}“ bedeutet „${de}“.`);
  });

  // Zahlen: Ziffer → englisches Wort
  gens.push((r) => {
    const n = r.int(1, 20);
    const en = EN_ZAHLWOERTER[n - 1];
    return mc(r, "Zahlen",
      `${r.pick(LEADS)}Wie heißt die Zahl ${n} auf Englisch?`,
      en, nearNumbers(r, n, 3).filter((x) => x >= 1 && x <= 20).map((x) => EN_ZAHLWOERTER[x - 1]).concat(pickN(r, EN_ZAHLWOERTER, en, 3)),
      `${n} heißt auf Englisch „${en}“.`);
  });
  gens.push((r) => {
    const n = r.int(1, 20);
    const en = EN_ZAHLWOERTER[n - 1];
    return mc(r, "Zahlen",
      `${r.pick(LEADS)}Welche Zahl ist „${en}“?`,
      n, nearNumbers(r, n, 3).filter((x) => x >= 1 && x <= 20).concat(nearNumbers(r, n, 5)),
      `„${en}“ ist die Zahl ${n}.`);
  });
  // kleine Rechnung mit englischen Zahlwörtern (Klasse 4 auch größere)
  gens.push((r) => {
    const a = r.int(1, klasse === 3 ? 9 : 12);
    const b = r.int(1, Math.min(20 - a, klasse === 3 ? 9 : 12));
    const s = a + b;
    return mc(r, "Zahlen",
      `${r.pick(LEADS)}What is ${EN_ZAHLWOERTER[a - 1]} plus ${EN_ZAHLWOERTER[b - 1]}?`,
      EN_ZAHLWOERTER[s - 1], nearNumbers(r, s, 2).filter((x) => x >= 1 && x <= 20).map((x) => EN_ZAHLWOERTER[x - 1]).concat(pickN(r, EN_ZAHLWOERTER, EN_ZAHLWOERTER[s - 1], 3)),
      `${a} + ${b} = ${s}, auf Englisch „${EN_ZAHLWOERTER[s - 1]}“.`);
  });

  // Wochentage-Reihenfolge auf Englisch
  gens.push((r) => {
    const tage = EN_VOKABELN.filter(([, , k]) => k === "Wochentage").map(([, e]) => e);
    const i = r.int(0, 6);
    const danach = r.next() < 0.5;
    const ziel = tage[(i + (danach ? 1 : 6)) % 7];
    return mc(r, "Wochentage",
      `${r.pick(LEADS)}Which day comes ${danach ? "after" : "before"} ${tage[i]}?`,
      ziel, pickN(r, tage.filter((t) => t !== tage[i]), ziel, 3),
      `${danach ? "Nach" : "Vor"} ${tage[i]} kommt ${ziel}.`);
  });

  // Sätze vervollständigen (am/are/is)
  gens.push((r) => {
    const [satz, richtig, falsch, erkl] = r.pick(EN_SAETZE);
    return mc(r, "Einfache Sätze",
      `${r.pick(LEADS)}Welche Form fehlt? ${satz}`,
      richtig, r.shuffle(falsch), erkl);
  });

  // Alltagssprache
  gens.push((r) => {
    const [q, a, d, e] = r.pick(EN_ALLTAG);
    return mc(r, "Alltagsenglisch", `${r.pick(LEADS)}${q}`, a, r.shuffle(d), e);
  });

  // Kategorie erkennen: Welches Wort passt nicht?
  gens.push((r) => {
    const kat = r.pick(kategorien);
    const drin = EN_VOKABELN.filter(([, , k]) => k === kat).map(([, e]) => e);
    const draussen = EN_VOKABELN.filter(([, , k]) => k !== kat).map(([, e]) => e);
    const drei = pickN(r, drin, "", 3);
    const falsch = r.pick(draussen);
    return mc(r, "Wortfelder",
      `${r.pick(LEADS)}Which word does NOT belong to “${kat === "Farben" ? "colours" : kat === "Zahlen" ? "numbers" : kat === "Tiere" ? "animals" : kat === "Familie" ? "family" : kat === "Wochentage" ? "days of the week" : kat === "Schulsachen" ? "school things" : "body and food"}”: ${r.shuffle([...drei, falsch]).join(", ")}?`,
      falsch, drei,
      `„${falsch}“ gehört nicht zum Wortfeld ${kat}; ${drei.join(", ")} gehören dazu.`);
  });

  return gens;
}

/* ══════════════════ 3) MUSIK Klasse 5–10 ══════════════════ */

const KREUZ_REIHE = ["Fis", "Cis", "Gis", "Dis", "Ais", "Eis"];
// [Tonart, Anzahl Kreuze]
const DUR_KREUZE = [["C-Dur", 0], ["G-Dur", 1], ["D-Dur", 2], ["A-Dur", 3], ["E-Dur", 4], ["H-Dur", 5], ["Fis-Dur", 6]];

// [Zeichen, Bedeutung, Distraktoren-Bedeutungen]
const DYNAMIK = [
  ["pp (pianissimo)", "sehr leise", ["sehr laut", "mittellaut", "allmählich lauter"]],
  ["p (piano)", "leise", ["laut", "sehr laut", "plötzlich betont"]],
  ["mp (mezzopiano)", "mittelleise (halbleise)", ["sehr leise", "sehr laut", "allmählich leiser"]],
  ["mf (mezzoforte)", "mittellaut (halblaut)", ["sehr leise", "leise", "allmählich lauter"]],
  ["f (forte)", "laut", ["leise", "sehr leise", "mittelleise (halbleise)"]],
  ["ff (fortissimo)", "sehr laut", ["sehr leise", "leise", "allmählich leiser"]],
  ["crescendo (<)", "allmählich lauter werden", ["allmählich leiser werden", "sehr leise", "plötzlich betont"]],
  ["decrescendo/diminuendo (>)", "allmählich leiser werden", ["allmählich lauter werden", "sehr laut", "plötzlich betont"]],
  ["sf/sfz (sforzato)", "plötzlich stark betont", ["allmählich lauter werden", "sehr leise", "gleichbleibend leise"]],
];

// [Komponist, Werk, Lebensdaten/Notiz]
const KOMPONISTEN_WERKE = [
  ["Ludwig van Beethoven", "die 9. Sinfonie (mit der „Ode an die Freude“)", "1770–1827"],
  ["Ludwig van Beethoven", "die Klaviersonate „Für Elise“", "1770–1827"],
  ["Wolfgang Amadeus Mozart", "die Oper „Die Zauberflöte“", "1756–1791"],
  ["Wolfgang Amadeus Mozart", "die „Kleine Nachtmusik“", "1756–1791"],
  ["Johann Sebastian Bach", "die Brandenburgischen Konzerte", "1685–1750"],
  ["Antonio Vivaldi", "„Die vier Jahreszeiten“", "1678–1741"],
  ["Joseph Haydn", "das Oratorium „Die Schöpfung“", "1732–1809"],
  ["Franz Schubert", "das „Forellenquintett“", "1797–1828"],
  ["Bedřich Smetana", "die sinfonische Dichtung „Die Moldau“", "1824–1884"],
  ["Edvard Grieg", "die „Peer-Gynt-Suite“ (mit „In der Halle des Bergkönigs“)", "1843–1907"],
  ["Antonín Dvořák", "die Sinfonie „Aus der Neuen Welt“", "1841–1904"],
  ["Carl Orff", "„Carmina Burana“", "1895–1982"],
  ["Giuseppe Verdi", "die Oper „Aida“", "1813–1901"],
  ["Richard Wagner", "den Opernzyklus „Der Ring des Nibelungen“", "1813–1883"],
  ["Georges Bizet", "die Oper „Carmen“", "1838–1875"],
  ["Pjotr Tschaikowsky", "das Ballett „Schwanensee“", "1840–1893"],
  ["Georg Friedrich Händel", "die „Wassermusik“", "1685–1759"],
  ["Modest Mussorgski", "„Bilder einer Ausstellung“", "1839–1881"],
  ["Camille Saint-Saëns", "den „Karneval der Tiere“", "1835–1921"],
  ["George Gershwin", "die „Rhapsody in Blue“", "1898–1937"],
  ["Sergei Prokofjew", "das musikalische Märchen „Peter und der Wolf“", "1891–1953"],
];

// [Richtung, Merkmal, Erklärung]
const MUSIKRICHTUNGEN = [
  ["Blues", "12-taktiges Schema und „Blue Notes“, entstanden aus der Musik der Afroamerikaner in den USA", "Der Blues entstand Ende des 19. Jahrhunderts in den Südstaaten der USA."],
  ["Jazz", "Improvisation und Swing-Feeling, oft mit Trompete, Saxofon und Kontrabass", "Im Jazz improvisieren die Musiker über ein Thema; er entstand Anfang des 20. Jahrhunderts in New Orleans."],
  ["Rock 'n' Roll", "treibender Beat der 1950er-Jahre mit E-Gitarre — bekannt durch Elvis Presley", "Rock 'n' Roll entstand in den 1950ern in den USA; Elvis Presley war sein berühmtester Star."],
  ["Reggae", "Betonung auf den unbetonten Zählzeiten (Offbeat), entstanden auf Jamaika — bekannt durch Bob Marley", "Reggae entstand in den 1960ern auf Jamaika; typisch ist der Offbeat."],
  ["Hip-Hop", "Sprechgesang (Rap) über Beats, dazu DJing, Breakdance und Graffiti", "Hip-Hop entstand in den 1970ern in New York; der Rap ist sein wichtigstes Element."],
  ["Techno", "elektronisch erzeugte Musik mit gleichmäßigem, treibendem 4/4-Beat", "Techno wird mit Synthesizern und Drumcomputern produziert; wichtig war u. a. Detroit."],
  ["Punk", "schnelle, einfache Songs mit rebellischen Texten, entstanden in den 1970ern", "Punk setzte ab ca. 1976 (u. a. in London) auf einfache Akkorde und Provokation."],
  ["Wiener Klassik", "Epoche um 1770–1820 mit Haydn, Mozart und Beethoven", "Die Wiener Klassik ist eine Epoche der Kunstmusik; ihre Hauptvertreter wirkten in Wien."],
];

function musik2Generators(klasse) {
  const gens = [];

  // Dur-Kreuze: Tonart → Anzahl
  gens.push((r) => {
    const [tonart, anzahl] = r.pick(DUR_KREUZE);
    return mc(r, "Tonleitern",
      `${r.pick(LEADS)}Wie viele Kreuz-Vorzeichen (♯) hat ${tonart}?`,
      anzahl, pickN(r, [0, 1, 2, 3, 4, 5, 6], anzahl, 3),
      `${tonart} hat ${anzahl} Kreuz${anzahl === 1 ? "" : "e"}. Reihenfolge der Kreuze: ${KREUZ_REIHE.join(" – ")} (Quintenzirkel).`);
  });
  // Anzahl → Tonart
  gens.push((r) => {
    const [tonart, anzahl] = r.pick(DUR_KREUZE);
    const andere = DUR_KREUZE.map(([t]) => t).filter((t) => t !== tonart);
    return mc(r, "Tonleitern",
      `${r.pick(LEADS)}Welche Dur-Tonart hat genau ${anzahl} Kreuz-Vorzeichen (♯)?`,
      tonart, pickN(r, andere, tonart, 3),
      `${tonart} hat ${anzahl} Kreuz${anzahl === 1 ? "" : "e"} (Quintenzirkel: C–G–D–A–E–H–Fis).`);
  });
  // n-tes Kreuz
  gens.push((r) => {
    const i = r.int(0, KREUZ_REIHE.length - 1);
    return mc(r, "Tonleitern",
      `${r.pick(LEADS)}Welches Kreuz kommt in der Vorzeichen-Reihenfolge als ${i + 1}.?`,
      KREUZ_REIHE[i], pickN(r, KREUZ_REIHE, KREUZ_REIHE[i], 3),
      `Die Kreuze erscheinen immer in der Reihenfolge ${KREUZ_REIHE.join(" – ")}. Das ${i + 1}. Kreuz ist ${KREUZ_REIHE[i]}.`);
  });
  gens.push((r) => {
    return mc(r, "Tonleitern",
      `${r.pick(LEADS)}Aus wie vielen verschiedenen Tönen besteht eine Dur-Tonleiter (ohne die Oktavwiederholung)?`,
      "7", ["5", "6", "8", "12"],
      "Eine Dur-Tonleiter hat 7 Stammtöne; der 8. Ton ist die Oktave des Grundtons. Halbtonschritte liegen zwischen 3.–4. und 7.–8. Stufe.");
  });

  // Dynamik
  gens.push((r) => {
    const [zeichen, bedeutung, falsch] = r.pick(DYNAMIK);
    return mc(r, "Dynamik",
      `${r.pick(LEADS)}Was bedeutet das Dynamik-Zeichen ${zeichen}?`,
      bedeutung, r.shuffle(falsch),
      `${zeichen} bedeutet: ${bedeutung}.`);
  });
  gens.push((r) => {
    const [zeichen, bedeutung] = r.pick(DYNAMIK);
    const andere = DYNAMIK.map(([z]) => z).filter((z) => z !== zeichen);
    return mc(r, "Dynamik",
      `${r.pick(LEADS)}Mit welchem Zeichen notiert man in der Musik „${bedeutung}“?`,
      zeichen, pickN(r, andere, zeichen, 3),
      `„${bedeutung}“ wird mit ${zeichen} notiert.`);
  });

  // Taktarten (berechnet)
  gens.push((r) => {
    const zaehler = r.pick([2, 3, 4]);
    return mc(r, "Taktarten",
      `${r.pick(LEADS)}Wie viele Viertelschläge hat ein Takt im ${zaehler}/4-Takt?`,
      zaehler, pickN(r, [2, 3, 4, 6, 8], zaehler, 3),
      `Der Zähler gibt die Anzahl der Schläge an: Im ${zaehler}/4-Takt sind es ${zaehler} Viertelschläge.`);
  });
  gens.push((r) => {
    const zaehler = r.pick([2, 3, 4]);
    const achtel = 2 * zaehler;
    return mc(r, "Taktarten",
      `${r.pick(LEADS)}Wie viele Achtelnoten füllen einen ganzen Takt im ${zaehler}/4-Takt?`,
      achtel, pickN(r, [3, 4, 6, 8, 12, 16], achtel, 3),
      `Eine Viertelnote = 2 Achtel. ${zaehler} Viertel · 2 = ${achtel} Achtel.`);
  });
  gens.push((r) => {
    const zaehler = r.pick([2, 3, 4]);
    const takte = r.int(2, 8);
    const schlaege = zaehler * takte;
    return mc(r, "Taktarten",
      `${r.pick(LEADS)}Ein Stück im ${zaehler}/4-Takt hat ${takte} Takte. Wie viele Viertelschläge sind das insgesamt?`,
      schlaege, calcDistractors(r, schlaege),
      `${takte} Takte · ${zaehler} Schläge = ${schlaege} Viertelschläge.`);
  });
  gens.push((r) => {
    const info = r.pick([
      ["Walzer", "3/4-Takt", ["4/4-Takt", "2/4-Takt", "6/8-Takt"], "Der Walzer steht im 3/4-Takt: eins-zwei-drei."],
      ["Marsch", "2/4-Takt (oder 4/4-Takt)", ["3/4-Takt", "5/4-Takt", "7/8-Takt"], "Märsche stehen in geraden Taktarten wie 2/4 oder 4/4 — gut zum Marschieren."],
    ]);
    const [tanz, takt, falsch, erkl] = info;
    return mc(r, "Taktarten",
      `${r.pick(LEADS)}In welcher Taktart steht typischerweise ein ${tanz}?`,
      takt, r.shuffle(falsch), erkl);
  });
  gens.push((r) => {
    return mc(r, "Taktarten",
      `${r.pick(LEADS)}Wie viele Achtelnoten füllen einen ganzen Takt im 6/8-Takt?`,
      "6", ["4", "8", "3", "12"],
      "Im 6/8-Takt gibt der Zähler 6 an: 6 Achtelnoten pro Takt, meist in zwei Dreiergruppen gezählt.");
  });

  // Komponisten-Werke
  gens.push((r) => {
    const [komponist, werk] = r.pick(KOMPONISTEN_WERKE);
    const andere = [...new Set(KOMPONISTEN_WERKE.map(([k]) => k))].filter((k) => k !== komponist);
    return mc(r, "Komponisten und Werke",
      `${r.pick(LEADS)}Wer komponierte ${werk}?`,
      komponist, pickN(r, andere, komponist, 3),
      `${komponist} komponierte ${werk}.`);
  });
  gens.push((r) => {
    const [komponist, werk] = r.pick(KOMPONISTEN_WERKE);
    const andere = KOMPONISTEN_WERKE.filter(([k]) => k !== komponist).map(([, w]) => w);
    return mc(r, "Komponisten und Werke",
      `${r.pick(LEADS)}Welches Werk stammt von ${komponist}?`,
      werk, pickN(r, andere, werk, 3),
      `Von ${komponist} stammt ${werk}.`);
  });

  // Musikrichtungen
  gens.push((r) => {
    const [richtung, merkmal, erkl] = r.pick(MUSIKRICHTUNGEN);
    const andere = MUSIKRICHTUNGEN.map(([n]) => n).filter((n) => n !== richtung);
    return mc(r, "Musikrichtungen",
      `${r.pick(LEADS)}Zu welcher Musikrichtung passt dieses Merkmal: ${merkmal}?`,
      richtung, pickN(r, andere, richtung, 3), erkl);
  });
  gens.push((r) => {
    const [richtung, merkmal, erkl] = r.pick(MUSIKRICHTUNGEN);
    const andere = MUSIKRICHTUNGEN.filter(([n]) => n !== richtung).map(([, m]) => m);
    return mc(r, "Musikrichtungen",
      `${r.pick(LEADS)}Welches Merkmal ist typisch für ${richtung}?`,
      merkmal, pickN(r, andere, merkmal, 3), erkl);
  });

  return gens;
}

/* ══════════════════ 4) KUNST Klasse 5–10 ══════════════════ */

// [Begriff, Erklärung/Definition, Erläuterung]
const PERSPEKTIVE = [
  ["Fluchtpunkt", "der Punkt, in dem sich in die Tiefe laufende Linien scheinbar treffen", "Parallele Linien (z. B. Bahngleise) scheinen sich im Fluchtpunkt auf der Horizontlinie zu treffen."],
  ["Horizontlinie", "die gedachte Linie auf Augenhöhe des Betrachters", "Die Horizontlinie liegt auf Augenhöhe; auf ihr liegen die Fluchtpunkte."],
  ["Zentralperspektive", "eine Raumdarstellung mit genau einem Fluchtpunkt", "Bei der Zentralperspektive laufen alle Tiefenlinien auf einen einzigen Fluchtpunkt zu."],
  ["Vogelperspektive", "die Sicht von oben herab auf eine Szene", "Bei der Vogelperspektive blickt man wie ein Vogel von oben auf das Geschehen."],
  ["Froschperspektive", "die Sicht von unten nach oben", "Bei der Froschperspektive blickt man von unten hinauf — Dinge wirken größer und mächtiger."],
  ["Luftperspektive (Farbperspektive)", "ferne Dinge werden blasser, bläulicher und unschärfer dargestellt", "Durch die Luftschicht erscheinen entfernte Berge blasser und bläulicher — das erzeugt Tiefe."],
  ["Überschneidung (Überdeckung)", "vordere Gegenstände verdecken teilweise die hinteren", "Was etwas anderes verdeckt, wirkt näher — ein einfaches Mittel der Raumdarstellung."],
  ["Verkürzung", "in die Tiefe gerichtete Flächen erscheinen kürzer, als sie sind", "Ein in die Tiefe liegendes Quadrat erscheint als flaches Trapez — es ist perspektivisch verkürzt."],
];

// [Kontrast nach Itten, Beschreibung, Erläuterung]
const ITTEN_KONTRASTE = [
  ["Komplementärkontrast", "zwei im Farbkreis gegenüberliegende Farben treffen aufeinander (z. B. Rot und Grün)", "Komplementärfarben wie Rot/Grün, Blau/Orange, Gelb/Violett steigern sich gegenseitig in ihrer Leuchtkraft."],
  ["Hell-Dunkel-Kontrast", "helle und dunkle Farben oder Töne stehen nebeneinander", "Der stärkste Hell-Dunkel-Kontrast ist Schwarz gegen Weiß."],
  ["Kalt-Warm-Kontrast", "kalte Farben (Blau, Blaugrün) treffen auf warme Farben (Rot, Orange, Gelb)", "Blautöne wirken kühl, Rot- und Orangetöne warm — ihr Aufeinandertreffen erzeugt Spannung."],
  ["Farbe-an-sich-Kontrast", "mehrere reine, ungemischte Farben stehen bunt nebeneinander", "Am stärksten mit den Grundfarben Rot, Gelb, Blau — typisch für Expressionismus und Kinderbilder."],
  ["Qualitätskontrast", "leuchtende (reine) Farben treffen auf getrübte, stumpfe Farben", "Qualität meint hier die Reinheit einer Farbe: leuchtend gegen getrübt."],
  ["Quantitätskontrast", "unterschiedlich große Farbflächen stehen im Verhältnis zueinander", "Viel gegen wenig: Eine kleine leuchtende Fläche kann eine große ruhige Fläche ausbalancieren."],
  ["Simultankontrast", "eine Farbe verändert scheinbar ihre Wirkung durch die Nachbarfarbe", "Das Auge erzeugt zur Umgebungsfarbe die Komplementärfarbe mit — Grau auf Rot wirkt leicht grünlich."],
];

// [Künstler, Werk, Notiz]
const KUENSTLER_WERKE = [
  ["Vincent van Gogh", "„Die Sternennacht“", "niederländischer Maler, 1853–1890"],
  ["Vincent van Gogh", "die „Sonnenblumen“-Bilder", "niederländischer Maler, 1853–1890"],
  ["Edvard Munch", "„Der Schrei“", "norwegischer Maler, 1863–1944"],
  ["Leonardo da Vinci", "die „Mona Lisa“", "italienisches Renaissance-Genie, 1452–1519"],
  ["Leonardo da Vinci", "„Das Abendmahl“", "italienisches Renaissance-Genie, 1452–1519"],
  ["Albrecht Dürer", "den „Feldhasen“", "Nürnberger Meister der Renaissance, 1471–1528"],
  ["Claude Monet", "die „Seerosen“-Bilder", "französischer Impressionist, 1840–1926"],
  ["Salvador Dalí", "„Die Beständigkeit der Erinnerung“ (zerfließende Uhren)", "spanischer Surrealist, 1904–1989"],
  ["Pablo Picasso", "„Guernica“", "spanischer Maler, Mitbegründer des Kubismus, 1881–1973"],
  ["Jan Vermeer", "„Das Mädchen mit dem Perlenohrring“", "niederländischer Barockmaler, 1632–1675"],
  ["Katsushika Hokusai", "„Die große Welle vor Kanagawa“", "japanischer Holzschnitt-Künstler, 1760–1849"],
  ["Gustav Klimt", "„Der Kuss“", "Wiener Jugendstil-Maler, 1862–1918"],
  ["Caspar David Friedrich", "den „Wanderer über dem Nebelmeer“", "deutscher Romantiker, 1774–1840"],
  ["Sandro Botticelli", "„Die Geburt der Venus“", "italienischer Renaissance-Maler, 1445–1510"],
  ["Michelangelo", "die Deckenfresken der Sixtinischen Kapelle", "italienischer Renaissance-Künstler, 1475–1564"],
  ["René Magritte", "„Der Sohn des Mannes“ (Mann mit Apfel vor dem Gesicht)", "belgischer Surrealist, 1898–1967"],
  ["Andy Warhol", "die „Campbell's Soup Cans“", "US-amerikanische Pop-Art-Ikone, 1928–1987"],
  ["Wassily Kandinsky", "frühe rein abstrakte Kompositionen wie „Komposition VII“", "Pionier der abstrakten Malerei, 1866–1944"],
  ["Franz Marc", "„Die großen blauen Pferde“", "deutscher Expressionist (Blauer Reiter), 1880–1916"],
  ["Paula Modersohn-Becker", "frühe expressionistische Selbstbildnisse", "deutsche Malerin aus Worpswede, 1876–1907"],
];

// [Technik, Verfahren/Beschreibung, Erläuterung]
const DRUCKTECHNIKEN = [
  ["Hochdruck", "die erhabenen (stehen gebliebenen) Stellen der Druckplatte drucken", "Beim Hochdruck (z. B. Linolschnitt, Holzschnitt) wird weggeschnitten, was weiß bleiben soll."],
  ["Tiefdruck", "die Farbe sitzt in den vertieften Linien der Platte", "Beim Tiefdruck (z. B. Radierung, Kupferstich) wird die Farbe in die Vertiefungen gerieben und unter hohem Druck abgezogen."],
  ["Flachdruck", "druckende und nicht druckende Stellen liegen auf einer Ebene (Fett-Wasser-Prinzip)", "Der Flachdruck (Lithografie) nutzt die Abstoßung von Fett und Wasser auf dem Stein."],
  ["Durchdruck (Siebdruck)", "die Farbe wird durch ein feinmaschiges Sieb auf den Untergrund gestrichen", "Beim Siebdruck werden nicht druckende Stellen des Siebs abgedeckt — beliebt in der Pop-Art (Warhol)."],
  ["Monotypie", "ein Druckverfahren, das nur einen einzigen Abzug ergibt", "Bei der Monotypie wird auf eine glatte Platte gemalt und einmalig abgedruckt — „mono“ = einzig."],
];

const DRUCK_ZUORDNUNG = [
  ["Linolschnitt", "Hochdruck"], ["Holzschnitt", "Hochdruck"],
  ["Radierung", "Tiefdruck"], ["Kupferstich", "Tiefdruck"],
  ["Lithografie (Steindruck)", "Flachdruck"], ["Siebdruck", "Durchdruck"],
];
const DRUCK_ARTEN = ["Hochdruck", "Tiefdruck", "Flachdruck", "Durchdruck"];

// [Begriff, Bedeutung, Erläuterung]
const BILDAUFBAU = [
  ["Vordergrund", "der Bildbereich, der dem Betrachter am nächsten erscheint", "Der Vordergrund liegt unten im Bild und zeigt die nächstgelegenen Dinge meist groß und detailliert."],
  ["Hintergrund", "der am weitesten entfernt wirkende Bildbereich", "Der Hintergrund liegt oben/hinten im Bild; Dinge erscheinen dort kleiner und blasser."],
  ["Mittelgrund", "der Bildbereich zwischen Vordergrund und Hintergrund", "Der Mittelgrund verbindet Vorder- und Hintergrund und staffelt den Bildraum."],
  ["Goldener Schnitt", "ein als besonders harmonisch empfundenes Teilungsverhältnis (etwa 1 : 1,618)", "Wichtige Bildelemente werden oft auf den Linien des Goldenen Schnitts platziert statt genau mittig."],
  ["Komposition", "die bewusste Anordnung aller Elemente im Bild", "Die Komposition ordnet Formen, Farben und Linien zu einem Gesamtgefüge."],
  ["Hochformat", "ein Bildformat, das höher als breit ist", "Das Hochformat betont Senkrechtes — gut für Porträts oder Türme."],
  ["Querformat", "ein Bildformat, das breiter als hoch ist", "Das Querformat betont Waagerechtes — gut für Landschaften."],
  ["Blickführung", "die Lenkung des Betrachterauges durch Linien, Kontraste und Anordnung", "Linien, Hell-Dunkel und Farbe führen den Blick zu den wichtigen Bildstellen."],
  ["Bildausschnitt", "der gewählte Teil der Wirklichkeit, der im Bild gezeigt wird", "Wie ein Fotorahmen legt der Bildausschnitt fest, was zu sehen ist und was weggelassen wird."],
  ["Symmetrische Komposition", "ein Bildaufbau, bei dem beide Bildhälften einander spiegelbildlich entsprechen", "Symmetrischer Aufbau wirkt ruhig, feierlich und stabil — häufig in Altarbildern."],
];

function kunst2Generators(klasse) {
  const gens = [];

  // Perspektive: Begriff → Definition und zurück
  gens.push((r) => {
    const [begriff, def, erkl] = r.pick(PERSPEKTIVE);
    const andere = PERSPEKTIVE.filter(([b]) => b !== begriff).map(([, d]) => d);
    return mc(r, "Perspektive",
      `${r.pick(LEADS)}Was versteht man in der Kunst unter „${begriff}“?`,
      def, pickN(r, andere, def, 3), erkl);
  });
  gens.push((r) => {
    const [begriff, def, erkl] = r.pick(PERSPEKTIVE);
    const andere = PERSPEKTIVE.map(([b]) => b).filter((b) => b !== begriff);
    return mc(r, "Perspektive",
      `${r.pick(LEADS)}Wie heißt der Fachbegriff: ${def}?`,
      begriff, pickN(r, andere, begriff, 3), erkl);
  });

  // Itten-Kontraste
  gens.push((r) => {
    const [kontrast, beschr, erkl] = r.pick(ITTEN_KONTRASTE);
    const andere = ITTEN_KONTRASTE.map(([k]) => k).filter((k) => k !== kontrast);
    return mc(r, "Farbkontraste (Itten)",
      `${r.pick(LEADS)}Welcher Farbkontrast nach Johannes Itten ist gemeint: ${beschr}?`,
      kontrast, pickN(r, andere, kontrast, 3), erkl);
  });
  gens.push((r) => {
    const [kontrast, beschr, erkl] = r.pick(ITTEN_KONTRASTE);
    const andere = ITTEN_KONTRASTE.filter(([k]) => k !== kontrast).map(([, b]) => b);
    return mc(r, "Farbkontraste (Itten)",
      `${r.pick(LEADS)}Was kennzeichnet den ${kontrast} nach Itten?`,
      beschr, pickN(r, andere, beschr, 3), erkl);
  });
  gens.push((r) => {
    const paare = [["Rot", "Grün"], ["Blau", "Orange"], ["Gelb", "Violett"]];
    const [f1, f2] = r.pick(paare);
    const alleZweiten = ["Grün", "Orange", "Violett", "Blau", "Rot", "Gelb"].filter((f) => f !== f2 && f !== f1);
    return mc(r, "Farbkontraste (Itten)",
      `${r.pick(LEADS)}Welche Farbe ist die Komplementärfarbe zu ${f1}?`,
      f2, pickN(r, alleZweiten, f2, 3),
      `Im Farbkreis liegen ${f1} und ${f2} einander gegenüber — sie sind Komplementärfarben.`);
  });

  // Künstler-Werke
  gens.push((r) => {
    const [kuenstler, werk, notiz] = r.pick(KUENSTLER_WERKE);
    const andere = [...new Set(KUENSTLER_WERKE.map(([k]) => k))].filter((k) => k !== kuenstler);
    return mc(r, "Künstler und Werke",
      `${r.pick(LEADS)}Von wem stammt ${werk}?`,
      kuenstler, pickN(r, andere, kuenstler, 3),
      `${werk} stammt von ${kuenstler} (${notiz}).`);
  });
  gens.push((r) => {
    const [kuenstler, werk, notiz] = r.pick(KUENSTLER_WERKE);
    const andere = KUENSTLER_WERKE.filter(([k]) => k !== kuenstler).map(([, w]) => w);
    return mc(r, "Künstler und Werke",
      `${r.pick(LEADS)}Welches Werk stammt von ${kuenstler}?`,
      werk, pickN(r, andere, werk, 3),
      `Von ${kuenstler} (${notiz}) stammt ${werk}.`);
  });

  // Drucktechniken
  gens.push((r) => {
    const [technik, beschr, erkl] = r.pick(DRUCKTECHNIKEN);
    const andere = DRUCKTECHNIKEN.map(([t]) => t).filter((t) => t !== technik);
    return mc(r, "Drucktechniken",
      `${r.pick(LEADS)}Bei welcher Drucktechnik gilt: ${beschr}?`,
      technik, pickN(r, andere.concat(["Fotokopie"]), technik, 3), erkl);
  });
  gens.push((r) => {
    const [verfahren, art] = r.pick(DRUCK_ZUORDNUNG);
    return mc(r, "Drucktechniken",
      `${r.pick(LEADS)}Zu welcher Druckart gehört der ${verfahren.startsWith("Lithografie") || verfahren.startsWith("Radierung") ? verfahren.replace("der ", "die ") : verfahren}?`.replace("der Radierung", "die Radierung").replace("der Lithografie", "die Lithografie"),
      art, pickN(r, DRUCK_ARTEN, art, 3),
      `${verfahren} gehört zum ${art}.`);
  });

  // Bildaufbau
  gens.push((r) => {
    const [begriff, bedeutung, erkl] = r.pick(BILDAUFBAU);
    const andere = BILDAUFBAU.filter(([b]) => b !== begriff).map(([, x]) => x);
    return mc(r, "Bildaufbau",
      `${r.pick(LEADS)}Was bedeutet der Begriff „${begriff}“ beim Bildaufbau?`,
      bedeutung, pickN(r, andere, bedeutung, 3), erkl);
  });
  gens.push((r) => {
    const [begriff, bedeutung, erkl] = r.pick(BILDAUFBAU);
    const andere = BILDAUFBAU.map(([b]) => b).filter((b) => b !== begriff);
    return mc(r, "Bildaufbau",
      `${r.pick(LEADS)}Wie lautet der Fachbegriff für: ${bedeutung}?`,
      begriff, pickN(r, andere, begriff, 3), erkl);
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

  console.log("Mathematik-Vertiefung (Klasse 3–6, je >= 400):");
  for (let k = 3; k <= 6; k++)
    total += writeBank("mathematik8", k, generateBank(121000 + k, 400, mathematik8Generators(k)), 400);

  console.log("Englisch-Grundschule (Klasse 3–4, je >= 350):");
  for (let k = 3; k <= 4; k++)
    total += writeBank("englisch6", k, generateBank(122000 + k, 350, englisch6Generators(k)), 350);

  console.log("Musik-Vertiefung (Klasse 5–10, je >= 250):");
  for (let k = 5; k <= 10; k++)
    total += writeBank("musik2", k, generateBank(123000 + k, 250, musik2Generators(k)), 250);

  console.log("Kunst-Vertiefung (Klasse 5–10, je >= 250):");
  for (let k = 5; k <= 10; k++)
    total += writeBank("kunst2", k, generateBank(124000 + k, 250, kunst2Generators(k)), 250);

  console.log(`\nGesamt (Runde 12): ${total} Fragen.`);
}

main();
