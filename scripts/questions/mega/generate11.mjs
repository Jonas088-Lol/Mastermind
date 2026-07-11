/**
 * MEGA-Fragen-Generator RUNDE 11 für MasterMind — Schwerpunkt GRUNDSCHULE.
 *
 * Ergänzt die Fragenbank aus generate.mjs … generate8.mjs im GLEICHEN Format
 *   scripts/questions/mega/data/<fach>-klasse<k>.json
 * mit [{ topic, question, options[4], correct(Index), explanation }].
 *
 * Fächer/Umfang (nur NEUE Dateien mit Präfix deutsch5-/sachkunde-/mathematik7-):
 *   1) deutsch5     Klasse 1–4, >= 400/Klasse
 *      (Anlaute, Reime, Silben klatschen, Wortarten, Einzahl/Mehrzahl,
 *       wörtliche Rede, zusammengesetzte Nomen, ABC-Reihenfolge)
 *   2) sachkunde    Klasse 1–4, >= 350/Klasse
 *      (Jahreszeiten/Monate/Wochentage, Tiere Wald/Bauernhof, Verkehrserziehung,
 *       Körper/Ernährung, Wetter, Deutschland-Basics ab Klasse 4)
 *   3) mathematik7  Klasse 1–2, >= 350/Klasse
 *      (Zahlzerlegung bis 10/20, Verdoppeln/Halbieren, Nachbarzahlen,
 *       größte/kleinste Zahl, Muster, Tauschaufgaben — exakt berechnet)
 *
 * Deterministisch (mulberry32-Seed). Keine Abhängigkeiten, reines Node.
 *
 * Aufruf (vom Repo-Root):
 *   node scripts/questions/mega/generate11.mjs
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

/** Zahlen-Distraktoren ±1/±2 (nie negativ, nie gleich der Lösung). */
function nearNumbers(rng, correct) {
  const set = new Set([correct]);
  const out = [];
  let guard = 0;
  while (out.length < 3 && guard < 100) {
    guard++;
    const delta = rng.int(1, 2) * (rng.next() < 0.5 ? -1 : 1);
    const cand = correct + delta;
    if (cand < 0 || set.has(cand)) continue;
    set.add(cand);
    out.push(cand);
  }
  // Notfall: nach oben auffüllen
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

/* ══════════════════ 1) DEUTSCH Klasse 1–4 ══════════════════ */

// [Wort, Anlaut-Buchstabe]
const ANLAUT_WOERTER = [
  ["Apfel", "A"], ["Ampel", "A"], ["Affe", "A"], ["Anker", "A"], ["Auto", "A"],
  ["Ball", "B"], ["Baum", "B"], ["Banane", "B"], ["Buch", "B"], ["Blume", "B"],
  ["Clown", "C"], ["Computer", "C"],
  ["Dose", "D"], ["Drache", "D"], ["Delfin", "D"], ["Daumen", "D"],
  ["Elefant", "E"], ["Ente", "E"], ["Esel", "E"], ["Eimer", "E"],
  ["Fisch", "F"], ["Fenster", "F"], ["Feder", "F"], ["Frosch", "F"],
  ["Gabel", "G"], ["Garten", "G"], ["Giraffe", "G"], ["Glocke", "G"],
  ["Haus", "H"], ["Hund", "H"], ["Hase", "H"], ["Hammer", "H"],
  ["Igel", "I"], ["Insel", "I"],
  ["Jacke", "J"], ["Junge", "J"],
  ["Katze", "K"], ["Kerze", "K"], ["Koffer", "K"], ["Krone", "K"],
  ["Lampe", "L"], ["Löwe", "L"], ["Leiter", "L"], ["Luftballon", "L"],
  ["Maus", "M"], ["Mond", "M"], ["Mütze", "M"], ["Melone", "M"],
  ["Nase", "N"], ["Nest", "N"], ["Nadel", "N"],
  ["Ofen", "O"], ["Oma", "O"], ["Orange", "O"],
  ["Puppe", "P"], ["Pinsel", "P"], ["Pilz", "P"], ["Papagei", "P"],
  ["Rose", "R"], ["Rakete", "R"], ["Regen", "R"], ["Roller", "R"],
  ["Sonne", "S"], ["Schuh", "S"], ["Stern", "S"], ["Schere", "S"],
  ["Tisch", "T"], ["Tasse", "T"], ["Tiger", "T"], ["Turm", "T"],
  ["Uhr", "U"], ["Ufo", "U"],
  ["Vogel", "V"], ["Vase", "V"],
  ["Wolke", "W"], ["Wurm", "W"], ["Wal", "W"], ["Wiese", "W"],
  ["Zebra", "Z"], ["Zange", "Z"], ["Zug", "Z"], ["Zitrone", "Z"],
];
const ALLE_ANLAUTE = [...new Set(ANLAUT_WOERTER.map(([, b]) => b))];

// [Wort, passender Reim, Nicht-Reime]
const REIME = [
  ["Haus", "Maus", ["Baum", "Tisch", "Sonne"]],
  ["Hund", "rund", ["Katze", "Ball", "Blume"]],
  ["Nase", "Hase", ["Auge", "Ohr", "Fuß"]],
  ["Bein", "Stein", ["Arm", "Hand", "Kopf"]],
  ["Katze", "Tatze", ["Hund", "Vogel", "Fisch"]],
  ["Tanne", "Kanne", ["Eiche", "Blatt", "Wald"]],
  ["Wein", "Schwein", ["Saft", "Wasser", "Milch"]],
  ["Rose", "Dose", ["Tulpe", "Blatt", "Garten"]],
  ["Hut", "gut", ["Mütze", "Schal", "Jacke"]],
  ["Wand", "Sand", ["Mauer", "Dach", "Tür"]],
  ["Nacht", "acht", ["Tag", "Mond", "Stern"]],
  ["Licht", "Gesicht", ["Lampe", "Kerze", "Sonne"]],
  ["Tisch", "Fisch", ["Stuhl", "Bank", "Schrank"]],
  ["Turm", "Wurm", ["Burg", "Haus", "Mauer"]],
  ["Wiese", "Riese", ["Gras", "Feld", "Blume"]],
  ["Schnecke", "Ecke", ["Wurm", "Käfer", "Biene"]],
  ["Brille", "Grille", ["Auge", "Nase", "Glas"]],
  ["Schuh", "Kuh", ["Socke", "Fuß", "Stiefel"]],
  ["Torte", "Worte", ["Kuchen", "Sahne", "Kekse"]],
  ["Hose", "Rose", ["Hemd", "Rock", "Schuh"]],
  ["Bär", "Meer", ["Wolf", "Fuchs", "Hase"]],
  ["Zug", "Krug", ["Bahn", "Auto", "Bus"]],
  ["Sonne", "Tonne", ["Mond", "Wolke", "Regen"]],
  ["Kind", "Wind", ["Mutter", "Vater", "Oma"]],
  ["Traum", "Baum", ["Schlaf", "Bett", "Nacht"]],
  ["Herz", "Schmerz", ["Liebe", "Blut", "Hand"]],
  ["Ente", "Rente", ["Gans", "Huhn", "Vogel"]],
  ["Ziege", "Fliege", ["Schaf", "Kuh", "Pferd"]],
  ["Boot", "rot", ["Schiff", "Wasser", "See"]],
  ["Reis", "Eis", ["Nudel", "Brot", "Suppe"]],
  ["Land", "Hand", ["Meer", "Stadt", "Dorf"]],
  ["Wagen", "tragen", ["Auto", "Rad", "Fahrer"]],
  ["Igel", "Spiegel", ["Hase", "Maus", "Fuchs"]],
  ["Blatt", "satt", ["Baum", "Ast", "Wurzel"]],
  ["Schwan", "Hahn", ["Ente", "Gans", "Taube"]],
  ["Kanne", "Pfanne", ["Topf", "Tasse", "Teller"]],
];

// [Wort mit Silbentrennung, Silbenzahl]
const SILBEN = [
  ["Ball", 1], ["Hund", 1], ["Baum", 1], ["Fisch", 1], ["Maus", 1],
  ["Buch", 1], ["Stern", 1], ["Zug", 1], ["Brot", 1], ["Haus", 1],
  ["Ap-fel", 2], ["Son-ne", 2], ["Kat-ze", 2], ["Blu-me", 2], ["Ta-sche", 2],
  ["Va-ter", 2], ["Mut-ter", 2], ["Gar-ten", 2], ["Fen-ster", 2], ["Wol-ke", 2],
  ["Ha-se", 2], ["Lam-pe", 2], ["Pup-pe", 2], ["Ro-se", 2], ["Ti-ger", 2],
  ["Vo-gel", 2], ["Schu-le", 2], ["Ker-ze", 2], ["Wie-se", 2], ["En-te", 2],
  ["Ba-na-ne", 3], ["To-ma-te", 3], ["Ra-ke-te", 3], ["Pa-pa-gei", 3],
  ["E-le-fant", 3], ["Zi-tro-ne", 3], ["Kro-ko-dil", 3], ["Te-le-fon", 3],
  ["Me-lo-ne", 3], ["Gi-raf-fe", 3], ["A-mei-se", 3], ["Him-bee-re", 3],
  ["Kar-tof-fel", 3], ["Ma-ri-en-kä-fer", 5], ["Schmet-ter-ling", 3],
  ["Scho-ko-la-de", 4], ["Was-ser-me-lo-ne", 5], ["Kin-der-gar-ten", 4],
  ["Fuß-ball-platz", 3], ["Re-gen-bo-gen", 4], ["A-vo-ca-do", 4],
  ["Lo-ko-mo-ti-ve", 5], ["Ho-sen-ta-sche", 4], ["Blu-men-wie-se", 4],
];

const NAMENWOERTER = ["Hund", "Schule", "Blume", "Tisch", "Freude", "Auto", "Lehrerin", "Garten", "Brot", "Wetter", "Katze", "Fenster", "Buch", "Sonne", "Kind"];
const TUNWOERTER = ["laufen", "singen", "malen", "lesen", "springen", "schreiben", "lachen", "schwimmen", "essen", "schlafen", "rechnen", "spielen", "tanzen", "bauen", "werfen"];
const WIEWOERTER = ["schnell", "bunt", "leise", "groß", "fröhlich", "kalt", "mutig", "weich", "hell", "klein", "süß", "stark", "müde", "warm", "rund"];

// [Einzahl mit Artikel, richtige Mehrzahl, falsche Mehrzahlen]
const MEHRZAHL = [
  ["der Hund", "die Hunde", ["die Hünde", "die Hunds", "die Hunden"]],
  ["die Katze", "die Katzen", ["die Katzes", "die Kätze", "die Katzenen"]],
  ["das Haus", "die Häuser", ["die Hause", "die Häusen", "die Hauser"]],
  ["der Baum", "die Bäume", ["die Baume", "die Bäumer", "die Baums"]],
  ["das Kind", "die Kinder", ["die Kinde", "die Kinds", "die Kindern"]],
  ["die Maus", "die Mäuse", ["die Mause", "die Mäuser", "die Mausen"]],
  ["das Buch", "die Bücher", ["die Buche", "die Buchs", "die Büchern"]],
  ["der Apfel", "die Äpfel", ["die Apfeln", "die Apfels", "die Äpfeln"]],
  ["die Blume", "die Blumen", ["die Blümen", "die Blumes", "die Blume"]],
  ["der Tisch", "die Tische", ["die Tischen", "die Tischer", "die Tischs"]],
  ["der Stuhl", "die Stühle", ["die Stuhle", "die Stühler", "die Stuhlen"]],
  ["das Auto", "die Autos", ["die Auten", "die Autoen", "die Autor"]],
  ["der Vogel", "die Vögel", ["die Vogeln", "die Vogels", "die Vögeln"]],
  ["die Hand", "die Hände", ["die Hande", "die Händer", "die Handen"]],
  ["der Fuß", "die Füße", ["die Fuße", "die Füßer", "die Fußen"]],
  ["das Bild", "die Bilder", ["die Bilde", "die Bilds", "die Bildern"]],
  ["die Stadt", "die Städte", ["die Stadte", "die Städter", "die Stadts"]],
  ["der Zug", "die Züge", ["die Zuge", "die Züger", "die Zugs"]],
  ["das Glas", "die Gläser", ["die Glase", "die Gläsern", "die Glaser"]],
  ["die Nacht", "die Nächte", ["die Nachte", "die Nächter", "die Nachts"]],
  ["der Ball", "die Bälle", ["die Balle", "die Bäller", "die Ballen"]],
  ["das Wort", "die Wörter", ["die Worte sind falsch", "die Wörtern", "die Worts"]],
  ["die Schule", "die Schulen", ["die Schülen", "die Schules", "die Schuler"]],
  ["der Lehrer", "die Lehrer", ["die Lehrers", "die Lehreren", "die Lehrern"]],
  ["die Frau", "die Frauen", ["die Fraus", "die Fräue", "die Frauens"]],
  ["der Mann", "die Männer", ["die Manne", "die Männern", "die Manns"]],
];

// Bausteine für wörtliche Rede
const REDE_NAMEN = ["Lisa", "Tom", "Mia", "Ben", "Emma", "Paul", "Lena", "Max", "Anna", "Finn"];
const REDE_SAETZE = [
  "Ich komme mit", "Das ist toll", "Mein Heft liegt zu Hause", "Heute scheint die Sonne",
  "Ich habe Hunger", "Morgen gehen wir schwimmen", "Das Buch ist spannend",
  "Ich helfe dir", "Wir spielen im Garten", "Der Kuchen schmeckt lecker",
];
const REDE_VERBEN = ["sagt", "ruft", "flüstert", "erklärt", "antwortet"];

// [Wort1, Wort2, richtiges zusammengesetztes Nomen mit Artikel]
const ZUSAMMENSETZUNGEN = [
  ["Haus", "Tür", "die Haustür"], ["Fuß", "Ball", "der Fußball"],
  ["Sonne", "Blume", "die Sonnenblume"], ["Regen", "Schirm", "der Regenschirm"],
  ["Schul", "Hof", "der Schulhof"], ["Apfel", "Baum", "der Apfelbaum"],
  ["Butter", "Brot", "das Butterbrot"], ["Winter", "Jacke", "die Winterjacke"],
  ["Tisch", "Bein", "das Tischbein"], ["Buch", "Seite", "die Buchseite"],
  ["Auto", "Bahn", "die Autobahn"], ["Hand", "Schuh", "der Handschuh"],
  ["Kinder", "Zimmer", "das Kinderzimmer"], ["Blumen", "Topf", "der Blumentopf"],
  ["Wasser", "Fall", "der Wasserfall"], ["Feuer", "Wehr", "die Feuerwehr"],
  ["Zahn", "Bürste", "die Zahnbürste"], ["Geburtstag", "Kuchen", "der Geburtstagskuchen"],
  ["Schnee", "Mann", "der Schneemann"], ["Spiel", "Platz", "der Spielplatz"],
  ["Nacht", "Himmel", "der Nachthimmel"], ["Sommer", "Ferien", "die Sommerferien"],
  ["Brief", "Kasten", "der Briefkasten"], ["Baum", "Haus", "das Baumhaus"],
];

const ABC_WOERTER = [
  "Ampel", "Affe", "Ball", "Banane", "Buch", "Dose", "Drache", "Ente", "Esel",
  "Fisch", "Frosch", "Gabel", "Haus", "Hund", "Igel", "Jacke", "Katze", "Krone",
  "Lampe", "Löwe", "Maus", "Mond", "Nase", "Ofen", "Puppe", "Pilz", "Rose",
  "Sonne", "Stern", "Tisch", "Uhr", "Vogel", "Wolke", "Zebra", "Zug",
];

function deutsch5Generators(klasse) {
  const gens = [];

  if (klasse <= 2) {
    // Anlaute
    gens.push((r) => {
      const [wort, anlaut] = r.pick(ANLAUT_WOERTER);
      return mc(r, "Anlaute",
        `${r.pick(LEADS)}Mit welchem Buchstaben beginnt das Wort „${wort}“?`,
        anlaut, pickN(r, ALLE_ANLAUTE, anlaut, 3),
        `„${wort}“ beginnt mit dem Buchstaben ${anlaut}.`);
    });
    gens.push((r) => {
      const anlaut = r.pick(ALLE_ANLAUTE);
      const passend = ANLAUT_WOERTER.filter(([, b]) => b === anlaut);
      const andere = ANLAUT_WOERTER.filter(([, b]) => b !== anlaut).map(([w]) => w);
      const [wort] = r.pick(passend);
      return mc(r, "Anlaute",
        `${r.pick(LEADS)}Welches Wort beginnt mit dem Buchstaben ${anlaut}?`,
        wort, pickN(r, andere, wort, 3),
        `„${wort}“ beginnt mit ${anlaut}.`);
    });

    // Reime
    gens.push((r) => {
      const [wort, reim, falsch] = r.pick(REIME);
      return mc(r, "Reime",
        `${r.pick(LEADS)}Welches Wort reimt sich auf „${wort}“?`,
        reim, r.shuffle(falsch),
        `„${wort}“ und „${reim}“ klingen am Ende gleich – sie reimen sich.`);
    });

    // Silben klatschen
    gens.push((r) => {
      const [wort, silben] = r.pick(SILBEN.filter(([, s]) => s <= (klasse === 1 ? 3 : 5)));
      const glatt = wort.replaceAll("-", "");
      return mc(r, "Silben",
        `${r.pick(LEADS)}Wie oft klatschst du beim Wort „${glatt}“ in die Hände (Silben)?`,
        silben, nearNumbers(r, silben).filter((n) => n >= 1).concat([silben + 3]),
        `${glatt} hat ${silben} Silbe${silben === 1 ? "" : "n"}: ${wort}.`);
    });
  }

  if (klasse >= 2 && klasse <= 3) {
    // Wortarten: Wort einordnen
    gens.push((r) => {
      const art = r.pick(["Namenwort", "Tunwort", "Wiewort"]);
      const pool = art === "Namenwort" ? NAMENWOERTER : art === "Tunwort" ? TUNWOERTER : WIEWOERTER;
      const wort = r.pick(pool);
      const label = art === "Namenwort" ? "Namenwort (Nomen)" : art === "Tunwort" ? "Tunwort (Verb)" : "Wiewort (Adjektiv)";
      const andere = ["Namenwort (Nomen)", "Tunwort (Verb)", "Wiewort (Adjektiv)", "Begleiter (Artikel)"].filter((x) => x !== label);
      return mc(r, "Wortarten",
        `${r.pick(LEADS)}Welche Wortart ist das Wort „${wort}“?`,
        label, r.shuffle(andere),
        art === "Namenwort"
          ? `„${wort}“ ist ein Namenwort – man kann „der/die/das“ davorsetzen und es wird großgeschrieben.`
          : art === "Tunwort"
            ? `„${wort}“ ist ein Tunwort – es sagt, was jemand tut.`
            : `„${wort}“ ist ein Wiewort – es beschreibt, wie etwas ist.`);
    });
    // Wortarten: das passende Wort finden
    gens.push((r) => {
      const art = r.pick(["Namenwort", "Tunwort", "Wiewort"]);
      const pools = { Namenwort: NAMENWOERTER, Tunwort: TUNWOERTER, Wiewort: WIEWOERTER };
      const wort = r.pick(pools[art]);
      const andere = Object.entries(pools).filter(([k]) => k !== art).flatMap(([, v]) => v);
      return mc(r, "Wortarten",
        `${r.pick(LEADS)}Welches dieser Wörter ist ein ${art}?`,
        wort, pickN(r, andere, wort, 3),
        `„${wort}“ ist ein ${art}.`);
    });
    // Einzahl/Mehrzahl
    gens.push((r) => {
      const [ez, mz, falsch] = r.pick(MEHRZAHL);
      return mc(r, "Einzahl und Mehrzahl",
        `${r.pick(LEADS)}Wie lautet die Mehrzahl von „${ez}“?`,
        mz, r.shuffle(falsch),
        `Die Mehrzahl von „${ez}“ heißt „${mz}“.`);
    });
  }

  if (klasse >= 3) {
    // Wörtliche Rede: richtigen Satz erkennen
    gens.push((r) => {
      const name = r.pick(REDE_NAMEN);
      const verb = r.pick(REDE_VERBEN);
      const satz = r.pick(REDE_SAETZE);
      const richtig = `${name} ${verb}: „${satz}.“`;
      const falsch = [
        `${name} ${verb} „${satz}.“`,
        `${name} ${verb}: ${satz}.`,
        `${name} ${verb}: „${satz}.`,
      ];
      return mc(r, "Wörtliche Rede",
        `${r.pick(LEADS)}In welchem Satz ist die wörtliche Rede richtig gekennzeichnet?`
          .replace("gekennzeichnet?", `gekennzeichnet? (${name} / ${verb} / ${satz})`),
        richtig, r.shuffle(falsch),
        `Vor der wörtlichen Rede steht ein Doppelpunkt, die Rede steht in Anführungszeichen: ${richtig}`);
    });
    // Zusammengesetzte Nomen
    gens.push((r) => {
      const [w1, w2, richtig] = r.pick(ZUSAMMENSETZUNGEN);
      const andere = ZUSAMMENSETZUNGEN.map(([, , z]) => z).filter((z) => z !== richtig);
      return mc(r, "Zusammengesetzte Nomen",
        `${r.pick(LEADS)}Welches zusammengesetzte Nomen entsteht aus „${w1}“ und „${w2}“?`,
        richtig, pickN(r, andere, richtig, 3),
        `${w1} + ${w2} = ${richtig}. Der zweite Baustein bestimmt den Artikel.`);
    });
    // ABC-Reihenfolge
    gens.push((r) => {
      const auswahl = pickN(r, ABC_WOERTER, "", 4);
      const sortiert = auswahl.slice().sort((a, b) => a.localeCompare(b, "de"));
      const richtig = sortiert[0];
      return mc(r, "ABC-Reihenfolge",
        `${r.pick(LEADS)}Welches Wort steht im Alphabet (Wörterbuch) zuerst: ${r.shuffle(auswahl).join(", ")}?`,
        richtig, auswahl.filter((w) => w !== richtig),
        `Alphabetisch geordnet: ${sortiert.join(" → ")}. „${richtig}“ kommt zuerst.`);
    });
    if (klasse === 4) {
      // Silben auch in Klasse 4 (längere Wörter)
      gens.push((r) => {
        const [wort, silben] = r.pick(SILBEN.filter(([, s]) => s >= 3));
        const glatt = wort.replaceAll("-", "");
        return mc(r, "Silben",
          `${r.pick(LEADS)}Aus wie vielen Silben besteht das Wort „${glatt}“?`,
          silben, nearNumbers(r, silben),
          `${glatt} = ${wort} → ${silben} Silben.`);
      });
    }
  }

  return gens;
}

/* ══════════════════ 2) SACHKUNDE Klasse 1–4 ══════════════════ */

const MONATE = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
const WOCHENTAGE = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];
const JAHRESZEIT_MONATE = {
  Winter: ["Dezember", "Januar", "Februar"],
  Frühling: ["März", "April", "Mai"],
  Sommer: ["Juni", "Juli", "August"],
  Herbst: ["September", "Oktober", "November"],
};

