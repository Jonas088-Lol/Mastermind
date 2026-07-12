/* Copyright 2026 Elian Schock, Jonas Schwenk */
/**
 * MEGA-Fragen-Generator RUNDE 8 für MasterMind.
 *
 * Ergänzt die Fragenbank aus generate.mjs … generate6.mjs im GLEICHEN Format
 *   scripts/questions/mega/data/<fach>-klasse<k>.json
 * mit [{ topic, question, options[4], correct(Index), explanation }].
 *
 * Fächer/Umfang (nur NEUE Dateien mit Präfix …2/…3, Bestehendes bleibt unberührt):
 *   1) physik2       Klasse 7–10, >= 400/Klasse
 *      (Hebelgesetz berechnet, Wärmelehre C/K + Mischtemperatur, Optik, Druck p=F/A)
 *   2) chemie2       Klasse 8–10, >= 350/Klasse
 *      (Reaktionsgleichungen, Säuren/Basen/Salze, Ionenladungen, PSE-Trends)
 *   3) franzoesisch2 Klasse 7–10, >= 350/Klasse
 *      (passé composé avoir/être, Objektpronomen, Vokabeln >= 100 Paare/Klasse)
 *   4) latein2       Klasse 7–10, >= 300/Klasse
 *      (Konjunktiv, AcI, Steigerung, Vokabeln >= 80/Klasse, römische Zahlen)
 *   5) spanisch2     Klasse 9–10, >= 300/Klasse
 *      (pretérito indefinido, Vokabeln >= 100 Paare/Klasse, gustar)
 *   6) informatik3   Klasse 8–10, >= 350/Klasse
 *      (Python-Schleifen/Listen berechnet, Hex↔Dezimal, Algorithmus-Logik, Datenschutz)
 *
 * Deterministisch (mulberry32-Seed). Keine Abhängigkeiten, reines Node.
 *
 * Aufruf (vom Repo-Root):
 *   node scripts/questions/mega/generate8.mjs
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

/* ══════════════════ 1) PHYSIK Klasse 7–10 ══════════════════ */

const OPTIK_FAKTEN = [
  ["Wie lautet das Reflexionsgesetz?", "Einfallswinkel = Reflexionswinkel", ["Einfallswinkel = 2 · Reflexionswinkel", "Der Reflexionswinkel ist immer 90°", "Der Reflexionswinkel ist immer kleiner"], "Beim Spiegel gilt: Einfallswinkel = Reflexionswinkel (zum Lot gemessen)."],
  ["Zu welchem Bezug werden Einfalls- und Reflexionswinkel gemessen?", "zum Lot (Senkrechte auf der Spiegelfläche)", ["zur Spiegelfläche", "zum Boden", "zur Lichtquelle"], "Die Winkel werden immer zum Einfallslot gemessen."],
  ["Welche Linse bündelt parallele Lichtstrahlen in einem Punkt?", "die Sammellinse (Konvexlinse)", ["die Zerstreuungslinse (Konkavlinse)", "die Planplatte", "der Hohlspiegel bündelt nie"], "Eine Sammellinse vereinigt parallele Strahlen im Brennpunkt."],
  ["Wie nennt man den Punkt, in dem eine Sammellinse parallele Strahlen vereinigt?", "Brennpunkt", ["Mittelpunkt", "Scheitelpunkt", "Knotenpunkt"], "Der Brennpunkt (Fokus) liegt im Abstand der Brennweite f."],
  ["Wie ist eine Sammellinse geformt?", "in der Mitte dicker als am Rand", ["in der Mitte dünner als am Rand", "überall gleich dick", "immer würfelförmig"], "Konvexlinsen sind in der Mitte dicker (Sammellinse)."],
  ["Wie ist eine Zerstreuungslinse geformt?", "in der Mitte dünner als am Rand", ["in der Mitte dicker als am Rand", "überall gleich dick", "kugelförmig"], "Konkavlinsen sind in der Mitte dünner (Zerstreuungslinse)."],
  ["Was passiert mit Licht beim Übergang von Luft in Glas?", "es wird zum Lot hin gebrochen", ["es wird vom Lot weg gebrochen", "es wird immer vollständig reflektiert", "es ändert seine Richtung nie"], "Beim Übergang ins optisch dichtere Medium wird Licht zum Lot hin gebrochen."],
  ["Welches Bild erzeugt ein ebener Spiegel?", "ein aufrechtes, seitenvertauschtes, gleich großes Scheinbild", ["ein verkleinertes, umgekehrtes Bild", "ein vergrößertes reelles Bild", "gar kein Bild"], "Der ebene Spiegel erzeugt ein virtuelles, gleich großes Bild hinter dem Spiegel."],
  ["Welche Linse steckt (vereinfacht) im menschlichen Auge?", "eine Sammellinse", ["eine Zerstreuungslinse", "ein Prisma", "ein Hohlspiegel"], "Die Augenlinse ist eine verformbare Sammellinse."],
  ["Mit welcher Linse korrigiert man Kurzsichtigkeit?", "mit einer Zerstreuungslinse", ["mit einer Sammellinse", "mit einem Spiegel", "mit einer Planplatte"], "Kurzsichtige benötigen Zerstreuungslinsen (negative Brechkraft)."],
  ["Mit welcher Linse korrigiert man Weitsichtigkeit?", "mit einer Sammellinse", ["mit einer Zerstreuungslinse", "mit einem Prisma", "gar nicht"], "Weitsichtige benötigen Sammellinsen (positive Brechkraft)."],
  ["Was zerlegt weißes Licht in seine Spektralfarben?", "ein Prisma", ["ein ebener Spiegel", "eine Blende", "ein schwarzer Körper"], "Ein Prisma bricht die Farben unterschiedlich stark (Dispersion)."],
  ["Wie breitet sich Licht in einem gleichförmigen Medium aus?", "geradlinig", ["in Kurven", "spiralförmig", "nur nach oben"], "Licht breitet sich geradlinig aus (Lichtstrahl-Modell)."],
  ["Wie groß ist die Lichtgeschwindigkeit im Vakuum ungefähr?", "300 000 km/s", ["300 km/s", "3 000 km/s", "30 000 000 km/s"], "c ≈ 300 000 km/s = 3·10⁸ m/s."],
  ["Wie nennt man den Abstand zwischen Linse und Brennpunkt?", "Brennweite", ["Bildweite", "Gegenstandsweite", "Radius"], "Die Brennweite f ist der Abstand Linsenmitte–Brennpunkt."],
];

function physik2Generators(klasse) {
  const gens = [];

  // Hebelgesetz: F2 berechnen (F1·l1 = F2·l2)
  gens.push((r) => {
    const l2 = r.int(2, 8) * 10; // cm
    const l1 = r.int(1, 12) * 5; // cm
    if (l1 === l2) return null;
    const F1 = r.int(1, 10) * (l2 / gcd(l1, l2)); // F1 so, dass F1*l1/l2 ganzzahlig
    const gesucht = (F1 * l1) / l2;
    if (!Number.isInteger(gesucht) || gesucht <= 0) return null;
    return mc(r, "Hebelgesetz", `${r.pick(LEADS)}Ein Hebel ist im Gleichgewicht. Links wirkt die Kraft F₁ = ${F1} N im Abstand ${l1} cm vom Drehpunkt. Welche Kraft F₂ wirkt rechts im Abstand ${l2} cm?`,
      `${gesucht} N`, numDistractors(r, gesucht, Math.max(3, Math.round(gesucht / 3))).filter((d) => d > 0).slice(0, 3).map((d) => `${d} N`),
      `Hebelgesetz: F₁·l₁ = F₂·l₂ → F₂ = ${F1}·${l1}/${l2} = ${gesucht} N.`);
  });

  // Hebelgesetz: Abstand berechnen
  gens.push((r) => {
    const F1 = r.int(2, 12) * 5;
    const l1 = r.int(2, 10) * 10;
    const F2 = r.pick([2, 4, 5, 10].filter((f) => (F1 * l1) % (f * 10) === 0).map((f) => f * 10));
    if (!F2) return null;
    const l2 = (F1 * l1) / F2;
    if (!Number.isInteger(l2) || l2 <= 0 || l2 > 400) return null;
    return mc(r, "Hebelgesetz", `${r.pick(LEADS)}Hebel im Gleichgewicht: F₁ = ${F1} N wirkt bei ${l1} cm. In welchem Abstand muss F₂ = ${F2} N angreifen?`,
      `${l2} cm`, numDistractors(r, l2, Math.max(4, Math.round(l2 / 3))).filter((d) => d > 0).slice(0, 3).map((d) => `${d} cm`),
      `F₁·l₁ = F₂·l₂ → l₂ = ${F1}·${l1}/${F2} = ${l2} cm.`);
  });

  // Wärmelehre: °C → K
  gens.push((r) => {
    const c = r.int(-50, 150);
    const kv = c + 273;
    return mc(r, "Wärmelehre", `${r.pick(LEADS)}Rechne um: ${c} °C sind wie viel Kelvin (gerundet, 0 °C ≈ 273 K)?`,
      `${kv} K`, [`${kv + 100} K`, `${c} K`, `${kv - 10} K`],
      `T(K) = ${c} + 273 = ${kv} K.`);
  });

  // Wärmelehre: K → °C
  gens.push((r) => {
    const kv = r.int(200, 500);
    const c = kv - 273;
    return mc(r, "Wärmelehre", `${r.pick(LEADS)}Rechne um: ${kv} K sind wie viel Grad Celsius (0 °C ≈ 273 K)?`,
      `${c} °C`, [`${c + 100} °C`, `${kv} °C`, `${c - 10} °C`],
      `ϑ(°C) = ${kv} − 273 = ${c} °C.`);
  });

  // Mischtemperatur (gleiche Massen)
  gens.push((r) => {
    const t1 = r.int(5, 40) * 2;
    const t2 = r.int(21, 48) * 2;
    if (t1 === t2) return null;
    const tm = (t1 + t2) / 2;
    return mc(r, "Wärmelehre", `${r.pick(LEADS)}Gleich viel Wasser von ${t1} °C und ${t2} °C wird gemischt. Welche Mischtemperatur stellt sich (ohne Verluste) ein?`,
      `${tm} °C`, numDistractors(r, tm, 8).filter((d) => d > 0).slice(0, 3).map((d) => `${d} °C`),
      `Bei gleichen Massen: T_m = (${t1} + ${t2}) / 2 = ${tm} °C.`);
  });

  // Reflexionswinkel
  gens.push((r) => {
    const w = r.int(10, 80);
    return mc(r, "Optik", `${r.pick(LEADS)}Ein Lichtstrahl trifft unter dem Einfallswinkel ${w}° (zum Lot) auf einen ebenen Spiegel. Wie groß ist der Reflexionswinkel?`,
      `${w}°`, [`${90 - w}°`, `${w * 2 > 90 ? w - 10 : w * 2}°`, `90°`],
      `Reflexionsgesetz: Einfallswinkel = Reflexionswinkel = ${w}°.`);
  });

  // Winkel zwischen Strahl und Spiegel → Einfallswinkel zum Lot
  gens.push((r) => {
    const s = r.int(15, 75);
    const lot = 90 - s;
    return mc(r, "Optik", `${r.pick(LEADS)}Ein Lichtstrahl trifft unter ${s}° zur Spiegelfläche auf einen Spiegel. Wie groß ist der Einfallswinkel zum Lot?`,
      `${lot}°`, [`${s}°`, `${Math.min(89, s + 10)}°`, `${180 - s}°`],
      `Zum Lot gemessen: 90° − ${s}° = ${lot}°.`);
  });

  // Optik-Faktenbank
  gens.push((r) => {
    const [q, a, d, e] = r.pick(OPTIK_FAKTEN);
    return mc(r, "Optik", `${r.pick(LEADS)}${q}`, a, r.shuffle(d), e);
  });

  // Druck p = F/A
  gens.push((r) => {
    const A = r.pick([2, 4, 5, 10, 20, 25, 50]);
    const p = r.int(2, 40);
    const F = p * A;
    return mc(r, "Druck", `${r.pick(LEADS)}Eine Kraft von ${F} N wirkt auf eine Fläche von ${A} cm². Wie groß ist der Druck p = F/A?`,
      `${p} N/cm²`, numDistractors(r, p, Math.max(3, Math.round(p / 2))).filter((d) => d > 0).slice(0, 3).map((d) => `${d} N/cm²`),
      `p = F/A = ${F} N / ${A} cm² = ${p} N/cm².`);
  });

  // Druck: Kraft berechnen
  gens.push((r) => {
    const A = r.pick([2, 3, 4, 5, 8, 10]);
    const p = r.int(3, 50);
    const F = p * A;
    return mc(r, "Druck", `${r.pick(LEADS)}Auf einer Fläche von ${A} m² herrscht der Druck ${p} Pa. Welche Kraft wirkt insgesamt (F = p·A)?`,
      `${F} N`, numDistractors(r, F, Math.max(4, Math.round(F / 3))).filter((d) => d > 0).slice(0, 3).map((d) => `${d} N`),
      `F = p·A = ${p} Pa · ${A} m² = ${F} N.`);
  });

  // Pa ↔ N/m²-Verständnis (ab Kl. 8 zusätzlich hPa)
  if (klasse >= 8) {
    gens.push((r) => {
      const h = r.int(2, 40) * 25;
      return mc(r, "Druck", `${r.pick(LEADS)}Rechne um: ${h} hPa sind wie viel Pascal?`,
        `${h * 100} Pa`, [`${h * 10} Pa`, `${h} Pa`, `${h * 1000} Pa`],
        `1 hPa = 100 Pa, also ${h} hPa = ${h * 100} Pa.`);
    });
  }

  return gens;
}

