/* Copyright 2026 Elian Schock, Jonas Schwenk */
/**
 * MEGA-Fragen-Generator RUNDE 10 für MasterMind.
 *
 * Ergänzt die Fragenbank aus generate.mjs … generate8.mjs im GLEICHEN Format
 *   scripts/questions/mega/data/<fach>-klasse<k>.json
 * mit [{ topic, question, options[4], correct(Index), explanation }].
 *
 * Fächer/Umfang (nur NEUE Dateien mit Präfixen englisch5-/deutsch4-/geschichte2-):
 *   1) englisch5   Klasse 5–13, >= 400/Klasse
 *      (thematische Vokabelfelder: Umwelt, Technologie, Gefühle, Berufe, Medien
 *       — >= 120 Paare pro Klasse, klassenstufen-angemessen gestaffelt;
 *       word formation mit un-/dis-/-ful/-less; britisch vs. amerikanisch)
 *   2) deutsch4    Klasse 5–10, >= 400/Klasse
 *      (Textverständnis mit eingebauten 3–4-Satz-Mini-Texten, >= 25 Texte/Klasse,
 *       je 3–4 Fragen: Hauptaussage, Detail, Schlussfolgerung;
 *       Konjunktionen einsetzen; indirekte Rede)
 *   3) geschichte2 Klasse 6–10, >= 350/Klasse
 *      (Antike-Vertiefung Alltag Griechenland/Rom, Mittelalter: Lehnswesen/
 *       Stadt/Zünfte, Frühe Neuzeit: Entdeckungen/Reformation,
 *       Industrialisierung, Epochen-Reihenfolgen sortieren als MC)
 *
 * Deterministisch (mulberry32-Seed). Keine Abhängigkeiten, reines Node.
 *
 * Aufruf (vom Repo-Root):
 *   node scripts/questions/mega/generate10.mjs
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

/* ══════════════════ 1) ENGLISCH Klasse 5–13 ══════════════════ */
/* Vokabelfelder: pro Thema drei Stufen b (Basis, Kl. 5–7),
   m (Mittelstufe, ab Kl. 7), a (Oberstufe, ab Kl. 10). Paare [en, de]. */

const VOK = {
  Umwelt: {
    b: [["tree", "Baum"], ["forest", "Wald"], ["river", "Fluss"], ["lake", "See"], ["sea", "Meer"], ["mountain", "Berg"], ["weather", "Wetter"], ["rain", "Regen"], ["snow", "Schnee"], ["sun", "Sonne"], ["wind", "Wind"], ["cloud", "Wolke"], ["animal", "Tier"], ["bird", "Vogel"], ["fish", "Fisch"], ["flower", "Blume"], ["grass", "Gras"], ["leaf", "Blatt"], ["earth", "Erde"], ["air", "Luft"], ["water", "Wasser"], ["plant", "Pflanze"], ["sky", "Himmel"], ["stone", "Stein"], ["beach", "Strand"]],
    m: [["environment", "Umwelt"], ["pollution", "Verschmutzung"], ["rubbish", "Müll"], ["recycling", "Wiederverwertung"], ["climate", "Klima"], ["to protect", "schützen"], ["endangered", "gefährdet"], ["species", "Tierart"], ["waste", "Abfall"], ["energy", "Energie"], ["flood", "Überschwemmung"], ["drought", "Dürre"], ["greenhouse effect", "Treibhauseffekt"], ["natural resources", "Rohstoffe"]],
    a: [["sustainability", "Nachhaltigkeit"], ["carbon footprint", "CO₂-Fußabdruck"], ["renewable", "erneuerbar"], ["deforestation", "Abholzung"], ["emissions", "Schadstoffausstoß"], ["biodiversity", "Artenvielfalt"], ["conservation", "Naturschutz"], ["fossil fuels", "fossile Brennstoffe"], ["global warming", "globale Erwärmung"], ["sea level", "Meeresspiegel"], ["extinction", "Aussterben"], ["sewage", "Abwasser"]],
  },
  Technologie: {
    b: [["screen", "Bildschirm"], ["keyboard", "Tastatur"], ["printer", "Drucker"], ["headphones", "Kopfhörer"], ["charger", "Ladegerät"], ["battery", "Akku"], ["invention", "Erfindung"], ["to switch on", "einschalten"], ["to switch off", "ausschalten"], ["to save", "speichern"], ["to delete", "löschen"], ["password", "Kennwort"], ["to print", "drucken"], ["to type", "tippen"], ["device", "Gerät"], ["cable", "Kabel"], ["plug", "Stecker"], ["torch", "Taschenlampe"], ["fridge", "Kühlschrank"], ["washing machine", "Waschmaschine"], ["vacuum cleaner", "Staubsauger"], ["remote control", "Fernbedienung"], ["dishwasher", "Geschirrspüler"], ["lift", "Aufzug"], ["mobile phone", "Handy"]],
    m: [["to download", "herunterladen"], ["to upload", "hochladen"], ["attachment", "Anhang"], ["settings", "Einstellungen"], ["network", "Netzwerk"], ["wireless", "drahtlos"], ["data", "Daten"], ["storage", "Speicherplatz"], ["update", "Aktualisierung"], ["user", "Benutzer"], ["search engine", "Suchmaschine"], ["social media", "soziale Medien"], ["screen time", "Bildschirmzeit"], ["keyboard shortcut", "Tastenkombination"]],
    a: [["artificial intelligence", "künstliche Intelligenz"], ["encryption", "Verschlüsselung"], ["surveillance", "Überwachung"], ["data protection", "Datenschutz"], ["processing power", "Rechenleistung"], ["breakthrough", "Durchbruch"], ["obsolete", "veraltet"], ["cutting-edge", "hochmodern"], ["automation", "Automatisierung"], ["self-driving", "selbstfahrend"], ["virtual reality", "virtuelle Realität"], ["state of the art", "neuester Stand der Technik"]],
  },
  "Gefühle": {
    b: [["happy", "glücklich"], ["sad", "traurig"], ["angry", "wütend"], ["tired", "müde"], ["hungry", "hungrig"], ["thirsty", "durstig"], ["scared", "verängstigt"], ["bored", "gelangweilt"], ["excited", "aufgeregt"], ["proud", "stolz"], ["funny", "lustig"], ["friendly", "freundlich"], ["kind", "nett"], ["brave", "mutig"], ["shy", "schüchtern"], ["surprised", "überrascht"], ["lonely", "einsam"], ["worried", "besorgt"], ["calm", "ruhig"], ["cheerful", "fröhlich"], ["love", "Liebe"], ["fear", "Angst"], ["joy", "Freude"], ["hope", "Hoffnung"], ["tear", "Träne"]],
    m: [["jealous", "eifersüchtig"], ["envious", "neidisch"], ["embarrassed", "verlegen"], ["disappointed", "enttäuscht"], ["confident", "selbstbewusst"], ["anxious", "beunruhigt"], ["grateful", "dankbar"], ["guilty", "schuldig"], ["relieved", "erleichtert"], ["annoyed", "verärgert"], ["confused", "verwirrt"], ["curious", "neugierig"], ["upset", "aufgewühlt"], ["delighted", "hocherfreut"]],
    a: [["resentment", "Groll"], ["compassion", "Mitgefühl"], ["grief", "tiefe Trauer"], ["contempt", "Verachtung"], ["affection", "Zuneigung"], ["despair", "Verzweiflung"], ["serenity", "Gelassenheit"], ["remorse", "Reue"], ["indifferent", "gleichgültig"], ["overwhelmed", "überwältigt"], ["vulnerable", "verletzlich"], ["resilient", "widerstandsfähig"]],
  },
  Berufe: {
    b: [["teacher", "Lehrer"], ["doctor", "Arzt"], ["nurse", "Krankenpfleger"], ["baker", "Bäcker"], ["butcher", "Metzger"], ["farmer", "Bauer"], ["police officer", "Polizist"], ["firefighter", "Feuerwehrmann"], ["driver", "Fahrer"], ["cook", "Koch"], ["waiter", "Kellner"], ["singer", "Sänger"], ["actor", "Schauspieler"], ["painter", "Maler"], ["gardener", "Gärtner"], ["hairdresser", "Friseur"], ["dentist", "Zahnarzt"], ["vet", "Tierarzt"], ["builder", "Bauarbeiter"], ["postman", "Briefträger"], ["shop assistant", "Verkäufer"], ["secretary", "Sekretär"], ["carpenter", "Schreiner"], ["lawyer", "Anwalt"], ["mechanic", "Mechaniker"]],
    m: [["engineer", "Ingenieur"], ["scientist", "Wissenschaftler"], ["accountant", "Buchhalter"], ["employee", "Angestellter"], ["employer", "Arbeitgeber"], ["salary", "Gehalt"], ["application", "Bewerbung"], ["job interview", "Vorstellungsgespräch"], ["apprenticeship", "Ausbildung"], ["skill", "Fähigkeit"], ["experience", "Erfahrung"], ["part-time job", "Nebenjob"], ["unemployed", "arbeitslos"], ["colleague", "Kollege"]],
    a: [["entrepreneur", "Unternehmer"], ["executive", "Führungskraft"], ["civil servant", "Beamter"], ["surgeon", "Chirurg"], ["midwife", "Hebamme"], ["interpreter", "Dolmetscher"], ["estate agent", "Immobilienmakler"], ["career ladder", "Karriereleiter"], ["promotion", "Beförderung"], ["retirement", "Ruhestand"], ["workload", "Arbeitspensum"], ["redundancy", "Entlassung aus Betriebsgründen"]],
  },
  Medien: {
    b: [["newspaper", "Zeitung"], ["magazine", "Zeitschrift"], ["book", "Buch"], ["programme", "Sendung"], ["channel", "Fernsehsender"], ["news", "Nachrichten"], ["advertisement", "Werbung"], ["poster", "Plakat"], ["headline", "Schlagzeile"], ["cartoon", "Zeichentrickfilm"], ["comic", "Comicheft"], ["story", "Geschichte"], ["picture", "Bild"], ["stage", "Bühne"], ["audience", "Publikum"], ["cinema", "Kino"], ["library", "Bücherei"], ["letter", "Brief"], ["page", "Seite"], ["sound", "Ton"], ["voice", "Stimme"], ["radio station", "Radiosender"], ["listener", "Zuhörer"], ["viewer", "Zuschauer"], ["reporter", "Berichterstatter"]],
    m: [["editor", "Redakteur"], ["report", "Bericht"], ["broadcast", "Übertragung"], ["subtitle", "Untertitel"], ["review", "Rezension"], ["celebrity", "Berühmtheit"], ["press", "Presse"], ["front page", "Titelseite"], ["media literacy", "Medienkompetenz"], ["fake news", "Falschmeldungen"], ["documentary", "Dokumentarfilm"], ["current affairs", "aktuelles Zeitgeschehen"], ["publisher", "Verlag"], ["issue", "Ausgabe"]],
    a: [["censorship", "Zensur"], ["bias", "Voreingenommenheit"], ["coverage", "Berichterstattung"], ["freedom of the press", "Pressefreiheit"], ["tabloid", "Boulevardzeitung"], ["broadsheet", "Qualitätszeitung"], ["source", "Quelle"], ["credibility", "Glaubwürdigkeit"], ["circulation", "Auflage"], ["defamation", "Verleumdung"], ["public opinion", "öffentliche Meinung"], ["op-ed", "Meinungsbeitrag"]],
  },
};

/* word formation: [Stamm, richtige Form, Bedeutung dt.] */
const WF_UN = [["happy", "unhappy", "unglücklich"], ["kind", "unkind", "unfreundlich"], ["fair", "unfair", "ungerecht"], ["lucky", "unlucky", "vom Pech verfolgt"], ["comfortable", "uncomfortable", "unbequem"], ["usual", "unusual", "ungewöhnlich"], ["healthy", "unhealthy", "ungesund"], ["important", "unimportant", "unwichtig"], ["able", "unable", "nicht in der Lage"], ["certain", "uncertain", "unsicher"], ["pleasant", "unpleasant", "unangenehm"], ["friendly", "unfriendly", "unfreundlich im Umgang"]];
const WF_DIS = [["agree", "disagree", "nicht zustimmen"], ["appear", "disappear", "verschwinden"], ["like", "dislike", "nicht mögen"], ["honest", "dishonest", "unehrlich"], ["advantage", "disadvantage", "Nachteil"], ["obey", "disobey", "nicht gehorchen"], ["respect", "disrespect", "Respektlosigkeit"], ["connect", "disconnect", "trennen"]];
const WF_FUL = [["care", "careful", "vorsichtig"], ["help", "helpful", "hilfsbereit"], ["hope", "hopeful", "hoffnungsvoll"], ["use", "useful", "nützlich"], ["beauty", "beautiful", "schön"], ["wonder", "wonderful", "wunderbar"], ["power", "powerful", "mächtig"], ["success", "successful", "erfolgreich"], ["thank", "thankful", "dankbar"], ["colour", "colourful", "bunt"]];
const WF_LESS = [["care", "careless", "unachtsam"], ["hope", "hopeless", "hoffnungslos"], ["use", "useless", "nutzlos"], ["harm", "harmless", "harmlos"], ["home", "homeless", "obdachlos"], ["end", "endless", "endlos"], ["meaning", "meaningless", "bedeutungslos"], ["thought", "thoughtless", "gedankenlos"]];

