/**
 * MEGA-Fragen-Generator RUNDE 9 für MasterMind.
 *
 * Ergänzt die Fragenbank aus generate.mjs … generate8.mjs im GLEICHEN Format
 *   scripts/questions/mega/data/<fach>-klasse<k>.json
 * mit [{ topic, question, options[4], correct(Index), explanation }].
 *
 * Fächer/Umfang (nur NEUE Dateien mit freien Präfixen, Bestehendes bleibt unberührt):
 *   1) mathematik6  Klasse 3–10, >= 450/Klasse
 *      (Sachaufgaben: Einkauf, Zeit–Distanz, Klassenfahrt; Einheiten-Umrechnung gemischt;
 *       Kl. 7–10 Zins/Prozent-Vertiefung inkl. Zinseszins 1–2 Jahre; Maßstab-Rechnungen)
 *   2) biologie2    Klasse 5–10, >= 350/Klasse
 *      (Körper-Systeme: Herz/Kreislauf/Atmung; Pflanzen: Aufbau, Bestäubung;
 *       Tiere: Wirbeltier-Klassen zuordnen, Merkmale; Ernährung/Verdauung; Kl. 9–10 Immunsystem)
 *   3) chemie3      Klasse 7–8, >= 300/Klasse
 *      (Stoffeigenschaften, Gemische/Trennverfahren zuordnen, Aggregatzustände/Übergänge,
 *       Laborgeräte + Sicherheit, einfache Element-Symbole)
 *
 * Alle Ergebnisse exakt berechnet. Deterministisch (mulberry32-Seed).
 * Keine Abhängigkeiten, reines Node.
 *
 * Aufruf (vom Repo-Root):
 *   node scripts/questions/mega/generate9.mjs
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

function numDistractors(rng, correct, spread) {
  const set = new Set([correct]);
  const out = [];
  let guard = 0;
  while (out.length < 3 && guard < 200) {
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

const LEADS = ["", "Wähle die richtige Antwort. ", "Aufgabe: ", "Teste dein Wissen: ", "Löse: "];

// deutsches Zahlenformat mit Komma
function de(n) {
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(".", ",").replace(/,?0+$/, (m) => (m.includes(",") ? "" : m));
}
function eur(cent) {
  return (cent / 100).toFixed(2).replace(".", ",") + " €";
}

/* ══════════════════ 1) MATHEMATIK Klasse 3–10 ══════════════════ */

const EINKAUF_ITEMS = [
  ["Apfel", 45], ["Brötchen", 35], ["Milch", 89], ["Saft", 129], ["Schokolade", 99],
  ["Heft", 75], ["Stift", 60], ["Radiergummi", 40], ["Banane", 30], ["Joghurt", 55],
  ["Käse", 199], ["Brot", 149], ["Ei", 25], ["Apfelsaft", 119], ["Kekse", 145],
];