const JAHRESZEIT_FAKTEN = [
  ["Wie viele Jahreszeiten gibt es?", "4", ["3", "5", "6"], "Es gibt vier Jahreszeiten: Frühling, Sommer, Herbst und Winter."],
  ["Wie viele Monate hat ein Jahr?", "12", ["10", "11", "13"], "Ein Jahr hat 12 Monate."],
  ["Wie viele Tage hat eine Woche?", "7", ["5", "6", "8"], "Eine Woche hat 7 Tage."],
  ["In welcher Jahreszeit fallen die Blätter von den Bäumen?", "im Herbst", ["im Frühling", "im Sommer", "im Winter"], "Im Herbst färben sich die Blätter bunt und fallen ab."],
  ["In welcher Jahreszeit blühen die ersten Blumen wie Schneeglöckchen?", "im Frühling", ["im Sommer", "im Herbst", "im Winter"], "Im Frühling erwacht die Natur, die ersten Blumen blühen."],
  ["In welcher Jahreszeit kann es schneien und die Tage sind am kürzesten?", "im Winter", ["im Sommer", "im Frühling", "im Herbst"], "Im Winter ist es kalt, es kann schneien, und die Tage sind kurz."],
  ["In welcher Jahreszeit sind die Tage am längsten und wärmsten?", "im Sommer", ["im Winter", "im Herbst", "im Frühling"], "Im Sommer steht die Sonne am höchsten – lange, warme Tage."],
  ["Welcher Monat hat nur 28 oder 29 Tage?", "Februar", ["Januar", "März", "April"], "Der Februar hat 28 Tage, im Schaltjahr 29."],
  ["Wie viele Tage hat ein normales Jahr?", "365", ["360", "364", "366"], "Ein normales Jahr hat 365 Tage, ein Schaltjahr 366."],
  ["Welche Tage gehören zum Wochenende?", "Samstag und Sonntag", ["Freitag und Samstag", "Sonntag und Montag", "Mittwoch und Donnerstag"], "Das Wochenende besteht aus Samstag und Sonntag."],
];

