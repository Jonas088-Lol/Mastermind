/* Copyright 2026 Elian Schock, Jonas Schwenk */
/**
 * MEGA-Fragen-Generator RUNDE 4 für MasterMind.
 *
 * Ergänzt die Fragenbank aus generate.mjs / generate2.mjs / generate3.mjs im
 * GLEICHEN Format
 *   scripts/questions/mega/data/<fach>-klasse<k>.json
 * mit [{ topic, question, options[4], correct(Index), explanation }].
 *
 * Fächer/Umfang:
 *   - physik       Klasse 11–13, >= 500 Fragen pro Klasse
 *   - chemie       Klasse 11–13, >= 400 Fragen pro Klasse
 *   - wirtschaft   Klasse 8–13,  >= 400 Fragen pro Klasse (Wirtschaft/Politik)
 *   - musik        Klasse 5–10,  >= 300 Fragen pro Klasse
 *   - kunst        Klasse 5–10,  >= 300 Fragen pro Klasse
 *   - mathematik3  Klasse 5–10,  >= 400 Fragen pro Klasse (Ergänzung, eigener Dateiname)
 *
 * Deterministisch (mulberry32-Seed). Keine Abhängigkeiten, reines Node.
 * generate.mjs / generate2.mjs / generate3.mjs / import-mega.ts werden NICHT verändert.
 *
 * Aufruf (vom Repo-Root):
 *   node scripts/questions/mega/generate4.mjs
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
  const maxAttempts = count * 300;
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

function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { [a, b] = [b, a % b]; } return a; }

/** Bruch n/d gekürzt als String. */
function frac(n, d) {
  const g = gcd(n, d) || 1;
  const nn = n / g, dd = d / g;
  return dd === 1 ? String(nn) : `${nn}/${dd}`;
}

/** Deutsche Dezimaldarstellung (Punkt → Komma). */
function de(x) { return String(x).replace(".", ","); }

/* ══════════════════════════════ PHYSIK 11–13 ══════════════════════════════ */

const PH_LEADS = ["", "Physik: ", "Berechne. ", "Mechanik/Felder: "];

function physikKinematikGens() {
  return [
    // v = a·t
    (r) => {
      const a = r.int(1, 9), t = r.int(2, 12);
      const v = a * t;
      const dist = [v + a, v - a, a + t, v + t, 2 * v].filter((x) => x > 0 && x !== v);
      return mc(r, "Kinematik",
        `${r.pick(PH_LEADS)}Ein Körper beschleunigt aus der Ruhe gleichmäßig mit a = ${a} m/s². Welche Geschwindigkeit hat er nach t = ${t} s?`,
        `${v} m/s`, pickN(r, dist.map((x) => `${x} m/s`), `${v} m/s`, 3),
        `v = a·t = ${a} m/s² · ${t} s = ${v} m/s.`);
    },
    // s = ½·a·t²
    (r) => {
      const a = r.pick([2, 4, 6, 8, 10]), t = r.int(2, 10);
      const s = (a / 2) * t * t;
      const dist = [a * t * t, (a / 2) * t, s + a, s - a, s + t * t].filter((x) => x > 0 && x !== s);
      return mc(r, "Kinematik",
        `${r.pick(PH_LEADS)}Ein Körper startet aus der Ruhe und beschleunigt gleichmäßig mit a = ${a} m/s². Welche Strecke legt er in t = ${t} s zurück?`,
        `${s} m`, pickN(r, dist.map((x) => `${x} m`), `${s} m`, 3),
        `s = ½·a·t² = ½ · ${a} · ${t}² = ${s} m.`);
    },
    // a = v/t
    (r) => {
      const a = r.int(1, 9), t = r.int(2, 12);
      const v = a * t;
      const dist = [a + 1, a - 1, a + 2, t, Math.round(v / 2)].filter((x) => x > 0 && x !== a);
      return mc(r, "Kinematik",
        `${r.pick(PH_LEADS)}Ein Körper wird aus der Ruhe in t = ${t} s gleichmäßig auf v = ${v} m/s beschleunigt. Wie groß ist die Beschleunigung a?`,
        `${a} m/s²`, pickN(r, dist.map((x) => `${x} m/s²`), `${a} m/s²`, 3),
        `a = v/t = ${v} m/s / ${t} s = ${a} m/s².`);
    },
  ];
}

function physikEnergieGens() {
  return [
    // E_pot = m·g·h (g = 10 m/s²)
    (r) => {
      const m = r.int(1, 50), h = r.int(1, 30);
      const E = 10 * m * h;
      const dist = [m * h, E / 2, E + 10, E - 10, E * 2].filter((x) => x > 0 && x !== E);
      return mc(r, "Energie",
        `${r.pick(PH_LEADS)}Ein Körper der Masse m = ${m} kg wird um h = ${h} m angehoben. Wie groß ist die Zunahme der Lageenergie? (g = 10 m/s²)`,
        `${E} J`, pickN(r, dist.map((x) => `${x} J`), `${E} J`, 3),
        `E = m·g·h = ${m} kg · 10 m/s² · ${h} m = ${E} J.`);
    },
    // E_kin = ½·m·v²
    (r) => {
      const m = r.pick([2, 4, 6, 8, 10, 12, 20]), v = r.int(2, 15);
      const E = (m / 2) * v * v;
      const dist = [m * v * v, (m / 2) * v, E + m, E * 2, E - v].filter((x) => x > 0 && x !== E);
      return mc(r, "Energie",
        `${r.pick(PH_LEADS)}Ein Körper (m = ${m} kg) bewegt sich mit v = ${v} m/s. Wie groß ist seine kinetische Energie?`,
        `${E} J`, pickN(r, dist.map((x) => `${x} J`), `${E} J`, 3),
        `E = ½·m·v² = ½ · ${m} · ${v}² = ${E} J.`);
    },
    // Höhe aus E_pot
    (r) => {
      const m = r.int(1, 20), h = r.int(2, 25);
      const E = 10 * m * h;
      const dist = [h + 1, h - 1, h * 2, m, h + 5].filter((x) => x > 0 && x !== h);
      return mc(r, "Energie",
        `${r.pick(PH_LEADS)}Ein Körper (m = ${m} kg) hat die Lageenergie E = ${E} J. In welcher Höhe befindet er sich? (g = 10 m/s²)`,
        `${h} m`, pickN(r, dist.map((x) => `${x} m`), `${h} m`, 3),
        `h = E/(m·g) = ${E} J / (${m} kg · 10 m/s²) = ${h} m.`);
    },
  ];
}

// Elektrische Felder: Faktenbank (Terme und Beschreibungen eindeutig)
const PH_EFELD = [
  ["die elektrische Feldstärke E", "ist definiert als Kraft pro Ladung: E = F/q"],
  ["die Einheit der elektrischen Feldstärke", "ist Volt pro Meter (V/m) bzw. Newton pro Coulomb (N/C)"],
  ["die Einheit der elektrischen Ladung", "ist das Coulomb (C)"],
  ["die Elementarladung e", "beträgt etwa 1,6 · 10⁻¹⁹ C"],
  ["ein homogenes elektrisches Feld", "hat überall die gleiche Feldstärke nach Betrag und Richtung (z.B. im Plattenkondensator)"],
  ["die Feldstärke im Plattenkondensator", "berechnet sich aus Spannung und Plattenabstand: E = U/d"],
  ["die Richtung elektrischer Feldlinien", "verläuft von der positiven zur negativen Ladung"],
  ["die Kraft auf eine Ladung q im Feld E", "beträgt F = q·E"],
  ["das Coulomb-Gesetz", "beschreibt die Kraft zwischen zwei Punktladungen: F ~ q₁·q₂/r²"],
  ["die Kapazität C eines Kondensators", "ist das Verhältnis von Ladung zu Spannung: C = Q/U"],
  ["die Einheit der Kapazität", "ist das Farad (F)"],
  ["die Energie im geladenen Kondensator", "beträgt W = ½·C·U²"],
  ["ein Faradayscher Käfig", "schirmt seinen Innenraum von äußeren elektrischen Feldern ab"],
  ["die Influenz", "ist die Ladungsverschiebung in einem Leiter durch ein äußeres elektrisches Feld"],
  ["das Radialfeld (Feld einer Punktladung)", "hat Feldlinien, die strahlenförmig von der Ladung ausgehen"],
  ["die elektrische Spannung U", "ist die Arbeit pro Ladung: U = W/q"],
];