function mathematik6Generators(klasse) {
  const gens = [];

  /* ── Sachaufgabe Einkauf: n gleiche Artikel, Rückgeld ── */
  gens.push((r) => {
    const [name, preis] = r.pick(EINKAUF_ITEMS);
    const anzahl = r.int(2, 7);
    const summe = preis * anzahl;
    const bezahlt = (Math.floor(summe / 100) + r.int(1, 5)) * 100; // volle Euro, größer
    const rueck = bezahlt - summe;
    return mc(r, "Sachaufgabe Einkauf",
      `${r.pick(LEADS)}Lisa kauft ${anzahl} ${name} für je ${eur(preis)}. Sie zahlt mit ${eur(bezahlt)}. Wie viel Rückgeld bekommt sie?`,
      eur(rueck),
      [eur(rueck + 100), eur(rueck - 50 > 0 ? rueck - 50 : rueck + 50), eur(bezahlt - summe + 10)],
      `Warenwert: ${anzahl} · ${eur(preis)} = ${eur(summe)}. Rückgeld: ${eur(bezahlt)} − ${eur(summe)} = ${eur(rueck)}.`);
  });

  /* ── Sachaufgabe Einkauf: Gesamtpreis zweier Artikel ── */
  gens.push((r) => {
    let a = r.pick(EINKAUF_ITEMS), b = r.pick(EINKAUF_ITEMS);
    if (a[0] === b[0]) return null;
    const na = r.int(2, 5), nb = r.int(1, 4);
    const summe = a[1] * na + b[1] * nb;
    return mc(r, "Sachaufgabe Einkauf",
      `${r.pick(LEADS)}Tom kauft ${na}× ${a[0]} (je ${eur(a[1])}) und ${nb}× ${b[0]} (je ${eur(b[1])}). Was muss er bezahlen?`,
      eur(summe),
      [eur(summe + a[1]), eur(summe - b[1]), eur(summe + 100)],
      `${na} · ${eur(a[1])} + ${nb} · ${eur(b[1])} = ${eur(a[1] * na)} + ${eur(b[1] * nb)} = ${eur(summe)}.`);
  });

  /* ── Zeit–Distanz: Fahrzeit ── */
  gens.push((r) => {
    const v = r.pick([4, 5, 60, 80, 90, 100, 120]); // km/h (4,5 = zu Fuß)
    const s = v * r.int(2, 6); // exakt teilbar
    const t = s / v;
    return mc(r, "Zeit–Distanz",
      `${r.pick(LEADS)}Ein Fahrzeug fährt mit ${v} km/h. Für ${s} km braucht es wie lange?`,
      `${t} h`,
      [`${t + 1} h`, `${t - 1 > 0 ? t - 1 : t + 2} h`, `${t * 2} h`],
      `t = s : v = ${s} km : ${v} km/h = ${t} h.`);
  });

  /* ── Zeit–Distanz: zurückgelegte Strecke ── */
  gens.push((r) => {
    const v = r.pick([50, 60, 70, 80, 90, 100]);
    const t = r.int(2, 5);
    const s = v * t;
    return mc(r, "Zeit–Distanz",
      `${r.pick(LEADS)}Ein Zug fährt ${t} Stunden lang mit ${v} km/h. Welche Strecke legt er zurück?`,
      `${s} km`,
      [`${s + v} km`, `${s - v} km`, `${v + t} km`],
      `s = v · t = ${v} km/h · ${t} h = ${s} km.`);
  });

  /* ── Zeit–Distanz: Geschwindigkeit ── */
  gens.push((r) => {
    const v = r.pick([40, 50, 60, 75, 80]);
    const t = r.int(2, 6);
    const s = v * t;
    return mc(r, "Zeit–Distanz",
      `${r.pick(LEADS)}Ein Auto legt ${s} km in ${t} Stunden zurück. Wie groß ist die Durchschnittsgeschwindigkeit?`,
      `${v} km/h`,
      [`${v + 10} km/h`, `${v - 10 > 0 ? v - 10 : v + 5} km/h`, `${s - t} km/h`],
      `v = s : t = ${s} km : ${t} h = ${v} km/h.`);
  });

  /* ── Klassenfahrt: Gesamtkosten pro Schüler ── */
  gens.push((r) => {
    const schueler = r.int(18, 30);
    const proTag = r.pick([2500, 3000, 3500, 4000, 4500]); // cent pro Schüler pro Tag
    const tage = r.int(3, 5);
    const proSchueler = proTag * tage;
    return mc(r, "Sachaufgabe Klassenfahrt",
      `${r.pick(LEADS)}Eine Klassenfahrt dauert ${tage} Tage und kostet ${eur(proTag)} pro Schüler und Tag. Was zahlt ein Schüler insgesamt?`,
      eur(proSchueler),
      [eur(proSchueler + proTag), eur(proTag * (tage + 1)), eur(proSchueler - proTag)],
      `${tage} Tage · ${eur(proTag)} = ${eur(proSchueler)} pro Schüler.`);
  });

  /* ── Klassenfahrt: Kosten auf alle verteilen ── */
  gens.push((r) => {
    const schueler = r.pick([20, 24, 25, 28, 30]);
    const proSchueler = r.pick([8000, 9000, 10000, 12000, 15000]);
    const gesamt = schueler * proSchueler;
    return mc(r, "Sachaufgabe Klassenfahrt",
      `${r.pick(LEADS)}${schueler} Schüler nehmen an einer Fahrt teil. Jeder zahlt ${eur(proSchueler)}. Wie hoch sind die Gesamtkosten?`,
      eur(gesamt),
      [eur(gesamt + proSchueler), eur(gesamt - proSchueler), eur((schueler + 1) * proSchueler)],
      `${schueler} · ${eur(proSchueler)} = ${eur(gesamt)}.`);
  });

  /* ── Einheiten-Umrechnung Länge ── */
  gens.push((r) => {
    const table = [
      ["m", "cm", 100], ["km", "m", 1000], ["cm", "mm", 10], ["m", "mm", 1000], ["km", "cm", 100000],
    ];
    const [von, nach, faktor] = r.pick(table);
    const wert = r.int(2, 9);
    const erg = wert * faktor;
    return mc(r, "Einheiten Länge",
      `${r.pick(LEADS)}Rechne um: ${wert} ${von} = ? ${nach}`,
      `${erg} ${nach}`,
      [`${erg * 10} ${nach}`, `${Math.round(erg / 10)} ${nach}`, `${wert} ${nach}`],
      `1 ${von} = ${faktor} ${nach}, also ${wert} ${von} = ${erg} ${nach}.`);
  });

  /* ── Einheiten-Umrechnung Gewicht ── */
  gens.push((r) => {
    const table = [["kg", "g", 1000], ["t", "kg", 1000], ["g", "mg", 1000]];
    const [von, nach, faktor] = r.pick(table);
    const wert = r.int(2, 9);
    const erg = wert * faktor;
    return mc(r, "Einheiten Gewicht",
      `${r.pick(LEADS)}Rechne um: ${wert} ${von} = ? ${nach}`,
      `${erg} ${nach}`,
      [`${erg * 10} ${nach}`, `${Math.round(erg / 10)} ${nach}`, `${wert * 100} ${nach}`],
      `1 ${von} = ${faktor} ${nach}, also ${wert} ${von} = ${erg} ${nach}.`);
  });

  /* ── Einheiten-Umrechnung Zeit ── */
  gens.push((r) => {
    const table = [["h", "min", 60], ["min", "s", 60], ["Tag", "h", 24], ["h", "s", 3600]];
    const [von, nach, faktor] = r.pick(table);
    const wert = r.int(2, 8);
    const erg = wert * faktor;
    return mc(r, "Einheiten Zeit",
      `${r.pick(LEADS)}Rechne um: ${wert} ${von} = ? ${nach}`,
      `${erg} ${nach}`,
      [`${erg + faktor} ${nach}`, `${erg - faktor} ${nach}`, `${wert + faktor} ${nach}`],
      `1 ${von} = ${faktor} ${nach}, also ${wert} · ${faktor} = ${erg} ${nach}.`);
  });

  /* ── Einheiten-Umrechnung gemischt (Volumen) ── */
  gens.push((r) => {
    const table = [["l", "ml", 1000], ["l", "cl", 100], ["hl", "l", 100]];
    const [von, nach, faktor] = r.pick(table);
    const wert = r.int(2, 9);
    const erg = wert * faktor;
    return mc(r, "Einheiten Volumen",
      `${r.pick(LEADS)}Rechne um: ${wert} ${von} = ? ${nach}`,
      `${erg} ${nach}`,
      [`${erg * 10} ${nach}`, `${Math.round(erg / 10)} ${nach}`, `${wert} ${nach}`],
      `1 ${von} = ${faktor} ${nach}, also ${wert} ${von} = ${erg} ${nach}.`);
  });

  /* Klasse 7+: Prozent & Zins */
  if (klasse >= 7) {
    /* ── Prozentwert ── */
    gens.push((r) => {
      const p = r.pick([5, 10, 15, 20, 25, 40, 50, 75]);
      const G = r.int(2, 40) * 10;
      const W = (G * p) / 100;
      if (!Number.isInteger(W)) return null;
      return mc(r, "Prozentrechnung",
        `${r.pick(LEADS)}Berechne ${p} % von ${G}.`,
        de(W),
        [de(W + p), de(W - (p > 5 ? 5 : 1)), de(G - W)],
        `${p} % von ${G} = ${G} · ${p}/100 = ${de(W)}.`);
    });

    /* ── Prozentsatz ── */
    gens.push((r) => {
      const G = r.pick([50, 100, 200, 400, 500, 800]);
      const p = r.pick([10, 20, 25, 50, 75]);
      const W = (G * p) / 100;
      return mc(r, "Prozentrechnung",
        `${r.pick(LEADS)}Wie viel Prozent sind ${de(W)} von ${G}?`,
        `${p} %`,
        [`${p + 10} %`, `${p - 5} %`, `${Math.round(W)} %`],
        `p = W/G · 100 % = ${de(W)}/${G} · 100 % = ${p} %.`);
    });

    /* ── Rabatt (Prozent-Vertiefung) ── */
    gens.push((r) => {
      const preis = r.int(20, 200) * 100; // cent
      const p = r.pick([10, 15, 20, 25, 30, 50]);
      const rabatt = (preis * p) / 100;
      if (!Number.isInteger(rabatt)) return null;
      const neu = preis - rabatt;
      return mc(r, "Prozent Rabatt",
        `${r.pick(LEADS)}Eine Ware kostet ${eur(preis)}. Sie wird um ${p} % reduziert. Was ist der neue Preis?`,
        eur(neu),
        [eur(neu - rabatt > 0 ? neu - rabatt : neu + rabatt), eur(preis + rabatt), eur(rabatt)],
        `Rabatt: ${p} % von ${eur(preis)} = ${eur(rabatt)}. Neuer Preis: ${eur(preis)} − ${eur(rabatt)} = ${eur(neu)}.`);
    });

    /* ── einfache Zinsen (1 Jahr) ── */
    gens.push((r) => {
      const K = r.int(5, 40) * 100; // €
      const p = r.pick([1, 2, 2.5, 3, 4, 5]);
      const Z = (K * p) / 100;
      if (!Number.isInteger(Z * 100)) return null;
      return mc(r, "Zinsrechnung",
        `${r.pick(LEADS)}Ein Kapital von ${K} € wird mit ${de(p)} % pro Jahr verzinst. Wie viel Zinsen fallen in einem Jahr an?`,
        de(Z) + " €",
        [de(Z + K / 100) + " €", de(Z / 2) + " €", de(K + Z) + " €"],
        `Z = K · p/100 = ${K} · ${de(p)}/100 = ${de(Z)} €.`);
    });

    /* ── Zinseszins 2 Jahre (exakt) ── */
    gens.push((r) => {
      const K = r.pick([1000, 2000, 5000, 10000]);
      const p = r.pick([2, 3, 4, 5]);
      const jahre = r.int(1, 2);
      const end = Math.round(K * Math.pow(1 + p / 100, jahre) * 100) / 100;
      return mc(r, "Zinseszins",
        `${r.pick(LEADS)}${K} € werden mit ${p} % pro Jahr angelegt (Zinseszins). Wie hoch ist das Kapital nach ${jahre} ${jahre === 1 ? "Jahr" : "Jahren"}?`,
        de(end) + " €",
        [de(K + (K * p) / 100 * jahre) + " €", de(Math.round(K * (1 + (p + 1) / 100) ** jahre * 100) / 100) + " €", de(K) + " €"],
        `K_n = K · (1 + p/100)^n = ${K} · ${de(1 + p / 100)}^${jahre} = ${de(end)} €.`);
    });
  }

  /* Klasse 6+: Maßstab */
  if (klasse >= 6) {
    /* ── Maßstab: Karte → Wirklichkeit ── */
    gens.push((r) => {
      const m = r.pick([1000, 10000, 25000, 50000, 100000]);
      const cm = r.int(2, 12);
      const realCm = cm * m;
      const realM = realCm / 100;
      return mc(r, "Maßstab",
        `${r.pick(LEADS)}Auf einer Karte im Maßstab 1 : ${de(m)} sind ${cm} cm gemessen. Welcher wirklichen Länge entspricht das?`,
        de(realM) + " m",
        [de(realM * 10) + " m", de(realM / 10) + " m", de(realCm) + " m"],
        `${cm} cm · ${de(m)} = ${de(realCm)} cm = ${de(realM)} m.`);
    });

    /* ── Maßstab: Wirklichkeit → Karte ── */
    gens.push((r) => {
      const m = r.pick([100, 200, 500, 1000, 2000]);
      const realM = r.int(1, 20) * m / 100; // sorgt für glatte cm
      const realCm = realM * 100;
      const kartenCm = realCm / m;
      if (!Number.isInteger(kartenCm)) return null;
      return mc(r, "Maßstab",
        `${r.pick(LEADS)}Ein Gebäude ist ${de(realM)} m lang. Wie lang ist es auf einem Plan im Maßstab 1 : ${m}?`,
        de(kartenCm) + " cm",
        [de(kartenCm * 10) + " cm", de(kartenCm + 5) + " cm", de(realM) + " cm"],
        `${de(realM)} m = ${de(realCm)} cm; ${de(realCm)} cm : ${m} = ${de(kartenCm)} cm.`);
    });
  }

  /* Grundlagen für kleine Klassen (3–6): Grundrechenarten in Sachkontext */
  gens.push((r) => {
    const a = klasse <= 4 ? r.int(3, 30) : r.int(20, 300);
    const b = klasse <= 4 ? r.int(2, 9) : r.int(3, 40);
    const s = a + b;
    return mc(r, "Grundrechnen",
      `${r.pick(LEADS)}In einem Bus sitzen ${a} Personen, ${b} steigen zu. Wie viele sind es dann?`,
      String(s), numDistractors(r, s, 6).map(String),
      `${a} + ${b} = ${s}.`);
  });
  gens.push((r) => {
    const b = klasse <= 4 ? r.int(2, 12) : r.int(3, 25);
    const q = klasse <= 4 ? r.int(2, 9) : r.int(4, 20);
    const p = b * q;
    return mc(r, "Grundrechnen",
      `${r.pick(LEADS)}In einer Schachtel sind ${b} Stifte. Wie viele Stifte sind in ${q} Schachteln?`,
      String(p), numDistractors(r, p, 10).map(String),
      `${b} · ${q} = ${p}.`);
  });
  gens.push((r) => {
    const q = klasse <= 4 ? r.int(2, 9) : r.int(3, 20);
    const teiler = r.int(2, 9);
    const dividend = q * teiler;
    return mc(r, "Grundrechnen",
      `${r.pick(LEADS)}${dividend} Äpfel werden gleichmäßig auf ${teiler} Kisten verteilt. Wie viele Äpfel sind in jeder Kiste?`,
      String(q), numDistractors(r, q, 4).map(String),
      `${dividend} : ${teiler} = ${q}.`);
  });

  return gens;
}