function gcd(a, b) { return b === 0 ? a : gcd(b, a % b); }

/* ══════════════════ 2) CHEMIE Klasse 8–10 ══════════════════ */

// Geprüfte Gleichungsbank: [Frage-Gleichung mit Lücke, richtige Antwort, Distraktoren, Erklärung]
const GLEICHUNGEN = [
  ["_ H₂ + O₂ → 2 H₂O", "2", ["1", "3", "4"], "Knallgasreaktion: 2 H₂ + O₂ → 2 H₂O."],
  ["2 H₂ + O₂ → _ H₂O", "2", ["1", "3", "4"], "Links 4 H und 2 O → rechts 2 H₂O."],
  ["2 Mg + O₂ → _ MgO", "2", ["1", "3", "4"], "2 Mg + O₂ → 2 MgO (Magnesiumoxid)."],
  ["_ Na + Cl₂ → 2 NaCl", "2", ["1", "3", "4"], "2 Na + Cl₂ → 2 NaCl (Kochsalz)."],
  ["4 Fe + 3 O₂ → _ Fe₂O₃", "2", ["1", "3", "4"], "4 Fe + 3 O₂ → 2 Fe₂O₃ (Eisen(III)-oxid)."],
  ["CH₄ + _ O₂ → CO₂ + 2 H₂O", "2", ["1", "3", "4"], "Methanverbrennung: CH₄ + 2 O₂ → CO₂ + 2 H₂O."],
  ["CH₄ + 2 O₂ → CO₂ + _ H₂O", "2", ["1", "3", "4"], "4 H links → 2 H₂O rechts."],
  ["N₂ + 3 H₂ → _ NH₃", "2", ["1", "3", "4"], "Ammoniaksynthese: N₂ + 3 H₂ → 2 NH₃."],
  ["N₂ + _ H₂ → 2 NH₃", "3", ["1", "2", "4"], "6 H rechts → 3 H₂ links."],
  ["2 H₂O₂ → 2 H₂O + _ O₂", "1", ["2", "3", "4"], "Zerfall von Wasserstoffperoxid: 2 H₂O₂ → 2 H₂O + O₂."],
  ["Zn + _ HCl → ZnCl₂ + H₂", "2", ["1", "3", "4"], "Zn + 2 HCl → ZnCl₂ + H₂."],
  ["2 Al + _ Cl₂ → 2 AlCl₃", "3", ["1", "2", "4"], "2 Al + 3 Cl₂ → 2 AlCl₃."],
  ["_ K + 2 H₂O → 2 KOH + H₂", "2", ["1", "3", "4"], "2 K + 2 H₂O → 2 KOH + H₂."],
  ["_ Cu + O₂ → 2 CuO", "2", ["1", "3", "4"], "2 Cu + O₂ → 2 CuO (Kupfer(II)-oxid)."],
  ["S + O₂ → ? — Welches Produkt entsteht?", "SO₂", ["SO₃ direkt", "S₂O", "H₂S"], "Schwefel verbrennt zu Schwefeldioxid SO₂."],
  ["C + O₂ → ? — Welches Produkt entsteht bei vollständiger Verbrennung?", "CO₂", ["CO", "C₂O", "CO₃"], "Vollständige Verbrennung von Kohlenstoff ergibt CO₂."],
  ["CaCO₃ → CaO + ? — Welches Gas entsteht beim Kalkbrennen?", "CO₂", ["O₂", "H₂", "CO"], "Kalkbrennen: CaCO₃ → CaO + CO₂."],
  ["Fe + S → ? — Welches Produkt entsteht?", "FeS", ["FeS₂ immer", "Fe₂S", "FeO"], "Eisen und Schwefel reagieren zu Eisensulfid FeS."],
  ["2 Na + Cl₂ → ? — Welches Produkt entsteht?", "2 NaCl", ["Na₂Cl", "NaCl₂", "Na₂Cl₃"], "Natrium und Chlor bilden Natriumchlorid NaCl."],
  ["Mg + O₂ → ? — Wie lautet die vollständig ausgeglichene Gleichung?", "2 Mg + O₂ → 2 MgO", ["Mg + O₂ → MgO₂", "Mg + O → MgO", "3 Mg + O₂ → 3 MgO"], "Richtig ausgeglichen: 2 Mg + O₂ → 2 MgO."],
];

const SBS_FAKTEN = [
  ["Wie heißt die Säure mit der Formel HCl (in Wasser)?", "Salzsäure", ["Schwefelsäure", "Salpetersäure", "Kohlensäure"], "HCl in Wasser ist Salzsäure."],
  ["Wie heißt die Säure mit der Formel H₂SO₄?", "Schwefelsäure", ["Salzsäure", "Salpetersäure", "Phosphorsäure"], "H₂SO₄ ist Schwefelsäure."],
  ["Wie heißt die Säure mit der Formel HNO₃?", "Salpetersäure", ["Salzsäure", "Kohlensäure", "Essigsäure"], "HNO₃ ist Salpetersäure."],
  ["Wie heißt die Säure mit der Formel H₂CO₃?", "Kohlensäure", ["Schwefelsäure", "Salpetersäure", "Phosphorsäure"], "H₂CO₃ ist Kohlensäure."],
  ["Wie heißt die Säure mit der Formel H₃PO₄?", "Phosphorsäure", ["Salzsäure", "Kohlensäure", "Schwefelsäure"], "H₃PO₄ ist Phosphorsäure."],
  ["Welche Formel hat Natronlauge (Natriumhydroxid-Lösung)?", "NaOH", ["KOH", "Ca(OH)₂", "NaCl"], "Natronlauge ist gelöstes NaOH."],
  ["Welche Formel hat Kalilauge?", "KOH", ["NaOH", "Ca(OH)₂", "KCl"], "Kalilauge ist gelöstes KOH."],
  ["Welche Formel hat Calciumhydroxid (Kalkwasser)?", "Ca(OH)₂", ["CaOH", "CaO₂H", "CaCO₃"], "Kalkwasser enthält Ca(OH)₂."],
  ["Welche Teilchen sind für den sauren Charakter einer Lösung verantwortlich?", "H₃O⁺-Ionen (Oxonium-Ionen)", ["OH⁻-Ionen", "Na⁺-Ionen", "Cl⁻-Ionen"], "Säuren bilden in Wasser H₃O⁺-Ionen."],
  ["Welche Teilchen sind typisch für Laugen (alkalische Lösungen)?", "OH⁻-Ionen (Hydroxid-Ionen)", ["H₃O⁺-Ionen", "CO₂-Moleküle", "Metallatome"], "Laugen enthalten Hydroxid-Ionen OH⁻."],
  ["Welchen pH-Wert hat reines Wasser (neutral)?", "7", ["0", "14", "1"], "Neutral entspricht pH 7."],
  ["Welcher pH-Bereich ist sauer?", "pH kleiner als 7", ["pH größer als 7", "genau pH 7", "pH größer als 10"], "Sauer: pH < 7, alkalisch: pH > 7."],
  ["Welcher pH-Bereich ist alkalisch (basisch)?", "pH größer als 7", ["pH kleiner als 7", "genau pH 7", "pH kleiner als 3"], "Alkalisch: pH > 7."],
  ["Welche Farbe zeigt Universalindikator in saurer Lösung?", "rot", ["blau", "grün", "farblos"], "Sauer färbt Universalindikator rot, alkalisch blau/violett."],
  ["Welche Farbe zeigt Universalindikator in alkalischer Lösung?", "blau bis violett", ["rot", "gelbgrün (neutral)", "schwarz"], "Alkalische Lösungen färben Universalindikator blau/violett."],
  ["Was entsteht bei der Neutralisation von Säure und Lauge?", "Salz und Wasser", ["nur Gas", "nur Wasser", "Metall und Sauerstoff"], "Neutralisation: Säure + Lauge → Salz + Wasser."],
  ["Was entsteht bei der Reaktion von Salzsäure mit Natronlauge?", "Natriumchlorid und Wasser", ["Natriumsulfat und Wasser", "Chlorgas und Wasserstoff", "Natriumcarbonat"], "HCl + NaOH → NaCl + H₂O."],
  ["Wie heißt das Salz der Schwefelsäure?", "Sulfat", ["Chlorid", "Nitrat", "Carbonat"], "Salze der Schwefelsäure heißen Sulfate."],
  ["Wie heißt das Salz der Salpetersäure?", "Nitrat", ["Sulfat", "Chlorid", "Phosphat"], "Salze der Salpetersäure heißen Nitrate."],
  ["Wie heißt das Salz der Kohlensäure?", "Carbonat", ["Nitrat", "Sulfat", "Chlorid"], "Salze der Kohlensäure heißen Carbonate."],
  ["Wie heißt das Salz der Salzsäure?", "Chlorid", ["Sulfat", "Nitrat", "Carbonat"], "Salze der Salzsäure heißen Chloride."],
  ["Aus welchen Ionen besteht Kochsalz (NaCl)?", "Na⁺- und Cl⁻-Ionen", ["Na⁻- und Cl⁺-Ionen", "Na- und Cl-Atomen", "Na²⁺- und Cl²⁻-Ionen"], "NaCl ist ein Ionengitter aus Na⁺ und Cl⁻."],
  ["Warum leiten Salzlösungen elektrischen Strom?", "weil bewegliche Ionen vorhanden sind", ["weil Elektronen frei schwimmen", "weil Wasser immer leitet", "weil Salz magnetisch ist"], "Gelöste Salze zerfallen in bewegliche Ionen, die Ladung transportieren."],
  ["Wie nennt man das Lösen eines Salzes in seine Ionen?", "Dissoziation", ["Destillation", "Diffusion nur", "Kondensation"], "Beim Lösen dissoziiert das Salz in Ionen."],
];