function physikWellenGens() {
  // c = λ·f mit c = 3·10⁸ m/s; f in MHz als Teiler von 300 → λ in m ganzzahlig
  const F_MHZ = [1, 2, 3, 4, 5, 6, 10, 12, 15, 20, 25, 30, 50, 60, 75, 100, 150, 300];
  return [
    (r) => {
      const f = r.pick(F_MHZ);
      const lam = 300 / f;
      const dist = F_MHZ.map((x) => 300 / x).filter((x) => x !== lam);
      return mc(r, "Wellen",
        `${r.pick(PH_LEADS)}Eine elektromagnetische Welle hat die Frequenz f = ${f} MHz. Welche Wellenlänge hat sie? (c = 3·10⁸ m/s)`,
        `${lam} m`, pickN(r, dist.map((x) => `${x} m`), `${lam} m`, 3),
        `λ = c/f = 3·10⁸ m/s / (${f}·10⁶ Hz) = ${lam} m.`);
    },
    (r) => {
      const f = r.pick(F_MHZ);
      const lam = 300 / f;
      const dist = F_MHZ.filter((x) => x !== f);
      return mc(r, "Wellen",
        `${r.pick(PH_LEADS)}Eine elektromagnetische Welle hat die Wellenlänge λ = ${lam} m. Welche Frequenz hat sie? (c = 3·10⁸ m/s)`,
        `${f} MHz`, pickN(r, dist.map((x) => `${x} MHz`), `${f} MHz`, 3),
        `f = c/λ = 3·10⁸ m/s / ${lam} m = ${f}·10⁶ Hz = ${f} MHz.`);
    },
    // T = 1/f (einfache Zehnerpotenzen)
    (r) => {
      const exp = r.int(1, 6);
      const correct = `10⁻${exp} s`;
      const dist = [1, 2, 3, 4, 5, 6].filter((x) => x !== exp).map((x) => `10⁻${x} s`);
      return mc(r, "Wellen",
        `${r.pick(PH_LEADS)}Eine Schwingung hat die Frequenz f = 10${["", "¹", "²", "³", "⁴", "⁵", "⁶"][exp]} Hz. Wie groß ist die Periodendauer T?`,
        correct, pickN(r, dist, correct, 3),
        `T = 1/f = 1/10^${exp} s = 10⁻${exp} s.`);
    },
  ];
}

function physikGenerators(k) {
  const gens = [];
  gens.push(...physikKinematikGens());
  gens.push(...physikEnergieGens());
  gens.push(...factGens("Elektrische Felder", PH_EFELD,
    (t) => `Was gilt für ${t}?`,
    (d) => `Welcher Begriff passt: „${d}“?`, PH_LEADS));
  if (k >= 12) gens.push(...physikWellenGens());
  return gens;
}

/* ══════════════════════════════ CHEMIE 11–13 ══════════════════════════════ */

const CH_LEADS = ["", "Chemie: ", "Berechne. ", "Wähle die richtige Antwort. "];

const HOCH = ["⁰", "¹", "²", "³", "⁴", "⁵", "⁶", "⁷", "⁸", "⁹"];

function chemiePhGens() {
  return [
    // c(H3O+) = 10^-x → pH = x
    (r) => {
      const x = r.int(1, 6);
      const dist = [1, 2, 3, 4, 5, 6, 7].filter((v) => v !== x);
      return mc(r, "pH-Wert",
        `${r.pick(CH_LEADS)}Eine starke Säure-Lösung hat c(H₃O⁺) = 10⁻${HOCH[x]} mol/L. Welchen pH-Wert hat sie?`,
        `pH = ${x}`, pickN(r, dist.map((v) => `pH = ${v}`), `pH = ${x}`, 3),
        `pH = -log c(H₃O⁺) = -log 10⁻${HOCH[x]} = ${x}.`);
    },
    // pH → c(H3O+)
    (r) => {
      const x = r.int(1, 6);
      const dist = [1, 2, 3, 4, 5, 6, 7].filter((v) => v !== x);
      return mc(r, "pH-Wert",
        `${r.pick(CH_LEADS)}Eine Lösung hat den pH-Wert ${x}. Wie groß ist c(H₃O⁺)?`,
        `10⁻${HOCH[x]} mol/L`, pickN(r, dist.map((v) => `10⁻${HOCH[v]} mol/L`), `10⁻${HOCH[x]} mol/L`, 3),
        `c(H₃O⁺) = 10⁻ᵖᴴ mol/L = 10⁻${HOCH[x]} mol/L.`);
    },
    // pH + pOH = 14
    (r) => {
      const ph = r.int(1, 13);
      const poh = 14 - ph;
      const dist = [poh + 1, poh - 1, ph, 14].filter((v) => v >= 0 && v !== poh);
      return mc(r, "pH-Wert",
        `${r.pick(CH_LEADS)}Eine wässrige Lösung (25 °C) hat den pH-Wert ${ph}. Welchen pOH-Wert hat sie?`,
        `pOH = ${poh}`, pickN(r, dist.map((v) => `pOH = ${v}`), `pOH = ${poh}`, 3),
        `pH + pOH = 14 ⇒ pOH = 14 - ${ph} = ${poh}.`);
    },
  ];
}

// Molmassentabelle (ganzzahlig, gerundete Atommassen H=1, C=12, N=14, O=16, S=32, Ca=40, Na=23, Mg=24)
const CH_MOLMASSEN = [
  ["Wasser", "H₂O", 18],
  ["Kohlenstoffdioxid", "CO₂", 44],
  ["Sauerstoff", "O₂", 32],
  ["Stickstoff", "N₂", 28],
  ["Methan", "CH₄", 16],
  ["Ammoniak", "NH₃", 17],
  ["Natriumhydroxid", "NaOH", 40],
  ["Calciumcarbonat", "CaCO₃", 100],
  ["Schwefelsäure", "H₂SO₄", 98],
  ["Glucose", "C₆H₁₂O₆", 180],
  ["Ethanol", "C₂H₅OH", 46],
  ["Schwefeldioxid", "SO₂", 64],
  ["Ethen", "C₂H₄", 28],
  ["Propan", "C₃H₈", 44],
];

function chemieStoechiometrieGens() {
  return [
    // m = n·M
    (r) => {
      const [name, formel, M] = r.pick(CH_MOLMASSEN);
      const n = r.pick([1, 2, 3, 4, 5]);
      const m = n * M;
      const dist = [m + M, m - M, M, m + n, m * 2].filter((x) => x > 0 && x !== m);
      return mc(r, "Stöchiometrie",
        `${r.pick(CH_LEADS)}Wie viel Gramm sind ${n} mol ${name} (${formel})? (M = ${M} g/mol)`,
        `${m} g`, pickN(r, dist.map((x) => `${x} g`), `${m} g`, 3),
        `m = n · M = ${n} mol · ${M} g/mol = ${m} g.`);
    },
    // n = m/M
    (r) => {
      const [name, formel, M] = r.pick(CH_MOLMASSEN);
      const n = r.pick([1, 2, 3, 4, 5]);
      const m = n * M;
      const dist = [n + 1, n - 1, n + 2, n * 2, m / (2 * M)].filter((x) => x > 0 && x !== n);
      return mc(r, "Stöchiometrie",
        `${r.pick(CH_LEADS)}Wie viel mol sind ${m} g ${name} (${formel})? (M = ${M} g/mol)`,
        `${de(n)} mol`, pickN(r, dist.map((x) => `${de(x)} mol`), `${de(n)} mol`, 3),
        `n = m/M = ${m} g / ${M} g/mol = ${de(n)} mol.`);
    },
    // Teilchenzahl: N = n·NA
    (r) => {
      const n = r.pick([1, 2, 3, 4, 5]);
      const N = n * 6;
      const correct = `${N} · 10²³`;
      const dist = [n * 6 + 6, n * 6 - 6, n, n * 12].filter((x) => x > 0 && x !== N).map((x) => `${x} · 10²³`);
      return mc(r, "Stöchiometrie",
        `${r.pick(CH_LEADS)}Wie viele Teilchen enthalten ${n} mol eines Stoffes ungefähr? (Nₐ ≈ 6 · 10²³ 1/mol)`,
        correct, pickN(r, dist, correct, 3),
        `N = n · Nₐ = ${n} mol · 6·10²³ 1/mol = ${N}·10²³ Teilchen.`);
    },
  ];
}