// [Frage, Antwort, Distraktoren, Erklärung]
const TIERE_FAKTEN = [
  ["Wie heißt das Junge vom Pferd?", "Fohlen", ["Kalb", "Ferkel", "Lamm"], "Das Jungtier des Pferdes heißt Fohlen."],
  ["Wie heißt das Junge von der Kuh?", "Kalb", ["Fohlen", "Ferkel", "Küken"], "Das Jungtier der Kuh heißt Kalb."],
  ["Wie heißt das Junge vom Schwein?", "Ferkel", ["Kalb", "Lamm", "Welpe"], "Das Jungtier des Schweins heißt Ferkel."],
  ["Wie heißt das Junge vom Schaf?", "Lamm", ["Kitz", "Ferkel", "Fohlen"], "Das Jungtier des Schafs heißt Lamm."],
  ["Wie heißt das Junge vom Huhn?", "Küken", ["Kalb", "Welpe", "Kitz"], "Aus dem Ei schlüpft das Küken."],
  ["Wie heißt das Junge vom Hund?", "Welpe", ["Kätzchen", "Fohlen", "Frischling"], "Das Jungtier des Hundes heißt Welpe."],
  ["Wie heißt das Junge vom Reh?", "Kitz", ["Lamm", "Kalb", "Welpe"], "Das Jungtier des Rehs heißt Kitz."],
  ["Wie heißt das Junge vom Wildschwein?", "Frischling", ["Ferkel", "Welpe", "Kitz"], "Junge Wildschweine heißen Frischlinge – sie sind gestreift."],
  ["Welches Tier gibt uns Milch?", "die Kuh", ["das Huhn", "der Hund", "die Biene"], "Kühe geben Milch, aus der z. B. Käse und Butter gemacht werden."],
  ["Welches Tier legt Eier, die wir essen?", "das Huhn", ["die Kuh", "das Schwein", "das Pferd"], "Hühner legen Eier."],
  ["Welches Tier liefert Wolle?", "das Schaf", ["das Schwein", "die Kuh", "die Ente"], "Schafe werden geschoren – aus ihrer Wolle entsteht Kleidung."],
  ["Welches Tier macht Honig?", "die Biene", ["die Wespe", "die Fliege", "der Käfer"], "Bienen sammeln Nektar und machen daraus Honig."],
  ["Welches Waldtier hält Winterschlaf?", "der Igel", ["das Reh", "der Fuchs", "das Wildschwein"], "Der Igel hält Winterschlaf; Reh und Fuchs sind auch im Winter aktiv."],
  ["Welches Tier trägt einen Stachelpanzer aus Stacheln?", "der Igel", ["der Hase", "das Eichhörnchen", "der Maulwurf"], "Der Igel rollt sich bei Gefahr zu einer Stachelkugel zusammen."],
  ["Welches Tier sammelt Nüsse als Wintervorrat?", "das Eichhörnchen", ["der Fuchs", "das Reh", "die Amsel"], "Das Eichhörnchen versteckt Nüsse als Vorrat für den Winter."],
  ["Wo lebt der Fuchs?", "im Bau", ["im Nest", "im Stall", "im Kobel"], "Der Fuchs wohnt in einem Bau unter der Erde."],
  ["Wie nennt man das Zuhause des Eichhörnchens?", "Kobel", ["Bau", "Nest", "Höhle"], "Das kugelige Nest des Eichhörnchens heißt Kobel."],
  ["Welcher Vogel klopft mit dem Schnabel an Baumstämme?", "der Specht", ["die Amsel", "die Taube", "der Spatz"], "Der Specht zimmert Höhlen und sucht Insekten unter der Rinde."],
  ["Welches Tier lebt auf dem Bauernhof?", "die Kuh", ["der Wolf", "das Reh", "der Fuchs"], "Kühe sind Nutztiere und leben auf dem Bauernhof."],
  ["Welches Tier lebt im Wald?", "das Reh", ["das Huhn", "die Kuh", "das Schwein"], "Rehe sind Wildtiere und leben im Wald."],
  ["Welcher Vogel fliegt im Herbst in den warmen Süden?", "die Schwalbe", ["die Amsel", "der Specht", "der Spatz"], "Schwalben sind Zugvögel und überwintern im Süden."],
  ["Was frisst ein Eichhörnchen am liebsten?", "Nüsse und Samen", ["Fleisch", "Gras", "Fische"], "Eichhörnchen fressen vor allem Nüsse, Samen und Knospen."],
];