const IONEN = [
  ["Natrium-Ion", "1+ (Na⁺)", "Natrium gibt 1 Außenelektron ab → Na⁺."],
  ["Kalium-Ion", "1+ (K⁺)", "Kalium gibt 1 Außenelektron ab → K⁺."],
  ["Magnesium-Ion", "2+ (Mg²⁺)", "Magnesium gibt 2 Elektronen ab → Mg²⁺."],
  ["Calcium-Ion", "2+ (Ca²⁺)", "Calcium gibt 2 Elektronen ab → Ca²⁺."],
  ["Aluminium-Ion", "3+ (Al³⁺)", "Aluminium gibt 3 Elektronen ab → Al³⁺."],
  ["Chlorid-Ion", "1− (Cl⁻)", "Chlor nimmt 1 Elektron auf → Cl⁻."],
  ["Fluorid-Ion", "1− (F⁻)", "Fluor nimmt 1 Elektron auf → F⁻."],
  ["Bromid-Ion", "1− (Br⁻)", "Brom nimmt 1 Elektron auf → Br⁻."],
  ["Iodid-Ion", "1− (I⁻)", "Iod nimmt 1 Elektron auf → I⁻."],
  ["Oxid-Ion", "2− (O²⁻)", "Sauerstoff nimmt 2 Elektronen auf → O²⁻."],
  ["Sulfid-Ion", "2− (S²⁻)", "Schwefel nimmt 2 Elektronen auf → S²⁻."],
  ["Hydroxid-Ion", "1− (OH⁻)", "Das Hydroxid-Ion trägt eine negative Ladung."],
  ["Nitrat-Ion", "1− (NO₃⁻)", "Das Nitrat-Ion ist einfach negativ geladen."],
  ["Sulfat-Ion", "2− (SO₄²⁻)", "Das Sulfat-Ion ist zweifach negativ geladen."],
  ["Carbonat-Ion", "2− (CO₃²⁻)", "Das Carbonat-Ion ist zweifach negativ geladen."],
  ["Phosphat-Ion", "3− (PO₄³⁻)", "Das Phosphat-Ion ist dreifach negativ geladen."],
  ["Ammonium-Ion", "1+ (NH₄⁺)", "Das Ammonium-Ion ist einfach positiv geladen."],
];
const IONEN_LADUNGEN = ["1+ (Na⁺)", "1+ (K⁺)", "2+ (Mg²⁺)", "2+ (Ca²⁺)", "3+ (Al³⁺)", "1− (Cl⁻)", "2− (O²⁻)", "2− (SO₄²⁻)", "3− (PO₄³⁻)", "1− (NO₃⁻)"];

const PSE_TRENDS = [
  ["Wie ändert sich der Atomradius innerhalb einer Gruppe von oben nach unten?", "er nimmt zu", ["er nimmt ab", "er bleibt gleich", "er halbiert sich pro Periode"], "Nach unten kommen Elektronenschalen hinzu → Radius wächst."],
  ["Wie ändert sich der Atomradius innerhalb einer Periode von links nach rechts?", "er nimmt ab", ["er nimmt zu", "er bleibt gleich", "er verdoppelt sich"], "Steigende Kernladung zieht die Schale enger → Radius sinkt."],
  ["Wie ändert sich die Elektronegativität innerhalb einer Periode von links nach rechts?", "sie nimmt zu", ["sie nimmt ab", "sie bleibt gleich", "sie ist überall null"], "EN steigt nach rechts (Fluor ist am elektronegativsten)."],
  ["Welches Element hat die höchste Elektronegativität?", "Fluor", ["Natrium", "Eisen", "Helium (bildet EN-Skala-Spitze)"], "Fluor hat mit ca. 4,0 die höchste Elektronegativität."],
  ["Wie ändert sich der metallische Charakter innerhalb einer Gruppe nach unten?", "er nimmt zu", ["er nimmt ab", "er bleibt gleich", "Metalle gibt es nur in Periode 1"], "Nach unten werden Elemente metallischer (z. B. Alkalimetalle reaktiver)."],
  ["Wie ändert sich die Reaktivität der Alkalimetalle von oben nach unten?", "sie nimmt zu", ["sie nimmt ab", "sie bleibt gleich", "sie verschwindet"], "Caesium reagiert heftiger als Lithium: Außenelektron ist leichter abzugeben."],
  ["Wie ändert sich die Reaktivität der Halogene von oben nach unten?", "sie nimmt ab", ["sie nimmt zu", "sie bleibt gleich", "sie steigt sprunghaft"], "Fluor ist das reaktivste Halogen; nach unten sinkt die Reaktivität."],
  ["Was haben Elemente derselben Hauptgruppe gemeinsam?", "die Zahl der Außenelektronen", ["die Zahl der Schalen", "die gleiche Masse", "den gleichen Aggregatzustand"], "Die Hauptgruppennummer entspricht der Zahl der Außenelektronen."],
  ["Was haben Elemente derselben Periode gemeinsam?", "die Zahl der Elektronenschalen", ["die Zahl der Außenelektronen", "die gleiche Ladung", "die gleiche Dichte"], "Die Periodennummer gibt die Zahl der besetzten Schalen an."],
  ["Wo stehen die Edelgase im Periodensystem?", "in der 8. Hauptgruppe (ganz rechts)", ["in der 1. Hauptgruppe", "in der Mitte", "ganz unten links"], "Edelgase bilden die 8. Hauptgruppe."],
  ["Warum sind Edelgase besonders reaktionsträge?", "ihre Außenschale ist voll besetzt (Edelgaskonfiguration)", ["sie haben keine Elektronen", "sie sind zu schwer", "sie sind magnetisch"], "Volle Außenschale → kaum Reaktionsbedürfnis."],
  ["Wie viele Außenelektronen haben die Elemente der 7. Hauptgruppe (Halogene)?", "7", ["1", "8", "2"], "Halogene besitzen 7 Außenelektronen und nehmen gern 1 auf."],
];

const FORMELN = [
  ["H₂O", { H: 2, O: 1 }],
  ["CO₂", { C: 1, O: 2 }],
  ["NH₃", { N: 1, H: 3 }],
  ["CH₄", { C: 1, H: 4 }],
  ["H₂SO₄", { H: 2, S: 1, O: 4 }],
  ["CaCO₃", { Ca: 1, C: 1, O: 3 }],
  ["C₆H₁₂O₆", { C: 6, H: 12, O: 6 }],
  ["NaOH", { Na: 1, O: 1, H: 1 }],
];
const ELEMENT_NAME = { H: "Wasserstoff", O: "Sauerstoff", C: "Kohlenstoff", N: "Stickstoff", S: "Schwefel", Ca: "Calcium", Na: "Natrium" };

function chemie2Generators(klasse) {
  const gens = [];

  gens.push((r) => {
    const [glg, a, d, e] = r.pick(GLEICHUNGEN);
    const q = glg.includes("?") ? glg : `Welcher Koeffizient fehlt: ${glg}?`;
    return mc(r, "Reaktionsgleichungen", `${r.pick(LEADS)}${q}`, a, r.shuffle(d), e);
  });

  gens.push((r) => {
    const [q, a, d, e] = r.pick(SBS_FAKTEN);
    return mc(r, "Säuren, Basen, Salze", `${r.pick(LEADS)}${q}`, a, r.shuffle(d), e);
  });

  gens.push((r) => {
    const [ion, ladung, e] = r.pick(IONEN);
    return mc(r, "Ionen", `${r.pick(LEADS)}Welche Ladung trägt das ${ion}?`,
      ladung, pickN(r, IONEN_LADUNGEN, ladung, 3), e);
  });

  gens.push((r) => {
    const [q, a, d, e] = r.pick(PSE_TRENDS);
    return mc(r, "Periodensystem", `${r.pick(LEADS)}${q}`, a, r.shuffle(d), e);
  });

  // Atome zählen (berechnet)
  gens.push((r) => {
    const [formel, atome] = r.pick(FORMELN);
    const el = r.pick(Object.keys(atome));
    const n = r.int(2, 9);
    const correct = n * atome[el];
    return mc(r, "Formeln", `${r.pick(LEADS)}Wie viele ${ELEMENT_NAME[el]}-Atome stecken in ${n} Molekülen bzw. Formeleinheiten ${formel}?`,
      String(correct), numDistractors(r, correct, Math.max(3, atome[el] + 2)).filter((d) => d > 0).slice(0, 3).map(String),
      `${formel} enthält ${atome[el]} ${el}-Atom(e); ${n} · ${atome[el]} = ${correct}.`);
  });

  return gens;
}

