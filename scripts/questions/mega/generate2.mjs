/**
 * MEGA-Fragen-Generator RUNDE 2 für MasterMind.
 *
 * Ergänzt die Fragenbank aus generate.mjs um weitere Fächer, im GLEICHEN Format
 *   scripts/questions/mega/data/<fach>-klasse<k>.json
 * mit [{ topic, question, options[4], correct(Index), explanation }].
 *
 * Fächer/Umfang:
 *   - deutsch     Klasse 5–10, >= 800 Fragen pro Klasse
 *   - englisch    Klasse 11–13, >= 600 Fragen pro Klasse (C1-Wortschatz, if-clauses, Zeitformen)
 *   - biologie    Klasse 5–10, >= 500 Fragen pro Klasse
 *   - geschichte  Klasse 6–10, >= 400 Fragen pro Klasse
 *   - erdkunde    Klasse 5–8,  >= 400 Fragen pro Klasse
 *
 * Deterministisch (mulberry32-Seed). Keine Abhängigkeiten, reines Node.
 * generate.mjs wird NICHT verändert; existierende englisch-klasse5..10.json
 * bleiben unberührt (hier nur Klasse 11–13).
 *
 * Aufruf (vom Repo-Root):
 *   node scripts/questions/mega/generate2.mjs
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
  const seen = new Set([exclude]);
  for (const x of rng.shuffle(pool)) {
    const s = String(x);
    if (!seen.has(s)) { seen.add(s); out.push(s); }
    if (out.length === n) break;
  }
  return out;
}

/** Distraktoren = nahe Jahreszahlen. */
function yearDistractors(rng, y) {
  const cand = [y - 1, y + 1, y - 2, y + 2, y - 3, y + 3, y - 5, y + 5, y - 4, y + 4, y - 10, y + 10];
  return pickN(rng, cand.map(String), String(y), 3);
}