/* ══════════════════ 2) BIOLOGIE Klasse 5–10 ══════════════════ */

// [Frage, richtige Antwort, [Distraktoren], Erklärung]
const BIO_HERZ_KREISLAUF = [
  ["Wie viele Herzkammern hat das menschliche Herz?", "vier (2 Vorhöfe, 2 Kammern)", ["zwei", "drei", "sechs"], "Das Herz hat 2 Vorhöfe und 2 Kammern, also vier Räume."],
  ["Welches Blutgefäß transportiert Blut vom Herzen weg?", "Arterie", ["Vene", "Kapillare", "Lymphgefäß"], "Arterien führen Blut vom Herzen weg, Venen zum Herzen hin."],
  ["Welches Blutgefäß transportiert Blut zum Herzen zurück?", "Vene", ["Arterie", "Aorta", "Herzklappe"], "Venen transportieren Blut zurück zum Herzen."],
  ["Wie heißt die größte Arterie des Körpers?", "Aorta", ["Hohlvene", "Lungenvene", "Pfortader"], "Die Aorta ist die Hauptschlagader, sie verlässt die linke Herzkammer."],
  ["Welche Aufgabe haben die roten Blutkörperchen?", "Sauerstoff transportieren", ["Krankheitserreger abwehren", "Blut gerinnen lassen", "Nährstoffe verdauen"], "Rote Blutkörperchen (Erythrozyten) transportieren mit Hämoglobin den Sauerstoff."],
  ["Welche Aufgabe haben die weißen Blutkörperchen?", "Krankheitserreger abwehren", ["Sauerstoff transportieren", "Zucker speichern", "Knochen bilden"], "Weiße Blutkörperchen (Leukozyten) gehören zur Immunabwehr."],
  ["Was verhindert, dass Blut im Herzen zurückfließt?", "die Herzklappen", ["die Kapillaren", "die Lymphknoten", "die Bronchien"], "Herzklappen wirken wie Ventile und verhindern den Rückfluss."],
  ["Welche Herzkammer pumpt das Blut in den Körperkreislauf?", "die linke Herzkammer", ["die rechte Herzkammer", "der rechte Vorhof", "der linke Vorhof"], "Die linke Kammer pumpt sauerstoffreiches Blut in den Körperkreislauf."],
  ["Wo wird das Blut mit Sauerstoff beladen?", "in der Lunge", ["im Herzen", "in der Leber", "im Magen"], "In den Lungenbläschen nimmt das Blut Sauerstoff auf."],
  ["Welche Blutkörperchen sind für die Blutgerinnung wichtig?", "Blutplättchen (Thrombozyten)", ["rote Blutkörperchen", "Nervenzellen", "Muskelzellen"], "Thrombozyten verschließen Wunden durch Gerinnung."],
];