// Orbitale / PSE: Faktenbank (Terme und Beschreibungen eindeutig)
const CH_PSE = [
  ["ein s-Orbital", "ist kugelförmig und fasst maximal 2 Elektronen"],
  ["ein p-Orbital", "ist hantelförmig; die drei p-Orbitale fassen zusammen maximal 6 Elektronen"],
  ["die d-Orbitale", "fassen zusammen maximal 10 Elektronen"],
  ["die f-Orbitale", "fassen zusammen maximal 14 Elektronen"],
  ["das Pauli-Prinzip", "besagt, dass ein Orbital maximal 2 Elektronen mit entgegengesetztem Spin aufnehmen kann"],
  ["die Hundsche Regel", "besagt, dass energiegleiche Orbitale zuerst einzeln besetzt werden"],
  ["die Ordnungszahl", "gibt die Zahl der Protonen im Kern an"],
  ["die Hauptgruppennummer", "gibt die Zahl der Außenelektronen (Valenzelektronen) an"],
  ["die Periodennummer", "gibt die Zahl der besetzten Schalen an"],
  ["die Alkalimetalle", "stehen in der 1. Hauptgruppe und haben 1 Außenelektron"],
  ["die Erdalkalimetalle", "stehen in der 2. Hauptgruppe und haben 2 Außenelektronen"],
  ["die Halogene", "stehen in der 7. Hauptgruppe und haben 7 Außenelektronen"],
  ["die Edelgase", "stehen in der 8. Hauptgruppe und haben eine voll besetzte Außenschale"],
  ["die Elektronegativität", "ist ein Maß dafür, wie stark ein Atom Bindungselektronen anzieht"],
  ["Fluor", "ist das Element mit der höchsten Elektronegativität"],
  ["die Ionisierungsenergie", "ist die Energie, die nötig ist, um ein Elektron aus dem Atom zu entfernen"],
  ["die Elektronenkonfiguration von Natrium", "lautet 1s² 2s² 2p⁶ 3s¹"],
  ["die Elektronenkonfiguration von Neon", "lautet 1s² 2s² 2p⁶"],
];

// Organische Stoffklassen: funktionelle Gruppe ↔ Stoffklasse (eindeutig)
const CH_ORGANIK = [
  ["die Hydroxygruppe (-OH)", "Alkohole"],
  ["die Carboxygruppe (-COOH)", "Carbonsäuren"],
  ["die Aldehydgruppe (-CHO)", "Aldehyde"],
  ["die Ketogruppe (C=O innerhalb der Kette)", "Ketone"],
  ["die Aminogruppe (-NH₂)", "Amine"],
  ["die Estergruppe (-COO-)", "Ester"],
  ["eine C=C-Doppelbindung", "Alkene"],
  ["eine C≡C-Dreifachbindung", "Alkine"],
  ["nur C-C-Einfachbindungen (gesättigt, kettenförmig)", "Alkane"],
  ["die Ethergruppe (R-O-R)", "Ether"],
];

// Beispielverbindung → Stoffklasse (nur vorwärts, Klassen wiederholen sich)
const CH_ORGANIK_BEISPIELE = [
  ["Ethanol (C₂H₅OH)", "Alkohole"],
  ["Methanol (CH₃OH)", "Alkohole"],
  ["Essigsäure (CH₃COOH)", "Carbonsäuren"],
  ["Ameisensäure (HCOOH)", "Carbonsäuren"],
  ["Methanal (HCHO)", "Aldehyde"],
  ["Ethanal (CH₃CHO)", "Aldehyde"],
  ["Propanon/Aceton (CH₃COCH₃)", "Ketone"],
  ["Ethen (C₂H₄)", "Alkene"],
  ["Propen (C₃H₆)", "Alkene"],
  ["Ethin (C₂H₂)", "Alkine"],
  ["Methan (CH₄)", "Alkane"],
  ["Butan (C₄H₁₀)", "Alkane"],
  ["Essigsäureethylester", "Ester"],
];

function chemieGenerators() {
  const gens = [];
  gens.push(...chemiePhGens());
  gens.push(...chemieStoechiometrieGens());
  gens.push(...factGens("Orbitale & PSE", CH_PSE,
    (t) => `Was gilt für ${t}?`,
    (d) => `Welcher Begriff passt: „${d}“?`, CH_LEADS));
  gens.push(...factGens("Organische Stoffklassen", CH_ORGANIK,
    (t) => `Welche Stoffklasse ist durch ${t} gekennzeichnet?`,
    (d) => `Welche funktionelle Gruppe/Struktur kennzeichnet die Stoffklasse der ${d}?`, CH_LEADS));
  gens.push(...factGensFwd("Organische Stoffklassen", CH_ORGANIK_BEISPIELE,
    (t) => `Zu welcher Stoffklasse gehört ${t}?`, CH_LEADS));
  return gens;
}

/* ══════════════════════════════ WIRTSCHAFT / POLITIK 8–13 ══════════════════════════════ */

const WI_LEADS = ["", "Politik: ", "Wirtschaft: ", "Wähle die richtige Antwort. "];

// Grundgesetz & Staatsorgane (Terme und Beschreibungen eindeutig)
const WI_STAAT = [
  ["Artikel 1 des Grundgesetzes", "garantiert die Unantastbarkeit der Menschenwürde"],
  ["der Bundestag", "ist das vom Volk direkt gewählte Parlament Deutschlands"],
  ["der Bundesrat", "vertritt die Bundesländer bei der Gesetzgebung des Bundes"],
  ["die Bundesregierung", "besteht aus Bundeskanzler/in und den Bundesministern"],
  ["der Bundespräsident / die Bundespräsidentin", "ist das Staatsoberhaupt Deutschlands"],
  ["das Bundesverfassungsgericht", "wacht über die Einhaltung des Grundgesetzes und sitzt in Karlsruhe"],
  ["die Bundesversammlung", "wählt den Bundespräsidenten / die Bundespräsidentin"],
  ["der Bundeskanzler / die Bundeskanzlerin", "bestimmt die Richtlinien der Politik und leitet die Bundesregierung"],
  ["die Legislative", "ist die gesetzgebende Gewalt"],
  ["die Exekutive", "ist die ausführende Gewalt"],
  ["die Judikative", "ist die rechtsprechende Gewalt"],
  ["die Gewaltenteilung", "verteilt die Staatsgewalt auf Gesetzgebung, Verwaltung und Rechtsprechung"],
  ["der Föderalismus", "ist die Aufteilung der Staatsgewalt zwischen Bund und Ländern"],
  ["das konstruktive Misstrauensvotum", "erlaubt dem Bundestag, den Kanzler nur durch Wahl eines Nachfolgers zu stürzen"],
  ["die Ewigkeitsklausel (Art. 79 Abs. 3 GG)", "schützt Menschenwürde, Demokratie und Föderalismus vor Verfassungsänderungen"],
  ["eine Legislaturperiode des Bundestages", "dauert in der Regel 4 Jahre"],
];

