/* Copyright 2026 Elian Schock, Jonas Schwenk */
/**
 * MEGA-Fragen-Generator RUNDE 16 für MasterMind.
 *
 * Ergänzt die Fragenbank im GLEICHEN Format
 *   scripts/questions/mega/data/<fach>-klasse<k>.json
 * mit [{ topic, question, options[4], correct(Index), explanation }].
 *
 * NUR NEUE Dateien mit Präfix  deutsch6-  und  biologie3- :
 *   1) deutsch6   Klasse 5–13, >= 500/Klasse
 *      Kl. 5–7  Satzglieder bestimmen (Subjekt/Prädikat/Objekte an eingebauten
 *               Beispielsätzen), Aktiv → Passiv umformen
 *      Kl. 8–10 Konjunktiv I/II Formen, Argumenttypen
 *      Kl. 11–13 rhetorische Analyse-Begriffe, Sprachwandel/Varietäten,
 *               Kommunikationsmodell Schulz von Thun (4 Seiten einer Nachricht)
 *   2) biologie3 Klasse 7–13, >= 450/Klasse
 *      Kl. 7–8  Ökosystem Wald/Gewässer (Nahrungsketten-Reihenfolgen),
 *               Fotosynthese-Gleichung mit Lücken
 *      Kl. 9–10 Genetik-Vertiefung (DNA-Basenpaarung/Komplementärstrang
 *               berechnet, Chargaff-Regeln, Mitose/Meiose-Phasen), Hormone
 *      Kl. 11–13 Enzyme, Ökologie (Lotka-Volterra-Regeln zuordnen),
 *               Neurobiologie-Vertiefung
 *
 * Deterministisch (mulberry32-Seed). Keine Abhängigkeiten, reines Node.
 *
 * Aufruf (vom Repo-Root):
 *   node scripts/questions/mega/generate16.mjs
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

/** Baut eine MC-Frage mit genau 4 verschiedenen Optionen (oder null). */
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

function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