const BIO_ATMUNG = [
  ["Welches Gas nimmt der Körper beim Einatmen auf?", "Sauerstoff", ["Kohlenstoffdioxid", "Stickstoff", "Wasserstoff"], "Beim Einatmen wird Sauerstoff aufgenommen."],
  ["Welches Gas gibt der Körper beim Ausatmen vermehrt ab?", "Kohlenstoffdioxid", ["Sauerstoff", "Helium", "Stickstoff"], "Beim Ausatmen wird vermehrt Kohlenstoffdioxid abgegeben."],
  ["Wo findet der Gasaustausch in der Lunge statt?", "in den Lungenbläschen (Alveolen)", ["in der Luftröhre", "im Kehlkopf", "in den Bronchien"], "Der Gasaustausch erfolgt an den dünnwandigen Lungenbläschen."],
  ["Welcher Muskel ist das wichtigste Atemmuskel?", "das Zwerchfell", ["das Herz", "der Bizeps", "die Zunge"], "Das Zwerchfell senkt und hebt sich beim Atmen."],
  ["Wie heißen die feinen Verästelungen der Luftröhre in der Lunge?", "Bronchien", ["Adern", "Nerven", "Nieren"], "Die Luftröhre teilt sich in die Bronchien."],
  ["In welcher Reihenfolge strömt Luft in die Lunge?", "Nase → Luftröhre → Bronchien → Lungenbläschen", ["Nase → Speiseröhre → Magen", "Mund → Herz → Lunge", "Luftröhre → Nase → Bronchien"], "Der Atemweg führt über Nase/Rachen, Luftröhre, Bronchien zu den Alveolen."],
];