/* Britisch vs. Amerikanisch: [BE, AE, dt. Bedeutung] */
const BE_AE = [["lorry", "truck", "Lastwagen"], ["lift", "elevator", "Aufzug"], ["flat", "apartment", "Wohnung"], ["holiday", "vacation", "Urlaub"], ["autumn", "fall", "Herbst"], ["biscuit", "cookie", "Keks"], ["sweets", "candy", "Süßigkeiten"], ["crisps", "chips", "Kartoffelchips"], ["chips", "fries", "Pommes frites"], ["football", "soccer", "Fußball"], ["trousers", "pants", "Hose"], ["trainers", "sneakers", "Turnschuhe"], ["rubber", "eraser", "Radiergummi"], ["petrol", "gas", "Benzin"], ["pavement", "sidewalk", "Bürgersteig"], ["underground", "subway", "U-Bahn"], ["cinema", "movie theater", "Kino"], ["shop", "store", "Laden"], ["garden", "yard", "Garten"], ["post", "mail", "Post"], ["queue", "line", "Warteschlange"], ["torch", "flashlight", "Taschenlampe"], ["jumper", "sweater", "Pullover"], ["nappy", "diaper", "Windel"], ["dustbin", "trash can", "Mülleimer"], ["mobile phone", "cell phone", "Handy"], ["motorway", "highway", "Autobahn"], ["timetable", "schedule", "Stundenplan"], ["wardrobe", "closet", "Kleiderschrank"], ["maths", "math", "Mathematik"]];

function englisch5Generators(klasse) {
  // klassenstufen-angemessene Vokabelauswahl (immer >= 120 Paare)
  const themen = Object.keys(VOK);
  const paare = []; // [thema, en, de]
  for (const t of themen) {
    const stufen = klasse <= 6 ? ["b"] : klasse <= 9 ? ["b", "m"] : klasse <= 10 ? ["b", "m", "a"] : ["m", "a", "b"];
    const nutz = klasse >= 11 ? ["m", "a"] : stufen;
    for (const s of nutz) for (const [en, de] of VOK[t][s]) paare.push([t, en, de]);
  }
  const alleDe = paare.map((p) => p[2]);
  const alleEn = paare.map((p) => p[1]);

  const gens = [];

  // Vokabel EN → DE (thematisch)
  gens.push((r) => {
    const [t, en, de] = r.pick(paare);
    return mc(r, `Vokabeln: ${t}`, `${r.pick(LEADS)}Wortfeld „${t}“: Was bedeutet das englische Wort „${en}“?`,
      de, pickN(r, alleDe, de, 3),
      `„${en}“ heißt auf Deutsch „${de}“ (Wortfeld ${t}).`);
  });

  // Vokabel DE → EN (thematisch)
  gens.push((r) => {
    const [t, en, de] = r.pick(paare);
    return mc(r, `Vokabeln: ${t}`, `${r.pick(LEADS)}Wortfeld „${t}“: Wie heißt „${de}“ auf Englisch?`,
      en, pickN(r, alleEn, en, 3),
      `„${de}“ heißt auf Englisch „${en}“.`);
  });

  // word formation: Gegenteil mit un-/dis-
  gens.push((r) => {
    const negs = [...WF_UN, ...WF_DIS];
    const [stamm, form, bed] = r.pick(negs);
    const falsch = form.startsWith("un") ? [`dis${stamm}`, `${stamm}less`, `im${stamm}`] : [`un${stamm}`, `${stamm}less`, `mis${stamm}`];
    return mc(r, "Word formation", `${r.pick(LEADS)}Word formation: Bilde mit einer Vorsilbe das Gegenteil bzw. die Verneinung von „${stamm}“.`,
      form, falsch,
      `Richtig ist „${form}“ (${bed}). Die Vorsilbe ${form.startsWith("un") ? "un-" : "dis-"} verneint das Wort.`);
  });

  // word formation: Adjektiv mit -ful / -less bilden
  gens.push((r) => {
    const mitFul = r.next() < 0.5;
    const [stamm, form, bed] = r.pick(mitFul ? WF_FUL : WF_LESS);
    const falsch = mitFul ? [`${stamm}less`, `un${stamm}`, `${stamm}ish`] : [`${stamm}ful`, `dis${stamm}`, `${stamm}ish`];
    return mc(r, "Word formation", `${r.pick(LEADS)}Word formation: Welches Adjektiv aus „${stamm}“ bedeutet „${bed}“?`,
      form, falsch,
      `„${form}“ = ${bed}. Die Endung ${mitFul ? "-ful bedeutet „voll von …“" : "-less bedeutet „ohne …“"}.`);
  });

  // word formation: Bedeutung erkennen
  gens.push((r) => {
    const alle = [...WF_UN, ...WF_DIS, ...WF_FUL, ...WF_LESS];
    const [, form, bed] = r.pick(alle);
    return mc(r, "Word formation", `${r.pick(LEADS)}Was bedeutet das englische Wort „${form}“?`,
      bed, pickN(r, alle.map((x) => x[2]), bed, 3),
      `„${form}“ bedeutet „${bed}“.`);
  });

  // BE → AE
  gens.push((r) => {
    const [be, ae, bed] = r.pick(BE_AE);
    return mc(r, "British vs. American English", `${r.pick(LEADS)}Britisches Englisch: „${be}“ (${bed}). Wie heißt das Wort im amerikanischen Englisch?`,
      ae, pickN(r, BE_AE.map((x) => x[1]), ae, 3),
      `BE „${be}“ = AE „${ae}“ (${bed}).`);
  });

  // AE → BE
  gens.push((r) => {
    const [be, ae, bed] = r.pick(BE_AE);
    return mc(r, "British vs. American English", `${r.pick(LEADS)}Amerikanisches Englisch: „${ae}“ (${bed}). Wie heißt das Wort im britischen Englisch?`,
      be, pickN(r, BE_AE.map((x) => x[0]), be, 3),
      `AE „${ae}“ = BE „${be}“ (${bed}).`);
  });

  return gens;
}

/* ══════════════════ 2) DEUTSCH Klasse 5–10 ══════════════════ */
/* Mini-Texte (3–4 Sätze) mit je 3–4 Fragen:
   [Text, [[Fragetyp, Frage, richtig, [3 Distraktoren], Erklärung], ...]] */

