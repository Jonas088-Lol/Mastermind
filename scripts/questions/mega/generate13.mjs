/* Copyright 2026 Elian Schock, Jonas Schwenk */
/**
 * MEGA-Fragen-Generator RUNDE 13 für MasterMind.
 *
 * Ergänzt die Fragenbank aus generate.mjs … generate12.mjs im GLEICHEN Format
 *   scripts/questions/mega/data/<fach>-klasse<k>.json
 * mit [{ topic, question, options[4], correct(Index), explanation }].
 *
 * Fächer/Umfang (nur NEUE Dateien mit Präfix physik3-/erdkunde2-/ethik2-):
 *   1) physik3    Klasse 5–6,  >= 350/Klasse
 *      (Magnetismus: Pole/anziehen/abstoßen, einfacher Stromkreis: leitet/
 *       leitet nicht, Temperatur/Thermometer ablesen — berechnet,
 *       Licht & Schatten, Schall-Basics, Einheiten zuordnen kg/m/s/°C)
 *   2) erdkunde2  Klasse 5–10, >= 350/Klasse
 *      (Europa: Länder↔Hauptstädte↔Flaggen-Beschreibungen, Nachbarländer
 *       Deutschlands, Deutschland-Geografie: Flüsse/Gebirge/Städte,
 *       Gradnetz-Basics, Himmelsrichtungen-Rechnungen, Wirtschaftsräume ab 9)
 *   3) ethik2     Klasse 5–10, >= 250/Klasse
 *      (Werte & Normen, Goldene Regel in Religionen, Zivilcourage-Szenarien
 *       mit eindeutig richtiger Antwort, Umweltethik, ab Klasse 9
 *       Utilitarismus vs. Pflichtethik zuordnen)
 *
 * Deterministisch (mulberry32-Seed). Keine Abhängigkeiten, reines Node.
 *
 * Aufruf (vom Repo-Root):
 *   node scripts/questions/mega/generate13.mjs
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

/** Zahlen-Distraktoren nahe der Lösung (nie gleich der Lösung). */
function nearNumbers(rng, correct, deltas = [1, 2, 3]) {
  const set = new Set([correct]);
  const out = [];
  let guard = 0;
  while (out.length < 3 && guard < 100) {
    guard++;
    const delta = rng.pick(deltas) * (rng.next() < 0.5 ? -1 : 1);
    const cand = correct + delta;
    if (set.has(cand)) continue;
    set.add(cand);
    out.push(cand);
  }
  let up = correct + 4;
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

const LEADS = ["", "Wähle die richtige Antwort. ", "Aufgabe: ", "Teste dein Wissen: ", "Überlege genau: "];

/* ══════════════════ 1) PHYSIK3 Klasse 5–6 ══════════════════ */

// Materialien: [Name, leitet Strom?, magnetisch?]
const MATERIALIEN = [
  ["Kupferdraht", true, false], ["Eisennagel", true, true], ["Aluminiumfolie", true, false],
  ["Stahlbüroklammer", true, true], ["Silberlöffel", true, false], ["Goldring", true, false],
  ["Messingschlüssel", true, false], ["Zinkblech", true, false], ["Eisenschraube", true, true],
  ["Bleistiftmine (Grafit)", true, false], ["Stahlschere (Klinge)", true, true],
  ["Holzstab", false, false], ["Plastiklineal", false, false], ["Glasscheibe", false, false],
  ["Radiergummi", false, false], ["Korken", false, false], ["Wollfaden", false, false],
  ["Porzellantasse", false, false], ["Papierblatt", false, false], ["Ledergürtel", false, false],
  ["Kerzenwachs", false, false], ["Styroporplatte", false, false], ["Baumwolltuch", false, false],
  ["Keramikfliese", false, false], ["Gummihandschuh", false, false],
];
const LEITER = MATERIALIEN.filter((m) => m[1]).map((m) => m[0]);
const NICHTLEITER = MATERIALIEN.filter((m) => !m[1]).map((m) => m[0]);
const MAGNETISCH = MATERIALIEN.filter((m) => m[2]).map((m) => m[0]);
const NICHT_MAGNETISCH = MATERIALIEN.filter((m) => !m[2]).map((m) => m[0]);

// [Objekt, Einheit, Größe]
const EINHEITEN_OBJEKTE = [
  ["die Masse eines Mehlsacks", "kg", "Masse"],
  ["die Masse eines Fahrrads", "kg", "Masse"],
  ["die Masse eines Hundes", "kg", "Masse"],
  ["die Masse eines Kartoffelsacks", "kg", "Masse"],
  ["die Masse einer Schultasche", "kg", "Masse"],
  ["die Länge eines Klassenzimmers", "m", "Länge"],
  ["die Länge eines Schwimmbeckens", "m", "Länge"],
  ["die Höhe eines Hauses", "m", "Länge/Höhe"],
  ["die Breite einer Straße", "m", "Länge/Breite"],
  ["die Länge eines Fußballfeldes", "m", "Länge"],
  ["die Dauer eines 100-Meter-Laufs", "s", "Zeit"],
  ["die Dauer eines Blitzes", "s", "Zeit"],
  ["die Zeit für einen tiefen Atemzug", "s", "Zeit"],
  ["die Dauer eines Startsignals", "s", "Zeit"],
  ["die Temperatur von Badewasser", "°C", "Temperatur"],
  ["die Körpertemperatur eines Menschen", "°C", "Temperatur"],
  ["die Temperatur im Kühlschrank", "°C", "Temperatur"],
  ["die Außentemperatur im Winter", "°C", "Temperatur"],
  ["die Temperatur von Tee", "°C", "Temperatur"],
];
const EINHEITEN = ["kg", "m", "s", "°C"];

// [Frage, richtig, Distraktoren, Erklärung] — Licht & Schatten / Schall / Magnet-Fakten
const PHYSIK_FAKTEN = [
  ["Welche der genannten Lichtquellen leuchtet selbst?", "die Sonne", ["der Mond", "ein Spiegel", "eine weiße Wand"],
    "Die Sonne ist eine natürliche Lichtquelle. Mond, Spiegel und Wand reflektieren nur Licht."],
  ["Welcher Körper leuchtet NICHT selbst?", "der Mond", ["eine Kerze", "eine Glühlampe", "ein Lagerfeuer"],
    "Der Mond wird nur von der Sonne beleuchtet, er ist keine eigene Lichtquelle."],
  ["Wie breitet sich Licht aus?", "geradlinig", ["im Zickzack", "in Kreisen", "gar nicht"],
    "Licht breitet sich geradlinig aus — deshalb entstehen scharfe Schatten."],
  ["Wann entsteht ein Schatten?", "wenn ein lichtundurchlässiger Körper Licht abblockt", ["wenn Licht durch Glas fällt", "wenn es dunkel ist", "wenn eine Lampe ausgeschaltet ist"],
    "Ein Schatten entsteht hinter einem Körper, der das Licht nicht durchlässt."],
  ["Was passiert mit dem Schatten, wenn die Lampe näher an den Gegenstand rückt?", "er wird größer", ["er wird kleiner", "er verschwindet", "er bleibt genau gleich"],
    "Je näher die Lichtquelle am Gegenstand ist, desto größer wird der Schatten an der Wand."],
  ["Wann ist der Schatten eines Baumes am kürzesten?", "mittags, wenn die Sonne am höchsten steht", ["morgens bei Sonnenaufgang", "abends bei Sonnenuntergang", "nachts"],
    "Steht die Sonne hoch am Himmel, fallen die Strahlen steil ein und der Schatten ist kurz."],
  ["Welcher Stoff ist lichtdurchlässig?", "Fensterglas", ["eine Holzplatte", "ein Backstein", "eine Metallplatte"],
    "Klares Glas lässt Licht hindurch — Holz, Stein und Metall nicht."],
  ["Wodurch entsteht Schall?", "durch Schwingungen von Körpern", ["durch Licht", "durch Wärme", "durch Magnetismus"],
    "Schall entsteht, wenn Körper schwingen — z. B. eine Gitarrensaite oder ein Trommelfell."],
  ["Wo kann sich Schall NICHT ausbreiten?", "im luftleeren Raum (Vakuum)", ["in Luft", "in Wasser", "in Metall"],
    "Schall braucht einen Träger (Luft, Wasser, feste Stoffe). Im Vakuum gibt es keinen Schall."],
  ["Was hören wir, wenn eine Saite schneller schwingt?", "einen höheren Ton", ["einen tieferen Ton", "gar keinen Ton", "immer einen lauteren Ton"],
    "Je schneller die Schwingung (höhere Frequenz), desto höher klingt der Ton."],
  ["Was hören wir, wenn eine Trommel stärker angeschlagen wird?", "einen lauteren Ton", ["einen höheren Ton", "einen tieferen Ton", "keinen Unterschied"],
    "Stärkeres Anschlagen bedeutet größere Schwingung — der Ton wird lauter, nicht höher."],
  ["Wie nennt man zurückgeworfenen Schall?", "Echo", ["Blitz", "Funke", "Strahl"],
    "Trifft Schall auf eine Wand oder Felswand, wird er zurückgeworfen — wir hören ein Echo."],
  ["In welchem Stoff breitet sich Schall am schnellsten aus?", "in Stahl", ["in Luft", "im Vakuum", "in Watte"],
    "In festen Stoffen wie Stahl ist Schall viel schneller als in Luft; im Vakuum gibt es keinen Schall."],
  ["Warum sehen wir den Blitz vor dem Donner?", "Licht ist viel schneller als Schall", ["Donner entsteht später als der Blitz", "unsere Ohren sind langsamer als die Augen", "der Blitz ist näher als der Donner"],
    "Blitz und Donner entstehen gleichzeitig, aber Licht ist viel schneller als Schall."],
  ["Wie heißen die beiden Pole eines Magneten?", "Nordpol und Südpol", ["Pluspol und Minuspol", "Ostpol und Westpol", "Oberpol und Unterpol"],
    "Jeder Magnet hat einen Nordpol und einen Südpol. Plus und Minus gehören zur Elektrizität."],
  ["Wo ist die Kraft eines Stabmagneten am stärksten?", "an den beiden Polen", ["genau in der Mitte", "überall gleich stark", "nur am Nordpol"],
    "Die magnetische Kraft ist an den Polen (den Enden) am stärksten."],
  ["Was passiert, wenn man einen Stabmagneten in der Mitte durchtrennt?", "es entstehen zwei Magnete mit je zwei Polen", ["ein Teil ist nur Nordpol, der andere nur Südpol", "beide Teile sind nicht mehr magnetisch", "nur ein Teil bleibt magnetisch"],
    "Es gibt keinen einzelnen Pol: Jedes Teilstück hat wieder Nord- und Südpol."],
  ["Wonach richtet sich die Nadel eines Kompasses aus?", "nach dem Magnetfeld der Erde", ["nach dem Wind", "nach der Sonne", "nach dem Luftdruck"],
    "Die Erde ist ein riesiger Magnet — die Kompassnadel richtet sich nach ihrem Magnetfeld aus."],
  ["Durch welche Stoffe wirkt die Kraft eines Magneten hindurch?", "z. B. durch Papier und dünnes Holz", ["durch gar keine Stoffe", "nur durch Eisen", "nur durch Wasser"],
    "Magnetkraft wirkt durch viele nicht-magnetische Stoffe hindurch, etwa Papier, Holz oder Glas."],
  ["Was braucht ein einfacher Stromkreis mindestens, damit eine Lampe leuchtet?", "Stromquelle, Leitungen und Lampe in einem geschlossenen Kreis", ["nur eine Batterie", "nur eine Lampe und einen Schalter", "einen offenen Kreis mit Lücke"],
    "Erst wenn der Kreis aus Quelle, Leitungen und Lampe geschlossen ist, fließt Strom."],
  ["Was macht ein Schalter im Stromkreis?", "er öffnet und schließt den Stromkreis", ["er erzeugt Strom", "er speichert Strom", "er macht den Strom bunt"],
    "Ein Schalter unterbricht den Stromkreis oder schließt ihn — so geht die Lampe aus oder an."],
  ["Warum leuchtet die Lampe nicht, wenn der Stromkreis eine Lücke hat?", "der Strom kann nicht fließen", ["die Batterie wird zu heiß", "der Strom fließt rückwärts", "die Lampe ist immer kaputt"],
    "Strom fließt nur in einem geschlossenen Kreis. Bei einer Lücke ist der Kreis unterbrochen."],
  ["Warum sind Stromkabel mit Kunststoff ummantelt?", "Kunststoff leitet keinen Strom und schützt uns", ["damit sie schöner aussehen", "damit der Strom schneller fließt", "damit sie schwerer sind"],
    "Die Kunststoffhülle ist ein Isolator — sie schützt vor einem Stromschlag."],
  ["Bei welcher Temperatur gefriert Wasser?", "0 °C", ["10 °C", "100 °C", "−100 °C"],
    "Reines Wasser gefriert bei 0 °C und siedet bei 100 °C."],
  ["Bei welcher Temperatur siedet Wasser (auf Meereshöhe)?", "100 °C", ["50 °C", "0 °C", "1000 °C"],
    "Auf Meereshöhe siedet reines Wasser bei 100 °C."],
  ["Welche Flüssigkeit steigt im Thermometer, wenn es wärmer wird?", "die Thermometerflüssigkeit dehnt sich aus und steigt", ["Wasser fließt hinein", "Luft wird hineingepumpt", "die Flüssigkeit schrumpft"],
    "Wärme dehnt die Flüssigkeit im Röhrchen aus — sie steigt an der Skala nach oben."],
  ["Welche Körpertemperatur ist bei einem gesunden Menschen normal?", "etwa 37 °C", ["etwa 20 °C", "etwa 45 °C", "etwa 0 °C"],
    "Die normale Körpertemperatur des Menschen liegt bei ungefähr 37 °C."],
];

function physik3Generators(klasse) {
  const gens = [];

  // Magnetpole: anziehen/abstoßen (parametrisch)
  const POLPAARE = [
    ["Nordpol", "Nordpol", "stoßen sich ab"],
    ["Südpol", "Südpol", "stoßen sich ab"],
    ["Nordpol", "Südpol", "ziehen sich an"],
    ["Südpol", "Nordpol", "ziehen sich an"],
  ];
  gens.push((r) => {
    const [a, b, korrekt] = r.pick(POLPAARE);
    const falsch = korrekt === "stoßen sich ab" ? "ziehen sich an" : "stoßen sich ab";
    return mc(r, "Magnetismus",
      `${r.pick(LEADS)}Zwei Magnete werden mit ${a} und ${b} aneinandergehalten. Was passiert?`,
      `Die Pole ${korrekt}.`,
      [`Die Pole ${falsch}.`, "Nichts — Magnete wirken nur auf Eisen.", "Beide Magnete verlieren ihre Kraft."],
      `Gleiche Pole stoßen sich ab, ungleiche Pole ziehen sich an. ${a} und ${b} ${korrekt} also.`);
  });

  // Magnetisch oder nicht?
  gens.push((r) => {
    if (r.next() < 0.5) {
      const obj = r.pick(MAGNETISCH);
      return mc(r, "Magnetismus",
        `${r.pick(LEADS)}Wird ein Gegenstand wie „${obj}“ von einem Magneten angezogen?`,
        "Ja, denn er enthält Eisen bzw. Stahl.",
        ["Nein, Magnete ziehen nur Kunststoff an.", "Nur, wenn er nass ist.", "Nur bei großer Hitze."],
        `${obj} enthält Eisen/Stahl und wird deshalb vom Magneten angezogen.`);
    }
    const obj = r.pick(NICHT_MAGNETISCH);
    return mc(r, "Magnetismus",
      `${r.pick(LEADS)}Zieht ein Magnet den Gegenstand „${obj}“ an?`,
      "Nein, denn er enthält kein Eisen.",
      ["Ja, Magnete ziehen alle Metalle und Stoffe an.", "Ja, aber nur am Nordpol.", "Nur, wenn der Magnet sehr groß ist."],
      `${obj} enthält kein Eisen (und kein Nickel/Cobalt) — der Magnet zieht ihn nicht an.`);
  });

  // Welcher Gegenstand ist magnetisch / nicht magnetisch?
  gens.push((r) => {
    if (r.next() < 0.5) {
      const korrekt = r.pick(MAGNETISCH);
      return mc(r, "Magnetismus",
        `${r.pick(LEADS)}Welcher dieser Gegenstände bleibt an einem Magneten haften?`,
        korrekt, pickN(r, NICHT_MAGNETISCH, korrekt, 3),
        `${korrekt} besteht aus Eisen/Stahl und haftet deshalb am Magneten.`);
    }
    const korrekt = r.pick(NICHT_MAGNETISCH);
    return mc(r, "Magnetismus",
      `${r.pick(LEADS)}Welcher dieser Gegenstände wird NICHT vom Magneten angezogen?`,
      korrekt, pickN(r, MAGNETISCH, korrekt, 3),
      `${korrekt} enthält kein Eisen und wird deshalb nicht angezogen.`);
  });

  // Stromkreis: leitet / leitet nicht
  gens.push((r) => {
    if (r.next() < 0.5) {
      const korrekt = r.pick(LEITER);
      return mc(r, "Stromkreis",
        `${r.pick(LEADS)}Welcher Gegenstand leitet den elektrischen Strom, wenn man ihn in einen Stromkreis einbaut?`,
        korrekt, pickN(r, NICHTLEITER, korrekt, 3),
        `${korrekt} besteht aus leitendem Material (Metall bzw. Grafit) — die Lampe leuchtet.`);
    }
    const korrekt = r.pick(NICHTLEITER);
    return mc(r, "Stromkreis",
      `${r.pick(LEADS)}Welcher Gegenstand leitet den Strom NICHT (Isolator)?`,
      korrekt, pickN(r, LEITER, korrekt, 3),
      `${korrekt} ist ein Isolator — er leitet keinen Strom, die Lampe bleibt dunkel.`);
  });

  // Stromkreis: Lücke mit Material überbrücken (Ja/Nein je Material)
  gens.push((r) => {
    const [name, leitet] = r.pick(MATERIALIEN);
    return mc(r, "Stromkreis",
      `${r.pick(LEADS)}In einem Stromkreis mit Batterie und Lampe wird die Lücke mit „${name}“ überbrückt. Leuchtet die Lampe?`,
      leitet ? "Ja, denn dieses Material leitet Strom." : "Nein, denn dieses Material leitet keinen Strom.",
      leitet
        ? ["Nein, denn dieses Material leitet keinen Strom.", "Nur, wenn die Batterie neu ist.", "Nur im Dunkeln."]
        : ["Ja, denn dieses Material leitet Strom.", "Ja, aber nur ganz schwach für eine Sekunde.", "Nur, wenn man das Material erwärmt."],
      leitet
        ? `${name} ist ein elektrischer Leiter — der Stromkreis ist geschlossen und die Lampe leuchtet.`
        : `${name} ist ein Isolator — der Stromkreis bleibt unterbrochen, die Lampe bleibt aus.`);
  });

  // Temperatur: Änderung berechnen (steigen/fallen, auch unter 0)
  gens.push((r) => {
    const start = r.int(-10, 25);
    const steigt = r.next() < 0.5;
    const diff = r.int(3, 15);
    const ende = steigt ? start + diff : start - diff;
    return mc(r, "Temperatur & Thermometer",
      `${r.pick(LEADS)}Das Thermometer zeigt ${start} °C. Die Temperatur ${steigt ? "steigt" : "fällt"} um ${diff} °C. Was zeigt es danach an?`,
      `${ende} °C`, nearNumbers(r, ende).map((n) => `${n} °C`),
      `${start} °C ${steigt ? "+" : "−"} ${diff} °C = ${ende} °C.`);
  });

  // Temperatur: Unterschied berechnen
  gens.push((r) => {
    const a = r.int(-12, 10);
    const b = a + r.int(4, 20);
    return mc(r, "Temperatur & Thermometer",
      `${r.pick(LEADS)}Morgens sind es ${a} °C, mittags ${b} °C. Um wie viel Grad ist die Temperatur gestiegen?`,
      `${b - a} °C`, nearNumbers(r, b - a).filter((n) => n > 0).concat([b - a + 5, b - a + 6]).slice(0, 3).map((n) => `${n} °C`),
      `Unterschied: ${b} °C − (${a} °C) = ${b - a} °C.`);
  });

  // Thermometer ablesen: Skala mit 2er-Schritten
  gens.push((r) => {
    const unten = r.int(-5, 10) * 2;
    const striche = r.int(1, 5);
    const wert = unten + striche * 2;
    return mc(r, "Temperatur & Thermometer",
      `${r.pick(LEADS)}Auf einer Thermometerskala ist jeder Strich 2 °C. Die Flüssigkeit steht ${striche} Strich${striche === 1 ? "" : "e"} über der Marke ${unten} °C. Welche Temperatur wird angezeigt?`,
      `${wert} °C`, nearNumbers(r, wert, [1, 2, 4]).map((n) => `${n} °C`),
      `${unten} °C + ${striche} · 2 °C = ${wert} °C.`);
  });

  // Einheiten zuordnen: Objekt → Einheit
  gens.push((r) => {
    const [obj, einheit, groesse] = r.pick(EINHEITEN_OBJEKTE);
    return mc(r, "Einheiten",
      `${r.pick(LEADS)}In welcher Einheit misst man ${obj}?`,
      einheit, EINHEITEN.filter((e) => e !== einheit),
      `${groesse} misst man in der Einheit ${einheit}.`);
  });

  // Einheiten zuordnen: Größe → Einheit und umgekehrt
  const GROESSEN = [["Masse", "kg", "Kilogramm"], ["Länge", "m", "Meter"], ["Zeit", "s", "Sekunde"], ["Temperatur", "°C", "Grad Celsius"]];
  gens.push((r) => {
    const [groesse, einheit, name] = r.pick(GROESSEN);
    if (r.next() < 0.5) {
      return mc(r, "Einheiten",
        `${r.pick(LEADS)}Welche Einheit gehört zur Größe „${groesse}“?`,
        `${einheit} (${name})`,
        GROESSEN.filter((g) => g[0] !== groesse).map((g) => `${g[1]} (${g[2]})`),
        `Die Größe ${groesse} wird in ${name} (${einheit}) gemessen.`);
    }
    return mc(r, "Einheiten",
      `${r.pick(LEADS)}Zu welcher Größe gehört die Einheit „${einheit}“?`,
      groesse, GROESSEN.filter((g) => g[0] !== groesse).map((g) => g[0]),
      `${einheit} steht für ${name} und misst die Größe ${groesse}.`);
  });

  // Faktenfragen (Licht/Schatten, Schall, Magnet, Stromkreis, Temperatur)
  gens.push((r) => {
    const [frage, korrekt, distraktoren, erkl] = r.pick(PHYSIK_FAKTEN);
    return mc(r, "Physik-Grundlagen", `${r.pick(LEADS)}${frage}`, korrekt, distraktoren, erkl);
  });

  // Ab Klasse 6: Schall-Rechnung (340 m/s, glatte Zeiten)
  if (klasse >= 6) {
    gens.push((r) => {
      const t = r.int(1, 5);
      const d = 340 * t;
      return mc(r, "Schall",
        `${r.pick(LEADS)}Schall legt in Luft etwa 340 Meter pro Sekunde zurück. Wie weit kommt er in ${t} Sekunde${t === 1 ? "" : "n"}?`,
        `${d} m`, [`${d + 340} m`, `${d - (t > 1 ? 340 : 170)} m`, `${d * 2} m`],
        `340 m/s · ${t} s = ${d} m.`);
    });
    gens.push((r) => {
      const t = r.int(2, 9);
      const d = 340 * t;
      return mc(r, "Schall",
        `${r.pick(LEADS)}Zwischen Blitz und Donner vergehen ${t} Sekunden. Wie weit ist das Gewitter ungefähr entfernt (Schall: 340 m/s)?`,
        `etwa ${d} m`, [`etwa ${340 * (t + 1)} m`, `etwa ${340 * (t - 1)} m`, `etwa ${d * 10} m`],
        `Entfernung ≈ 340 m/s · ${t} s = ${d} m.`);
    });
  }

  return gens;
}

/* ══════════════════ 2) ERDKUNDE2 Klasse 5–10 ══════════════════ */

// [Land, Hauptstadt]
const EUROPA_LAENDER = [
  ["Deutschland", "Berlin"], ["Frankreich", "Paris"], ["Italien", "Rom"],
  ["Spanien", "Madrid"], ["Portugal", "Lissabon"], ["Griechenland", "Athen"],
  ["Österreich", "Wien"], ["Schweiz", "Bern"], ["Polen", "Warschau"],
  ["Tschechien", "Prag"], ["Ungarn", "Budapest"], ["Niederlande", "Amsterdam"],
  ["Belgien", "Brüssel"], ["Dänemark", "Kopenhagen"], ["Schweden", "Stockholm"],
  ["Norwegen", "Oslo"], ["Finnland", "Helsinki"], ["Irland", "Dublin"],
  ["Vereinigtes Königreich", "London"], ["Kroatien", "Zagreb"], ["Slowenien", "Ljubljana"],
  ["Slowakei", "Bratislava"], ["Rumänien", "Bukarest"], ["Bulgarien", "Sofia"],
  ["Serbien", "Belgrad"], ["Albanien", "Tirana"], ["Estland", "Tallinn"],
  ["Lettland", "Riga"], ["Litauen", "Vilnius"], ["Ukraine", "Kiew"],
  ["Island", "Reykjavik"], ["Luxemburg", "Luxemburg"], ["Türkei", "Ankara"],
  ["Nordmazedonien", "Skopje"], ["Bosnien und Herzegowina", "Sarajevo"],
];
const ALLE_HAUPTSTAEDTE = EUROPA_LAENDER.map((l) => l[1]);
const ALLE_LAENDER = EUROPA_LAENDER.map((l) => l[0]);

// [Land, Flaggen-Beschreibung]
const FLAGGEN = [
  ["Deutschland", "drei waagerechte Streifen: schwarz, rot, gold"],
  ["Frankreich", "drei senkrechte Streifen: blau, weiß, rot"],
  ["Italien", "drei senkrechte Streifen: grün, weiß, rot"],
  ["Niederlande", "drei waagerechte Streifen: rot, weiß, blau"],
  ["Polen", "zwei waagerechte Streifen: weiß oben, rot unten"],
  ["Österreich", "drei waagerechte Streifen: rot, weiß, rot"],
  ["Schweiz", "weißes Kreuz auf rotem, quadratischem Grund"],
  ["Schweden", "gelbes Kreuz auf blauem Grund"],
  ["Dänemark", "weißes Kreuz auf rotem Grund"],
  ["Norwegen", "blaues Kreuz mit weißem Rand auf rotem Grund"],
  ["Finnland", "blaues Kreuz auf weißem Grund"],
  ["Griechenland", "blau-weiße Streifen mit weißem Kreuz im blauen Feld"],
  ["Spanien", "rot-gelb-rot gestreift mit Wappen"],
  ["Belgien", "drei senkrechte Streifen: schwarz, gelb, rot"],
  ["Irland", "drei senkrechte Streifen: grün, weiß, orange"],
  ["Vereinigtes Königreich", "roter und weißer Kreuz-Union-Jack auf blauem Grund"],
  ["Tschechien", "weißer und roter Streifen mit blauem Dreieck am Mast"],
  ["Ungarn", "drei waagerechte Streifen: rot, weiß, grün"],
  ["Ukraine", "zwei waagerechte Streifen: blau oben, gelb unten"],
  ["Türkei", "weißer Halbmond und Stern auf rotem Grund"],
];

const NACHBARN_DE = ["Dänemark", "Polen", "Tschechien", "Österreich", "Schweiz", "Frankreich", "Luxemburg", "Belgien", "Niederlande"];
const KEINE_NACHBARN_DE = ["Italien", "Spanien", "Schweden", "Norwegen", "Ungarn", "Kroatien", "Portugal", "Griechenland", "Irland", "Finnland", "Rumänien"];

// [Fluss, Quelle/Ursprung, Mündung]
const FLUESSE = [
  ["Rhein", "in den Schweizer Alpen", "in die Nordsee"],
  ["Elbe", "im Riesengebirge (Tschechien)", "in die Nordsee"],
  ["Donau", "im Schwarzwald (Zusammenfluss bei Donaueschingen)", "ins Schwarze Meer"],
  ["Weser", "aus Werra und Fulda bei Hann. Münden", "in die Nordsee"],
  ["Oder", "in Tschechien", "in die Ostsee (Stettiner Haff)"],
  ["Main", "im Fichtelgebirge/Fränkische Alb", "in den Rhein bei Mainz"],
  ["Mosel", "in den Vogesen (Frankreich)", "in den Rhein bei Koblenz"],
  ["Neckar", "auf der Schwäbischen Alb (Baar)", "in den Rhein bei Mannheim"],
  ["Isar", "in den Alpen (Karwendel)", "in die Donau"],
  ["Inn", "in den Schweizer Alpen (Engadin)", "in die Donau bei Passau"],
];
const MUENDUNGEN = [...new Set(FLUESSE.map((f) => f[2]))];

// [Gebirge/Berg, Fakt-Höhe bzw. Zuordnung]
const BERGE = [
  ["Zugspitze", "2962", "höchster Berg Deutschlands (Alpen)"],
  ["Feldberg", "1493", "höchster Berg des Schwarzwaldes"],
  ["Brocken", "1141", "höchster Berg des Harzes"],
  ["Großer Arber", "1456", "höchster Berg des Bayerischen Waldes"],
  ["Fichtelberg", "1215", "höchster Berg des Erzgebirges (deutscher Teil)"],
  ["Wasserkuppe", "950", "höchster Berg der Rhön"],
];

// [Stadt, Bundesland]
const STAEDTE_BL = [
  ["München", "Bayern"], ["Nürnberg", "Bayern"], ["Augsburg", "Bayern"],
  ["Stuttgart", "Baden-Württemberg"], ["Karlsruhe", "Baden-Württemberg"], ["Freiburg", "Baden-Württemberg"],
  ["Frankfurt am Main", "Hessen"], ["Wiesbaden", "Hessen"], ["Kassel", "Hessen"],
  ["Köln", "Nordrhein-Westfalen"], ["Düsseldorf", "Nordrhein-Westfalen"], ["Dortmund", "Nordrhein-Westfalen"], ["Essen", "Nordrhein-Westfalen"],
  ["Mainz", "Rheinland-Pfalz"], ["Trier", "Rheinland-Pfalz"], ["Koblenz", "Rheinland-Pfalz"],
  ["Saarbrücken", "Saarland"],
  ["Hannover", "Niedersachsen"], ["Braunschweig", "Niedersachsen"], ["Osnabrück", "Niedersachsen"],
  ["Kiel", "Schleswig-Holstein"], ["Lübeck", "Schleswig-Holstein"],
  ["Schwerin", "Mecklenburg-Vorpommern"], ["Rostock", "Mecklenburg-Vorpommern"],
  ["Magdeburg", "Sachsen-Anhalt"], ["Halle (Saale)", "Sachsen-Anhalt"],
  ["Dresden", "Sachsen"], ["Leipzig", "Sachsen"], ["Chemnitz", "Sachsen"],
  ["Erfurt", "Thüringen"], ["Jena", "Thüringen"], ["Weimar", "Thüringen"],
  ["Potsdam", "Brandenburg"], ["Cottbus", "Brandenburg"],
];
const ALLE_BL = [...new Set(STAEDTE_BL.map((s) => s[1]))];

const GRADNETZ_FAKTEN = [
  ["Wie heißt der Breitenkreis, der die Erde in Nord- und Südhalbkugel teilt?", "Äquator", ["Nullmeridian", "Wendekreis", "Polarkreis"],
    "Der Äquator liegt bei 0° Breite und teilt die Erde in Nord- und Südhalbkugel."],
  ["Durch welche Stadt verläuft der Nullmeridian (0° Länge)?", "Greenwich (London)", ["Paris", "Berlin", "Rom"],
    "Der Nullmeridian verläuft durch die Sternwarte von Greenwich bei London."],
  ["Wie verlaufen die Breitenkreise auf dem Globus?", "waagerecht, parallel zum Äquator", ["senkrecht von Pol zu Pol", "schräg über den Globus", "kreuz und quer"],
    "Breitenkreise verlaufen parallel zum Äquator; Längenkreise von Pol zu Pol."],
  ["Wie verlaufen die Längenkreise (Meridiane)?", "von Pol zu Pol", ["parallel zum Äquator", "nur über die Nordhalbkugel", "im Kreis um Deutschland"],
    "Meridiane verbinden Nordpol und Südpol und geben die geografische Länge an."],
  ["Welche geografische Breite hat der Nordpol?", "90° Nord", ["0°", "45° Nord", "180° Nord"],
    "Am Nordpol beträgt die geografische Breite 90° Nord."],
  ["Welche Breite hat der Äquator?", "0°", ["90° Nord", "45° Süd", "100°"],
    "Der Äquator ist der Ausgangs-Breitenkreis mit 0°."],
  ["Wozu dient das Gradnetz der Erde?", "um jeden Ort genau anzugeben (Breite und Länge)", ["um Länder zu vergrößern", "um das Wetter zu messen", "um Zeitzonen abzuschaffen"],
    "Mit Breiten- und Längengrad lässt sich jeder Punkt der Erde eindeutig bestimmen."],
  ["Auf welcher Halbkugel liegt Deutschland?", "auf der Nordhalbkugel", ["auf der Südhalbkugel", "genau auf dem Äquator", "auf der Westhalbkugel südlich des Äquators"],
    "Deutschland liegt zwischen etwa 47° und 55° nördlicher Breite — also auf der Nordhalbkugel."],
  ["Wie viele Grad umfasst ein voller Kreis um die Erde?", "360°", ["180°", "100°", "400°"],
    "Ein Vollkreis hat 360° — Längengrade zählen je 180° nach Ost und West."],
  ["Zwischen welchen Angaben liegt eine Ortsangabe wie „48° Nord, 11° Ost“?", "geografische Breite und geografische Länge", ["Höhe und Tiefe", "Temperatur und Luftdruck", "Zeitzone und Datum"],
    "Erst die Breite (Nord/Süd), dann die Länge (Ost/West) — so gibt man Orte im Gradnetz an."],
];

const HIMMELSRICHTUNGEN = ["Norden", "Nordosten", "Osten", "Südosten", "Süden", "Südwesten", "Westen", "Nordwesten"];
const GEGENRICHTUNG = { Norden: "Süden", Süden: "Norden", Osten: "Westen", Westen: "Osten", Nordosten: "Südwesten", Südwesten: "Nordosten", Südosten: "Nordwesten", Nordwesten: "Südosten" };

// Wirtschaftsräume ab Klasse 9
const WIRTSCHAFT = [
  ["Welcher Wirtschaftsraum war lange das Zentrum von Kohle und Stahl in Deutschland?", "das Ruhrgebiet", ["das Allgäu", "die Lüneburger Heide", "der Spreewald"],
    "Das Ruhrgebiet in Nordrhein-Westfalen war das klassische Montanrevier (Kohle und Stahl)."],
  ["Welcher Strukturwandel prägt das Ruhrgebiet seit Jahrzehnten?", "von Kohle/Stahl zu Dienstleistungen, Technologie und Kultur", ["von Dienstleistungen zurück zum Bergbau", "von Industrie zu reiner Landwirtschaft", "es gab keinen Wandel"],
    "Nach dem Rückgang von Bergbau und Stahl entstanden Dienstleistungs-, Technologie- und Kulturstandorte."],
  ["Welche Stadt ist das wichtigste deutsche Banken- und Finanzzentrum?", "Frankfurt am Main", ["Rostock", "Chemnitz", "Trier"],
    "In Frankfurt sitzen die Europäische Zentralbank und viele Großbanken; dazu der größte deutsche Flughafen."],
  ["Wofür ist die Region um Stuttgart wirtschaftlich besonders bekannt?", "Automobil- und Maschinenbau", ["Fischerei", "Weinanbau als größter Wirtschaftszweig", "Braunkohletagebau"],
    "Im Raum Stuttgart sitzen große Automobil- und Maschinenbaukonzerne mit vielen Zulieferern."],
  ["Welcher norddeutsche Standort ist Deutschlands wichtigster Seehafen?", "Hamburg", ["München", "Dresden", "Saarbrücken"],
    "Der Hamburger Hafen ist der größte deutsche Seehafen und ein zentrales Logistikdrehkreuz."],
  ["Was versteht man unter einem „Ballungsraum“?", "ein dicht besiedeltes Gebiet mit vielen Städten und Arbeitsplätzen", ["ein unbewohntes Naturschutzgebiet", "ein einzelnes Dorf", "eine reine Ferienregion"],
    "Ballungsräume wie Rhein-Ruhr oder Rhein-Main sind dicht besiedelt und wirtschaftlich stark verflochten."],
  ["Welche Branche prägt den Wirtschaftsraum München besonders?", "Hightech, IT und Fahrzeugbau", ["Steinkohlebergbau", "Hochseefischerei", "Reisanbau"],
    "München ist ein Zentrum für Hightech, IT, Medien und Fahrzeugbau."],
  ["Was bedeutet „Strukturwandel“ in der Wirtschaft?", "die Verschiebung von Wirtschaftszweigen, z. B. von Industrie zu Dienstleistungen", ["das Umbauen von Fabrikgebäuden", "eine neue Steuer", "das Wachstum der Bevölkerung"],
    "Beim Strukturwandel verlieren alte Branchen an Bedeutung, neue wachsen — wie im Ruhrgebiet."],
  ["Welcher Sektor umfasst Landwirtschaft, Forstwirtschaft und Fischerei?", "der primäre Sektor", ["der sekundäre Sektor", "der tertiäre Sektor", "der digitale Sektor"],
    "Primär: Rohstoffgewinnung; sekundär: Industrie/Handwerk; tertiär: Dienstleistungen."],
  ["Zu welchem Wirtschaftssektor gehört eine Bank?", "zum tertiären Sektor (Dienstleistungen)", ["zum primären Sektor", "zum sekundären Sektor", "zu keinem Sektor"],
    "Banken erbringen Dienstleistungen und zählen zum tertiären Sektor."],
];

function erdkunde2Generators(klasse) {
  const gens = [];

  // Land → Hauptstadt
  gens.push((r) => {
    const [land, hs] = r.pick(EUROPA_LAENDER);
    return mc(r, "Europa: Hauptstädte",
      `${r.pick(LEADS)}Wie heißt die Hauptstadt von ${land}?`,
      hs, pickN(r, ALLE_HAUPTSTAEDTE, hs, 3),
      `Die Hauptstadt von ${land} ist ${hs}.`);
  });

  // Hauptstadt → Land
  gens.push((r) => {
    const [land, hs] = r.pick(EUROPA_LAENDER);
    return mc(r, "Europa: Hauptstädte",
      `${r.pick(LEADS)}${hs} ist die Hauptstadt welches Landes?`,
      land, pickN(r, ALLE_LAENDER, land, 3),
      `${hs} ist die Hauptstadt von ${land}.`);
  });

  // Flaggen-Beschreibung → Land
  gens.push((r) => {
    const [land, beschr] = r.pick(FLAGGEN);
    return mc(r, "Europa: Flaggen",
      `${r.pick(LEADS)}Zu welchem Land gehört diese Flagge: ${beschr}?`,
      land, pickN(r, FLAGGEN.map((f) => f[0]), land, 3),
      `Die Flagge „${beschr}“ gehört zu ${land}.`);
  });

  // Nachbarländer Deutschlands
  gens.push((r) => {
    if (r.next() < 0.5) {
      const korrekt = r.pick(NACHBARN_DE);
      return mc(r, "Nachbarländer Deutschlands",
        `${r.pick(LEADS)}Welches dieser Länder grenzt direkt an Deutschland?`,
        korrekt, pickN(r, KEINE_NACHBARN_DE, korrekt, 3),
        `${korrekt} ist eines der neun Nachbarländer Deutschlands.`);
    }
    const korrekt = r.pick(KEINE_NACHBARN_DE);
    return mc(r, "Nachbarländer Deutschlands",
      `${r.pick(LEADS)}Welches dieser Länder grenzt NICHT an Deutschland?`,
      korrekt, pickN(r, NACHBARN_DE, korrekt, 3),
      `${korrekt} hat keine gemeinsame Grenze mit Deutschland. Deutschland hat neun Nachbarländer.`);
  });

  gens.push((r) => {
    return mc(r, "Nachbarländer Deutschlands",
      `${r.pick(LEADS)}Wie viele Nachbarländer hat Deutschland?`,
      "9", ["7", "8", "11"],
      "Deutschland grenzt an neun Länder: Dänemark, Polen, Tschechien, Österreich, Schweiz, Frankreich, Luxemburg, Belgien und die Niederlande.");
  });

  // Flüsse: Quelle/Mündung
  gens.push((r) => {
    const [fluss, quelle, muendung] = r.pick(FLUESSE);
    if (r.next() < 0.5) {
      return mc(r, "Deutschland: Flüsse",
        `${r.pick(LEADS)}Wohin mündet der Fluss ${fluss}?`,
        muendung, pickN(r, MUENDUNGEN.concat(["in den Bodensee", "in die Elbe"]), muendung, 3),
        `${fluss} mündet ${muendung}.`);
    }
    return mc(r, "Deutschland: Flüsse",
      `${r.pick(LEADS)}Wo entspringt der Fluss ${fluss}?`,
      quelle, pickN(r, FLUESSE.map((f) => f[1]), quelle, 3),
      `${fluss} entspringt ${quelle} und mündet ${muendung}.`);
  });

  // Gebirge/Berge
  gens.push((r) => {
    const [berg, hoehe, fakt] = r.pick(BERGE);
    if (r.next() < 0.5) {
      return mc(r, "Deutschland: Gebirge",
        `${r.pick(LEADS)}Wie hoch ist der Gipfel „${berg}“ (${fakt})?`,
        `${hoehe} m`, pickN(r, BERGE.map((b) => `${b[1]} m`), `${hoehe} m`, 3),
        `Der Gipfel „${berg}“ ist ${hoehe} m hoch — ${fakt}.`);
    }
    return mc(r, "Deutschland: Gebirge",
      `${r.pick(LEADS)}Welcher Berg ist ${fakt}?`,
      berg, pickN(r, BERGE.map((b) => b[0]), berg, 3),
      `Der Gipfel „${berg}“ (${hoehe} m) ist ${fakt}.`);
  });

  // Stadt → Bundesland
  gens.push((r) => {
    const [stadt, bl] = r.pick(STAEDTE_BL);
    return mc(r, "Deutschland: Städte & Bundesländer",
      `${r.pick(LEADS)}In welchem Bundesland liegt ${stadt}?`,
      bl, pickN(r, ALLE_BL, bl, 3),
      `${stadt} liegt in ${bl}.`);
  });

  // Gradnetz-Basics
  gens.push((r) => {
    const [frage, korrekt, distraktoren, erkl] = r.pick(GRADNETZ_FAKTEN);
    return mc(r, "Gradnetz", `${r.pick(LEADS)}${frage}`, korrekt, distraktoren, erkl);
  });

  // Himmelsrichtungen: Gegenrichtung
  gens.push((r) => {
    const dir = r.pick(HIMMELSRICHTUNGEN);
    const gegen = GEGENRICHTUNG[dir];
    return mc(r, "Himmelsrichtungen",
      `${r.pick(LEADS)}Du blickst nach ${dir}. In welche Richtung zeigt dein Rücken?`,
      gegen, pickN(r, HIMMELSRICHTUNGEN, gegen, 3).filter((d) => d !== dir).concat([dir]).slice(0, 3),
      `Die Gegenrichtung von ${dir} ist ${gegen}.`);
  });

  // Himmelsrichtungen: Drehung berechnen
  gens.push((r) => {
    const startIdx = r.int(0, 7);
    const schritte = r.pick([2, 4, 6]); // 90°, 180°, 270°
    const grad = schritte * 45;
    const imUZS = r.next() < 0.5;
    const zielIdx = ((startIdx + (imUZS ? schritte : -schritte)) % 8 + 8) % 8;
    const start = HIMMELSRICHTUNGEN[startIdx];
    const ziel = HIMMELSRICHTUNGEN[zielIdx];
    return mc(r, "Himmelsrichtungen",
      `${r.pick(LEADS)}Ein Wanderer blickt nach ${start} und dreht sich um ${grad}° ${imUZS ? "im" : "gegen den"} Uhrzeigersinn. Wohin blickt er jetzt?`,
      ziel, pickN(r, HIMMELSRICHTUNGEN, ziel, 3),
      `${grad}° entsprechen ${schritte} Schritten auf der Windrose (je 45°): von ${start} aus landet man bei ${ziel}.`);
  });

  // Himmelsrichtungen: zwischen zwei Richtungen
  const ZWISCHEN = [
    ["Norden", "Osten", "Nordosten"], ["Osten", "Süden", "Südosten"],
    ["Süden", "Westen", "Südwesten"], ["Westen", "Norden", "Nordwesten"],
  ];
  gens.push((r) => {
    const [a, b, mitte] = r.pick(ZWISCHEN);
    return mc(r, "Himmelsrichtungen",
      `${r.pick(LEADS)}Welche Himmelsrichtung liegt genau zwischen ${a} und ${b}?`,
      mitte, pickN(r, HIMMELSRICHTUNGEN, mitte, 3),
      `Zwischen ${a} und ${b} liegt ${mitte}.`);
  });

  // Wirtschaftsräume ab Klasse 9
  if (klasse >= 9) {
    gens.push((r) => {
      const [frage, korrekt, distraktoren, erkl] = r.pick(WIRTSCHAFT);
      return mc(r, "Wirtschaftsräume", `${r.pick(LEADS)}${frage}`, korrekt, distraktoren, erkl);
    });
  }

  return gens;
}

/* ══════════════════ 3) ETHIK2 Klasse 5–10 ══════════════════ */

// [Begriff, Definition]
const ETHIK_BEGRIFFE = [
  ["Wert", "eine Vorstellung davon, was für Menschen wichtig und erstrebenswert ist (z. B. Ehrlichkeit)"],
  ["Norm", "eine konkrete Regel für das Verhalten, die aus Werten abgeleitet wird"],
  ["Toleranz", "andere Meinungen und Lebensweisen gelten lassen, auch wenn man sie nicht teilt"],
  ["Respekt", "die Achtung vor einer anderen Person und ihren Gefühlen"],
  ["Gerechtigkeit", "jedem das zukommen lassen, was ihm fair zusteht"],
  ["Solidarität", "das Zusammenhalten und gegenseitige Unterstützen in einer Gruppe"],
  ["Verantwortung", "für die Folgen des eigenen Handelns einstehen"],
  ["Gewissen", "die innere Stimme, die unser Handeln als richtig oder falsch bewertet"],
  ["Empathie", "sich in die Gefühle anderer Menschen hineinversetzen können"],
  ["Vorurteil", "ein vorschnelles Urteil über Menschen, ohne sie wirklich zu kennen"],
  ["Zivilcourage", "mutiges Eintreten für andere und für Werte, auch wenn es unbequem ist"],
  ["Menschenwürde", "der unantastbare Wert, der jedem Menschen von Geburt an zukommt"],
  ["Freiheit", "selbstbestimmt handeln können, ohne die Rechte anderer zu verletzen"],
  ["Ehrlichkeit", "die Wahrheit sagen und andere nicht täuschen"],
  ["Fairness", "sich an Regeln halten und andere nicht benachteiligen"],
  ["Kompromiss", "eine Einigung, bei der beide Seiten etwas nachgeben"],
  ["Mobbing", "das wiederholte, absichtliche Ausgrenzen oder Schikanieren einer Person"],
  ["Diskriminierung", "die Benachteiligung von Menschen wegen ihrer Herkunft, Religion oder anderer Merkmale"],
  ["Egoismus", "nur an den eigenen Vorteil denken, ohne Rücksicht auf andere"],
  ["Altruismus", "selbstloses Handeln zum Wohl anderer"],
  ["Pflicht", "etwas, das man tun soll, weil es geboten oder vereinbart ist"],
  ["Ideal", "ein Vorbild oder Ziel, nach dem man strebt, auch wenn man es nie ganz erreicht"],
];

// [Religion, Formulierung der Goldenen Regel / Zuordnung]
const GOLDENE_REGEL = [
  ["Wie lautet die Goldene Regel in einfacher Form?", "Behandle andere so, wie du selbst behandelt werden möchtest.", ["Behandle andere so, wie sie dich behandelt haben.", "Denke zuerst an deinen eigenen Vorteil.", "Wer stärker ist, hat Recht."],
    "Die Goldene Regel fordert, sich in andere hineinzuversetzen: Was du nicht willst, das man dir tu, das füg auch keinem andern zu."],
  ["Im Christentum sagt Jesus in der Bergpredigt sinngemäß:", "„Alles, was ihr wollt, dass euch die Menschen tun, das tut auch ihnen.“", ["„Auge um Auge, Zahn um Zahn gilt immer.“", "„Helft nur denen, die euch helfen können.“", "„Meidet alle Fremden.“"],
    "Die Goldene Regel steht in der Bergpredigt (Matthäus 7,12)."],
  ["Welche Aussage entspricht der Goldenen Regel im Judentum (Hillel)?", "„Was dir verhasst ist, das tue deinem Nächsten nicht an.“", ["„Nur das eigene Volk verdient Achtung.“", "„Rache ist die höchste Pflicht.“", "„Regeln gelten nur am Sabbat.“"],
    "Der jüdische Gelehrte Hillel fasste die Tora mit dieser negativen Form der Goldenen Regel zusammen."],
  ["Was besagt die Goldene Regel im Islam sinngemäß?", "Keiner von euch ist gläubig, solange er seinem Bruder nicht wünscht, was er sich selbst wünscht.", ["Nur Gläubige verdienen gutes Verhalten.", "Gastfreundschaft ist unwichtig.", "Jeder ist sich selbst der Nächste."],
    "Ein bekannter Hadith formuliert die Goldene Regel für das Zusammenleben."],
  ["In welchen Religionen und Kulturen findet man die Goldene Regel?", "in fast allen großen Religionen und Kulturen weltweit", ["nur im Christentum", "nur in Europa", "in keiner Religion, nur in Gesetzen"],
    "Die Goldene Regel gibt es u. a. im Christentum, Judentum, Islam, Buddhismus, Hinduismus und Konfuzianismus."],
  ["Was verlangt die Goldene Regel von uns, bevor wir handeln?", "einen Perspektivwechsel: sich in die betroffene Person hineinversetzen", ["den eigenen Vorteil auszurechnen", "die Erlaubnis der Mehrheit", "gar nichts"],
    "Wer die Goldene Regel anwendet, fragt: Wie wäre es für mich, wenn man das mit mir machte?"],
  ["Ein Mitschüler wird ausgelacht. Was folgt aus der Goldenen Regel?", "nicht mitlachen, denn man möchte selbst auch nicht ausgelacht werden", ["mitlachen, wenn es alle tun", "wegsehen, weil es einen nichts angeht", "den Mitschüler zusätzlich ärgern"],
    "Die Goldene Regel: Da ich selbst nicht ausgelacht werden möchte, lache ich auch andere nicht aus."],
  ["Welcher Denker aus China lehrte eine frühe Form der Goldenen Regel?", "Konfuzius", ["Kolumbus", "Newton", "Napoleon"],
    "Konfuzius lehrte: „Was du selbst nicht wünschst, das tue auch keinem anderen an.“"],
];

// Zivilcourage/Vorbilder-Szenarien mit eindeutig richtiger Antwort
const SZENARIEN = [
  ["Auf dem Schulhof wird ein Kind von Älteren bedrängt. Was ist richtig?", "Hilfe holen, z. B. eine Lehrkraft informieren", ["wegsehen und weitergehen", "das Ganze filmen und posten", "mitmachen, um dazuzugehören"],
    "Zivilcourage heißt handeln, ohne sich selbst zu gefährden: Hilfe holen ist immer richtig."],
  ["In der Klassengruppe wird ein gemeines Bild eines Mitschülers geteilt. Was tust du?", "nicht weiterleiten und den Mitschüler bzw. Erwachsene informieren", ["das Bild weiterleiten, weil es lustig ist", "einen gemeinen Kommentar schreiben", "nichts sagen und mitlachen"],
    "Cybermobbing stoppt man, indem man nicht mitmacht und Betroffenen hilft."],
  ["Du siehst, wie jemandem im Bus die Geldbörse aus der Tasche fällt. Was ist richtig?", "die Person darauf aufmerksam machen und die Börse zurückgeben", ["die Geldbörse heimlich einstecken", "so tun, als hättest du nichts gesehen", "das Geld herausnehmen und die Börse liegen lassen"],
    "Ehrlichkeit verlangt, fremdes Eigentum zurückzugeben."],
  ["Ein neuer Schüler steht in der Pause allein. Was zeigt Empathie?", "ihn ansprechen und einladen mitzumachen", ["ihn ignorieren, bis er von selbst kommt", "über ihn tuscheln", "ihm sagen, dass er stört"],
    "Sich in die Lage des Neuen versetzen: Allein sein ist unangenehm — einladen hilft."],
  ["Deine Freundin wird wegen ihrer Herkunft beleidigt. Was ist Zivilcourage?", "klar widersprechen und ihr beistehen", ["so tun, als hättest du nichts gehört", "die Beleidigung weitererzählen", "die Freundin meiden"],
    "Zivilcourage bedeutet, für andere einzutreten — auch wenn es Mut kostet."],
  ["Du hast versehentlich das Fahrrad eines Nachbarn beschädigt. Niemand hat es gesehen. Was ist richtig?", "es dem Nachbarn sagen und den Schaden regeln", ["schnell weggehen", "einem anderen die Schuld geben", "abwarten, ob er es merkt"],
    "Verantwortung heißt, auch für unbeabsichtigte Fehler einzustehen."],
  ["In einer Prüfung könntest du unbemerkt abschreiben. Was ist ehrlich?", "es nicht tun und mit dem eigenen Wissen arbeiten", ["abschreiben, weil es keiner sieht", "die Lösung an andere verkaufen", "die Prüfung heimlich fotografieren"],
    "Ehrlichkeit gilt auch, wenn niemand hinsieht — Täuschung ist unfair gegenüber allen."],
  ["Jemand verbreitet ein falsches Gerücht über eine Mitschülerin. Was tust du?", "das Gerücht nicht weitererzählen und es richtigstellen", ["es weitererzählen, weil es spannend ist", "es noch etwas ausschmücken", "die Mitschülerin auslachen"],
    "Gerüchte verletzen. Fairness verlangt, sie zu stoppen statt zu verbreiten."],
  ["Ein Rollstuhlfahrer kommt an einer schweren Tür nicht weiter. Was ist hilfsbereit?", "fragen, ob man die Tür aufhalten darf, und helfen", ["schnell vorbeigehen", "ungeduldig drängeln", "zusehen und warten"],
    "Hilfsbereitschaft: erst fragen, dann helfen — respektvoll und auf Augenhöhe."],
  ["Deine Mannschaft verliert und ein Mitspieler beschimpft den Schiedsrichter. Was ist fair?", "sich beim Schiedsrichter korrekt verhalten und den Mitspieler beruhigen", ["mitschimpfen", "den Gegner beleidigen", "den Platz aus Protest beschädigen"],
    "Fairplay bedeutet Respekt gegenüber Schiedsrichter und Gegner — auch bei Niederlagen."],
  ["Du findest im Klassenraum 10 Euro auf dem Boden. Was ist richtig?", "das Geld bei der Lehrkraft abgeben", ["das Geld behalten", "das Geld mit Freunden teilen", "es heimlich in die eigene Tasche stecken"],
    "Fundgeld gehört dem Verlierer — abgeben ist die ehrliche Lösung."],
  ["Eine ältere Person steht im vollen Bus. Was ist respektvoll?", "den eigenen Sitzplatz anbieten", ["sich schlafend stellen", "die Person wegdrängen", "laut Musik hören und wegsehen"],
    "Rücksichtnahme auf Schwächere ist ein Zeichen von Respekt."],
  ["Warum nennt man Menschen wie Feuerwehrleute oder mutige Helfer oft „Vorbilder“?", "weil ihr Verhalten zeigt, wie man verantwortungsvoll handeln kann", ["weil sie berühmt und reich sind", "weil sie nie Fehler machen", "weil sie besonders alt sind"],
    "Vorbilder orientieren uns durch ihr Handeln — nicht durch Ruhm oder Perfektion."],
  ["Ein Freund will, dass du für ihn lügst. Was ist richtig?", "die Lüge ablehnen und ehrlich bleiben", ["lügen, weil er dein Freund ist", "die Lüge noch größer machen", "Geld für die Lüge verlangen"],
    "Freundschaft rechtfertigt keine Täuschung — Ehrlichkeit schützt am Ende beide."],
];

const UMWELT = [
  ["Warum sollen wir Müll trennen?", "damit Wertstoffe recycelt und Rohstoffe gespart werden", ["damit die Mülltonnen bunter aussehen", "weil Müll dann verschwindet", "damit mehr Müll entsteht"],
    "Getrennter Müll kann recycelt werden — das spart Rohstoffe und Energie."],
  ["Was bedeutet „Nachhaltigkeit“?", "so leben, dass auch künftige Generationen gut leben können", ["alles sofort verbrauchen", "nur an heute denken", "möglichst viel wegwerfen"],
    "Nachhaltig handeln heißt, Ressourcen zu schonen und an morgen zu denken."],
  ["Welches Verhalten schont das Klima am meisten?", "kurze Strecken zu Fuß oder mit dem Rad zurücklegen", ["jede Strecke mit dem Auto fahren", "das Flugzeug für Kurzstrecken nehmen", "den Motor im Stand laufen lassen"],
    "Zu Fuß gehen und Radfahren verursachen keine Abgase."],
  ["Warum ist Plastikmüll im Meer ein Problem?", "Tiere verschlucken ihn oder verfangen sich darin", ["Plastik löst sich sofort auf", "Fische essen ihn gern und gesund", "das Meer wird dadurch wärmer und schöner"],
    "Plastik zerfällt nur sehr langsam und gefährdet Meerestiere."],
  ["Was kannst du tun, um Wasser zu sparen?", "beim Zähneputzen den Hahn zudrehen", ["täglich stundenlang duschen", "den Hahn laufen lassen", "den Rasen mittags in der Sonne sprengen"],
    "Kleine Gewohnheiten wie das Zudrehen des Hahns sparen viel Wasser."],
  ["Warum haben auch Tiere einen moralischen Wert?", "sie sind empfindungsfähige Lebewesen und können leiden", ["sie können Geld verdienen", "sie gehören immer jemandem", "sie sehen niedlich aus"],
    "Weil Tiere leiden können, tragen Menschen Verantwortung für ihren Umgang mit ihnen."],
  ["Was bedeutet Verantwortung gegenüber der Natur?", "sie zu schützen, weil auch künftige Menschen und Tiere von ihr leben", ["sie beliebig auszubeuten", "sie nur zu fotografieren", "sie zu ignorieren"],
    "Umweltethik fragt nach unserer Verantwortung für Natur, Tiere und kommende Generationen."],
  ["Welche Einkaufsentscheidung ist am umweltfreundlichsten?", "regionales Gemüse der Saison mit wenig Verpackung", ["eingeflogene Früchte in Einzelverpackung", "täglich neue Plastiktüten", "Lebensmittel kaufen und wegwerfen"],
    "Regional, saisonal und unverpackt spart Transportwege und Müll."],
  ["Warum ist Energiesparen ethisch sinnvoll?", "es schont Ressourcen und schützt das Klima für alle", ["Strom ist unbegrenzt vorhanden", "es schadet der Umwelt", "nur Erwachsene müssen sparen"],
    "Weniger Energieverbrauch bedeutet weniger Emissionen — das nützt allen, auch künftigen Generationen."],
  ["Was ist ein „ökologischer Fußabdruck“?", "ein Maß dafür, wie stark unser Lebensstil die Umwelt belastet", ["die Schuhgröße eines Menschen", "eine Wanderroute", "ein Tierabdruck im Wald"],
    "Der ökologische Fußabdruck zeigt, wie viele Ressourcen unser Alltag verbraucht."],
];

// Utilitarismus vs. Pflichtethik (ab Klasse 9): [Aussage/Begründung, Zuordnung]
const THEORIEN = [
  ["„Richtig ist, was das größte Glück für die größte Zahl bewirkt.“", "Utilitarismus"],
  ["„Eine Handlung ist gut, wenn ihre Folgen möglichst viel Nutzen stiften.“", "Utilitarismus"],
  ["„Ich vergleiche Nutzen und Schaden für alle Betroffenen und wähle die beste Bilanz.“", "Utilitarismus"],
  ["„Ob eine Lüge falsch ist, hängt allein von ihren Folgen ab.“", "Utilitarismus"],
  ["„Wir sollten spenden, weil dadurch insgesamt mehr Leid verhindert wird.“", "Utilitarismus"],
  ["„Handle nur nach der Maxime, von der du wollen kannst, dass sie allgemeines Gesetz wird.“", "Pflichtethik"],
  ["„Lügen ist immer falsch, egal welche Folgen es hat.“", "Pflichtethik"],
  ["„Der Mensch darf nie bloß als Mittel benutzt werden, sondern immer auch als Zweck.“", "Pflichtethik"],
  ["„Entscheidend ist der gute Wille, nicht der Erfolg der Handlung.“", "Pflichtethik"],
  ["„Ich halte mein Versprechen, weil Versprechen zu halten meine Pflicht ist.“", "Pflichtethik"],
  ["„Eine Regel gilt, wenn sie für alle Menschen verallgemeinerbar ist.“", "Pflichtethik"],
  ["„Die Notlüge ist erlaubt, wenn sie mehr Glück als Leid erzeugt.“", "Utilitarismus"],
];

const THEORIE_FAKTEN = [
  ["Welcher Philosoph gilt als wichtigster Vertreter der Pflichtethik?", "Immanuel Kant", ["Jeremy Bentham", "John Stuart Mill", "Karl Marx"],
    "Kant begründete die Pflichtethik mit dem kategorischen Imperativ."],
  ["Welche Philosophen begründeten den Utilitarismus?", "Jeremy Bentham und John Stuart Mill", ["Immanuel Kant und Hegel", "Sokrates und Platon", "Luther und Calvin"],
    "Bentham und Mill bewerteten Handlungen nach ihrem Nutzen für das allgemeine Glück."],
  ["Woran bemisst der Utilitarismus, ob eine Handlung gut ist?", "an ihren Folgen (Nutzen bzw. Glück)", ["an der Absicht allein", "an der Tradition", "am Zufall"],
    "Der Utilitarismus ist eine Folgenethik: Es zählt die Nutzenbilanz."],
  ["Woran bemisst die Pflichtethik, ob eine Handlung gut ist?", "an der Pflicht und dem guten Willen, unabhängig von den Folgen", ["nur am Ergebnis", "am persönlichen Vorteil", "an der Mehrheitsmeinung"],
    "Für Kant zählt, ob die Handlung aus Pflicht geschieht und verallgemeinerbar ist."],
  ["Wie lautet der Grundgedanke des kategorischen Imperativs?", "nur nach Regeln handeln, die für alle gelten könnten", ["immer der Mehrheit folgen", "den eigenen Nutzen maximieren", "im Zweifel nichts tun"],
    "Kants Formel prüft, ob die eigene Handlungsregel verallgemeinerbar ist."],
  ["Was ist ein typischer Einwand gegen den Utilitarismus?", "er könnte Einzelne für das Glück der Mehrheit opfern", ["er beachtet Folgen zu wenig", "er ist zu streng bei Lügen", "er verbietet jedes Vergnügen"],
    "Kritiker warnen: Reine Nutzenrechnung kann Minderheiten benachteiligen."],
];

function ethik2Generators(klasse) {
  const gens = [];

  // Begriff → Definition
  gens.push((r) => {
    const [begriff, def] = r.pick(ETHIK_BEGRIFFE);
    return mc(r, "Werte & Normen",
      `${r.pick(LEADS)}Was versteht man unter „${begriff}“?`,
      def, pickN(r, ETHIK_BEGRIFFE.filter((b) => b[0] !== begriff).map((b) => b[1]), def, 3),
      `${begriff}: ${def}.`);
  });

  // Definition → Begriff
  gens.push((r) => {
    const [begriff, def] = r.pick(ETHIK_BEGRIFFE);
    return mc(r, "Werte & Normen",
      `${r.pick(LEADS)}Welcher Begriff passt zu dieser Beschreibung: „${def}“?`,
      begriff, pickN(r, ETHIK_BEGRIFFE.map((b) => b[0]), begriff, 3),
      `Die Beschreibung passt zum Begriff „${begriff}“.`);
  });

  // Goldene Regel
  gens.push((r) => {
    const [frage, korrekt, distraktoren, erkl] = r.pick(GOLDENE_REGEL);
    return mc(r, "Goldene Regel", `${r.pick(LEADS)}${frage}`, korrekt, distraktoren, erkl);
  });

  // Zivilcourage-Szenarien
  gens.push((r) => {
    const [frage, korrekt, distraktoren, erkl] = r.pick(SZENARIEN);
    return mc(r, "Zivilcourage & Vorbilder", `${r.pick(LEADS)}${frage}`, korrekt, distraktoren, erkl);
  });

  // Umweltethik
  gens.push((r) => {
    const [frage, korrekt, distraktoren, erkl] = r.pick(UMWELT);
    return mc(r, "Umweltethik", `${r.pick(LEADS)}${frage}`, korrekt, distraktoren, erkl);
  });

  // Ab Klasse 9: Ethik-Theorien
  if (klasse >= 9) {
    gens.push((r) => {
      const [aussage, theorie] = r.pick(THEORIEN);
      return mc(r, "Ethik-Theorien",
        `${r.pick(LEADS)}Zu welcher ethischen Theorie passt die Aussage ${aussage}?`,
        theorie,
        [theorie === "Utilitarismus" ? "Pflichtethik" : "Utilitarismus", "Ästhetik", "Astrologie"],
        theorie === "Utilitarismus"
          ? "Die Aussage bewertet Handlungen nach ihren Folgen bzw. ihrem Nutzen — das ist Utilitarismus."
          : "Die Aussage stellt Pflicht, guten Willen bzw. Verallgemeinerbarkeit in den Mittelpunkt — das ist Pflichtethik (Kant).");
    });
    gens.push((r) => {
      const [frage, korrekt, distraktoren, erkl] = r.pick(THEORIE_FAKTEN);
      return mc(r, "Ethik-Theorien", `${r.pick(LEADS)}${frage}`, korrekt, distraktoren, erkl);
    });
  }

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

  console.log("Physik3 (Klasse 5–6, je >= 350):");
  for (let k = 5; k <= 6; k++)
    total += writeBank("physik3", k, generateBank(131000 + k, 350, physik3Generators(k)), 350);

  console.log("Erdkunde2 (Klasse 5–10, je >= 350):");
  for (let k = 5; k <= 10; k++)
    total += writeBank("erdkunde2", k, generateBank(132000 + k, 350, erdkunde2Generators(k)), 350);

  console.log("Ethik2 (Klasse 5–10, je >= 250):");
  for (let k = 5; k <= 10; k++)
    total += writeBank("ethik2", k, generateBank(133000 + k, 250, ethik2Generators(k)), 250);

  console.log(`\nGesamt (Runde 13): ${total} Fragen.`);
}

main();