function generateBank(seed, count, generators) {
  const rng = makeRng(seed);
  const out = [];
  const texts = new Set();
  let attempts = 0;
  const maxAttempts = count * 800;
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
const DE_LEADS = [...LEADS, "Deutsch-Quiz: ", "Grammatik-Check: ", "Sprachwissen: ", "Frage aus dem Deutschunterricht: "];
const BIO_LEADS = [...LEADS, "Biologie-Quiz: ", "Wissenscheck Biologie: ", "Frage aus dem Bio-Unterricht: ", "Weißt du es? "];

/** Wählt aus einem Fakten-Array [frage, antwort, distraktoren[], erkl] eine MC mit Lead. */
function factGen(topic, facts, leads) {
  return (r) => {
    const [q, a, d, e] = r.pick(facts);
    return mc(r, topic, `${r.pick(leads)}${q}`, a, r.shuffle(d), e);
  };
}

/* ══════════════════════════════════════════════════════════════════ */
/* ══════════════════  D E U T S C H   6  ════════════════════════════ */
/* ══════════════════════════════════════════════════════════════════ */

/* ---- Bausteine für Satzglieder & Aktiv/Passiv (Kl. 5–7) ---- */
// [Nominativ-Subjekt, Passiv-Agens]
const SUBJ = [
  ["der Hund", "vom Hund"], ["die Katze", "von der Katze"], ["das Kind", "vom Kind"],
  ["mein Bruder", "von meinem Bruder"], ["die Lehrerin", "von der Lehrerin"],
  ["der Bäcker", "vom Bäcker"], ["meine Freundin", "von meiner Freundin"],
  ["der Junge", "vom Jungen"], ["die Nachbarin", "von der Nachbarin"],
  ["der Gärtner", "vom Gärtner"], ["die Schülerin", "von der Schülerin"],
  ["der Vater", "vom Vater"], ["die Mutter", "von der Mutter"], ["das Mädchen", "vom Mädchen"],
];
// [3.-Pers.-Sg.-Aktiv, Partizip II]
const VERB = [
  ["jagt", "gejagt"], ["füttert", "gefüttert"], ["sucht", "gesucht"], ["ruft", "gerufen"],
  ["malt", "gemalt"], ["trägt", "getragen"], ["liest", "gelesen"], ["kauft", "gekauft"],
  ["putzt", "geputzt"], ["fängt", "gefangen"], ["lobt", "gelobt"], ["holt", "geholt"],
  ["repariert", "repariert"], ["backt", "gebacken"], ["begrüßt", "begrüßt"],
];
// [Nominativ-Objekt, Akkusativ-Objekt]
const OBJ = [
  ["der Ball", "den Ball"], ["die Maus", "die Maus"], ["das Buch", "das Buch"],
  ["der Brief", "den Brief"], ["die Blume", "die Blume"], ["der Apfel", "den Apfel"],
  ["das Auto", "das Auto"], ["die Zeitung", "die Zeitung"], ["der Kuchen", "den Kuchen"],
  ["die Tasche", "die Tasche"], ["der Gast", "den Gast"], ["das Fenster", "das Fenster"],
];

function satzgliederGenerators() {
  const gens = [];
  // Subjekt bestimmen
  gens.push((r) => {
    const s = r.pick(SUBJ), v = r.pick(VERB), o = r.pick(OBJ);
    const satz = `${cap(s[0])} ${v[0]} ${o[1]}.`;
    return mc(r, "Satzglieder", `${r.pick(DE_LEADS)}Welches Satzglied ist das Subjekt in: „${satz}“?`,
      s[0], r.shuffle([o[1], v[0], `${v[0]} ${o[1]}`]),
      `Das Subjekt „${s[0]}“ steht im Nominativ und ist der Satzgegenstand (Wer/Was tut etwas?).`);
  });
  // Prädikat bestimmen
  gens.push((r) => {
    const s = r.pick(SUBJ), v = r.pick(VERB), o = r.pick(OBJ);
    const satz = `${cap(s[0])} ${v[0]} ${o[1]}.`;
    return mc(r, "Satzglieder", `${r.pick(DE_LEADS)}Welches Satzglied ist das Prädikat in: „${satz}“?`,
      v[0], r.shuffle([s[0], o[1], `${s[0]} ${v[0]}`]),
      `Das Prädikat „${v[0]}“ ist die Satzaussage – das gebeugte Verb.`);
  });
  // Akkusativobjekt bestimmen
  gens.push((r) => {
    const s = r.pick(SUBJ), v = r.pick(VERB), o = r.pick(OBJ);
    const satz = `${cap(s[0])} ${v[0]} ${o[1]}.`;
    return mc(r, "Satzglieder", `${r.pick(DE_LEADS)}Welches Satzglied ist das Akkusativobjekt in: „${satz}“?`,
      o[1], r.shuffle([s[0], v[0], `${v[0]} ${o[1]}`]),
      `Das Akkusativobjekt „${o[1]}“ erfragt man mit „Wen oder was?“.`);
  });
  // Aktiv -> Passiv umformen
  gens.push((r) => {
    const s = r.pick(SUBJ), v = r.pick(VERB), o = r.pick(OBJ);
    const aktiv = `${cap(s[0])} ${v[0]} ${o[1]}.`;
    const passiv = `${cap(o[0])} wird ${s[1]} ${v[1]}.`;
    const d1 = `${cap(o[0])} ist ${s[1]} ${v[1]}.`;
    const d2 = `${cap(s[0])} wird ${o[1]} ${v[1]}.`;
    const d3 = `${cap(o[0])} wird ${s[1]} ${v[0]}.`;
    return mc(r, "Aktiv/Passiv", `${r.pick(DE_LEADS)}Wie lautet der Passivsatz zu „${aktiv}“?`,
      passiv, r.shuffle([d1, d2, d3]),
      `Im Passiv wird das Akkusativobjekt zum Subjekt: „${passiv}“ (werden + Partizip II, Täter mit „von“).`);
  });
  // Satzglied per Frageprobe
  gens.push((r) => {
    const probe = r.pick([
      ["Wer oder was?", "das Subjekt"],
      ["Wen oder was?", "das Akkusativobjekt"],
      ["Wem?", "das Dativobjekt"],
      ["Was tut das Subjekt?", "das Prädikat"],
      ["Wo, wann oder wie?", "die adverbiale Bestimmung"],
    ]);
    return mc(r, "Satzglieder", `${r.pick(DE_LEADS)}Welches Satzglied erfragt man mit „${probe[0]}“?`,
      probe[1], r.shuffle(["das Subjekt", "das Akkusativobjekt", "das Dativobjekt", "das Prädikat", "die adverbiale Bestimmung"].filter((x) => x !== probe[1])),
      `Mit der Frageprobe „${probe[0]}“ findet man ${probe[1]}.`);
  });
  return gens;
}

/* ---- Konjunktiv I/II & Argumenttypen (Kl. 8–10) ---- */
// [Infinitiv, Konj. I (er), Konj. II (er)]
const KVERB = [
  ["gehen", "gehe", "ginge"], ["haben", "habe", "hätte"], ["sein", "sei", "wäre"],
  ["kommen", "komme", "käme"], ["werden", "werde", "würde"], ["können", "könne", "könnte"],
  ["müssen", "müsse", "müsste"], ["wissen", "wisse", "wüsste"], ["geben", "gebe", "gäbe"],
  ["sehen", "sehe", "sähe"], ["fahren", "fahre", "führe"], ["nehmen", "nehme", "nähme"],
  ["tun", "tue", "täte"], ["dürfen", "dürfe", "dürfte"], ["sollen", "solle", "sollte"],
  ["lassen", "lasse", "ließe"], ["finden", "finde", "fände"], ["bleiben", "bleibe", "bliebe"],
  ["bringen", "bringe", "brächte"], ["laufen", "laufe", "liefe"], ["sprechen", "spreche", "spräche"],
  ["helfen", "helfe", "hälfe"], ["treffen", "treffe", "träfe"], ["schlafen", "schlafe", "schliefe"],
];

const ARGUMENTTYPEN = [
  ["„Studien der Universität belegen, dass Schlafmangel die Konzentration senkt.“ – Welcher Argumenttyp?", "Faktenargument", ["normatives Argument", "Autoritätsargument", "Analogieargument"], "Ein Faktenargument stützt sich auf nachprüfbare, belegbare Tatsachen (z. B. Studien, Statistiken)."],
  ["„Jeder Mensch hat ein Recht auf Bildung – deshalb muss Schule kostenlos sein.“ – Welcher Argumenttyp?", "normatives Argument", ["Faktenargument", "Plausibilitätsargument", "indirektes Argument"], "Ein normatives Argument beruft sich auf Werte und Normen (Rechte, Moral, Prinzipien)."],
  ["„Schon Einstein sagte, Fantasie sei wichtiger als Wissen.“ – Welcher Argumenttyp?", "Autoritätsargument", ["Faktenargument", "normatives Argument", "Analogieargument"], "Ein Autoritätsargument verweist auf eine anerkannte Person oder Institution als Beleg."],
  ["„Eine Schule ohne Regeln ist wie ein Straßenverkehr ohne Ampeln.“ – Welcher Argumenttyp?", "Analogieargument", ["Faktenargument", "Autoritätsargument", "normatives Argument"], "Ein Analogieargument überträgt einen bekannten Sachverhalt auf einen ähnlichen (Vergleich)."],
  ["„Wer selbst kocht, ernährt sich meist gesünder – das leuchtet doch ein.“ – Welcher Argumenttyp?", "Plausibilitätsargument", ["Faktenargument", "Autoritätsargument", "normatives Argument"], "Ein Plausibilitätsargument stützt sich auf allgemeine, einleuchtende Erfahrung ohne exakten Beleg."],
  ["„Wenn man die Gegenposition zu Ende denkt, führt sie ins Chaos.“ – Welcher Argumenttyp?", "indirektes Argument", ["Faktenargument", "normatives Argument", "Autoritätsargument"], "Ein indirektes Argument entkräftet die Gegenseite, statt die eigene These direkt zu stützen."],
  ["Welcher Argumenttyp stützt sich auf überprüfbare Zahlen und Belege?", "Faktenargument", ["normatives Argument", "Autoritätsargument", "Plausibilitätsargument"], "Fakten- oder Tatsachenargumente arbeiten mit belegbaren Daten."],
  ["Welcher Argumenttyp beruft sich auf Werte, Moral oder Prinzipien?", "normatives Argument", ["Faktenargument", "Autoritätsargument", "Analogieargument"], "Normative Argumente stützen sich auf gesellschaftliche Werte und Normen."],
  ["Welcher Argumenttyp nennt einen Experten oder eine Institution als Beleg?", "Autoritätsargument", ["Faktenargument", "normatives Argument", "indirektes Argument"], "Das Autoritätsargument beruft sich auf eine anerkannte Autorität."],
];

function konjunktivGenerators() {
  const gens = [];
  gens.push((r) => {
    const v = r.pick(KVERB);
    const others = r.shuffle(KVERB.filter((x) => x[0] !== v[0]));
    return mc(r, "Konjunktiv I", `${r.pick(DE_LEADS)}Wie lautet der Konjunktiv I (3. Person Singular) von „${v[0]}“?`,
      `er ${v[1]}`, [`er ${v[2]}`, `er ${others[0][1]}`, `er ${others[1][1]}`],
      `Der Konjunktiv I von „${v[0]}“ ist „er ${v[1]}“ – er wird v. a. für die indirekte Rede genutzt.`);
  });
  gens.push((r) => {
    const v = r.pick(KVERB);
    const others = r.shuffle(KVERB.filter((x) => x[0] !== v[0]));
    return mc(r, "Konjunktiv II", `${r.pick(DE_LEADS)}Wie lautet der Konjunktiv II (3. Person Singular) von „${v[0]}“?`,
      `er ${v[2]}`, [`er ${v[1]}`, `er ${others[0][2]}`, `er ${others[1][2]}`],
      `Der Konjunktiv II von „${v[0]}“ ist „er ${v[2]}“ – er drückt Irreales, Wünsche und Höflichkeit aus.`);
  });
  // indirekte Rede: direkte -> Konj. I
  gens.push((r) => {
    const v = r.pick(KVERB.filter((x) => !["sein", "haben", "werden"].includes(x[0]) || true));
    const satz = `Er behauptet: „Ich ${v[0] === "sein" ? "bin" : v[0]}…“`;
    return mc(r, "Indirekte Rede", `${r.pick(DE_LEADS)}Setze in die indirekte Rede: „Sie sagt, dass er … (${v[0]}).“ Welche Konjunktiv-I-Form ist richtig?`,
      `er ${v[1]}`, [`er ${v[2]}`, `er ${v[0] === "sein" ? "ist" : v[0]}`, `er würde ${v[0]}`],
      `In der indirekten Rede steht der Konjunktiv I: „…, dass er ${v[1]}.“`);
  });
  gens.push((r) => {
    return mc(r, "Konjunktiv", `${r.pick(DE_LEADS)}Wofür verwendet man vor allem den Konjunktiv I?`,
      "für die indirekte Rede", ["für irreale Bedingungen", "für Befehle", "für die Vergangenheit"],
      "Der Konjunktiv I kennzeichnet die indirekte Rede (Redewiedergabe ohne Stellungnahme).");
  });
  gens.push((r) => {
    return mc(r, "Konjunktiv", `${r.pick(DE_LEADS)}Welche Aussage passt zum Konjunktiv II?`,
      "Er drückt Irreales, Wünsche und Höflichkeit aus.", ["Er kennzeichnet die indirekte Rede.", "Er bildet den Imperativ.", "Er steht nur in der Vergangenheit."],
      "Der Konjunktiv II drückt Nicht-Wirkliches aus: „Wenn ich Zeit hätte, käme ich.“");
  });
  return gens;
}

/* ---- Rhetorik, Sprachwandel, Schulz von Thun (Kl. 11–13) ---- */
const RHETORIK_DEF = [
  ["Wie nennt man die bildhafte Übertragung ohne Vergleichswort, z. B. „ein Meer aus Tränen“?", "Metapher", ["Vergleich", "Metonymie", "Allegorie"], "Die Metapher überträgt bildhaft, ohne „wie“ (Vergleichswort)."],
  ["Wie heißt die Wiederholung eines Wortes am Anfang aufeinanderfolgender Sätze/Verse?", "Anapher", ["Epipher", "Alliteration", "Klimax"], "Die Anapher wiederholt Wörter am Satz-/Versanfang (z. B. „Ich klage… Ich fordere…“)."],
  ["Wie heißt der gleiche Anlaut mehrerer benachbarter Wörter, z. B. „Milch macht müde Männer munter“?", "Alliteration", ["Anapher", "Assonanz", "Onomatopöie"], "Die Alliteration verwendet den gleichen Anfangslaut bei benachbarten Wörtern."],
  ["Wie nennt man eine bewusste, starke Übertreibung, z. B. „tausend Dank“?", "Hyperbel", ["Litotes", "Euphemismus", "Ironie"], "Die Hyperbel übertreibt stark, um Wirkung zu erzeugen."],
  ["Wie heißt die beschönigende Umschreibung, z. B. „einschlafen“ für „sterben“?", "Euphemismus", ["Hyperbel", "Ironie", "Metonymie"], "Der Euphemismus beschönigt oder verharmlost einen Sachverhalt."],
  ["Wie nennt man die Abschwächung durch doppelte Verneinung, z. B. „nicht schlecht“?", "Litotes", ["Hyperbel", "Euphemismus", "Antithese"], "Die Litotes untertreibt, oft durch Verneinung des Gegenteils."],
  ["Wie heißt die Gegenüberstellung entgegengesetzter Begriffe, z. B. „arm und reich“?", "Antithese", ["Oxymoron", "Parallelismus", "Chiasmus"], "Die Antithese stellt Gegensätze gegenüber."],
  ["Wie nennt man die Verbindung sich widersprechender Begriffe, z. B. „bittersüß“?", "Oxymoron", ["Antithese", "Paradoxon", "Pleonasmus"], "Das Oxymoron verbindet zwei einander widersprechende Wörter."],
  ["Wie heißt die stufenweise Steigerung, z. B. „Ich kam, sah, siegte“?", "Klimax", ["Antiklimax", "Anapher", "Ellipse"], "Die Klimax steigert dreigliedrig zum stärksten Ausdruck hin."],
  ["Wie nennt man die Vermenschlichung von Dingen, z. B. „Die Sonne lacht“?", "Personifikation", ["Metapher", "Symbol", "Allegorie"], "Die Personifikation verleiht Unbelebtem menschliche Eigenschaften."],
  ["Wie heißt eine Frage, auf die keine Antwort erwartet wird?", "rhetorische Frage", ["Ellipse", "Apostrophe", "Parenthese"], "Die rhetorische Frage erwartet keine Antwort, sondern verstärkt eine Aussage."],
  ["Wie nennt man die spiegelbildliche Überkreuzstellung, z. B. „Die Kunst ist lang, und kurz ist unser Leben“?", "Chiasmus", ["Parallelismus", "Antithese", "Anapher"], "Der Chiasmus kreuzt die Satzglieder spiegelbildlich (a-b-b-a)."],
  ["Wie heißt der gleiche Satzbau in aufeinanderfolgenden Sätzen, z. B. „Der Mühe folgt der Lohn, dem Fleiß folgt der Erfolg“?", "Parallelismus", ["Chiasmus", "Anapher", "Ellipse"], "Der Parallelismus wiederholt den gleichen syntaktischen Aufbau."],
  ["Wie nennt man das Ersetzen eines Begriffs durch einen sachlich verwandten, z. B. „Berlin entscheidet“ für die Regierung?", "Metonymie", ["Metapher", "Synekdoche", "Symbol"], "Die Metonymie ersetzt einen Begriff durch einen real zusammenhängenden (Ort statt Institution)."],
  ["Wie heißt das Auslassen von Satzteilen, z. B. „Je früher, desto besser“?", "Ellipse", ["Parenthese", "Anakoluth", "Asyndeton"], "Die Ellipse lässt Satzglieder aus, die sich aus dem Zusammenhang ergänzen lassen."],
  ["Wie nennt man die Reihung ohne Bindewörter, z. B. „Er kam, sah, siegte“?", "Asyndeton", ["Polysyndeton", "Ellipse", "Klimax"], "Das Asyndeton reiht ohne Konjunktionen (unverbunden)."],
  ["Wie heißt die auffällige Häufung von Bindewörtern, z. B. „und… und… und…“?", "Polysyndeton", ["Asyndeton", "Anapher", "Parallelismus"], "Das Polysyndeton verbindet Glieder betont mit Konjunktionen."],
  ["Wie nennt man die überflüssige Doppelung, z. B. „weißer Schimmel“?", "Pleonasmus", ["Tautologie", "Oxymoron", "Hyperbel"], "Der Pleonasmus fügt eine überflüssige, schon enthaltene Bestimmung hinzu."],
];

function rhetorikBeispielGenerators() {
  const gens = [];
  // Metapher vs. Vergleich aus Bausteinen
  const TRAEGER = ["Er", "Sie", "Der Kämpfer", "Die Sängerin", "Mein Nachbar", "Das Kind"];
  const TIER = [["Löwe", "mutig"], ["Fuchs", "schlau"], ["Bär", "stark"], ["Adler", "scharfsichtig"], ["Wolf", "wild"]];
  gens.push((r) => {
    const t = r.pick(TRAEGER), tier = r.pick(TIER);
    const satz = `${t} ist ein ${tier[0]} im Kampf.`;
    return mc(r, "Rhetorik", `${r.pick(DE_LEADS)}Welches Stilmittel liegt vor: „${satz}“?`,
      "Metapher", ["Vergleich", "Personifikation", "Hyperbel"],
      "Es ist eine Metapher: bildhafte Gleichsetzung ohne Vergleichswort „wie“.");
  });
  gens.push((r) => {
    const t = r.pick(TRAEGER), tier = r.pick(TIER);
    const satz = `${t} ist ${tier[1]} wie ein ${tier[0]}.`;
    return mc(r, "Rhetorik", `${r.pick(DE_LEADS)}Welches Stilmittel liegt vor: „${satz}“?`,
      "Vergleich", ["Metapher", "Alliteration", "Ironie"],
      "Es ist ein Vergleich – erkennbar am Vergleichswort „wie“.");
  });
  // Anapher aus Bausteinen
  const ANA = ["Wir", "Nie", "Immer", "Heute", "Kein Mensch"];
  gens.push((r) => {
    const w = r.pick(ANA);
    const satz = `${w} kämpfen, ${w} hoffen, ${w} siegen.`;
    return mc(r, "Rhetorik", `${r.pick(DE_LEADS)}Welches Stilmittel liegt vor: „${satz}“?`,
      "Anapher", ["Epipher", "Chiasmus", "Ellipse"],
      `Die Wiederholung von „${w}“ am Satzanfang ist eine Anapher.`);
  });
  // rhetorische Frage
  const RFRAGE = ["Wer will das schon?", "Ist das nicht offensichtlich?", "Wer könnte das bestreiten?", "Muss ich wirklich alles zweimal sagen?"];
  gens.push((r) => {
    const f = r.pick(RFRAGE);
    return mc(r, "Rhetorik", `${r.pick(DE_LEADS)}Welches Stilmittel liegt vor: „${f}“?`,
      "rhetorische Frage", ["echte Frage", "Ausruf", "Apostrophe"],
      "Auf diese Frage wird keine Antwort erwartet – sie verstärkt nur die Aussage: rhetorische Frage.");
  });
  return gens;
}

const SPRACHWANDEL = [
  ["Wie nennt man eine regional gebundene Sprachvariante wie Bairisch oder Sächsisch?", "Dialekt", ["Soziolekt", "Idiolekt", "Standardsprache"], "Der Dialekt (Mundart) ist regional gebunden."],
  ["Wie nennt man die gruppenspezifische Sprache, z. B. Jugendsprache oder Fachjargon?", "Soziolekt", ["Dialekt", "Idiolekt", "Standardsprache"], "Der Soziolekt ist an eine soziale Gruppe gebunden."],
  ["Wie heißt die individuelle Sprechweise eines einzelnen Menschen?", "Idiolekt", ["Soziolekt", "Dialekt", "Standardsprache"], "Der Idiolekt ist der persönliche Sprachgebrauch eines Individuums."],
  ["Wie nennt man die überregionale, normierte Hochsprache?", "Standardsprache", ["Dialekt", "Soziolekt", "Umgangssprache"], "Die Standard-/Hochsprache ist überregional normiert (z. B. im Duden geregelt)."],
  ["„Handy“ heißt im Englischen gar nicht Mobiltelefon – wie nennt man solch ein deutsches Pseudo-Englisch?", "Scheinanglizismus", ["Lehnwort", "Neologismus", "Archaismus"], "Ein Scheinanglizismus wirkt englisch, existiert so im Englischen aber nicht („Handy“)."],
  ["Wie nennt man ein neu in die Sprache aufgenommenes Wort wie „googeln“?", "Neologismus", ["Archaismus", "Lehnwort", "Idiolekt"], "Ein Neologismus ist eine sprachliche Neubildung."],
  ["Wie heißt ein veraltetes, kaum noch gebräuchliches Wort wie „Oheim“?", "Archaismus", ["Neologismus", "Anglizismus", "Dialektwort"], "Ein Archaismus ist ein veralteter Ausdruck."],
  ["„Downloaden“ ist ins Deutsche übernommen und angepasst – was ist das?", "Anglizismus/Lehnwort", ["Archaismus", "Neologismus aus dem Latein", "Dialektwort"], "Aus dem Englischen entlehnte, angepasste Wörter sind Anglizismen (Lehnwörter)."],
  ["Früher meinte „geil“ nur „lüstern“, heute „toll“ – wie heißt dieser Vorgang?", "Bedeutungswandel", ["Lautwandel", "Wortneuschöpfung", "Entlehnung"], "Verändert sich die Bedeutung eines Wortes, spricht man von Bedeutungswandel."],
  ["Aus „Frau“ (früher: adlige Herrin) wurde die Bezeichnung für jede erwachsene weibliche Person – welcher Wandel?", "Bedeutungserweiterung", ["Bedeutungsverengung", "Bedeutungsverschlechterung", "Lautwandel"], "Bei der Bedeutungserweiterung wird der Anwendungsbereich eines Wortes größer."],
  ["Aus „Hochzeit“ (früher: jedes hohe Fest) wurde nur noch die Vermählung – welcher Wandel?", "Bedeutungsverengung", ["Bedeutungserweiterung", "Bedeutungsverbesserung", "Entlehnung"], "Bei der Bedeutungsverengung wird der Anwendungsbereich kleiner/spezieller."],
  ["Wie nennt man die lockere, alltägliche Sprache zwischen Standard und Dialekt?", "Umgangssprache", ["Standardsprache", "Fachsprache", "Idiolekt"], "Die Umgangssprache ist die alltagssprachliche Ebene."],
  ["Welche Kraft treibt Sprachwandel u. a. an?", "Sprachökonomie (Vereinfachung/Verkürzung)", ["Verbot durch den Staat", "der Duden allein", "Zufall ohne jede Ursache"], "Sprachökonomie (Streben nach Vereinfachung) ist eine zentrale Ursache des Sprachwandels."],
];

// Schulz von Thun – 4 Seiten einer Nachricht.
// [Aussage/Situation, {sach, selbst, bezieh, appell}]
const SVT = [
  ["Beifahrer zum Fahrer: „Die Ampel ist grün.“", {
    sach: "Die Ampel zeigt gerade Grün.",
    selbst: "Ich bin in Eile / mir ist das aufgefallen.",
    bezieh: "Du brauchst meine Hilfe beim Fahren.",
    appell: "Fahr los!",
  }],
  ["Partner beim Essen: „Da ist etwas Grünes in der Soße.“", {
    sach: "In der Soße befindet sich ein grüner Bestandteil.",
    selbst: "Ich weiß nicht, was das ist / mag es evtl. nicht.",
    bezieh: "Du solltest wissen, was du kochst.",
    appell: "Sag mir, was das ist! / Lass das künftig weg.",
  }],
  ["Chef: „Der Bericht ist noch nicht fertig.“", {
    sach: "Der Bericht ist zum jetzigen Zeitpunkt unvollständig.",
    selbst: "Ich bin unzufrieden / unter Druck.",
    bezieh: "Du arbeitest zu langsam.",
    appell: "Mach ihn schnell fertig!",
  }],
  ["Freundin: „Es ist schon spät.“", {
    sach: "Die Uhrzeit ist fortgeschritten.",
    selbst: "Ich bin müde.",
    bezieh: "Ich vertraue darauf, dass du das verstehst.",
    appell: "Lass uns gehen / zum Ende kommen.",
  }],
  ["Lehrer: „Deine Schrift kann ich kaum lesen.“", {
    sach: "Die Handschrift ist schwer entzifferbar.",
    selbst: "Ich strenge mich beim Lesen an.",
    bezieh: "Du gibst dir zu wenig Mühe.",
    appell: "Schreib ordentlicher!",
  }],
  ["Mitbewohner: „Der Müll ist voll.“", {
    sach: "Der Mülleimer ist gefüllt.",
    selbst: "Mich stört das.",
    bezieh: "Du übernimmst zu wenig Verantwortung.",
    appell: "Bring den Müll raus!",
  }],
];
const SVT_LABEL = {
  sach: "Sachebene (Sachinhalt)",
  selbst: "Selbstoffenbarung",
  bezieh: "Beziehungsebene",
  appell: "Appell",
};

function schulzVonThunGenerators() {
  const gens = [];
  gens.push((r) => {
    const [aussage, m] = r.pick(SVT);
    const side = r.pick(["sach", "selbst", "bezieh", "appell"]);
    const wrong = Object.keys(SVT_LABEL).filter((k) => k !== side).map((k) => SVT_LABEL[k]);
    return mc(r, "Schulz von Thun", `${r.pick(DE_LEADS)}${aussage} Welcher Seite der Nachricht entspricht die Deutung „${m[side]}“?`,
      SVT_LABEL[side], r.shuffle(wrong),
      `Nach dem Vier-Seiten-Modell ist das die ${SVT_LABEL[side]}.`);
  });
  // Definitionsfragen
  const DEF = [
    ["Welche Seite einer Nachricht enthält die reine Sachinformation?", "Sachebene (Sachinhalt)"],
    ["Welche Seite verrät etwas über den Sender selbst (Gefühle, Werte)?", "Selbstoffenbarung"],
    ["Welche Seite zeigt, wie der Sender zum Empfänger steht?", "Beziehungsebene"],
    ["Welche Seite will den Empfänger zu etwas veranlassen?", "Appell"],
  ];
  gens.push((r) => {
    const [q, a] = r.pick(DEF);
    const wrong = Object.values(SVT_LABEL).filter((x) => x !== a);
    return mc(r, "Schulz von Thun", `${r.pick(DE_LEADS)}${q}`,
      a, r.shuffle(wrong),
      `Das Kommunikationsquadrat (Schulz von Thun) unterscheidet vier Seiten; hier: ${a}.`);
  });
  gens.push((r) => mc(r, "Schulz von Thun",
    `${r.pick(DE_LEADS)}Wie viele Seiten hat eine Nachricht nach dem Modell von Schulz von Thun?`,
    "vier", ["zwei", "drei", "fünf"],
    "Das Kommunikationsquadrat („Vier-Ohren-Modell“) unterscheidet vier Seiten jeder Nachricht."));
  return gens;
}

function deutsch6Generators(k) {
  if (k <= 7) {
    return satzgliederGenerators();
  }
  if (k <= 10) {
    return [
      ...konjunktivGenerators(),
      factGen("Argumenttypen", ARGUMENTTYPEN, DE_LEADS),
    ];
  }
  return [
    factGen("Rhetorik", RHETORIK_DEF, DE_LEADS),
    ...rhetorikBeispielGenerators(),
    factGen("Sprachwandel", SPRACHWANDEL, DE_LEADS),
    ...schulzVonThunGenerators(),
  ];
}

/* ══════════════════════════════════════════════════════════════════ */
/* ══════════════════  B I O L O G I E   3  ══════════════════════════ */
/* ══════════════════════════════════════════════════════════════════ */

/* ---- Ökosystem & Nahrungsketten (Kl. 7–8) ---- */
// Gültige Nahrungsketten (Produzent -> ... -> Endkonsument)
const NAHRUNGSKETTEN = [
  { chain: ["Gras", "Heuschrecke", "Frosch", "Storch"], typ: "Wiese" },
  { chain: ["Eichenblatt", "Raupe", "Meise", "Sperber"], typ: "Wald" },
  { chain: ["Buchecker", "Maus", "Fuchs"], typ: "Wald" },
  { chain: ["Algen", "Wasserfloh", "kleiner Fisch", "Hecht"], typ: "See" },
  { chain: ["Algen", "Kaulquappe", "Libellenlarve", "Barsch"], typ: "Teich" },
  { chain: ["Klee", "Kaninchen", "Fuchs", "Adler"], typ: "Wiese" },
  { chain: ["Phytoplankton", "Zooplankton", "Hering", "Robbe"], typ: "Meer" },
  { chain: ["Baumrinde", "Borkenkäfer", "Specht", "Habicht"], typ: "Wald" },
];
const TROPHIE = ["Produzent", "Primärkonsument (Pflanzenfresser)", "Sekundärkonsument", "Tertiärkonsument"];

function nahrungskettenGenerators() {
  const gens = [];
  // Richtige Reihenfolge
  gens.push((r) => {
    const nk = r.pick(NAHRUNGSKETTEN);
    const correct = nk.chain.join(" → ");
    const d1 = r.shuffle(nk.chain).join(" → ");
    const d2 = nk.chain.slice().reverse().join(" → ");
    const rot = nk.chain.slice(1).concat(nk.chain[0]).join(" → ");
    return mc(r, "Nahrungskette", `${r.pick(BIO_LEADS)}Welche Reihenfolge der Nahrungskette (${nk.typ}) ist richtig?`,
      correct, r.shuffle([d1, d2, rot]).filter((x) => x !== correct),
      `Eine Nahrungskette beginnt beim Produzenten und läuft zum Endkonsumenten: ${correct}.`);
  });
  // Trophieebene eines Organismus
  gens.push((r) => {
    const nk = r.pick(NAHRUNGSKETTEN);
    const idx = r.int(0, Math.min(nk.chain.length - 1, 3));
    const org = nk.chain[idx];
    const level = TROPHIE[idx];
    return mc(r, "Nahrungskette", `${r.pick(BIO_LEADS)}Welche Stellung hat „${org}“ in der Nahrungskette „${nk.chain.join(" → ")}“?`,
      level, r.shuffle(TROPHIE.filter((x) => x !== level)),
      `„${org}“ steht an Position ${idx + 1} und ist somit ${level}.`);
  });
  // "Wer frisst wen?"
  gens.push((r) => {
    const nk = r.pick(NAHRUNGSKETTEN.filter((n) => n.chain.length >= 3));
    const i = r.int(0, nk.chain.length - 2);
    const beute = nk.chain[i], fresser = nk.chain[i + 1];
    const wrong = nk.chain.filter((x) => x !== fresser && x !== beute);
    return mc(r, "Nahrungskette", `${r.pick(BIO_LEADS)}Wer frisst in der Kette „${nk.chain.join(" → ")}“ direkt „${beute}“?`,
      fresser, r.shuffle(wrong),
      `In der Nahrungskette folgt auf „${beute}“ der Fresser „${fresser}“.`);
  });
  gens.push((r) => mc(r, "Nahrungskette",
    `${r.pick(BIO_LEADS)}Womit beginnt jede Nahrungskette?`,
    "mit einem Produzenten (grüne Pflanze)", ["mit einem Raubtier", "mit einem Zersetzer", "mit einem Allesfresser"],
    "Produzenten (Pflanzen) bilden mit Fotosynthese die Grundlage jeder Nahrungskette."));
  return gens;
}

// Rollen von Organismen im Ökosystem (kombinatorisch)
const ORG_ROLLE = [
  ["Eiche", "Produzent"], ["Gras", "Produzent"], ["Alge", "Produzent"], ["Buche", "Produzent"],
  ["Klee", "Produzent"], ["Seerose", "Produzent"],
  ["Reh", "Primärkonsument (Pflanzenfresser)"], ["Kaninchen", "Primärkonsument (Pflanzenfresser)"],
  ["Heuschrecke", "Primärkonsument (Pflanzenfresser)"], ["Wasserfloh", "Primärkonsument (Pflanzenfresser)"],
  ["Fuchs", "Konsument (Fleischfresser)"], ["Habicht", "Konsument (Fleischfresser)"],
  ["Hecht", "Konsument (Fleischfresser)"], ["Sperber", "Konsument (Fleischfresser)"],
  ["Regenwurm", "Destruent (Zersetzer)"], ["Pilz", "Destruent (Zersetzer)"],
  ["Bakterien", "Destruent (Zersetzer)"], ["Asseln", "Destruent (Zersetzer)"],
];
const ROLLEN = ["Produzent", "Primärkonsument (Pflanzenfresser)", "Konsument (Fleischfresser)", "Destruent (Zersetzer)"];

function orgRolleGenerator() {
  return (r) => {
    const [org, rolle] = r.pick(ORG_ROLLE);
    return mc(r, "Ökosystem", `${r.pick(BIO_LEADS)}Welche Rolle spielt „${org}“ im Ökosystem?`,
      rolle, r.shuffle(ROLLEN.filter((x) => x !== rolle)),
      `„${org}“ ist ein ${rolle}.`);
  };
}

const FOTOSYNTHESE = [
  ["6 CO₂ + 6 H₂O → ___ + 6 O₂ (Fotosynthese) – was fehlt?", "C₆H₁₂O₆ (Glucose)", ["6 CO₂", "6 H₂O", "12 O₂"], "Aus Kohlenstoffdioxid und Wasser entsteht Traubenzucker (Glucose) und Sauerstoff."],
  ["6 CO₂ + ___ → C₆H₁₂O₆ + 6 O₂ – welches Edukt fehlt?", "6 H₂O (Wasser)", ["6 O₂", "C₆H₁₂O₆", "6 CO₂"], "Wasser ist neben Kohlenstoffdioxid das zweite Ausgangsstoff der Fotosynthese."],
  ["___ + 6 H₂O → C₆H₁₂O₆ + 6 O₂ – welches Edukt fehlt?", "6 CO₂ (Kohlenstoffdioxid)", ["6 O₂", "C₆H₁₂O₆", "Glucose"], "Kohlenstoffdioxid liefert den Kohlenstoff für den Zucker."],
  ["6 CO₂ + 6 H₂O → C₆H₁₂O₆ + ___ – welches Produkt fehlt?", "6 O₂ (Sauerstoff)", ["6 CO₂", "6 H₂O", "6 N₂"], "Als „Abfallprodukt“ der Fotosynthese entsteht Sauerstoff."],
  ["Welche Energiequelle treibt die Fotosynthese an?", "Licht (Sonnenlicht)", ["Wärme aus dem Boden", "chemische Energie aus dem Wasser", "Windenergie"], "Lichtenergie wird im Chlorophyll aufgenommen und chemisch gebunden."],
  ["In welchem Zellbestandteil läuft die Fotosynthese ab?", "im Chloroplasten", ["im Zellkern", "in den Mitochondrien", "in der Vakuole"], "Chloroplasten enthalten den grünen Farbstoff Chlorophyll."],
  ["Welcher Farbstoff nimmt das Licht für die Fotosynthese auf?", "Chlorophyll", ["Hämoglobin", "Melanin", "Carotin allein"], "Chlorophyll absorbiert vor allem rotes und blaues Licht."],
];

const OEKOSYSTEM_FAKTEN = [
  ["Wie nennt man Lebewesen, die totes organisches Material abbauen (z. B. Pilze, Bakterien)?", "Destruenten (Zersetzer)", ["Produzenten", "Primärkonsumenten", "Endkonsumenten"], "Destruenten schließen den Stoffkreislauf, indem sie Totes zu Mineralstoffen abbauen."],
  ["Was bezeichnet ein Nahrungsnetz?", "die Verknüpfung vieler Nahrungsketten", ["eine einzelne Nahrungskette", "nur die Produzenten", "die Zahl der Tierarten"], "Ein Nahrungsnetz entsteht, weil Arten in mehreren Nahrungsketten vorkommen."],
  ["In welche Schichten gliedert sich der Wald von unten nach oben grob?", "Kraut-, Strauch-, Baumschicht", ["Baum-, Kraut-, Wurzelschicht", "Wasser-, Ufer-, Freiwasser", "Boden-, Wolken-, Kronenschicht"], "Der Wald ist in Moos-/Kraut-, Strauch- und Baumschicht gegliedert (Stockwerkbau)."],
  ["Wie nennt man die belichtete Uferzone eines Sees mit Pflanzen?", "Litoral (Uferzone)", ["Profundal", "Freiwasser (Pelagial)", "Sublitoral"], "Das Litoral ist die pflanzenreiche, lichtdurchflutete Uferzone."],
  ["Was ist ein Produzent im Ökosystem?", "eine grüne Pflanze, die selbst Nährstoffe aufbaut", ["ein Pflanzenfresser", "ein Fleischfresser", "ein Zersetzer"], "Produzenten (autotroph) bauen mit Fotosynthese organische Stoffe auf."],
  ["Warum gibt es in einer Nahrungskette meist nur 3–4 Glieder?", "weil bei jeder Stufe Energie verloren geht", ["weil es zu wenige Tiere gibt", "weil Pflanzen giftig sind", "weil Wasser fehlt"], "Nur rund 10 % der Energie wird an die nächste Stufe weitergegeben (Energiepyramide)."],
  ["Was versteht man unter einem Biotop?", "den unbelebten Lebensraum einer Lebensgemeinschaft", ["die Gesamtheit der Tiere", "eine Nahrungskette", "nur den Boden"], "Biotop = Lebensraum; die Lebensgemeinschaft darin heißt Biozönose."],
  ["Wie heißt die Gesamtheit aller Lebewesen in einem Lebensraum?", "Biozönose (Lebensgemeinschaft)", ["Biotop", "Population", "Ökosystem"], "Biotop + Biozönose ergeben zusammen das Ökosystem."],
  ["Was passiert, wenn in einer Nahrungskette der Räuber fehlt?", "die Beutepopulation kann stark ansteigen", ["die Pflanzen sterben sofort aus", "nichts verändert sich", "die Sonne scheint weniger"], "Ohne Fressfeind vermehrt sich die Beute oft stark – das Gleichgewicht verschiebt sich."],
];

/* ---- Genetik & Hormone (Kl. 9–10) ---- */
const BASE_COMP = { A: "T", T: "A", G: "C", C: "G" };
const BASES = ["A", "T", "G", "C"];

function genetikGenerators() {
  const gens = [];
  // Komplementärstrang berechnen
  gens.push((r) => {
    const len = r.int(5, 7);
    const strand = Array.from({ length: len }, () => r.pick(BASES));
    const comp = strand.map((b) => BASE_COMP[b]);
    const correct = comp.join("-");
    // Distraktoren: ein Fehler / falsche Paarung / Rückwärts
    const wrong1 = comp.slice(); wrong1[r.int(0, len - 1)] = r.pick(BASES);
    const badPair = { A: "C", T: "G", G: "T", C: "A" };
    const wrong2 = strand.map((b) => badPair[b]);
    const wrong3 = comp.slice().reverse();
    return mc(r, "DNA-Basenpaarung",
      `${r.pick(BIO_LEADS)}Wie lautet der komplementäre DNA-Strang zu 3'-${strand.join("-")}-5'?`,
      correct, r.shuffle([wrong1.join("-"), wrong2.join("-"), wrong3.join("-")]).filter((x) => x !== correct),
      "Basenpaarung: A–T und G–C. Jede Base wird durch ihren Partner ersetzt.");
  });
  // Chargaff: A% -> T%
  gens.push((r) => {
    const a = r.int(15, 35);
    return mc(r, "Chargaff-Regel",
      `${r.pick(BIO_LEADS)}Ein DNA-Doppelstrang enthält ${a} % Adenin. Wie hoch ist der Anteil an Thymin?`,
      `${a} %`, r.shuffle([`${50 - a} %`, `${100 - a} %`, `${Math.round(a / 2)} %`]),
      "Nach Chargaff gilt A = T, also ebenfalls " + a + " % Thymin.");
  });
  // Chargaff: G% -> A%
  gens.push((r) => {
    const g = r.int(15, 30);
    const aPct = 50 - g;
    return mc(r, "Chargaff-Regel",
      `${r.pick(BIO_LEADS)}Ein DNA-Doppelstrang enthält ${g} % Guanin. Wie hoch ist der Anteil an Adenin?`,
      `${aPct} %`, r.shuffle([`${g} %`, `${100 - g} %`, `${50 - aPct} %`]).filter((x) => x !== `${aPct} %`),
      `G = C = ${g} %, macht zusammen ${2 * g} %. Rest ${100 - 2 * g} % teilen sich A und T je zur Hälfte: ${aPct} %.`);
  });
  // Basenpaar-Partner
  gens.push((r) => {
    const b = r.pick(BASES);
    const names = { A: "Adenin", T: "Thymin", G: "Guanin", C: "Cytosin" };
    return mc(r, "DNA-Basenpaarung",
      `${r.pick(BIO_LEADS)}Mit welcher Base paart sich ${names[b]} (${b}) in der DNA?`,
      `${names[BASE_COMP[b]]} (${BASE_COMP[b]})`,
      r.shuffle(BASES.filter((x) => x !== BASE_COMP[b]).map((x) => `${names[x]} (${x})`)),
      `In der DNA paaren A–T und G–C: ${names[b]} bindet an ${names[BASE_COMP[b]]}.`);
  });
  return gens;
}

const MITOSE_MEIOSE = [
  ["In welcher Reihenfolge laufen die Phasen der Mitose ab?", "Prophase → Metaphase → Anaphase → Telophase", ["Metaphase → Prophase → Telophase → Anaphase", "Anaphase → Telophase → Prophase → Metaphase", "Telophase → Anaphase → Metaphase → Prophase"], "Merkhilfe „PMAT“: Pro-, Meta-, Ana-, Telophase."],
  ["Wann ordnen sich die Chromosomen in der Äquatorialebene an?", "in der Metaphase", ["in der Prophase", "in der Anaphase", "in der Telophase"], "In der Metaphase liegen die Chromosomen in der Äquatorialebene."],
  ["Wann werden die Chromatiden zu den Zellpolen gezogen?", "in der Anaphase", ["in der Prophase", "in der Metaphase", "in der Telophase"], "In der Anaphase trennen sich die Schwesterchromatiden und wandern zu den Polen."],
  ["Wie viele Tochterzellen entstehen bei der Mitose?", "zwei genetisch identische Zellen", ["vier genetisch verschiedene Zellen", "eine Zelle", "acht Zellen"], "Die Mitose liefert zwei erbgleiche (diploide) Tochterzellen."],
  ["Wie viele Tochterzellen entstehen bei der Meiose?", "vier genetisch verschiedene (haploide) Zellen", ["zwei identische Zellen", "eine Zelle", "sechs Zellen"], "Die Meiose erzeugt vier haploide, genetisch unterschiedliche Keimzellen."],
  ["Wodurch entsteht bei der Meiose neue genetische Vielfalt?", "durch Crossing-over und Rekombination", ["durch Verdopplung der Zellzahl", "durch Mitose der Tochterzellen", "durch Zerstörung von Chromosomen"], "In der Meiose I sorgen Crossing-over und zufällige Verteilung für Rekombination."],
  ["Was passiert vor der Kernteilung mit der DNA?", "sie wird verdoppelt (Replikation in der S-Phase)", ["sie wird halbiert", "sie wird abgebaut", "sie bleibt unverändert"], "In der Interphase (S-Phase) wird die DNA vor der Teilung repliziert."],
];

const HORMONE = [
  ["Welches Hormon senkt den Blutzuckerspiegel?", "Insulin", ["Glukagon", "Adrenalin", "Thyroxin"], "Insulin aus der Bauchspeicheldrüse senkt den Blutzucker (Aufnahme in die Zellen)."],
  ["Welches Hormon erhöht den Blutzuckerspiegel?", "Glukagon", ["Insulin", "Melatonin", "Östrogen"], "Glukagon ist der Gegenspieler des Insulins und hebt den Blutzucker an."],
  ["Welches Hormon wird als „Stresshormon“ bezeichnet?", "Adrenalin", ["Insulin", "Melatonin", "Testosteron"], "Adrenalin bereitet den Körper auf Kampf oder Flucht vor."],
  ["Welche Drüse produziert Insulin und Glukagon?", "die Bauchspeicheldrüse (Pankreas)", ["die Schilddrüse", "die Nebenniere", "die Hirnanhangdrüse"], "Die Langerhans-Inseln der Bauchspeicheldrüse bilden Insulin (B-Zellen) und Glukagon (A-Zellen)."],
  ["Welches Hormon steuert den Grundumsatz und wird in der Schilddrüse gebildet?", "Thyroxin", ["Adrenalin", "Insulin", "Cortisol"], "Thyroxin (T4) aus der Schilddrüse steuert den Stoffwechsel-Grundumsatz."],
  ["Welches Prinzip regelt die Hormonmenge im Blut?", "negative Rückkopplung", ["positive Endlosverstärkung", "Zufallssteuerung", "reine Nervensteuerung"], "Über negative Rückkopplung hemmt ein hoher Hormonspiegel die weitere Ausschüttung."],
  ["Welche Krankheit entsteht durch Insulinmangel bzw. Insulinunwirksamkeit?", "Diabetes mellitus", ["Kropf", "Gicht", "Skorbut"], "Bei Diabetes mellitus ist der Blutzucker dauerhaft erhöht."],
];

/* ---- Enzyme, Ökologie, Neurobiologie (Kl. 11–13) ---- */
const ENZYME = [
  ["Nach welchem Prinzip passt ein Substrat in das aktive Zentrum eines Enzyms?", "Schlüssel-Schloss-Prinzip", ["Zufallsprinzip", "Reißverschlussprinzip", "Diffusionsprinzip"], "Substrat und aktives Zentrum passen räumlich zueinander (Schlüssel-Schloss / induced fit)."],
  ["Was bezeichnet die Substratspezifität eines Enzyms?", "es setzt nur ein bestimmtes Substrat um", ["es wirkt bei jeder Temperatur", "es katalysiert jede Reaktion", "es verbraucht sich bei der Reaktion"], "Substratspezifisch heißt: Das Enzym erkennt und wandelt nur ein bestimmtes Substrat um."],
  ["Was bewirkt ein Enzym als Biokatalysator?", "es setzt die Aktivierungsenergie herab", ["es erhöht die Aktivierungsenergie", "es verschiebt das Gleichgewicht", "es liefert Energie für die Reaktion"], "Enzyme senken die Aktivierungsenergie und beschleunigen so die Reaktion, ohne sich zu verbrauchen."],
  ["Was geschieht bei einer kompetitiven Hemmung?", "der Hemmstoff besetzt das aktive Zentrum wie das Substrat", ["der Hemmstoff bindet an anderer Stelle", "das Enzym wird dauerhaft zerstört", "das Substrat wird verdoppelt"], "Beim kompetitiven Hemmstoff konkurriert er mit dem Substrat um das aktive Zentrum – durch mehr Substrat aufhebbar."],
  ["Was passiert bei allosterischer (nichtkompetitiver) Hemmung?", "der Hemmstoff bindet außerhalb des aktiven Zentrums und verändert dessen Form", ["er bindet direkt im aktiven Zentrum", "er erhöht die Enzymmenge", "er senkt die Temperatur"], "Der allosterische Hemmstoff bindet an anderer Stelle und ändert die Enzymstruktur."],
  ["Was besagt die RGT-Regel für enzymatische Reaktionen (bis zum Optimum)?", "10 °C mehr verdoppeln bis verdreifachen die Reaktionsgeschwindigkeit", ["10 °C mehr halbieren die Geschwindigkeit", "Temperatur hat keinen Einfluss", "nur Kälte beschleunigt"], "Die Reaktions-Geschwindigkeits-Temperatur-Regel: pro 10 °C etwa Faktor 2–3 – nur bis zum Temperaturoptimum."],
  ["Was geschieht mit einem Enzym oberhalb seiner Optimaltemperatur?", "es denaturiert und verliert die Wirkung", ["es arbeitet immer schneller", "es vermehrt sich", "es wird zum Substrat"], "Zu hohe Temperatur zerstört die Raumstruktur (Denaturierung) – das Enzym wird inaktiv."],
  ["Was ist ein Cofaktor bzw. Coenzym?", "ein Nicht-Protein-Bestandteil, den manche Enzyme zur Funktion brauchen", ["das Substrat selbst", "ein Abbauprodukt", "das Endprodukt der Reaktion"], "Coenzyme/Cofaktoren (z. B. Vitamine, Metallionen) unterstützen die Enzymfunktion."],
];

// Lotka-Volterra – Regeln zuordnen
const LOTKA_VOLTERRA = [
  ["Die Bestände von Räuber und Beute schwanken periodisch um Mittelwerte. Welche Lotka-Volterra-Regel?", "1. Regel (periodische Schwankungen)", ["2. Regel (konstante Mittelwerte)", "3. Regel (Störung des Mittelwerts)", "keine der Regeln"], "1. Regel: Die Populationsgrößen von Räuber und Beute schwanken periodisch, zeitlich versetzt."],
  ["Über lange Zeit bleiben die Durchschnittsgrößen beider Populationen konstant. Welche Regel?", "2. Regel (Konstanz der Mittelwerte)", ["1. Regel (periodische Schwankungen)", "3. Regel (Störung des Mittelwerts)", "keine der Regeln"], "2. Regel: Die Mittelwerte der Populationen bleiben langfristig konstant."],
  ["Beide Populationen werden gleichmäßig dezimiert; danach erholt sich die Beute schneller/stärker. Welche Regel?", "3. Regel (Störung der Mittelwerte)", ["1. Regel (periodische Schwankungen)", "2. Regel (konstante Mittelwerte)", "keine der Regeln"], "3. Regel: Nach gleichmäßiger Störung nimmt die Beute rascher zu als der Räuber (Vorteil der Beute)."],
  ["Warum folgt das Maximum der Räuberpopulation zeitlich dem Maximum der Beute?", "der Räuber vermehrt sich erst, wenn viel Beute vorhanden ist", ["der Räuber vermehrt sich vor der Beute", "beide Maxima fallen exakt zusammen", "die Beute frisst den Räuber"], "Die Räuberkurve ist der Beutekurve nachlaufend (phasenverschoben) – 1. Regel."],
];

const NEUROBIO = [
  ["Wie groß ist das Ruhepotential einer typischen Nervenzelle etwa?", "etwa −70 mV", ["etwa +30 mV", "etwa 0 mV", "etwa −200 mV"], "Das Ruhepotential liegt bei rund −70 mV (innen negativ gegenüber außen)."],
  ["Welches Ion strömt bei der Depolarisation (Aktionspotential) in die Zelle?", "Natrium (Na⁺)", ["Kalium (K⁺)", "Chlorid (Cl⁻)", "Calcium bleibt außen"], "Bei der Depolarisation öffnen sich spannungsgesteuerte Na⁺-Kanäle, Na⁺ strömt ein."],
  ["Welches Ion strömt bei der Repolarisation aus der Zelle?", "Kalium (K⁺)", ["Natrium (Na⁺)", "Chlorid (Cl⁻)", "Calcium (Ca²⁺)"], "Bei der Repolarisation strömt K⁺ nach außen, das Potential wird wieder negativer."],
  ["Was hält den Ionengradienten am Ruhepotential aufrecht?", "die Natrium-Kalium-Pumpe (unter ATP-Verbrauch)", ["freie Diffusion allein", "die Myelinscheide", "die Neurotransmitter"], "Die Na⁺/K⁺-ATPase pumpt 3 Na⁺ raus und 2 K⁺ rein und erhält so den Gradienten."],
  ["Wie wird die Erregung an einer myelinisierten Nervenfaser weitergeleitet?", "saltatorisch (sprunghaft von Schnürring zu Schnürring)", ["kontinuierlich über die ganze Faser", "gar nicht", "nur rückwärts"], "An den Ranvier-Schnürringen springt das Aktionspotential – saltatorische, schnellere Leitung."],
  ["Wie wird das Signal an einer chemischen Synapse übertragen?", "durch Neurotransmitter über den synaptischen Spalt", ["durch direkten Stromfluss über die Membran", "durch DNA-Übertragung", "durch Kalkbrücken"], "An chemischen Synapsen setzt das Aktionspotential Neurotransmitter frei, die an Rezeptoren binden."],
  ["Was besagt das Alles-oder-Nichts-Prinzip des Aktionspotentials?", "ab dem Schwellenwert wird ein volles AP ausgelöst, sonst keines", ["die Stärke des AP hängt vom Reiz ab", "es gibt beliebig viele AP-Stärken", "das AP läuft rückwärts"], "Überschreitet der Reiz den Schwellenwert, entsteht ein vollständiges AP – unabhängig von der Reizstärke darüber."],
  ["Wozu dient die Refraktärzeit?", "sie sichert die Einbahn-Richtung und begrenzt die Frequenz der Erregung", ["sie verstärkt jedes Signal", "sie erzeugt das Ruhepotential dauerhaft", "sie baut Neurotransmitter auf"], "In der Refraktärzeit ist die Membran unerregbar – das AP kann nur vorwärts laufen."],
  ["Wie wird die Reizstärke im Nervensystem codiert?", "über die Frequenz der Aktionspotentiale", ["über die Amplitude einzelner AP", "über die Farbe des Signals", "über die Temperatur"], "Stärkere Reize erhöhen die AP-Frequenz (Frequenzcodierung), nicht die AP-Höhe."],
];

// Kombinatorische Rechen-Generatoren für die Oberstufe
function bioOberstufeRechnenGenerators() {
  const gens = [];
  // RGT-Regel: Reaktionsgeschwindigkeit bei +10 °C
  gens.push((r) => {
    const q10 = r.pick([2, 3]);
    const start = r.int(2, 12);
    const steps = r.int(1, 2); // 10 oder 20 °C Erhöhung
    const tLow = r.pick([10, 15, 20, 25]);
    const tHigh = tLow + steps * 10;
    const result = start * Math.pow(q10, steps);
    return mc(r, "Enzyme (RGT-Regel)",
      `${r.pick(BIO_LEADS)}Eine enzymatische Reaktion hat bei ${tLow} °C die Geschwindigkeit ${start} (rel.). Wie hoch ist sie bei ${tHigh} °C, wenn Q₁₀ = ${q10} gilt (unterhalb des Optimums)?`,
      `${result}`, r.shuffle([`${start * q10}`, `${start + steps * 10}`, `${start * steps * q10}`]).filter((x) => x !== `${result}`),
      `Pro 10 °C multipliziert sich die Geschwindigkeit mit Q₁₀ = ${q10}. Bei ${steps}×10 °C: ${start} × ${q10}^${steps} = ${result}.`);
  });
  // Exponentielles Populationswachstum (Verdopplung)
  gens.push((r) => {
    const n0 = r.pick([100, 200, 500, 1000, 50]);
    const gens_n = r.int(2, 6);
    const result = n0 * Math.pow(2, gens_n);
    const tDouble = r.pick([20, 30]);
    return mc(r, "Populationswachstum",
      `${r.pick(BIO_LEADS)}Eine Bakterienkultur startet mit ${n0} Zellen und verdoppelt sich alle ${tDouble} min. Wie viele Zellen sind es nach ${gens_n} Verdopplungen?`,
      `${result}`, r.shuffle([`${n0 * 2 * gens_n}`, `${n0 * gens_n}`, `${n0 * Math.pow(2, gens_n - 1)}`]).filter((x) => x !== `${result}`),
      `Bei exponentiellem Wachstum: N = N₀ · 2ⁿ = ${n0} · 2^${gens_n} = ${result}.`);
  });
  // Energiefluss / 10%-Regel zwischen Trophieebenen
  gens.push((r) => {
    const start = r.pick([10000, 20000, 50000, 100000]);
    const stufen = r.int(1, 3);
    const result = start * Math.pow(0.1, stufen);
    return mc(r, "Energiefluss",
      `${r.pick(BIO_LEADS)}Auf der Produzentenebene stehen ${start} kJ zur Verfügung. Wie viel Energie erreicht nach der 10-%-Regel die ${stufen}. Konsumentenebene?`,
      `${result} kJ`, r.shuffle([`${start * Math.pow(0.1, stufen - 1) || start} kJ`, `${start / (10 * stufen)} kJ`, `${start * 0.1 * stufen} kJ`]).filter((x) => x !== `${result} kJ`),
      `Pro Trophiestufe werden nur ~10 % weitergegeben: ${start} · 0,1^${stufen} = ${result} kJ.`);
  });
  return gens;
}

function biologie3Generators(k) {
  if (k <= 8) {
    return [
      ...nahrungskettenGenerators(),
      orgRolleGenerator(),
      factGen("Fotosynthese", FOTOSYNTHESE, BIO_LEADS),
      factGen("Ökosystem", OEKOSYSTEM_FAKTEN, BIO_LEADS),
    ];
  }
  if (k <= 10) {
    return [
      ...genetikGenerators(),
      factGen("Mitose/Meiose", MITOSE_MEIOSE, BIO_LEADS),
      factGen("Hormone", HORMONE, BIO_LEADS),
    ];
  }
  return [
    ...bioOberstufeRechnenGenerators(),
    factGen("Enzyme", ENZYME, BIO_LEADS),
    factGen("Lotka-Volterra", LOTKA_VOLTERRA, BIO_LEADS),
    factGen("Neurobiologie", NEUROBIO, BIO_LEADS),
  ];
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

  console.log("Deutsch (Klasse 5–13, je >= 500):");
  for (let k = 5; k <= 13; k++)
    total += writeBank("deutsch6", k, generateBank(160000 + k, 500, deutsch6Generators(k)), 500);

  console.log("Biologie (Klasse 7–13, je >= 450):");
  for (let k = 7; k <= 13; k++)
    total += writeBank("biologie3", k, generateBank(161000 + k, 450, biologie3Generators(k)), 450);

  console.log(`\nGesamt (Runde 16): ${total} Fragen.`);
}

main();