const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/** Sammelt count Fragen mit eindeutigem Fragetext. */
function generateBank(seed, count, generators) {
  const rng = makeRng(seed);
  const out = [];
  const texts = new Set();
  let attempts = 0;
  const maxAttempts = count * 120;
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
 * Generischer Faktenbank-Generator: Tabelle [term, beschreibung].
 * Erzeugt Vorwärts- (term→beschreibung) und Rückwärts-Fragen (beschreibung→term).
 * `leads` erhöht die Zahl eindeutiger Fragetexte, ohne die Fachlichkeit zu ändern.
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

const BIO_LEADS = ["", "Biologie: ", "Wähle die richtige Antwort. ", "Frage: ", "Was stimmt? "];
const GEO_LEADS = ["", "Erdkunde: ", "Wähle die richtige Antwort. "];
const HIST_LEADS = ["", "Geschichte: ", "Was trifft zu? "];

/* ══════════════════════════════ DEUTSCH ══════════════════════════════ */

// Nomen mit korrektem Artikel (für grammatisch saubere Sätze)
const DE_NN = [
  ["der", "Hund"], ["die", "Katze"], ["der", "Baum"], ["das", "Kind"], ["die", "Blume"],
  ["das", "Auto"], ["der", "Lehrer"], ["der", "Vogel"], ["der", "Tisch"], ["der", "Garten"],
  ["der", "Fluss"], ["der", "Berg"], ["der", "Freund"], ["der", "Ball"], ["der", "Apfel"],
  ["die", "Sonne"], ["die", "Lampe"], ["das", "Fenster"], ["der", "Junge"], ["das", "Buch"],
];
const DE_VERB_FIN = ["läuft", "singt", "schläft", "spielt", "liest", "lacht", "tanzt", "springt", "weint", "träumt", "rennt", "kocht", "malt", "winkt"];
const DE_ADV = ["heute", "gestern", "morgen", "immer", "oft", "gern", "dort", "hier", "draußen", "selten", "manchmal", "nie"];
const DE_ADJ = ["groß", "klein", "schnell", "müde", "laut", "schön", "kalt", "warm", "alt", "jung", "bunt", "freundlich", "leise", "stark"];
const DE_PRON = ["er", "sie", "es", "wir", "ich", "du", "ihr"];
const DE_PRAEP = ["hinter", "neben", "vor", "auf", "unter", "über", "in", "bei"];
const DE_KONJ = ["weil", "denn", "obwohl", "da", "dass", "und", "aber"];
const WORTARTEN = ["Nomen", "Verb", "Adjektiv", "Artikel", "Adverb", "Pronomen", "Präposition", "Konjunktion"];

function wortartFrage(r, satz, wort, wortart) {
  return mc(r, "Wortarten", `Welche Wortart ist „${wort}“ im Satz: „${satz}“?`, wortart,
    pickN(r, WORTARTEN, wortart, 3), `„${wort}“ ist in diesem Satz ein${wortart === "Verb" || wortart === "Nomen" || wortart === "Adverb" || wortart === "Artikel" || wortart === "Adjektiv" ? "" : "e"} ${wortart}.`);
}

// Zeitformen: Verb in allen Zeitstufen (3. Person Singular)
const DE_TENSE_VERBS = [
  { praes: "läuft", praet: "lief", perf: "ist gelaufen", plus: "war gelaufen", fut: "wird laufen" },
  { praes: "spielt", praet: "spielte", perf: "hat gespielt", plus: "hatte gespielt", fut: "wird spielen" },
  { praes: "geht", praet: "ging", perf: "ist gegangen", plus: "war gegangen", fut: "wird gehen" },
  { praes: "isst", praet: "aß", perf: "hat gegessen", plus: "hatte gegessen", fut: "wird essen" },
  { praes: "singt", praet: "sang", perf: "hat gesungen", plus: "hatte gesungen", fut: "wird singen" },
  { praes: "lacht", praet: "lachte", perf: "hat gelacht", plus: "hatte gelacht", fut: "wird lachen" },
  { praes: "schläft", praet: "schlief", perf: "hat geschlafen", plus: "hatte geschlafen", fut: "wird schlafen" },
  { praes: "liest", praet: "las", perf: "hat gelesen", plus: "hatte gelesen", fut: "wird lesen" },
  { praes: "schreibt", praet: "schrieb", perf: "hat geschrieben", plus: "hatte geschrieben", fut: "wird schreiben" },
  { praes: "kommt", praet: "kam", perf: "ist gekommen", plus: "war gekommen", fut: "wird kommen" },
  { praes: "trinkt", praet: "trank", perf: "hat getrunken", plus: "hatte getrunken", fut: "wird trinken" },
  { praes: "fährt", praet: "fuhr", perf: "ist gefahren", plus: "war gefahren", fut: "wird fahren" },
];
const DE_SUBJ = ["Der Hund", "Die Katze", "Das Kind", "Der Junge", "Die Frau", "Der Mann", "Das Mädchen", "Der Lehrer", "Der Vogel", "Die Schülerin"];
const TENSE_KEYS = [["praes", "Präsens"], ["praet", "Präteritum"], ["perf", "Perfekt"], ["plus", "Plusquamperfekt"], ["fut", "Futur I"]];
const TENSE_LABELS = TENSE_KEYS.map((t) => t[1]);

// Fälle: Nomen in allen vier Kasus (Singular)
const DE_KASUS_NN = [
  { nom: "der Hund", akk: "den Hund", dat: "dem Hund", gen: "des Hundes" },
  { nom: "die Katze", akk: "die Katze", dat: "der Katze", gen: "der Katze" },
  { nom: "das Kind", akk: "das Kind", dat: "dem Kind", gen: "des Kindes" },
  { nom: "der Lehrer", akk: "den Lehrer", dat: "dem Lehrer", gen: "des Lehrers" },
  { nom: "die Blume", akk: "die Blume", dat: "der Blume", gen: "der Blume" },
  { nom: "das Auto", akk: "das Auto", dat: "dem Auto", gen: "des Autos" },
  { nom: "der Baum", akk: "den Baum", dat: "dem Baum", gen: "des Baumes" },
  { nom: "die Frau", akk: "die Frau", dat: "der Frau", gen: "der Frau" },
  { nom: "das Haus", akk: "das Haus", dat: "dem Haus", gen: "des Hauses" },
  { nom: "der Mann", akk: "den Mann", dat: "dem Mann", gen: "des Mannes" },
];
const KASUS = ["Nominativ", "Genitiv", "Dativ", "Akkusativ"];

// Rechtschreibung: [richtig, falsch, falsch, falsch]
const DE_RS = [
  ["Rhythmus", "Rytmus", "Rhytmus", "Rhythmuss"],
  ["Portemonnaie", "Portmonee", "Portmonai", "Portemonai"],
  ["Restaurant", "Restorant", "Restaurand", "Resturant"],
  ["Fahrrad", "Farad", "Fahrad", "Fahrrat"],
  ["Kartoffel", "Kartofel", "Katoffel", "Kartoffl"],
  ["Rhabarber", "Rabarber", "Rhababer", "Rhababer"],
  ["Aggression", "Agression", "Agresion", "Aggresion"],
  ["Standard", "Standart", "Standarad", "Stanard"],
  ["Stegreif", "Stehgreif", "Stegreiff", "Steegreif"],
  ["Marmelade", "Mamelade", "Marmalade", "Marmeladde"],
  ["Kaffee", "Kafee", "Kaffe", "Caffee"],
  ["Interesse", "Intresse", "Interese", "Interressse"],
  ["nämlich", "nähmlich", "nemlich", "nämmlich"],
  ["ziemlich", "ziehmlich", "zimlich", "ziemmlich"],
  ["wahrscheinlich", "warscheinlich", "wahrscheinlig", "wahrscheindlich"],
  ["Gelegenheit", "Gelegenheit", "Gelegennheit", "Gelegemheit"],
  ["Ingenieur", "Ingeneur", "Ingenör", "Ingenieuhr"],
  ["Rhinozeros", "Rinozeros", "Rhinoceros", "Rhinozeross"],
  ["Kommilitone", "Komilitone", "Kommelitone", "Kommilitoner"],
  ["Necessaire", "Nessesär", "Necessär", "Nezessär"],
  ["Silhouette", "Silouette", "Silhuette", "Sillhouette"],
  ["Terrasse", "Terasse", "Terrase", "Terassse"],
  ["Appartement", "Apartement", "Appartment", "Aparment"],
  ["Rhetorik", "Retorik", "Rhethorik", "Rhetorick"],
  ["voraussichtlich", "vorraussichtlich", "vorausichtlich", "vorraussichtlig"],
];

// Homophone/Verwechslungen: [Satz mit ___, richtiges Wort, falsches Wort, Regel]
const DE_DASS = [
  ["Ich hoffe, ___ du bald kommst.", "dass", "das", "Konjunktion „dass“ leitet einen Nebensatz ein (ersetzbar? nein durch dieses/welches)."],
  ["Das Buch, ___ hier liegt, gehört mir.", "das", "dass", "Relativpronomen „das“ (ersetzbar durch „welches“)."],
  ["Ich glaube, ___ es regnet.", "dass", "das", "Konjunktion „dass“ leitet den Nebensatz ein."],
  ["___ Auto ist neu.", "Das", "Dass", "Artikel „das“ vor einem Nomen."],
  ["Er sagte, ___ er müde sei.", "dass", "das", "Konjunktion „dass“."],
  ["Ich weiß, ___ du recht hast.", "dass", "das", "Konjunktion „dass“."],
  ["Das Kind, ___ dort spielt, lacht.", "das", "dass", "Relativpronomen „das“ (= welches)."],
  ["Es ist schön, ___ du da bist.", "dass", "das", "Konjunktion „dass“."],
  ["___ Wetter war gut.", "Das", "Dass", "Artikel „das“."],
  ["Ich merke, ___ es kälter wird.", "dass", "das", "Konjunktion „dass“."],
];
const DE_SEIT = [
  ["___ ihr schon fertig?", "Seid", "Seit", "„seid“ = Form von „sein“ (ihr seid)."],
  ["Wir warten ___ zwei Stunden.", "seit", "seid", "„seit“ = Zeitangabe (Präposition)."],
  ["___ gestern regnet es.", "Seit", "Seid", "„seit“ leitet einen Zeitpunkt ein."],
  ["___ bitte leise!", "Seid", "Seit", "„seid“ = Befehl an „ihr“ (Form von sein)."],
  ["Ich kenne ihn ___ Jahren.", "seit", "seid", "„seit“ = Zeitangabe."],
  ["___ ihr müde?", "Seid", "Seit", "„seid“ = ihr seid."],
  ["___ dem Unfall geht es ihm besser.", "Seit", "Seid", "„seit“ = zeitlich."],
  ["___ ihr wirklich Geschwister?", "Seid", "Seit", "„seid“ = Form von sein."],
];
const DE_WIEDER = [
  ["Ich komme morgen ___.", "wieder", "wider", "„wieder“ = erneut/nochmal."],
  ["Das verstößt ___ die Regeln.", "wider", "wieder", "„wider“ = gegen."],
  ["Er sah sie nie ___.", "wieder", "wider", "„wieder“ = erneut."],
  ["Etwas ___ Erwarten geschah.", "wider", "wieder", "„wider Erwarten“ = entgegen der Erwartung."],
  ["Bitte sag es noch einmal ___.", "wieder", "wider", "„wieder“ = nochmal."],
  ["Sie handelte ___ besseres Wissen.", "wider", "wieder", "„wider besseres Wissen“ = entgegen."],
  ["Nach der Pause geht es ___ los.", "wieder", "wider", "„wieder“ = erneut."],
  ["Der Widerstand regte sich ___ den König.", "wider", "wieder", "„wider“ = gegen."],
];

// Kommasetzung: [richtiger Satz, falsch, falsch, falsch]
const DE_KOMMA = [
  ["Ich kaufe Äpfel, Birnen und Bananen.", "Ich kaufe Äpfel Birnen und Bananen.", "Ich kaufe, Äpfel, Birnen und Bananen.", "Ich kaufe Äpfel, Birnen und, Bananen."],
  ["Wenn es regnet, bleiben wir zu Hause.", "Wenn es regnet bleiben wir zu Hause.", "Wenn, es regnet bleiben wir zu Hause.", "Wenn es regnet, bleiben, wir zu Hause."],
  ["Er lernt viel, weil er die Prüfung bestehen will.", "Er lernt viel weil er die Prüfung bestehen will.", "Er lernt, viel weil er die Prüfung bestehen will.", "Er lernt viel weil, er die Prüfung bestehen will."],
  ["Das Auto, das dort steht, ist rot.", "Das Auto das dort steht ist rot.", "Das Auto, das dort steht ist rot.", "Das Auto das dort steht, ist rot."],
  ["Sie fragte, ob wir mitkommen.", "Sie fragte ob wir mitkommen.", "Sie fragte, ob, wir mitkommen.", "Sie, fragte ob wir mitkommen."],
  ["Nach dem Essen, das lecker war, gingen wir spazieren.", "Nach dem Essen das lecker war gingen wir spazieren.", "Nach dem Essen, das lecker war gingen wir spazieren.", "Nach dem Essen das lecker war, gingen wir spazieren."],
  ["Ich weiß, dass du kommst.", "Ich weiß dass du kommst.", "Ich weiß, dass, du kommst.", "Ich, weiß dass du kommst."],
  ["Peter, mein bester Freund, hilft mir.", "Peter mein bester Freund hilft mir.", "Peter, mein bester Freund hilft mir.", "Peter mein bester Freund, hilft mir."],
  ["Er kam, sah und siegte.", "Er kam sah und siegte.", "Er kam, sah, und siegte.", "Er, kam sah und siegte."],
  ["Obwohl es spät war, arbeitete sie weiter.", "Obwohl es spät war arbeitete sie weiter.", "Obwohl, es spät war arbeitete sie weiter.", "Obwohl es spät war, arbeitete, sie weiter."],
  ["Um gesund zu bleiben, treibt er Sport.", "Um gesund zu bleiben treibt er Sport.", "Um gesund, zu bleiben treibt er Sport.", "Um gesund zu bleiben treibt er, Sport."],
  ["Wir essen, spielen und lachen.", "Wir essen spielen und lachen.", "Wir essen, spielen, und lachen.", "Wir, essen spielen und lachen."],
];

function deutschGenerators(k) {
  const gens = [];

  // Wortarten (Volumen-Träger)
  gens.push((r) => {
    const [art, nom] = r.pick(DE_NN); const v = r.pick(DE_VERB_FIN); const adv = r.pick(DE_ADV);
    const satz = `${cap(art)} ${nom} ${v} ${adv}.`;
    const ziel = r.pick([[art, "Artikel"], [nom, "Nomen"], [v, "Verb"], [adv, "Adverb"]]);
    return wortartFrage(r, satz, ziel[0] === art ? cap(art) : ziel[0], ziel[1]);
  });
  gens.push((r) => {
    const [art, nom] = r.pick(DE_NN); const adj = r.pick(DE_ADJ);
    const satz = `${cap(art)} ${nom} ist ${adj}.`;
    const ziel = r.pick([[art, "Artikel"], [nom, "Nomen"], ["ist", "Verb"], [adj, "Adjektiv"]]);
    return wortartFrage(r, satz, ziel[0] === art ? cap(art) : ziel[0], ziel[1]);
  });
  gens.push((r) => {
    const pron = r.pick(DE_PRON); const v = r.pick(DE_VERB_FIN); const praep = r.pick(DE_PRAEP);
    const satz = `${cap(pron)} ${v} ${praep} dem Haus.`;
    const ziel = r.pick([[pron, "Pronomen"], [v, "Verb"], [praep, "Präposition"]]);
    return wortartFrage(r, satz, ziel[0] === pron ? cap(pron) : ziel[0], ziel[1]);
  });
  gens.push((r) => {
    const konj = r.pick(DE_KONJ); const v = r.pick(DE_VERB_FIN); const adv = r.pick(DE_ADV);
    const satz = `Ich bleibe hier, ${konj} es ${adv} ${v}.`;
    return wortartFrage(r, satz, konj, "Konjunktion");
  });

  // Zeitformen
  gens.push((r) => {
    const s = r.pick(DE_SUBJ); const v = r.pick(DE_TENSE_VERBS); const [key, label] = r.pick(TENSE_KEYS);
    const satz = `${s} ${v[key]}.`;
    return mc(r, "Zeitformen", `In welcher Zeitform steht der Satz: „${satz}“?`, label,
      pickN(r, TENSE_LABELS, label, 3), `„${v[key]}“ ist ${label}.`);
  });

  // Fälle
  gens.push((r) => {
    const nn = r.pick(DE_KASUS_NN); const [key, label] = r.pick([["nom", "Nominativ"], ["gen", "Genitiv"], ["dat", "Dativ"], ["akk", "Akkusativ"]]);
    const phrase = nn[key];
    let satz;
    if (key === "nom") satz = `${cap(phrase)} schläft ruhig.`;
    else if (key === "akk") satz = `Ich sehe ${phrase}.`;
    else if (key === "dat") satz = `Ich gebe ${phrase} einen Ball.`;
    else satz = `Das ist das Spielzeug ${phrase}.`;
    return mc(r, "Fälle", `In welchem Fall steht „${phrase}“ im Satz: „${satz}“?`, label,
      pickN(r, KASUS, label, 3), `„${phrase}“ steht hier im ${label}.`);
  });

  // Rechtschreibung
  gens.push((r) => {
    const [richtig, ...falsch] = r.pick(DE_RS);
    return mc(r, "Rechtschreibung", `Welches Wort ist richtig geschrieben?`, richtig, falsch,
      `Richtig ist „${richtig}“.`);
  });

  // das/dass, seit/seid, wieder/wider (4 Sätze, nur einer korrekt gefüllt)
  const homoBank = (bank, topic) => (r) => {
    const main = r.pick(bank);
    const correctOpt = main[0].replace("___", main[1]);
    const others = pickN(r, bank.filter((x) => x !== main).map((x) => x[0].replace("___", x[2])), correctOpt, 3);
    return mc(r, topic, `In welchem Satz ist die Lücke richtig ausgefüllt?`, correctOpt, others, main[3]);
  };
  gens.push(homoBank(DE_DASS, "das/dass"));
  gens.push(homoBank(DE_SEIT, "seit/seid"));
  gens.push(homoBank(DE_WIEDER, "wieder/wider"));

  // Kommasetzung
  gens.push((r) => {
    const [richtig, ...falsch] = r.pick(DE_KOMMA);
    return mc(r, "Kommasetzung", `Welcher Satz ist richtig kommagesetzt?`, richtig, falsch,
      `Richtig ist: „${richtig}“`);
  });

  return gens;
}

/* ══════════════════════════════ ENGLISCH 11–13 (C1) ══════════════════════════════ */

// C1-Wortschatz: [deutsch, englisch]
const C1 = [
  ["die Zweideutigkeit", "ambiguity"], ["die Sparmaßnahmen", "austerity"], ["die Wohlwollen", "benevolence"], ["die Kürze", "brevity"],
  ["die Nachsicht", "clemency"], ["die Gefälligkeit", "compliance"], ["die Zustimmung", "consent"], ["die Verachtung", "contempt"],
  ["die Streitfrage", "controversy"], ["die Glaubwürdigkeit", "credibility"], ["die Neugier", "curiosity"], ["die Täuschung", "deception"],
  ["der Niedergang", "decline"], ["die Zurückhaltung", "restraint"], ["die Entbehrung", "deprivation"], ["die Abweichung", "deviation"],
  ["die Sorgfalt", "diligence"], ["die Uneinigkeit", "discord"], ["die Ernüchterung", "disillusionment"], ["die Vielfalt", "diversity"],
  ["die Zwangslage", "predicament"], ["die Beredsamkeit", "eloquence"], ["die Verlegenheit", "embarrassment"], ["die Ausdauer", "endurance"],
  ["die Feindschaft", "hostility"], ["die Gleichmut", "equanimity"], ["die Auslöschung", "eradication"], ["das Ansehen", "prestige"],
  ["die Übertreibung", "exaggeration"], ["die Erwartung", "anticipation"], ["die Unbeugsamkeit", "resilience"], ["die Redseligkeit", "verbosity"],
  ["der Anhaltspunkt", "clue"], ["die Fügsamkeit", "obedience"], ["die Weitläufigkeit", "vastness"], ["die Genügsamkeit", "frugality"],
  ["die Großzügigkeit", "generosity"], ["die Aufrichtigkeit", "sincerity"], ["die Bescheidenheit", "modesty"], ["die Beharrlichkeit", "perseverance"],
  ["die Voreingenommenheit", "bias"], ["die Rechtschaffenheit", "integrity"], ["die Scharfsinnigkeit", "shrewdness"], ["die Verschwiegenheit", "discretion"],
  ["die Nachlässigkeit", "negligence"], ["die Anmaßung", "presumption"], ["die Willkür", "arbitrariness"], ["die Erhabenheit", "sublimity"],
  ["der Überfluss", "abundance"], ["die Knappheit", "scarcity"], ["die Fülle", "profusion"], ["die Vergänglichkeit", "transience"],
  ["die Beständigkeit", "consistency"], ["die Zerbrechlichkeit", "fragility"], ["die Undurchsichtigkeit", "opacity"], ["die Durchlässigkeit", "permeability"],
  ["die Empfänglichkeit", "susceptibility"], ["die Anfälligkeit", "vulnerability"], ["die Widerstandsfähigkeit", "robustness"], ["die Beweglichkeit", "agility"],
  ["heikel", "delicate"], ["mühsam", "laborious"], ["hartnäckig", "persistent"], ["scharfsinnig", "astute"],
  ["nachsichtig", "lenient"], ["gewissenhaft", "conscientious"], ["überheblich", "arrogant"], ["bescheiden", "humble"],
  ["verschwenderisch", "lavish"], ["sparsam", "thrifty"], ["großspurig", "pompous"], ["zurückhaltend", "reticent"],
  ["gesprächig", "talkative"], ["schweigsam", "taciturn"], ["misstrauisch", "suspicious"], ["arglos", "naive"],
  ["scharf", "keen"], ["stumpf", "dull"], ["üppig", "lush"], ["karg", "barren"],
  ["reichlich", "ample"], ["dürftig", "meagre"], ["gewaltig", "immense"], ["winzig", "minuscule"],
  ["hinfällig", "obsolete"], ["bahnbrechend", "groundbreaking"], ["unumgänglich", "inevitable"], ["entbehrlich", "dispensable"],
  ["unerlässlich", "indispensable"], ["fragwürdig", "questionable"], ["einleuchtend", "plausible"], ["zwingend", "compelling"],
  ["irreführend", "misleading"], ["stichhaltig", "valid"], ["haltlos", "unfounded"], ["schlüssig", "coherent"],
  ["weitläufig", "spacious"], ["beengt", "cramped"], ["abgelegen", "remote"], ["zugänglich", "accessible"],
  ["verwerflich", "reprehensible"], ["lobenswert", "commendable"], ["tadellos", "impeccable"], ["mangelhaft", "deficient"],
  ["billigen", "to endorse"], ["ablehnen", "to reject"], ["befürworten", "to advocate"], ["untergraben", "to undermine"],
  ["bekräftigen", "to reaffirm"], ["widerlegen", "to refute"], ["behaupten", "to assert"], ["einräumen", "to concede"],
  ["hervorheben", "to emphasise"], ["abschwächen", "to mitigate"], ["verschärfen", "to aggravate"], ["bewältigen", "to cope with"],
  ["erlangen", "to attain"], ["entbehren", "to forgo"], ["fördern", "to foster"], ["hemmen", "to hinder"],
  ["nachahmen", "to imitate"], ["übertreffen", "to surpass"], ["ergründen", "to fathom"], ["verkörpern", "to embody"],
  ["andeuten", "to imply"], ["folgern", "to infer"], ["verschleiern", "to obscure"], ["erhellen", "to elucidate"],
  ["schmälern", "to diminish"], ["steigern", "to enhance"], ["aushalten", "to endure"], ["nachgeben", "to yield"],
  ["entfachen", "to ignite"], ["dämpfen", "to dampen"], ["beschleunigen", "to accelerate"], ["verzögern", "to delay"],
  ["verwickeln", "to entangle"], ["entwirren", "to disentangle"], ["bewahren", "to preserve"], ["verwerfen", "to discard"],
  ["die Vermutung", "conjecture"], ["die Behauptung", "claim"], ["die Folgerung", "inference"], ["der Vorbehalt", "reservation"],
  ["die Einschränkung", "limitation"], ["die Voraussetzung", "prerequisite"], ["das Zugeständnis", "concession"], ["die Widerlegung", "rebuttal"],
  ["die Rechtfertigung", "justification"], ["der Vorwand", "pretext"], ["die Begründung", "rationale"], ["das Missverständnis", "misconception"],
  ["die Verallgemeinerung", "generalisation"], ["die Übereinstimmung", "correspondence"], ["die Wechselwirkung", "interaction"], ["die Voraussage", "prediction"],
  ["die Bandbreite", "scope"], ["das Ausmaß", "extent"], ["der Umfang", "magnitude"], ["die Auswirkung", "implication"],
  ["die Verpflichtung", "obligation"], ["die Befugnis", "authority"], ["die Zuständigkeit", "jurisdiction"], ["das Vermächtnis", "legacy"],
  ["der Meilenstein", "milestone"], ["der Wendepunkt", "turning point"], ["der Rückschlag", "setback"], ["der Durchbruch", "breakthrough"],
  ["die Vorherrschaft", "supremacy"], ["die Vormachtstellung", "predominance"], ["das Gleichgewicht", "equilibrium"], ["die Schwelle", "threshold"],
  ["die Nachhaltigkeit", "sustainability"], ["die Rechenschaft", "accountability"], ["die Transparenz", "transparency"], ["die Anpassungsfähigkeit", "adaptability"],
];

// Bedingungssätze
const IF_COND = ["it rains", "you heat ice", "she studies hard", "we leave now", "they arrive late"];
function englisch11to13Generators(k) {
  const start = Math.max(0, Math.min((k - 11) * 5, C1.length - 150));
  const pool = C1.slice(start, start + 150);
  const en = pool.map((p) => p[1]);
  const de = pool.map((p) => p[0]);

  const gens = [
    (r) => { const [d, e] = r.pick(pool); return mc(r, "Vokabeln", `Was heißt „${d}“ auf Englisch?`, e, pickN(r, en, e, 3), `„${d}“ = „${e}“.`); },
    (r) => { const [d, e] = r.pick(pool); return mc(r, "Vokabeln", `Wähle die richtige englische Übersetzung von „${d}“.`, e, pickN(r, en, e, 3), `„${d}“ = „${e}“.`); },
    (r) => { const [d, e] = r.pick(pool); return mc(r, "Vokabeln", `Which English word means „${d}“?`, e, pickN(r, en, e, 3), `„${d}“ = „${e}“.`); },
    (r) => { const [d, e] = r.pick(pool); return mc(r, "Vokabeln", `Was bedeutet „${e}“ auf Deutsch?`, d, pickN(r, de, d, 3), `„${e}“ = „${d}“.`); },
    (r) => { const [d, e] = r.pick(pool); return mc(r, "Vokabeln", `Wähle die richtige deutsche Übersetzung von „${e}“.`, d, pickN(r, de, d, 3), `„${e}“ = „${d}“.`); },
    (r) => { const [d, e] = r.pick(pool); return mc(r, "Vokabeln", `Welche deutsche Bedeutung passt zu „${e}“?`, d, pickN(r, de, d, 3), `„${e}“ = „${d}“.`); },
    // if-clauses: Typ bestimmen
    (r) => {
      const c = r.pick(IF_COND);
      const s = `If ${c}, we will help you.`;
      return mc(r, "If-clauses", `Welcher Typ ist der Bedingungssatz: „${s}“?`, "Typ 1",
        ["Typ 0", "Typ 2", "Typ 3"], `if + Simple Present, will + Infinitiv → Typ 1 (reale Bedingung).`);
    },
    (r) => {
      const c = r.pick(["it rained", "you tried", "she asked", "we had time", "they knew"]);
      const s = `If ${c}, we would help you.`;
      return mc(r, "If-clauses", `Welcher Typ ist der Bedingungssatz: „${s}“?`, "Typ 2",
        ["Typ 0", "Typ 1", "Typ 3"], `if + Simple Past, would + Infinitiv → Typ 2 (unwahrscheinlich/irreal in der Gegenwart).`);
    },
    (r) => {
      const c = r.pick(["it had rained", "you had tried", "she had asked", "we had known", "they had left"]);
      const s = `If ${c}, we would have helped you.`;
      return mc(r, "If-clauses", `Welcher Typ ist der Bedingungssatz: „${s}“?`, "Typ 3",
        ["Typ 0", "Typ 1", "Typ 2"], `if + Past Perfect, would have + Past Participle → Typ 3 (irreal in der Vergangenheit).`);
    },
    (r) => {
      const c = r.pick(["you heat ice", "water reaches 100 °C", "you mix red and blue", "the sun sets", "you drop a stone"]);
      const s = `If ${c}, it melts.`;
      return mc(r, "If-clauses", `Welcher Typ ist die Aussage: „If you heat ice, it melts.“?`, "Typ 0",
        ["Typ 1", "Typ 2", "Typ 3"], `Allgemeingültige Wahrheit: if + Present, Present → Typ 0.`);
    },
    // Zeitformen bestimmen
    (r) => {
      const items = [
        ["She has just finished her essay.", "Present Perfect"],
        ["They were reading when I arrived.", "Past Progressive"],
        ["He will have left by then.", "Future Perfect"],
        ["We had already eaten before they came.", "Past Perfect"],
        ["I am currently writing a report.", "Present Progressive"],
        ["The results are published every year.", "Simple Present (Passive)"],
        ["She had been working for hours.", "Past Perfect Progressive"],
        ["By 2030 the city will have grown.", "Future Perfect"],
        ["He usually takes the bus.", "Simple Present"],
        ["They finished the project yesterday.", "Simple Past"],
      ];
      const [s, t] = r.pick(items);
      const labels = items.map((i) => i[1]);
      return mc(r, "Zeitformen", `In welcher Zeitform steht: „${s}“?`, t, pickN(r, labels, t, 3), `„${s}“ steht im ${t}.`);
    },
  ];
  return gens;
}

/* ══════════════════════════════ BIOLOGIE ══════════════════════════════ */

const BIO_ORGANELL = [
  ["der Zellkern", "enthält die Erbinformation (DNA) und steuert die Zelle"],
  ["das Mitochondrium", "erzeugt Energie (ATP) durch Zellatmung – „Kraftwerk der Zelle“"],
  ["der Chloroplast", "betreibt die Fotosynthese und enthält Chlorophyll"],
  ["das Ribosom", "stellt Proteine her (Proteinbiosynthese)"],
  ["die Vakuole", "speichert Wasser und Stoffe und gibt der Pflanzenzelle Halt"],
  ["die Zellwand", "gibt der Pflanzenzelle Form und Stabilität (aus Zellulose)"],
  ["die Zellmembran", "grenzt die Zelle ab und regelt den Stoffaustausch"],
  ["das Endoplasmatische Retikulum", "dient dem Transport und der Synthese von Stoffen"],
  ["der Golgi-Apparat", "verpackt und sortiert Stoffe für den Transport"],
];
const BIO_ORGAN = [
  ["das Herz", "pumpt das Blut durch den Körper"],
  ["die Lunge", "nimmt Sauerstoff auf und gibt Kohlendioxid ab"],
  ["die Leber", "entgiftet den Körper und speichert Nährstoffe"],
  ["die Niere", "filtert das Blut und bildet Harn"],
  ["der Magen", "zersetzt die Nahrung mit Magensäure"],
  ["der Dünndarm", "nimmt die Nährstoffe ins Blut auf"],
  ["das Gehirn", "steuert Denken, Bewegung und Wahrnehmung"],
  ["die Haut", "schützt den Körper und reguliert die Temperatur"],
  ["die Bauchspeicheldrüse", "bildet Insulin und Verdauungsenzyme"],
];
const BIO_SINNE = [
  ["das Auge", "nimmt Licht wahr (Sehen)"],
  ["das Ohr", "nimmt Schall wahr (Hören und Gleichgewicht)"],
  ["die Zunge", "nimmt Geschmack wahr (Schmecken)"],
  ["die Nase", "nimmt Gerüche wahr (Riechen)"],
  ["die Haut", "nimmt Druck, Temperatur und Schmerz wahr (Tasten)"],
];
const BIO_PFLANZE = [
  ["die Wurzel", "nimmt Wasser und Mineralstoffe aus dem Boden auf"],
  ["das Blatt", "betreibt die Fotosynthese"],
  ["die Blüte", "dient der Fortpflanzung der Pflanze"],
  ["der Stängel", "transportiert Wasser und stützt die Pflanze"],
  ["das Chlorophyll", "ist der grüne Farbstoff, der Lichtenergie aufnimmt"],
  ["die Spaltöffnung", "regelt den Gasaustausch an der Blattunterseite"],
  ["die Frucht", "schützt die Samen und hilft bei der Verbreitung"],
];
const BIO_FOTO = [
  ["das Ausgangsstoff-Paar der Fotosynthese", "Kohlendioxid und Wasser"],
  ["das Produkt der Fotosynthese", "Glucose (Traubenzucker) und Sauerstoff"],
  ["die Energiequelle der Fotosynthese", "das Sonnenlicht"],
  ["der Ort der Fotosynthese", "die Chloroplasten"],
  ["das Gas, das Pflanzen bei der Fotosynthese abgeben", "Sauerstoff"],
];
const BIO_TIERKLASSE = [
  ["der Frosch", "Amphibien"], ["die Eidechse", "Reptilien"], ["der Adler", "Vögel"],
  ["der Hai", "Fische"], ["der Hund", "Säugetiere"], ["die Biene", "Insekten"],
  ["die Schlange", "Reptilien"], ["der Wal", "Säugetiere"], ["die Forelle", "Fische"],
  ["die Kröte", "Amphibien"], ["die Fledermaus", "Säugetiere"], ["der Pinguin", "Vögel"],
  ["die Spinne", "Spinnentiere"], ["der Schmetterling", "Insekten"], ["die Möwe", "Vögel"],
];
const BIO_ERNAEHRUNG = [
  ["Kohlenhydrate", "liefern schnell verfügbare Energie"],
  ["Fette", "sind Energiespeicher und schützen Organe"],
  ["Proteine", "sind Baustoffe für Muskeln und Zellen"],
  ["Vitamin C", "stärkt das Immunsystem und beugt Skorbut vor"],
  ["Vitamin D", "wird mit Sonnenlicht gebildet und stärkt die Knochen"],
  ["Calcium", "ist wichtig für Knochen und Zähne"],
  ["Eisen", "wird für den Sauerstofftransport im Blut gebraucht"],
  ["Ballaststoffe", "fördern die Verdauung"],
];
const BIO_BLUT = [
  ["die roten Blutkörperchen", "transportieren Sauerstoff (mit Hämoglobin)"],
  ["die weißen Blutkörperchen", "wehren Krankheitserreger ab"],
  ["die Blutplättchen", "sorgen für die Blutgerinnung"],
  ["das Blutplasma", "transportiert Nährstoffe und Abfallstoffe"],
];
const BIO_OEKO = [
  ["der Produzent", "stellt aus Sonnenlicht Biomasse her (z. B. grüne Pflanzen)"],
  ["der Konsument", "ernährt sich von anderen Lebewesen"],
  ["der Destruent", "zersetzt tote organische Stoffe (z. B. Pilze, Bakterien)"],
  ["das Ökosystem", "ist die Gesamtheit von Lebewesen und ihrem Lebensraum"],
  ["die Nahrungskette", "beschreibt, wer wen frisst"],
  ["die Symbiose", "ist das Zusammenleben zweier Arten zu beiderseitigem Nutzen"],
  ["die Fotosynthese", "wandelt Lichtenergie in chemische Energie um"],
  ["die Zellatmung", "gewinnt Energie durch Abbau von Glucose mit Sauerstoff"],
];
const BIO_GENETIK = [
  ["die DNA", "trägt die Erbinformation in ihrer Basenabfolge"],
  ["das Gen", "ist ein Abschnitt der DNA mit dem Bauplan für ein Merkmal"],
  ["das Chromosom", "ist eine verpackte, kondensierte Form der DNA"],
  ["der Genotyp", "ist die genetische Ausstattung eines Lebewesens"],
  ["der Phänotyp", "ist das äußere Erscheinungsbild eines Lebewesens"],
  ["dominant", "beschreibt ein Allel, das sich im Phänotyp durchsetzt"],
  ["rezessiv", "beschreibt ein Allel, das nur reinerbig sichtbar wird"],
  ["homozygot", "bedeutet reinerbig (zwei gleiche Allele)"],
  ["heterozygot", "bedeutet mischerbig (zwei verschiedene Allele)"],
  ["die Mitose", "erzeugt zwei genetisch identische Tochterzellen"],
  ["die Meiose", "bildet Keimzellen mit halbem Chromosomensatz"],
  ["die Mutation", "ist eine dauerhafte Veränderung des Erbguts"],
];

function biologieGenerators(k) {
  const gens = [];
  gens.push(...factGens("Zellbiologie", BIO_ORGANELL, (t) => `Welche Aufgabe hat ${t}?`, (d) => `Welches Zellorganell „${d}“?`, BIO_LEADS));
  gens.push(...factGens("Organe", BIO_ORGAN, (t) => `Welche Aufgabe hat ${t}?`, (d) => `Welches Organ „${d}“?`, BIO_LEADS));
  gens.push(...factGens("Sinnesorgane", BIO_SINNE, (t) => `Welchen Sinn ermöglicht ${t}?`, (d) => `Welches Sinnesorgan „${d}“?`, BIO_LEADS));
  gens.push(...factGens("Pflanzen", BIO_PFLANZE, (t) => `Welche Aufgabe hat ${t} bei einer Pflanze?`, (d) => `Welcher Pflanzenteil „${d}“?`, BIO_LEADS));
  gens.push(...factGens("Fotosynthese", BIO_FOTO, (t) => `Was ist ${t}?`, (d) => `Wozu gehört: „${d}“?`, BIO_LEADS));
  gens.push(...factGens("Ernährung", BIO_ERNAEHRUNG, (t) => `Welche Funktion hat der Nährstoff ${t}?`, (d) => `Welcher Nährstoff „${d}“?`, BIO_LEADS));
  gens.push(...factGens("Tierklassen", BIO_TIERKLASSE, (t) => `Zu welcher Tierklasse gehört ${t}?`, (d) => `Nenne ein Tier aus der Klasse der ${d}.`, BIO_LEADS));
  if (k >= 7) {
    gens.push(...factGens("Blut", BIO_BLUT, (t) => `Welche Aufgabe haben ${t}?`, (d) => `Welcher Blutbestandteil „${d}“?`, BIO_LEADS));
    gens.push(...factGens("Ökologie", BIO_OEKO, (t) => `Was bedeutet „${t}“ in der Biologie?`, (d) => `Welcher Begriff passt: „${d}“?`, BIO_LEADS));
  }
  if (k >= 9) {
    gens.push(...factGens("Genetik", BIO_GENETIK, (t) => `Was bedeutet „${t}“?`, (d) => `Welcher Genetik-Begriff passt: „${d}“?`, BIO_LEADS));
  }
  return gens;
}

/* ══════════════════════════════ GESCHICHTE ══════════════════════════════ */

// [jahr, ereignis, epoche]
const HIST_EVENTS = [
  [-753, "die sagenhafte Gründung Roms", "Antike"],
  [-490, "die Schlacht bei Marathon", "Antike"],
  [-44, "die Ermordung Julius Cäsars", "Antike"],
  [476, "der Untergang des Weströmischen Reiches", "Antike"],
  [800, "die Kaiserkrönung Karls des Großen", "Mittelalter"],
  [1066, "die normannische Eroberung Englands", "Mittelalter"],
  [1096, "der Beginn des Ersten Kreuzzugs", "Mittelalter"],
  [1215, "die Unterzeichnung der Magna Carta", "Mittelalter"],
  [1348, "der Ausbruch der großen Pestwelle in Europa", "Mittelalter"],
  [1453, "die Eroberung Konstantinopels durch die Osmanen", "Mittelalter"],
  [1492, "die Ankunft von Kolumbus in Amerika", "Frühe Neuzeit"],
  [1517, "der Thesenanschlag Martin Luthers", "Frühe Neuzeit"],
  [1618, "der Beginn des Dreißigjährigen Krieges", "Frühe Neuzeit"],
  [1648, "der Westfälische Friede", "Frühe Neuzeit"],
  [1789, "der Beginn der Französischen Revolution", "Frühe Neuzeit"],
  [1804, "die Krönung Napoleons zum Kaiser", "19. Jahrhundert"],
  [1815, "der Wiener Kongress", "19. Jahrhundert"],
  [1848, "die deutsche Märzrevolution", "19. Jahrhundert"],
  [1871, "die Gründung des Deutschen Kaiserreichs", "19. Jahrhundert"],
  [1914, "der Beginn des Ersten Weltkriegs", "20. Jahrhundert"],
  [1918, "das Ende des Ersten Weltkriegs", "20. Jahrhundert"],
  [1919, "die Unterzeichnung des Versailler Vertrags", "20. Jahrhundert"],
  [1933, "die Machtübernahme der Nationalsozialisten", "20. Jahrhundert"],
  [1939, "der Beginn des Zweiten Weltkriegs", "20. Jahrhundert"],
  [1945, "das Ende des Zweiten Weltkriegs", "20. Jahrhundert"],
  [1949, "die Gründung der Bundesrepublik Deutschland und der DDR", "20. Jahrhundert"],
  [1961, "der Bau der Berliner Mauer", "20. Jahrhundert"],
  [1963, "die Ermordung John F. Kennedys", "20. Jahrhundert"],
  [1969, "die erste bemannte Mondlandung", "20. Jahrhundert"],
  [1989, "der Fall der Berliner Mauer", "20. Jahrhundert"],
  [1990, "die deutsche Wiedervereinigung", "20. Jahrhundert"],
  [2001, "die Terroranschläge vom 11. September", "21. Jahrhundert"],
  [2002, "die Einführung des Euro als Bargeld", "21. Jahrhundert"],
  [-336, "der Herrschaftsantritt Alexanders des Großen", "Antike"],
  [-264, "der Beginn der Punischen Kriege", "Antike"],
  [-146, "die Zerstörung Karthagos durch Rom", "Antike"],
  [9, "die Varusschlacht im Teutoburger Wald", "Antike"],
  [313, "das Toleranzedikt von Mailand für Christen", "Antike"],
  [375, "der Beginn der Völkerwanderung", "Antike"],
  [732, "die Schlacht von Tours und Poitiers", "Mittelalter"],
  [962, "die Kaiserkrönung Ottos I.", "Mittelalter"],
  [1077, "der Gang nach Canossa Heinrichs IV.", "Mittelalter"],
  [1122, "das Wormser Konkordat", "Mittelalter"],
  [1291, "die Gründung der Schweizer Eidgenossenschaft", "Mittelalter"],
  [1347, "der Beginn des Hundertjährigen Krieges (Frankreich–England)", "Mittelalter"],
  [1519, "die Landung von Cortés in Mexiko", "Frühe Neuzeit"],
  [1555, "der Augsburger Religionsfrieden", "Frühe Neuzeit"],
  [1588, "der Untergang der spanischen Armada", "Frühe Neuzeit"],
  [1687, "Newtons Veröffentlichung der Gravitationsgesetze", "Frühe Neuzeit"],
  [1776, "die amerikanische Unabhängigkeitserklärung", "Frühe Neuzeit"],
  [1806, "das Ende des Heiligen Römischen Reiches", "19. Jahrhundert"],
  [1832, "das Hambacher Fest", "19. Jahrhundert"],
  [1861, "der Beginn des amerikanischen Bürgerkriegs", "19. Jahrhundert"],
  [1863, "die Gründung des Roten Kreuzes", "19. Jahrhundert"],
  [1885, "der Bau des ersten Automobils durch Carl Benz", "19. Jahrhundert"],
  [1917, "die Oktoberrevolution in Russland", "20. Jahrhundert"],
  [1929, "der Beginn der Weltwirtschaftskrise", "20. Jahrhundert"],
  [1936, "die Olympischen Spiele in Berlin", "20. Jahrhundert"],
  [1948, "die Währungsreform in den Westzonen", "20. Jahrhundert"],
  [1957, "die Unterzeichnung der Römischen Verträge (EWG)", "20. Jahrhundert"],
  [1962, "die Kubakrise", "20. Jahrhundert"],
  [1986, "die Reaktorkatastrophe von Tschernobyl", "20. Jahrhundert"],
  [1992, "der Vertrag von Maastricht zur Gründung der EU", "20. Jahrhundert"],
];
// [person, tat, epoche]
const HIST_PERSON = [
  ["Julius Cäsar", "war ein römischer Feldherr und Staatsmann", "Antike"],
  ["Augustus", "war der erste römische Kaiser", "Antike"],
  ["Karl der Große", "wurde 800 zum Kaiser gekrönt", "Mittelalter"],
  ["Martin Luther", "löste mit seinen Thesen die Reformation aus", "Frühe Neuzeit"],
  ["Christoph Kolumbus", "erreichte 1492 Amerika", "Frühe Neuzeit"],
  ["Johannes Gutenberg", "erfand den Buchdruck mit beweglichen Lettern", "Frühe Neuzeit"],
  ["Napoleon Bonaparte", "war ein französischer Kaiser und Feldherr", "19. Jahrhundert"],
  ["Otto von Bismarck", "war der erste Reichskanzler des Deutschen Reiches", "19. Jahrhundert"],
  ["Adolf Hitler", "war der Diktator des nationalsozialistischen Deutschlands", "20. Jahrhundert"],
  ["Winston Churchill", "war der britische Premierminister im Zweiten Weltkrieg", "20. Jahrhundert"],
  ["Konrad Adenauer", "war der erste Bundeskanzler der Bundesrepublik", "20. Jahrhundert"],
  ["John F. Kennedy", "war US-Präsident und wurde 1963 ermordet", "20. Jahrhundert"],
  ["Neil Armstrong", "betrat 1969 als erster Mensch den Mond", "20. Jahrhundert"],
  ["Michail Gorbatschow", "leitete mit Glasnost und Perestroika Reformen ein", "20. Jahrhundert"],
  ["Willy Brandt", "war Bundeskanzler und betrieb die Ostpolitik", "20. Jahrhundert"],
  ["Alexander der Große", "schuf ein Weltreich bis nach Indien", "Antike"],
  ["Kleopatra", "war die letzte Pharaonin Ägyptens", "Antike"],
  ["Karl Martell", "siegte 732 bei Tours und Poitiers", "Mittelalter"],
  ["Otto I.", "wurde 962 zum Kaiser gekrönt", "Mittelalter"],
  ["Friedrich Barbarossa", "war ein Kaiser des Mittelalters aus dem Haus der Staufer", "Mittelalter"],
  ["Nikolaus Kopernikus", "begründete das heliozentrische Weltbild", "Frühe Neuzeit"],
  ["Galileo Galilei", "verteidigte das heliozentrische Weltbild mit dem Fernrohr", "Frühe Neuzeit"],
  ["Isaac Newton", "formulierte die Gesetze der Gravitation", "Frühe Neuzeit"],
  ["George Washington", "war der erste Präsident der USA", "Frühe Neuzeit"],
  ["Carl Benz", "baute 1885 das erste Automobil", "19. Jahrhundert"],
  ["Wladimir Lenin", "führte die Oktoberrevolution 1917 an", "20. Jahrhundert"],
  ["Mahatma Gandhi", "führte den gewaltfreien Widerstand in Indien an", "20. Jahrhundert"],
];

function geschichteGenerators(k) {
  const eventsForClass = HIST_EVENTS; // Jahreszahlen über alle Epochen
  const gens = [
    // Jahr → Ereignis
    (r) => {
      const [y, ev, ep] = r.pick(eventsForClass);
      const same = eventsForClass.filter((e) => e[2] === ep && e[1] !== ev).map((e) => e[1]);
      const pool = same.length >= 3 ? same : eventsForClass.filter((e) => e[1] !== ev).map((e) => e[1]);
      const yr = y < 0 ? `${-y} v. Chr.` : `${y}`;
      return mc(r, "Jahreszahlen", `${r.pick(HIST_LEADS)}Welches Ereignis fand ${yr} statt?`, ev, pickN(r, pool, ev, 3), `${yr}: ${ev}.`);
    },
    // Ereignis → Jahr (nahe Jahreszahlen)
    (r) => {
      const [y, ev] = r.pick(eventsForClass);
      const yr = y < 0 ? `${-y} v. Chr.` : `${y}`;
      const dist = (y < 0 ? [-y - 1, -y + 1, -y - 3, -y + 3, -y - 5, -y + 5] : [y - 1, y + 1, y - 3, y + 3, y - 5, y + 5]).map((v) => (y < 0 ? `${v} v. Chr.` : `${v}`));
      return mc(r, "Jahreszahlen", `${r.pick(HIST_LEADS)}In welchem Jahr geschah ${ev}?`, yr, pickN(r, dist, yr, 3), `${ev}: ${yr}.`);
    },
    // Person → Tat
    (r) => {
      const [p, tat, ep] = r.pick(HIST_PERSON);
      const same = HIST_PERSON.filter((x) => x[2] === ep && x[1] !== tat).map((x) => x[1]);
      const pool = same.length >= 3 ? same : HIST_PERSON.filter((x) => x[1] !== tat).map((x) => x[1]);
      return mc(r, "Personen", `${r.pick(HIST_LEADS)}Was trifft auf ${p.trim()} zu?`, tat, pickN(r, pool, tat, 3), `${p.trim()} ${tat}.`);
    },
    // Tat → Person (Personen derselben Epoche als Distraktoren)
    (r) => {
      const [p, tat, ep] = r.pick(HIST_PERSON);
      const same = HIST_PERSON.filter((x) => x[2] === ep && x[0].trim() !== p.trim()).map((x) => x[0].trim());
      const pool = same.length >= 3 ? same : HIST_PERSON.filter((x) => x[0].trim() !== p.trim()).map((x) => x[0].trim());
      return mc(r, "Personen", `${r.pick(HIST_LEADS)}Welche Person ${tat}?`, p.trim(), pickN(r, pool, p.trim(), 3), `${p.trim()} ${tat}.`);
    },
  ];
  return gens;
}

/* ══════════════════════════════ ERDKUNDE ══════════════════════════════ */

const LAND_HAUPTSTADT = [
  ["Deutschland", "Berlin"], ["Frankreich", "Paris"], ["Italien", "Rom"], ["Spanien", "Madrid"],
  ["Portugal", "Lissabon"], ["Großbritannien", "London"], ["Irland", "Dublin"], ["Niederlande", "Amsterdam"],
  ["Belgien", "Brüssel"], ["Luxemburg", "Luxemburg"], ["Schweiz", "Bern"], ["Österreich", "Wien"],
  ["Dänemark", "Kopenhagen"], ["Schweden", "Stockholm"], ["Norwegen", "Oslo"], ["Finnland", "Helsinki"],
  ["Polen", "Warschau"], ["Tschechien", "Prag"], ["Slowakei", "Bratislava"], ["Ungarn", "Budapest"],
  ["Griechenland", "Athen"], ["Kroatien", "Zagreb"], ["Slowenien", "Ljubljana"], ["Rumänien", "Bukarest"],
  ["Bulgarien", "Sofia"], ["Serbien", "Belgrad"], ["Russland", "Moskau"], ["Ukraine", "Kiew"],
  ["Türkei", "Ankara"], ["Island", "Reykjavík"], ["USA", "Washington, D.C."], ["Kanada", "Ottawa"],
  ["Mexiko", "Mexiko-Stadt"], ["Brasilien", "Brasília"], ["Argentinien", "Buenos Aires"], ["Chile", "Santiago"],
  ["Peru", "Lima"], ["Kolumbien", "Bogotá"], ["China", "Peking"], ["Japan", "Tokio"],
  ["Indien", "Neu-Delhi"], ["Südkorea", "Seoul"], ["Thailand", "Bangkok"], ["Vietnam", "Hanoi"],
  ["Indonesien", "Jakarta"], ["Ägypten", "Kairo"], ["Marokko", "Rabat"], ["Kenia", "Nairobi"],
  ["Nigeria", "Abuja"], ["Südafrika", "Pretoria"], ["Australien", "Canberra"], ["Neuseeland", "Wellington"],
];
const LAND_KONTINENT = [
  ["Deutschland", "Europa"], ["Ägypten", "Afrika"], ["Brasilien", "Südamerika"], ["China", "Asien"],
  ["Australien", "Australien"], ["Kanada", "Nordamerika"], ["Nigeria", "Afrika"], ["Japan", "Asien"],
  ["Argentinien", "Südamerika"], ["Frankreich", "Europa"], ["Indien", "Asien"], ["Mexiko", "Nordamerika"],
  ["Kenia", "Afrika"], ["Peru", "Südamerika"], ["Italien", "Europa"], ["Thailand", "Asien"],
  ["Marokko", "Afrika"], ["Chile", "Südamerika"], ["USA", "Nordamerika"], ["Neuseeland", "Australien"],
];
const BUNDESLAND = [
  ["Bayern", "München"], ["Baden-Württemberg", "Stuttgart"], ["Hessen", "Wiesbaden"], ["Nordrhein-Westfalen", "Düsseldorf"],
  ["Niedersachsen", "Hannover"], ["Rheinland-Pfalz", "Mainz"], ["Saarland", "Saarbrücken"], ["Sachsen", "Dresden"],
  ["Sachsen-Anhalt", "Magdeburg"], ["Thüringen", "Erfurt"], ["Brandenburg", "Potsdam"], ["Mecklenburg-Vorpommern", "Schwerin"],
  ["Schleswig-Holstein", "Kiel"], ["Berlin", "Berlin"], ["Hamburg", "Hamburg"], ["Bremen", "Bremen"],
];
const FLUSS_KONTINENT = [
  ["der Rhein", "Europa"], ["die Donau", "Europa"], ["die Elbe", "Europa"], ["die Wolga", "Europa"],
  ["der Nil", "Afrika"], ["der Kongo", "Afrika"], ["der Amazonas", "Südamerika"], ["der Mississippi", "Nordamerika"],
  ["der Jangtsekiang", "Asien"], ["der Ganges", "Asien"], ["der Mekong", "Asien"], ["der Murray", "Australien"],
  ["die Seine", "Europa"], ["die Themse", "Europa"], ["der Colorado", "Nordamerika"], ["der Sambesi", "Afrika"],
];
const GEBIRGE_ORT = [
  ["die Alpen", "Europa"], ["die Anden", "Südamerika"], ["der Himalaya", "Asien"], ["die Rocky Mountains", "Nordamerika"],
  ["die Pyrenäen", "Europa"], ["der Ural", "Europa/Asien"], ["das Atlasgebirge", "Afrika"], ["die Karpaten", "Europa"],
  ["der Kaukasus", "Europa/Asien"], ["die Appalachen", "Nordamerika"], ["das Kilimandscharo-Massiv", "Afrika"], ["die Sierra Nevada", "Nordamerika"],
];

function erdkundeGenerators(k) {
  const gens = [];
  gens.push(...factGens("Hauptstädte", LAND_HAUPTSTADT, (t) => `Wie heißt die Hauptstadt von ${t}?`, (d) => `${d} ist die Hauptstadt welchen Landes?`, GEO_LEADS));
  gens.push(...factGens("Kontinente", LAND_KONTINENT, (t) => `Auf welchem Kontinent liegt ${t}?`, (d) => `Nenne ein Land, das in ${d} liegt.`, GEO_LEADS));
  gens.push(...factGens("Bundesländer", BUNDESLAND, (t) => `Wie heißt die Landeshauptstadt von ${t}?`, (d) => `${d} ist die Hauptstadt welches Bundeslandes?`, GEO_LEADS));
  gens.push(...factGens("Flüsse", FLUSS_KONTINENT, (t) => `Auf welchem Kontinent liegt ${t}?`, (d) => `Nenne einen Fluss auf dem Kontinent ${d}.`, GEO_LEADS));
  gens.push(...factGens("Gebirge", GEBIRGE_ORT, (t) => `Wo liegt ${t}?`, (d) => `Nenne ein Gebirge in ${d}.`, GEO_LEADS));
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

  console.log("Deutsch (Klasse 5–10, je >= 800):");
  for (let k = 5; k <= 10; k++) total += writeBank("deutsch", k, generateBank(5000 + k, 800, deutschGenerators(k)));

  console.log("Englisch (Klasse 11–13, je >= 600):");
  for (let k = 11; k <= 13; k++) total += writeBank("englisch", k, generateBank(6000 + k, 600, englisch11to13Generators(k)));

  console.log("Biologie (Klasse 5–10, je >= 500):");
  for (let k = 5; k <= 10; k++) total += writeBank("biologie", k, generateBank(7000 + k, 500, biologieGenerators(k)));

  console.log("Geschichte (Klasse 6–10, je >= 400):");
  for (let k = 6; k <= 10; k++) total += writeBank("geschichte", k, generateBank(8000 + k, 400, geschichteGenerators(k)));

  console.log("Erdkunde (Klasse 5–8, je >= 400):");
  for (let k = 5; k <= 8; k++) total += writeBank("erdkunde", k, generateBank(9000 + k, 400, erdkundeGenerators(k)));

  console.log(`\nGesamt (Runde 2): ${total} Fragen.`);
}

main();