const MINI_TEXTE = [
  ["Lena füttert jeden Morgen vor der Schule ihre zwei Kaninchen. Am Wochenende reinigt sie zusätzlich den Stall im Garten. Ihre Eltern haben ihr die Tiere erst erlaubt, als sie versprochen hat, sich allein zu kümmern. Bis heute hat sie ihr Versprechen gehalten.", [
    ["Hauptaussage", "Worum geht es in dem Text hauptsächlich?", "Lena kümmert sich zuverlässig um ihre Kaninchen.", ["Lena möchte ein drittes Kaninchen kaufen.", "Lenas Eltern füttern die Tiere.", "Lena vergisst oft den Stall."], "Alle Sätze zeigen, dass Lena verantwortungsvoll für ihre Tiere sorgt."],
    ["Detail", "Wann reinigt Lena den Stall?", "am Wochenende", ["jeden Morgen", "nur in den Ferien", "jeden Abend"], "Im Text steht: „Am Wochenende reinigt sie zusätzlich den Stall.“"],
    ["Schlussfolgerung", "Was lässt sich aus dem Text schließen?", "Lena ist verlässlich.", ["Lena mag keine Tiere.", "Lenas Eltern sind streng gegen Haustiere geblieben.", "Lena hat ihr Versprechen gebrochen."], "Da sie ihr Versprechen „bis heute gehalten“ hat, ist sie verlässlich."],
  ]],
  ["Am Dienstag fiel in der Schule der Strom aus. Die Klasse 6b arbeitete deshalb bei Tageslicht am Fenster weiter. Nach zwei Stunden reparierten Techniker die Leitung. Zur großen Pause funktionierte alles wieder.", [
    ["Hauptaussage", "Was ist die Hauptaussage des Textes?", "Ein Stromausfall in der Schule wurde nach kurzer Zeit behoben.", ["Die Schule wurde geschlossen.", "Die 6b hatte hitzefrei.", "Die Techniker fanden den Fehler nicht."], "Der Text beschreibt Ausfall, Überbrückung und Reparatur."],
    ["Detail", "Wie lange dauerte es, bis die Leitung repariert war?", "zwei Stunden", ["zwei Tage", "eine ganze Woche", "zehn Minuten"], "„Nach zwei Stunden reparierten Techniker die Leitung.“"],
    ["Schlussfolgerung", "Was kann man aus dem Verhalten der 6b schließen?", "Die Klasse ließ sich vom Ausfall nicht aufhalten.", ["Die Klasse ging sofort nach Hause.", "Die Klasse verursachte den Ausfall.", "Die Klasse hatte an dem Tag frei."], "Sie arbeitete am Fenster einfach weiter."],
  ]],
  ["Der Schulgarten wurde im Frühjahr neu angelegt. Jede Klasse übernahm ein eigenes Beet mit Gemüse oder Kräutern. Im Sommer konnten die Schüler bereits Radieschen und Schnittlauch ernten. Die Ernte wurde in der Schulküche gemeinsam verarbeitet.", [
    ["Hauptaussage", "Worum geht es in dem Text?", "Der neue Schulgarten bringt schon im ersten Sommer eine Ernte.", ["Die Schulküche wurde geschlossen.", "Nur eine Klasse durfte in den Garten.", "Im Garten wachsen nur Blumen."], "Anlage, Pflege und Ernte des Gartens stehen im Mittelpunkt."],
    ["Detail", "Was konnten die Schüler im Sommer ernten?", "Radieschen und Schnittlauch", ["Tomaten und Gurken", "Äpfel und Birnen", "Kartoffeln und Mais"], "Genannt werden „Radieschen und Schnittlauch“."],
    ["Schlussfolgerung", "Was lässt sich über das Projekt sagen?", "Es war von Anfang an erfolgreich.", ["Es wurde nach kurzer Zeit abgebrochen.", "Es interessierte niemanden.", "Es fand nur im Winter statt."], "Schon im ersten Sommer gab es eine gemeinsame Ernte."],
  ]],
  ["Jonas trainiert seit drei Jahren im Schwimmverein. Anfangs traute er sich kaum ins tiefe Becken. Inzwischen gewinnt er bei Wettkämpfen regelmäßig Medaillen. Sein Trainer traut ihm sogar die Stadtmeisterschaft zu.", [
    ["Hauptaussage", "Was ist die zentrale Aussage?", "Jonas hat sich beim Schwimmen stark verbessert.", ["Jonas hat mit dem Schwimmen aufgehört.", "Jonas hat Angst vor Wettkämpfen.", "Jonas trainiert erst seit einer Woche."], "Vom ängstlichen Anfänger zum Medaillengewinner – eine Entwicklung."],
    ["Detail", "Wie lange trainiert Jonas schon im Verein?", "seit drei Jahren", ["seit drei Monaten", "seit zehn Jahren", "seit einer Woche"], "„Jonas trainiert seit drei Jahren im Schwimmverein.“"],
    ["Schlussfolgerung", "Was folgt aus der Einschätzung des Trainers?", "Der Trainer hält Jonas für sehr leistungsstark.", ["Der Trainer will Jonas aus dem Verein werfen.", "Der Trainer hält Jonas für zu langsam.", "Der Trainer kennt Jonas kaum."], "Wer jemandem die Stadtmeisterschaft zutraut, hält ihn für stark."],
  ]],
  ["Die Bibliothek der Stadt verlängert ab nächstem Monat ihre Öffnungszeiten. Künftig ist sie auch samstags bis 18 Uhr geöffnet. Damit reagiert sie auf viele Wünsche von Berufstätigen und Familien. Eine Umfrage hatte den Bedarf deutlich gezeigt.", [
    ["Hauptaussage", "Was ist die Hauptinformation des Textes?", "Die Bibliothek verlängert ihre Öffnungszeiten.", ["Die Bibliothek schließt für immer.", "Die Bibliothek erhöht die Gebühren.", "Die Bibliothek zieht um."], "Kern des Textes ist die neue Samstagsöffnung."],
    ["Detail", "Bis wann ist die Bibliothek künftig samstags geöffnet?", "bis 18 Uhr", ["bis 12 Uhr", "bis 20 Uhr", "bis 16 Uhr"], "„… auch samstags bis 18 Uhr geöffnet.“"],
    ["Schlussfolgerung", "Warum wurde die Änderung beschlossen?", "Weil eine Umfrage großen Bedarf gezeigt hatte.", ["Weil niemand mehr kam.", "Weil das Personal es ablehnte.", "Weil die Stadt sparen wollte."], "Die Umfrage „hatte den Bedarf deutlich gezeigt“."],
  ]],
  ["Beim Wandertag verlief sich eine kleine Gruppe im Wald. Zum Glück hatte Merve eine Karte der Umgebung eingesteckt. Mit ihrer Hilfe fand die Gruppe nach einer halben Stunde zurück zum Weg. Die Lehrerin lobte Merves Umsicht vor der ganzen Klasse.", [
    ["Hauptaussage", "Worum geht es im Text?", "Merves Vorbereitung rettet die Gruppe aus einer misslichen Lage.", ["Der Wandertag wurde abgesagt.", "Die Gruppe blieb über Nacht im Wald.", "Die Lehrerin verlief sich allein."], "Dank Merves Karte fand die Gruppe zurück."],
    ["Detail", "Wie lange brauchte die Gruppe zurück zum Weg?", "eine halbe Stunde", ["einen ganzen Tag", "fünf Minuten", "drei Stunden"], "„… nach einer halben Stunde zurück zum Weg.“"],
    ["Schlussfolgerung", "Was lässt sich über Merve sagen?", "Sie denkt voraus und handelt besonnen.", ["Sie ist unvorsichtig.", "Sie kennt sich mit Karten nicht aus.", "Sie wollte die Gruppe in die Irre führen."], "Karte einstecken und die Gruppe führen zeigt Umsicht."],
  ]],
  ["Der Pausenverkauf bietet seit Kurzem auch belegte Vollkornbrote an. Anfangs bestellten nur wenige Schüler das neue Angebot. Nach einer Probierwoche mit kostenlosen Häppchen stieg der Verkauf deutlich. Nun sind die Brote oft schon vor der zweiten Pause ausverkauft.", [
    ["Hauptaussage", "Was beschreibt der Text?", "Wie ein neues Pausenangebot nach anfänglicher Zurückhaltung erfolgreich wurde.", ["Die Abschaffung des Pausenverkaufs.", "Eine Beschwerde über zu teure Brote.", "Den Umbau der Schulmensa."], "Vom zögerlichen Start zum ausverkauften Angebot."],
    ["Detail", "Was führte zum Anstieg des Verkaufs?", "eine Probierwoche mit kostenlosen Häppchen", ["ein Plakatwettbewerb", "niedrigere Preise", "eine Hausaufgabe"], "„Nach einer Probierwoche mit kostenlosen Häppchen stieg der Verkauf.“"],
    ["Schlussfolgerung", "Was kann man daraus schließen?", "Wer Neues probieren darf, kauft es eher.", ["Vollkornbrote schmecken niemandem.", "Werbung wirkt nie.", "Der Verkauf wurde eingestellt."], "Das Probieren senkte die Hemmschwelle – der Verkauf stieg."],
  ]],
  ["Timo hat sein Fahrrad wochenlang nicht gepflegt. Auf dem Weg zum Training sprang ihm plötzlich die Kette ab. Ein älterer Herr half ihm, sie wieder aufzulegen. Seitdem ölt Timo die Kette jeden Sonntag.", [
    ["Hauptaussage", "Was ist der Kern des Textes?", "Timo lernt aus einer Panne, sein Rad regelmäßig zu pflegen.", ["Timo verkauft sein Fahrrad.", "Timo kommt nie zum Training.", "Ein Herr stiehlt Timos Rad."], "Die Panne führt zu neuem Verhalten: regelmäßige Pflege."],
    ["Detail", "Wer half Timo mit der Kette?", "ein älterer Herr", ["sein Trainer", "seine Schwester", "ein Polizist"], "„Ein älterer Herr half ihm …“"],
    ["Schlussfolgerung", "Was zeigt Timos neues Verhalten?", "Er hat aus dem Vorfall gelernt.", ["Er ist weiterhin nachlässig.", "Er fährt nicht mehr Rad.", "Er lässt andere die Arbeit machen."], "Wöchentliches Ölen zeigt, dass er die Lehre gezogen hat."],
  ]],
  ["Die Theater-AG probt seit Monaten ein selbst geschriebenes Stück. Kurz vor der Premiere wurde die Hauptdarstellerin krank. Ihre Ersatzspielerin lernte die Rolle in nur vier Tagen. Die Aufführung wurde trotzdem ein großer Erfolg.", [
    ["Hauptaussage", "Worum geht es in dem Text?", "Trotz eines Ausfalls kurz vor der Premiere gelingt die Aufführung.", ["Die Premiere wurde abgesagt.", "Das Stück wurde gekauft, nicht geschrieben.", "Die AG löste sich auf."], "Krankheit, Einspringen, Erfolg – das ist der rote Faden."],
    ["Detail", "In wie vielen Tagen lernte die Ersatzspielerin die Rolle?", "in vier Tagen", ["in vier Wochen", "in einem Tag", "in zwei Monaten"], "„… lernte die Rolle in nur vier Tagen.“"],
    ["Schlussfolgerung", "Was lässt sich über die Ersatzspielerin sagen?", "Sie ist sehr einsatzbereit und lernfähig.", ["Sie war unvorbereitet und scheiterte.", "Sie wollte nicht auftreten.", "Sie kannte das Stück nicht bis zum Schluss."], "Eine Hauptrolle in vier Tagen zu lernen verlangt großen Einsatz."],
  ]],
  ["In der Klasse 7a sammeln die Schüler alte Handys für ein Recyclingprojekt. Innerhalb von zwei Wochen kamen 84 Geräte zusammen. Ein Fachbetrieb gewinnt daraus wertvolle Metalle zurück. Der Erlös geht an ein Umweltprojekt der Gemeinde.", [
    ["Hauptaussage", "Was ist das Thema des Textes?", "Eine Handysammlung der 7a unterstützt Recycling und Umweltschutz.", ["Die 7a kauft neue Handys.", "Ein Betrieb verkauft der Klasse Metalle.", "Die Gemeinde verbietet Handys."], "Sammeln, Recyceln, Spenden – darum geht es."],
    ["Detail", "Wie viele Geräte kamen zusammen?", "84", ["48", "840", "24"], "„… kamen 84 Geräte zusammen.“"],
    ["Schlussfolgerung", "Was folgt aus dem Projektaufbau?", "Alte Handys sind kein wertloser Müll.", ["Recycling lohnt sich nie.", "Die Metalle werden weggeworfen.", "Der Erlös bleibt bei der Klasse."], "Aus den Geräten werden wertvolle Metalle zurückgewonnen."],
  ]],
  ["Frau Berg bietet dienstags eine freiwillige Mathe-Sprechstunde an. Zu Beginn kamen nur zwei Schüler. Seit die Termine im Klassenchat erinnert werden, ist der Raum regelmäßig voll. Viele Schüler verbesserten dadurch ihre Noten.", [
    ["Hauptaussage", "Was ist die Hauptaussage?", "Die Mathe-Sprechstunde wird gut angenommen und hilft den Schülern.", ["Die Sprechstunde wurde abgeschafft.", "Mathe wurde als Fach gestrichen.", "Frau Berg unterrichtet nur noch dienstags."], "Wachsender Zulauf und bessere Noten stehen im Zentrum."],
    ["Detail", "Wodurch stieg die Teilnehmerzahl?", "durch Erinnerungen im Klassenchat", ["durch Pflichtteilnahme", "durch Süßigkeiten", "durch kürzere Termine"], "„Seit die Termine im Klassenchat erinnert werden …“"],
    ["Schlussfolgerung", "Was lässt sich aus dem letzten Satz schließen?", "Die Sprechstunde wirkt sich positiv auf die Leistungen aus.", ["Die Noten wurden schlechter.", "Nur Frau Berg profitiert.", "Die Schüler gehen nur zum Spielen hin."], "„Viele Schüler verbesserten dadurch ihre Noten.“"],
  ]],
  ["Der alte Sportplatz hinter der Turnhalle war jahrelang gesperrt. Im Herbst beschloss der Gemeinderat die Sanierung. Vereine und Eltern halfen an mehreren Wochenenden mit. Im Mai wurde der Platz feierlich wiedereröffnet.", [
    ["Hauptaussage", "Worum geht es in dem Text?", "Der gesperrte Sportplatz wurde gemeinsam saniert und wiedereröffnet.", ["Der Sportplatz wurde verkauft.", "Die Turnhalle brannte ab.", "Der Gemeinderat sperrte den Platz erneut."], "Sperrung, Beschluss, Mithilfe, Eröffnung – der Ablauf des Projekts."],
    ["Detail", "Wann wurde der Platz wiedereröffnet?", "im Mai", ["im Herbst", "im Dezember", "im Januar"], "„Im Mai wurde der Platz feierlich wiedereröffnet.“"],
    ["Schlussfolgerung", "Was zeigt die Mithilfe von Vereinen und Eltern?", "Der Platz ist vielen Menschen im Ort wichtig.", ["Niemand interessierte sich für den Platz.", "Die Gemeinde arbeitete allein.", "Die Eltern waren dagegen."], "Freiwillige Arbeit an Wochenenden zeigt echtes Interesse."],
  ]],
  ["Samira liest jeden Abend zwanzig Minuten in ihrem Lieblingsbuch. Ihre kleine Schwester hört dabei gern zu. Manchmal liest Samira deshalb extra laut und mit verstellten Stimmen. Inzwischen möchte die Schwester selbst lesen lernen.", [
    ["Hauptaussage", "Was beschreibt der Text?", "Samiras Vorlesen weckt bei ihrer Schwester die Lust am Lesen.", ["Samira mag keine Bücher.", "Die Schwester stört Samira beim Lesen.", "Samira liest nur in der Schule."], "Das gemeinsame Ritual führt zum Wunsch, selbst zu lesen."],
    ["Detail", "Wie lange liest Samira jeden Abend?", "zwanzig Minuten", ["zwei Stunden", "fünf Minuten", "eine Minute"], "„… jeden Abend zwanzig Minuten …“"],
    ["Schlussfolgerung", "Welche Wirkung hat Samiras Verhalten?", "Es motiviert ihre Schwester.", ["Es langweilt ihre Schwester.", "Es verbietet der Schwester das Lesen.", "Es bleibt ohne Folgen."], "Die Schwester „möchte selbst lesen lernen“ – eine direkte Folge."],
  ]],
  ["Auf dem Schulhof stand wochenlang ein defekter Trinkwasserspender. Die Schülervertretung sammelte Unterschriften für eine Reparatur. Die Schulleitung beauftragte daraufhin eine Firma. Seit den Osterferien läuft der Spender wieder einwandfrei.", [
    ["Hauptaussage", "Was ist der Kern des Textes?", "Der Einsatz der Schülervertretung führte zur Reparatur des Spenders.", ["Der Spender wurde abgebaut.", "Die Schulleitung ignorierte das Problem.", "Die Schüler kauften einen neuen Spender."], "Unterschriften → Auftrag → Reparatur."],
    ["Detail", "Seit wann funktioniert der Spender wieder?", "seit den Osterferien", ["seit den Sommerferien", "seit gestern", "seit den Herbstferien"], "„Seit den Osterferien läuft der Spender wieder einwandfrei.“"],
    ["Schlussfolgerung", "Was zeigt der Text über die Schülervertretung?", "Sie kann mit Engagement etwas bewirken.", ["Sie hat keinerlei Einfluss.", "Sie war gegen die Reparatur.", "Sie besteht nur aus Lehrern."], "Ihre Unterschriftensammlung brachte die Reparatur ins Rollen."],
  ]],
  ["Herr Weber pendelt täglich mit dem Zug zur Arbeit. Früher stand er dafür jeden Morgen im Stau. Jetzt nutzt er die Fahrzeit zum Lesen und kommt entspannter an. Nur bei Zugausfällen ärgert er sich über die Umstellung.", [
    ["Hauptaussage", "Was ist die Hauptaussage des Textes?", "Der Umstieg auf den Zug hat für Herrn Weber überwiegend Vorteile.", ["Herr Weber fährt wieder Auto.", "Herr Weber hat den Arbeitsplatz gewechselt.", "Der Zug ist immer unpünktlich."], "Weniger Stress, Zeit zum Lesen – nur Ausfälle stören."],
    ["Detail", "Wozu nutzt Herr Weber die Fahrzeit?", "zum Lesen", ["zum Schlafen", "zum Kochen", "zum Sport"], "„… nutzt er die Fahrzeit zum Lesen …“"],
    ["Schlussfolgerung", "Wann bereut Herr Weber die Umstellung am ehesten?", "wenn Züge ausfallen", ["wenn er entspannt ankommt", "wenn er liest", "wenn kein Stau ist"], "„Nur bei Zugausfällen ärgert er sich …“"],
  ]],
  ["Die Klasse 8c organisierte einen Flohmarkt in der Aula. Verkauft wurden gespendete Bücher, Spiele und Kleidung. Am Ende des Tages waren fast alle Tische leer. Mit dem Erlös finanziert die Klasse einen Teil ihrer Abschlussfahrt.", [
    ["Hauptaussage", "Worum geht es im Text?", "Ein erfolgreicher Flohmarkt hilft, die Abschlussfahrt zu bezahlen.", ["Die Abschlussfahrt wurde abgesagt.", "Die Klasse kaufte Bücher ein.", "Der Flohmarkt fand draußen statt."], "Organisation, Verkauf, Verwendung des Erlöses."],
    ["Detail", "Wo fand der Flohmarkt statt?", "in der Aula", ["auf dem Parkplatz", "in der Turnhalle", "im Park"], "„… einen Flohmarkt in der Aula.“"],
    ["Schlussfolgerung", "Was bedeutet es, dass fast alle Tische leer waren?", "Der Verkauf lief sehr gut.", ["Es kamen keine Besucher.", "Die Waren wurden gestohlen.", "Die Klasse baute zu wenige Tische auf."], "Leere Tische am Ende zeigen: fast alles wurde verkauft."],
  ]],
  ["Ein Sturm deckte in der Nacht mehrere Dächer im Dorf ab. Die Feuerwehr sicherte bis zum Morgen die gefährdeten Straßen. Verletzt wurde zum Glück niemand. Die Aufräumarbeiten dauerten dennoch mehrere Tage.", [
    ["Hauptaussage", "Was ist die Hauptaussage?", "Ein Sturm richtete Schäden an, verletzte aber niemanden.", ["Der Sturm forderte viele Verletzte.", "Die Feuerwehr blieb untätig.", "Es gab keinerlei Schäden."], "Schäden ja, Verletzte nein – und schnelle Sicherung."],
    ["Detail", "Wer sicherte die Straßen?", "die Feuerwehr", ["die Bundeswehr", "die Anwohner allein", "der Bürgermeister"], "„Die Feuerwehr sicherte … die gefährdeten Straßen.“"],
    ["Schlussfolgerung", "Was lässt die Dauer der Aufräumarbeiten vermuten?", "Die Schäden waren beträchtlich.", ["Es gab kaum etwas zu tun.", "Der Sturm war harmlos.", "Die Arbeiten begannen nie."], "Mehrere Tage Aufräumen sprechen für größere Schäden."],
  ]],
  ["Die Stadtwerke testen neue Leuchten für die Straßenbeleuchtung. Die LED-Lampen verbrauchen weniger als die Hälfte des bisherigen Stroms. Außerdem lassen sie sich nachts stufenweise dimmen. Nach dem Test sollen alle Straßenzüge umgerüstet werden.", [
    ["Hauptaussage", "Worum geht es in dem Text?", "Die Stadt testet sparsame LED-Straßenbeleuchtung vor einer Umrüstung.", ["Die Straßenbeleuchtung wird abgeschafft.", "Die Stromkosten sollen steigen.", "Alte Lampen werden neu gekauft."], "Test, Vorteile und geplante flächendeckende Umrüstung."],
    ["Detail", "Wie viel Strom verbrauchen die LED-Lampen?", "weniger als die Hälfte des bisherigen Stroms", ["genau so viel wie bisher", "doppelt so viel", "ein Zehntel mehr"], "„… verbrauchen weniger als die Hälfte des bisherigen Stroms.“"],
    ["Schlussfolgerung", "Was lässt sich über das Testergebnis vermuten?", "Die Stadt ist von den Lampen überzeugt.", ["Der Test wurde abgebrochen.", "Die Lampen fielen durch.", "Die Stadtwerke lehnen LEDs ab."], "Geplant ist die Umrüstung „aller Straßenzüge“."],
  ]],
  ["Nach den Sommerferien startet an der Schule ein Streitschlichter-Programm. Zwölf Schüler wurden dafür ein halbes Jahr lang ausgebildet. Sie helfen künftig in den Pausen, Konflikte fair zu lösen. Die Lehrer greifen dann nur noch in schweren Fällen ein.", [
    ["Hauptaussage", "Was ist der Kern des Textes?", "Ausgebildete Schüler übernehmen künftig die Streitschlichtung.", ["Die Lehrer verbieten Pausen.", "Konflikte werden ignoriert.", "Das Programm wurde beendet."], "Ausbildung und künftige Aufgabe der Streitschlichter."],
    ["Detail", "Wie viele Schüler wurden ausgebildet?", "zwölf", ["zwanzig", "zwei", "sieben"], "„Zwölf Schüler wurden dafür … ausgebildet.“"],
    ["Schlussfolgerung", "Welche Folge hat das Programm für die Lehrer?", "Sie müssen seltener eingreifen.", ["Sie haben mehr Streit zu schlichten.", "Sie verlieren ihre Stellen.", "Sie müssen die Ausbildung wiederholen."], "„Die Lehrer greifen dann nur noch in schweren Fällen ein.“"],
  ]],
  ["Der Bäcker an der Ecke backt sein Brot nachts ab zwei Uhr. Viele Kunden stehen deshalb schon vor sieben Uhr im Laden. Industriebrote aus dem Supermarkt kauft hier kaum jemand. Die Kunden schätzen den Geschmack des Handwerks.", [
    ["Hauptaussage", "Was sagt der Text vor allem aus?", "Das handwerklich gebackene Brot ist bei den Kunden sehr beliebt.", ["Der Bäcker schließt seinen Laden.", "Die Kunden kaufen lieber im Supermarkt.", "Das Brot ist oft ausverkauft, weil es billig ist."], "Frühe Kundschaft und Treue zeigen die Beliebtheit."],
    ["Detail", "Ab wann backt der Bäcker?", "ab zwei Uhr nachts", ["ab sieben Uhr morgens", "ab zwölf Uhr mittags", "ab zehn Uhr abends"], "„… backt sein Brot nachts ab zwei Uhr.“"],
    ["Schlussfolgerung", "Warum verzichten die Kunden auf Industriebrot?", "Ihnen ist der handwerkliche Geschmack wichtiger.", ["Der Supermarkt ist zu weit weg.", "Industriebrot ist verboten.", "Sie mögen gar kein Brot."], "„Die Kunden schätzen den Geschmack des Handwerks.“"],
  ]],
  ["Im Erdkundeunterricht wertete die 9b eine Woche lang das Wetter aus. Jeden Tag wurden Temperatur, Niederschlag und Windstärke notiert. Die Messwerte verglichen die Schüler anschließend mit den Angaben einer Wetter-App. Die eigenen Messungen wichen nur wenig davon ab.", [
    ["Hauptaussage", "Worum geht es im Text?", "Die 9b überprüfte eigene Wettermessungen an den Daten einer App.", ["Die 9b entwickelte eine eigene App.", "Die Klasse sagte das Wetter falsch voraus.", "Der Unterricht fiel wegen Regen aus."], "Messen, Vergleichen, Bewerten – ein kleines Forschungsprojekt."],
    ["Detail", "Welche Größen wurden täglich notiert?", "Temperatur, Niederschlag und Windstärke", ["Luftdruck, Lärm und Helligkeit", "nur die Temperatur", "Sonnenstunden und Pollenflug"], "Alle drei Größen werden im Text aufgezählt."],
    ["Schlussfolgerung", "Was folgt aus der geringen Abweichung?", "Die Schüler haben sorgfältig gemessen.", ["Die App war völlig unbrauchbar.", "Die Messgeräte waren kaputt.", "Das Wetter änderte sich nie."], "Kleine Abweichungen sprechen für saubere Messungen."],
  ]],
  ["Die Gemeinde richtet am Bahnhof eine überdachte Fahrradgarage ein. Pendler können ihr Rad dort künftig sicher abschließen. Bisher wurden am Bahnhof jedes Jahr Dutzende Räder gestohlen. Die Polizei erwartet nun einen deutlichen Rückgang der Diebstähle.", [
    ["Hauptaussage", "Was ist die Hauptinformation?", "Eine neue Fahrradgarage soll Diebstähle am Bahnhof verringern.", ["Der Bahnhof wird geschlossen.", "Fahrräder werden am Bahnhof verboten.", "Die Polizei stellt mehr Räder."], "Neue Garage als Antwort auf viele Diebstähle."],
    ["Detail", "Wie viele Räder wurden bisher jährlich gestohlen?", "Dutzende", ["genau drei", "keine", "über tausend"], "„… jedes Jahr Dutzende Räder gestohlen.“"],
    ["Schlussfolgerung", "Welche Wirkung erhofft man sich?", "weniger Fahrraddiebstähle", ["mehr Autoverkehr", "höhere Fahrpreise", "weniger Pendler"], "Die Polizei „erwartet … einen deutlichen Rückgang der Diebstähle“."],
  ]],
  ["Ein Forscherteam untersuchte den Schlaf von Jugendlichen. Wer abends lange am Handy war, schlief im Schnitt eine Stunde weniger. Die Konzentration am nächsten Morgen litt messbar darunter. Das Team empfiehlt, Bildschirme eine Stunde vor dem Schlafen auszuschalten.", [
    ["Hauptaussage", "Was ist die zentrale Aussage der Studie?", "Späte Handynutzung verkürzt den Schlaf und mindert die Konzentration.", ["Handys verbessern den Schlaf.", "Jugendliche brauchen keinen Schlaf.", "Konzentration hängt nicht vom Schlaf ab."], "Weniger Schlaf und schlechtere Konzentration durch späte Nutzung."],
    ["Detail", "Wie viel weniger schliefen die Betroffenen im Schnitt?", "eine Stunde", ["fünf Stunden", "zehn Minuten", "eine halbe Nacht"], "„… schlief im Schnitt eine Stunde weniger.“"],
    ["Schlussfolgerung", "Was folgt aus der Empfehlung des Teams?", "Bildschirmpausen vor dem Schlafen sind sinnvoll.", ["Man sollte nachts arbeiten.", "Handys gehören ins Bett.", "Schlaf ist reine Gewohnheit."], "Die Empfehlung zielt auf besseren Schlaf durch Bildschirmverzicht."],
  ]],
  ["Der Jugendtreff musste wegen eines Wasserschadens schließen. Die Stadt stellte übergangsweise Räume im Bürgerhaus bereit. Viele Angebote wie der Musikraum fehlen dort jedoch. Die Jugendlichen hoffen auf eine schnelle Sanierung.", [
    ["Hauptaussage", "Worum geht es im Text?", "Der Jugendtreff ist vorübergehend ins Bürgerhaus ausgewichen.", ["Der Jugendtreff wurde für immer geschlossen.", "Das Bürgerhaus hat einen Wasserschaden.", "Die Jugendlichen bauen ein neues Haus."], "Schließung, Übergangslösung und Hoffnung auf Sanierung."],
    ["Detail", "Warum musste der Jugendtreff schließen?", "wegen eines Wasserschadens", ["wegen eines Brandes", "wegen Lärmbeschwerden", "wegen Personalmangels"], "„… musste wegen eines Wasserschadens schließen.“"],
    ["Schlussfolgerung", "Warum sind die Jugendlichen mit der Lösung nicht ganz zufrieden?", "Im Bürgerhaus fehlen wichtige Angebote.", ["Das Bürgerhaus ist zu groß.", "Sie mögen keine Musik.", "Der Weg ist kürzer geworden."], "„Viele Angebote wie der Musikraum fehlen dort jedoch.“"],
  ]],
  ["Auf dem Wochenmarkt bieten seit diesem Jahr auch junge Landwirte aus der Region ihre Produkte an. Sie verkaufen Gemüse, das am selben Morgen geerntet wurde. Viele Kunden nehmen dafür längere Wege in Kauf. Zwei Supermärkte im Ort haben ihr Regionalangebot daraufhin erweitert.", [
    ["Hauptaussage", "Was ist die Hauptaussage?", "Regionale Frische kommt an und verändert sogar das Angebot der Supermärkte.", ["Der Wochenmarkt wurde verboten.", "Kunden meiden regionale Produkte.", "Die Landwirte verkaufen nur Fleisch."], "Beliebtes Regionalgemüse zwingt Supermärkte zum Nachziehen."],
    ["Detail", "Wann wurde das verkaufte Gemüse geerntet?", "am selben Morgen", ["vor einer Woche", "im Vorjahr", "am Vorabend"], "„… Gemüse, das am selben Morgen geerntet wurde.“"],
    ["Schlussfolgerung", "Was zeigt die Reaktion der Supermärkte?", "Sie spüren die Konkurrenz des Marktes.", ["Sie schließen ihre Filialen.", "Sie verbieten regionale Ware.", "Sie ignorieren den Markt völlig."], "Erweitertes Regionalangebot ist eine Antwort auf die Konkurrenz."],
  ]],
  ["Die Abschlussklasse plante ihre Fahrt zunächst ins Ausland. Wegen der hohen Kosten stimmte die Mehrheit schließlich für einen Ort an der Ostsee. Dort stehen Segelkurse und ein Klettergarten auf dem Programm. Einige Schüler waren anfangs enttäuscht, freuen sich inzwischen aber auf die Aktivitäten.", [
    ["Hauptaussage", "Worum geht es in dem Text?", "Die Klasse entschied sich aus Kostengründen für die Ostsee statt des Auslands.", ["Die Fahrt wurde komplett gestrichen.", "Alle wollten von Anfang an an die Ostsee.", "Die Klasse fliegt nun doch ins Ausland."], "Planänderung aus Kostengründen und wachsende Vorfreude."],
    ["Detail", "Was steht an der Ostsee auf dem Programm?", "Segelkurse und ein Klettergarten", ["Skifahren und Rodeln", "ein Museumsbesuch", "ein Sprachkurs"], "„Dort stehen Segelkurse und ein Klettergarten auf dem Programm.“"],
    ["Schlussfolgerung", "Wie hat sich die Stimmung der anfangs Enttäuschten entwickelt?", "Sie ist ins Positive umgeschlagen.", ["Sie ist noch schlechter geworden.", "Sie boykottieren die Fahrt.", "Sie planen eine eigene Reise."], "„… freuen sich inzwischen aber auf die Aktivitäten.“"],
  ]],
  ["Ein Start-up aus der Nachbarstadt entwickelt essbare Trinkhalme aus Getreide. Mehrere Cafés der Region testen die Halme bereits. Sie bleiben rund eine Stunde stabil und schmecken leicht nach Keks. Bewährt sich der Test, will eine große Kette die Halme übernehmen.", [
    ["Hauptaussage", "Was ist der Kern des Textes?", "Essbare Trinkhalme werden regional getestet und könnten groß herauskommen.", ["Trinkhalme werden verboten.", "Cafés schaffen Getränke ab.", "Das Start-up stellt Besteck her."], "Produkt, Testphase und mögliche Ausweitung."],
    ["Detail", "Wie lange bleiben die Halme stabil?", "rund eine Stunde", ["einen ganzen Tag", "fünf Minuten", "eine Woche"], "„Sie bleiben rund eine Stunde stabil …“"],
    ["Schlussfolgerung", "Wovon hängt der Einstieg der großen Kette ab?", "vom Erfolg des Tests in den Cafés", ["vom Wetter", "von einer Abstimmung der Schüler", "vom Preis für Plastikhalme"], "„Bewährt sich der Test, will eine große Kette …“"],
  ]],
  ["Die Stadtbücherei verleiht neuerdings auch Werkzeug, Nähmaschinen und Musikinstrumente. Das Angebot nennt sich „Bibliothek der Dinge“. Besonders gefragt sind Bohrmaschinen und E-Pianos. Wer selten etwas braucht, muss es so nicht mehr kaufen.", [
    ["Hauptaussage", "Was beschreibt der Text?", "Die Bücherei verleiht jetzt auch Gegenstände statt nur Medien.", ["Die Bücherei verkauft ihre Bücher.", "Werkzeuge sind in der Bücherei verboten.", "Die Bücherei schließt ihre Musikabteilung."], "Die „Bibliothek der Dinge“ erweitert das klassische Angebot."],
    ["Detail", "Welche Gegenstände sind besonders gefragt?", "Bohrmaschinen und E-Pianos", ["Zelte und Fahrräder", "Romane und Hörbücher", "Töpfe und Pfannen"], "„Besonders gefragt sind Bohrmaschinen und E-Pianos.“"],
    ["Schlussfolgerung", "Welcher Vorteil ergibt sich für die Nutzer?", "Selten gebrauchte Dinge müssen nicht gekauft werden.", ["Alle Dinge werden teurer.", "Man muss Mitglied eines Vereins sein.", "Die Ausleihe von Büchern entfällt."], "„Wer selten etwas braucht, muss es so nicht mehr kaufen.“"],
  ]],
];

