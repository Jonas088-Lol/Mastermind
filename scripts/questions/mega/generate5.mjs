/**
 * MEGA-Fragen-Generator RUNDE 5 für MasterMind.
 *
 * Ergänzt die Fragenbank aus generate.mjs … generate4.mjs im GLEICHEN Format
 *   scripts/questions/mega/data/<fach>-klasse<k>.json
 * mit [{ topic, question, options[4], correct(Index), explanation }].
 *
 * Fächer/Umfang:
 *   - deutsch     Klasse 11–13, >= 500/Klasse (Epochen, Stilmittel, Erörterung, Konjunktiv)
 *                 Dateiname: deutsch2-klasse<k>.json falls deutsch-klasse<k>.json existiert,
 *                 sonst deutsch-klasse<k>.json (für 11–13 existiert bisher keine).
 *   - ethik       Klasse 5–10, >= 300/Klasse (Weltreligionen, ab Kl. 9 Philosophen)
 *   - erdkunde    Klasse 9–13, >= 400/Klasse (Klimazonen, Plattentektonik, Demografie, Entwicklung)
 *   - englisch2   Klasse 5–10, >= 400/Klasse (Zeitformen, some/any, much/many, Steigerung, question tags)
 *   - geschichte  Klasse 11–13, >= 300/Klasse (Weimar, NS-Zeit, Kalter Krieg, Einheit)
 *
 * Deterministisch (mulberry32-Seed). Keine Abhängigkeiten, reines Node.
 * Bestehende Skripte/Dateien werden NICHT verändert (nur neue Klassen-Dateien).
 *
 * Aufruf (vom Repo-Root):
 *   node scripts/questions/mega/generate5.mjs
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

/** Sammelt count Fragen mit eindeutigem Fragetext. */
function generateBank(seed, count, generators) {
  const rng = makeRng(seed);
  const out = [];
  const texts = new Set();
  let attempts = 0;
  const maxAttempts = count * 400;
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

/* ══════════════════════════ 1) DEUTSCH 11–13 ══════════════════════════ */

// [Werk, Autor, Epoche]
const D_WERKE = [
  ["Die Leiden des jungen Werthers", "Johann Wolfgang von Goethe", "Sturm und Drang"],
  ["Die Räuber", "Friedrich Schiller", "Sturm und Drang"],
  ["Kabale und Liebe", "Friedrich Schiller", "Sturm und Drang"],
  ["Prometheus (Hymne)", "Johann Wolfgang von Goethe", "Sturm und Drang"],
  ["Faust. Der Tragödie erster Teil", "Johann Wolfgang von Goethe", "Weimarer Klassik"],
  ["Iphigenie auf Tauris", "Johann Wolfgang von Goethe", "Weimarer Klassik"],
  ["Wilhelm Tell", "Friedrich Schiller", "Weimarer Klassik"],
  ["Maria Stuart", "Friedrich Schiller", "Weimarer Klassik"],
  ["Der Sandmann", "E. T. A. Hoffmann", "Romantik"],
  ["Der goldne Topf", "E. T. A. Hoffmann", "Romantik"],
  ["Aus dem Leben eines Taugenichts", "Joseph von Eichendorff", "Romantik"],
  ["Hymnen an die Nacht", "Novalis", "Romantik"],
  ["Woyzeck", "Georg Büchner", "Vormärz"],
  ["Dantons Tod", "Georg Büchner", "Vormärz"],
  ["Deutschland. Ein Wintermärchen", "Heinrich Heine", "Vormärz"],
  ["Effi Briest", "Theodor Fontane", "Realismus"],
  ["Irrungen, Wirrungen", "Theodor Fontane", "Realismus"],
  ["Der Schimmelreiter", "Theodor Storm", "Realismus"],
  ["Kleider machen Leute", "Gottfried Keller", "Realismus"],
  ["Die Weber", "Gerhart Hauptmann", "Naturalismus"],
  ["Bahnwärter Thiel", "Gerhart Hauptmann", "Naturalismus"],
  ["Die Verwandlung", "Franz Kafka", "Moderne/Expressionismus"],
  ["Der Prozess", "Franz Kafka", "Moderne/Expressionismus"],
  ["Weltende (Gedicht)", "Jakob van Hoddis", "Moderne/Expressionismus"],
  ["Berlin Alexanderplatz", "Alfred Döblin", "Neue Sachlichkeit"],
  ["Der Steppenwolf", "Hermann Hesse", "Moderne/Expressionismus"],
  ["Buddenbrooks", "Thomas Mann", "Moderne/Expressionismus"],
  ["Draußen vor der Tür", "Wolfgang Borchert", "Trümmerliteratur"],
  ["Das Brot (Kurzgeschichte)", "Wolfgang Borchert", "Trümmerliteratur"],
  ["Die Blechtrommel", "Günter Grass", "Nachkriegsliteratur"],
  ["Ansichten eines Clowns", "Heinrich Böll", "Nachkriegsliteratur"],
  ["Die Physiker", "Friedrich Dürrenmatt", "Nachkriegsliteratur"],
  ["Der Besuch der alten Dame", "Friedrich Dürrenmatt", "Nachkriegsliteratur"],
  ["Homo faber", "Max Frisch", "Nachkriegsliteratur"],
  ["Andorra", "Max Frisch", "Nachkriegsliteratur"],
  ["Der geteilte Himmel", "Christa Wolf", "DDR-Literatur"],
  ["Leben des Galilei", "Bertolt Brecht", "Exilliteratur"],
  ["Mutter Courage und ihre Kinder", "Bertolt Brecht", "Exilliteratur"],
  ["Nathan der Weise", "Gotthold Ephraim Lessing", "Aufklärung"],
  ["Emilia Galotti", "Gotthold Ephraim Lessing", "Aufklärung"],
  ["Minna von Barnhelm", "Gotthold Ephraim Lessing", "Aufklärung"],
];

// [Epoche, Zeitraum]
const D_EPOCHEN_ZEIT = [
  ["Barock", "ca. 1600–1720"],
  ["Aufklärung", "ca. 1720–1785"],
  ["Sturm und Drang", "ca. 1765–1785"],
  ["Weimarer Klassik", "ca. 1786–1832"],
  ["Romantik", "ca. 1795–1835"],
  ["Vormärz", "ca. 1830–1848"],
  ["Realismus", "ca. 1848–1890"],
  ["Naturalismus", "ca. 1880–1900"],
  ["Expressionismus", "ca. 1910–1925"],
  ["Neue Sachlichkeit", "ca. 1925–1933"],
  ["Trümmerliteratur", "ca. 1945–1950"],
];

// [Epoche, zentrales Merkmal]
const D_EPOCHEN_MERKMAL = [
  ["Barock", "Vergänglichkeitsmotive wie Vanitas, Memento mori und Carpe diem"],
  ["Aufklärung", "Vernunft als Leitidee, Erziehung des Menschen zur Mündigkeit"],
  ["Sturm und Drang", "Geniekult, Gefühl und Rebellion junger Autoren gegen Autoritäten"],
  ["Weimarer Klassik", "Ideal der Humanität, Harmonie und formale Strenge nach antikem Vorbild"],
  ["Romantik", "Sehnsucht, Nacht- und Traummotive, die blaue Blume als Symbol"],
  ["Vormärz", "politisch engagierte, gesellschaftskritische Literatur vor der Revolution 1848"],
  ["Realismus", "objektiv wirkende, aber künstlerisch verklärte Darstellung der bürgerlichen Wirklichkeit"],
  ["Naturalismus", "exakte Abbildung der Wirklichkeit inklusive sozialen Elends, Sekundenstil"],
  ["Expressionismus", "Großstadt-, Krieg- und Ich-Zerfall-Motive, expressive Bildsprache"],
  ["Trümmerliteratur", "karge Sprache, Heimkehrer- und Nachkriegsthematik unmittelbar nach 1945"],
];

// [Stilmittel, Beispielsatz, Kurzdefinition]
const D_STILMITTEL = [
  ["Alliteration", "Milch macht müde Männer munter.", "gleicher Anlaut aufeinanderfolgender Wörter"],
  ["Anapher", "Er lachte. Er weinte. Er schwieg.", "Wiederholung am Satz-/Versanfang"],
  ["Metapher", "Sie ertrank in einem Meer aus Arbeit.", "bildlicher Ausdruck ohne Vergleichswort"],
  ["Vergleich", "Er kämpfte wie ein Löwe.", "Verknüpfung zweier Bereiche mit ,wie' oder ,als'"],
  ["Personifikation", "Die Sonne lacht vom Himmel.", "Vermenschlichung von Dingen oder Abstraktem"],
  ["Hyperbel", "Ich habe dir das schon tausendmal gesagt.", "starke Übertreibung"],
  ["Ironie", "Na super, schon wieder Stau – was für ein herrlicher Tag!", "Gemeint ist das Gegenteil des Gesagten"],
  ["Oxymoron", "Das war ein offenes Geheimnis.", "Verbindung zweier sich widersprechender Begriffe"],
  ["Antithese", "Die Rede war kurz, die Wirkung war lang.", "Gegenüberstellung gegensätzlicher Aussagen"],
  ["Klimax", "Er kam, sah und siegte.", "stufenweise Steigerung"],
  ["Ellipse", "Je früher, desto besser.", "Auslassung von Satzteilen"],
  ["Rhetorische Frage", "Wer glaubt denn so etwas?", "Frage, auf die keine Antwort erwartet wird"],
  ["Euphemismus", "Er ist von uns gegangen.", "beschönigende Umschreibung"],
  ["Parallelismus", "Heiß ist die Liebe, kalt ist der Schnee.", "gleicher Satzbau aufeinanderfolgender Sätze"],
  ["Chiasmus", "Die Kunst ist lang, und kurz ist unser Leben.", "Überkreuzstellung von Satzgliedern"],
  ["Onomatopoesie", "Es zischte und knallte im Ofen.", "Lautmalerei"],
  ["Symbol", "Die weiße Taube stand über dem Verhandlungstisch.", "Sinnbild für einen abstrakten Zusammenhang"],
  ["Litotes", "Das war nicht schlecht gemacht.", "Hervorhebung durch doppelte Verneinung/Untertreibung"],
  ["Metonymie", "Das ganze Stadion jubelte.", "Ersetzung durch einen sachlich verwandten Begriff"],
  ["Pleonasmus", "Der weiße Schimmel graste auf der Weide.", "bedeutungsgleiche Häufung"],
  ["Anakoluth", "Ich wollte dir doch – ach, vergiss es einfach.", "Satzbruch"],
  ["Inversion", "Groß war seine Freude an diesem Morgen.", "Umstellung der üblichen Wortstellung"],
  ["Enumeration", "Er packte Hemden, Hosen, Schuhe und Bücher ein.", "Aufzählung"],
  ["Neologismus", "Sie war eine echte Bedenkenträgerin im ,Meckermodus'.", "Wortneuschöpfung"],
];

// [Begriff, Definition] Erörterung/Textsorten
const D_TEXTBEGRIFFE = [
  ["These", "eine Behauptung, die in der Erörterung begründet werden soll"],
  ["Antithese (Erörterung)", "eine Gegenbehauptung zur aufgestellten These"],
  ["Argument", "eine Begründung, die eine These stützt"],
  ["Beleg", "ein Beispiel, Zitat oder Faktum, das ein Argument stützt"],
  ["Synthese", "der vermittelnde Ausgleich zwischen These und Antithese"],
  ["dialektische Erörterung", "eine Erörterung, die Pro- und Kontra-Argumente abwägt"],
  ["lineare Erörterung", "eine Erörterung, die nur eine Position steigernd begründet"],
  ["textgebundene Erörterung", "eine Erörterung, die von einem vorgelegten Text ausgeht"],
  ["Sachtextanalyse", "die Untersuchung von Aufbau, Argumentation und Sprache eines Sachtextes"],
  ["Kommentar", "eine meinungsbetonte journalistische Textsorte"],
  ["Glosse", "ein kurzer, pointiert-satirischer Meinungstext"],
  ["Reportage", "eine anschauliche, erlebnisnahe journalistische Darstellungsform"],
  ["Nachricht", "eine sachlich-informierende journalistische Textsorte nach dem Prinzip des Wichtigsten zuerst"],
  ["Essay", "eine offene, gedanklich kreisende Abhandlung über ein Thema"],
  ["Parabel", "eine lehrhafte Erzählung, deren Bildebene auf eine Sachebene übertragen wird"],
  ["Novelle", "eine kürzere Erzählung mit einer ,unerhörten Begebenheit'"],
  ["Kurzgeschichte", "eine kurze Erzählung mit offenem Anfang und offenem Ende"],
  ["Drama", "eine für die Bühne bestimmte literarische Gattung in Dialogform"],
  ["Epik", "die erzählende literarische Gattung"],
  ["Lyrik", "die Gattung der Gedichte"],
  ["auktorialer Erzähler", "ein allwissender Erzähler, der kommentierend über den Figuren steht"],
  ["personaler Erzähler", "ein Erzähler, der aus der Sicht einer Figur erzählt"],
  ["Ich-Erzähler", "ein Erzähler, der als ,ich' selbst am Geschehen beteiligt ist"],
  ["erlebte Rede", "Figurengedanken in der 3. Person Indikativ Präteritum"],
  ["innerer Monolog", "unmittelbar wiedergegebene Gedanken einer Figur in der Ich-Form"],
  ["Exposition", "der einführende Teil eines Dramas"],
  ["Peripetie", "der Umschwung/Wendepunkt im Drama"],
  ["Katastrophe (Drama)", "der tragische Schluss des klassischen Trauerspiels"],
];

// [Aussage Indikativ, Konjunktiv I, Konjunktiv II]
const D_KONJUNKTIV = [
  ["er ist", "er sei", "er wäre"],
  ["sie hat", "sie habe", "sie hätte"],
  ["er kann", "er könne", "er könnte"],
  ["sie muss", "sie müsse", "sie müsste"],
  ["er will", "er wolle", "er wollte"],
  ["sie kommt", "sie komme", "sie käme"],
  ["er geht", "er gehe", "er ginge"],
  ["sie weiß", "sie wisse", "sie wüsste"],
  ["er gibt", "er gebe", "er gäbe"],
  ["sie sieht", "sie sehe", "sie sähe"],
  ["er fährt", "er fahre", "er führe"],
  ["sie nimmt", "sie nehme", "sie nähme"],
  ["er bleibt", "er bleibe", "er bliebe"],
  ["sie wird", "sie werde", "sie würde"],
  ["er darf", "er dürfe", "er dürfte"],
  ["sie soll", "sie solle", "sie sollte"],
  ["er tut", "er tue", "er täte"],
  ["sie lässt", "sie lasse", "sie ließe"],
  ["er findet", "er finde", "er fände"],
  ["sie ruft", "sie rufe", "sie riefe"],
];

function deutschGenerators() {
  const autoren = [...new Set(D_WERKE.map((w) => w[1]))];
  const epochen = [...new Set(D_WERKE.map((w) => w[2]))];
  const stilmittelNamen = D_STILMITTEL.map((s) => s[0]);
  const begriffe = D_TEXTBEGRIFFE.map((b) => b[0]);
  return [
    (r) => {
      const [werk, autor] = r.pick(D_WERKE);
      return mc(r, "Literaturepochen", `${r.pick(LEADS)}Wer schrieb das Werk „${werk}“?`,
        autor, pickN(r, autoren, autor, 3), `„${werk}“ stammt von ${autor}.`);
    },
    (r) => {
      const [werk, autor, epoche] = r.pick(D_WERKE);
      return mc(r, "Literaturepochen", `${r.pick(LEADS)}Welcher Epoche wird das Werk „${werk}“ üblicherweise zugeordnet?`,
        epoche, pickN(r, epochen, epoche, 3), `„${werk}“ (${autor}) gilt als Werk der Epoche ${epoche}.`);
    },
    (r) => {
      const [epoche, zeit] = r.pick(D_EPOCHEN_ZEIT);
      const dist = D_EPOCHEN_ZEIT.map((e) => e[1]).filter((z) => z !== zeit);
      return mc(r, "Literaturepochen", `${r.pick(LEADS)}In welchen Zeitraum fällt die Epoche ${epoche}?`,
        zeit, pickN(r, dist, zeit, 3), `${epoche}: ${zeit}.`);
    },
    (r) => {
      const [epoche, merkmal] = r.pick(D_EPOCHEN_MERKMAL);
      const dist = D_EPOCHEN_MERKMAL.map((e) => e[0]).filter((e) => e !== epoche);
      return mc(r, "Literaturepochen", `${r.pick(LEADS)}Für welche Epoche ist Folgendes typisch: ${merkmal}?`,
        epoche, pickN(r, dist, epoche, 3), `${epoche}: ${merkmal}.`);
    },
    (r) => {
      const [name, beispiel, def] = r.pick(D_STILMITTEL);
      return mc(r, "Stilmittel", `${r.pick(LEADS)}Welches Stilmittel liegt hier vor: „${beispiel}“?`,
        name, pickN(r, stilmittelNamen, name, 3), `${name}: ${def}. Beispiel: „${beispiel}“`);
    },
    (r) => {
      const [name, beispiel, def] = r.pick(D_STILMITTEL);
      return mc(r, "Stilmittel", `${r.pick(LEADS)}Wie heißt das Stilmittel mit dieser Definition: ${def}?`,
        name, pickN(r, stilmittelNamen, name, 3), `${name} – z. B. „${beispiel}“`);
    },
    (r) => {
      const [begriff, def] = r.pick(D_TEXTBEGRIFFE);
      return mc(r, "Erörterung & Textsorten", `${r.pick(LEADS)}Was versteht man unter dem Begriff „${begriff}“?`,
        def, pickN(r, D_TEXTBEGRIFFE.map((b) => b[1]), def, 3), `${begriff}: ${def}.`);
    },
    (r) => {
      const [begriff, def] = r.pick(D_TEXTBEGRIFFE);
      return mc(r, "Erörterung & Textsorten", `${r.pick(LEADS)}Welcher Begriff ist gemeint: ${def}?`,
        begriff, pickN(r, begriffe, begriff, 3), `${begriff}: ${def}.`);
    },
    (r) => {
      const [ind, k1, k2] = r.pick(D_KONJUNKTIV);
      const dist = [k2, ind, ind.split(" ")[0] + " würde " + (ind.split(" ")[1] || "sein")];
      return mc(r, "Konjunktiv", `${r.pick(LEADS)}Wie lautet der Konjunktiv I zu „${ind}“ (für die indirekte Rede)?`,
        k1, dist, `Konjunktiv I von „${ind}“: „${k1}“; Konjunktiv II wäre „${k2}“.`);
    },
    (r) => {
      const [ind, k1, k2] = r.pick(D_KONJUNKTIV);
      const dist = [k1, ind, ind.split(" ")[0] + " werde " + (ind.split(" ")[1] || "sein")];
      return mc(r, "Konjunktiv", `${r.pick(LEADS)}Wie lautet der Konjunktiv II zu „${ind}“ (Irrealis)?`,
        k2, dist, `Konjunktiv II von „${ind}“: „${k2}“; Konjunktiv I ist „${k1}“.`);
    },
  ];
}

/* ══════════════════════════ 2) ETHIK/RELIGION 5–10 ══════════════════════════ */

const RELIGIONEN = ["Judentum", "Christentum", "Islam", "Hinduismus", "Buddhismus"];

// [Religion, Kategorie, Antwort]
const E_FAKTEN = [
  ["Judentum", "Heilige Schrift", "die Tora"],
  ["Christentum", "Heilige Schrift", "die Bibel"],
  ["Islam", "Heilige Schrift", "der Koran"],
  ["Hinduismus", "Heilige Schrift", "die Veden"],
  ["Buddhismus", "wichtige Schriftensammlung", "der Pali-Kanon"],
  ["Judentum", "Gotteshaus", "die Synagoge"],
  ["Christentum", "Gotteshaus", "die Kirche"],
  ["Islam", "Gotteshaus", "die Moschee"],
  ["Hinduismus", "Gotteshaus", "der Tempel (Mandir)"],
  ["Buddhismus", "religiöses Gebäude", "der Tempel bzw. die Stupa/Pagode"],
  ["Judentum", "wichtiges Symbol", "der Davidstern"],
  ["Christentum", "wichtiges Symbol", "das Kreuz"],
  ["Islam", "häufig verwendetes Symbol", "Halbmond und Stern"],
  ["Hinduismus", "wichtiges Symbol", "die Silbe Om"],
  ["Buddhismus", "wichtiges Symbol", "das achtspeichige Rad (Dharmachakra)"],
  ["Judentum", "wöchentlicher Ruhetag", "der Schabbat (Samstag)"],
  ["Christentum", "wöchentlicher Feiertag", "der Sonntag"],
  ["Islam", "Tag des Gemeinschaftsgebets", "der Freitag"],
  ["Judentum", "wichtiges Fest", "Pessach"],
  ["Judentum", "höchster Feiertag", "Jom Kippur"],
  ["Judentum", "achttägiges Lichterfest", "Chanukka"],
  ["Christentum", "Fest der Auferstehung Jesu", "Ostern"],
  ["Christentum", "Fest der Geburt Jesu", "Weihnachten"],
  ["Christentum", "Fest des Heiligen Geistes", "Pfingsten"],
  ["Islam", "Fest des Fastenbrechens nach dem Ramadan", "das Zuckerfest (Eid al-Fitr)"],
  ["Islam", "Opferfest", "Eid al-Adha"],
  ["Islam", "Fastenmonat", "der Ramadan"],
  ["Hinduismus", "Lichterfest", "Diwali"],
  ["Hinduismus", "Frühlingsfest der Farben", "Holi"],
  ["Buddhismus", "Fest zu Ehren Buddhas", "Vesakh"],
  ["Christentum", "zentrale Gestalt", "Jesus Christus"],
  ["Islam", "Prophet, dem der Koran offenbart wurde", "Mohammed"],
  ["Buddhismus", "Religionsgründer", "Siddhartha Gautama (Buddha)"],
  ["Judentum", "Stammvater, mit dem Gott einen Bund schloss", "Abraham"],
  ["Islam", "Gebetsrichtung", "nach Mekka (zur Kaaba)"],
  ["Islam", "Pflicht der Pilgerfahrt nach Mekka", "der Haddsch"],
  ["Hinduismus", "Glaube an die Wiedergeburt", "Reinkarnation (Samsara)"],
  ["Buddhismus", "Ziel des Erlösungswegs", "das Nirwana"],
];

// [Frage-Kern, richtige Religion, Erklärung]
const E_ZUORDNUNG = [
  ["Zu welcher Religion gehört die Bar Mizwa bzw. Bat Mizwa?", "Judentum", "Mit der Bar/Bat Mizwa gelten jüdische Jugendliche als religionsmündig."],
  ["In welcher Religion gibt es die fünf Säulen (u. a. Glaubensbekenntnis, Gebet, Fasten)?", "Islam", "Die fünf Säulen sind die Grundpflichten des Islam."],
  ["Zu welcher Religion gehören Taufe und Konfirmation bzw. Firmung?", "Christentum", "Taufe, Konfirmation (evangelisch) und Firmung (katholisch) sind christliche Rituale."],
  ["In welcher Religion spielt der Fluss Ganges eine besondere religiöse Rolle?", "Hinduismus", "Der Ganges gilt Hindus als heiliger Fluss."],
  ["Welche Religion lehrt den ,Achtfachen Pfad'?", "Buddhismus", "Der Achtfache Pfad ist der buddhistische Weg zur Überwindung des Leidens."],
  ["In welchem Gotteshaus findet man eine Gebetsnische (Mihrab) und ein Minarett?", "Islam", "Mihrab und Minarett gehören zur Moschee."],
  ["Zu welcher Religion gehört die Kopfbedeckung Kippa?", "Judentum", "Die Kippa wird von jüdischen Männern beim Gebet (oft auch im Alltag) getragen."],
  ["Welche Religion feiert das Abendmahl bzw. die Eucharistie?", "Christentum", "Das Abendmahl erinnert an das letzte Mahl Jesu mit seinen Jüngern."],
  ["In welcher Religion verehrt man u. a. die Götter Brahma, Vishnu und Shiva?", "Hinduismus", "Brahma, Vishnu und Shiva bilden die bekannteste Göttertrias des Hinduismus."],
  ["In welcher Religion meditieren Mönche in Klöstern und streben Erleuchtung an?", "Buddhismus", "Klösterliches Leben und Meditation sind zentral im Buddhismus."],
  ["Welche Religion nutzt die Menora (siebenarmiger Leuchter) als altes Symbol?", "Judentum", "Die Menora ist ein traditionsreiches Symbol des Judentums."],
  ["Aus welcher Religion stammt das Vaterunser?", "Christentum", "Das Vaterunser ist das bekannteste Gebet des Christentums."],
];

// [Begriff, Definition] Ethik allgemein
const E_ETHIK_BEGRIFFE = [
  ["Toleranz", "die Bereitschaft, andere Überzeugungen und Lebensweisen gelten zu lassen"],
  ["Gewissen", "die innere Instanz, die Handlungen als richtig oder falsch bewertet"],
  ["Goldene Regel", "der Grundsatz, andere so zu behandeln, wie man selbst behandelt werden möchte"],
  ["Empathie", "die Fähigkeit, sich in die Gefühle anderer hineinzuversetzen"],
  ["Vorurteil", "ein voreiliges Urteil über Menschen oder Gruppen ohne ausreichende Kenntnis"],
  ["Menschenwürde", "der unantastbare Wert, der jedem Menschen zukommt"],
  ["Gerechtigkeit", "das Prinzip, jedem das ihm Zustehende zukommen zu lassen"],
  ["Verantwortung", "das Einstehen für die Folgen des eigenen Handelns"],
  ["Solidarität", "der Zusammenhalt und das Eintreten füreinander in einer Gemeinschaft"],
  ["Moral", "die in einer Gesellschaft geltenden Normen und Werte des Handelns"],
  ["Ethik", "das philosophische Nachdenken über Moral"],
  ["Dilemma", "eine Zwangslage, in der jede Entscheidung Nachteile hat"],
];

// [Philosoph, Fakt] – ab Klasse 9
const E_PHILOSOPHEN = [
  ["Sokrates", "stellte in Athen bohrende Fragen (Mäeutik) und wurde zum Tod durch den Schierlingsbecher verurteilt"],
  ["Platon", "war Schüler des Sokrates und schrieb das Höhlengleichnis"],
  ["Aristoteles", "war Schüler Platons und begründete u. a. die Tugendethik der ,goldenen Mitte'"],
  ["Immanuel Kant", "formulierte den Kategorischen Imperativ"],
  ["Jeremy Bentham", "gilt als Begründer des klassischen Utilitarismus"],
  ["John Stuart Mill", "entwickelte den Utilitarismus weiter und verteidigte die Freiheit des Einzelnen"],
  ["René Descartes", "prägte den Satz ,Ich denke, also bin ich' (Cogito, ergo sum)"],
  ["Thomas Hobbes", "beschrieb im ,Leviathan' den Naturzustand als Krieg aller gegen alle"],
  ["Jean-Jacques Rousseau", "entwarf die Idee des Gesellschaftsvertrags und des Gemeinwillens (volonté générale)"],
  ["Friedrich Nietzsche", "kritisierte die traditionelle Moral und prägte das Wort ,Gott ist tot'"],
  ["Hannah Arendt", "prägte in ihrem Bericht über den Eichmann-Prozess die Formel von der ,Banalität des Bösen'"],
  ["Karl Popper", "vertrat den Kritischen Rationalismus und das Prinzip der Falsifikation"],
];

function ethikGenerators(k) {
  const gens = [
    (r) => {
      const [rel, kat, antwort] = r.pick(E_FAKTEN);
      const dist = E_FAKTEN.filter((f) => f[0] !== rel && f[1] !== kat).map((f) => f[2]);
      return mc(r, "Weltreligionen", `${r.pick(LEADS)}Religion ${rel} – gesucht: ${kat}. Was ist richtig?`,
        antwort, pickN(r, dist, antwort, 3), `${rel} – ${kat}: ${antwort}.`);
    },
    (r) => {
      const [rel, kat, antwort] = r.pick(E_FAKTEN);
      return mc(r, "Weltreligionen", `${r.pick(LEADS)}Zu welcher Religion gehört: ${antwort} (${kat})?`,
        rel, pickN(r, RELIGIONEN, rel, 3), `${antwort} gehört zur Religion ${rel} (${kat}).`);
    },
    (r) => {
      const [frage, rel, erk] = r.pick(E_ZUORDNUNG);
      return mc(r, "Weltreligionen", `${r.pick(LEADS)}${frage}`,
        rel, pickN(r, RELIGIONEN, rel, 3), erk);
    },
    (r) => {
      const [begriff, def] = r.pick(E_ETHIK_BEGRIFFE);
      return mc(r, "Ethische Grundbegriffe", `${r.pick(LEADS)}Was bedeutet „${begriff}“?`,
        def, pickN(r, E_ETHIK_BEGRIFFE.map((b) => b[1]), def, 3), `${begriff}: ${def}.`);
    },
    (r) => {
      const [begriff, def] = r.pick(E_ETHIK_BEGRIFFE);
      return mc(r, "Ethische Grundbegriffe", `${r.pick(LEADS)}Welcher Begriff ist gemeint: ${def}?`,
        begriff, pickN(r, E_ETHIK_BEGRIFFE.map((b) => b[0]), begriff, 3), `${begriff}: ${def}.`);
    },
  ];
  if (k >= 9) {
    gens.push(
      (r) => {
        const [name, fakt] = r.pick(E_PHILOSOPHEN);
        return mc(r, "Philosophie", `${r.pick(LEADS)}Welcher Philosoph bzw. welche Philosophin ${fakt}?`,
          name, pickN(r, E_PHILOSOPHEN.map((p) => p[0]), name, 3), `${name} ${fakt}.`);
      },
      (r) => {
        const [name, fakt] = r.pick(E_PHILOSOPHEN);
        return mc(r, "Philosophie", `${r.pick(LEADS)}Wofür ist ${name} bekannt?`,
          fakt, pickN(r, E_PHILOSOPHEN.map((p) => p[1]), fakt, 3), `${name} ${fakt}.`);
      },
    );
  }
  return gens;
}

/* ══════════════════════════ 3) ERDKUNDE 9–13 ══════════════════════════ */

// [Klimazone/Begriff, Beschreibung]
const G_KLIMA = [
  ["Tropische Zone", "ganzjährig hohe Temperaturen ohne thermische Jahreszeiten, Tageszeitenklima"],
  ["Subtropen", "heiße, oft trockene Sommer und milde Winter (z. B. Mittelmeerklima)"],
  ["Gemäßigte Zone", "vier ausgeprägte Jahreszeiten mit mäßig warmen Sommern und kühlen Wintern"],
  ["Polare Zone", "ganzjährig sehr niedrige Temperaturen, Polartag und Polarnacht"],
  ["Kontinentalklima", "große Temperaturunterschiede zwischen Sommer und Winter, geringe Niederschläge im Landesinneren"],
  ["Seeklima (maritimes Klima)", "milde Winter, kühle Sommer und geringe Temperaturschwankungen durch Meeresnähe"],
  ["Passatwinde", "beständige tropische Winde, die zum Äquator hin wehen"],
  ["Innertropische Konvergenzzone (ITC)", "äquatornahe Tiefdruckrinne mit starken Regenfällen (Zenitalregen)"],
  ["Arides Klima", "Klima, in dem die Verdunstung den Niederschlag übersteigt (Trockenklima)"],
  ["Humides Klima", "Klima, in dem der Niederschlag die Verdunstung übersteigt (Feuchtklima)"],
  ["Steppe", "Grasland der Trockengebiete mit 250–500 mm Jahresniederschlag"],
  ["Tropischer Regenwald", "immergrüner Wald der immerfeuchten Tropen mit Stockwerkbau"],
  ["Savanne", "tropische Vegetationszone mit Regen- und Trockenzeit"],
  ["Tundra", "baumlose Kältesteppe der polaren/subpolaren Zone mit Permafrost"],
  ["Taiga", "borealer Nadelwaldgürtel der kaltgemäßigten Zone"],
];

// [Klimadiagramm-Frage, Antwort, Distraktoren[], Erklärung]
const G_KLIMADIAGRAMM = [
  ["Was zeigt in einem Klimadiagramm nach Walter/Lieth die rote Kurve?", "den Verlauf der Monatsmitteltemperaturen",
    ["die monatlichen Niederschlagssummen", "die Windgeschwindigkeit", "die Sonnenscheindauer"],
    "Die rote Kurve stellt die Temperatur dar, die blauen Säulen/Kurve den Niederschlag."],
  ["Was zeigen in einem Klimadiagramm die blauen Säulen bzw. die blaue Kurve?", "die monatlichen Niederschläge",
    ["die Monatsmitteltemperaturen", "die Luftfeuchtigkeit in Prozent", "die Verdunstung"],
    "Blau steht im Klimadiagramm für den Niederschlag (in mm)."],
  ["Woran erkennt man in einem Klimadiagramm einen ariden (trockenen) Monat?", "Die Temperaturkurve verläuft über der Niederschlagskurve.",
    ["Die Niederschlagskurve verläuft über der Temperaturkurve.", "Die Temperatur liegt unter 0 °C.", "Der Niederschlag liegt über 100 mm."],
    "Liegt die Temperaturkurve über der Niederschlagskurve, übersteigt die Verdunstung den Niederschlag: arid."],
  ["In welcher Einheit wird der Niederschlag im Klimadiagramm angegeben?", "in Millimetern (mm)",
    ["in Litern pro Stunde", "in Prozent", "in Hektopascal (hPa)"],
    "Niederschlag wird als Niederschlagshöhe in mm angegeben (1 mm = 1 l/m²)."],
  ["Ein Klimadiagramm zeigt ganzjährig Temperaturen um 26 °C und über 2000 mm Jahresniederschlag. Welches Klima liegt vor?", "tropisches Regenwaldklima",
    ["polares Klima", "Mittelmeerklima", "kontinentales Steppenklima"],
    "Ganzjährig heiß und sehr feucht ist typisch für die immerfeuchten Tropen."],
  ["Ein Klimadiagramm zeigt trockene, heiße Sommer und milde, feuchte Winter. Welcher Klimatyp ist das?", "Mittelmeerklima",
    ["tropisches Regenwaldklima", "polares Klima", "hochkontinentales Klima"],
    "Sommertrockenheit bei milden Wintern kennzeichnet das Mittelmeerklima."],
];

// [Plattentektonik-Frage, Antwort, Distraktoren[], Erklärung]
const G_TEKTONIK = [
  ["Wie heißt die Theorie, nach der die Erdkruste aus beweglichen Platten besteht?", "Plattentektonik",
    ["Kontinentalstatik", "Geozentrik", "Isostasie-Lehre"],
    "Die Plattentektonik erklärt Erdbeben, Vulkanismus und Gebirgsbildung durch Plattenbewegungen."],
  ["Wer entwickelte die Theorie der Kontinentalverschiebung (1912)?", "Alfred Wegener",
    ["Charles Darwin", "Alexander von Humboldt", "James Hutton"],
    "Alfred Wegener stellte 1912 die Kontinentalverschiebungstheorie vor."],
  ["Was entsteht typischerweise dort, wo zwei Platten auseinanderdriften (divergieren)?", "ein mittelozeanischer Rücken bzw. ein Grabenbruch",
    ["ein Hochgebirge durch Faltung", "eine Tiefseerinne durch Subduktion", "gar keine neuen Strukturen"],
    "An divergenten Plattengrenzen steigt Magma auf; es entsteht neue Kruste (z. B. Mittelatlantischer Rücken)."],
  ["Was geschieht an einer Subduktionszone?", "Eine ozeanische Platte taucht unter eine andere Platte ab.",
    ["Zwei Platten gleiten seitlich aneinander vorbei.", "Zwei Platten entfernen sich voneinander.", "Die Erdkruste bleibt völlig unbewegt."],
    "Bei der Subduktion taucht die dichtere ozeanische Platte ab; es entstehen Tiefseerinnen und Vulkanismus."],
  ["Wie ist der Himalaya entstanden?", "durch die Kollision der Indischen mit der Eurasischen Platte",
    ["durch das Auseinanderdriften zweier Platten", "durch einen Meteoriteneinschlag", "durch Ablagerungen eines Urstromtals"],
    "Die Kollision zweier Kontinentalplatten faltete den Himalaya auf."],
  ["Wie heißt die Zone häufiger Erdbeben und Vulkane rund um den Pazifik?", "Pazifischer Feuerring",
    ["Atlantischer Sturmgürtel", "Indischer Vulkanbogen", "Polarer Bebenring"],
    "Am Pazifischen Feuerring liegen die meisten aktiven Vulkane der Erde."],
  ["Wie heißt der Urkontinent, der vor ca. 250 Mio. Jahren alle Landmassen vereinte?", "Pangäa",
    ["Atlantis", "Laurasia allein", "Eurasika"],
    "Pangäa zerbrach später u. a. in Laurasia und Gondwana."],
  ["Mit welcher Skala wird die Magnitude (freigesetzte Energie) von Erdbeben angegeben?", "mit der Richterskala bzw. Momenten-Magnituden-Skala",
    ["mit der Beaufortskala", "mit der Celsiusskala", "mit der pH-Skala"],
    "Die Beaufortskala misst Windstärke, nicht Erdbeben."],
  ["Wie bewegen sich die Platten an einer Transformstörung (z. B. San-Andreas-Verwerfung)?", "seitlich aneinander vorbei",
    ["senkrecht untereinander", "dauerhaft auseinander ohne Reibung", "übereinander hinweg ohne Beben"],
    "An Transformstörungen verschieben sich Platten horizontal – es kommt zu starken Beben."],
  ["Welche Antriebskraft gilt als wesentlich für die Plattenbewegung?", "Konvektionsströme im Erdmantel",
    ["die Gezeitenkraft des Mondes allein", "Meeresströmungen an der Oberfläche", "der Luftdruck der Atmosphäre"],
    "Aufsteigendes und absinkendes Mantelmaterial (Konvektion) bewegt die Platten."],
];

// [Indikator/Begriff, Definition]
const G_ENTWICKLUNG = [
  ["HDI (Human Development Index)", "ein Index aus Lebenserwartung, Bildung und Einkommen zur Messung menschlicher Entwicklung"],
  ["BIP pro Kopf", "die Wirtschaftsleistung eines Landes geteilt durch die Einwohnerzahl"],
  ["Säuglingssterblichkeit", "der Anteil der Kinder, die vor ihrem ersten Geburtstag sterben"],
  ["Alphabetisierungsrate", "der Anteil der Bevölkerung, der lesen und schreiben kann"],
  ["Lebenserwartung", "die durchschnittlich zu erwartende Lebensdauer eines Neugeborenen"],
  ["Gini-Koeffizient", "ein Maß für die Ungleichheit der Einkommensverteilung"],
  ["Urbanisierung", "die Zunahme des Anteils der Stadtbevölkerung"],
  ["Demografischer Übergang", "das Modell vom Rückgang zuerst der Sterbe-, dann der Geburtenrate im Entwicklungsprozess"],
  ["Geburtenrate", "die Zahl der Lebendgeburten pro 1000 Einwohner und Jahr"],
  ["Sterberate", "die Zahl der Sterbefälle pro 1000 Einwohner und Jahr"],
  ["Wanderungssaldo", "die Differenz aus Zuwanderung und Abwanderung"],
  ["Push-Faktoren", "Gründe, die Menschen aus ihrer Herkunftsregion wegdrängen (z. B. Krieg, Dürre)"],
  ["Pull-Faktoren", "Gründe, die Menschen in eine Zielregion anziehen (z. B. Arbeitsplätze)"],
  ["Bevölkerungspyramide", "die grafische Darstellung des Alters- und Geschlechtsaufbaus einer Bevölkerung"],
  ["Least Developed Countries (LDC)", "die von der UN als am wenigsten entwickelt eingestuften Länder"],
];

function erdkundeGenerators() {
  return [
    (r) => {
      const [zone, merkmal] = r.pick(G_KLIMA);
      const dist = G_KLIMA.map((z) => z[0]).filter((z) => z !== zone);
      return mc(r, "Klimazonen", `${r.pick(LEADS)}Welche Klimazone bzw. welcher Begriff passt zu dieser Beschreibung: ${merkmal}?`,
        zone, pickN(r, dist, zone, 3), `${zone}: ${merkmal}.`);
    },
    (r) => {
      const [zone, merkmal] = r.pick(G_KLIMA);
      const dist = G_KLIMA.map((z) => z[1]).filter((m) => m !== merkmal);
      return mc(r, "Klimazonen", `${r.pick(LEADS)}Was kennzeichnet: ${zone}?`,
        merkmal, pickN(r, dist, merkmal, 3), `${zone}: ${merkmal}.`);
    },
    (r) => {
      const [frage, antwort, dist, erk] = r.pick(G_KLIMADIAGRAMM);
      return mc(r, "Klimadiagramm", `${r.pick(LEADS)}${frage}`, antwort, r.shuffle(dist), erk);
    },
    (r) => {
      const [frage, antwort, dist, erk] = r.pick(G_TEKTONIK);
      return mc(r, "Plattentektonik", `${r.pick(LEADS)}${frage}`, antwort, r.shuffle(dist), erk);
    },
    // Bevölkerungsdichte berechnen (Einwohner / Fläche)
    (r) => {
      const flaeche = r.int(2, 90) * 1000; // km²
      const dichte = r.int(20, 400); // EW/km²
      const einwohner = flaeche * dichte;
      const ewMio = einwohner / 1e6;
      const ewText = Number.isInteger(ewMio) ? `${ewMio}` : ewMio.toFixed(1).replace(".", ",");
      const dist = [dichte * 2, Math.max(1, Math.round(dichte / 2)), dichte + 10, dichte - 10, dichte + 25]
        .filter((d) => d > 0 && d !== dichte)
        .map((d) => `${d} Einwohner/km²`);
      return mc(r, "Demografie", `${r.pick(LEADS)}Ein Land hat ${ewText} Mio. Einwohner und eine Fläche von ${flaeche.toLocaleString("de-DE")} km². Wie groß ist die Bevölkerungsdichte?`,
        `${dichte} Einwohner/km²`, dist,
        `Bevölkerungsdichte = Einwohner ÷ Fläche = ${einwohner.toLocaleString("de-DE")} ÷ ${flaeche.toLocaleString("de-DE")} = ${dichte} Einwohner/km².`);
    },
    // natürlicher Saldo aus Geburten-/Sterberate
    (r) => {
      const geb = r.int(6, 45);
      let sterb = r.int(4, 20);
      if (sterb === geb) sterb += 1;
      const saldo = geb - sterb;
      const fmt = (v) => `${v > 0 ? "+" : ""}${v} pro 1000 Einwohner`;
      const dist = [fmt(-saldo), fmt(saldo + 2), fmt(saldo - 2), fmt(geb + sterb)].filter((d) => d !== fmt(saldo));
      return mc(r, "Demografie", `${r.pick(LEADS)}Ein Land hat eine Geburtenrate von ${geb} und eine Sterberate von ${sterb} (jeweils pro 1000 Einwohner). Wie groß ist der natürliche Bevölkerungssaldo?`,
        fmt(saldo), dist,
        `Natürlicher Saldo = Geburtenrate − Sterberate = ${geb} − ${sterb} = ${fmt(saldo)}.`);
    },
    (r) => {
      const [ind, def] = r.pick(G_ENTWICKLUNG);
      return mc(r, "Entwicklungsindikatoren", `${r.pick(LEADS)}Was bedeutet der Indikator/Begriff „${ind}“?`,
        def, pickN(r, G_ENTWICKLUNG.map((g) => g[1]), def, 3), `${ind}: ${def}.`);
    },
    (r) => {
      const [ind, def] = r.pick(G_ENTWICKLUNG);
      return mc(r, "Entwicklungsindikatoren", `${r.pick(LEADS)}Welcher Begriff ist gemeint: ${def}?`,
        ind, pickN(r, G_ENTWICKLUNG.map((g) => g[0]), ind, 3), `${ind}: ${def}.`);
    },
  ];
}

/* ══════════════════════════ 4) ENGLISCH2 5–10 ══════════════════════════ */

// [base, 3. Person Singular, simple past, past participle, ing-Form]
const EN_VERBEN = [
  ["go", "goes", "went", "gone", "going"],
  ["see", "sees", "saw", "seen", "seeing"],
  ["eat", "eats", "ate", "eaten", "eating"],
  ["write", "writes", "wrote", "written", "writing"],
  ["take", "takes", "took", "taken", "taking"],
  ["give", "gives", "gave", "given", "giving"],
  ["speak", "speaks", "spoke", "spoken", "speaking"],
  ["drink", "drinks", "drank", "drunk", "drinking"],
  ["swim", "swims", "swam", "swum", "swimming"],
  ["sing", "sings", "sang", "sung", "singing"],
  ["begin", "begins", "began", "begun", "beginning"],
  ["run", "runs", "ran", "run", "running"],
  ["come", "comes", "came", "come", "coming"],
  ["buy", "buys", "bought", "bought", "buying"],
  ["bring", "brings", "brought", "brought", "bringing"],
  ["think", "thinks", "thought", "thought", "thinking"],
  ["catch", "catches", "caught", "caught", "catching"],
  ["teach", "teaches", "taught", "taught", "teaching"],
  ["make", "makes", "made", "made", "making"],
  ["find", "finds", "found", "found", "finding"],
  ["play", "plays", "played", "played", "playing"],
  ["watch", "watches", "watched", "watched", "watching"],
  ["visit", "visits", "visited", "visited", "visiting"],
  ["clean", "cleans", "cleaned", "cleaned", "cleaning"],
  ["cook", "cooks", "cooked", "cooked", "cooking"],
  ["help", "helps", "helped", "helped", "helping"],
  ["walk", "walks", "walked", "walked", "walking"],
  ["study", "studies", "studied", "studied", "studying"],
  ["try", "tries", "tried", "tried", "trying"],
  ["stop", "stops", "stopped", "stopped", "stopping"],
];

const EN_SUBJEKTE_3SG = ["She", "He", "My brother", "Our teacher", "The dog", "Tom", "Anna"];
const EN_ORTE = ["in the park", "at school", "at home", "in the garden", "in the city", "at the beach"];

// [Satz mit ___, richtige Antwort, Distraktoren, Erklärung]
const EN_SOME_ANY = [
  ["There isn't ___ milk in the fridge.", "any", ["some", "a", "many"], "In verneinten Sätzen steht ,any'."],
  ["Would you like ___ tea?", "some", ["any", "a", "much"], "Bei höflichen Angeboten steht ,some', obwohl es eine Frage ist."],
  ["We have ___ apples left – let's make a pie!", "some", ["any", "much", "an"], "In bejahten Aussagesätzen steht ,some'."],
  ["Do you have ___ questions?", "any", ["some", "much", "a"], "In normalen Fragen steht ,any'."],
  ["I didn't buy ___ bread today.", "any", ["some", "many", "a"], "Verneinung (didn't) → ,any'."],
  ["She gave me ___ good advice.", "some", ["any", "an", "many"], "Bejahter Satz → ,some'; ,advice' ist unzählbar."],
  ["Is there ___ sugar in this cake?", "any", ["some", "many", "a"], "Frage → ,any'."],
  ["Can I have ___ water, please?", "some", ["any", "many", "a"], "Bitte/Angebot → ,some'."],
];

const EN_MUCH_MANY = [
  ["How ___ money do you need?", "much", "money ist unzählbar → ,much'."],
  ["How ___ friends does she have?", "many", "friends ist zählbar (Plural) → ,many'."],
  ["There isn't ___ time left.", "much", "time ist unzählbar → ,much'."],
  ["We didn't see ___ cars on the road.", "many", "cars ist zählbar → ,many'."],
  ["I don't drink ___ coffee.", "much", "coffee ist unzählbar → ,much'."],
  ["How ___ books did you read last year?", "many", "books ist zählbar → ,many'."],
  ["She doesn't have ___ homework today.", "much", "homework ist unzählbar → ,much'."],
  ["How ___ people were at the party?", "many", "people ist zählbar → ,many'."],
  ["There isn't ___ sugar in my tea.", "much", "sugar ist unzählbar → ,much'."],
  ["Did you take ___ photos on holiday?", "many", "photos ist zählbar → ,many'."],
];

// [Adjektiv, Komparativ, Superlativ]
const EN_ADJEKTIVE = [
  ["big", "bigger", "the biggest"],
  ["small", "smaller", "the smallest"],
  ["fast", "faster", "the fastest"],
  ["happy", "happier", "the happiest"],
  ["easy", "easier", "the easiest"],
  ["hot", "hotter", "the hottest"],
  ["nice", "nicer", "the nicest"],
  ["large", "larger", "the largest"],
  ["good", "better", "the best"],
  ["bad", "worse", "the worst"],
  ["far", "farther", "the farthest"],
  ["little", "less", "the least"],
  ["beautiful", "more beautiful", "the most beautiful"],
  ["interesting", "more interesting", "the most interesting"],
  ["expensive", "more expensive", "the most expensive"],
  ["difficult", "more difficult", "the most difficult"],
  ["famous", "more famous", "the most famous"],
  ["comfortable", "more comfortable", "the most comfortable"],
];

// [Satz, richtiger question tag, Erklärung]
const EN_TAGS = [
  ["You are tired, ___?", "aren't you", "Positiver Satz mit ,are' → verneinter Tag ,aren't you?'."],
  ["She isn't at home, ___?", "is she", "Verneinter Satz → positiver Tag ,is she?'."],
  ["They play football on Sundays, ___?", "don't they", "Simple Present ohne Hilfsverb → ,don't they?'."],
  ["He doesn't like fish, ___?", "does he", "Verneintes ,doesn't' → positiver Tag ,does he?'."],
  ["You went to London last year, ___?", "didn't you", "Simple Past ohne Hilfsverb → ,didn't you?'."],
  ["She can swim, ___?", "can't she", "Modalverb ,can' → ,can't she?'."],
  ["We have finished, ___?", "haven't we", "Present Perfect mit ,have' → ,haven't we?'."],
  ["It was cold yesterday, ___?", "wasn't it", "Positives ,was' → ,wasn't it?'."],
  ["Your parents will help us, ___?", "won't they", ",will' → ,won't they?'."],
  ["Tom didn't call you, ___?", "did he", "Verneintes ,didn't' → positiver Tag ,did he?'."],
];
const EN_ALLE_TAGS = ["aren't you", "is she", "don't they", "does he", "didn't you", "can't she", "haven't we", "wasn't it", "won't they", "did he", "isn't it", "do they"];

function englisch2Generators(k) {
  const gens = [
    // Simple Past
    (r) => {
      const v = r.pick(EN_VERBEN);
      const subj = r.pick(EN_SUBJEKTE_3SG);
      const ort = r.pick(EN_ORTE);
      const dist = [v[0], v[3], v[1], v[4]].filter((x) => x !== v[2]);
      return mc(r, "Simple Past", `${r.pick(LEADS)}Yesterday, ${subj === "She" || subj === "He" || subj.startsWith("My") || subj.startsWith("Our") || subj.startsWith("The") ? subj.charAt(0).toLowerCase() + subj.slice(1) : subj} ___ (${v[0]}) ${ort}. Welche Form ist richtig?`,
        v[2], dist, `Signalwort ,yesterday' → Simple Past: ${v[2]}.`);
    },
    // Simple Present 3. Person
    (r) => {
      const v = r.pick(EN_VERBEN);
      const subj = r.pick(EN_SUBJEKTE_3SG);
      const dist = [v[0], v[2], v[4]].filter((x) => x !== v[1]);
      return mc(r, "Simple Present", `${r.pick(LEADS)}${subj} usually ___ (${v[0]}) every day. Welche Form ist richtig?`,
        v[1], dist, `3. Person Singular im Simple Present → s-Form: ${v[1]}.`);
    },
    // Present Progressive
    (r) => {
      const v = r.pick(EN_VERBEN);
      const subj = r.pick(EN_SUBJEKTE_3SG);
      const dist = [v[0], v[2], v[1]].filter((x) => x !== v[4]);
      return mc(r, "Present Progressive", `${r.pick(LEADS)}Look! ${subj} is ___ (${v[0]}) right now. Welche Form ist richtig?`,
        v[4], dist, `,Look!' + ,right now' → Present Progressive: is ${v[4]}.`);
    },
    // will-future
    (r) => {
      const v = r.pick(EN_VERBEN);
      const subj = r.pick(EN_SUBJEKTE_3SG);
      const dist = [v[1], v[2], v[4]].filter((x) => x !== v[0]);
      const subjText = subj.startsWith("My") || subj.startsWith("Our") || subj.startsWith("The") ? subj.charAt(0).toLowerCase() + subj.slice(1) : subj === "She" ? "she" : subj === "He" ? "he" : subj;
      return mc(r, "Will-Future", `${r.pick(LEADS)}Tomorrow ${subjText} will ___ (${v[0]}) again. Welche Form ist richtig?`,
        v[0], dist, `Nach ,will' steht der Infinitiv ohne to: will ${v[0]}.`);
    },
    // some/any
    (r) => {
      const [satz, korrekt, dist, erk] = r.pick(EN_SOME_ANY);
      return mc(r, "some/any", `${r.pick(LEADS)}Setze richtig ein: „${satz}“`, korrekt, r.shuffle(dist), erk);
    },
    // much/many
    (r) => {
      const [satz, korrekt, erk] = r.pick(EN_MUCH_MANY);
      const dist = korrekt === "much" ? ["many", "a lot", "few"] : ["much", "a lot", "little"];
      return mc(r, "much/many", `${r.pick(LEADS)}Setze richtig ein: „${satz}“`, korrekt, dist, erk);
    },
    // Steigerung: Komparativ
    (r) => {
      const [adj, komp, sup] = r.pick(EN_ADJEKTIVE);
      const dist = [sup.replace(/^the /, ""), `more ${adj}` === komp ? `${adj}er` : `more ${adj}`, adj];
      return mc(r, "Steigerung", `${r.pick(LEADS)}Wie lautet der Komparativ (Vergleichsform) von „${adj}“?`,
        komp, dist, `${adj} – ${komp} – ${sup}.`);
    },
    // Steigerung: Superlativ
    (r) => {
      const [adj, komp, sup] = r.pick(EN_ADJEKTIVE);
      const dist = [komp, `the ${adj}est` === sup ? `the most ${adj}` : `the ${adj}est`, adj];
      return mc(r, "Steigerung", `${r.pick(LEADS)}Wie lautet der Superlativ von „${adj}“?`,
        sup, dist, `${adj} – ${komp} – ${sup}.`);
    },
  ];
  if (k >= 6) {
    // Present Perfect erst ab Klasse 6
    gens.push((r) => {
      const v = r.pick(EN_VERBEN);
      const subj = r.pick(EN_SUBJEKTE_3SG);
      const dist = [v[0], v[2], v[4]].filter((x) => x !== v[3]);
      if (v[2] === v[3]) dist.push(v[1]);
      return mc(r, "Present Perfect", `${r.pick(LEADS)}${subj} has just ___ (${v[0]}) it. Welche Form ist richtig?`,
        v[3], dist, `,has just' → Present Perfect mit Past Participle: ${v[3]}.`);
    });
  }
  if (k >= 7) {
    gens.push((r) => {
      const [satz, tag, erk] = r.pick(EN_TAGS);
      return mc(r, "Question Tags", `${r.pick(LEADS)}Welcher question tag passt: „${satz}“`,
        tag, pickN(r, EN_ALLE_TAGS, tag, 3), erk);
    });
  }
  return gens;
}

/* ══════════════════════════ 5) GESCHICHTE 11–13 ══════════════════════════ */

// [Ereignis, Jahr]
const H_EREIGNISSE = [
  ["Ausrufung der Weimarer Republik", 1918],
  ["Unterzeichnung des Versailler Vertrags", 1919],
  ["Kapp-Putsch", 1920],
  ["Hitler-Ludendorff-Putsch in München", 1923],
  ["Höhepunkt der Hyperinflation in Deutschland", 1923],
  ["Beginn der Weltwirtschaftskrise (Börsencrash New York)", 1929],
  ["Ernennung Hitlers zum Reichskanzler", 1933],
  ["Reichstagsbrand und Ermächtigungsgesetz", 1933],
  ["Nürnberger Rassengesetze", 1935],
  ["Novemberpogrome (,Reichspogromnacht')", 1938],
  ["Überfall auf Polen, Beginn des Zweiten Weltkriegs", 1939],
  ["Überfall auf die Sowjetunion (,Unternehmen Barbarossa')", 1941],
  ["Wannsee-Konferenz", 1942],
  ["Kapitulation der 6. Armee in Stalingrad", 1943],
  ["Attentat des 20. Juli auf Hitler", 1944],
  ["Bedingungslose Kapitulation Deutschlands", 1945],
  ["Gründung von BRD und DDR", 1949],
  ["Beginn der Berlin-Blockade und Luftbrücke", 1948],
  ["Volksaufstand in der DDR am 17. Juni", 1953],
  ["Gründung der NATO", 1949],
  ["Beitritt der BRD zur NATO", 1955],
  ["Gründung des Warschauer Pakts", 1955],
  ["Bau der Berliner Mauer", 1961],
  ["Kubakrise", 1962],
  ["Grundlagenvertrag zwischen BRD und DDR", 1972],
  ["KSZE-Schlussakte von Helsinki", 1975],
  ["Beginn von Gorbatschows Reformpolitik (Glasnost/Perestroika)", 1985],
  ["Fall der Berliner Mauer", 1989],
  ["Deutsche Wiedervereinigung (3. Oktober)", 1990],
  ["Zwei-plus-Vier-Vertrag", 1990],
];

// [Begriff, Definition]
const H_BEGRIFFE = [
  ["Dolchstoßlegende", "die falsche Behauptung, das deutsche Heer sei 1918 von der Heimat ,von hinten erdolcht' worden"],
  ["Ermächtigungsgesetz", "das Gesetz von 1933, das der Regierung Hitler erlaubte, Gesetze ohne Reichstag zu erlassen"],
  ["Gleichschaltung", "die erzwungene Ausrichtung von Staat, Verbänden und Gesellschaft auf die NSDAP"],
  ["Reichspräsident", "das direkt gewählte Staatsoberhaupt der Weimarer Republik mit Notverordnungsrecht (Art. 48)"],
  ["Präsidialkabinette", "die ab 1930 ohne parlamentarische Mehrheit per Notverordnung regierenden Regierungen"],
  ["Holocaust (Shoah)", "der systematische Völkermord an den europäischen Jüdinnen und Juden"],
  ["Konzentrationslager", "Haft- und Terrorlager des NS-Regimes zur Verfolgung und Vernichtung"],
  ["Entnazifizierung", "die Maßnahmen der Alliierten zur Entfernung des Nationalsozialismus aus der Gesellschaft"],
  ["Kalter Krieg", "der Ost-West-Konflikt zwischen den USA und der Sowjetunion ohne direkten großen Krieg"],
  ["Eiserner Vorhang", "die politisch-militärische Trennlinie zwischen West- und Osteuropa"],
  ["Containment-Politik", "die US-Strategie zur Eindämmung der Ausbreitung des Kommunismus"],
  ["Marshallplan", "das US-Wirtschaftshilfsprogramm für Westeuropa nach 1945"],
  ["Truman-Doktrin", "die 1947 verkündete US-Politik der Unterstützung ,freier Völker' gegen den Kommunismus"],
  ["Ostpolitik Willy Brandts", "die Entspannungspolitik gegenüber Osteuropa (,Wandel durch Annäherung')"],
  ["Stasi", "das Ministerium für Staatssicherheit, der Geheimdienst der DDR"],
  ["Politbüro", "das faktisch wichtigste Führungsgremium der SED in der DDR"],
  ["Montagsdemonstrationen", "die friedlichen Massenproteste 1989 in der DDR, ausgehend von Leipzig"],
  ["Zwei-plus-Vier-Vertrag", "der Vertrag zwischen beiden deutschen Staaten und den vier Siegermächten zur Einheit"],
  ["Treuhandanstalt", "die Behörde zur Privatisierung der DDR-Staatsbetriebe nach 1990"],
  ["Novemberrevolution", "die Revolution 1918/19, die die Monarchie in Deutschland beendete"],
  ["Rat der Volksbeauftragten", "die revolutionäre Übergangsregierung 1918/19 unter Friedrich Ebert"],
  ["Goldene Zwanziger", "die relative Stabilisierungsphase der Weimarer Republik ca. 1924–1929"],
  ["Appeasement-Politik", "die Beschwichtigungspolitik Großbritanniens gegenüber Hitler in den 1930er Jahren"],
  ["Propaganda", "die gezielte politische Beeinflussung der Bevölkerung, im NS-Staat unter Goebbels"],
];

// [Frage, Antwort, Distraktoren, Erklärung]
const H_PERSONEN = [
  ["Wer war der erste Reichspräsident der Weimarer Republik?", "Friedrich Ebert",
    ["Paul von Hindenburg", "Gustav Stresemann", "Philipp Scheidemann"],
    "Friedrich Ebert (SPD) war 1919–1925 erster Reichspräsident; Hindenburg folgte 1925."],
  ["Wer war der erste Bundeskanzler der Bundesrepublik Deutschland?", "Konrad Adenauer",
    ["Willy Brandt", "Ludwig Erhard", "Kurt Schumacher"],
    "Konrad Adenauer (CDU) regierte 1949–1963."],
  ["Welcher Bundeskanzler stand für die ,Neue Ostpolitik' und den Kniefall von Warschau?", "Willy Brandt",
    ["Helmut Schmidt", "Konrad Adenauer", "Helmut Kohl"],
    "Willy Brandt (SPD) erhielt 1971 für seine Entspannungspolitik den Friedensnobelpreis."],
  ["Unter welchem Bundeskanzler wurde die deutsche Einheit 1990 vollzogen?", "Helmut Kohl",
    ["Gerhard Schröder", "Helmut Schmidt", "Willy Brandt"],
    "Helmut Kohl (CDU) gilt als ,Kanzler der Einheit'."],
  ["Wer führte als Staatsratsvorsitzender die DDR von 1971 bis 1989?", "Erich Honecker",
    ["Walter Ulbricht", "Egon Krenz", "Otto Grotewohl"],
    "Erich Honecker löste 1971 Walter Ulbricht ab und trat im Oktober 1989 zurück."],
  ["Welcher Außenminister prägte die Stabilisierung der Weimarer Republik ab 1923?", "Gustav Stresemann",
    ["Walther Rathenau", "Matthias Erzberger", "Heinrich Brüning"],
    "Stresemann beendete 1923 als Kanzler die Inflation und war danach langjähriger Außenminister."],
  ["Wer rief am 9. November 1918 die deutsche Republik aus?", "Philipp Scheidemann",
    ["Karl Liebknecht allein", "Friedrich Ebert", "Rosa Luxemburg"],
    "Scheidemann rief die Republik aus; Liebknecht rief kurz darauf die ,sozialistische Republik' aus."],
  ["Wer war sowjetischer Staatschef während Glasnost und Perestroika?", "Michail Gorbatschow",
    ["Leonid Breschnew", "Nikita Chruschtschow", "Boris Jelzin"],
    "Gorbatschow leitete ab 1985 die Reformpolitik ein."],
];

function geschichteGenerators() {
  return [
    (r) => {
      const [ev, jahr] = r.pick(H_EREIGNISSE);
      const near = [jahr - 1, jahr + 1, jahr - 2, jahr + 2, jahr - 5, jahr + 5, jahr - 10];
      return mc(r, "Jahreszahlen", `${r.pick(LEADS)}In welchem Jahr geschah: ${ev}?`,
        String(jahr), pickN(r, near.map(String), String(jahr), 3),
        `${ev}: ${jahr}.`);
    },
    (r) => {
      const [ev, jahr] = r.pick(H_EREIGNISSE);
      const dist = H_EREIGNISSE.filter((e) => e[1] !== jahr).map((e) => e[0]);
      return mc(r, "Ereignisse", `${r.pick(LEADS)}Welches Ereignis fand ${jahr} statt?`,
        ev, pickN(r, dist, ev, 3), `${jahr}: ${ev}.`);
    },
    (r) => {
      const [begriff, def] = r.pick(H_BEGRIFFE);
      return mc(r, "Begriffe", `${r.pick(LEADS)}Was versteht man unter „${begriff}“?`,
        def, pickN(r, H_BEGRIFFE.map((b) => b[1]), def, 3), `${begriff}: ${def}.`);
    },
    (r) => {
      const [begriff, def] = r.pick(H_BEGRIFFE);
      return mc(r, "Begriffe", `${r.pick(LEADS)}Welcher Begriff ist gemeint: ${def}?`,
        begriff, pickN(r, H_BEGRIFFE.map((b) => b[0]), begriff, 3), `${begriff}: ${def}.`);
    },
    (r) => {
      const [frage, antwort, dist, erk] = r.pick(H_PERSONEN);
      return mc(r, "Personen", `${r.pick(LEADS)}${frage}`, antwort, r.shuffle(dist), erk);
    },
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

  console.log("Deutsch Oberstufe (Klasse 11–13, je >= 500):");
  for (let k = 11; k <= 13; k++) {
    const base = existsSync(join(DATA_DIR, `deutsch-klasse${k}.json`)) ? "deutsch2" : "deutsch";
    total += writeBank(base, k, generateBank(51000 + k, 500, deutschGenerators()), 500);
  }

  console.log("Ethik/Religion (Klasse 5–10, je >= 300):");
  for (let k = 5; k <= 10; k++) total += writeBank("ethik", k, generateBank(52000 + k, 300, ethikGenerators(k)), 300);

  console.log("Erdkunde Oberstufe (Klasse 9–13, je >= 400):");
  for (let k = 9; k <= 13; k++) total += writeBank("erdkunde", k, generateBank(53000 + k, 400, erdkundeGenerators()), 400);

  console.log("Englisch-Grammatik-Ergänzung (Klasse 5–10, je >= 400):");
  for (let k = 5; k <= 10; k++) total += writeBank("englisch2", k, generateBank(54000 + k, 400, englisch2Generators(k)), 400);

  console.log("Geschichte Oberstufe (Klasse 11–13, je >= 300):");
  for (let k = 11; k <= 13; k++) total += writeBank("geschichte", k, generateBank(55000 + k, 300, geschichteGenerators()), 300);

  console.log(`\nGesamt (Runde 5): ${total} Fragen.`);
}

main();