const VERKEHR_FAKTEN = [
  ["Bei welcher Ampelfarbe darfst du über die Straße gehen?", "bei Grün", ["bei Rot", "bei Gelb", "bei jeder Farbe"], "Nur bei Grün gehen – und trotzdem links und rechts schauen."],
  ["Was bedeutet Rot an der Fußgängerampel?", "stehen bleiben und warten", ["schnell rennen", "langsam gehen", "die Augen schließen"], "Bei Rot musst du warten, bis die Ampel Grün zeigt."],
  ["In welche Richtungen schaust du, bevor du eine Straße überquerst?", "links, rechts und noch einmal links", ["nur nach rechts", "nur nach vorne", "gar nicht"], "Merksatz: links – rechts – links, dann erst gehen."],
  ["Wo überquerst du die Straße am sichersten?", "am Zebrastreifen oder an der Ampel", ["zwischen parkenden Autos", "an einer Kurve", "wo es am schnellsten geht"], "Zebrastreifen und Ampeln sind sichere Überwege."],
  ["Was musst du beim Fahrradfahren zum Schutz des Kopfes tragen?", "einen Helm", ["eine Mütze", "eine Kapuze", "nichts"], "Der Fahrradhelm schützt den Kopf bei einem Sturz."],
  ["Welche Form hat das Stoppschild?", "achteckig", ["rund", "dreieckig", "quadratisch"], "Das rote Stoppschild ist achteckig – anhalten und Vorfahrt gewähren."],
  ["Was bedeutet das Stoppschild?", "anhalten und Vorfahrt gewähren", ["schneller fahren", "hupen", "wenden"], "Am Stoppschild muss jedes Fahrzeug anhalten."],
  ["Welche Farbe und Form haben Verbotsschilder meistens?", "rund mit rotem Rand", ["eckig und grün", "dreieckig und blau", "achteckig und gelb"], "Verbotsschilder sind rund mit rotem Rand."],
  ["Welche Form haben Gefahrenschilder (Warnschilder)?", "dreieckig mit rotem Rand", ["rund und blau", "quadratisch und grün", "achteckig"], "Warnschilder sind dreieckig mit rotem Rand."],
  ["Was zeigt ein blaues, rundes Schild mit weißem Fahrrad?", "einen Radweg", ["ein Fahrradverbot", "einen Parkplatz", "eine Baustelle"], "Blaue runde Schilder sind Gebotsschilder – hier: Radweg benutzen."],
  ["Auf welcher Seite des Gehwegs gehst du am besten?", "auf der Innenseite, weg von der Straße", ["direkt am Bordstein", "auf der Straße", "in der Mitte der Straße"], "Geh möglichst weit weg vom Verkehr auf der Innenseite des Gehwegs."],
  ["Warum trägst du im Dunkeln helle Kleidung und Reflektoren?", "damit dich Autofahrer besser sehen", ["weil es wärmer ist", "weil es Vorschrift für Hunde ist", "damit du schneller läufst"], "Reflektoren leuchten im Scheinwerferlicht – du wirst früher gesehen."],
  ["Was machst du, bevor du an der Bushaltestelle einsteigst?", "warten, bis der Bus hält, und nicht drängeln", ["auf die Straße rennen", "den Bus anfassen, während er fährt", "mit dem Roller in den Bus fahren"], "Erst wenn der Bus steht, ruhig einsteigen."],
  ["Wie heißt der gestreifte Fußgängerüberweg?", "Zebrastreifen", ["Tigerstreifen", "Leopardenweg", "Straßenband"], "Der Zebrastreifen hat weiße Streifen wie ein Zebra."],
  ["Was brauchst du am Fahrrad, um bei Dunkelheit gesehen zu werden?", "Licht und Reflektoren", ["eine Hupe", "einen Spoiler", "nichts"], "Ein verkehrssicheres Fahrrad hat vorne weißes und hinten rotes Licht."],
  ["Wen lässt du an der Bordsteinkante zuerst fahren?", "die Fahrzeuge auf der Straße", ["niemanden", "nur Fahrräder", "nur Busse"], "Am Bordstein stehen bleiben und erst gehen, wenn die Straße frei ist."],
];