// Wahlsystem (eindeutig)
const WI_WAHL = [
  ["die Erststimme", "wählt den Direktkandidaten / die Direktkandidatin im Wahlkreis"],
  ["die Zweitstimme", "wählt die Landesliste einer Partei und bestimmt die Sitzverteilung"],
  ["die Fünf-Prozent-Hürde", "verhindert den Einzug von Parteien mit weniger als 5 % der Zweitstimmen"],
  ["eine allgemeine Wahl", "bedeutet, dass grundsätzlich alle Staatsbürger ab dem Wahlalter wählen dürfen"],
  ["eine geheime Wahl", "bedeutet, dass niemand erfährt, wie jemand gewählt hat"],
  ["eine unmittelbare Wahl", "bedeutet, dass die Abgeordneten direkt ohne Wahlleute gewählt werden"],
  ["eine freie Wahl", "bedeutet, dass kein Zwang oder Druck auf die Wahlentscheidung ausgeübt wird"],
  ["eine gleiche Wahl", "bedeutet, dass jede Stimme grundsätzlich den gleichen Zählwert hat"],
  ["die Verhältniswahl", "verteilt die Sitze entsprechend dem Stimmenanteil der Parteien"],
  ["die Mehrheitswahl", "gibt dem Kandidaten mit den meisten Stimmen im Wahlkreis das Mandat"],
  ["das aktive Wahlrecht", "ist das Recht, selbst zu wählen"],
  ["das passive Wahlrecht", "ist das Recht, sich zur Wahl aufstellen zu lassen"],
];

// EU-Fakten (eindeutig)
const WI_EU = [
  ["die Römischen Verträge (1957)", "gründeten die Europäische Wirtschaftsgemeinschaft (EWG)"],
  ["der Vertrag von Maastricht (1992)", "gründete die Europäische Union"],
  ["das Europäische Parlament", "wird alle 5 Jahre direkt von den EU-Bürgern gewählt"],
  ["die Europäische Kommission", "schlägt EU-Gesetze vor und hat ihren Sitz in Brüssel"],
  ["die Europäische Zentralbank (EZB)", "sichert die Preisstabilität im Euroraum und sitzt in Frankfurt am Main"],
  ["der Europäische Gerichtshof (EuGH)", "wacht über die Einhaltung des EU-Rechts und sitzt in Luxemburg"],
  ["der Euro als Bargeld", "wurde 2002 eingeführt"],
  ["das Schengener Abkommen", "ermöglicht Reisen ohne Grenzkontrollen zwischen den Mitgliedstaaten"],
  ["der EU-Binnenmarkt", "garantiert freien Verkehr von Waren, Personen, Dienstleistungen und Kapital"],
  ["der Rat der Europäischen Union (Ministerrat)", "besteht aus den Fachministern der Mitgliedstaaten"],
  ["der Europäische Rat", "ist das Gipfeltreffen der Staats- und Regierungschefs der EU"],
  ["der Brexit", "war der Austritt des Vereinigten Königreichs aus der EU (2020)"],
];

function wirtschaftRechnenGens() {
  return [
    // Rabatt
    (r) => {
      const P = 20 * r.int(2, 40); // 40..800, Vielfaches von 20
      const rab = r.pick([10, 20, 25, 50]);
      const neu = (P * (100 - rab)) / 100;
      const nachlass = P - neu;
      const dist = [nachlass, neu + rab, neu - rab, P].filter((x) => x > 0 && x !== neu);
      return mc(r, "Prozentrechnung",
        `${r.pick(WI_LEADS)}Eine Ware kostet ${P} €. Beim Sale gibt es ${rab} % Rabatt. Was kostet sie danach?`,
        `${neu} €`, pickN(r, dist.map((x) => `${x} €`), `${neu} €`, 3),
        `Neuer Preis = ${P} € · ${100 - rab} % = ${neu} €.`);
    },
    // Mehrwertsteuer
    (r) => {
      const N = 100 * r.int(1, 20); // Nettopreis 100..2000
      const satz = r.pick([19, 7]);
      const brutto = (N * (100 + satz)) / 100;
      const steuer = brutto - N;
      const dist = [N + satz, brutto + 10, steuer, N].filter((x) => x > 0 && x !== brutto);
      return mc(r, "Prozentrechnung",
        `${r.pick(WI_LEADS)}Ein Produkt kostet netto ${N} €. Wie hoch ist der Bruttopreis bei ${satz} % Mehrwertsteuer?`,
        `${brutto} €`, pickN(r, dist.map((x) => `${x} €`), `${brutto} €`, 3),
        `Brutto = ${N} € · 1,${String(satz).padStart(2, "0")} = ${brutto} €.`);
    },
    // Zinsen (1 Jahr)
    (r) => {
      const K = 100 * r.int(5, 100); // 500..10000
      const p = r.int(1, 5);
      const Z = (K * p) / 100;
      const dist = [Z + K / 100, Z - K / 100, Z * 2, K / 100].filter((x) => x > 0 && x !== Z);
      return mc(r, "Zinsrechnung",
        `${r.pick(WI_LEADS)}Ein Kapital von ${K} € wird ein Jahr lang mit ${p} % verzinst. Wie hoch sind die Zinsen?`,
        `${Z} €`, pickN(r, dist.map((x) => `${x} €`), `${Z} €`, 3),
        `Z = K · p/100 = ${K} € · ${p}/100 = ${Z} €.`);
    },
    // Zinsen mehrere Jahre (einfache Verzinsung)
    (r) => {
      const K = 100 * r.int(5, 50);
      const p = r.int(1, 5);
      const j = r.int(2, 6);
      const Z = (K * p * j) / 100;
      const dist = [(K * p) / 100, Z + (K * p) / 100, Z - (K * p) / 100, Z * 2].filter((x) => x > 0 && x !== Z);
      return mc(r, "Zinsrechnung",
        `${r.pick(WI_LEADS)}Ein Kapital von ${K} € wird ${j} Jahre lang mit ${p} % pro Jahr verzinst (einfache Zinsen). Wie hoch sind die Zinsen insgesamt?`,
        `${Z} €`, pickN(r, dist.map((x) => `${x} €`), `${Z} €`, 3),
        `Z = K · p/100 · t = ${K} € · ${p}/100 · ${j} = ${Z} €.`);
    },
  ];
}

function wirtschaftGenerators() {
  const gens = [];
  gens.push(...factGens("Grundgesetz & Staatsorgane", WI_STAAT,
    (t) => `Was gilt für ${t}?`,
    (d) => `Welcher Begriff passt: „${d}“?`, WI_LEADS));
  gens.push(...factGens("Wahlsystem", WI_WAHL,
    (t) => `Was bedeutet ${t}?`,
    (d) => `Welcher Begriff des Wahlrechts passt: „${d}“?`, WI_LEADS));
  gens.push(...factGens("Europäische Union", WI_EU,
    (t) => `Was gilt für ${t}?`,
    (d) => `Worauf trifft das zu: „${d}“?`, WI_LEADS));
  gens.push(...wirtschaftRechnenGens());
  return gens;
}

/* ══════════════════════════════ MUSIK 5–10 ══════════════════════════════ */

const MU_LEADS = ["", "Musik: ", "Musiklehre: ", "Wähle die richtige Antwort. ", "Frage: ", "Notenlehre: "];

// Notenwerte in Sechzehntel-Einheiten
const MU_NOTEN = [
  ["ganze Note", 16],
  ["halbe Note", 8],
  ["Viertelnote", 4],
  ["Achtelnote", 2],
  ["Sechzehntelnote", 1],
];