/* ══════════════════ 3) FRANZÖSISCH Klasse 7–10 ══════════════════ */

// Passé composé mit avoir: [Infinitiv, Participe]
const PC_AVOIR = [
  ["parler", "parlé"], ["regarder", "regardé"], ["manger", "mangé"], ["jouer", "joué"],
  ["travailler", "travaillé"], ["acheter", "acheté"], ["finir", "fini"], ["choisir", "choisi"],
  ["vendre", "vendu"], ["attendre", "attendu"], ["faire", "fait"], ["prendre", "pris"],
  ["voir", "vu"], ["dire", "dit"], ["écrire", "écrit"], ["lire", "lu"], ["mettre", "mis"],
  ["boire", "bu"], ["avoir", "eu"], ["être", "été"], ["pouvoir", "pu"], ["vouloir", "voulu"],
  ["savoir", "su"], ["ouvrir", "ouvert"], ["comprendre", "compris"], ["recevoir", "reçu"],
];
// Passé composé mit être: [Infinitiv, Participe (maskulin Sg.)]
const PC_ETRE = [
  ["aller", "allé"], ["venir", "venu"], ["arriver", "arrivé"], ["partir", "parti"],
  ["entrer", "entré"], ["sortir", "sorti"], ["monter", "monté"], ["descendre", "descendu"],
  ["rester", "resté"], ["tomber", "tombé"], ["naître", "né"], ["devenir", "devenu"],
  ["rentrer", "rentré"], ["retourner", "retourné"], ["revenir", "revenu"],
];
const FR_PERS = [
  ["je", "ai", "suis", ""], ["tu", "as", "es", ""], ["il", "a", "est", ""],
  ["elle", "a", "est", "e"], ["nous", "avons", "sommes", "s"], ["vous", "avez", "êtes", "s"],
  ["ils", "ont", "sont", "s"], ["elles", "ont", "sont", "es"],
];

const FR_PRONOMEN = [
  ["Je vois Marie. → Je ___ vois.", "la", ["le", "lui", "leur"], "Marie ist weibliches direktes Objekt → la."],
  ["Tu manges le gâteau. → Tu ___ manges.", "le", ["la", "lui", "y"], "le gâteau ist männliches direktes Objekt → le."],
  ["Il aime ses parents. → Il ___ aime.", "les", ["leur", "lui", "la"], "ses parents = Plural, direktes Objekt → les."],
  ["Nous téléphonons à Paul. → Nous ___ téléphonons.", "lui", ["le", "la", "les"], "téléphoner à + Person → indirektes Objekt lui."],
  ["Elle parle à ses amis. → Elle ___ parle.", "leur", ["les", "lui", "la"], "parler à + Plural → leur."],
  ["Je donne le livre à Anne. → Je ___ donne le livre.", "lui", ["la", "le", "leur"], "à Anne = indirektes Objekt Singular → lui."],
  ["Vous regardez la télé. → Vous ___ regardez.", "la", ["le", "lui", "leur"], "la télé = weibliches direktes Objekt → la."],
  ["Tu écris à ta grand-mère. → Tu ___ écris.", "lui", ["la", "le", "leur"], "écrire à + Person Singular → lui."],
  ["On invite les copains. → On ___ invite.", "les", ["leur", "lui", "la"], "les copains = direktes Objekt Plural → les."],
  ["Je prends la pomme. → Je ___ prends.", "la", ["le", "lui", "les"], "la pomme = weibliches direktes Objekt → la."],
  ["Il montre la photo à ses parents. → Il ___ montre la photo.", "leur", ["les", "lui", "la"], "à ses parents = indirektes Objekt Plural → leur."],
  ["Nous cherchons le chien. → Nous ___ cherchons.", "le", ["la", "lui", "leur"], "le chien = männliches direktes Objekt → le."],
  ["Elle achète les baguettes. → Elle ___ achète.", "les", ["la", "leur", "lui"], "les baguettes = direktes Objekt Plural → les."],
  ["Je réponds à mon professeur. → Je ___ réponds.", "lui", ["le", "leur", "la"], "répondre à + Person Singular → lui."],
];

// Vokabelpaare [französisch, deutsch] — Felder: Schule, Reisen, Essen, Alltag (>= 100 Paare)
const FR_VOKABELN = [
  // Schule
  ["l'école", "die Schule"], ["le professeur", "der Lehrer"], ["l'élève", "der Schüler / die Schülerin"],
  ["la salle de classe", "das Klassenzimmer"], ["le tableau", "die Tafel"], ["le cahier", "das Heft"],
  ["le livre", "das Buch"], ["le stylo", "der Kugelschreiber"], ["le crayon", "der Bleistift"],
  ["la gomme", "der Radiergummi"], ["la trousse", "das Mäppchen"], ["le cartable", "die Schultasche"],
  ["la récréation", "die Pause"], ["le devoir", "die Hausaufgabe"], ["la note", "die Note"],
  ["l'emploi du temps", "der Stundenplan"], ["la matière", "das Schulfach"], ["les mathématiques", "Mathematik"],
  ["l'histoire", "Geschichte"], ["le dessin", "das Zeichnen / Kunst"], ["la cour", "der Schulhof"],
  ["la cantine", "die Schulkantine"], ["l'examen", "die Prüfung"], ["apprendre", "lernen"],
  ["enseigner", "unterrichten"], ["la bibliothèque", "die Bibliothek"], ["le collège", "die Mittelschule (Kl. 6–9)"],
  ["le lycée", "das Gymnasium (Oberstufe)"],
  // Reisen
  ["le voyage", "die Reise"], ["la valise", "der Koffer"], ["le billet", "die Fahrkarte / das Ticket"],
  ["la gare", "der Bahnhof"], ["le train", "der Zug"], ["l'avion", "das Flugzeug"],
  ["l'aéroport", "der Flughafen"], ["la voiture", "das Auto"], ["le vélo", "das Fahrrad"],
  ["l'hôtel", "das Hotel"], ["la plage", "der Strand"], ["la mer", "das Meer"],
  ["la montagne", "der Berg / das Gebirge"], ["la carte", "die Landkarte"], ["l'étranger", "das Ausland"],
  ["les vacances", "die Ferien"], ["le passeport", "der Reisepass"], ["la frontière", "die Grenze"],
  ["le séjour", "der Aufenthalt"], ["visiter", "besichtigen"], ["partir", "abfahren / losfahren"],
  ["arriver", "ankommen"], ["réserver", "reservieren"], ["la piscine", "das Schwimmbad"],
  ["le camping", "der Campingplatz"], ["l'auberge de jeunesse", "die Jugendherberge"],
  ["le métro", "die U-Bahn"], ["le bateau", "das Schiff / Boot"],
  // Essen
  ["le pain", "das Brot"], ["la baguette", "das Baguette"], ["le fromage", "der Käse"],
  ["le lait", "die Milch"], ["le beurre", "die Butter"], ["l'œuf", "das Ei"],
  ["la viande", "das Fleisch"], ["le poisson", "der Fisch"], ["le poulet", "das Hähnchen"],
  ["la pomme", "der Apfel"], ["la poire", "die Birne"], ["la fraise", "die Erdbeere"],
  ["l'orange", "die Orange"], ["la banane", "die Banane"], ["les légumes", "das Gemüse"],
  ["la pomme de terre", "die Kartoffel"], ["la carotte", "die Karotte"], ["la tomate", "die Tomate"],
  ["la salade", "der Salat"], ["la soupe", "die Suppe"], ["le sucre", "der Zucker"],
  ["le sel", "das Salz"], ["l'eau", "das Wasser"], ["le jus d'orange", "der Orangensaft"],
  ["le petit déjeuner", "das Frühstück"], ["le déjeuner", "das Mittagessen"], ["le dîner", "das Abendessen"],
  ["le gâteau", "der Kuchen"], ["la glace", "das Eis"], ["boire", "trinken"], ["manger", "essen"],
  // Alltag
  ["la maison", "das Haus"], ["l'appartement", "die Wohnung"], ["la cuisine", "die Küche"],
  ["la chambre", "das (Schlaf-)Zimmer"], ["la salle de bains", "das Badezimmer"], ["le jardin", "der Garten"],
  ["la famille", "die Familie"], ["le frère", "der Bruder"], ["la sœur", "die Schwester"],
  ["les grands-parents", "die Großeltern"], ["l'ami", "der Freund"], ["le chien", "der Hund"],
  ["le chat", "die Katze"], ["le matin", "der Morgen"], ["le soir", "der Abend"],
  ["la nuit", "die Nacht"], ["la semaine", "die Woche"], ["aujourd'hui", "heute"],
  ["demain", "morgen"], ["hier", "gestern"], ["travailler", "arbeiten"], ["dormir", "schlafen"],
  ["se lever", "aufstehen"], ["s'habiller", "sich anziehen"], ["acheter", "kaufen"],
  ["le magasin", "das Geschäft / der Laden"], ["l'argent", "das Geld"], ["le temps libre", "die Freizeit"],
  ["écouter de la musique", "Musik hören"], ["faire du sport", "Sport treiben"],
];