const KOERPER_FAKTEN = [
  ["Wie viele Sinne hat der Mensch?", "5", ["3", "4", "7"], "Sehen, Hören, Riechen, Schmecken und Tasten sind die fünf Sinne."],
  ["Mit welchem Organ siehst du?", "mit den Augen", ["mit den Ohren", "mit der Nase", "mit der Zunge"], "Die Augen sind das Sinnesorgan zum Sehen."],
  ["Mit welchem Organ hörst du?", "mit den Ohren", ["mit den Augen", "mit der Haut", "mit dem Mund"], "Die Ohren sind das Sinnesorgan zum Hören."],
  ["Mit welchem Organ riechst du?", "mit der Nase", ["mit den Ohren", "mit den Augen", "mit den Händen"], "Die Nase ist das Sinnesorgan zum Riechen."],
  ["Welches Organ pumpt das Blut durch den Körper?", "das Herz", ["die Lunge", "der Magen", "das Gehirn"], "Das Herz ist ein Muskel und pumpt das Blut durch den Körper."],
  ["Mit welchem Organ atmest du?", "mit der Lunge", ["mit dem Herzen", "mit dem Magen", "mit der Leber"], "Die Lunge nimmt beim Einatmen Sauerstoff auf."],
  ["Wie viele Milchzähne bekommt ein Kind?", "20", ["16", "24", "32"], "Kinder haben 20 Milchzähne, Erwachsene bis zu 32 Zähne."],
  ["Wie oft solltest du dir mindestens am Tag die Zähne putzen?", "2-mal", ["gar nicht", "1-mal pro Woche", "nur nach Süßigkeiten"], "Mindestens morgens und abends Zähne putzen."],
  ["Was gibt unserem Körper Halt?", "das Skelett (die Knochen)", ["die Haare", "die Haut allein", "die Fingernägel"], "Das Skelett aus über 200 Knochen stützt den Körper."],
  ["Welches Getränk ist am gesündesten für dich?", "Wasser", ["Cola", "Limonade", "Energydrink"], "Wasser löscht den Durst am besten und enthält keinen Zucker."],
  ["Welches Lebensmittel gehört zum gesunden Obst?", "der Apfel", ["der Schokoriegel", "die Chips", "das Gummibärchen"], "Obst wie Äpfel liefert Vitamine."],
  ["Welches Gemüse ist das?: orange, lang, wächst in der Erde", "die Karotte (Möhre)", ["die Tomate", "die Gurke", "der Salat"], "Die Karotte ist eine orange Wurzel und wächst unter der Erde."],
  ["Wovon solltest du nur wenig essen, weil viel Zucker darin steckt?", "Süßigkeiten", ["Gemüse", "Vollkornbrot", "Obst"], "Zu viel Zucker schadet den Zähnen und dem Körper."],
  ["Warum ist Bewegung wichtig?", "sie hält Muskeln und Herz fit", ["sie macht die Zähne weiß", "sie ersetzt das Schlafen", "sie ist unwichtig"], "Sport und Bewegung stärken Muskeln, Knochen und das Herz."],
  ["Was solltest du vor dem Essen tun?", "die Hände waschen", ["die Schuhe putzen", "laut singen", "die Haare kämmen"], "Händewaschen schützt vor Krankheitserregern."],
  ["Wie viele Stunden Schlaf brauchen Grundschulkinder ungefähr pro Nacht?", "etwa 10", ["etwa 4", "etwa 2", "etwa 16"], "Kinder im Grundschulalter brauchen ungefähr 10 Stunden Schlaf."],
];