/* Konjunktionen einsetzen: [Satz mit ___, richtig, [Distraktoren], Erklärung] */
const KONJUNKTIONEN = [
  ["Ich nehme einen Schirm mit, ___ es später regnen soll.", "weil", ["obwohl", "damit", "bevor"], "„weil“ nennt den Grund für das Mitnehmen des Schirms."],
  ["___ er sehr müde war, machte er seine Hausaufgaben fertig.", "Obwohl", ["Weil", "Damit", "Sobald"], "„Obwohl“ drückt einen Gegensatz aus (müde – trotzdem fertig gemacht)."],
  ["Sie lernt jeden Tag Vokabeln, ___ sie den Test besteht.", "damit", ["obwohl", "während", "bevor"], "„damit“ gibt das Ziel/die Absicht an."],
  ["___ wir gegessen hatten, räumten wir die Küche auf.", "Nachdem", ["Bevor", "Damit", "Obwohl"], "„Nachdem“ ordnet zeitlich: zuerst essen, dann aufräumen."],
  ["Wasch dir die Hände, ___ du zu Mittag isst.", "bevor", ["nachdem", "weil", "obwohl"], "„bevor“ – das Händewaschen kommt zeitlich zuerst."],
  ["___ der Film lief, klingelte dreimal das Telefon.", "Während", ["Nachdem", "Damit", "Weil"], "„Während“ drückt Gleichzeitigkeit aus."],
  ["Er sagte, ___ er morgen nicht kommen kann.", "dass", ["weil", "ob", "damit"], "„dass“ leitet den Objektsatz nach „sagen“ ein."],
  ["Ich weiß nicht, ___ der Bus schon abgefahren ist.", "ob", ["dass", "weil", "damit"], "Bei indirekten Ja/Nein-Fragen steht „ob“."],
  ["Nimm eine Jacke mit, ___ es abends kalt wird.", "falls", ["obwohl", "während", "sodass"], "„falls“ drückt eine Bedingung aus (für den Fall, dass …)."],
  ["Er trainierte hart, ___ er den Wettkampf gewann.", "sodass", ["obwohl", "bevor", "ob"], "„sodass“ nennt die Folge des harten Trainings."],
  ["___ du fertig bist, kannst du rausgehen.", "Sobald", ["Obwohl", "Damit", "Dass"], "„Sobald“ – unmittelbar nach dem Fertigwerden."],
  ["Sie blieb zu Hause, ___ sie erkältet war.", "weil", ["damit", "obwohl", "bevor"], "Die Erkältung ist der Grund – „weil“."],
  ["___ es stark regnete, fand das Spiel statt.", "Obwohl", ["Weil", "Damit", "Nachdem"], "Gegensatz: Regen – Spiel trotzdem. Also „obwohl“."],
  ["Er spart sein Taschengeld, ___ er sich ein Fahrrad kaufen kann.", "damit", ["obwohl", "ob", "während"], "Das Ziel des Sparens wird mit „damit“ angeschlossen."],
  ["___ ich die Tür abschloss, bemerkte ich den Zettel.", "Als", ["Ob", "Damit", "Dass"], "„Als“ steht für ein einmaliges Ereignis in der Vergangenheit."],
  ["___ ich klein war, gingen wir jeden Sommer ans Meer.", "Wenn", ["Als ob", "Damit", "Dass"], "„Wenn“ steht bei wiederholten Ereignissen in der Vergangenheit."],
  ["Sie half ihm, ___ er sie nie darum gebeten hatte.", "obwohl", ["weil", "damit", "sobald"], "Gegensatz zwischen Helfen und Nicht-gebeten-Sein: „obwohl“."],
  ["Wir warten hier, ___ der Regen aufhört.", "bis", ["seit", "weil", "obwohl"], "„bis“ nennt den Endpunkt des Wartens."],
  ["___ er in München wohnt, sehen wir uns nur selten.", "Seit", ["Bis", "Damit", "Ob"], "„Seit“ markiert den Anfangspunkt eines Zustands."],
  ["Sie nahm den früheren Zug, ___ sie pünktlich ankam.", "sodass", ["obwohl", "bevor", "falls"], "Die Pünktlichkeit ist die Folge – „sodass“."],
  ["Er tat so, ___ er nichts gehört hätte.", "als ob", ["damit", "sodass", "weil"], "„als ob“ + Konjunktiv drückt einen irrealen Vergleich aus."],
  ["Du darfst mitkommen, ___ du dich warm anziehst.", "sofern", ["obwohl", "sodass", "während"], "„sofern“ nennt die Bedingung fürs Mitkommen."],
  ["Ich habe angerufen, ___ ich dich nicht erreichen konnte.", "aber", ["denn", "deshalb", "damit"], "„aber“ verbindet die Sätze mit einem Gegensatz (nebenordnend)."],
  ["Er kommt nicht mit, ___ er muss noch lernen.", "denn", ["weil", "dass", "damit"], "„denn“ ist nebenordnend: Hauptsatz + Hauptsatz (Verbzweitstellung)."],
  ["Sie war krank, ___ blieb sie zu Hause.", "deshalb", ["denn", "obwohl", "weil"], "„deshalb“ nennt die Folge und steht im zweiten Hauptsatz."],
  ["___ du dich beeilst, verpassen wir den Bus.", "Wenn ... nicht", ["Sobald", "Nachdem", "Seit"], "Sinn: Nur bei Eile erreichen wir den Bus – Bedingung mit Verneinung."],
  ["Er ist nicht nur schnell, ___ auch ausdauernd.", "sondern", ["aber", "denn", "oder"], "Nach „nicht nur“ folgt „sondern auch“."],
  ["Entscheide dich: Kommst du mit, ___ bleibst du hier?", "oder", ["und", "aber", "denn"], "„oder“ verbindet zwei Alternativen."],
  ["___ er den Vertrag las, unterschrieb er ihn nicht.", "Obwohl", ["Nachdem", "Sobald", "Weil"], "Gegensatz: Er las ihn zwar, unterschrieb aber nicht."],
  ["Sie notierte alles, ___ sie nichts vergaß.", "sodass", ["bevor", "ob", "als"], "Die Folge des Notierens: nichts vergessen – „sodass“."],
  ["___ das Konzert begann, wurden die Lichter gedimmt.", "Bevor", ["Nachdem", "Seit", "Bis"], "Das Dimmen geschah vor dem Beginn – „bevor“."],
  ["Ich frage ihn, ___ er uns hilft.", "ob", ["dass", "weil", "sodass"], "Indirekte Ja/Nein-Frage: „ob“."],
  ["___ sie den Brief gelesen hatte, rief sie sofort an.", "Nachdem", ["Bevor", "Damit", "Falls"], "Zeitliche Abfolge: zuerst lesen, dann anrufen."],
  ["Er sprach leise, ___ das Baby nicht aufwachte.", "damit", ["obwohl", "denn", "aber"], "Absicht des leisen Sprechens: das Baby soll weiterschlafen."],
  ["___ ich mich erinnere, war der Laden sonntags geschlossen.", "Soweit", ["Sodass", "Damit", "Bis"], "„Soweit ich mich erinnere“ – einschränkende Angabe."],
  ["Das Spiel wurde abgebrochen, ___ es zu gewittern begann.", "als", ["damit", "dass", "ob"], "„als“ nennt den Zeitpunkt des einmaligen Ereignisses."],
];