const BIO_PFLANZEN = [
  ["Welches Pflanzenorgan nimmt Wasser aus dem Boden auf?", "die Wurzel", ["das Blatt", "die Blüte", "die Frucht"], "Die Wurzel nimmt Wasser und Nährsalze auf."],
  ["In welchem Pflanzenorgan findet vor allem die Fotosynthese statt?", "im Blatt", ["in der Wurzel", "in der Blüte", "im Samen"], "Die Blätter enthalten das Chlorophyll für die Fotosynthese."],
  ["Welcher Farbstoff macht Blätter grün?", "Chlorophyll", ["Hämoglobin", "Melanin", "Karotin"], "Chlorophyll ist der grüne Blattfarbstoff."],
  ["Was stellt eine Pflanze bei der Fotosynthese her?", "Traubenzucker (Glucose) und Sauerstoff", ["nur Wasser", "Kohlenstoffdioxid", "Salz"], "Aus CO₂ und Wasser entstehen mit Lichtenergie Glucose und Sauerstoff."],
  ["Welche Aufgabe hat die Blüte einer Pflanze?", "der Fortpflanzung dienen", ["Wasser aufnehmen", "die Pflanze stützen", "Sauerstoff atmen"], "Blüten dienen der Fortpflanzung (Bestäubung)."],
  ["Was versteht man unter Bestäubung?", "die Übertragung von Pollen auf die Narbe", ["das Wachsen der Wurzel", "das Welken der Blätter", "die Aufnahme von Wasser"], "Bei der Bestäubung gelangt Pollen auf die Narbe der Blüte."],
  ["Welche Tiere sind wichtige Bestäuber?", "Bienen und Hummeln", ["Regenwürmer", "Spinnen", "Fische"], "Insekten wie Bienen übertragen beim Blütenbesuch den Pollen."],
  ["Welchen Stoff braucht die Pflanze neben Wasser und Licht für die Fotosynthese?", "Kohlenstoffdioxid", ["Sauerstoff", "Stickstoff", "Salz"], "CO₂ aus der Luft wird bei der Fotosynthese eingebaut."],
  ["Wo werden die Pollen einer Blüte gebildet?", "in den Staubblättern", ["in der Wurzel", "im Stängel", "in der Narbe"], "Die Staubblätter (Staubbeutel) bilden den Pollen."],
  ["Welcher Teil der Blüte ist weiblich?", "der Stempel (mit Narbe und Fruchtknoten)", ["das Staubblatt", "das Kronblatt", "der Stängel"], "Der Stempel mit Fruchtknoten ist das weibliche Blütenorgan."],
];

// Tiere → Wirbeltierklasse (kombinatorisch)
const TIERE_KLASSEN = [
  ["Hund", "Säugetier"], ["Katze", "Säugetier"], ["Fledermaus", "Säugetier"], ["Wal", "Säugetier"],
  ["Delfin", "Säugetier"], ["Igel", "Säugetier"], ["Pferd", "Säugetier"], ["Maus", "Säugetier"],
  ["Adler", "Vogel"], ["Amsel", "Vogel"], ["Pinguin", "Vogel"], ["Storch", "Vogel"],
  ["Eule", "Vogel"], ["Huhn", "Vogel"],
  ["Frosch", "Amphibie"], ["Kröte", "Amphibie"], ["Molch", "Amphibie"], ["Salamander", "Amphibie"],
  ["Eidechse", "Reptil"], ["Schlange", "Reptil"], ["Krokodil", "Reptil"], ["Schildkröte", "Reptil"],
  ["Hai", "Fisch"], ["Forelle", "Fisch"], ["Karpfen", "Fisch"], ["Hering", "Fisch"],
];
const KLASSEN_ALLE = ["Säugetier", "Vogel", "Amphibie", "Reptil", "Fisch"];
const KLASSEN_PLURAL = { "Säugetier": "Säugetieren", "Vogel": "Vögeln", "Amphibie": "Amphibien", "Reptil": "Reptilien", "Fisch": "Fischen" };

const BIO_MERKMALE = [
  ["Wodurch atmen Fische?", "durch Kiemen", ["durch Lungen", "durch die Haut allein", "durch Federn"], "Fische atmen mit Kiemen den im Wasser gelösten Sauerstoff."],
  ["Wie vermehren sich die meisten Säugetiere?", "sie gebären lebende Junge", ["sie legen Eier mit harter Schale", "sie teilen sich", "sie bilden Sporen"], "Säugetiere sind (bis auf wenige Ausnahmen) lebendgebärend und säugen ihre Jungen."],
  ["Womit ist der Körper von Vögeln bedeckt?", "mit Federn", ["mit Schuppen", "mit Fell", "mit Schleim"], "Vögel besitzen als einzige Wirbeltiere Federn."],
  ["Womit ist der Körper von Reptilien bedeckt?", "mit trockenen Hornschuppen", ["mit Federn", "mit Fell", "mit feuchter Schleimhaut"], "Reptilien haben eine schuppige, trockene Haut."],
  ["Was ist typisch für Amphibien?", "sie leben im Wasser und an Land", ["sie leben nur im Meer", "sie haben Federn", "sie sind gleichwarm"], "Amphibien (z. B. Frösche) durchlaufen eine Entwicklung im Wasser und leben später auch an Land."],
  ["Welche Wirbeltiere sind gleichwarm (halten ihre Körpertemperatur konstant)?", "Säugetiere und Vögel", ["Fische und Amphibien", "nur Reptilien", "alle Wirbeltiere"], "Säugetiere und Vögel sind gleichwarm (endotherm)."],
  ["Wie atmen erwachsene Amphibien hauptsächlich?", "über Lunge und Haut", ["nur über Kiemen", "über Federn", "gar nicht"], "Erwachsene Amphibien atmen über Lunge und die feuchte Haut."],
];