const WETTER_FAKTEN = [
  ["Womit misst man die Temperatur?", "mit dem Thermometer", ["mit dem Lineal", "mit der Waage", "mit der Uhr"], "Das Thermometer zeigt die Temperatur in Grad Celsius an."],
  ["Bei wie viel Grad Celsius gefriert Wasser?", "0 °C", ["10 °C", "100 °C", "−50 °C"], "Wasser gefriert bei 0 °C zu Eis."],
  ["Wann entsteht ein Regenbogen?", "wenn Sonne und Regen zusammenkommen", ["nur nachts", "nur im Winter", "wenn es windig ist"], "Sonnenlicht wird in Regentropfen gebrochen – der Regenbogen entsteht."],
  ["Wie viele Farben zählt man beim Regenbogen meistens?", "7", ["3", "5", "10"], "Rot, Orange, Gelb, Grün, Blau, Indigo, Violett – sieben Farben."],
  ["Woraus bestehen Wolken?", "aus vielen winzigen Wassertröpfchen", ["aus Watte", "aus Rauch", "aus Staub allein"], "Wolken bestehen aus winzigen Wassertröpfchen oder Eiskristallen."],
  ["Was fällt bei Temperaturen unter 0 °C statt Regen vom Himmel?", "Schnee", ["nur Hagel", "Nebel", "Tau"], "Bei Kälte gefrieren die Tropfen zu Schneeflocken."],
  ["Wie nennt man gefrorene Regenkörner, die auch im Sommer fallen können?", "Hagel", ["Schnee", "Tau", "Raureif"], "Hagelkörner sind Eiskugeln aus Gewitterwolken."],
  ["Was siehst du zuerst: Blitz oder Donner?", "den Blitz", ["den Donner", "beides gleichzeitig", "keins von beiden"], "Licht ist schneller als Schall – der Blitz kommt zuerst."],
  ["Womit misst man die Windrichtung?", "mit der Wetterfahne (Windfahne)", ["mit dem Thermometer", "mit der Waage", "mit dem Zollstock"], "Die Wetterfahne dreht sich in den Wind und zeigt die Richtung an."],
  ["Wie nennt man eine bodennahe Wolke, in der man schlecht sieht?", "Nebel", ["Hagel", "Tau", "Schnee"], "Nebel ist eine Wolke am Boden aus feinen Wassertröpfchen."],
  ["Was zeigt ein Regenmesser an?", "wie viel Regen gefallen ist", ["wie warm es ist", "wie stark der Wind ist", "wie hell die Sonne scheint"], "Der Regenmesser sammelt Niederschlag und misst seine Menge."],
  ["Was passiert mit einer Pfütze an einem warmen, sonnigen Tag?", "das Wasser verdunstet", ["das Wasser gefriert", "die Pfütze wird größer", "nichts"], "Wärme lässt Wasser verdunsten – es steigt als Wasserdampf auf."],
];

// [Bundesland, Landeshauptstadt]
const BUNDESLAENDER = [
  ["Bayern", "München"], ["Baden-Württemberg", "Stuttgart"], ["Hessen", "Wiesbaden"],
  ["Niedersachsen", "Hannover"], ["Nordrhein-Westfalen", "Düsseldorf"],
  ["Rheinland-Pfalz", "Mainz"], ["Saarland", "Saarbrücken"], ["Sachsen", "Dresden"],
  ["Sachsen-Anhalt", "Magdeburg"], ["Schleswig-Holstein", "Kiel"],
  ["Thüringen", "Erfurt"], ["Brandenburg", "Potsdam"],
  ["Mecklenburg-Vorpommern", "Schwerin"],
];