/* Indirekte Rede: [direkte Rede + Einleitung, richtig, [Distraktoren], Erklärung] */
const INDIREKTE_REDE = [
  ["Direkte Rede: Tom sagt: „Ich bin müde.“ – Indirekte Rede: Tom sagt, er ___ müde.", "sei", ["ist", "wäre gewesen", "sein wird"], "Indirekte Rede steht im Konjunktiv I: „er sei müde“."],
  ["Direkte Rede: Lisa sagt: „Ich habe den Schlüssel.“ – Lisa sagt, sie ___ den Schlüssel.", "habe", ["hat", "hatte", "haben wird"], "Konjunktiv I von „haben“, 3. Person Singular: „habe“."],
  ["Direkte Rede: Er sagt: „Ich komme morgen.“ – Er sagt, er ___ morgen.", "komme", ["kommt", "kam", "käme an"], "Konjunktiv I: „er komme“."],
  ["Direkte Rede: Sie sagt: „Ich kann schwimmen.“ – Sie sagt, sie ___ schwimmen.", "könne", ["kann", "konnte", "können wird"], "Konjunktiv I von „können“: „sie könne“."],
  ["Direkte Rede: Der Lehrer sagt: „Ihr müsst mehr üben.“ – Der Lehrer sagt, sie ___ mehr üben.", "müssten", ["müssen", "mussten", "muss"], "Da Konjunktiv I („müssen“) mit dem Indikativ zusammenfällt, weicht man auf Konjunktiv II „müssten“ aus."],
  ["Direkte Rede: Anna sagt: „Ich habe das Buch gelesen.“ – Anna sagt, sie ___ das Buch gelesen.", "habe", ["hat", "hätte längst", "wird"], "Vergangenes in der indirekten Rede: Konjunktiv I Perfekt „sie habe gelesen“."],
  ["Direkte Rede: Er sagt: „Ich werde anrufen.“ – Er sagt, er ___ anrufen.", "werde", ["wird", "wurde", "würde niemals"], "Zukunft: Konjunktiv I von „werden“ → „er werde anrufen“."],
  ["Direkte Rede: Sie sagt: „Ich weiß die Antwort.“ – Sie sagt, sie ___ die Antwort.", "wisse", ["weiß", "wusste", "wissen wird"], "Konjunktiv I von „wissen“: „sie wisse“."],
  ["Direkte Rede: Der Trainer sagt: „Das Spiel ist verloren.“ – Der Trainer sagt, das Spiel ___ verloren.", "sei", ["ist", "war doch", "würde"], "Konjunktiv I von „sein“: „sei“."],
  ["Direkte Rede: Marie sagt: „Ich gehe nach Hause.“ – Marie sagt, sie ___ nach Hause.", "gehe", ["geht", "ging", "gegangen ist"], "Konjunktiv I: „sie gehe“."],
  ["Direkte Rede: Er fragt: „Kommst du mit?“ – Er fragt, ___ ich mitkomme.", "ob", ["dass", "weil", "damit"], "Indirekte Ja/Nein-Fragen werden mit „ob“ eingeleitet."],
  ["Direkte Rede: Sie fragt: „Wo wohnst du?“ – Sie fragt, ___ ich wohne.", "wo", ["ob", "dass", "als"], "Bei W-Fragen bleibt das Fragewort in der indirekten Rede erhalten."],
  ["Direkte Rede: Papa sagt: „Ich habe keine Zeit.“ – Papa sagt, er ___ keine Zeit.", "habe", ["hat", "hätte niemals", "haben"], "Konjunktiv I: „er habe keine Zeit“."],
  ["Direkte Rede: Die Zeugin sagt: „Ich sah den Wagen.“ – Die Zeugin sagt, sie ___ den Wagen gesehen.", "habe", ["hat", "hatte", "wird"], "Vergangenheit → Konjunktiv I Perfekt: „sie habe … gesehen“."],
  ["Direkte Rede: Max sagt: „Wir sind fertig.“ – Max sagt, sie ___ fertig.", "seien", ["sind", "waren", "sei"], "Plural: Konjunktiv I von „sein“ ist „seien“."],
  ["Direkte Rede: Sie sagt: „Ich will helfen.“ – Sie sagt, sie ___ helfen.", "wolle", ["will", "wollte", "wollen wird"], "Konjunktiv I von „wollen“: „sie wolle“."],
  ["Direkte Rede: Der Arzt sagt: „Der Patient darf aufstehen.“ – Der Arzt sagt, der Patient ___ aufstehen.", "dürfe", ["darf", "durfte", "dürfen"], "Konjunktiv I von „dürfen“: „dürfe“."],
  ["Direkte Rede: Oma sagt: „Es gibt Kuchen.“ – Oma sagt, es ___ Kuchen.", "gebe", ["gibt", "gab", "gäbe sicher"], "Konjunktiv I von „geben“: „es gebe“."],
  ["Direkte Rede: Er sagt: „Ich muss los.“ – Er sagt, er ___ los.", "müsse", ["muss", "musste", "müssen"], "Konjunktiv I von „müssen“: „er müsse“."],
  ["Direkte Rede: Sie sagt: „Ich mag den Winter nicht.“ – Sie sagt, sie ___ den Winter nicht.", "möge", ["mag", "mochte", "mögen wird"], "Konjunktiv I von „mögen“: „sie möge“."],
  ["Welche Aussage über die indirekte Rede ist richtig?", "Sie gibt Äußerungen anderer distanziert wieder, meist im Konjunktiv I.", ["Sie steht immer im Imperativ.", "Sie darf nur wörtliche Zitate enthalten.", "Sie braucht immer Anführungszeichen."], "Indirekte Rede referiert fremde Äußerungen, Kennzeichen ist der Konjunktiv I."],
  ["Wann weicht man in der indirekten Rede auf den Konjunktiv II aus?", "Wenn der Konjunktiv I mit dem Indikativ übereinstimmt.", ["Immer bei Fragen.", "Nie – Konjunktiv II ist verboten.", "Nur in der 1. Person Singular."], "Bei Formgleichheit (z. B. „sie haben“) nimmt man Konjunktiv II („sie hätten“)."],
  ["Direkte Rede: Die Schüler sagen: „Wir haben geübt.“ – Sie sagen, sie ___ geübt.", "hätten", ["haben", "hatten", "habe"], "„sie haben“ (Konj. I) = Indikativ → Ersatzform Konjunktiv II „hätten“."],
  ["Direkte Rede: Der Bürgermeister sagt: „Die Brücke wird saniert.“ – Er sagt, die Brücke ___ saniert.", "werde", ["wird", "wurde", "würde nie"], "Konjunktiv I von „werden“: „werde“."],
  ["Direkte Rede: Sie sagt: „Ich fahre am Montag.“ – Sie sagt, sie ___ am Montag.", "fahre", ["fährt", "fuhr", "fahren wird"], "Konjunktiv I: „sie fahre“."],
  ["Direkte Rede: Er sagt: „Ich habe nichts gewusst.“ – Er behauptet, er ___ nichts gewusst.", "habe", ["hat", "hatte", "wird"], "Konjunktiv I Perfekt: „er habe … gewusst“."],
  ["Direkte Rede: Sie sagt: „Mein Bruder ist krank.“ – Sie erzählt, ihr Bruder ___ krank.", "sei", ["ist", "war schon", "würde"], "Konjunktiv I von „sein“: „sei“."],
  ["Direkte Rede: Der Kapitän sagt: „Wir laufen morgen aus.“ – Er kündigt an, sie ___ morgen aus.", "liefen", ["laufen", "läuft", "gelaufen"], "„sie laufen“ (Konj. I) = Indikativ → Konjunktiv II „liefen“ als Ersatzform."],
];