const BIO_ERNAEHRUNG = [
  ["In welchem Organ beginnt die Verdauung von Stärke?", "im Mund (Speichel)", ["im Magen", "im Dickdarm", "in der Leber"], "Das Enzym im Speichel (Amylase) spaltet Stärke schon im Mund."],
  ["Wo werden die meisten Nährstoffe ins Blut aufgenommen?", "im Dünndarm", ["im Magen", "im Mund", "im Dickdarm"], "Die Nährstoffaufnahme (Resorption) erfolgt vor allem im Dünndarm."],
  ["Welche Nährstoffgruppe liefert am schnellsten Energie?", "Kohlenhydrate", ["Vitamine", "Wasser", "Mineralstoffe"], "Kohlenhydrate (z. B. Zucker, Stärke) sind schnelle Energielieferanten."],
  ["Welcher Nährstoff ist wichtig für den Aufbau von Muskeln und Zellen?", "Eiweiß (Proteine)", ["Fett", "Zucker", "Wasser"], "Proteine sind Bausteine für Muskeln, Zellen und Enzyme."],
  ["Welches Verdauungsorgan produziert Gallenflüssigkeit?", "die Leber", ["der Magen", "die Milz", "die Lunge"], "Die Leber bildet Galle, die bei der Fettverdauung hilft."],
  ["Welche Aufgabe hat der Magen?", "Nahrung mit Magensäure zersetzen", ["Sauerstoff aufnehmen", "Blut filtern", "Harn bilden"], "Der Magen zersetzt die Nahrung mit Magensäure und Enzymen."],
  ["Was entzieht der Dickdarm dem Nahrungsbrei vor allem?", "Wasser", ["Sauerstoff", "Eiweiß", "Vitamine"], "Im Dickdarm wird dem Nahrungsbrei Wasser entzogen."],
  ["Welcher Stoff hilft bei der Fettverdauung?", "die Galle", ["der Speichel", "die Magensäure", "das Insulin"], "Die Galle emulgiert Fette und erleichtert ihre Verdauung."],
];

const BIO_IMMUN = [
  ["Was ist ein Antigen?", "ein körperfremdes Merkmal, das eine Immunantwort auslöst", ["ein körpereigenes Zuckermolekül", "ein Vitamin", "ein Verdauungsenzym"], "Antigene sind meist Oberflächenstrukturen von Erregern, die erkannt werden."],
  ["Welche Zellen bilden Antikörper?", "B-Lymphozyten (Plasmazellen)", ["rote Blutkörperchen", "Nervenzellen", "Muskelzellen"], "Aktivierte B-Lymphozyten reifen zu Plasmazellen, die Antikörper produzieren."],
  ["Was bewirkt eine aktive Impfung?", "der Körper bildet selbst Antikörper und Gedächtniszellen", ["fertige Antikörper werden gespritzt", "der Erreger wird sofort abgetötet ohne Reaktion", "die Verdauung wird angeregt"], "Bei aktiver Immunisierung reagiert das Immunsystem selbst und bildet ein Gedächtnis."],
  ["Was ist der Unterschied bei der passiven Immunisierung?", "es werden fertige Antikörper übertragen", ["der Körper bildet Gedächtniszellen", "es wird ein abgeschwächter Erreger gegeben", "es wirkt lebenslang"], "Bei passiver Immunisierung erhält man fertige Antikörper – schnell, aber kurz wirksam."],
  ["Welche Zellen erkennen und zerstören infizierte Körperzellen?", "T-Killerzellen (zytotoxische T-Zellen)", ["Blutplättchen", "rote Blutkörperchen", "Leberzellen"], "Zytotoxische T-Zellen töten virusinfizierte Zellen ab."],
  ["Was versteht man unter der unspezifischen Abwehr?", "eine sofortige Abwehr gegen viele Erreger ohne Spezialisierung", ["die gezielte Antikörperbildung gegen einen Erreger", "die Bildung von Gedächtniszellen", "die Blutgerinnung"], "Die angeborene (unspezifische) Abwehr wirkt schnell und breit, z. B. durch Fresszellen."],
  ["Wie heißen die Fresszellen des Immunsystems?", "Makrophagen (Phagozyten)", ["Erythrozyten", "Thrombozyten", "Neuronen"], "Makrophagen nehmen Erreger auf und verdauen sie (Phagozytose)."],
  ["Was sind Antibiotika wirksam gegen?", "Bakterien", ["Viren", "Pilzsporen ausschließlich", "körpereigene Zellen"], "Antibiotika wirken gegen Bakterien, nicht gegen Viren."],
];

function biologie2Generators(klasse) {
  const gens = [];
  const factGen = (topic, bank) => (r) => {
    const [q, a, d, e] = r.pick(bank);
    return mc(r, topic, `${r.pick(LEADS)}${q}`, a, r.shuffle(d.slice()), e);
  };

  gens.push(factGen("Herz & Kreislauf", BIO_HERZ_KREISLAUF));
  gens.push(factGen("Atmung", BIO_ATMUNG));
  gens.push(factGen("Pflanzen", BIO_PFLANZEN));
  gens.push(factGen("Tiermerkmale", BIO_MERKMALE));
  gens.push(factGen("Ernährung & Verdauung", BIO_ERNAEHRUNG));

  // Wirbeltier-Klassen zuordnen (kombinatorisch)
  gens.push((r) => {
    const [tier, klasseT] = r.pick(TIERE_KLASSEN);
    const distr = KLASSEN_ALLE.filter((k) => k !== klasseT);
    return mc(r, "Wirbeltierklassen",
      `${r.pick(LEADS)}Zu welcher Wirbeltierklasse gehört das Tier: ${tier}?`,
      klasseT, r.shuffle(distr), `${tier} gehört zu den ${KLASSEN_PLURAL[klasseT]}.`);
  });

  // "Welches Tier ist ein ..." (kombinatorisch, andere Frageform)
  gens.push((r) => {
    const zielKlasse = r.pick(KLASSEN_ALLE);
    const richtige = TIERE_KLASSEN.filter((t) => t[1] === zielKlasse);
    const falsche = TIERE_KLASSEN.filter((t) => t[1] !== zielKlasse);
    const korrekt = r.pick(richtige)[0];
    const dist = r.shuffle(falsche).slice(0, 3).map((t) => t[0]);
    return mc(r, "Wirbeltierklassen",
      `${r.pick(LEADS)}Welches dieser Tiere ist ein ${zielKlasse}?`,
      korrekt, dist, `${korrekt} gehört zur Klasse der ${KLASSEN_PLURAL[zielKlasse]}.`);
  });

  if (klasse >= 9) {
    gens.push(factGen("Immunsystem", BIO_IMMUN));
    gens.push(factGen("Immunsystem", BIO_IMMUN)); // stärker gewichten in Oberstufe
  }

  return gens;
}