const DEUTSCHLAND_FAKTEN = [
  ["Wie heißt die Hauptstadt von Deutschland?", "Berlin", ["München", "Hamburg", "Köln"], "Berlin ist die Hauptstadt Deutschlands."],
  ["Wie viele Bundesländer hat Deutschland?", "16", ["12", "14", "18"], "Deutschland besteht aus 16 Bundesländern."],
  ["Welche Farben hat die deutsche Flagge (von oben nach unten)?", "Schwarz, Rot, Gold", ["Rot, Weiß, Blau", "Grün, Weiß, Rot", "Blau, Gelb, Rot"], "Die deutsche Flagge ist schwarz-rot-gold."],
  ["Welcher lange Fluss fließt durch Köln?", "der Rhein", ["die Elbe", "die Donau", "der Main"], "Der Rhein fließt u. a. durch Köln und Düsseldorf."],
  ["An welches Meer grenzt Deutschland im Norden?", "an Nord- und Ostsee", ["an das Mittelmeer", "an den Atlantik direkt", "an gar kein Meer"], "Im Norden liegen Nordsee und Ostsee."],
  ["Welches Gebirge liegt ganz im Süden Deutschlands?", "die Alpen", ["der Harz", "das Erzgebirge", "der Schwarzwald liegt im Norden"], "Die Alpen mit der Zugspitze liegen im Süden."],
  ["Wie heißt der höchste Berg Deutschlands?", "die Zugspitze", ["der Brocken", "die Wasserkuppe", "der Feldberg"], "Die Zugspitze (2962 m) ist Deutschlands höchster Berg."],
  ["Welche drei Bundesländer sind Stadtstaaten?", "Berlin, Hamburg und Bremen", ["Bayern, Hessen und Sachsen", "Kiel, Mainz und Erfurt", "Köln, Frankfurt und Dortmund"], "Berlin, Hamburg und Bremen sind Städte und zugleich Bundesländer."],
  ["Welches Nachbarland liegt südlich von Deutschland?", "Österreich", ["Dänemark", "Polen", "Niederlande"], "Im Süden grenzen Österreich und die Schweiz an Deutschland."],
  ["Welches Nachbarland liegt nördlich von Deutschland?", "Dänemark", ["Österreich", "Schweiz", "Frankreich"], "Im Norden grenzt Dänemark an Deutschland."],
];

function sachkundeGenerators(klasse) {
  const gens = [];

  // Jahreszeiten/Wochentage/Monate – Fakten
  gens.push((r) => {
    const [q, a, d, e] = r.pick(JAHRESZEIT_FAKTEN);
    return mc(r, "Zeit und Jahreszeiten", `${r.pick(LEADS)}${q}`, a, r.shuffle(d), e);
  });
  // Wochentag danach/davor
  gens.push((r) => {
    const i = r.int(0, 6);
    const danach = r.next() < 0.5;
    const ziel = WOCHENTAGE[(i + (danach ? 1 : 6)) % 7];
    return mc(r, "Zeit und Jahreszeiten",
      `${r.pick(LEADS)}Welcher Wochentag kommt direkt ${danach ? "nach" : "vor"} ${WOCHENTAGE[i]}?`,
      ziel, pickN(r, WOCHENTAGE, ziel, 3).filter((t) => t !== WOCHENTAGE[i]).concat([WOCHENTAGE[(i + 3) % 7]]),
      `${danach ? "Nach" : "Vor"} ${WOCHENTAGE[i]} kommt ${ziel}.`);
  });

  if (klasse >= 2) {
    // Monat danach/davor
    gens.push((r) => {
      const i = r.int(0, 11);
      const danach = r.next() < 0.5;
      const ziel = MONATE[(i + (danach ? 1 : 11)) % 12];
      return mc(r, "Zeit und Jahreszeiten",
        `${r.pick(LEADS)}Welcher Monat kommt direkt ${danach ? "nach" : "vor"} dem ${MONATE[i]}?`,
        ziel, pickN(r, MONATE, ziel, 3).filter((m) => m !== MONATE[i]).concat([MONATE[(i + 5) % 12]]),
        `${danach ? "Nach" : "Vor"} dem ${MONATE[i]} kommt der ${ziel}.`);
    });
    // Monat → Jahreszeit
    gens.push((r) => {
      const jz = r.pick(Object.keys(JAHRESZEIT_MONATE));
      const monat = r.pick(JAHRESZEIT_MONATE[jz]);
      return mc(r, "Zeit und Jahreszeiten",
        `${r.pick(LEADS)}Zu welcher Jahreszeit gehört der Monat ${monat}?`,
        jz, Object.keys(JAHRESZEIT_MONATE).filter((x) => x !== jz),
        `Der ${monat} gehört zum ${jz} (${JAHRESZEIT_MONATE[jz].join(", ")}).`);
    });
    // Der wievielte Monat?
    gens.push((r) => {
      const i = r.int(0, 11);
      return mc(r, "Zeit und Jahreszeiten",
        `${r.pick(LEADS)}Der wievielte Monat im Jahr ist der ${MONATE[i]}?`,
        `der ${i + 1}.`, nearNumbers(r, i + 1).filter((n) => n >= 1 && n <= 12).map((n) => `der ${n}.`).concat([`der ${((i + 6) % 12) + 1}.`]),
        `Der ${MONATE[i]} ist der ${i + 1}. Monat des Jahres.`);
    });
  }

  // Tiere
  gens.push((r) => {
    const [q, a, d, e] = r.pick(TIERE_FAKTEN);
    return mc(r, "Tiere", `${r.pick(LEADS)}${q}`, a, r.shuffle(d), e);
  });

  // Verkehrserziehung
  gens.push((r) => {
    const [q, a, d, e] = r.pick(VERKEHR_FAKTEN);
    return mc(r, "Verkehrserziehung", `${r.pick(LEADS)}${q}`, a, r.shuffle(d), e);
  });

  // Körper & Ernährung
  gens.push((r) => {
    const [q, a, d, e] = r.pick(KOERPER_FAKTEN);
    return mc(r, "Körper und Ernährung", `${r.pick(LEADS)}${q}`, a, r.shuffle(d), e);
  });

  // Wetter
  gens.push((r) => {
    const [q, a, d, e] = r.pick(WETTER_FAKTEN);
    return mc(r, "Wetter", `${r.pick(LEADS)}${q}`, a, r.shuffle(d), e);
  });

  if (klasse >= 4) {
    // Deutschland-Fakten
    gens.push((r) => {
      const [q, a, d, e] = r.pick(DEUTSCHLAND_FAKTEN);
      return mc(r, "Deutschland", `${r.pick(LEADS)}${q}`, a, r.shuffle(d), e);
    });
    // Landeshauptstädte
    gens.push((r) => {
      const [land, stadt] = r.pick(BUNDESLAENDER);
      const andere = BUNDESLAENDER.map(([, s]) => s).filter((s) => s !== stadt);
      return mc(r, "Deutschland",
        `${r.pick(LEADS)}Wie heißt die Landeshauptstadt von ${land}?`,
        stadt, pickN(r, andere, stadt, 3),
        `Die Landeshauptstadt von ${land} ist ${stadt}.`);
    });
    gens.push((r) => {
      const [land, stadt] = r.pick(BUNDESLAENDER);
      const andere = BUNDESLAENDER.map(([l]) => l).filter((l) => l !== land);
      return mc(r, "Deutschland",
        `${r.pick(LEADS)}${stadt} ist die Landeshauptstadt von …?`,
        land, pickN(r, andere, land, 3),
        `${stadt} ist die Landeshauptstadt von ${land}.`);
    });
  }

  return gens;
}