function deutsch4Generators(klasse) {
  // Textpool: alle Klassen nutzen >= 25 Mini-Texte, höhere Klassen die anspruchsvolleren am Ende
  const start = klasse <= 6 ? 0 : klasse <= 8 ? 2 : 3;
  const texte = MINI_TEXTE.slice(start, start + 25);

  const gens = [];

  // Textverständnis (Hauptaussage / Detail / Schlussfolgerung)
  gens.push((r) => {
    const [text, fragen] = r.pick(texte);
    const [typ, frage, richtig, dist, erkl] = r.pick(fragen);
    return mc(r, `Textverständnis: ${typ}`,
      `${r.pick(LEADS)}Lies den Text: „${text}“ – ${frage}`,
      richtig, r.shuffle(dist), erkl);
  });

  // Konjunktionen einsetzen
  gens.push((r) => {
    const [satz, richtig, dist, erkl] = r.pick(KONJUNKTIONEN);
    return mc(r, "Konjunktionen",
      `${r.pick(LEADS)}Setze die passende Konjunktion ein: ${satz}`,
      richtig, r.shuffle(dist), erkl);
  });

  // Indirekte Rede
  gens.push((r) => {
    const [aufgabe, richtig, dist, erkl] = r.pick(INDIREKTE_REDE);
    return mc(r, "Indirekte Rede",
      `${r.pick(LEADS)}${aufgabe}`,
      richtig, r.shuffle(dist), erkl);
  });

  return gens;
}

/* ══════════════════ 3) GESCHICHTE Klasse 6–10 ══════════════════ */
/* Faktenlisten: [Frage, richtig, [3 Distraktoren], Erklärung] */

const ANTIKE = [
  ["Wie hieß der zentrale Markt- und Versammlungsplatz einer griechischen Polis?", "Agora", ["Forum", "Basilika", "Palästra"], "Die Agora war Markt, Treffpunkt und politisches Zentrum der Polis."],
  ["Wie hieß der zentrale Platz einer römischen Stadt?", "Forum", ["Agora", "Akropolis", "Odeon"], "Das Forum war Markt-, Gerichts- und Versammlungsplatz der Römer."],
  ["Was war eine Polis?", "ein griechischer Stadtstaat", ["ein römisches Heer", "ein ägyptischer Tempel", "eine Handelsstraße"], "Griechenland bestand aus vielen unabhängigen Stadtstaaten (Poleis)."],
  ["In welcher Stadt entstand die attische Demokratie?", "Athen", ["Sparta", "Rom", "Troja"], "In Athen durften freie männliche Bürger in der Volksversammlung mitentscheiden."],
  ["Wer durfte in der athenischen Demokratie abstimmen?", "freie männliche Bürger Athens", ["alle Einwohner einschließlich Sklaven", "nur die Priester", "nur die Könige"], "Frauen, Sklaven und Fremde (Metöken) blieben ausgeschlossen."],
  ["Wofür war Sparta vor allem bekannt?", "für seine strenge militärische Erziehung", ["für seine Demokratie", "für seine Seidenproduktion", "für seine Pyramiden"], "Spartanische Jungen wurden ab sieben Jahren militärisch erzogen (Agoge)."],
  ["Zu Ehren welches Gottes fanden die antiken Olympischen Spiele statt?", "Zeus", ["Apollon", "Ares", "Hades"], "Die Spiele in Olympia waren ein Fest für den Göttervater Zeus."],
  ["Wie oft fanden die antiken Olympischen Spiele statt?", "alle vier Jahre", ["jedes Jahr", "alle zehn Jahre", "nur einmal"], "Der Vier-Jahres-Rhythmus (Olympiade) gilt bis heute."],
  ["Welches berühmte Orakel befragten die Griechen?", "das Orakel von Delphi", ["das Orakel von Olympia", "das Orakel von Rom", "das Orakel von Karthago"], "In Delphi verkündete die Priesterin Pythia mehrdeutige Weissagungen."],
  ["Worauf schrieben griechische und römische Schüler im Unterricht?", "auf Wachstafeln", ["auf Papier aus Holland", "auf Pergamentbücher mit Goldschnitt", "auf Schiefertafeln mit Kreide"], "In die Wachsschicht ritzte man mit dem Stilus; sie war wiederverwendbar."],
  ["Wie nannte man die mehrstöckigen Mietshäuser im alten Rom?", "Insulae", ["Villen", "Thermen", "Basiliken"], "Einfache Römer wohnten eng in Insulae, Reiche in Stadtvillen (Domus)."],
  ["Wozu dienten die römischen Thermen?", "als öffentliche Badeanlagen und Treffpunkte", ["als Gerichtsgebäude", "nur als Tempel", "als Kasernen"], "Thermen boten Bäder, Sport und Gespräche – für viele fast täglich."],
  ["Wie hieß das typische Gewand römischer Bürger bei offiziellen Anlässen?", "Toga", ["Tunika-Rüstung", "Chiton-Panzer", "Sagum-Krone"], "Die Toga war das Ehrengewand des römischen Bürgers."],
  ["Wo fanden in Rom die Wagenrennen statt?", "im Circus Maximus", ["im Kolosseum", "auf dem Forum Romanum", "im Pantheon"], "Der Circus Maximus fasste weit über 100 000 Zuschauer."],
  ["Wo kämpften in Rom die Gladiatoren?", "im Amphitheater (z. B. Kolosseum)", ["im Circus Maximus", "in den Thermen", "auf der Agora"], "Gladiatorenkämpfe fanden in Amphitheatern wie dem Kolosseum statt."],
  ["Mit welchem Schlagwort beschrieb man die Versorgung des römischen Volkes mit Nahrung und Unterhaltung?", "Brot und Spiele", ["Wein und Gesang", "Gold und Ruhm", "Salz und Siege"], "„panem et circenses“ – Getreidespenden und Spiele hielten das Volk ruhig."],
  ["Welche Bauwerke versorgten römische Städte mit Frischwasser?", "Aquädukte", ["Thermen", "Viadukte für Wagen", "Katakomben"], "Aquädukte leiteten Wasser oft über viele Kilometer in die Städte."],
  ["Wer verrichtete im antiken Griechenland und Rom einen Großteil der schweren Arbeit?", "Sklaven", ["die Senatoren", "die Priester", "die Feldherren"], "Sklaven arbeiteten in Haushalten, Werkstätten, Bergwerken und auf Feldern."],
  ["Wie hießen die beiden Stände im frühen Rom?", "Patrizier und Plebejer", ["Adel und Klerus", "Spartiaten und Heloten", "Konsuln und Tribunen"], "Patrizier waren der Adel, Plebejer das einfache Volk Roms."],
  ["Wie viele Konsuln führten die römische Republik jeweils an?", "zwei", ["einer", "zehn", "hundert"], "Zwei Konsuln regierten für ein Jahr und kontrollierten sich gegenseitig."],
  ["Welches Gremium beriet in Rom über Politik und Finanzen?", "der Senat", ["die Agora", "das Orakel", "die Zunft"], "Der Senat war die einflussreiche Ratsversammlung Roms."],
  ["In welchem Jahr wurde Rom der Sage nach gegründet?", "753 v. Chr.", ["476 n. Chr.", "1200 v. Chr.", "44 v. Chr."], "„753 – Rom kroch aus dem Ei“: sagenhafte Gründung durch Romulus."],
  ["Welche Zwillinge gründeten der Sage nach Rom?", "Romulus und Remus", ["Kastor und Pollux", "Herkules und Achilles", "Caesar und Brutus"], "Der Sage nach säugte eine Wölfin die Zwillinge Romulus und Remus."],
  ["Welcher Feldherr überquerte im Zweiten Punischen Krieg mit Elefanten die Alpen?", "Hannibal", ["Caesar", "Alexander der Große", "Augustus"], "Der Karthager Hannibal zog 218 v. Chr. mit Kriegselefanten über die Alpen."],
  ["Gegen welche Stadt führte Rom die Punischen Kriege?", "Karthago", ["Athen", "Alexandria", "Troja"], "Drei Punische Kriege endeten 146 v. Chr. mit der Zerstörung Karthagos."],
  ["Wer wurde 44 v. Chr. an den Iden des März ermordet?", "Gaius Julius Caesar", ["Augustus", "Nero", "Romulus"], "Caesar wurde von Senatoren um Brutus und Cassius erstochen."],
  ["Wer war der erste römische Kaiser?", "Augustus", ["Caesar", "Nero", "Konstantin"], "Octavian erhielt 27 v. Chr. den Ehrentitel Augustus – Beginn der Kaiserzeit."],
  ["Welche Stadt wurde 79 n. Chr. vom Ausbruch des Vesuvs verschüttet?", "Pompeji", ["Rom", "Athen", "Karthago"], "Asche und Bims konservierten Pompeji – ein Fenster in den römischen Alltag."],
  ["Wie hieß die Grenzbefestigung der Römer gegen die Germanen?", "Limes", ["Hadrianswall von Paris", "Große Mauer", "Pomerium"], "Der Limes sicherte mit Wällen, Palisaden und Kastellen die Reichsgrenze."],
  ["Was war eine römische Legion?", "eine große Einheit des römischen Heeres", ["ein Tempelbezirk", "eine Wasserleitung", "ein Volksfest"], "Eine Legion umfasste mehrere tausend schwer bewaffnete Soldaten."],
  ["Warum bauten die Römer ihr berühmtes Straßennetz?", "damit Heer, Boten und Händler schnell durchs Reich kamen", ["nur für Wagenrennen", "als reine Zierde", "um Flüsse zu ersetzen, die es nicht gab"], "„Alle Wege führen nach Rom“ – Straßen sicherten Herrschaft und Handel."],
  ["Welche Sprache sprachen die Römer?", "Latein", ["Griechisch als einzige Sprache", "Etruskisch als Amtssprache bis zum Ende", "Aramäisch"], "Latein war Amts- und Verkehrssprache des Römischen Reiches."],
  ["Welcher Kaiser erlaubte 313 n. Chr. das Christentum im Römischen Reich?", "Konstantin", ["Nero", "Augustus", "Hadrian"], "Die Mailänder Vereinbarung Konstantins gewährte den Christen freie Religionsausübung."],
  ["Wann endete das Weströmische Reich?", "476 n. Chr.", ["753 v. Chr.", "1492 n. Chr.", "800 n. Chr."], "476 wurde der letzte weströmische Kaiser Romulus Augustulus abgesetzt."],
  ["Was aßen einfache Römer hauptsächlich?", "Getreidebrei, Brot, Oliven und Gemüse", ["täglich Rindersteaks", "Kartoffeln und Mais", "Tomatensuppe"], "Kartoffeln, Mais und Tomaten kamen erst nach 1492 nach Europa."],
  ["Wie hieß der schwer bewaffnete Fußsoldat der Griechen?", "Hoplit", ["Legionär", "Gladiator", "Zenturio"], "Hopliten kämpften mit Rundschild und Lanze in der Phalanx."],
  ["Welcher Dichter soll die „Ilias“ und die „Odyssee“ verfasst haben?", "Homer", ["Sokrates", "Caesar", "Herodot"], "Die Epen Homers erzählen vom Trojanischen Krieg und Odysseus' Irrfahrten."],
  ["Was verehrten Griechen und Römer?", "viele Götter (Polytheismus)", ["nur einen einzigen Gott", "gar keine Götter", "nur Naturgeister ohne Namen"], "Beide Kulturen kannten eine Götterwelt, z. B. Zeus/Jupiter, Athene/Minerva."],
  ["Wo versammelten sich die griechischen Bürger Athens zur Volksversammlung?", "auf der Pnyx", ["im Kolosseum", "im Circus Maximus", "in den Thermen"], "Auf dem Hügel Pnyx stimmten die Athener über Gesetze ab."],
  ["Was war die Akropolis von Athen?", "der befestigte Tempelberg der Stadt", ["der Hafen Athens", "eine Rennbahn", "ein Wohnviertel der Sklaven"], "Auf der Akropolis stand u. a. der Parthenon-Tempel der Athene."],
];