function musikNotenwerteGens() {
  return [
    // Wie viele kleine Noten ergeben eine große?
    (r) => {
      const [big, bv] = r.pick(MU_NOTEN);
      const [small, sv] = r.pick(MU_NOTEN);
      if (bv <= sv) return null;
      const anz = bv / sv;
      const dist = [anz * 2, anz / 2, anz + 1, anz - 1, anz + 2].filter((x) => x >= 1 && Number.isInteger(x) && x !== anz);
      return mc(r, "Notenwerte",
        `${r.pick(MU_LEADS)}Wie viele ${small}n dauern zusammen so lange wie eine ${big}?`,
        anz, pickN(r, dist.map(String), String(anz), 3),
        `Eine ${big} entspricht ${anz} ${small}n.`);
    },
    // Viertel pro n Takte im 4/4- bzw. 3/4-Takt
    (r) => {
      const beats = r.pick([3, 4]);
      const n = r.int(2, 12);
      const anz = beats * n;
      const dist = [anz + beats, anz - beats, anz + 1, n * 8, anz - 1].filter((x) => x > 0 && x !== anz);
      return mc(r, "Notenwerte",
        `${r.pick(MU_LEADS)}Wie viele Viertelnoten füllen ${n} Takte im ${beats}/4-Takt?`,
        anz, pickN(r, dist.map(String), String(anz), 3),
        `${n} Takte · ${beats} Viertel pro Takt = ${anz} Viertelnoten.`);
    },
    // Punktierte Note = Note + halbe Note davon (in Achteln)
    (r) => {
      const t = r.pick([["punktierte halbe Note", 6], ["punktierte Viertelnote", 3], ["punktierte ganze Note", 12]]);
      const anz = t[1];
      const dist = [anz + 1, anz - 1, anz * 2, Math.round((anz * 2) / 3)].filter((x) => x > 0 && x !== anz);
      return mc(r, "Notenwerte",
        `${r.pick(MU_LEADS)}Wie viele Achtelnoten dauern zusammen so lange wie eine ${t[0]}?`,
        anz, pickN(r, dist.map(String), String(anz), 3),
        `Der Punkt verlängert die Note um die Hälfte ihres Wertes: ${t[0]} = ${anz} Achtel.`);
    },
  ];
}

// Intervalle ↔ Halbtonschritte (eindeutig)
const MU_INTERVALLE = [
  ["reine Prime", "0 Halbtonschritte"],
  ["kleine Sekunde", "1 Halbtonschritt"],
  ["große Sekunde", "2 Halbtonschritte"],
  ["kleine Terz", "3 Halbtonschritte"],
  ["große Terz", "4 Halbtonschritte"],
  ["reine Quarte", "5 Halbtonschritte"],
  ["Tritonus", "6 Halbtonschritte"],
  ["reine Quinte", "7 Halbtonschritte"],
  ["kleine Sexte", "8 Halbtonschritte"],
  ["große Sexte", "9 Halbtonschritte"],
  ["kleine Septime", "10 Halbtonschritte"],
  ["große Septime", "11 Halbtonschritte"],
  ["reine Oktave", "12 Halbtonschritte"],
];

// Komponist → Epoche (nur vorwärts, Epochen wiederholen sich)
const MU_KOMPONISTEN = [
  ["Johann Sebastian Bach", "Barock"],
  ["Georg Friedrich Händel", "Barock"],
  ["Antonio Vivaldi", "Barock"],
  ["Claudio Monteverdi", "Barock"],
  ["Georg Philipp Telemann", "Barock"],
  ["Giovanni Pierluigi da Palestrina", "Renaissance"],
  ["Orlando di Lasso", "Renaissance"],
  ["Wolfgang Amadeus Mozart", "Wiener Klassik"],
  ["Joseph Haydn", "Wiener Klassik"],
  ["Ludwig van Beethoven", "Wiener Klassik"],
  ["Franz Schubert", "Romantik"],
  ["Frédéric Chopin", "Romantik"],
  ["Robert Schumann", "Romantik"],
  ["Johannes Brahms", "Romantik"],
  ["Richard Wagner", "Romantik"],
  ["Giuseppe Verdi", "Romantik"],
  ["Pjotr Tschaikowsky", "Romantik"],
  ["Felix Mendelssohn Bartholdy", "Romantik"],
  ["Claude Debussy", "Impressionismus"],
  ["Maurice Ravel", "Impressionismus"],
  ["Igor Strawinsky", "Moderne (20. Jahrhundert)"],
  ["Arnold Schönberg", "Moderne (20. Jahrhundert)"],
  ["John Cage", "Moderne (20. Jahrhundert)"],
];

// Instrument → Familie (nur vorwärts, Familien wiederholen sich)
const MU_INSTRUMENTE = [
  ["die Violine (Geige)", "Streichinstrumente"],
  ["die Bratsche (Viola)", "Streichinstrumente"],
  ["das Cello", "Streichinstrumente"],
  ["der Kontrabass", "Streichinstrumente"],
  ["die Trompete", "Blechblasinstrumente"],
  ["die Posaune", "Blechblasinstrumente"],
  ["das Waldhorn", "Blechblasinstrumente"],
  ["die Tuba", "Blechblasinstrumente"],
  ["die Querflöte", "Holzblasinstrumente"],
  ["die Klarinette", "Holzblasinstrumente"],
  ["die Oboe", "Holzblasinstrumente"],
  ["das Fagott", "Holzblasinstrumente"],
  ["das Saxophon", "Holzblasinstrumente"],
  ["die Blockflöte", "Holzblasinstrumente"],
  ["die Pauke", "Schlaginstrumente"],
  ["die kleine Trommel", "Schlaginstrumente"],
  ["das Xylophon", "Schlaginstrumente"],
  ["das Becken", "Schlaginstrumente"],
  ["die Harfe", "Zupfinstrumente"],
  ["die Gitarre", "Zupfinstrumente"],
  ["das Klavier", "Tasteninstrumente"],
  ["die Orgel", "Tasteninstrumente"],
  ["das Cembalo", "Tasteninstrumente"],
  ["das Akkordeon", "Tasteninstrumente"],
];

function musikInstrumentRevGen() {
  // Familie → passendes Instrument (Distraktoren aus anderen Familien)
  const familien = [...new Set(MU_INSTRUMENTE.map((t) => t[1]))];
  return [
    (r) => {
      const fam = r.pick(familien);
      const inFam = MU_INSTRUMENTE.filter((t) => t[1] === fam).map((t) => t[0]);
      const outFam = MU_INSTRUMENTE.filter((t) => t[1] !== fam).map((t) => t[0]);
      const correct = r.pick(inFam);
      return mc(r, "Instrumentenfamilien",
        `${r.pick(MU_LEADS)}Welches Instrument gehört zur Familie der ${fam}?`,
        correct, pickN(r, outFam, correct, 3),
        `${correct.charAt(0).toUpperCase() + correct.slice(1)} gehört zu den ${fam}n.`);
    },
  ];
}

function musikGenerators() {
  const gens = [];
  gens.push(...musikNotenwerteGens());
  gens.push(...factGens("Intervalle", MU_INTERVALLE,
    (t) => `Wie viele Halbtonschritte umfasst das Intervall „${t}“?`,
    (d) => `Welches Intervall umfasst ${d.replace("Halbtonschritte", "Halbtonschritte")}?`, MU_LEADS));
  gens.push(...factGensFwd("Komponisten & Epochen", MU_KOMPONISTEN,
    (t) => `Welcher Epoche wird ${t} zugeordnet?`, MU_LEADS));
  gens.push(...factGensFwd("Instrumentenfamilien", MU_INSTRUMENTE,
    (t) => `Zu welcher Instrumentenfamilie gehört ${t}?`, MU_LEADS));
  gens.push(...musikInstrumentRevGen());
  return gens;
}

/* ══════════════════════════════ KUNST 5–10 ══════════════════════════════ */