/* ══════════════════ 3) CHEMIE Klasse 7–8 ══════════════════ */

const CHEM_STOFFEIGENSCHAFTEN = [
  ["Was gibt die Dichte eines Stoffes an?", "Masse pro Volumen", ["Temperatur pro Zeit", "Kraft pro Fläche", "Länge pro Zeit"], "Die Dichte ρ = Masse / Volumen ist eine Stoffeigenschaft."],
  ["Bei welcher Temperatur schmilzt Eis (reines Wasser)?", "0 °C", ["100 °C", "−10 °C", "50 °C"], "Der Schmelzpunkt von Wasser liegt bei 0 °C."],
  ["Bei welcher Temperatur siedet reines Wasser (Normaldruck)?", "100 °C", ["0 °C", "50 °C", "200 °C"], "Der Siedepunkt von Wasser liegt bei 100 °C (bei Normaldruck)."],
  ["Welche Eigenschaft haben Metalle typischerweise?", "sie leiten elektrischen Strom", ["sie sind meist durchsichtig", "sie sind immer flüssig", "sie leiten nie Wärme"], "Metalle sind elektrisch leitfähig, glänzend und verformbar."],
  ["Was bedeutet 'löslich'?", "ein Stoff kann sich in einem anderen (z. B. Wasser) auflösen", ["ein Stoff brennt leicht", "ein Stoff ist magnetisch", "ein Stoff ist sehr hart"], "Löslichkeit gibt an, wie gut sich ein Stoff in einem Lösungsmittel löst."],
  ["Welcher Stoff ist magnetisch?", "Eisen", ["Kupfer", "Gold", "Glas"], "Eisen (sowie Nickel und Cobalt) ist ferromagnetisch."],
  ["Was ist eine Stoffeigenschaft?", "eine messbare oder beobachtbare Eigenschaft wie Dichte oder Schmelzpunkt", ["die Form eines Gefäßes", "die Menge eines Stoffes", "der Ort des Stoffes"], "Stoffeigenschaften (Dichte, Farbe, Schmelzpunkt …) sind unabhängig von der Menge."],
];

const CHEM_TRENNVERFAHREN = [
  ["Womit trennt man ein Gemisch aus Sand und Wasser?", "Filtrieren", ["Destillieren", "Magnetscheiden", "Eindampfen"], "Beim Filtrieren bleibt der Sand im Filter zurück."],
  ["Wie trennt man Salz aus Salzwasser (Salz zurückgewinnen)?", "Eindampfen", ["Filtrieren", "Sieben", "Magnetscheiden"], "Beim Eindampfen verdunstet das Wasser, das Salz bleibt zurück."],
  ["Wie trennt man Eisenspäne von Sand?", "mit einem Magneten (Magnetscheiden)", ["Filtrieren", "Destillieren", "Eindampfen"], "Eisen ist magnetisch und lässt sich mit einem Magneten abtrennen."],
  ["Mit welchem Verfahren trennt man zwei Flüssigkeiten mit verschiedenen Siedepunkten?", "Destillieren", ["Filtrieren", "Sieben", "Magnetscheiden"], "Bei der Destillation verdampft die Flüssigkeit mit dem niedrigeren Siedepunkt zuerst."],
  ["Wie trennt man ein Gemisch aus großen und kleinen Körnern (z. B. Kies und Sand)?", "Sieben", ["Destillieren", "Eindampfen", "Magnetscheiden"], "Beim Sieben werden Teilchen nach ihrer Größe getrennt."],
  ["Welche Eigenschaft nutzt die Destillation aus?", "unterschiedliche Siedetemperaturen", ["unterschiedliche Farben", "unterschiedliche Magnetisierbarkeit", "unterschiedliche Korngröße"], "Die Destillation trennt nach unterschiedlichen Siedepunkten."],
  ["Was nutzt das Filtrieren aus?", "unterschiedliche Teilchengröße (fest/gelöst)", ["den Siedepunkt", "die Farbe", "den Magnetismus"], "Der Filter hält Feststoffe zurück, Gelöstes/Flüssiges läuft durch."],
];

const CHEM_AGGREGAT = [
  ["Wie heißt der Übergang von fest zu flüssig?", "Schmelzen", ["Erstarren", "Sieden", "Kondensieren"], "Von fest nach flüssig heißt Schmelzen."],
  ["Wie heißt der Übergang von flüssig zu fest?", "Erstarren (Gefrieren)", ["Schmelzen", "Verdampfen", "Sublimieren"], "Von flüssig nach fest heißt Erstarren."],
  ["Wie heißt der Übergang von flüssig zu gasförmig?", "Verdampfen (Sieden)", ["Kondensieren", "Erstarren", "Schmelzen"], "Von flüssig nach gasförmig heißt Verdampfen."],
  ["Wie heißt der Übergang von gasförmig zu flüssig?", "Kondensieren", ["Verdampfen", "Schmelzen", "Sublimieren"], "Von gasförmig nach flüssig heißt Kondensieren."],
  ["Wie heißt der direkte Übergang von fest zu gasförmig?", "Sublimieren", ["Schmelzen", "Kondensieren", "Erstarren"], "Der direkte Übergang fest→gasförmig heißt Sublimieren."],
  ["In welchem Aggregatzustand haben Teilchen die geringste Beweglichkeit?", "fest", ["flüssig", "gasförmig", "in allen gleich"], "Im festen Zustand sitzen die Teilchen fest an ihren Plätzen (schwingen nur)."],
  ["In welchem Aggregatzustand füllen Teilchen den ganzen Raum aus?", "gasförmig", ["fest", "flüssig", "in keinem"], "Gase verteilen sich frei und füllen den gesamten verfügbaren Raum."],
  ["Was passiert mit den Teilchen beim Erwärmen?", "sie bewegen sich schneller", ["sie bewegen sich langsamer", "sie verschwinden", "sie werden schwerer"], "Höhere Temperatur bedeutet stärkere Teilchenbewegung."],
];