const MITTELALTER = [
  ["Was erhielt ein Vasall im Lehnswesen von seinem Lehnsherrn?", "ein Lehen (z. B. Land oder ein Amt)", ["ein festes Monatsgehalt in Euro", "eine Fabrik", "eine Aktie"], "Der Lehnsherr vergab Land/Ämter, der Vasall schuldete Treue und Dienst."],
  ["Wozu verpflichtete sich der Vasall gegenüber seinem Lehnsherrn?", "zu Treue sowie Kriegs- und Ratsdienst", ["zu täglichen Geldzahlungen in Gold", "zur Seefahrt nach Amerika", "zum Buchdruck"], "„Consilium et auxilium“: Rat und (militärische) Hilfe."],
  ["Wie wurde das Lehnsverhältnis feierlich geschlossen?", "durch Handgang und Treueeid", ["durch einen Notarvertrag mit Stempel", "per Handschlag auf dem Markt ohne Eid", "durch eine Wahl"], "Der Vasall legte seine Hände in die des Herrn und schwor Treue."],
  ["Wie nannte man die Abgabe der Bauern an die Kirche?", "den Zehnt", ["die Steuererklärung", "den Zoll", "das Wergeld"], "Etwa ein Zehntel des Ertrags ging als Zehnt an die Kirche."],
  ["Was waren Frondienste?", "Pflichtarbeiten der Bauern für den Grundherrn", ["Feste im Kloster", "Ritterturniere", "Handelsreisen der Kaufleute"], "Hörige Bauern mussten z. B. auf dem Herrenland pflügen und ernten."],
  ["Was bedeutete Grundherrschaft?", "Der Grundherr besaß das Land, abhängige Bauern bewirtschafteten es.", ["Alle Bauern besaßen ihr Land frei.", "Die Städte regierten das Umland.", "Der König bearbeitete die Felder selbst."], "Bauern leisteten Abgaben und Dienste, erhielten dafür Schutz."],
  ["Welcher Spruch beschreibt die Freiheit in der mittelalterlichen Stadt?", "Stadtluft macht frei.", ["Geld regiert die Welt.", "Rom ist überall.", "Wissen ist Macht."], "Wer Jahr und Tag unbeanstandet in der Stadt lebte, wurde frei."],
  ["Welches Recht war für den Aufstieg einer mittelalterlichen Stadt besonders wichtig?", "das Marktrecht", ["das Weltraumrecht", "das Kolonialrecht", "das Eisenbahnrecht"], "Das Marktrecht erlaubte regelmäßige Märkte – Grundlage des Wohlstands."],
  ["Wer regierte in vielen mittelalterlichen Städten?", "der Rat, oft angeführt vom Bürgermeister", ["ein Pharao", "die Zunft der Bettler", "ein Konsul auf Lebenszeit"], "Der Stadtrat – meist aus reichen Bürgerfamilien – lenkte die Stadt."],
  ["Was schützte die mittelalterliche Stadt vor Angriffen?", "die Stadtmauer mit Türmen und Toren", ["ein Limes aus Palisaden", "ein Burggraben um jedes Haus", "eine Flotte im Stadtzentrum"], "Mauer, Türme und Tore wurden nachts geschlossen und bewacht."],
  ["Was war eine Zunft?", "der Zusammenschluss der Handwerker eines Gewerbes", ["ein Ritterorden", "eine Klosterschule", "eine Bauernfamilie"], "Zünfte regelten Ausbildung, Qualität, Preise und soziale Absicherung."],
  ["Welche drei Stufen durchlief ein Handwerker in der Zunft?", "Lehrling, Geselle, Meister", ["Schüler, Student, Professor", "Knecht, Ritter, König", "Novize, Mönch, Abt"], "Nach Lehre und Wanderjahren konnte der Geselle Meister werden."],
  ["Was musste ein Geselle anfertigen, um Meister zu werden?", "ein Meisterstück", ["eine Doktorarbeit", "ein Wappen", "eine Urkunde des Papstes"], "Das Meisterstück bewies sein Können vor der Zunft."],
  ["Was regelte die Zunftordnung unter anderem?", "Preise, Qualität und Zahl der Werkstätten", ["die Ernte der Bauern", "den Fahrplan der Postkutschen", "die Wahl des Papstes"], "Die Zunft schützte ihre Mitglieder vor Konkurrenz und Pfusch."],
  ["Wie hieß der mächtige Städtebund für den Handel in Nord- und Ostsee?", "die Hanse", ["die Zunft", "der Deutsche Bund", "die Liga von Delos"], "Städte wie Lübeck und Hamburg dominierten mit der Hanse den Handel."],
  ["Wer wurde im Jahr 800 in Rom zum Kaiser gekrönt?", "Karl der Große", ["Otto von Bismarck", "Friedrich Barbarossa", "Konstantin"], "Papst Leo III. krönte Karl den Großen an Weihnachten 800."],
  ["Worum ging es im Investiturstreit?", "um das Recht, Bischöfe einzusetzen", ["um den Getreidepreis", "um die Erfindung des Buchdrucks", "um Kolonien in Amerika"], "Kaiser und Papst stritten, wer Bischöfe in ihr Amt einsetzen darf."],
  ["Was geschah 1077 beim „Gang nach Canossa“?", "König Heinrich IV. bat Papst Gregor VII. um die Lösung vom Kirchenbann.", ["Der Papst wurde zum Kaiser gekrönt.", "Kolumbus erreichte Amerika.", "Die Pest brach aus."], "Heinrich wartete büßend vor der Burg Canossa – der Bann wurde gelöst."],
  ["Was war das Ziel des Ersten Kreuzzugs ab 1096?", "die Eroberung Jerusalems", ["die Entdeckung Amerikas", "die Gründung Roms", "die Eroberung Londons"], "1099 eroberten die Kreuzfahrer Jerusalem."],
  ["Welche Seuche tötete ab 1347 etwa ein Drittel der Bevölkerung Europas?", "die Pest („Schwarzer Tod“)", ["die Grippe von 1918", "die Cholera", "die Pocken allein"], "Der „Schwarze Tod“ entvölkerte ab 1347 ganze Landstriche."],
  ["Nach welchem Grundsatz lebten die Mönche des Benediktinerordens?", "ora et labora – bete und arbeite", ["panem et circenses", "veni, vidi, vici", "carpe diem"], "Gebet, Arbeit und Lesung bestimmten den Klostertag."],
  ["Welche Aufgaben übernahmen Klöster im Mittelalter?", "Schreiben von Büchern, Krankenpflege, Bildung und Landwirtschaft", ["Bau von Eisenbahnen", "Zeitungsdruck", "Bankwesen mit Aktien"], "Klöster waren Zentren von Wissen, Fürsorge und Wirtschaft."],
  ["Wie nannte man das Ackersystem mit Winter-, Sommerfeld und Brache?", "Dreifelderwirtschaft", ["Plantagenwirtschaft", "Monokultur", "Fruchtwechsel mit Kunstdünger"], "Die Dreifelderwirtschaft steigerte ab dem Frühmittelalter die Erträge."],
  ["Aus welchen drei Ständen bestand die mittelalterliche Gesellschaft nach damaliger Vorstellung?", "Klerus, Adel und Bauern/Bürger", ["Arbeiter, Angestellte, Beamte", "Senatoren, Ritter, Sklaven", "Kaufleute, Piraten, Fürsten"], "„Betende, Kämpfende und Arbeitende“ – so das Ständemodell."],
  ["Wo lebte und arbeitete ein Ritter üblicherweise?", "auf einer Burg", ["in einer Fabrik", "in einer Insula", "im Rathaus"], "Die Burg war Wohnsitz, Schutzbau und Herrschaftszeichen."],
  ["Wie wurde ein Junge üblicherweise zum Ritter?", "über die Stufen Page, Knappe, Ritterschlag", ["durch ein Studium", "durch Losentscheid", "durch den Kauf einer Urkunde beim Papst"], "Mit etwa sieben Jahren Page, ab vierzehn Knappe, dann Ritterschlag."],
  ["Was war ein wichtiger Handelsplatz innerhalb der Stadtmauern?", "der Marktplatz", ["das Aquädukt", "der Limes", "das Amphitheater"], "Am Marktplatz lagen Rathaus, Kirche und die Stände der Händler."],
  ["Wer gehörte in der Stadt zu den „Patriziern“?", "reiche, führende Kaufmannsfamilien", ["die ärmsten Tagelöhner", "fahrende Spielleute", "die Klosterschüler"], "Patrizierfamilien besetzten meist die Ratssitze."],
  ["Warum zogen viele Menschen im Mittelalter in die Städte?", "wegen Arbeit, Markt und der Aussicht auf Freiheit", ["wegen der U-Bahn", "wegen der Universität für alle", "weil das Land verboten wurde"], "Städte lockten mit Handwerk, Handel und persönlicher Freiheit."],
  ["Wie hieß die Residenzpfalz Karls des Großen, in deren Dom er begraben liegt?", "Aachen", ["Berlin", "Wien", "Paris"], "Karl der Große ließ in Aachen die Pfalzkapelle errichten."],
];

const FRUEHE_NEUZEIT = [
  ["In welchem Jahr erreichte Kolumbus Amerika?", "1492", ["1517", "1453", "1618"], "Am 12. Oktober 1492 landete Kolumbus auf einer Karibikinsel."],
  ["Was suchte Kolumbus eigentlich, als er nach Westen segelte?", "einen Seeweg nach Indien", ["den Nordpol", "Australien", "die Quelle des Nils"], "Er hielt die neue Welt für Inseln vor Indien – daher „Indianer“."],
  ["Wer fand 1498 den Seeweg nach Indien um Afrika herum?", "Vasco da Gama", ["Kolumbus", "Magellan", "Marco Polo"], "Vasco da Gama umsegelte das Kap der Guten Hoffnung bis Indien."],
  ["Wessen Expedition umsegelte als erste die Erde?", "die Expedition Magellans", ["die Flotte des Kolumbus", "die Wikinger unter Leif Eriksson", "die Flotte Jakob Fuggers"], "Magellan starb unterwegs; 1522 kehrte ein Schiff seiner Flotte zurück."],
  ["Welche Erfindungen erleichterten die Entdeckungsfahrten?", "Kompass, bessere Karten und die Karavelle", ["Dampfmaschine und Telegraf", "Fernrohr und Eisenbahn", "GPS und Radar"], "Wendige Karavellen und der Kompass machten Ozeanfahrten möglich."],
  ["Warum waren Gewürze wie Pfeffer in Europa so begehrt und teuer?", "Sie kamen über lange, teure Handelswege aus Asien.", ["Sie wuchsen nur in Skandinavien.", "Sie dienten als Baumaterial.", "Die Kirche verbot ihren Anbau in Asien."], "Zwischenhändler verteuerten die Ware – man suchte direkte Seewege."],
  ["Wie nannte man die spanischen Eroberer Amerikas?", "Konquistadoren", ["Konsuln", "Kreuzritter", "Kolonisten der Hanse"], "Konquistadoren wie Cortés und Pizarro eroberten die neuen Gebiete."],
  ["Welches Reich eroberte Hernán Cortés?", "das Reich der Azteken", ["das Reich der Inka", "das Osmanische Reich", "das Frankenreich"], "1521 fiel die Aztekenhauptstadt Tenochtitlán an Cortés."],
  ["Welches Reich eroberte Francisco Pizarro?", "das Reich der Inka", ["das Reich der Azteken", "das Reich der Maya allein", "Persien"], "Pizarro nahm 1532 den Inka-Herrscher Atahualpa gefangen."],
  ["Welche Folgen hatte die Eroberung Amerikas für die Ureinwohner?", "Millionen starben durch Krankheiten, Krieg und Zwangsarbeit.", ["Sie blieben völlig unberührt.", "Sie wanderten alle nach Europa aus.", "Sie übernahmen sofort die Macht in Spanien."], "Eingeschleppte Krankheiten wie Pocken wirkten verheerend."],
  ["Wer erfand um 1450 den Buchdruck mit beweglichen Metalllettern in Europa?", "Johannes Gutenberg", ["Martin Luther", "Leonardo da Vinci", "Jakob Fugger"], "Gutenbergs Druckerpresse machte Bücher schneller und billiger."],
  ["Warum war der Buchdruck für die Reformation so wichtig?", "Luthers Schriften konnten sich massenhaft und schnell verbreiten.", ["Er machte Bücher teurer und seltener.", "Er wurde nur für Bibeln in Latein genutzt.", "Er blieb bis 1800 verboten."], "Flugschriften trugen die reformatorischen Ideen ins ganze Reich."],
  ["Was veröffentlichte Martin Luther 1517?", "95 Thesen gegen den Ablasshandel", ["die Bibel auf Latein", "den Westfälischen Frieden", "eine Weltkarte"], "Mit den Thesen kritisierte Luther u. a. den Handel mit Ablassbriefen."],
  ["Wogegen richtete sich Luthers Kritik am Ablasshandel?", "Vergebung der Sünden sollte nicht käuflich sein.", ["Ablassbriefe waren ihm zu billig.", "Er wollte selbst Ablässe verkaufen.", "Er lehnte jede Kirche ab."], "Nach Luther zählt allein Gottes Gnade und der Glaube."],
  ["Was geschah 1521 auf dem Reichstag zu Worms?", "Luther widerrief nicht und wurde geächtet.", ["Luther wurde zum Papst gewählt.", "Der Dreißigjährige Krieg endete.", "Kolumbus berichtete von Amerika."], "Trotz Acht hielt Luther an seinen Lehren fest."],
  ["Was tat Luther auf der Wartburg?", "Er übersetzte das Neue Testament ins Deutsche.", ["Er baute eine Druckerpresse.", "Er plante einen Kreuzzug.", "Er schrieb den Augsburger Religionsfrieden."], "Als „Junker Jörg“ übersetzte er 1521/22 das Neue Testament."],
  ["Was legte der Augsburger Religionsfrieden von 1555 fest?", "Der Landesherr bestimmt die Konfession seines Landes.", ["Alle mussten katholisch bleiben.", "Religion wurde völlig frei für jeden Einzelnen.", "Der Papst wählte fortan die Kaiser."], "„Cuius regio, eius religio“ – wessen Land, dessen Glaube."],
  ["Wann tobte der Dreißigjährige Krieg?", "1618 bis 1648", ["1517 bis 1547", "1492 bis 1522", "1789 bis 1815"], "Der Krieg verwüstete weite Teile Mitteleuropas."],
  ["Womit endete der Dreißigjährige Krieg?", "mit dem Westfälischen Frieden 1648", ["mit dem Wiener Kongress", "mit dem Augsburger Religionsfrieden", "mit der Völkerschlacht"], "In Münster und Osnabrück wurde 1648 Frieden geschlossen."],
  ["Was forderten die Bauern 1525 im Bauernkrieg unter anderem?", "Abschaffung der Leibeigenschaft und geringere Abgaben", ["die Entdeckung neuer Kolonien", "mehr Ablassbriefe", "die Krönung Luthers zum Kaiser"], "Die „Zwölf Artikel“ verlangten mehr Rechte für die Bauern."],
  ["Was bedeutet „Renaissance“?", "Wiedergeburt – gemeint ist die der Antike", ["Neuzeitliche Seefahrt", "Wiederaufbau nach dem Krieg", "Erfindung der Malerei"], "Kunst und Wissenschaft orientierten sich neu an der Antike."],
  ["Wofür steht der Humanismus der Frühen Neuzeit?", "Der Mensch und die antike Bildung rücken in den Mittelpunkt.", ["Nur das Jenseits zählt.", "Bildung wird verboten.", "Maschinen ersetzen den Menschen."], "Humanisten studierten antike Texte und betonten die Würde des Menschen."],
  ["Welcher Künstler malte die „Mona Lisa“ und entwarf Flugmaschinen?", "Leonardo da Vinci", ["Albrecht Dürer", "Michelangelo", "Rembrandt"], "Leonardo war Maler, Ingenieur und Naturforscher – ein Universalgenie."],
  ["Welches Weltbild begründete Kopernikus?", "das heliozentrische – die Erde kreist um die Sonne", ["das geozentrische – alles kreist um die Erde", "die Erde als Scheibe", "das Weltbild ohne Sonne"], "Kopernikus stellte die Sonne ins Zentrum, Galilei lieferte Belege."],
  ["Welcher König gilt als Musterbeispiel des Absolutismus („L'État, c'est moi“)?", "Ludwig XIV. von Frankreich", ["Heinrich IV. im Investiturstreit", "Karl der Große", "Wilhelm II."], "Der „Sonnenkönig“ regierte ohne Stände von Versailles aus."],
  ["Welche Pflanzen kamen nach 1492 aus Amerika nach Europa?", "Kartoffel, Mais, Tomate und Kakao", ["Weizen, Gerste und Roggen", "Oliven und Wein", "Reis und Tee"], "Der „Kolumbus-Austausch“ brachte neue Nutzpflanzen in beide Richtungen."],
  ["Welche Familie wurde durch Handel und Bankgeschäfte in Augsburg berühmt?", "die Fugger", ["die Habsburger als Kaufleute", "die Medici von Lübeck", "die Welfen von Köln"], "Jakob Fugger „der Reiche“ finanzierte sogar Kaiserwahlen."],
];