const KU_LEADS = ["", "Kunst: ", "Farbenlehre: ", "Wähle die richtige Antwort. ", "Frage: ", "Kunstgeschichte: "];

// Komplementärfarben (beide Richtungen enthalten, damit alle 6 Fragen möglich sind)
const KU_KOMPLEMENT = [
  ["Rot", "Grün"], ["Grün", "Rot"],
  ["Blau", "Orange"], ["Orange", "Blau"],
  ["Gelb", "Violett"], ["Violett", "Gelb"],
];
const KU_FARBEN = ["Rot", "Grün", "Blau", "Orange", "Gelb", "Violett"];

// Farbmischungen (Primärfarben der Malerei)
const KU_MISCHUNG = [
  ["Rot und Gelb", "Orange"],
  ["Blau und Gelb", "Grün"],
  ["Rot und Blau", "Violett"],
];

// Farbenlehre-Fakten (eindeutig)
const KU_FARBLEHRE = [
  ["die Primärfarben (Malerei)", "sind Rot, Gelb und Blau — sie lassen sich nicht ermischen"],
  ["die Sekundärfarben", "entstehen durch Mischen zweier Primärfarben (Orange, Grün, Violett)"],
  ["Komplementärfarben", "liegen sich im Farbkreis genau gegenüber und verstärken sich gegenseitig"],
  ["warme Farben", "sind z.B. Rot, Orange und Gelb — sie wirken nah und aktiv"],
  ["kalte Farben", "sind z.B. Blau, Blaugrün und Blauviolett — sie wirken fern und ruhig"],
  ["der Farbkreis nach Itten", "ordnet Primär-, Sekundär- und Tertiärfarben in einem Kreis an"],
  ["die unbunten Farben", "sind Schwarz, Weiß und Grau"],
  ["der Hell-Dunkel-Kontrast", "entsteht durch das Nebeneinander heller und dunkler Farben"],
  ["der Komplementärkontrast", "entsteht durch das Nebeneinander gegenüberliegender Farbkreis-Farben"],
  ["der Kalt-Warm-Kontrast", "entsteht durch das Nebeneinander kalter und warmer Farben"],
];

// Künstler → Epoche/Stilrichtung (nur vorwärts, Epochen wiederholen sich)
const KU_KUENSTLER = [
  ["Albrecht Dürer", "Renaissance"],
  ["Leonardo da Vinci", "Renaissance"],
  ["Michelangelo", "Renaissance"],
  ["Raffael", "Renaissance"],
  ["Rembrandt", "Barock"],
  ["Peter Paul Rubens", "Barock"],
  ["Caravaggio", "Barock"],
  ["Caspar David Friedrich", "Romantik"],
  ["William Turner", "Romantik"],
  ["Claude Monet", "Impressionismus"],
  ["Pierre-Auguste Renoir", "Impressionismus"],
  ["Edgar Degas", "Impressionismus"],
  ["Vincent van Gogh", "Postimpressionismus"],
  ["Paul Cézanne", "Postimpressionismus"],
  ["Paul Gauguin", "Postimpressionismus"],
  ["Ernst Ludwig Kirchner", "Expressionismus"],
  ["Franz Marc", "Expressionismus"],
  ["Wassily Kandinsky", "Expressionismus"],
  ["Pablo Picasso", "Kubismus"],
  ["Georges Braque", "Kubismus"],
  ["Salvador Dalí", "Surrealismus"],
  ["René Magritte", "Surrealismus"],
  ["Andy Warhol", "Pop-Art"],
  ["Roy Lichtenstein", "Pop-Art"],
];

// Techniken (Terme und Beschreibungen eindeutig)
const KU_TECHNIKEN = [
  ["das Aquarell", "arbeitet mit wasserlöslichen, lasierenden (durchscheinenden) Farben"],
  ["die Gouache", "arbeitet mit deckenden Wasserfarben"],
  ["die Ölmalerei", "verwendet mit Öl gebundene Farben, die langsam trocknen"],
  ["die Collage", "klebt verschiedene Materialien (Papier, Fotos, Stoff) zu einem Bild zusammen"],
  ["das Fresko", "ist Wandmalerei auf frischem, feuchtem Putz"],
  ["die Radierung", "ist ein Tiefdruckverfahren, bei dem in eine Metallplatte geritzt/geätzt wird"],
  ["der Holzschnitt", "ist ein Hochdruckverfahren mit einer geschnitzten Holzplatte"],
  ["der Linolschnitt", "ist ein Hochdruckverfahren mit einer geschnittenen Linoleumplatte"],
  ["das Pastell", "arbeitet mit weichen Farbkreiden direkt auf Papier"],
  ["das Mosaik", "setzt ein Bild aus kleinen Stein- oder Glasstückchen zusammen"],
  ["die Kohlezeichnung", "zeichnet mit gebranntem Zeichenkohle-Stift in Grau- und Schwarztönen"],
  ["die Frottage", "durchreibt Oberflächenstrukturen mit einem Stift auf Papier"],
];

function kunstFarbGens() {
  return [
    (r) => {
      const [a, b] = r.pick(KU_KOMPLEMENT);
      return mc(r, "Farbenlehre",
        `${r.pick(KU_LEADS)}Welche Farbe ist die Komplementärfarbe zu ${a}?`,
        b, pickN(r, KU_FARBEN, b, 3),
        `Im Farbkreis liegt ${b} genau gegenüber von ${a} — sie sind komplementär.`);
    },
    (r) => {
      const [mix, res] = r.pick(KU_MISCHUNG);
      return mc(r, "Farbenlehre",
        `${r.pick(KU_LEADS)}Welche Farbe entsteht beim Mischen von ${mix}?`,
        res, pickN(r, KU_FARBEN, res, 3),
        `${mix} gemischt ergibt die Sekundärfarbe ${res}.`);
    },
  ];
}

function kunstEpochenRevGen() {
  // Epoche → passender Künstler (Distraktoren aus anderen Epochen)
  const epochen = [...new Set(KU_KUENSTLER.map((t) => t[1]))];
  return [
    (r) => {
      const ep = r.pick(epochen);
      const inEp = KU_KUENSTLER.filter((t) => t[1] === ep).map((t) => t[0]);
      const outEp = KU_KUENSTLER.filter((t) => t[1] !== ep).map((t) => t[0]);
      const correct = r.pick(inEp);
      return mc(r, "Epochen & Künstler",
        `${r.pick(KU_LEADS)}Welcher Künstler wird der Stilrichtung „${ep}“ zugeordnet?`,
        correct, pickN(r, outEp, correct, 3),
        `${correct} zählt zur Stilrichtung ${ep}.`);
    },
  ];
}

function kunstGenerators() {
  const gens = [];
  gens.push(...kunstFarbGens());
  gens.push(...factGens("Farbenlehre", KU_FARBLEHRE,
    (t) => `Was gilt für ${t}?`,
    (d) => `Welcher Begriff der Farbenlehre passt: „${d}“?`, KU_LEADS));
  gens.push(...factGensFwd("Epochen & Künstler", KU_KUENSTLER,
    (t) => `Welcher Epoche/Stilrichtung wird ${t} zugeordnet?`, KU_LEADS));
  gens.push(...kunstEpochenRevGen());
  gens.push(...factGens("Techniken", KU_TECHNIKEN,
    (t) => `Was kennzeichnet ${t}?`,
    (d) => `Welche Technik ist gemeint: „${d}“?`, KU_LEADS));
  return gens;
}

/* ══════════════════════════════ MATHEMATIK 5–10 (ERGÄNZUNG) ══════════════════════════════ */

const M3_LEADS = ["", "Mathematik: ", "Berechne. ", "Geometrie: "];