function franzoesisch2Generators(klasse) {
  const gens = [];

  // Passé composé mit avoir
  gens.push((r) => {
    const [inf, part] = r.pick(PC_AVOIR);
    const [pron, aux, auxEtre] = r.pick(FR_PERS);
    const correct = `${pron} ${aux} ${part}`;
    const dist = [`${pron} ${auxEtre} ${part}`, `${pron} ${aux} ${inf}`, `${pron} ${inf}`];
    return mc(r, "Passé composé", `${r.pick(LEADS)}Setze ins Passé composé: ${pron} (${inf}) → ?`,
      correct, dist, `„${inf}“ bildet das Passé composé mit avoir: ${correct}.`);
  });

  // Passé composé mit être (mit Angleichung)
  gens.push((r) => {
    const [inf, part] = r.pick(PC_ETRE);
    const [pron, aux, auxEtre, endung] = r.pick(FR_PERS);
    const partAcc = part + endung;
    const correct = `${pron} ${auxEtre} ${partAcc}`;
    const dist = [`${pron} ${aux} ${part}`, `${pron} ${auxEtre} ${inf}`, `${pron} ${aux} ${partAcc}`];
    return mc(r, "Passé composé", `${r.pick(LEADS)}Setze ins Passé composé (Bewegungsverb!): ${pron} (${inf}) → ?`,
      correct, dist, `„${inf}“ bildet das Passé composé mit être, das Participe wird angeglichen: ${correct}.`);
  });

  // avoir oder être?
  gens.push((r) => {
    const avoirV = r.pick(PC_AVOIR)[0];
    const etreV = r.pick(PC_ETRE)[0];
    const [verb, hilfs] = r.pick([[avoirV, "avoir"], [etreV, "être"]]);
    return mc(r, "Passé composé", `${r.pick(LEADS)}Mit welchem Hilfsverb bildet „${verb}“ das Passé composé?`,
      hilfs, [hilfs === "avoir" ? "être" : "avoir", "aller", "faire"],
      `„${verb}“ bildet das Passé composé mit ${hilfs}.`);
  });

  // Objektpronomen
  gens.push((r) => {
    const [q, a, d, e] = r.pick(FR_PRONOMEN);
    return mc(r, "Objektpronomen", `${r.pick(LEADS)}Ersetze das Objekt durch ein Pronomen: ${q}`, a, r.shuffle(d), e);
  });

  // Vokabeln FR → DE
  gens.push((r) => {
    const [fr, de] = r.pick(FR_VOKABELN);
    return mc(r, "Vokabeln", `${r.pick(LEADS)}Was bedeutet „${fr}“ auf Deutsch?`,
      de, pickN(r, FR_VOKABELN.map((v) => v[1]), de, 3), `${fr} = ${de}.`);
  });

  // Vokabeln DE → FR
  gens.push((r) => {
    const [fr, de] = r.pick(FR_VOKABELN);
    return mc(r, "Vokabeln", `${r.pick(LEADS)}Wie heißt „${de}“ auf Französisch?`,
      fr, pickN(r, FR_VOKABELN.map((v) => v[0]), fr, 3), `${de} = ${fr}.`);
  });

  return gens;
}

/* ══════════════════ 4) LATEIN Klasse 7–10 ══════════════════ */

const LA_KONJUNKTIV = [
  ["laudare: 3. Person Singular Konjunktiv Präsens Aktiv", "laudet", ["laudat", "laudabat", "laudavit"], "a-Konjugation: Konjunktiv Präsens mit -e- → laudet."],
  ["laudare: 3. Person Plural Konjunktiv Präsens Aktiv", "laudent", ["laudant", "laudabant", "laudaverunt"], "Konjunktiv Präsens der a-Konjugation: laudent."],
  ["monere: 3. Person Singular Konjunktiv Präsens Aktiv", "moneat", ["monet", "monebat", "monuit"], "e-Konjugation: Konjunktiv Präsens mit -a- → moneat."],
  ["audire: 3. Person Singular Konjunktiv Präsens Aktiv", "audiat", ["audit", "audiebat", "audivit"], "i-Konjugation: Konjunktiv Präsens mit -a- → audiat."],
  ["ducere: 3. Person Singular Konjunktiv Präsens Aktiv", "ducat", ["ducit", "ducebat", "duxit"], "Konsonantische Konjugation: Konjunktiv Präsens mit -a- → ducat."],
  ["esse: 3. Person Singular Konjunktiv Präsens", "sit", ["est", "erat", "fuit"], "Konjunktiv Präsens von esse: sim, sis, sit …"],
  ["esse: 3. Person Plural Konjunktiv Präsens", "sint", ["sunt", "erant", "fuerunt"], "Konjunktiv Präsens von esse: sint (3. Pl.)."],
  ["posse: 3. Person Singular Konjunktiv Präsens", "possit", ["potest", "poterat", "potuit"], "Konjunktiv Präsens von posse: possit."],
  ["laudare: 3. Person Singular Konjunktiv Imperfekt Aktiv", "laudaret", ["laudet", "laudabat", "laudavisset"], "Konjunktiv Imperfekt: Infinitiv + Personalendung → laudaret."],
  ["esse: 3. Person Singular Konjunktiv Imperfekt", "esset", ["sit", "erat", "fuisset"], "Konjunktiv Imperfekt von esse: esset."],
  ["venire: 3. Person Singular Konjunktiv Imperfekt Aktiv", "veniret", ["veniat", "veniebat", "venit"], "Konjunktiv Imperfekt: venire + t → veniret."],
  ["vocare: 1. Person Singular Konjunktiv Präsens Aktiv", "vocem", ["voco", "vocabam", "vocavi"], "a-Konjugation: Konjunktiv Präsens 1. Sg. → vocem."],
  ["habere: 3. Person Plural Konjunktiv Präsens Aktiv", "habeant", ["habent", "habebant", "habuerunt"], "e-Konjugation: Konjunktiv Präsens → habeant."],
  ["ire: 3. Person Singular Konjunktiv Präsens", "eat", ["it", "ibat", "iit"], "Konjunktiv Präsens von ire: eat."],
];

const LA_ACI = [
  ["Scio te venire.", "Ich weiß, dass du kommst.", ["Ich weiß, dass ich komme.", "Du weißt, dass ich komme.", "Ich wusste, dass du kamst."], "AcI: te (Akk.) + venire (Inf.) → dass-Satz: dass du kommst."],
  ["Puto Marcum dormire.", "Ich glaube, dass Marcus schläft.", ["Ich glaube, dass Marcus schlief.", "Marcus glaubt, dass ich schlafe.", "Ich glaube dem schlafenden Marcus."], "AcI: Marcum (Akk.) + dormire (Inf.)."],
  ["Video puellam ridere.", "Ich sehe, dass das Mädchen lacht.", ["Ich sehe das lachende Mädchen nicht.", "Das Mädchen sieht, dass ich lache.", "Ich sah, dass die Mädchen lachten."], "AcI nach video: puellam + ridere."],
  ["Audio patrem clamare.", "Ich höre, dass der Vater ruft.", ["Der Vater hört mich rufen.", "Ich höre den Vater nicht.", "Ich hörte, dass die Väter riefen."], "AcI nach audio: patrem + clamare."],
  ["Constat Romanos fortes esse.", "Es steht fest, dass die Römer tapfer sind.", ["Die Römer stehen tapfer fest.", "Es stand fest, dass der Römer tapfer war.", "Die Tapferen sind Römer."], "AcI nach constat: Romanos + esse."],
  ["Magister dicit discipulos discere.", "Der Lehrer sagt, dass die Schüler lernen.", ["Die Schüler sagen, dass der Lehrer lernt.", "Der Lehrer lehrt die Schüler.", "Der Lehrer sagte, dass der Schüler lernte."], "AcI nach dicit: discipulos + discere."],
  ["Credo amicum adesse.", "Ich glaube, dass der Freund da ist.", ["Der Freund glaubt, dass ich da bin.", "Ich glaube dem anwesenden Freund.", "Ich glaubte, dass die Freunde da waren."], "AcI nach credo: amicum + adesse."],
  ["Spero vos valere.", "Ich hoffe, dass es euch gut geht.", ["Ihr hofft, dass es mir gut geht.", "Ich hoffe auf euer Geld.", "Ich hoffte, dass es dir gut ging."], "AcI nach spero: vos + valere."],
  ["Scimus Romam magnam urbem esse.", "Wir wissen, dass Rom eine große Stadt ist.", ["Rom weiß, dass wir groß sind.", "Wir wussten, dass Rom klein war.", "Die große Stadt kennt Rom."], "AcI nach scimus: Romam + esse."],
  ["Gaudeo te adesse.", "Ich freue mich, dass du da bist.", ["Du freust dich, dass ich da bin.", "Ich freute mich über deine Abwesenheit.", "Wir freuen uns, dass ihr da seid."], "AcI nach gaudeo: te + adesse."],
];

const LA_STEIGERUNG = [
  ["longus (lang)", "longior", "longissimus"],
  ["altus (hoch)", "altior", "altissimus"],
  ["fortis (tapfer)", "fortior", "fortissimus"],
  ["brevis (kurz)", "brevior", "brevissimus"],
  ["pulcher (schön)", "pulchrior", "pulcherrimus"],
  ["celer (schnell)", "celerior", "celerrimus"],
  ["felix (glücklich)", "felicior", "felicissimus"],
  ["facilis (leicht)", "facilior", "facillimus"],
  ["bonus (gut)", "melior", "optimus"],
  ["malus (schlecht)", "peior", "pessimus"],
  ["magnus (groß)", "maior", "maximus"],
  ["parvus (klein)", "minor", "minimus"],
  ["multus (viel)", "plus", "plurimus"],
];
const LA_STEIG_POOL = ["longior", "altior", "fortior", "brevior", "melior", "peior", "maior", "minor", "longissimus", "altissimus", "fortissimus", "optimus", "pessimus", "maximus", "minimus", "facillimus", "celerrimus", "pulcherrimus"];