const INDUSTRIALISIERUNG = [
  ["Wer verbesserte die Dampfmaschine entscheidend?", "James Watt", ["Werner von Siemens", "Karl Marx", "Gutenberg"], "Watts verbesserte Dampfmaschine (ab 1769) trieb Fabriken und Loks an."],
  ["In welchem Land begann die Industrialisierung?", "in England", ["in Deutschland", "in Russland", "in Italien"], "England hatte Kohle, Kapital, Kolonien und Absatzmärkte."],
  ["Welche Maschine revolutionierte das Spinnen von Garn?", "die „Spinning Jenny“", ["der Webstuhl von Gutenberg", "die Nähmaschine von Watt", "der Telegraf"], "Mit der Spinning Jenny konnte ein Arbeiter viele Spindeln bedienen."],
  ["Zwischen welchen Städten fuhr 1835 die erste deutsche Eisenbahn?", "Nürnberg und Fürth", ["Berlin und Hamburg", "München und Wien", "Köln und Paris"], "Der „Adler“ fuhr am 7. Dezember 1835 von Nürnberg nach Fürth."],
  ["Welche Rohstoffe waren Motor der Industrialisierung?", "Kohle und Eisen/Stahl", ["Gold und Silber", "Salz und Bernstein", "Öl und Uran"], "Kohle lieferte Energie, Eisen und Stahl das Material für Maschinen."],
  ["Welche Region wurde zum größten deutschen Industriegebiet?", "das Ruhrgebiet", ["das Allgäu", "die Lüneburger Heide", "der Schwarzwald"], "Zechen und Stahlwerke prägten das Ruhrgebiet."],
  ["Was verstand man unter der „Sozialen Frage“?", "die Not der Arbeiter: lange Arbeitszeiten, niedrige Löhne, schlechte Wohnungen", ["die Frage nach neuen Kolonien", "den Streit um den Buchdruck", "die Mode am Hof"], "Die Industrialisierung schuf massenhaft Elend in den Städten."],
  ["Warum arbeiteten im 19. Jahrhundert viele Kinder in Fabriken?", "Die Familien brauchten jeden Lohn zum Überleben.", ["Schule war verboten.", "Kinderarbeit war ein Hobby.", "Maschinen konnten nur Kinder bedienen, Erwachsene nie."], "Kinderlöhne waren winzig, aber für arme Familien nötig."],
  ["Wie reagierten Arbeiter auf ihre schlechte Lage?", "Sie gründeten Gewerkschaften und streikten.", ["Sie kauften die Fabriken auf.", "Sie wanderten alle nach Asien aus.", "Sie bauten Burgen."], "Gewerkschaften kämpften für höhere Löhne und kürzere Arbeitszeiten."],
  ["Wer verfasste 1848 das „Kommunistische Manifest“?", "Karl Marx und Friedrich Engels", ["Bismarck und Wilhelm I.", "Watt und Stephenson", "Luther und Melanchthon"], "Marx und Engels riefen die Arbeiter zum Zusammenschluss auf."],
  ["Mit welchen Gesetzen reagierte Bismarck auf die Soziale Frage?", "mit Sozialversicherungen gegen Krankheit, Unfall, Alter", ["mit der Abschaffung aller Fabriken", "mit dem Verbot der Eisenbahn", "mit der Einführung des Zehnten"], "Kranken- (1883), Unfall- (1884) und Rentenversicherung (1889)."],
  ["Wie veränderte die Industrialisierung die Städte?", "Sie wuchsen rasant – viele Menschen zogen vom Land zu (Urbanisierung).", ["Sie schrumpften stark.", "Sie wurden alle abgerissen.", "Sie blieben unverändert."], "Landflucht und Fabrikarbeit ließen Arbeiterviertel entstehen."],
  ["Wie wohnten viele Arbeiterfamilien in den Industriestädten?", "beengt in Mietskasernen, oft ohne fließendes Wasser", ["in Villen mit Garten", "in Burgen", "in Klöstern"], "Ganze Familien teilten sich oft ein bis zwei Zimmer."],
  ["Welche Erfindung beschleunigte die Nachrichtenübermittlung im 19. Jahrhundert?", "der Telegraf", ["das Smartphone", "der Buchdruck", "die Rohrpost im Mittelalter"], "Mit Morsezeichen reisten Nachrichten erstmals schneller als Boten."],
  ["Welches Unternehmen wurde durch Stahl und Kanonen in Essen groß?", "Krupp", ["Siemens in Essen", "die Hanse", "die Fugger"], "Die Gussstahlfabrik Krupp wurde zum Industriegiganten."],
  ["Was bedeutete die Fabrikarbeit für den Arbeitstag der Menschen?", "feste Zeiten, Maschinentakt und oft 12 bis 16 Stunden Arbeit", ["freie Zeiteinteilung wie auf dem Bauernhof", "höchstens 4 Stunden Arbeit", "Arbeit nur im Sommer"], "Die Fabrikordnung mit Sirenen und Strafen bestimmte den Tag."],
  ["Warum verloren viele Handwerker durch die Industrialisierung ihre Existenz?", "Maschinen stellten Waren schneller und billiger her.", ["Handwerk wurde gesetzlich verboten.", "Es gab keine Rohstoffe mehr.", "Alle Kunden zogen aufs Land."], "Etwa Weber konnten mit mechanischen Webstühlen nicht konkurrieren."],
  ["Was war die Landflucht?", "die Abwanderung vieler Menschen vom Land in die Industriestädte", ["die Flucht der Städter aufs Land", "eine mittelalterliche Wallfahrt", "die Auswanderung des Adels"], "Arbeit in Fabriken zog die Landbevölkerung in die Städte."],
  ["Welche neue Antriebskraft ersetzte zunehmend Wasserrad und Muskelkraft?", "die Dampfkraft", ["die Atomkraft", "die Windkraft auf See", "die Solarkraft"], "Dampfmaschinen machten Fabriken unabhängig von Flussläufen."],
  ["Welche Klasse entstand durch die Industrialisierung neu?", "die Industriearbeiterschaft (das Proletariat)", ["der Klerus", "die Ritterschaft", "die Zünfte"], "Lohnarbeiter ohne eigene Produktionsmittel prägten die neue Zeit."],
  ["Was war ein Streik?", "eine gemeinsame Arbeitsniederlegung, um Forderungen durchzusetzen", ["ein Volksfest der Fabrikanten", "eine Maschine", "eine Steuer"], "Mit Streiks erkämpften Arbeiter Lohnerhöhungen und kürzere Zeiten."],
  ["Warum bauten Unternehmer wie Krupp Werkswohnungen?", "um Arbeiter zu binden und ihre Loyalität zu sichern", ["aus reiner Bauleidenschaft", "weil das Gesetz Villen für alle vorschrieb", "um Burgen zu ersetzen"], "Werkswohnungen und Kantinen banden die Belegschaft an die Firma."],
  ["Welches Verkehrsmittel veränderte den Gütertransport im 19. Jahrhundert am stärksten?", "die Eisenbahn", ["das Flugzeug", "das Containerschiff", "das Automobil"], "Die Eisenbahn transportierte Kohle, Stahl und Menschen schnell und billig."],
];

/* Epochen-Ereignisse [Bezeichnung, Jahr] für Reihenfolge-Fragen */
const EPOCHEN_EVENTS = [
  ["Bau der großen Pyramiden in Ägypten", -2500],
  ["sagenhafte Gründung Roms", -753],
  ["Blüte der Demokratie in Athen", -450],
  ["Ermordung Caesars", -44],
  ["Untergang des Weströmischen Reiches", 476],
  ["Kaiserkrönung Karls des Großen", 800],
  ["Beginn des Ersten Kreuzzugs", 1096],
  ["Ausbruch der großen Pest in Europa", 1347],
  ["Erfindung des Buchdrucks durch Gutenberg", 1450],
  ["Kolumbus erreicht Amerika", 1492],
  ["Luthers 95 Thesen", 1517],
  ["Beginn des Dreißigjährigen Krieges", 1618],
  ["Beginn der Französischen Revolution", 1789],
  ["erste deutsche Eisenbahnfahrt Nürnberg–Fürth", 1835],
  ["Gründung des Deutschen Kaiserreichs", 1871],
];

const EPOCHEN_NAMEN = [["Antike", 1], ["Mittelalter", 2], ["Frühe Neuzeit", 3], ["Industrialisierung / 19. Jahrhundert", 4]];

function epochenReihenfolgeGen(r) {
  // 3 Ereignisse ziehen und chronologisch ordnen lassen
  const events = r.shuffle(EPOCHEN_EVENTS).slice(0, 3);
  const sortiert = events.slice().sort((a, b) => a[1] - b[1]);
  const richtig = sortiert.map((e) => e[0]).join(" → ");
  // alle Permutationen außer der richtigen als Distraktoren
  const [a, b, c] = sortiert.map((e) => e[0]);
  const perms = [[a, c, b], [b, a, c], [b, c, a], [c, a, b], [c, b, a]].map((p) => p.join(" → "));
  const liste = r.shuffle(events.map((e) => e[0])).join(", ");
  return mc(r, "Epochen-Reihenfolge",
    `${r.pick(LEADS)}Bringe in die richtige zeitliche Reihenfolge (früheste zuerst): ${liste}.`,
    richtig, r.shuffle(perms),
    `Chronologisch: ${sortiert.map((e) => `${e[0]} (${e[1] < 0 ? Math.abs(e[1]) + " v. Chr." : e[1]})`).join(" → ")}.`);
}

function epochenZuordnungGen(r) {
  const [name] = r.pick(EPOCHEN_NAMEN);
  const folge = {
    "Antike": ["Antike → Mittelalter → Frühe Neuzeit → Industrialisierung", "Sie ist die früheste der vier Epochen."],
  };
  void folge;
  const reihen = EPOCHEN_NAMEN.map((e) => e[0]);
  const idx = reihen.indexOf(name);
  const frage = idx === 0
    ? `Welche dieser Epochen kam als erste?`
    : `Welche Epoche folgt unmittelbar auf ${reihen[idx - 1]}?`;
  const richtig = name;
  return mc(r, "Epochen-Reihenfolge", `${r.pick(LEADS)}${frage}`,
    richtig, pickN(r, reihen, richtig, 3),
    `Reihenfolge der Epochen: ${reihen.join(" → ")}.`);
}

function geschichte2Generators(klasse) {
  const pools = [];
  if (klasse === 6) pools.push(ANTIKE);
  if (klasse === 7) pools.push(ANTIKE, MITTELALTER);
  if (klasse === 8) pools.push(MITTELALTER, FRUEHE_NEUZEIT);
  if (klasse === 9) pools.push(FRUEHE_NEUZEIT, INDUSTRIALISIERUNG);
  if (klasse === 10) pools.push(ANTIKE, MITTELALTER, FRUEHE_NEUZEIT, INDUSTRIALISIERUNG);

  const themaName = (pool) =>
    pool === ANTIKE ? "Antike: Alltag in Griechenland und Rom"
      : pool === MITTELALTER ? "Mittelalter: Lehnswesen, Stadt und Zünfte"
        : pool === FRUEHE_NEUZEIT ? "Frühe Neuzeit: Entdeckungen und Reformation"
          : "Industrialisierung";

  const gens = [];
  for (const pool of pools) {
    const gen = (r) => {
      const [q, a, d, e] = r.pick(pool);
      return mc(r, themaName(pool), `${r.pick(LEADS)}${q}`, a, r.shuffle(d), e);
    };
    gens.push(gen, gen); // Fakten doppelt gewichten gegenüber Reihenfolge-Fragen
  }

  gens.push(epochenReihenfolgeGen);
  gens.push(epochenZuordnungGen);
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

  console.log("Englisch-Ergänzung 5 (Klasse 5–13, je >= 400):");
  for (let k = 5; k <= 13; k++)
    total += writeBank("englisch5", k, generateBank(101000 + k, 400, englisch5Generators(k)), 400);

  console.log("Deutsch-Ergänzung 4 (Klasse 5–10, je >= 400):");
  for (let k = 5; k <= 10; k++)
    total += writeBank("deutsch4", k, generateBank(102000 + k, 400, deutsch4Generators(k)), 400);

  console.log("Geschichte-Ergänzung 2 (Klasse 6–10, je >= 350):");
  for (let k = 6; k <= 10; k++)
    total += writeBank("geschichte2", k, generateBank(103000 + k, 350, geschichte2Generators(k)), 350);

  console.log(`\nGesamt (Runde 10): ${total} Fragen.`);
}

main();