function m3GeometrieGens(k) {
  const gens = [
    // Rechteck: Fläche
    (r) => {
      const a = r.int(2, 15), b = r.int(2, 15);
      const A = a * b;
      const dist = [2 * (a + b), A + a, A - b, a + b].filter((x) => x > 0 && x !== A);
      return mc(r, "Flächen",
        `${r.pick(M3_LEADS)}Ein Rechteck ist ${a} cm lang und ${b} cm breit. Wie groß ist sein Flächeninhalt?`,
        `${A} cm²`, pickN(r, dist.map((x) => `${x} cm²`), `${A} cm²`, 3),
        `A = a · b = ${a} cm · ${b} cm = ${A} cm².`);
    },
    // Rechteck: Umfang
    (r) => {
      const a = r.int(2, 15), b = r.int(2, 15);
      const U = 2 * (a + b);
      const dist = [a * b, U + 2, U - 2, a + b].filter((x) => x > 0 && x !== U);
      return mc(r, "Umfang",
        `${r.pick(M3_LEADS)}Ein Rechteck ist ${a} cm lang und ${b} cm breit. Wie groß ist sein Umfang?`,
        `${U} cm`, pickN(r, dist.map((x) => `${x} cm`), `${U} cm`, 3),
        `U = 2 · (a + b) = 2 · (${a} + ${b}) = ${U} cm.`);
    },
    // Quadrat: Fläche
    (r) => {
      const a = r.int(2, 15);
      const A = a * a;
      const dist = [4 * a, A + a, 2 * a, A - a].filter((x) => x > 0 && x !== A);
      return mc(r, "Flächen",
        `${r.pick(M3_LEADS)}Ein Quadrat hat die Seitenlänge ${a} cm. Wie groß ist sein Flächeninhalt?`,
        `${A} cm²`, pickN(r, dist.map((x) => `${x} cm²`), `${A} cm²`, 3),
        `A = a² = ${a}² = ${A} cm².`);
    },
    // Dreieck: Fläche (g gerade)
    (r) => {
      const g = 2 * r.int(2, 10), h = r.int(2, 12);
      const A = (g * h) / 2;
      const dist = [g * h, A + h, A - g / 2, g + h].filter((x) => x > 0 && x !== A);
      return mc(r, "Flächen",
        `${r.pick(M3_LEADS)}Ein Dreieck hat die Grundseite g = ${g} cm und die Höhe h = ${h} cm. Wie groß ist sein Flächeninhalt?`,
        `${A} cm²`, pickN(r, dist.map((x) => `${x} cm²`), `${A} cm²`, 3),
        `A = g · h / 2 = ${g} · ${h} / 2 = ${A} cm².`);
    },
    // Quader: Volumen
    (r) => {
      const a = r.int(2, 10), b = r.int(2, 10), c = r.int(2, 10);
      const V = a * b * c;
      const dist = [a * b + c, a + b + c, V + a, 2 * (a * b + b * c + a * c)].filter((x) => x > 0 && x !== V);
      return mc(r, "Volumen",
        `${r.pick(M3_LEADS)}Ein Quader hat die Kantenlängen ${a} cm, ${b} cm und ${c} cm. Wie groß ist sein Volumen?`,
        `${V} cm³`, pickN(r, dist.map((x) => `${x} cm³`), `${V} cm³`, 3),
        `V = a · b · c = ${a} · ${b} · ${c} = ${V} cm³.`);
    },
    // Würfel: Volumen
    (r) => {
      const a = r.int(2, 10);
      const V = a ** 3;
      const dist = [a * a, 6 * a * a, V + a, 3 * a].filter((x) => x > 0 && x !== V);
      return mc(r, "Volumen",
        `${r.pick(M3_LEADS)}Ein Würfel hat die Kantenlänge ${a} cm. Wie groß ist sein Volumen?`,
        `${V} cm³`, pickN(r, dist.map((x) => `${x} cm³`), `${V} cm³`, 3),
        `V = a³ = ${a}³ = ${V} cm³.`);
    },
  ];
  if (k >= 8) {
    // Kreisfläche exakt mit π
    gens.push((r) => {
      const rad = r.int(2, 12);
      const A = rad * rad;
      const dist = [2 * rad, A + rad, (rad + 1) ** 2, 4 * rad].filter((x) => x !== A);
      return mc(r, "Kreis",
        `${r.pick(M3_LEADS)}Ein Kreis hat den Radius r = ${rad} cm. Wie groß ist sein Flächeninhalt (exakt)?`,
        `${A}π cm²`, pickN(r, dist.map((x) => `${x}π cm²`), `${A}π cm²`, 3),
        `A = π · r² = π · ${rad}² = ${A}π cm².`);
    });
    // Kreisumfang exakt mit π
    gens.push((r) => {
      const rad = r.int(2, 12);
      const U = 2 * rad;
      const dist = [rad, rad * rad, U + 2, 4 * rad].filter((x) => x !== U);
      return mc(r, "Kreis",
        `${r.pick(M3_LEADS)}Ein Kreis hat den Radius r = ${rad} cm. Wie groß ist sein Umfang (exakt)?`,
        `${U}π cm`, pickN(r, dist.map((x) => `${x}π cm`), `${U}π cm`, 3),
        `U = 2 · π · r = 2π · ${rad} = ${U}π cm.`);
    });
  }
  return gens;
}

function m3TermeGens() {
  return [
    // ax + bx = (a+b)x
    (r) => {
      const a = r.int(2, 12), b = r.int(2, 12);
      const s = a + b;
      const correct = `${s}x`;
      const dist = [`${a * b}x`, `${s}x²`, `${s + 1}x`, `${Math.abs(a - b)}x`].filter((v) => v !== correct);
      return mc(r, "Terme",
        `${r.pick(M3_LEADS)}Vereinfache den Term: ${a}x + ${b}x`,
        correct, pickN(r, dist, correct, 3),
        `${a}x + ${b}x = (${a} + ${b})x = ${s}x.`);
    },
    // ax - bx (a > b)
    (r) => {
      const b = r.int(2, 10), a = b + r.int(1, 10);
      const s = a - b;
      const correct = s === 1 ? "x" : `${s}x`;
      const dist = [`${a + b}x`, `${s}x²`, `${s + 1}x`, `${a * b}x`].filter((v) => v !== correct);
      return mc(r, "Terme",
        `${r.pick(M3_LEADS)}Vereinfache den Term: ${a}x - ${b}x`,
        correct, pickN(r, dist, correct, 3),
        `${a}x - ${b}x = (${a} - ${b})x = ${correct}.`);
    },
    // a · bx = abx
    (r) => {
      const a = r.int(2, 9), b = r.int(2, 9);
      const p = a * b;
      const correct = `${p}x`;
      const dist = [`${a + b}x`, `${p}x²`, `${p + 1}x`, `${a}x + ${b}`].filter((v) => v !== correct);
      return mc(r, "Terme",
        `${r.pick(M3_LEADS)}Vereinfache den Term: ${a} · ${b}x`,
        correct, pickN(r, dist, correct, 3),
        `${a} · ${b}x = ${p}x.`);
    },
    // ax + by + cx = (a+c)x + by
    (r) => {
      const a = r.int(2, 9), b = r.int(2, 9), c = r.int(2, 9);
      const s = a + c;
      const correct = `${s}x + ${b}y`;
      const dist = [`${s + b}xy`, `${a + b + c}x`, `${s}x + ${b + 1}y`, `${a}x + ${b + c}y`].filter((v) => v !== correct);
      return mc(r, "Terme",
        `${r.pick(M3_LEADS)}Vereinfache den Term: ${a}x + ${b}y + ${c}x`,
        correct, pickN(r, dist, correct, 3),
        `${a}x + ${c}x = ${s}x; also ${s}x + ${b}y.`);
    },
  ];
}