const LA_VOKABELN = [
  ["puella", "das Mädchen"], ["puer", "der Junge"], ["vir", "der Mann"], ["femina", "die Frau"],
  ["pater", "der Vater"], ["mater", "die Mutter"], ["filius", "der Sohn"], ["filia", "die Tochter"],
  ["amicus", "der Freund"], ["dominus", "der Herr"], ["servus", "der Sklave"], ["rex", "der König"],
  ["populus", "das Volk"], ["urbs", "die Stadt"], ["via", "die Straße / der Weg"], ["forum", "der Marktplatz"],
  ["templum", "der Tempel"], ["villa", "das Landhaus"], ["porta", "das Tor"], ["aqua", "das Wasser"],
  ["terra", "die Erde / das Land"], ["caelum", "der Himmel"], ["mare", "das Meer"], ["insula", "die Insel / das Mietshaus"],
  ["bellum", "der Krieg"], ["pax", "der Frieden"], ["miles", "der Soldat"], ["hostis", "der Feind"],
  ["gladius", "das Schwert"], ["victoria", "der Sieg"], ["periculum", "die Gefahr"], ["auxilium", "die Hilfe"],
  ["deus", "der Gott"], ["dea", "die Göttin"], ["vita", "das Leben"], ["mors", "der Tod"],
  ["corpus", "der Körper"], ["animus", "der Geist / Mut"], ["verbum", "das Wort"], ["nomen", "der Name"],
  ["liber", "das Buch"], ["epistula", "der Brief"], ["lingua", "die Sprache / Zunge"], ["schola", "die Schule"],
  ["magister", "der Lehrer"], ["discipulus", "der Schüler"], ["sapientia", "die Weisheit"], ["tempus", "die Zeit"],
  ["annus", "das Jahr"], ["dies", "der Tag"], ["nox", "die Nacht"], ["hora", "die Stunde"],
  ["amare", "lieben"], ["laudare", "loben"], ["vocare", "rufen / nennen"], ["portare", "tragen"],
  ["dare", "geben"], ["stare", "stehen"], ["habere", "haben"], ["videre", "sehen"],
  ["monere", "ermahnen / erinnern"], ["tenere", "halten"], ["timere", "fürchten"], ["dicere", "sagen"],
  ["ducere", "führen"], ["scribere", "schreiben"], ["legere", "lesen / sammeln"], ["mittere", "schicken"],
  ["petere", "erstreben / angreifen"], ["venire", "kommen"], ["audire", "hören"], ["dormire", "schlafen"],
  ["currere", "laufen"], ["cedere", "gehen / weichen"], ["esse", "sein"], ["posse", "können"],
  ["ire", "gehen"], ["ferre", "tragen / bringen"], ["velle", "wollen"], ["magnus", "groß"],
  ["parvus", "klein"], ["bonus", "gut"], ["malus", "schlecht"], ["novus", "neu"],
  ["multi", "viele"], ["omnis", "jeder / ganz"], ["semper", "immer"], ["saepe", "oft"],
];