const CHEM_LABOR = [
  ["Wozu dient ein Bunsenbrenner?", "zum Erhitzen von Stoffen", ["zum Wiegen", "zum Filtrieren", "zum Messen von Volumen"], "Der Bunsenbrenner erzeugt eine heiße Flamme zum Erhitzen."],
  ["Womit misst man im Labor genaue Flüssigkeitsvolumina?", "mit einem Messzylinder", ["mit einer Waage", "mit einem Thermometer", "mit einem Magneten"], "Der Messzylinder dient zur Volumenmessung."],
  ["Was muss man beim Experimentieren zum Schutz der Augen tragen?", "eine Schutzbrille", ["Handschuhe genügen", "einen Hut", "nichts"], "Eine Schutzbrille schützt die Augen vor Spritzern."],
  ["Wie erhitzt man eine Flüssigkeit im Reagenzglas richtig?", "die Öffnung von Personen wegdrehen und schwenken", ["die Öffnung auf sich richten", "das Glas verschließen", "nur den oberen Rand erhitzen"], "Die Öffnung zeigt von Personen weg, damit niemand von Spritzern getroffen wird."],
  ["Was bedeutet ein Gefahrstoff-Piktogramm mit einer Flamme?", "entzündbar (brennbar)", ["ätzend", "giftig", "umweltgefährlich"], "Das Flammen-Symbol steht für entzündbare Stoffe."],
  ["Was bedeutet das Piktogramm mit einem Totenkopf?", "giftig", ["entzündbar", "ätzend", "harmlos"], "Der Totenkopf kennzeichnet giftige Stoffe."],
  ["Wie riecht man an einer Chemikalie richtig?", "vorsichtig mit der Hand Luft zufächeln", ["direkt tief einatmen", "das Gefäß an die Nase halten", "gar nicht möglich"], "Man fächelt sich vorsichtig etwas Dampf zu (nie direkt einatmen)."],
  ["Wozu dient ein Trichter mit Filterpapier?", "zum Filtrieren", ["zum Wiegen", "zum Erhitzen", "zur Temperaturmessung"], "Trichter und Filterpapier dienen dem Filtrieren."],
];

const CHEM_SYMBOLE = [
  ["Wasserstoff", "H"], ["Sauerstoff", "O"], ["Kohlenstoff", "C"], ["Stickstoff", "N"],
  ["Eisen", "Fe"], ["Kupfer", "Cu"], ["Gold", "Au"], ["Silber", "Ag"], ["Natrium", "Na"],
  ["Kalium", "K"], ["Calcium", "Ca"], ["Chlor", "Cl"], ["Schwefel", "S"], ["Helium", "He"],
  ["Aluminium", "Al"], ["Zink", "Zn"], ["Blei", "Pb"], ["Magnesium", "Mg"],
];

function chemie3Generators(klasse) {
  const gens = [];
  const factGen = (topic, bank) => (r) => {
    const [q, a, d, e] = r.pick(bank);
    return mc(r, topic, `${r.pick(LEADS)}${q}`, a, r.shuffle(d.slice()), e);
  };

  gens.push(factGen("Stoffeigenschaften", CHEM_STOFFEIGENSCHAFTEN));
  gens.push(factGen("Trennverfahren", CHEM_TRENNVERFAHREN));
  gens.push(factGen("Aggregatzustände", CHEM_AGGREGAT));
  gens.push(factGen("Labor & Sicherheit", CHEM_LABOR));

  // Element → Symbol (kombinatorisch)
  gens.push((r) => {
    const [name, sym] = r.pick(CHEM_SYMBOLE);
    const dist = r.shuffle(CHEM_SYMBOLE.filter((e) => e[1] !== sym)).slice(0, 3).map((e) => e[1]);
    return mc(r, "Elementsymbole",
      `${r.pick(LEADS)}Wie lautet das chemische Symbol für ${name}?`,
      sym, dist, `Das Symbol für ${name} ist ${sym}.`);
  });

  // Symbol → Element (andere Richtung)
  gens.push((r) => {
    const [name, sym] = r.pick(CHEM_SYMBOLE);
    const dist = r.shuffle(CHEM_SYMBOLE.filter((e) => e[0] !== name)).slice(0, 3).map((e) => e[0]);
    return mc(r, "Elementsymbole",
      `${r.pick(LEADS)}Für welches Element steht das Symbol ${sym}?`,
      name, dist, `Das Symbol ${sym} steht für ${name}.`);
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

  console.log("Mathematik-Vertiefung (Klasse 3–10, je >= 450):");
  for (let k = 3; k <= 10; k++)
    total += writeBank("mathematik6", k, generateBank(91000 + k, 450, mathematik6Generators(k)), 450);

  console.log("Biologie-Vertiefung (Klasse 5–10, je >= 350):");
  for (let k = 5; k <= 10; k++)
    total += writeBank("biologie2", k, generateBank(92000 + k, 350, biologie2Generators(k)), 350);

  console.log("Chemie-Vertiefung (Klasse 7–8, je >= 300):");
  for (let k = 7; k <= 8; k++)
    total += writeBank("chemie3", k, generateBank(93000 + k, 300, chemie3Generators(k)), 300);

  console.log(`\nGesamt (Runde 9): ${total} Fragen.`);
}

main();