function m3ZuordnungGens() {
  return [
    // Proportional: Preis
    (r) => {
      const stueck = r.int(2, 8);
      const preisProStueck = r.int(2, 9);
      const gesucht = r.int(2, 12);
      if (gesucht === stueck) return null;
      const bekannt = stueck * preisProStueck;
      const gesamt = gesucht * preisProStueck;
      const dist = [gesamt + preisProStueck, gesamt - preisProStueck, bekannt + gesucht, gesamt + 1].filter((x) => x > 0 && x !== gesamt);
      return mc(r, "Proportionale Zuordnung",
        `${r.pick(M3_LEADS)}${stueck} kg Äpfel kosten ${bekannt} €. Wie viel kosten ${gesucht} kg? (proportional)`,
        `${gesamt} €`, pickN(r, dist.map((x) => `${x} €`), `${gesamt} €`, 3),
        `1 kg kostet ${bekannt}/${stueck} = ${preisProStueck} €; ${gesucht} kg kosten ${gesucht} · ${preisProStueck} = ${gesamt} €.`);
    },
    // Antiproportional: Arbeiter/Zeit
    (r) => {
      const w1 = r.pick([2, 3, 4, 6]);
      const t1 = r.pick([6, 8, 12, 24]);
      const w2 = r.pick([2, 3, 4, 6, 8, 12].filter((x) => x !== w1 && (w1 * t1) % x === 0));
      if (!w2) return null;
      const t2 = (w1 * t1) / w2;
      const dist = [t2 + 1, t2 - 1, t1, (w2 * t1) / w1].filter((x) => x > 0 && Number.isInteger(x) && x !== t2);
      return mc(r, "Antiproportionale Zuordnung",
        `${r.pick(M3_LEADS)}${w1} Arbeiter brauchen für eine Aufgabe ${t1} Stunden. Wie lange brauchen ${w2} Arbeiter? (antiproportional)`,
        `${t2} Stunden`, pickN(r, dist.map((x) => `${x} Stunden`), `${t2} Stunden`, 3),
        `Produkt konstant: ${w1} · ${t1} = ${w1 * t1} = ${w2} · ${t2} ⇒ ${t2} Stunden.`);
    },
    // Proportional erkennen
    (r) => {
      const x1 = r.int(2, 6), y1 = x1 * r.int(2, 8);
      const f = r.int(2, 4);
      const correct = `${x1 * f} → ${y1 * f}`;
      const dist = [`${x1 * f} → ${y1 * f + 1}`, `${x1 * f} → ${y1 + f}`, `${x1 * f} → ${y1 * f * 2}`];
      return mc(r, "Proportionale Zuordnung",
        `${r.pick(M3_LEADS)}Eine proportionale Zuordnung enthält das Paar ${x1} → ${y1}. Welches Paar gehört ebenfalls dazu?`,
        correct, pickN(r, dist, correct, 3),
        `Der Faktor ist ${y1 / x1}; ${x1 * f} · ${y1 / x1} = ${y1 * f}.`);
    },
  ];
}

function m3WahrscheinlichkeitGens() {
  return [
    // Würfel
    (r) => {
      const ereignisse = [
        ["eine gerade Zahl", 3],
        ["eine ungerade Zahl", 3],
        ["eine Zahl größer als 4", 2],
        ["eine Zahl kleiner als 3", 2],
        ["eine Sechs", 1],
        ["eine Zahl kleiner als 5", 4],
        ["eine Zahl größer als 1", 5],
      ];
      const [ev, g] = r.pick(ereignisse);
      const correct = frac(g, 6);
      const dist = [frac(g + 1, 6), frac(Math.max(1, g - 1), 6), frac(g, 12), "1/2", "1/6"].filter((v) => v !== correct);
      return mc(r, "Wahrscheinlichkeit",
        `${r.pick(M3_LEADS)}Ein fairer Würfel wird einmal geworfen. Wie groß ist die Wahrscheinlichkeit, ${ev} zu würfeln?`,
        correct, pickN(r, dist, correct, 3),
        `${g} von 6 Ergebnissen sind günstig: P = ${g}/6 = ${correct}.`);
    },
    // Urne
    (r) => {
      const rot = r.int(1, 8), blau = r.int(1, 8);
      const n = rot + blau;
      const correct = frac(rot, n);
      const dist = [frac(blau, n), frac(rot, rot + blau + 1), frac(Math.min(rot + 1, n), n), "1/2"].filter((v) => v !== correct);
      return mc(r, "Wahrscheinlichkeit",
        `${r.pick(M3_LEADS)}In einer Urne liegen ${rot} rote und ${blau} blaue Kugeln. Wie groß ist die Wahrscheinlichkeit, eine rote Kugel zu ziehen?`,
        correct, pickN(r, dist, correct, 3),
        `P(rot) = ${rot}/${n}${correct === `${rot}/${n}` ? "" : ` = ${correct}`}.`);
    },
    // Glücksrad
    (r) => {
      const felder = r.pick([4, 5, 6, 8, 10, 12]);
      const gewinn = r.int(1, felder - 1);
      const correct = frac(gewinn, felder);
      const dist = [frac(felder - gewinn, felder), frac(gewinn, felder + 1), frac(Math.min(gewinn + 1, felder), felder)].filter((v) => v !== correct);
      return mc(r, "Wahrscheinlichkeit",
        `${r.pick(M3_LEADS)}Ein Glücksrad hat ${felder} gleich große Felder, davon sind ${gewinn} Gewinnfelder. Wie groß ist die Gewinnwahrscheinlichkeit?`,
        correct, pickN(r, dist, correct, 3),
        `P(Gewinn) = ${gewinn}/${felder}${correct === `${gewinn}/${felder}` ? "" : ` = ${correct}`}.`);
    },
  ];
}

function mathematik3Generators(k) {
  const gens = [];
  gens.push(...m3GeometrieGens(k));
  gens.push(...m3ZuordnungGens());
  if (k >= 7) {
    gens.push(...m3TermeGens());
    gens.push(...m3WahrscheinlichkeitGens());
  }
  return gens;
}

/* ────────────────────────── Hauptprogramm ────────────────────────── */

function writeBank(fach, klasse, questions, minCount) {
  const file = join(DATA_DIR, `${fach}-klasse${klasse}.json`);
  writeFileSync(file, JSON.stringify(questions, null, 1) + "\n");
  const warn = questions.length < minCount ? `  ⚠ unter Soll (${minCount})` : "";
  console.log(`  ${fach} Klasse ${klasse}: ${questions.length} Fragen → ${file}${warn}`);
  return questions.length;
}

function main() {
  mkdirSync(DATA_DIR, { recursive: true });
  let total = 0;

  console.log("Physik (Klasse 11–13, je >= 500):");
  for (let k = 11; k <= 13; k++) total += writeBank("physik", k, generateBank(21000 + k, 500, physikGenerators(k)), 500);

  console.log("Chemie (Klasse 11–13, je >= 400):");
  for (let k = 11; k <= 13; k++) total += writeBank("chemie", k, generateBank(22000 + k, 400, chemieGenerators()), 400);

  console.log("Wirtschaft/Politik (Klasse 8–13, je >= 400):");
  for (let k = 8; k <= 13; k++) total += writeBank("wirtschaft", k, generateBank(23000 + k, 400, wirtschaftGenerators()), 400);

  console.log("Musik (Klasse 5–10, je >= 300):");
  for (let k = 5; k <= 10; k++) total += writeBank("musik", k, generateBank(24000 + k, 300, musikGenerators()), 300);

  console.log("Kunst (Klasse 5–10, je >= 300):");
  for (let k = 5; k <= 10; k++) total += writeBank("kunst", k, generateBank(25000 + k, 300, kunstGenerators()), 300);

  console.log("Mathematik-Ergänzung (Klasse 5–10, je >= 400):");
  for (let k = 5; k <= 10; k++) total += writeBank("mathematik3", k, generateBank(26000 + k, 400, mathematik3Generators(k)), 400);

  console.log(`\nGesamt (Runde 4): ${total} Fragen.`);
}

main();