function toRoman(n) {
  const map = [[1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"], [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
  let res = "";
  for (const [v, s] of map) { while (n >= v) { res += s; n -= v; } }
  return res;
}

function latein2Generators(klasse) {
  const gens = [];

  gens.push((r) => {
    const [aufgabe, a, d, e] = r.pick(LA_KONJUNKTIV);
    return mc(r, "Konjunktiv", `${r.pick(LEADS)}Bilde die Form: ${aufgabe}`, a, r.shuffle(d), e);
  });

  gens.push((r) => {
    const [satz, a, d, e] = r.pick(LA_ACI);
    return mc(r, "AcI", `${r.pick(LEADS)}Übersetze den AcI-Satz: „${satz}“`, a, r.shuffle(d), e);
  });

  // Steigerung: Komparativ
  gens.push((r) => {
    const [adj, komp, sup] = r.pick(LA_STEIGERUNG);
    return mc(r, "Steigerung", `${r.pick(LEADS)}Wie lautet der Komparativ von „${adj}“?`,
      komp, pickN(r, [...LA_STEIG_POOL, sup], komp, 3), `Komparativ von ${adj}: ${komp}; Superlativ: ${sup}.`);
  });

  // Steigerung: Superlativ
  gens.push((r) => {
    const [adj, komp, sup] = r.pick(LA_STEIGERUNG);
    return mc(r, "Steigerung", `${r.pick(LEADS)}Wie lautet der Superlativ von „${adj}“?`,
      sup, pickN(r, [...LA_STEIG_POOL, komp], sup, 3), `Superlativ von ${adj}: ${sup}; Komparativ: ${komp}.`);
  });

  // Vokabeln LA → DE
  gens.push((r) => {
    const [la, de] = r.pick(LA_VOKABELN);
    return mc(r, "Vokabeln", `${r.pick(LEADS)}Was bedeutet „${la}“ auf Deutsch?`,
      de, pickN(r, LA_VOKABELN.map((v) => v[1]), de, 3), `${la} = ${de}.`);
  });

  // Vokabeln DE → LA
  gens.push((r) => {
    const [la, de] = r.pick(LA_VOKABELN);
    return mc(r, "Vokabeln", `${r.pick(LEADS)}Wie heißt „${de}“ auf Latein?`,
      la, pickN(r, LA_VOKABELN.map((v) => v[0]), la, 3), `${de} = ${la}.`);
  });

  // Römische Zahlen: dezimal → römisch (berechnet)
  gens.push((r) => {
    const n = r.int(4, 1999);
    const correct = toRoman(n);
    const dist = [toRoman(n + 1), toRoman(Math.max(1, n - 1)), toRoman(n + 10)];
    return mc(r, "Römische Zahlen", `${r.pick(LEADS)}Schreibe ${n} als römische Zahl.`,
      correct, dist, `${n} = ${correct}.`);
  });

  // Römische Zahlen: römisch → dezimal (berechnet)
  gens.push((r) => {
    const n = r.int(4, 1999);
    const roman = toRoman(n);
    return mc(r, "Römische Zahlen", `${r.pick(LEADS)}Welche Zahl ist ${roman}?`,
      String(n), numDistractors(r, n, Math.max(4, Math.round(n / 10))).filter((d) => d > 0).slice(0, 3).map(String),
      `${roman} = ${n}.`);
  });

  return gens;
}

/* ══════════════════ 5) SPANISCH Klasse 9–10 ══════════════════ */

// Indefinido-Formen: [Infinitiv, [yo, tú, él/ella, nosotros, vosotros, ellos/ellas]]
const ES_INDEFINIDO = [
  ["hablar", ["hablé", "hablaste", "habló", "hablamos", "hablasteis", "hablaron"]],
  ["comprar", ["compré", "compraste", "compró", "compramos", "comprasteis", "compraron"]],
  ["trabajar", ["trabajé", "trabajaste", "trabajó", "trabajamos", "trabajasteis", "trabajaron"]],
  ["comer", ["comí", "comiste", "comió", "comimos", "comisteis", "comieron"]],
  ["beber", ["bebí", "bebiste", "bebió", "bebimos", "bebisteis", "bebieron"]],
  ["vivir", ["viví", "viviste", "vivió", "vivimos", "vivisteis", "vivieron"]],
  ["escribir", ["escribí", "escribiste", "escribió", "escribimos", "escribisteis", "escribieron"]],
  ["ser/ir", ["fui", "fuiste", "fue", "fuimos", "fuisteis", "fueron"]],
  ["estar", ["estuve", "estuviste", "estuvo", "estuvimos", "estuvisteis", "estuvieron"]],
  ["tener", ["tuve", "tuviste", "tuvo", "tuvimos", "tuvisteis", "tuvieron"]],
  ["hacer", ["hice", "hiciste", "hizo", "hicimos", "hicisteis", "hicieron"]],
  ["poder", ["pude", "pudiste", "pudo", "pudimos", "pudisteis", "pudieron"]],
  ["poner", ["puse", "pusiste", "puso", "pusimos", "pusisteis", "pusieron"]],
  ["decir", ["dije", "dijiste", "dijo", "dijimos", "dijisteis", "dijeron"]],
  ["venir", ["vine", "viniste", "vino", "vinimos", "vinisteis", "vinieron"]],
  ["querer", ["quise", "quisiste", "quiso", "quisimos", "quisisteis", "quisieron"]],
  ["dar", ["di", "diste", "dio", "dimos", "disteis", "dieron"]],
  ["ver", ["vi", "viste", "vio", "vimos", "visteis", "vieron"]],
];
const ES_PERS = ["yo", "tú", "él/ella", "nosotros", "vosotros", "ellos/ellas"];

const ES_GUSTAR = [
  ["A mí ___ gusta el fútbol.", "me", ["te", "le", "nos"], "a mí → me gusta."],
  ["A ti ___ gusta la música.", "te", ["me", "le", "os"], "a ti → te gusta."],
  ["A él ___ gusta leer.", "le", ["me", "te", "les"], "a él → le gusta."],
  ["A nosotros ___ gusta el cine.", "nos", ["os", "les", "me"], "a nosotros → nos gusta."],
  ["A vosotros ___ gusta bailar.", "os", ["nos", "les", "te"], "a vosotros → os gusta."],
  ["A ellos ___ gusta viajar.", "les", ["le", "nos", "me"], "a ellos → les gusta."],
  ["Me ___ los libros.", "gustan", ["gusta", "gustas", "gustamos"], "Plural (los libros) → gustan."],
  ["Me ___ la pizza.", "gusta", ["gustan", "gusto", "gustas"], "Singular (la pizza) → gusta."],
  ["¿Te ___ los animales?", "gustan", ["gusta", "gustáis", "gustas"], "Plural (los animales) → gustan."],
  ["Nos ___ el deporte.", "gusta", ["gustan", "gustamos", "gustáis"], "Singular (el deporte) → gusta."],
  ["A María le ___ las películas.", "gustan", ["gusta", "gustan ella", "gustas"], "Plural (las películas) → gustan."],
  ["A mis padres ___ gusta viajar.", "les", ["le", "nos", "os"], "a mis padres (Plural) → les."],
];

const ES_VOKABELN = [
  // Schule
  ["el colegio", "die Schule"], ["el profesor", "der Lehrer"], ["el alumno", "der Schüler"],
  ["la clase", "die Klasse / der Unterricht"], ["el cuaderno", "das Heft"], ["el libro", "das Buch"],
  ["el bolígrafo", "der Kugelschreiber"], ["el lápiz", "der Bleistift"], ["la mochila", "der Rucksack / die Schultasche"],
  ["los deberes", "die Hausaufgaben"], ["la nota", "die Note"], ["el examen", "die Prüfung"],
  ["el recreo", "die Pause"], ["la asignatura", "das Schulfach"], ["aprender", "lernen"],
  ["enseñar", "unterrichten"], ["la pizarra", "die Tafel"], ["el horario", "der Stundenplan"],
  // Reisen
  ["el viaje", "die Reise"], ["la maleta", "der Koffer"], ["el billete", "die Fahrkarte / das Ticket"],
  ["la estación", "der Bahnhof"], ["el tren", "der Zug"], ["el avión", "das Flugzeug"],
  ["el aeropuerto", "der Flughafen"], ["el coche", "das Auto"], ["la bicicleta", "das Fahrrad"],
  ["el hotel", "das Hotel"], ["la playa", "der Strand"], ["el mar", "das Meer"],
  ["la montaña", "der Berg"], ["el mapa", "die Landkarte"], ["las vacaciones", "die Ferien"],
  ["el pasaporte", "der Reisepass"], ["la frontera", "die Grenze"], ["visitar", "besichtigen"],
  ["viajar", "reisen"], ["llegar", "ankommen"], ["salir", "abfahren / hinausgehen"],
  ["reservar", "reservieren"], ["la piscina", "das Schwimmbad"], ["el barco", "das Schiff"],
  // Essen
  ["el pan", "das Brot"], ["el queso", "der Käse"], ["la leche", "die Milch"],
  ["la mantequilla", "die Butter"], ["el huevo", "das Ei"], ["la carne", "das Fleisch"],
  ["el pescado", "der Fisch"], ["el pollo", "das Hähnchen"], ["la manzana", "der Apfel"],
  ["la naranja", "die Orange"], ["la fresa", "die Erdbeere"], ["el plátano", "die Banane"],
  ["las verduras", "das Gemüse"], ["la patata", "die Kartoffel"], ["el tomate", "die Tomate"],
  ["la ensalada", "der Salat"], ["la sopa", "die Suppe"], ["el azúcar", "der Zucker"],
  ["la sal", "das Salz"], ["el agua", "das Wasser"], ["el zumo", "der Saft"],
  ["el desayuno", "das Frühstück"], ["el almuerzo", "das Mittagessen"], ["la cena", "das Abendessen"],
  ["el helado", "das Eis"], ["beber", "trinken"], ["comer", "essen"], ["la tarta", "die Torte / der Kuchen"],
  // Alltag
  ["la casa", "das Haus"], ["el piso", "die Wohnung"], ["la cocina", "die Küche"],
  ["el dormitorio", "das Schlafzimmer"], ["el cuarto de baño", "das Badezimmer"], ["el jardín", "der Garten"],
  ["la familia", "die Familie"], ["el hermano", "der Bruder"], ["la hermana", "die Schwester"],
  ["los abuelos", "die Großeltern"], ["el amigo", "der Freund"], ["el perro", "der Hund"],
  ["el gato", "die Katze"], ["la mañana", "der Morgen / Vormittag"], ["la tarde", "der Nachmittag / Abend"],
  ["la noche", "die Nacht"], ["la semana", "die Woche"], ["hoy", "heute"],
  ["mañana (adverbio)", "morgen"], ["ayer", "gestern"], ["trabajar", "arbeiten"],
  ["dormir", "schlafen"], ["levantarse", "aufstehen"], ["comprar", "kaufen"],
  ["la tienda", "das Geschäft / der Laden"], ["el dinero", "das Geld"], ["el tiempo libre", "die Freizeit"],
  ["escuchar música", "Musik hören"], ["hacer deporte", "Sport treiben"], ["la ciudad", "die Stadt"],
];

function spanisch2Generators(klasse) {
  const gens = [];

  // Indefinido: Form bilden
  gens.push((r) => {
    const [inf, formen] = r.pick(ES_INDEFINIDO);
    const idx = r.int(0, 5);
    const correct = formen[idx];
    const dist = pickN(r, formen.filter((f) => f !== correct), correct, 3);
    return mc(r, "Indefinido", `${r.pick(LEADS)}Bilde das pretérito indefinido: ${ES_PERS[idx]} (${inf}) → ?`,
      correct, dist, `${inf} im Indefinido, ${ES_PERS[idx]}: ${correct}.`);
  });

  // Indefinido: Form erkennen (Person bestimmen)
  gens.push((r) => {
    const [inf, formen] = r.pick(ES_INDEFINIDO);
    const idx = r.int(0, 5);
    const form = formen[idx];
    if (new Set(formen).size !== 6) return null;
    return mc(r, "Indefinido", `${r.pick(LEADS)}Zu welcher Person gehört die Indefinido-Form „${form}“ (${inf})?`,
      ES_PERS[idx], pickN(r, ES_PERS, ES_PERS[idx], 3), `${form} ist die Form für ${ES_PERS[idx]}.`);
  });

  // gustar
  gens.push((r) => {
    const [q, a, d, e] = r.pick(ES_GUSTAR);
    return mc(r, "gustar", `${r.pick(LEADS)}Ergänze: ${q}`, a, r.shuffle(d), e);
  });

  // Vokabeln ES → DE
  gens.push((r) => {
    const [es, de] = r.pick(ES_VOKABELN);
    return mc(r, "Vokabeln", `${r.pick(LEADS)}Was bedeutet „${es}“ auf Deutsch?`,
      de, pickN(r, ES_VOKABELN.map((v) => v[1]), de, 3), `${es} = ${de}.`);
  });

  // Vokabeln DE → ES
  gens.push((r) => {
    const [es, de] = r.pick(ES_VOKABELN);
    return mc(r, "Vokabeln", `${r.pick(LEADS)}Wie heißt „${de}“ auf Spanisch?`,
      es, pickN(r, ES_VOKABELN.map((v) => v[0]), es, 3), `${de} = ${es}.`);
  });

  return gens;
}

/* ══════════════════ 6) INFORMATIK Klasse 8–10 ══════════════════ */

const SCRATCH_ALGO = [
  ["Was ist ein Algorithmus?", "eine eindeutige Schritt-für-Schritt-Anleitung zur Lösung eines Problems", ["ein Computerprogramm in Maschinensprache", "eine Programmiersprache", "ein Speichermedium"], "Ein Algorithmus ist eine endliche, eindeutige Handlungsvorschrift."],
  ["Was bewirkt in Scratch der Block „wiederhole 10 mal“?", "der eingeschlossene Code wird 10-mal ausgeführt", ["der Code wird einmal ausgeführt", "das Programm stoppt nach 10 Sekunden", "es werden 10 Figuren erzeugt"], "„wiederhole n mal“ ist eine Zählschleife."],
  ["Was bewirkt in Scratch der Block „wiederhole fortlaufend“?", "eine Endlosschleife: der Code läuft immer weiter", ["der Code läuft genau zweimal", "der Code läuft nie", "das Programm wird gelöscht"], "„wiederhole fortlaufend“ ist eine Endlosschleife."],
  ["Wofür steht in Scratch der Block „falls …, dann …“?", "für eine Verzweigung (Bedingung)", ["für eine Schleife", "für eine Variable", "für einen Kommentar"], "„falls … dann“ führt Code nur bei erfüllter Bedingung aus."],
  ["Was ist eine Variable in einem Programm?", "ein benannter Speicherplatz für einen Wert", ["eine feste Zahl, die sich nie ändert", "ein Programmfehler", "ein Ausgabegerät"], "Variablen speichern Werte, die sich ändern können."],
  ["Wie nennt man einen Fehler im Programmcode?", "Bug", ["Feature", "Loop", "Pixel"], "Programmfehler heißen Bugs; die Fehlersuche heißt Debugging."],
  ["Wie nennt man die Suche und Behebung von Programmfehlern?", "Debugging", ["Streaming", "Rendering", "Booten"], "Debugging = Fehler finden und beheben."],
  ["Welche drei Grundstrukturen reichen für jeden Algorithmus aus?", "Sequenz, Verzweigung, Schleife", ["Eingabe, Bildschirm, Maus", "Start, Pause, Ende", "Addition, Subtraktion, Division"], "Jeder Algorithmus lässt sich aus Sequenz, Auswahl und Wiederholung aufbauen."],
  ["Was beschreibt ein Struktogramm (Nassi-Shneiderman-Diagramm)?", "den Ablauf eines Algorithmus grafisch", ["den Aufbau eines Computers", "die Pixel eines Bildes", "das Dateisystem"], "Struktogramme stellen Algorithmen grafisch dar."],
  ["Was macht der Vergleichsoperator == in Python?", "er prüft, ob zwei Werte gleich sind", ["er weist einen Wert zu", "er addiert zwei Zahlen", "er löscht eine Variable"], "== vergleicht; ein einzelnes = weist zu."],
  ["Was macht der Operator % (Modulo) in Python, z. B. 7 % 3?", "er liefert den Rest der Division: 7 % 3 = 1", ["er liefert 7 Prozent von 3", "er rundet auf", "er potenziert"], "Modulo liefert den Divisionsrest: 7 % 3 = 1."],
  ["In welcher Reihenfolge arbeitet ein Programm Anweisungen ohne Schleifen/Verzweigungen ab?", "von oben nach unten (sequenziell)", ["zufällig", "von unten nach oben", "alle gleichzeitig"], "Ohne Kontrollstrukturen läuft Code sequenziell ab."],
];

const DATENSCHUTZ = [
  ["Was sind personenbezogene Daten?", "alle Informationen, die sich auf eine identifizierbare Person beziehen", ["nur Passwörter", "nur Fotos", "alle Daten im Internet"], "Personenbezogene Daten: Name, Adresse, Geburtsdatum, IP-Adresse usw."],
  ["Welches Gesetz regelt in der EU den Umgang mit personenbezogenen Daten?", "die Datenschutz-Grundverordnung (DSGVO)", ["das Urheberrechtsgesetz", "das Straßenverkehrsgesetz", "das Jugendschutzgesetz allein"], "Die DSGVO gilt seit 2018 in der ganzen EU."],
  ["Was macht ein sicheres Passwort aus?", "es ist lang und kombiniert Buchstaben, Zahlen und Sonderzeichen", ["es ist der eigene Name", "es ist kurz und leicht zu merken wie 1234", "es steht auf einem Zettel am Monitor"], "Länge + Zeichenvielfalt machen Passwörter stark."],
  ["Warum sollte man nicht dasselbe Passwort überall verwenden?", "wird es einmal gestohlen, sind sonst alle Konten betroffen", ["weil es sonst zu leicht zu merken ist", "weil Passwörter sich abnutzen", "das ist kein Problem"], "Ein Leak würde sonst alle Konten gefährden."],
  ["Was ist Phishing?", "der Versuch, über gefälschte Nachrichten/Webseiten an Zugangsdaten zu gelangen", ["ein Computerspiel", "eine Verschlüsselungstechnik", "das Sichern von Daten"], "Phishing-Mails imitieren z. B. Banken, um Passwörter zu stehlen."],
  ["Woran erkennt man eine verschlüsselte Verbindung im Browser?", "an https:// und dem Schloss-Symbol", ["an bunter Werbung", "an einer langen Ladezeit", "am Wort 'sicher' im Text"], "https und Schloss-Symbol zeigen Transportverschlüsselung an."],
  ["Was ist Zwei-Faktor-Authentifizierung (2FA)?", "eine Anmeldung mit zwei unabhängigen Nachweisen (z. B. Passwort + Code)", ["zwei Passwörter hintereinander", "zwei Benutzerkonten", "doppelt so langes Passwort"], "2FA kombiniert Wissen (Passwort) mit Besitz (z. B. Handy-Code)."],
  ["Was sollte man tun, bevor man ein Foto von Freunden postet?", "die abgebildeten Personen um Erlaubnis fragen", ["nichts, Fotos sind immer erlaubt", "das Foto nur zuschneiden", "es genügt, den Ort zu löschen"], "Das Recht am eigenen Bild verlangt eine Einwilligung."],
  ["Was ist ein Cookie im Browser?", "eine kleine Datei, die Webseiten auf dem Gerät speichern", ["ein Computervirus", "ein Werbebanner", "eine E-Mail"], "Cookies speichern z. B. Logins oder Tracking-IDs."],
  ["Was bedeutet 'Datensparsamkeit'?", "nur so viele Daten angeben, wie unbedingt nötig", ["möglichst viele Daten teilen", "Daten doppelt speichern", "Daten nie löschen"], "Datensparsamkeit: so wenig persönliche Daten wie möglich preisgeben."],
  ["Warum sind regelmäßige Software-Updates wichtig für die Sicherheit?", "sie schließen bekannte Sicherheitslücken", ["sie machen den Bildschirm heller", "sie löschen alte Dateien", "sie sind nur Werbung"], "Updates beheben Schwachstellen, bevor Angreifer sie ausnutzen."],
  ["Was ist ein Backup?", "eine Sicherungskopie wichtiger Daten", ["ein Virenscanner", "ein zweiter Monitor", "eine Suchmaschine"], "Backups schützen vor Datenverlust (Defekt, Ransomware)."],
  ["Wer darf laut DSGVO Auskunft über die zu ihm gespeicherten Daten verlangen?", "jede betroffene Person selbst", ["nur die Polizei", "niemand", "nur Firmen"], "Die DSGVO gewährt ein Auskunftsrecht (Art. 15)."],
  ["Was sollte man tun, wenn man in einer E-Mail einen unbekannten Anhang erhält?", "nicht öffnen und den Absender prüfen", ["sofort öffnen", "an alle Freunde weiterleiten", "den Anhang doppelt anklicken"], "Unbekannte Anhänge können Schadsoftware enthalten."],
];

function informatik3Generators(klasse) {
  const gens = [];

  // for-Schleife: Summe über range
  gens.push((r) => {
    const a = r.int(1, 5);
    const b = a + r.int(3, 6);
    let sum = 0;
    for (let i = a; i < b; i++) sum += i;
    return mc(r, "Python-Schleifen", `${r.pick(LEADS)}Was gibt dieses Python-Programm aus?\ns = 0\nfor i in range(${a}, ${b}):\n    s = s + i\nprint(s)`,
      String(sum), numDistractors(r, sum, Math.max(3, Math.round(sum / 3))).map(String),
      `range(${a}, ${b}) liefert ${a} bis ${b - 1}; Summe = ${sum}.`);
  });

  // for-Schleife: Ausgabefolge
  gens.push((r) => {
    const n = r.int(3, 6);
    const seq = [];
    for (let i = 0; i < n; i++) seq.push(i);
    const step = r.pick([1, 2]);
    const seq2 = [];
    for (let i = 0; i < n * step; i += step) seq2.push(i);
    return mc(r, "Python-Schleifen", `${r.pick(LEADS)}Welche Zahlen gibt „for i in range(0, ${n * step}, ${step}): print(i)“ aus?`,
      seq2.join(", "), [seq2.map((x) => x + 1).join(", "), [...seq2, n * step].join(", "), seq2.slice(1).join(", ")],
      `range(0, ${n * step}, ${step}) zählt von 0 in ${step}er-Schritten bis unter ${n * step}.`);
  });

  // while-Schleife: Durchläufe zählen
  gens.push((r) => {
    const start = r.int(1, 4);
    const limit = start + r.int(3, 8);
    let i = start, count = 0;
    while (i < limit) { i++; count++; }
    return mc(r, "Python-Schleifen", `${r.pick(LEADS)}Wie oft wird der Schleifenkörper ausgeführt?\ni = ${start}\nwhile i < ${limit}:\n    i = i + 1`,
      String(count), numDistractors(r, count, 3).filter((d) => d > 0).slice(0, 3).map(String),
      `Von ${start} bis ${limit - 1} wird erhöht → ${count} Durchläufe.`);
  });

  // while: Verdopplung
  gens.push((r) => {
    const limit = r.pick([20, 50, 100, 200]);
    let x = r.pick([1, 2, 3]);
    const startX = x;
    while (x < limit) x *= 2;
    return mc(r, "Python-Schleifen", `${r.pick(LEADS)}Welchen Wert hat x am Ende?\nx = ${startX}\nwhile x < ${limit}:\n    x = x * 2\nprint(x)`,
      String(x), [String(x / 2), String(x * 2), String(limit)],
      `x verdoppelt sich (${startX} → …), bis x ≥ ${limit}: Ergebnis ${x}.`);
  });

  // Listen: len / Zugriff / append
  gens.push((r) => {
    const werte = Array.from({ length: r.int(4, 6) }, () => r.int(1, 30));
    const idx = r.int(0, werte.length - 1);
    return mc(r, "Listen", `${r.pick(LEADS)}Gegeben: liste = [${werte.join(", ")}]. Was liefert liste[${idx}]?`,
      String(werte[idx]), pickN(r, werte.map(String).concat([String(idx)]), String(werte[idx]), 3),
      `Der Index beginnt bei 0 → liste[${idx}] = ${werte[idx]}.`);
  });

  gens.push((r) => {
    const werte = Array.from({ length: r.int(3, 7) }, () => r.int(1, 40));
    const neu = r.int(1, 40);
    return mc(r, "Listen", `${r.pick(LEADS)}liste = [${werte.join(", ")}]; liste.append(${neu}) — Was liefert len(liste) danach?`,
      String(werte.length + 1), numDistractors(r, werte.length + 1, 2).filter((d) => d > 0).slice(0, 3).map(String),
      `append fügt 1 Element an: ${werte.length} + 1 = ${werte.length + 1}.`);
  });

  gens.push((r) => {
    const werte = Array.from({ length: r.int(4, 6) }, () => r.int(1, 25));
    const sum = werte.reduce((x, y) => x + y, 0);
    return mc(r, "Listen", `${r.pick(LEADS)}Was gibt print(sum([${werte.join(", ")}])) aus?`,
      String(sum), numDistractors(r, sum, 8).map(String), `Die Summe der Listenelemente ist ${sum}.`);
  });

  gens.push((r) => {
    const werte = Array.from({ length: r.int(4, 7) }, () => r.int(1, 50));
    const fn = r.pick(["max", "min"]);
    const correct = fn === "max" ? Math.max(...werte) : Math.min(...werte);
    return mc(r, "Listen", `${r.pick(LEADS)}Was gibt print(${fn}([${werte.join(", ")}])) aus?`,
      String(correct), pickN(r, werte.map(String), String(correct), 3),
      `${fn} liefert das ${fn === "max" ? "größte" : "kleinste"} Element: ${correct}.`);
  });

  // Hex → Dezimal
  gens.push((r) => {
    const n = r.int(10, 255);
    const hex = n.toString(16).toUpperCase();
    return mc(r, "Zahlensysteme", `${r.pick(LEADS)}Wandle die Hexadezimalzahl ${hex} in das Dezimalsystem um.`,
      String(n), numDistractors(r, n, 20).filter((d) => d > 0).slice(0, 3).map(String),
      `${hex}₁₆ = ${Math.floor(n / 16)}·16 + ${n % 16} = ${n}.`);
  });

  // Dezimal → Hex
  gens.push((r) => {
    const n = r.int(10, 255);
    const hex = n.toString(16).toUpperCase();
    const dist = [(n + 1).toString(16).toUpperCase(), (n - 1).toString(16).toUpperCase(), (n + 16).toString(16).toUpperCase()];
    return mc(r, "Zahlensysteme", `${r.pick(LEADS)}Wandle die Dezimalzahl ${n} in das Hexadezimalsystem um.`,
      hex, dist, `${n} = ${Math.floor(n / 16)}·16 + ${n % 16} = ${hex}₁₆.`);
  });

  // Scratch/Algorithmus
  gens.push((r) => {
    const [q, a, d, e] = r.pick(SCRATCH_ALGO);
    return mc(r, "Algorithmen", `${r.pick(LEADS)}${q}`, a, r.shuffle(d), e);
  });

  // Datenschutz
  gens.push((r) => {
    const [q, a, d, e] = r.pick(DATENSCHUTZ);
    return mc(r, "Datenschutz", `${r.pick(LEADS)}${q}`, a, r.shuffle(d), e);
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

  console.log("Physik-Ergänzung (Klasse 7–10, je >= 400):");
  for (let k = 7; k <= 10; k++)
    total += writeBank("physik2", k, generateBank(81000 + k, 400, physik2Generators(k)), 400);

  console.log("Chemie-Ergänzung (Klasse 8–10, je >= 350):");
  for (let k = 8; k <= 10; k++)
    total += writeBank("chemie2", k, generateBank(82000 + k, 350, chemie2Generators(k)), 350);

  console.log("Französisch-Ergänzung (Klasse 7–10, je >= 350):");
  for (let k = 7; k <= 10; k++)
    total += writeBank("franzoesisch2", k, generateBank(83000 + k, 350, franzoesisch2Generators(k)), 350);

  console.log("Latein-Ergänzung (Klasse 7–10, je >= 300):");
  for (let k = 7; k <= 10; k++)
    total += writeBank("latein2", k, generateBank(84000 + k, 300, latein2Generators(k)), 300);

  console.log("Spanisch-Ergänzung (Klasse 9–10, je >= 300):");
  for (let k = 9; k <= 10; k++)
    total += writeBank("spanisch2", k, generateBank(85000 + k, 300, spanisch2Generators(k)), 300);

  console.log("Informatik-Ergänzung (Klasse 8–10, je >= 350):");
  for (let k = 8; k <= 10; k++)
    total += writeBank("informatik3", k, generateBank(86000 + k, 350, informatik3Generators(k)), 350);

  console.log(`\nGesamt (Runde 8): ${total} Fragen.`);
}

main();