/* ══════════════════ 3) MATHEMATIK Klasse 1–2 ══════════════════ */

function mathematik7Generators(klasse) {
  const max = klasse === 1 ? 10 : 20;
  const gens = [];

  // Zahlzerlegung: a = b + ?
  gens.push((r) => {
    const summe = r.int(4, max);
    const teil = r.int(1, summe - 1);
    const rest = summe - teil;
    return mc(r, "Zahlzerlegung",
      `${r.pick(LEADS)}Zerlege die ${summe}: ${summe} = ${teil} + ?`,
      rest, nearNumbers(r, rest),
      `${teil} + ${rest} = ${summe}, also fehlt die ${rest}.`);
  });

  // Verdoppeln
  gens.push((r) => {
    const n = r.int(1, Math.floor(max / 2));
    return mc(r, "Verdoppeln und Halbieren",
      `${r.pick(LEADS)}Was ist das Doppelte von ${n}?`,
      2 * n, nearNumbers(r, 2 * n),
      `Das Doppelte von ${n} ist ${n} + ${n} = ${2 * n}.`);
  });

  // Halbieren
  gens.push((r) => {
    const h = r.int(1, Math.floor(max / 2));
    const n = 2 * h;
    return mc(r, "Verdoppeln und Halbieren",
      `${r.pick(LEADS)}Was ist die Hälfte von ${n}?`,
      h, nearNumbers(r, h),
      `Die Hälfte von ${n} ist ${h}, denn ${h} + ${h} = ${n}.`);
  });

  // Nachbarzahlen
  gens.push((r) => {
    const n = r.int(1, max - 1);
    const danach = r.next() < 0.5;
    const ziel = danach ? n + 1 : Math.max(0, n - 1);
    return mc(r, "Nachbarzahlen",
      `${r.pick(LEADS)}Welche Zahl kommt direkt ${danach ? "nach" : "vor"} der ${n}?`,
      ziel, nearNumbers(r, ziel),
      `Die Zahl direkt ${danach ? "nach" : "vor"} ${n} ist ${ziel}.`);
  });
  gens.push((r) => {
    const n = r.int(1, max - 1);
    return mc(r, "Nachbarzahlen",
      `${r.pick(LEADS)}Wie heißen die beiden Nachbarzahlen von ${n}?`,
      `${n - 1} und ${n + 1}`,
      [`${n - 2} und ${n + 2}`, `${n} und ${n + 1}`, `${n - 1} und ${n}`],
      `Die Nachbarn von ${n} sind ${n - 1} (davor) und ${n + 1} (danach).`);
  });

  // Größte/kleinste Zahl
  gens.push((r) => {
    const set = new Set();
    while (set.size < 4) set.add(r.int(0, max));
    const zahlen = [...set];
    const groesste = r.next() < 0.5;
    const ziel = groesste ? Math.max(...zahlen) : Math.min(...zahlen);
    return mc(r, "Zahlen vergleichen",
      `${r.pick(LEADS)}Welche dieser Zahlen ist die ${groesste ? "größte" : "kleinste"}: ${r.shuffle(zahlen).join(", ")}?`,
      ziel, zahlen.filter((z) => z !== ziel),
      `Geordnet: ${zahlen.slice().sort((a, b) => a - b).join(" < ")}. Die ${groesste ? "größte" : "kleinste"} Zahl ist ${ziel}.`);
  });

  // Vergleichszeichen
  gens.push((r) => {
    let a = r.int(0, max);
    let b = r.int(0, max);
    const zeichen = a < b ? "<" : a > b ? ">" : "=";
    const bedeutung = a < b ? `${a} ist kleiner als ${b}` : a > b ? `${a} ist größer als ${b}` : "beide Zahlen sind gleich groß";
    return mc(r, "Zahlen vergleichen",
      `${r.pick(LEADS)}Welches Zeichen gehört in die Lücke: ${a} ⬜ ${b}?`,
      zeichen, ["<", ">", "=", "+"].filter((z) => z !== zeichen),
      `Richtig ist ${a} ${zeichen} ${b}, denn ${bedeutung}.`);
  });

  // Muster fortsetzen
  gens.push((r) => {
    const schritt = r.pick(klasse === 1 ? [1, 2] : [1, 2, 5, 10]);
    const start = r.int(0, 4) * (schritt === 10 ? 10 : 1);
    const folge = [start, start + schritt, start + 2 * schritt, start + 3 * schritt];
    const next = start + 4 * schritt;
    return mc(r, "Muster und Reihen",
      `${r.pick(LEADS)}Setze das Muster fort: ${folge.join(", ")}, ?`,
      next, nearNumbers(r, next),
      `Es wird immer ${schritt} dazugezählt: ${folge[3]} + ${schritt} = ${next}.`);
  });

  // Tauschaufgaben
  gens.push((r) => {
    const a = r.int(1, max - 2);
    const b = r.int(1, max - a);
    if (a === b) return null;
    const s = a + b;
    return mc(r, "Tauschaufgaben",
      `${r.pick(LEADS)}${a} + ${b} = ${s}. Wie lautet die Tauschaufgabe?`,
      `${b} + ${a} = ${s}`,
      [`${s} + ${b} = ${a}`, `${b} + ${s} = ${a}`, `${a} − ${b} = ${s}`],
      `Beim Tauschen der Zahlen bleibt das Ergebnis gleich: ${b} + ${a} = ${s}.`);
  });

  // Plus/Minus im Zahlenraum (exakt berechnet)
  gens.push((r) => {
    const plus = r.next() < 0.5;
    if (plus) {
      const a = r.int(0, max - 1);
      const b = r.int(1, max - a);
      return mc(r, "Plus und Minus",
        `${r.pick(LEADS)}Rechne: ${a} + ${b} = ?`,
        a + b, nearNumbers(r, a + b),
        `${a} + ${b} = ${a + b}.`);
    }
    const a = r.int(2, max);
    const b = r.int(1, a);
    return mc(r, "Plus und Minus",
      `${r.pick(LEADS)}Rechne: ${a} − ${b} = ?`,
      a - b, nearNumbers(r, a - b),
      `${a} − ${b} = ${a - b}.`);
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

  console.log("Deutsch-Grundschule (Klasse 1–4, je >= 400):");
  for (let k = 1; k <= 4; k++)
    total += writeBank("deutsch5", k, generateBank(111000 + k, 400, deutsch5Generators(k)), 400);

  console.log("Sachkunde (Klasse 1–4, je >= 350):");
  for (let k = 1; k <= 4; k++)
    total += writeBank("sachkunde", k, generateBank(112000 + k, 350, sachkundeGenerators(k)), 350);

  console.log("Mathematik-Grundschule (Klasse 1–2, je >= 350):");
  for (let k = 1; k <= 2; k++)
    total += writeBank("mathematik7", k, generateBank(113000 + k, 350, mathematik7Generators(k)), 350);

  console.log(`\nGesamt (Runde 11): ${total} Fragen.`);
}

main();
