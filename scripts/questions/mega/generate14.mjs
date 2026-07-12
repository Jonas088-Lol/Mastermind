/* Copyright 2026 Elian Schock, Jonas Schwenk */
/**
 * MEGA-Fragen-Generator RUNDE 14 für MasterMind.
 *
 * Ergänzt die Fragenbank aus generate.mjs … generate11.mjs im GLEICHEN Format
 *   scripts/questions/mega/data/<fach>-klasse<k>.json
 * mit [{ topic, question, options[4], correct(Index), explanation }].
 *
 * Fächer/Umfang (nur NEUE Dateien mit Präfix informatik4-/wirtschaft2-/
 * franzoesisch3-/geschichte3-):
 *   1) informatik4   Klasse 5–6, >= 300/Klasse
 *      (Computer-Grundlagen: Hardware benennen, Eingabe/Ausgabe zuordnen;
 *       Internet-Sicherheit für Kinder: Passwörter, persönliche Daten,
 *       eindeutige Szenarien; Dateitypen zuordnen; Tastatur-Kürzel)
 *   2) wirtschaft2   Klasse 9–13, >= 300/Klasse
 *      (Angebot & Nachfrage, Vertragsarten, Sozialversicherungen,
 *       Brutto/Netto vereinfacht berechnet, Inflation-Basics berechnet,
 *       Unternehmensformen)
 *   3) franzoesisch3 Klasse 11–13, >= 300/Klasse
 *      (Oberstufen-Vokabular >= 120 Paare/Klasse: Gesellschaft, Umwelt,
 *       Politik; subjonctif-Auslöser; Konnektoren; futur simple/
 *       conditionnel-Formen — regelbasiert gebildet)
 *   4) geschichte3   Klasse 5, >= 300
 *      (Frühgeschichte/Steinzeit, Ägypten, erste Hochkulturen — Faktenbank)
 *
 * Deterministisch (mulberry32-Seed). Keine Abhängigkeiten, reines Node.
 *
 * Aufruf (vom Repo-Root):
 *   node scripts/questions/mega/generate14.mjs
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

/** Zahlen-Distraktoren in der Nähe (nie negativ, nie gleich der Lösung). */
function nearMoney(rng, correct, step) {
  const set = new Set([correct.toFixed(2)]);
  const out = [];
  let guard = 0;
  while (out.length < 3 && guard < 200) {
    guard++;
    const delta = rng.int(1, 3) * step * (rng.next() < 0.5 ? -1 : 1);
    const cand = Math.round((correct + delta) * 100) / 100;
    if (cand <= 0) continue;
    const s = cand.toFixed(2);
    if (set.has(s)) continue;
    set.add(s);
    out.push(cand);
  }
  let up = correct + 4 * step;
  while (out.length < 3) {
    const s = up.toFixed(2);
    if (!set.has(s)) { set.add(s); out.push(up); }
    up += step;
  }
  return out;
}

function euro(n) {
  return n.toFixed(2).replace(".", ",") + " €";
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

/* ══════════════════ 1) INFORMATIK Klasse 5–6 ══════════════════ */

// [Frage, Antwort, Distraktoren, Erklärung]
const HARDWARE_FAKTEN = [
  ["Welches Bauteil ist das „Gehirn“ des Computers und führt alle Rechnungen aus?", "der Prozessor (CPU)", ["der Bildschirm", "die Maus", "der Lautsprecher"], "Der Prozessor (CPU) verarbeitet alle Befehle – er ist das Rechenzentrum des Computers."],
  ["Wie heißt der Arbeitsspeicher, der Daten nur speichert, solange der Computer an ist?", "RAM", ["Festplatte", "USB-Stick", "DVD"], "Der RAM (Arbeitsspeicher) vergisst alles, sobald der Strom weg ist."],
  ["Wo werden Dateien dauerhaft gespeichert, auch wenn der Computer aus ist?", "auf der Festplatte / SSD", ["im Arbeitsspeicher (RAM)", "im Prozessor", "im Bildschirm"], "Festplatte und SSD sind dauerhafte Speicher – die Daten bleiben auch ohne Strom erhalten."],
  ["Welches Gerät zeigt dir Bilder, Texte und Videos an?", "der Monitor (Bildschirm)", ["die Tastatur", "die Maus", "das Mikrofon"], "Der Monitor ist das Ausgabegerät für Bilder und Texte."],
  ["Mit welchem Gerät bewegst du den Zeiger (Cursor) auf dem Bildschirm?", "mit der Maus", ["mit dem Drucker", "mit dem Lautsprecher", "mit dem Monitor"], "Die Maus (oder das Touchpad) steuert den Mauszeiger."],
  ["Mit welchem Gerät tippst du Buchstaben und Zahlen ein?", "mit der Tastatur", ["mit dem Monitor", "mit den Kopfhörern", "mit dem Beamer"], "Die Tastatur ist das wichtigste Eingabegerät für Text."],
  ["Welches Gerät bringt Texte und Bilder vom Computer auf Papier?", "der Drucker", ["der Scanner", "der Monitor", "die Webcam"], "Der Drucker gibt Dokumente auf Papier aus."],
  ["Welches Gerät liest ein Blatt Papier ein und macht daraus eine Datei?", "der Scanner", ["der Drucker", "der Lautsprecher", "der Beamer"], "Der Scanner digitalisiert Papier – aus dem Blatt wird eine Bilddatei."],
  ["Welches Gerät nimmt deine Stimme auf?", "das Mikrofon", ["der Lautsprecher", "der Monitor", "der Drucker"], "Das Mikrofon wandelt Schall in ein elektrisches Signal um."],
  ["Aus welchem Gerät kommt Musik oder Ton heraus?", "aus dem Lautsprecher", ["aus dem Mikrofon", "aus dem Scanner", "aus der Tastatur"], "Lautsprecher und Kopfhörer geben Ton aus."],
  ["Welches Gerät projiziert das Computerbild groß an die Wand?", "der Beamer (Projektor)", ["der Scanner", "der Router", "der USB-Stick"], "Der Beamer wirft das Bild vergrößert an eine Wand oder Leinwand."],
  ["Mit welchem kleinen Speicher nimmst du Dateien einfach mit?", "mit dem USB-Stick", ["mit dem Prozessor", "mit dem RAM", "mit der Webcam"], "Der USB-Stick ist ein kleiner, tragbarer Speicher."],
  ["Welches Gerät filmt dich bei einer Videokonferenz?", "die Webcam", ["der Drucker", "der Lautsprecher", "der USB-Stick"], "Die Webcam ist eine kleine Kamera am oder im Bildschirm."],
  ["Welches Gerät verbindet dein Zuhause mit dem Internet und verteilt WLAN?", "der Router", ["der Beamer", "der Scanner", "die Maus"], "Der Router stellt die Internetverbindung her und verteilt sie per Kabel oder WLAN."],
  ["Wie nennt man alle Geräte und Bauteile des Computers, die man anfassen kann?", "Hardware", ["Software", "Internet", "Apps"], "Hardware = alles Anfassbare (Tastatur, Monitor …); Software = Programme."],
  ["Wie nennt man Programme und Apps auf dem Computer?", "Software", ["Hardware", "Bildschirm", "Kabel"], "Software sind die Programme – man kann sie nicht anfassen."],
  ["Welches Programm verwaltet den ganzen Computer (z. B. Windows)?", "das Betriebssystem", ["der Taschenrechner", "das Malprogramm", "der Browser allein"], "Das Betriebssystem (z. B. Windows, macOS, Linux) steuert Hardware und Programme."],
  ["Mit welchem Programm surfst du im Internet?", "mit dem Browser", ["mit dem Taschenrechner", "mit dem Malprogramm", "mit dem Datei-Explorer"], "Browser wie Firefox, Chrome oder Safari zeigen Internetseiten an."],
  ["Was ist ein Touchscreen?", "ein Bildschirm, den man mit den Fingern bedient", ["eine besondere Maus", "ein Drucker für Fotos", "ein Lautsprecher"], "Beim Touchscreen ist der Bildschirm zugleich Eingabegerät – wie beim Tablet."],
  ["Welche Geräteart ist ein Laptop?", "ein tragbarer Computer mit eingebautem Bildschirm und Tastatur", ["ein reines Eingabegerät", "ein Drucker", "ein externer Speicher"], "Ein Laptop (Notebook) vereint Computer, Bildschirm, Tastatur und Akku."],
  ["Was bedeutet es, den Computer „herunterzufahren“?", "ihn richtig auszuschalten, damit nichts verloren geht", ["ihn die Treppe hinunterzutragen", "das Internet zu löschen", "den Bildschirm dunkler zu stellen"], "Beim Herunterfahren beendet das Betriebssystem alle Programme sicher."],
  ["Wofür steht die Abkürzung „PC“?", "Personal Computer", ["Papier-Computer", "Power-Chip", "Programm-Code"], "PC ist die Abkürzung für Personal Computer, also „persönlicher Computer“."],
  ["Wo landet eine Datei zuerst, wenn du sie am Computer löschst?", "im Papierkorb", ["auf dem Drucker", "im Internet", "auf dem USB-Stick"], "Gelöschte Dateien wandern zuerst in den Papierkorb und können von dort zurückgeholt werden."],
  ["Wie nennt man das kleine Bild auf dem Desktop, mit dem man ein Programm startet?", "Symbol (Icon)", ["Cursor", "Passwort", "Ordner-Pfad"], "Icons sind kleine Sinnbilder – ein Doppelklick startet das Programm."],
  ["Wozu dient ein Ordner am Computer?", "um Dateien geordnet zu sammeln", ["um den Computer schneller zu machen", "um das WLAN zu verstärken", "um den Bildschirm zu putzen"], "In Ordnern sortiert man Dateien, wie in einem Schrank mit Fächern."],
];

// [Gerät, Kategorie, Erklärung]
const EIN_AUS = [
  ["Tastatur", "Eingabegerät", "Mit der Tastatur gibst du Text ein – Daten gehen IN den Computer."],
  ["Maus", "Eingabegerät", "Die Maus sendet deine Bewegungen und Klicks an den Computer."],
  ["Mikrofon", "Eingabegerät", "Das Mikrofon nimmt Ton auf und schickt ihn in den Computer."],
  ["Scanner", "Eingabegerät", "Der Scanner liest Papier ein – die Daten gehen in den Computer."],
  ["Webcam", "Eingabegerät", "Die Webcam schickt Bilder in den Computer hinein."],
  ["Touchpad", "Eingabegerät", "Das Touchpad ersetzt am Laptop die Maus – ein Eingabegerät."],
  ["Controller (Gamepad)", "Eingabegerät", "Mit dem Controller steuerst du Spiele – Eingaben gehen in den Computer."],
  ["Grafiktablett", "Eingabegerät", "Auf dem Grafiktablett zeichnest du – die Striche gehen in den Computer."],
  ["Monitor", "Ausgabegerät", "Der Monitor zeigt Ergebnisse an – Daten kommen AUS dem Computer."],
  ["Drucker", "Ausgabegerät", "Der Drucker gibt Dokumente auf Papier aus."],
  ["Lautsprecher", "Ausgabegerät", "Der Lautsprecher gibt Ton aus dem Computer aus."],
  ["Kopfhörer", "Ausgabegerät", "Kopfhörer geben Ton aus – nur für deine Ohren."],
  ["Beamer", "Ausgabegerät", "Der Beamer gibt das Bild vergrößert an der Wand aus."],
];

// [Szenario, richtige Reaktion, falsche Reaktionen, Erklärung]
const SICHERHEIT = [
  ["Eine fremde Person schreibt dir im Spiele-Chat: „Wie heißt du richtig und wo wohnst du?“", "nichts verraten und es einem Erwachsenen erzählen", ["Name und Adresse schicken", "nur die Adresse schicken", "ein Foto von deinem Zuhause senden"], "Persönliche Daten (Name, Adresse, Schule) gibst du Fremden im Internet niemals."],
  ["Du bekommst eine E-Mail: „Du hast ein Handy gewonnen! Klicke hier und gib dein Passwort ein.“", "nicht klicken und die E-Mail löschen oder Erwachsenen zeigen", ["schnell das Passwort eingeben", "die E-Mail an Freunde weiterleiten", "zurückschreiben und nach mehr Preisen fragen"], "Solche Gewinnversprechen sind fast immer Betrug (Phishing) – niemals Passwörter eingeben."],
  ["Deine beste Freundin möchte dein Passwort wissen, „nur zum Ausprobieren“.", "freundlich Nein sagen – Passwörter bleiben geheim", ["es ihr flüstern", "es ihr aufschreiben", "es in den Klassenchat posten"], "Passwörter teilt man mit niemandem – auch nicht mit Freunden. Nur Eltern dürfen sie kennen."],
  ["Welches dieser Passwörter ist am sichersten?", "T7!blau-Giraffe9", ["123456", "passwort", "dein eigener Vorname"], "Sichere Passwörter sind lang und mischen Buchstaben, Zahlen und Zeichen – keine Namen oder Zahlenreihen."],
  ["Jemand aus dem Internet, den du nicht kennst, will sich mit dir treffen.", "ablehnen und sofort deinen Eltern erzählen", ["heimlich hingehen", "nur hingehen, wenn es nah ist", "die Adresse deiner Schule schicken"], "Triff dich nie mit Internet-Bekanntschaften – erzähle es immer einem Erwachsenen."],
  ["In einem Chat wird ein Kind aus deiner Klasse beleidigt.", "nicht mitmachen, Beweise sichern und Erwachsenen Bescheid sagen", ["mitlachen", "die Beleidigung weiterschicken", "einfach nichts tun und mitlesen"], "Bei Cybermobbing: nicht mitmachen, Screenshots machen und Hilfe bei Erwachsenen holen."],
  ["Ein Pop-up-Fenster sagt: „Dein Computer hat 5 Viren! Jetzt hier klicken!“", "das Fenster schließen und einem Erwachsenen Bescheid sagen", ["sofort auf den Knopf klicken", "deine E-Mail-Adresse eingeben", "das Programm herunterladen"], "Solche Schock-Meldungen sind Tricks, um Schadsoftware zu verbreiten – nie klicken."],
  ["Du willst ein Foto von deinem Freund im Klassenchat posten.", "ihn vorher um Erlaubnis fragen", ["es einfach posten", "es an alle schicken, die es sehen wollen", "es zusätzlich öffentlich ins Internet stellen"], "Fotos anderer darfst du nur mit deren Erlaubnis teilen – Recht am eigenen Bild."],
  ["Eine App möchte bei der Anmeldung dein Geburtsdatum, deine Adresse und deine Handynummer.", "mit den Eltern prüfen, welche Angaben wirklich nötig sind", ["alles sofort eintragen", "die Daten eines Freundes eintragen", "zusätzlich noch die Kontonummer angeben"], "Gib so wenige Daten wie möglich an – und frage bei Anmeldungen immer die Eltern."],
  ["Du findest ein lustiges Quiz: „Beantworte 10 Fragen über dich und teile das Ergebnis!“", "vorsichtig sein – solche Quizze sammeln oft persönliche Daten", ["alle Fragen ehrlich beantworten und teilen", "auch die Daten deiner Familie eintragen", "dein Passwort als Antwort benutzen"], "Viele „Spaß-Quizze“ sammeln Daten. Überlege immer, wer deine Antworten bekommt."],
  ["Dein Online-Freund behauptet, 12 zu sein, stellt aber komische Fragen und will Fotos.", "Kontakt beenden, nichts schicken, Eltern informieren", ["Fotos schicken, damit er nett bleibt", "ihm dein Passwort geben", "ihm deine Adresse geben, damit er dir glaubt"], "Im Internet kann jeder etwas anderes behaupten. Bei komischen Anfragen: blockieren und melden."],
  ["Wie oft solltest du für verschiedene Internetseiten dasselbe Passwort benutzen?", "möglichst nie – für Wichtiges eigene Passwörter", ["immer, das ist praktisch", "nur bei Spielen und beim E-Mail-Konto", "immer dasselbe, aber rückwärts"], "Wird ein Passwort geknackt, wären sonst alle Konten offen – deshalb verschiedene Passwörter."],
  ["Was machst du, wenn dir im Internet etwas Angst macht oder komisch vorkommt?", "sofort einem Erwachsenen davon erzählen", ["es geheim halten", "es alleine weiter anschauen", "es an die Klasse weiterleiten"], "Du musst so etwas nicht allein lösen – Eltern oder Lehrkräfte helfen dir."],
  ["Welche Angabe ist im öffentlichen Spielernamen (Nickname) in Ordnung?", "ein Fantasiename wie „Blitzfuchs07“", ["dein voller echter Name", "dein Name plus Wohnort", "deine Handynummer"], "Nicknames sollen nichts über dich verraten – Fantasienamen sind sicher."],
  ["Ein Spiel bietet dir einen kostenlosen „Diamanten-Hack“ zum Herunterladen an.", "nicht herunterladen – dahinter stecken oft Viren", ["sofort installieren", "erst installieren, dann Eltern fragen", "den Link an Freunde schicken"], "„Hacks“ und „Cheats“ aus dem Internet enthalten oft Schadsoftware."],
  ["Warum solltest du dich nach dem Benutzen eines fremden Computers abmelden?", "damit niemand in deinem Konto weitermachen kann", ["damit der Computer schneller wird", "damit der Bildschirm sauber bleibt", "das ist völlig egal"], "Ohne Abmelden könnte die nächste Person dein Konto benutzen und deine Daten sehen."],
  ["Woran erkennst du unter anderem eine verschlüsselte, sicherere Internetseite?", "am Schloss-Symbol und „https“ in der Adresszeile", ["an bunten Bildern", "an vielen Pop-up-Fenstern", "an lauter Werbung"], "Das Schloss und https bedeuten: Die Verbindung ist verschlüsselt."],
  ["Was ist ein starkes Merkmal für eine Betrugs-Nachricht (Phishing)?", "sie macht Druck: „Sofort handeln, sonst wird dein Konto gesperrt!“", ["sie ist höflich und ohne Links", "sie kommt von deiner Lehrerin persönlich", "sie enthält gar keine Aufforderung"], "Phishing-Nachrichten erzeugen Zeitdruck und wollen Daten oder Klicks."],
];

// [Endung, Dateiart, Erklärung]
const DATEITYPEN = [
  [".jpg", "ein Bild (Foto)", "JPG/JPEG ist das häufigste Format für Fotos."],
  [".png", "ein Bild (Grafik)", "PNG ist ein Bildformat, oft für Grafiken mit durchsichtigem Hintergrund."],
  [".gif", "ein Bild (oft kleine Animation)", "GIF-Dateien sind Bilder, die sich auch bewegen können."],
  [".mp3", "eine Musik-/Tondatei", "MP3 ist das bekannteste Format für Musik und Ton."],
  [".wav", "eine Tondatei", "WAV ist ein unkomprimiertes Tonformat."],
  [".mp4", "ein Video", "MP4 ist das häufigste Videoformat."],
  [".docx", "ein Text-Dokument (Word)", "DOCX-Dateien öffnet man mit einer Textverarbeitung wie Word."],
  [".txt", "eine einfache Textdatei", "TXT enthält reinen Text ohne Formatierung."],
  [".pdf", "ein Dokument, das überall gleich aussieht", "PDF-Dokumente sehen auf jedem Gerät gleich aus und werden oft zum Teilen genutzt."],
  [".pptx", "eine Präsentation (PowerPoint)", "PPTX-Dateien sind Folien-Präsentationen."],
  [".xlsx", "eine Tabelle (Excel)", "XLSX-Dateien sind Tabellen mit Zahlen und Formeln."],
  [".zip", "ein gepackter Ordner (Archiv)", "ZIP packt mehrere Dateien platzsparend zusammen."],
  [".exe", "ein ausführbares Programm (Windows)", "EXE-Dateien starten Programme – Vorsicht bei EXE aus dem Internet!"],
  [".html", "eine Internetseite", "HTML ist die Sprache, in der Webseiten geschrieben sind."],
];

// [Kürzel, Wirkung, Erklärung]
const SHORTCUTS = [
  ["Strg + C", "Kopieren", "Strg + C kopiert das Markierte in die Zwischenablage."],
  ["Strg + V", "Einfügen", "Strg + V fügt den Inhalt der Zwischenablage ein."],
  ["Strg + X", "Ausschneiden", "Strg + X schneidet das Markierte aus – zum Verschieben."],
  ["Strg + Z", "Rückgängig machen", "Strg + Z macht den letzten Schritt rückgängig."],
  ["Strg + S", "Speichern", "Strg + S speichert das aktuelle Dokument."],
  ["Strg + A", "Alles markieren", "Strg + A markiert den gesamten Inhalt."],
  ["Strg + P", "Drucken", "Strg + P öffnet das Druckfenster."],
  ["Strg + F", "Suchen", "Strg + F öffnet die Suche auf der Seite oder im Dokument."],
  ["Strg + N", "Neues Fenster/Dokument öffnen", "Strg + N erstellt ein neues Dokument oder Fenster."],
  ["Alt + Tab", "Zwischen offenen Fenstern wechseln", "Mit Alt + Tab springst du zwischen geöffneten Programmen hin und her."],
  ["Windows + L", "Bildschirm sperren", "Windows + L sperrt den Computer – wichtig, wenn man weggeht."],
  ["F5", "Seite neu laden (aktualisieren)", "F5 lädt die aktuelle Seite im Browser neu."],
  ["Entf (Entfernen)", "Markiertes löschen", "Die Entf-Taste löscht markierte Dateien oder Zeichen rechts vom Cursor."],
  ["Strg + Umschalt + T", "Zuletzt geschlossenen Browser-Tab wiederherstellen", "Strg + Umschalt + T holt versehentlich geschlossene Tabs zurück."],
];

function informatik4Generators(klasse) {
  const gens = [];

  gens.push((r) => {
    const [q, a, d, e] = r.pick(HARDWARE_FAKTEN);
    return mc(r, "Computer-Grundlagen", `${r.pick(LEADS)}${q}`, a, r.shuffle(d), e);
  });

  gens.push((r) => {
    const [geraet, kat, e] = r.pick(EIN_AUS);
    return mc(r, "Eingabe und Ausgabe",
      `${r.pick(LEADS)}Ist ${geraet.startsWith("C") || geraet.startsWith("G") ? "ein" : "eine"} „${geraet}“ ein Eingabe- oder ein Ausgabegerät?`,
      kat, ["Eingabegerät", "Ausgabegerät", "Speichergerät", "kein Computer-Gerät"].filter((x) => x !== kat),
      e);
  });
  gens.push((r) => {
    const kat = r.pick(["Eingabegerät", "Ausgabegerät"]);
    const passend = EIN_AUS.filter(([, k]) => k === kat);
    const andere = EIN_AUS.filter(([, k]) => k !== kat).map(([g]) => g);
    const [geraet, , e] = r.pick(passend);
    return mc(r, "Eingabe und Ausgabe",
      `${r.pick(LEADS)}Welches dieser Geräte ist ein ${kat}?`,
      geraet, pickN(r, andere, geraet, 3), e);
  });

  gens.push((r) => {
    const [q, a, d, e] = r.pick(SICHERHEIT);
    return mc(r, "Internet-Sicherheit", `${r.pick(LEADS)}${q} Was ist richtig?`, a, r.shuffle(d), e);
  });

  gens.push((r) => {
    const [endung, art, e] = r.pick(DATEITYPEN);
    const andere = DATEITYPEN.map(([, a2]) => a2).filter((a2) => a2 !== art);
    return mc(r, "Dateitypen",
      `${r.pick(LEADS)}Was steckt in einer Datei mit der Endung „${endung}“?`,
      art, pickN(r, andere, art, 3), e);
  });
  gens.push((r) => {
    const [endung, art, e] = r.pick(DATEITYPEN);
    const andere = DATEITYPEN.map(([e2]) => e2).filter((e2) => e2 !== endung);
    return mc(r, "Dateitypen",
      `${r.pick(LEADS)}Welche Datei-Endung passt zu: ${art}?`,
      endung, pickN(r, andere, endung, 3), e);
  });

  gens.push((r) => {
    const [kuerzel, wirkung, e] = r.pick(SHORTCUTS);
    const andere = SHORTCUTS.map(([, w]) => w).filter((w) => w !== wirkung);
    return mc(r, "Tastatur-Kürzel",
      `${r.pick(LEADS)}Was bewirkt das Tastatur-Kürzel ${kuerzel}?`,
      wirkung, pickN(r, andere, wirkung, 3), e);
  });
  gens.push((r) => {
    const [kuerzel, wirkung, e] = r.pick(SHORTCUTS);
    const andere = SHORTCUTS.map(([k]) => k).filter((k) => k !== kuerzel);
    return mc(r, "Tastatur-Kürzel",
      `${r.pick(LEADS)}Mit welchem Tastatur-Kürzel kannst du Folgendes tun: ${wirkung}?`,
      kuerzel, pickN(r, andere, kuerzel, 3), e);
  });

  // Klasse 6: etwas mehr Transfer bei Sicherheit + Dateigrößen-Logik
  if (klasse >= 6) {
    gens.push((r) => {
      const paare = [
        ["1 Kilobyte (KB)", "etwa 1000 Byte"],
        ["1 Megabyte (MB)", "etwa 1000 Kilobyte"],
        ["1 Gigabyte (GB)", "etwa 1000 Megabyte"],
        ["1 Terabyte (TB)", "etwa 1000 Gigabyte"],
      ];
      const [einheit, richtig] = r.pick(paare);
      const andere = paare.map(([, v]) => v).filter((v) => v !== richtig);
      return mc(r, "Computer-Grundlagen",
        `${r.pick(LEADS)}Wie viel ist ${einheit} ungefähr?`,
        richtig, andere,
        `Die Speichereinheiten wachsen jeweils etwa um den Faktor 1000: Byte → KB → MB → GB → TB.`);
    });
  }

  return gens;
}

/* ══════════════════ 2) WIRTSCHAFT Klasse 9–13 ══════════════════ */

const ANGEBOT_NACHFRAGE = [
  ["Was passiert auf einem freien Markt in der Regel mit dem Preis, wenn die Nachfrage steigt und das Angebot gleich bleibt?", "der Preis steigt", ["der Preis sinkt", "der Preis bleibt exakt gleich", "das Angebot verschwindet"], "Mehr Nachfrager konkurrieren um dieselbe Menge – der Preis steigt."],
  ["Was passiert mit dem Preis, wenn das Angebot steigt und die Nachfrage gleich bleibt?", "der Preis sinkt", ["der Preis steigt", "die Nachfrage wird verboten", "der Preis verdoppelt sich"], "Ein größeres Angebot bei gleicher Nachfrage drückt den Preis."],
  ["Wie nennt man den Preis, bei dem angebotene und nachgefragte Menge übereinstimmen?", "Gleichgewichtspreis", ["Höchstpreis", "Einstandspreis", "Listenpreis"], "Im Marktgleichgewicht gleichen sich Angebot und Nachfrage aus – beim Gleichgewichtspreis."],
  ["Was entsteht, wenn der Preis über dem Gleichgewichtspreis liegt?", "ein Angebotsüberschuss (es bleibt Ware übrig)", ["ein Nachfrageüberschuss", "automatisch mehr Nachfrage", "ein Verbot des Gutes"], "Zu hohe Preise: Anbieter wollen viel verkaufen, Käufer kaufen wenig – Überschuss."],
  ["Was entsteht, wenn der Preis unter dem Gleichgewichtspreis liegt?", "ein Nachfrageüberschuss (das Gut wird knapp)", ["ein Angebotsüberschuss", "sinkende Nachfrage", "sofort höhere Löhne"], "Zu niedrige Preise: Viele wollen kaufen, wenige anbieten – das Gut wird knapp."],
  ["Eine Missernte verringert die Kaffeeernte weltweit. Was ist die typische Folge?", "das Angebot sinkt, der Kaffeepreis steigt", ["das Angebot steigt, der Preis sinkt", "die Nachfrage verschwindet", "der Preis bleibt gesetzlich gleich"], "Weniger Angebot bei ähnlicher Nachfrage lässt den Preis steigen."],
  ["Ein neues Smartphone-Modell erscheint; das Vorgängermodell wird billiger. Warum?", "die Nachfrage nach dem alten Modell sinkt", ["die Nachfrage nach dem alten Modell explodiert", "das alte Modell wird knapper", "die Produktionskosten steigen"], "Käufer wollen das neue Modell – die Nachfrage nach dem alten sinkt, der Preis fällt."],
  ["Wie reagieren Anbieter typischerweise auf dauerhaft steigende Preise eines Gutes?", "sie weiten die Produktion aus", ["sie stellen die Produktion ein", "sie verschenken das Gut", "sie senken das Angebot auf null"], "Höhere Preise machen die Produktion attraktiver – das Angebot steigt."],
  ["Was beschreibt die „Nachfrage“ auf einem Markt?", "die Menge eines Gutes, die Käufer zu bestimmten Preisen kaufen wollen und können", ["die Menge, die Firmen produzieren", "den staatlich festgelegten Preis", "die Zahl der Fabriken"], "Nachfrage = Kaufwunsch plus Kaufkraft der Konsumenten."],
  ["Was beschreibt das „Angebot“ auf einem Markt?", "die Menge eines Gutes, die Verkäufer zu bestimmten Preisen verkaufen wollen", ["die Wünsche der Käufer", "die Werbung eines Unternehmens", "den Gewinn des Staates"], "Angebot = die zu verschiedenen Preisen bereitgestellte Menge der Anbieter."],
  ["Welche Funktion erfüllt der Preis auf Märkten unter anderem?", "er signalisiert Knappheit und lenkt Angebot und Nachfrage", ["er ist immer staatlich festgelegt", "er hat keine Informationsfunktion", "er verhindert jeden Handel"], "Preise zeigen Knappheit an (Signalfunktion) und steuern Produktion und Konsum (Lenkungsfunktion)."],
  ["Zwei Eisdielen am selben Platz senken abwechselnd ihre Preise. Welches Prinzip zeigt sich?", "Wettbewerb (Konkurrenz) zwischen Anbietern", ["Monopolbildung", "Planwirtschaft", "Tauschhandel"], "Konkurrierende Anbieter unterbieten sich, um Kunden zu gewinnen – das ist Wettbewerb."],
  ["Wie nennt man einen Markt mit nur einem einzigen Anbieter?", "Monopol", ["Oligopol", "Polypol", "Fusion"], "Monopol = ein Anbieter; Oligopol = wenige; Polypol = viele Anbieter."],
  ["Wie nennt man einen Markt mit wenigen großen Anbietern?", "Oligopol", ["Monopol", "Polypol", "Subvention"], "Beim Oligopol teilen sich wenige große Anbieter den Markt, z. B. Mineralölkonzerne."],
];

const VERTRAEGE = [
  ["Durch welchen Vertrag wird Ware gegen Geld übertragen (z. B. Brötchenkauf)?", "Kaufvertrag", ["Mietvertrag", "Arbeitsvertrag", "Darlehensvertrag"], "Beim Kaufvertrag verpflichtet sich der Verkäufer zur Übergabe der Ware, der Käufer zur Zahlung."],
  ["Welcher Vertrag regelt die Überlassung einer Wohnung gegen monatliche Zahlung?", "Mietvertrag", ["Kaufvertrag", "Leihvertrag", "Werkvertrag"], "Beim Mietvertrag wird eine Sache gegen Entgelt zum Gebrauch überlassen."],
  ["Welcher Vertrag verpflichtet zu Arbeitsleistung gegen Lohn?", "Arbeitsvertrag", ["Kaufvertrag", "Mietvertrag", "Schenkungsvertrag"], "Der Arbeitsvertrag regelt Arbeitsleistung, Vergütung, Urlaub und Kündigungsfristen."],
  ["Welcher Vertrag liegt vor, wenn ein Handwerker einen fertigen Erfolg (z. B. eine reparierte Heizung) schuldet?", "Werkvertrag", ["Dienstvertrag", "Leihvertrag", "Mietvertrag"], "Beim Werkvertrag wird ein Erfolg geschuldet, beim Dienstvertrag nur das Tätigwerden."],
  ["Bei welchem Vertrag wird Geld überlassen und mit Zinsen zurückgezahlt?", "Darlehensvertrag (Kreditvertrag)", ["Schenkungsvertrag", "Kaufvertrag", "Leihvertrag"], "Beim Darlehen erhält man Geld und zahlt es später – meist mit Zinsen – zurück."],
  ["Du leihst dir kostenlos das Fahrrad eines Freundes. Welcher Vertragstyp ist das rechtlich?", "Leihvertrag", ["Mietvertrag", "Darlehensvertrag", "Kaufvertrag"], "Leihe = unentgeltliche Gebrauchsüberlassung; Miete wäre gegen Bezahlung."],
  ["Aus welchen zwei übereinstimmenden Willenserklärungen kommt ein Vertrag zustande?", "Antrag (Angebot) und Annahme", ["Wunsch und Werbung", "Rechnung und Quittung", "Bestellung und Lieferung allein"], "Ein Vertrag entsteht durch Angebot und Annahme – zwei übereinstimmende Willenserklärungen."],
  ["Ab welchem Alter ist man in Deutschland voll geschäftsfähig?", "mit 18 Jahren", ["mit 14 Jahren", "mit 16 Jahren", "mit 21 Jahren"], "Mit Volljährigkeit (18) ist man voll geschäftsfähig; 7–17-Jährige sind beschränkt geschäftsfähig."],
  ["Was besagt der „Taschengeldparagraf“ (§ 110 BGB) sinngemäß?", "Minderjährige können Käufe wirksam tätigen, die sie mit ihrem Taschengeld bezahlen", ["Minderjährige dürfen gar nichts kaufen", "Eltern müssen jedes Eis genehmigen", "Taschengeld ist steuerpflichtig"], "Mit überlassenem Taschengeld bezahlte Geschäfte Minderjähriger sind wirksam."],
  ["Wie lange gilt in der Regel das gesetzliche Widerrufsrecht bei Online-Käufen?", "14 Tage", ["3 Tage", "6 Monate", "es gibt keins"], "Verbraucher können Fernabsatzverträge in der Regel 14 Tage lang widerrufen."],
  ["Was bedeutet die gesetzliche Gewährleistung beim Kauf?", "der Händler haftet für Mängel, die bei Übergabe schon vorlagen", ["jede Reparatur ist lebenslang kostenlos", "der Kunde darf immer umtauschen, wenn ihm die Farbe nicht gefällt", "sie gilt nur bei Barzahlung"], "Gewährleistung (i. d. R. 2 Jahre) deckt anfängliche Mängel – Umtausch bei Nichtgefallen ist dagegen freiwillig."],
  ["Ein Kaufvertrag im Laden kommt in der Regel zustande, wenn …", "der Kunde die Ware an der Kasse vorlegt und der Verkäufer sie abkassiert", ["die Ware ins Schaufenster gelegt wird", "der Kunde den Laden betritt", "der Kunde die Ware nur ansieht"], "Die Auslage im Schaufenster ist nur eine Aufforderung zur Abgabe eines Angebots."],
];

// [Situation/Frage, Versicherungszweig, Erklärung]
const SOZIALVERSICHERUNG = [
  ["Welche Sozialversicherung zahlt die Behandlung beim Arzt und im Krankenhaus?", "Krankenversicherung", "Die gesetzliche Krankenversicherung übernimmt Arzt-, Krankenhaus- und viele Medikamentenkosten."],
  ["Welche Sozialversicherung zahlt eine Rente im Alter?", "Rentenversicherung", "Die gesetzliche Rentenversicherung sichert das Einkommen im Alter."],
  ["Welche Sozialversicherung zahlt Geld, wenn man seinen Job verliert?", "Arbeitslosenversicherung", "Die Arbeitslosenversicherung zahlt Arbeitslosengeld und fördert die Jobsuche."],
  ["Welche Sozialversicherung hilft, wenn man dauerhaft auf Pflege angewiesen ist?", "Pflegeversicherung", "Die Pflegeversicherung finanziert Pflege zu Hause oder im Heim."],
  ["Welche Sozialversicherung springt bei einem Arbeitsunfall oder einer Berufskrankheit ein?", "Unfallversicherung", "Die gesetzliche Unfallversicherung deckt Arbeits- und Wegeunfälle; Beiträge zahlt allein der Arbeitgeber."],
  ["Frau Kaya bricht sich privat beim Sport das Bein. Welcher Zweig zahlt die Behandlung?", "Krankenversicherung", "Freizeitunfälle behandelt die Krankenversicherung; die Unfallversicherung gilt nur für Arbeit und Arbeitsweg."],
  ["Herr Lund stürzt auf dem direkten Weg zur Arbeit. Welcher Zweig ist zuständig?", "Unfallversicherung", "Wegeunfälle auf dem direkten Arbeitsweg sind Fall der gesetzlichen Unfallversicherung."],
  ["Eine 85-jährige Frau braucht dauerhaft Hilfe beim Waschen und Anziehen. Welcher Zweig zahlt?", "Pflegeversicherung", "Dauerhafter Hilfebedarf im Alltag ist ein Fall für die Pflegeversicherung."],
  ["Ein Angestellter wird nach Insolvenz seiner Firma arbeitslos. Welcher Zweig zahlt zunächst sein Einkommen?", "Arbeitslosenversicherung", "Das Arbeitslosengeld I kommt aus der Arbeitslosenversicherung."],
  ["Mit 67 beendet Herr Roth sein Arbeitsleben. Welcher Zweig zahlt sein monatliches Einkommen?", "Rentenversicherung", "Die Altersrente kommt aus der gesetzlichen Rentenversicherung."],
];
const SV_ZWEIGE = ["Krankenversicherung", "Rentenversicherung", "Arbeitslosenversicherung", "Pflegeversicherung", "Unfallversicherung"];

const SV_FAKTEN = [
  ["Wie viele Zweige hat die deutsche Sozialversicherung?", "5", ["3", "4", "6"], "Kranken-, Renten-, Arbeitslosen-, Pflege- und Unfallversicherung – fünf Zweige."],
  ["Wer trägt die Beiträge zur gesetzlichen Unfallversicherung?", "allein der Arbeitgeber", ["allein der Arbeitnehmer", "je zur Hälfte beide", "der Staat aus Steuern"], "Nur die Unfallversicherung zahlt der Arbeitgeber allein; die übrigen Zweige werden i. d. R. geteilt."],
  ["Nach welchem Prinzip werden die meisten Sozialversicherungsbeiträge aufgeteilt?", "etwa hälftig zwischen Arbeitgeber und Arbeitnehmer (Parität)", ["vollständig vom Arbeitnehmer", "vollständig vom Staat", "nach Alter des Beschäftigten"], "Bei Kranken-, Renten-, Pflege- und Arbeitslosenversicherung gilt weitgehend das Paritätsprinzip."],
  ["Nach welchem Prinzip finanziert die junge Generation die Renten der älteren?", "Umlageverfahren (Generationenvertrag)", ["Kapitaldeckungsverfahren", "Lotterieprinzip", "Steuerfreiheit"], "Die heutigen Beitragszahler finanzieren die heutigen Renten – Umlageverfahren."],
  ["Was ist das Solidaritätsprinzip der Sozialversicherung?", "alle zahlen nach Leistungsfähigkeit ein, Leistungen gibt es nach Bedarf", ["jeder bekommt exakt seine Einzahlungen zurück", "nur Kranke zahlen Beiträge", "Beiträge sind für alle gleich hoch in Euro"], "Gesunde stützen Kranke, Junge stützen Alte – das ist Solidarität."],
];

const UNTERNEHMENSFORMEN = [
  ["Bei welcher Unternehmensform haftet ein einzelner Inhaber mit seinem gesamten Privatvermögen?", "Einzelunternehmen", ["GmbH", "AG", "eingetragene Genossenschaft"], "Der Einzelunternehmer führt allein und haftet unbeschränkt – auch privat."],
  ["Wofür steht die Abkürzung „GmbH“?", "Gesellschaft mit beschränkter Haftung", ["Gesellschaft mit besonderer Handlung", "Großes mittelständisches Betriebshaus", "Gemeinsame moderne Handelsbörse"], "Bei der GmbH haftet grundsätzlich nur das Gesellschaftsvermögen."],
  ["Wie hoch ist das Mindeststammkapital einer GmbH in Deutschland?", "25.000 €", ["1 €", "50.000 €", "100.000 €"], "Für die GmbH-Gründung sind 25.000 € Stammkapital vorgeschrieben."],
  ["Wie hoch ist das Mindestgrundkapital einer Aktiengesellschaft (AG)?", "50.000 €", ["5.000 €", "25.000 €", "500.000 €"], "Die AG braucht mindestens 50.000 € Grundkapital, zerlegt in Aktien."],
  ["Wie nennt man die Anteilseigner einer AG?", "Aktionäre", ["Kommanditisten", "Genossen", "Prokuristen"], "Aktionäre halten Aktien und sind damit Miteigentümer der AG."],
  ["Welches Organ leitet die Geschäfte einer AG?", "der Vorstand", ["die Hauptversammlung allein", "der Betriebsrat", "das Finanzamt"], "Der Vorstand führt die AG; der Aufsichtsrat kontrolliert ihn; die Hauptversammlung ist das Aktionärstreffen."],
  ["Bei welcher Personengesellschaft haften alle Gesellschafter unbeschränkt?", "OHG (Offene Handelsgesellschaft)", ["GmbH", "AG", "UG (haftungsbeschränkt)"], "In der OHG haften alle Gesellschafter unbeschränkt und persönlich."],
  ["Welche zwei Gesellschaftertypen hat die Kommanditgesellschaft (KG)?", "Komplementär (haftet voll) und Kommanditist (haftet nur mit Einlage)", ["Aktionär und Vorstand", "zwei gleich voll haftende Genossen", "Chef und Auszubildender"], "KG: Komplementär = Vollhafter, Kommanditist = Teilhafter mit seiner Einlage."],
  ["Wie nennt man die „Mini-GmbH“, die schon ab 1 € Stammkapital gegründet werden kann?", "UG (haftungsbeschränkt)", ["AG", "OHG", "KG"], "Die Unternehmergesellschaft (haftungsbeschränkt) ist ab 1 € möglich, muss aber Rücklagen bilden."],
  ["Was ist ein zentraler Vorteil von Kapitalgesellschaften wie GmbH und AG?", "die Haftung ist auf das Gesellschaftsvermögen beschränkt", ["sie zahlen nie Steuern", "sie brauchen keine Buchführung", "sie dürfen Preise staatlich festlegen"], "Gesellschafter riskieren grundsätzlich nur ihre Einlage, nicht ihr Privatvermögen."],
  ["Welche Rechtsform ist typisch, wenn viele Mitglieder sich zur gemeinsamen Förderung zusammenschließen (z. B. Winzer, Banken)?", "eingetragene Genossenschaft (eG)", ["AG", "Einzelunternehmen", "KG"], "Die eG dient der Förderung ihrer Mitglieder – jedes Mitglied hat i. d. R. eine Stimme."],
  ["Zwei Freundinnen gründen formlos ein kleines Nachhilfe-Business ohne Handelsregistereintrag. Welche Rechtsform liegt nahe?", "GbR (Gesellschaft bürgerlichen Rechts)", ["AG", "GmbH", "eG"], "Die GbR entsteht formlos, wenn mehrere Personen einen gemeinsamen Zweck verfolgen."],
];

const INFLATION_FAKTEN = [
  ["Was bedeutet Inflation?", "ein anhaltender Anstieg des allgemeinen Preisniveaus", ["das Sinken aller Preise", "das Verbot von Bargeld", "steigende Löhne ohne Preisänderung"], "Inflation = die Preise steigen insgesamt, das Geld verliert an Kaufkraft."],
  ["Was passiert bei Inflation mit der Kaufkraft des Geldes?", "sie sinkt", ["sie steigt", "sie bleibt exakt gleich", "sie verdoppelt sich"], "Für denselben Geldbetrag bekommt man bei Inflation weniger Waren."],
  ["Wie heißt das Gegenteil der Inflation, also anhaltend sinkende Preise?", "Deflation", ["Stagnation", "Subvention", "Fusion"], "Bei Deflation sinkt das Preisniveau anhaltend."],
  ["Womit misst man die Inflationsrate in Deutschland üblicherweise?", "mit dem Verbraucherpreisindex (Warenkorb)", ["mit dem DAX", "mit der Arbeitslosenquote", "mit dem Bruttogewicht der Waren"], "Der Verbraucherpreisindex verfolgt die Preise eines typischen Warenkorbs."],
  ["Welche Institution soll im Euroraum für stabile Preise sorgen?", "die Europäische Zentralbank (EZB)", ["das Finanzamt", "die Deutsche Börse", "der Bundesrat"], "Die EZB strebt mittelfristig rund 2 % Inflation als Preisstabilität an."],
  ["Wer profitiert tendenziell von unerwartet hoher Inflation?", "Schuldner, denn ihre Schulden verlieren real an Wert", ["Sparer mit unverzinstem Bargeld", "Rentner mit fester Rente", "niemand"], "Reale Schuldenlast sinkt mit der Geldentwertung – Sparer verlieren, Schuldner gewinnen."],
];

function wirtschaft2Generators(klasse) {
  const gens = [];

  gens.push((r) => {
    const [q, a, d, e] = r.pick(ANGEBOT_NACHFRAGE);
    return mc(r, "Angebot und Nachfrage", `${r.pick(LEADS)}${q}`, a, r.shuffle(d), e);
  });

  gens.push((r) => {
    const [q, a, d, e] = r.pick(VERTRAEGE);
    return mc(r, "Vertragsarten", `${r.pick(LEADS)}${q}`, a, r.shuffle(d), e);
  });

  gens.push((r) => {
    const [q, zweig, e] = r.pick(SOZIALVERSICHERUNG);
    return mc(r, "Sozialversicherungen", `${r.pick(LEADS)}${q}`,
      zweig, pickN(r, SV_ZWEIGE, zweig, 3), e);
  });
  gens.push((r) => {
    const [q, a, d, e] = r.pick(SV_FAKTEN);
    return mc(r, "Sozialversicherungen", `${r.pick(LEADS)}${q}`, a, r.shuffle(d), e);
  });

  // Brutto/Netto vereinfacht: Netto = Brutto − Abzüge (fester Prozentsatz)
  gens.push((r) => {
    const brutto = r.int(18, 60) * 100; // 1800–6000 €
    const satz = r.pick([20, 25, 30, 35, 40]);
    const netto = brutto * (1 - satz / 100);
    return mc(r, "Brutto und Netto",
      `${r.pick(LEADS)}Vereinfachte Rechnung: Bruttogehalt ${euro(brutto)}, Abzüge (Steuern + Sozialabgaben) insgesamt ${satz} %. Wie hoch ist das Nettogehalt?`,
      euro(netto), nearMoney(r, netto, 50).map(euro),
      `Abzüge: ${satz} % von ${euro(brutto)} = ${euro(brutto * satz / 100)}. Netto = ${euro(brutto)} − ${euro(brutto * satz / 100)} = ${euro(netto)}.`);
  });
  gens.push((r) => {
    const brutto = r.int(20, 55) * 100;
    const satz = r.pick([20, 25, 30, 40]);
    const abzug = brutto * satz / 100;
    return mc(r, "Brutto und Netto",
      `${r.pick(LEADS)}Vereinfachte Rechnung: Vom Bruttogehalt ${euro(brutto)} werden ${satz} % abgezogen. Wie hoch sind die Abzüge in Euro?`,
      euro(abzug), nearMoney(r, abzug, 50).map(euro),
      `${satz} % von ${euro(brutto)} = ${satz / 100} · ${brutto.toFixed(0)} € = ${euro(abzug)}.`);
  });
  gens.push((r) => {
    const [q, a, d, e] = r.pick([
      ["Was bleibt vom Bruttogehalt nach Abzug von Lohnsteuer und Sozialabgaben übrig?", "das Nettogehalt", ["das Weihnachtsgeld", "die Umsatzsteuer", "der Bruttolohn"], "Netto = Brutto minus Steuern und Sozialversicherungsbeiträge."],
      ["Welche Abzüge stehen typischerweise auf einer Gehaltsabrechnung?", "Lohnsteuer und Sozialversicherungsbeiträge", ["Miete und Stromkosten", "Mehrwertsteuer und Zoll", "GEZ und Vereinsbeiträge"], "Vom Brutto gehen Lohnsteuer (ggf. Kirchensteuer/Soli) und Sozialabgaben ab."],
      ["Warum ist das Nettogehalt niedriger als das Bruttogehalt?", "weil Steuern und Sozialabgaben direkt abgezogen werden", ["weil der Arbeitgeber Geld einbehält, um es zu sparen", "weil Bargeld weniger wert ist", "weil das Finanzamt Gebühren fürs Überweisen nimmt"], "Der Arbeitgeber führt Steuern und Beiträge direkt ab – ausgezahlt wird das Netto."],
    ]);
    return mc(r, "Brutto und Netto", `${r.pick(LEADS)}${q}`, a, r.shuffle(d), e);
  });

  // Inflation berechnet: neuer Preis nach x % Teuerung
  gens.push((r) => {
    const preis = r.pick([2, 4, 5, 8, 10, 20, 25, 40, 50, 80, 100, 200]);
    const rate = r.pick([2, 3, 4, 5, 8, 10]);
    const neu = preis * (1 + rate / 100);
    return mc(r, "Inflation",
      `${r.pick(LEADS)}Ein Produkt kostet ${euro(preis)}. Die Inflationsrate beträgt ${rate} %. Was kostet es rechnerisch nach einem Jahr?`,
      euro(neu), nearMoney(r, neu, Math.max(0.1, preis * 0.02)).map(euro),
      `Neuer Preis = ${euro(preis)} · ${(1 + rate / 100).toFixed(2).replace(".", ",")} = ${euro(neu)}.`);
  });
  gens.push((r) => {
    const alt = r.pick([50, 100, 200, 250, 400, 500]);
    const rate = r.pick([2, 4, 5, 10, 20, 25]);
    const neu = alt * (1 + rate / 100);
    return mc(r, "Inflation",
      `${r.pick(LEADS)}Ein Warenkorb kostete ${euro(alt)} und kostet jetzt ${euro(neu)}. Wie hoch ist die Preissteigerung in Prozent?`,
      `${rate} %`, pickN(r, [1, 2, 3, 4, 5, 8, 10, 15, 20, 25, 30].map((x) => `${x} %`), `${rate} %`, 3),
      `Steigerung: (${euro(neu)} − ${euro(alt)}) ÷ ${euro(alt)} = ${(rate / 100).toFixed(2).replace(".", ",")} = ${rate} %.`);
  });
  gens.push((r) => {
    const [q, a, d, e] = r.pick(INFLATION_FAKTEN);
    return mc(r, "Inflation", `${r.pick(LEADS)}${q}`, a, r.shuffle(d), e);
  });

  gens.push((r) => {
    const [q, a, d, e] = r.pick(UNTERNEHMENSFORMEN);
    return mc(r, "Unternehmensformen", `${r.pick(LEADS)}${q}`, a, r.shuffle(d), e);
  });

  // Oberstufe: Kaufkraft-Rechnung zusätzlich
  if (klasse >= 11) {
    gens.push((r) => {
      const geld = r.pick([100, 200, 500, 1000]);
      const rate = r.pick([2, 5, 10, 20, 25]);
      const kaufkraft = geld / (1 + rate / 100);
      return mc(r, "Inflation",
        `${r.pick(LEADS)}Du hast ${euro(geld)} unverzinst gespart. Die Preise steigen um ${rate} %. Wie viel „alte Kaufkraft“ entspricht dein Geld danach (gerundet auf Cent)?`,
        euro(Math.round(kaufkraft * 100) / 100),
        nearMoney(r, Math.round(kaufkraft * 100) / 100, Math.max(1, geld * 0.02)).map(euro),
        `Reale Kaufkraft = ${euro(geld)} ÷ ${(1 + rate / 100).toFixed(2).replace(".", ",")} ≈ ${euro(Math.round(kaufkraft * 100) / 100)}.`);
    });
  }

  return gens;
}

/* ══════════════════ 3) FRANZÖSISCH Klasse 11–13 ══════════════════ */

// >= 120 Vokabelpaare (Gesellschaft, Umwelt, Politik) — [französisch, deutsch]
const FR_VOKABELN = [
  // Gesellschaft (société)
  ["la société", "die Gesellschaft"], ["l'égalité", "die Gleichheit"],
  ["l'inégalité", "die Ungleichheit"], ["la justice", "die Gerechtigkeit"],
  ["l'injustice", "die Ungerechtigkeit"], ["la pauvreté", "die Armut"],
  ["la richesse", "der Reichtum"], ["le chômage", "die Arbeitslosigkeit"],
  ["le chômeur", "der Arbeitslose"], ["l'immigration", "die Einwanderung"],
  ["l'émigration", "die Auswanderung"], ["l'immigré", "der Einwanderer"],
  ["le réfugié", "der Flüchtling"], ["l'intégration", "die Integration"],
  ["la banlieue", "der Vorort / die Vorstadt"], ["le quartier", "das Stadtviertel"],
  ["la discrimination", "die Diskriminierung"], ["le racisme", "der Rassismus"],
  ["les préjugés", "die Vorurteile"], ["la tolérance", "die Toleranz"],
  ["la solidarité", "die Solidarität"], ["la mondialisation", "die Globalisierung"],
  ["le niveau de vie", "der Lebensstandard"], ["la formation", "die Ausbildung"],
  ["l'éducation", "die Erziehung / Bildung"], ["la jeunesse", "die Jugend"],
  ["la vieillesse", "das Alter"], ["la retraite", "die Rente / der Ruhestand"],
  ["le salaire", "das Gehalt"], ["la grève", "der Streik"],
  ["le syndicat", "die Gewerkschaft"], ["la manifestation", "die Demonstration"],
  ["l'exclusion", "die Ausgrenzung"], ["le sans-abri", "der Obdachlose"],
  ["la criminalité", "die Kriminalität"], ["la violence", "die Gewalt"],
  ["la laïcité", "die Trennung von Staat und Religion"], ["la croyance", "der Glaube"],
  ["le mode de vie", "die Lebensweise"], ["le vieillissement", "die Alterung"],
  ["les médias", "die Medien"], ["les réseaux sociaux", "die sozialen Netzwerke"],
  ["la liberté d'expression", "die Meinungsfreiheit"], ["l'avenir", "die Zukunft"],
  // Umwelt (environnement)
  ["l'environnement", "die Umwelt"], ["la pollution", "die Umweltverschmutzung"],
  ["polluer", "verschmutzen"], ["le réchauffement climatique", "die Erderwärmung"],
  ["le changement climatique", "der Klimawandel"], ["l'effet de serre", "der Treibhauseffekt"],
  ["les gaz à effet de serre", "die Treibhausgase"], ["la couche d'ozone", "die Ozonschicht"],
  ["les énergies renouvelables", "die erneuerbaren Energien"], ["l'énergie solaire", "die Sonnenenergie"],
  ["l'énergie éolienne", "die Windenergie"], ["la centrale nucléaire", "das Atomkraftwerk"],
  ["les déchets", "der Müll / die Abfälle"], ["le tri des déchets", "die Mülltrennung"],
  ["le recyclage", "das Recycling"], ["recycler", "wiederverwerten"],
  ["le gaspillage", "die Verschwendung"], ["gaspiller", "verschwenden"],
  ["économiser l'énergie", "Energie sparen"], ["la consommation", "der Verbrauch / Konsum"],
  ["la sécheresse", "die Dürre"], ["l'inondation", "die Überschwemmung"],
  ["la canicule", "die Hitzewelle"], ["la marée noire", "die Ölpest"],
  ["la déforestation", "die Abholzung"], ["la forêt tropicale", "der Regenwald"],
  ["la biodiversité", "die Artenvielfalt"], ["les espèces menacées", "die bedrohten Arten"],
  ["la protection de la nature", "der Naturschutz"], ["protéger l'environnement", "die Umwelt schützen"],
  ["le développement durable", "die nachhaltige Entwicklung"], ["durable", "nachhaltig"],
  ["l'empreinte écologique", "der ökologische Fußabdruck"], ["les ressources naturelles", "die natürlichen Ressourcen"],
  ["la pénurie d'eau", "der Wassermangel"], ["l'agriculture biologique", "die Bio-Landwirtschaft"],
  ["les transports en commun", "die öffentlichen Verkehrsmittel"], ["la circulation", "der Verkehr"],
  ["l'essence", "das Benzin"], ["la voiture électrique", "das Elektroauto"],
  ["le pétrole", "das Erdöl"], ["le charbon", "die Kohle"],
  // Politik (politique)
  ["la politique", "die Politik"], ["l'État", "der Staat"],
  ["le gouvernement", "die Regierung"], ["gouverner", "regieren"],
  ["le président", "der Präsident"], ["le premier ministre", "der Premierminister"],
  ["le ministre", "der Minister"], ["le député", "der Abgeordnete"],
  ["l'Assemblée nationale", "die französische Nationalversammlung"], ["le Sénat", "der Senat"],
  ["la loi", "das Gesetz"], ["voter une loi", "ein Gesetz verabschieden"],
  ["la constitution", "die Verfassung"], ["la démocratie", "die Demokratie"],
  ["la dictature", "die Diktatur"], ["la république", "die Republik"],
  ["la monarchie", "die Monarchie"], ["les élections", "die Wahlen"],
  ["élire", "wählen (in ein Amt)"], ["voter", "abstimmen / wählen"],
  ["l'électeur", "der Wähler"], ["le droit de vote", "das Wahlrecht"],
  ["le suffrage universel", "das allgemeine Wahlrecht"], ["le parti politique", "die politische Partei"],
  ["la campagne électorale", "der Wahlkampf"], ["le sondage", "die Umfrage"],
  ["l'opposition", "die Opposition"], ["la majorité", "die Mehrheit"],
  ["la minorité", "die Minderheit"], ["le pouvoir", "die Macht"],
  ["le citoyen", "der Bürger"], ["la citoyenneté", "die Staatsbürgerschaft"],
  ["les droits de l'homme", "die Menschenrechte"], ["la liberté", "die Freiheit"],
  ["la paix", "der Frieden"], ["la guerre", "der Krieg"],
  ["la frontière", "die Grenze"], ["l'Union européenne", "die Europäische Union"],
  ["le traité", "der Vertrag (zwischen Staaten)"], ["les relations franco-allemandes", "die deutsch-französischen Beziehungen"],
  ["le discours", "die Rede"], ["débattre", "debattieren"],
  ["la crise", "die Krise"], ["les impôts", "die Steuern"],
];

// subjonctif-Auslöser: [Ausdruck, verlangt subjonctif?, Erklärung]
const SUBJONCTIF_TRIGGER = [
  ["il faut que", true, "„il faut que“ drückt Notwendigkeit aus und verlangt den subjonctif."],
  ["je veux que", true, "Wunschverben wie „vouloir que“ verlangen den subjonctif."],
  ["je souhaite que", true, "„souhaiter que“ (wünschen) löst den subjonctif aus."],
  ["il est important que", true, "Unpersönliche Wertungen wie „il est important que“ verlangen den subjonctif."],
  ["il est possible que", true, "Möglichkeit („il est possible que“) verlangt den subjonctif."],
  ["je doute que", true, "Zweifel („douter que“) löst den subjonctif aus."],
  ["j'ai peur que", true, "Gefühle wie Angst („avoir peur que“) verlangen den subjonctif."],
  ["je suis content que", true, "Gefühlsausdrücke wie „être content que“ verlangen den subjonctif."],
  ["bien que", true, "Die Konjunktion „bien que“ (obwohl) steht immer mit subjonctif."],
  ["pour que", true, "Finales „pour que“ (damit) verlangt den subjonctif."],
  ["avant que", true, "„avant que“ (bevor) steht mit subjonctif."],
  ["il ne pense pas que", true, "Verneintes „penser que“ drückt Zweifel aus → subjonctif."],
  ["je sais que", false, "„savoir que“ drückt Gewissheit aus → indicatif, kein subjonctif."],
  ["je pense que", false, "Bejahtes „penser que“ steht mit indicatif."],
  ["il est certain que", false, "Gewissheit („il est certain que“) verlangt den indicatif."],
  ["j'espère que", false, "Achtung: „espérer que“ steht bejaht mit indicatif (oft futur)."],
  ["il est évident que", false, "„il est évident que“ (offensichtlich) → indicatif."],
  ["parce que", false, "Kausales „parce que“ steht mit indicatif."],
  ["pendant que", false, "Temporales „pendant que“ (während) steht mit indicatif."],
  ["après que", false, "„après que“ steht (nach der Norm) mit indicatif — anders als „avant que“."],
];

// Konnektoren: [französisch, deutsch]
const KONNEKTOREN = [
  ["d'abord", "zuerst"], ["ensuite", "danach / anschließend"],
  ["enfin", "schließlich"], ["puis", "dann"],
  ["cependant", "jedoch / dennoch"], ["pourtant", "dennoch / trotzdem"],
  ["néanmoins", "nichtsdestotrotz"], ["en revanche", "dagegen / hingegen"],
  ["par contre", "hingegen"], ["tandis que", "während (Gegensatz)"],
  ["alors que", "während / wohingegen"], ["donc", "also / folglich"],
  ["par conséquent", "folglich / infolgedessen"], ["c'est pourquoi", "deshalb"],
  ["ainsi", "so / auf diese Weise"], ["grâce à", "dank"],
  ["à cause de", "wegen (negativ)"], ["en raison de", "aufgrund von"],
  ["malgré", "trotz"], ["en effet", "in der Tat / nämlich"],
  ["d'ailleurs", "übrigens / im Übrigen"], ["de plus", "außerdem"],
  ["en outre", "überdies / außerdem"], ["par exemple", "zum Beispiel"],
  ["en ce qui concerne", "was ... betrifft"], ["quant à", "was ... angeht"],
  ["d'une part … d'autre part", "einerseits … andererseits"],
  ["en résumé", "zusammenfassend"], ["en conclusion", "abschließend"],
  ["bref", "kurz gesagt"], ["autrement dit", "anders gesagt"],
  ["au contraire", "im Gegenteil"], ["sinon", "sonst / andernfalls"],
  ["à condition que", "unter der Bedingung, dass"], ["même si", "auch wenn / selbst wenn"],
];

// Verben für futur simple/conditionnel: [Infinitiv, Stamm, deutsch]
const FUTUR_VERBEN = [
  ["parler", "parler", "sprechen"], ["regarder", "regarder", "anschauen"],
  ["finir", "finir", "beenden"], ["choisir", "choisir", "wählen"],
  ["être", "ser", "sein"], ["avoir", "aur", "haben"],
  ["aller", "ir", "gehen"], ["faire", "fer", "machen"],
  ["venir", "viendr", "kommen"], ["voir", "verr", "sehen"],
  ["pouvoir", "pourr", "können"], ["devoir", "devr", "müssen"],
  ["savoir", "saur", "wissen"], ["vouloir", "voudr", "wollen"],
  ["prendre", "prendr", "nehmen"], ["dire", "dir", "sagen"],
  ["recevoir", "recevr", "erhalten"], ["envoyer", "enverr", "schicken"],
];
const PERSONEN = [
  ["je", 0], ["tu", 1], ["il/elle", 2], ["nous", 3], ["vous", 4], ["ils/elles", 5],
];
const FUTUR_ENDUNGEN = ["ai", "as", "a", "ons", "ez", "ont"];
const COND_ENDUNGEN = ["ais", "ais", "ait", "ions", "iez", "aient"];

function konjug(stamm, endungen, idx, pronomen) {
  const form = stamm + endungen[idx];
  const pron = pronomen === "je" && /^[aeiouéè]/.test(form) ? "j'" : pronomen + " ";
  return pron + form;
}

function franzoesisch3Generators(klasse) {
  const gens = [];
  const themaVon = (fr) => {
    const i = FR_VOKABELN.findIndex(([f]) => f === fr);
    return i < 44 ? "Vokabeln: Gesellschaft" : i < 86 ? "Vokabeln: Umwelt" : "Vokabeln: Politik";
  };

  // Vokabeln FR → DE
  gens.push((r) => {
    const [fr, de] = r.pick(FR_VOKABELN);
    const andere = FR_VOKABELN.map(([, d]) => d).filter((d) => d !== de);
    return mc(r, themaVon(fr),
      `${r.pick(LEADS)}Was bedeutet „${fr}“ auf Deutsch?`,
      de, pickN(r, andere, de, 3),
      `„${fr}“ heißt auf Deutsch: ${de}.`);
  });
  // Vokabeln DE → FR
  gens.push((r) => {
    const [fr, de] = r.pick(FR_VOKABELN);
    const andere = FR_VOKABELN.map(([f]) => f).filter((f) => f !== fr);
    return mc(r, themaVon(fr),
      `${r.pick(LEADS)}Wie heißt „${de}“ auf Französisch?`,
      fr, pickN(r, andere, fr, 3),
      `„${de}“ heißt auf Französisch: ${fr}.`);
  });

  // subjonctif: verlangt der Ausdruck den subjonctif?
  gens.push((r) => {
    const [ausdruck, ja, e] = r.pick(SUBJONCTIF_TRIGGER);
    const richtig = ja ? "subjonctif" : "indicatif";
    return mc(r, "Subjonctif",
      `${r.pick(LEADS)}Welcher Modus folgt auf „${ausdruck} …“?`,
      richtig, ["subjonctif", "indicatif", "impératif", "participe passé"].filter((x) => x !== richtig),
      e);
  });
  // subjonctif: Auslöser herausfinden
  gens.push((r) => {
    const mitSubj = SUBJONCTIF_TRIGGER.filter(([, ja]) => ja).map(([a]) => a);
    const ohneSubj = SUBJONCTIF_TRIGGER.filter(([, ja]) => !ja).map(([a]) => a);
    const richtig = r.pick(mitSubj);
    return mc(r, "Subjonctif",
      `${r.pick(LEADS)}Nach welchem dieser Ausdrücke steht der subjonctif?`,
      richtig, pickN(r, ohneSubj, richtig, 3),
      `„${richtig}“ verlangt den subjonctif – die übrigen Ausdrücke stehen mit indicatif.`);
  });

  // Konnektoren FR → DE und DE → FR
  gens.push((r) => {
    const [fr, de] = r.pick(KONNEKTOREN);
    const andere = KONNEKTOREN.map(([, d]) => d).filter((d) => d !== de);
    return mc(r, "Konnektoren",
      `${r.pick(LEADS)}Was bedeutet der Konnektor „${fr}“?`,
      de, pickN(r, andere, de, 3),
      `„${fr}“ = ${de}.`);
  });
  gens.push((r) => {
    const [fr, de] = r.pick(KONNEKTOREN);
    const andere = KONNEKTOREN.map(([f]) => f).filter((f) => f !== fr);
    return mc(r, "Konnektoren",
      `${r.pick(LEADS)}Mit welchem Konnektor drückst du „${de}“ aus?`,
      fr, pickN(r, andere, fr, 3),
      `„${de}“ = ${fr}.`);
  });

  // futur simple
  gens.push((r) => {
    const [inf, stamm, de] = r.pick(FUTUR_VERBEN);
    const [pron, idx] = r.pick(PERSONEN);
    const richtig = konjug(stamm, FUTUR_ENDUNGEN, idx, pron);
    const falsch = [
      konjug(stamm, COND_ENDUNGEN, idx, pron),
      konjug(stamm, FUTUR_ENDUNGEN, (idx + 2) % 6, pron),
      konjug(inf === stamm ? inf + "e" : inf, FUTUR_ENDUNGEN, idx, pron),
    ];
    return mc(r, "Futur simple",
      `${r.pick(LEADS)}Setze „${inf}“ (${de}) ins futur simple: ${pron} …?`,
      richtig, falsch,
      `Futur simple: Stamm „${stamm}-“ + Endung -${FUTUR_ENDUNGEN[idx]} → ${richtig}.`);
  });
  // conditionnel présent
  gens.push((r) => {
    const [inf, stamm, de] = r.pick(FUTUR_VERBEN);
    const [pron, idx] = r.pick(PERSONEN);
    const richtig = konjug(stamm, COND_ENDUNGEN, idx, pron);
    const falsch = [
      konjug(stamm, FUTUR_ENDUNGEN, idx, pron),
      konjug(stamm, COND_ENDUNGEN, (idx + 3) % 6, pron),
      konjug(inf === stamm ? inf + "e" : inf, COND_ENDUNGEN, idx, pron),
    ];
    return mc(r, "Conditionnel",
      `${r.pick(LEADS)}Setze „${inf}“ (${de}) ins conditionnel présent: ${pron} …?`,
      richtig, falsch,
      `Conditionnel: Futur-Stamm „${stamm}-“ + Imparfait-Endung -${COND_ENDUNGEN[idx]} → ${richtig}.`);
  });
  // futur oder conditionnel erkennen
  gens.push((r) => {
    const [inf, stamm] = r.pick(FUTUR_VERBEN);
    const [pron, idx] = r.pick(PERSONEN);
    const istFutur = r.next() < 0.5;
    const form = konjug(stamm, istFutur ? FUTUR_ENDUNGEN : COND_ENDUNGEN, idx, pron);
    const richtig = istFutur ? "futur simple" : "conditionnel présent";
    return mc(r, istFutur ? "Futur simple" : "Conditionnel",
      `${r.pick(LEADS)}Welche Zeitform/Modus ist „${form}“ (von ${inf})?`,
      richtig, ["futur simple", "conditionnel présent", "imparfait", "passé composé"].filter((x) => x !== richtig),
      `Endung -${(istFutur ? FUTUR_ENDUNGEN : COND_ENDUNGEN)[idx]} nach dem Futur-Stamm „${stamm}-“ → ${richtig}.`);
  });

  // Kl. 13 leicht anspruchsvoller gewichten: zusätzlicher Grammatik-Generator
  if (klasse >= 12) {
    gens.push((r) => {
      const [inf, stamm, de] = r.pick(FUTUR_VERBEN.filter(([i, s]) => i !== s));
      const andere = FUTUR_VERBEN.map(([, s]) => s).filter((s) => s !== stamm);
      return mc(r, "Futur simple",
        `${r.pick(LEADS)}Wie lautet der (unregelmäßige) Futur-Stamm von „${inf}“ (${de})?`,
        `${stamm}-`, pickN(r, andere.map((s) => `${s}-`), `${stamm}-`, 3),
        `„${inf}“ bildet futur simple und conditionnel mit dem Stamm „${stamm}-“ (z. B. il ${stamm}${FUTUR_ENDUNGEN[2]}).`);
    });
  }

  return gens;
}

/* ══════════════════ 4) GESCHICHTE Klasse 5 ══════════════════ */

const STEINZEIT_FAKTEN = [
  ["Wie nennt man die längste und älteste Epoche der Menschheitsgeschichte?", "die Steinzeit", ["die Bronzezeit", "das Mittelalter", "die Neuzeit"], "Die Steinzeit dauerte mehrere Millionen Jahre – Werkzeuge wurden aus Stein gefertigt."],
  ["Woraus stellten die Menschen der Steinzeit ihre wichtigsten Werkzeuge her?", "aus Stein (z. B. Feuerstein), Holz und Knochen", ["aus Eisen", "aus Plastik", "aus Glas"], "Namensgebend für die Steinzeit sind die Werkzeuge aus Stein wie der Faustkeil."],
  ["Wie heißt das berühmteste Universalwerkzeug der Altsteinzeit?", "der Faustkeil", ["der Hammer aus Eisen", "die Schere", "der Pflug"], "Der Faustkeil lag in der Faust und diente zum Schneiden, Schaben und Graben."],
  ["Wie lebten die Menschen der Altsteinzeit?", "als umherziehende Jäger und Sammler", ["in großen Städten", "als sesshafte Bauern", "in Burgen"], "Altsteinzeitmenschen folgten den Tierherden und sammelten Früchte, Wurzeln und Beeren."],
  ["Warum war das Feuer für die Steinzeitmenschen so wichtig?", "es spendete Wärme und Licht, schützte vor Tieren und machte Nahrung bekömmlicher", ["es wurde nur für Feuerwerke genutzt", "es diente allein zum Schmelzen von Eisen", "es war unwichtig"], "Feuer bedeutete Wärme, Schutz, Licht und gegartes Essen – ein riesiger Fortschritt."],
  ["Wo haben Menschen der Altsteinzeit unter anderem Schutz gesucht?", "in Höhlen und einfachen Zelten aus Fellen", ["in Steinburgen", "in Hochhäusern", "in Holzvillen mit Fenstern"], "Als Nomaden nutzten sie Höhlen, Felsdächer und Zelte aus Stangen und Tierfellen."],
  ["Was zeigen die berühmten Höhlenmalereien von Lascaux in Frankreich vor allem?", "Tiere wie Pferde, Hirsche und Stiere", ["Autos und Straßen", "Könige mit Kronen", "Segelschiffe"], "Die Steinzeitkünstler malten vor allem Jagdtiere an die Höhlenwände."],
  ["Welche riesigen, behaarten Rüsseltiere jagten Steinzeitmenschen während der Eiszeit?", "Mammuts", ["Elefantenrobben", "Giraffen", "Nashörner aus Afrika"], "Das Wollhaarmammut lieferte Fleisch, Fell, Knochen und Elfenbein."],
  ["Was veränderte sich in der Jungsteinzeit (neolithische Revolution) grundlegend?", "die Menschen wurden sesshaft und begannen mit Ackerbau und Viehzucht", ["die Menschen zogen wieder als Jäger umher", "die Schrift wurde abgeschafft", "die Menschen erfanden das Auto"], "Ackerbau und Viehzucht machten die Menschen sesshaft – der größte Umbruch der Frühgeschichte."],
  ["Welche Tiere zähmten und hielten die Menschen der Jungsteinzeit unter anderem?", "Schafe, Ziegen, Rinder und Schweine", ["Löwen und Tiger", "Pinguine", "Dinosaurier"], "Aus Wildtieren wurden Haustiere – sie lieferten Fleisch, Milch, Wolle und Arbeitskraft."],
  ["Welches Getreide bauten frühe Bauern in unserer Region unter anderem an?", "Emmer und Einkorn (frühe Weizenarten)", ["Reis aus Terrassenfeldern", "Mais aus Amerika", "Kakao"], "Emmer, Einkorn und Gerste gehörten zu den ersten angebauten Getreidearten."],
  ["Welche neuen Handwerke entstanden in der Jungsteinzeit?", "Töpfern und Weben", ["Buchdruck und Glasbläserei", "Schmieden von Stahl", "Uhrmacherei"], "Sesshafte Menschen stellten Tongefäße her und webten Stoffe aus Wolle und Flachs."],
  ["Wie nennt man die Zeit nach der Steinzeit, in der Werkzeuge aus einer Metallmischung gegossen wurden?", "die Bronzezeit", ["die Eisenzeit kam zuerst", "die Plastikzeit", "die Steinzeit 2"], "Auf die Steinzeit folgte die Bronzezeit – Bronze ist eine Mischung aus Kupfer und Zinn."],
  ["Woraus besteht Bronze?", "aus Kupfer und Zinn", ["aus Eisen und Gold", "aus Silber und Blei", "aus Stein und Holz"], "Bronze ist eine Legierung aus Kupfer und Zinn."],
  ["Wer war „Ötzi“?", "eine über 5000 Jahre alte Gletschermumie aus den Alpen", ["ein ägyptischer Pharao", "ein römischer Kaiser", "ein Ritter aus dem Mittelalter"], "Ötzi wurde 1991 in den Ötztaler Alpen gefunden – seine Ausrüstung verrät viel über die Jungsteinzeit."],
  ["Womit jagten Steinzeitmenschen aus der Ferne?", "mit Speer, Speerschleuder und später Pfeil und Bogen", ["mit Gewehren", "mit Kanonen", "mit Armbrüsten aus Stahl"], "Speerschleuder und Bogen erhöhten Reichweite und Treffsicherheit bei der Jagd."],
  ["Wie nennt man Menschen, die ohne festen Wohnsitz umherziehen?", "Nomaden", ["Bürger", "Mönche", "Ritter"], "Die Jäger und Sammler der Altsteinzeit lebten als Nomaden."],
  ["Warum wissen wir ohne schriftliche Quellen etwas über die Steinzeit?", "durch Funde wie Werkzeuge, Knochen und Malereien (Archäologie)", ["aus Zeitungsberichten der Steinzeit", "aus Fernsehinterviews", "aus Steinzeit-Tagebüchern"], "Archäologen erschließen die schriftlose Frühgeschichte aus Bodenfunden."],
  ["Wie nennt man die Wissenschaft, die alte Überreste ausgräbt und erforscht?", "Archäologie", ["Astrologie", "Biologie", "Geometrie"], "Die Archäologie untersucht materielle Hinterlassenschaften vergangener Kulturen."],
  ["Was bedeutet „sesshaft werden“?", "an einem festen Ort wohnen bleiben", ["ständig umherziehen", "auf Bäumen leben", "nur im Winter wandern"], "Mit Ackerbau und Viehzucht blieben die Menschen dauerhaft an einem Ort – sie wurden sesshaft."],
];

const AEGYPTEN_FAKTEN = [
  ["An welchem Fluss entstand die Hochkultur der alten Ägypter?", "am Nil", ["am Rhein", "am Euphrat", "am Amazonas"], "Ägypten gilt als „Geschenk des Nils“ – ohne den Fluss wäre das Land Wüste."],
  ["Warum war die jährliche Nilschwemme für Ägypten so wichtig?", "sie hinterließ fruchtbaren Schlamm auf den Feldern", ["sie zerstörte absichtlich die Städte", "sie brachte Schnee", "sie war völlig unwichtig"], "Das Hochwasser lagerte fruchtbaren Schlamm ab – Grundlage für reiche Ernten."],
  ["Wie hieß der König im alten Ägypten?", "Pharao", ["Kaiser", "Sultan", "Konsul"], "Der Pharao war König und wurde zugleich als gottähnlicher Herrscher verehrt."],
  ["Als was galt der Pharao bei den Ägyptern?", "als gottähnlicher Herrscher (Sohn des Sonnengottes)", ["als einfacher Beamter", "als gewählter Präsident", "als Sklave"], "Der Pharao galt als Mittler zwischen Göttern und Menschen."],
  ["Wozu dienten die großen Pyramiden?", "als Grabmäler für Pharaonen", ["als Wohnhäuser", "als Getreidespeicher für alle", "als Schulen"], "Pyramiden waren gewaltige Königsgräber, gefüllt mit Grabbeigaben."],
  ["Wo stehen die berühmtesten Pyramiden Ägyptens?", "in Gizeh", ["in Kairo-Mitte", "in Alexandria", "in Theben-West nur"], "Die Pyramiden von Gizeh mit der Cheops-Pyramide zählen zu den Weltwundern."],
  ["Wie heißt die größte Pyramide von Gizeh?", "die Cheops-Pyramide", ["die Tutanchamun-Pyramide", "die Kleopatra-Pyramide", "die Sphinx-Pyramide"], "Die Cheops-Pyramide ist mit ursprünglich rund 147 m Höhe die größte."],
  ["Welche Figur mit Löwenkörper und Menschenkopf bewacht die Pyramiden von Gizeh?", "die Sphinx", ["der Minotaurus", "der Greif", "der Drache"], "Die Große Sphinx von Gizeh hat einen Löwenkörper und einen Menschenkopf."],
  ["Wie nannten die Ägypter ihre Bilderschrift?", "Hieroglyphen", ["Keilschrift", "Runen", "lateinische Schrift"], "Die Hieroglyphen sind eine Schrift aus Bildzeichen."],
  ["Worauf schrieben die alten Ägypter?", "auf Papyrus", ["auf Papier aus Holz", "auf Plastikfolie", "auf Pergament aus Ziegenleder nur"], "Aus der Papyruspflanze stellten die Ägypter ein Schreibmaterial her – Vorläufer unseres Papiers."],
  ["Wer konnte im alten Ägypten meist lesen und schreiben und war deshalb hoch angesehen?", "die Schreiber", ["alle Bauern", "alle Kinder", "nur die Sklavenaufseher"], "Schreiber verwalteten Steuern und Vorräte – Lesen und Schreiben war ein Privileg."],
  ["Warum mumifizierten die Ägypter ihre Toten?", "sie glaubten, der Körper werde im Jenseits weiter gebraucht", ["um Platz zu sparen", "aus hygienischen Gründen allein", "um sie später auszustellen"], "Für das Leben nach dem Tod sollte der Körper erhalten bleiben – daher die Mumifizierung."],
  ["In welchen kunstvollen Behältern wurden Mumien bestattet?", "in Sarkophagen", ["in Amphoren", "in Truhen aus Eisen", "in Glasvitrinen"], "Mumien lagen oft in mehreren, reich verzierten Särgen – dem Sarkophag."],
  ["Welcher Pharao wurde durch sein fast unberührtes Grab mit der goldenen Totenmaske weltberühmt?", "Tutanchamun", ["Ramses II. nur", "Echnaton", "Cheops"], "Howard Carter fand 1922 das Grab des Tutanchamun im Tal der Könige."],
  ["Wie hieß die berühmte Pharaonin, die als eine der wenigen Frauen Ägypten regierte?", "Hatschepsut", ["Nofretete war Pharaonin", "Isis", "Athene"], "Hatschepsut regierte als Pharaonin und ließ prächtige Tempel errichten."],
  ["Welcher Gott wurde als Sonnengott im alten Ägypten besonders verehrt?", "Ra (Re)", ["Zeus", "Jupiter", "Odin"], "Der Sonnengott Ra zählte zu den wichtigsten Göttern Ägyptens."],
  ["Welcher ägyptische Gott mit Schakalkopf war für die Totenwelt zuständig?", "Anubis", ["Horus", "Ra", "Osiris hatte einen Falkenkopf"], "Anubis, der Gott mit dem Schakalkopf, wachte über Mumifizierung und Totenreich."],
  ["Welches Tier war den Ägyptern heilig und wurde sogar mumifiziert?", "die Katze", ["das Kaninchen", "der Pinguin", "das Meerschweinchen"], "Katzen galten als heilig – ihre Tötung wurde streng bestraft."],
  ["Wo wurden viele Pharaonen des Neuen Reiches statt in Pyramiden bestattet?", "im Tal der Könige", ["im Tal des Todes in Amerika", "auf dem Berg Olymp", "in Karthago"], "Im Tal der Könige bei Theben liegen Felsengräber vieler Pharaonen, z. B. Tutanchamuns."],
  ["Womit bewässerten die ägyptischen Bauern ihre Felder?", "mit Kanälen und Schöpfgeräten wie dem Schaduf", ["mit elektrischen Pumpen", "mit Regenmaschinen", "gar nicht"], "Kanäle, Deiche und der Schaduf verteilten das Nilwasser auf die Felder."],
  ["Wie nennt man die Jahreszeitenordnung der Ägypter rund um den Nil?", "Überschwemmung, Aussaat und Ernte", ["Frühling, Sommer, Herbst und Winter", "Regenzeit und Trockenzeit ohne Ernte", "Monsun und Taifun"], "Der ägyptische Kalender folgte dem Nil: Achet (Flut), Peret (Aussaat), Schemu (Ernte)."],
  ["Wer verrichtete die schwere Arbeit beim Pyramidenbau nach heutigem Forschungsstand vor allem?", "gut organisierte ägyptische Arbeiter und Bauern", ["Roboter", "römische Legionäre", "Wikinger"], "Zehntausende Arbeiter – oft Bauern während der Nilflut – schufteten in Bautrupps am Pyramidenbau."],
  ["Wie hieß die letzte berühmte Königin des alten Ägypten?", "Kleopatra", ["Hatschepsut war die letzte", "Nofretete", "Helena"], "Kleopatra VII. war die letzte Herrscherin des Ptolemäerreiches, danach wurde Ägypten römisch."],
];

const HOCHKULTUREN_FAKTEN = [
  ["Wie nennt man frühe Kulturen mit Städten, Schrift, Staat und Arbeitsteilung?", "Hochkulturen", ["Steinzeithorden", "Ritterorden", "Stadtstaaten der Neuzeit"], "Merkmale von Hochkulturen: Städte, Schrift, Verwaltung/Staat, Religion und Arbeitsteilung."],
  ["An welchen Flüssen lag Mesopotamien, das „Zweistromland“?", "an Euphrat und Tigris", ["an Nil und Kongo", "an Rhein und Donau", "an Wolga und Don"], "Mesopotamien bedeutet „Land zwischen den Strömen“ – Euphrat und Tigris."],
  ["Welches Volk in Mesopotamien entwickelte eine der ersten Schriften?", "die Sumerer", ["die Wikinger", "die Römer", "die Germanen"], "Die Sumerer entwickelten um 3000 v. Chr. die Keilschrift."],
  ["Wie heißt die Schrift der Sumerer, die in Ton geritzt wurde?", "Keilschrift", ["Hieroglyphen", "Runenschrift", "Blockschrift"], "Mit Schreibgriffeln drückten die Sumerer keilförmige Zeichen in weiche Tontafeln."],
  ["Warum entstanden die ersten Hochkulturen fast alle an großen Flüssen?", "die Flüsse machten die Böden fruchtbar und ermöglichten Bewässerung und Handel", ["dort gab es das beste WLAN", "Flüsse schützten vor jeder Krankheit", "reiner Zufall"], "Wasser bedeutete Ernten, Transport und Handel – Grundlage für Städte und Staaten."],
  ["An welchem Fluss entstand die frühe Hochkultur Indiens (Induskultur)?", "am Indus", ["am Nil", "am Mississippi", "an der Themse"], "Die Induskultur mit Städten wie Mohenjo-Daro entstand am Fluss Indus."],
  ["An welchen Flüssen entwickelte sich die frühe chinesische Hochkultur?", "am Gelben Fluss (Huang He) und am Jangtse", ["am Nil und Kongo", "an Rhein und Elbe", "am Amazonas"], "Chinas früheste Kulturen entstanden an Huang He und Jangtse."],
  ["Welcher berühmte babylonische König ließ eine der ältesten Gesetzessammlungen aufschreiben?", "Hammurapi", ["Caesar", "Alexander der Große", "Ramses II."], "Der Codex Hammurapi (um 1750 v. Chr.) ist eine der ältesten überlieferten Gesetzessammlungen."],
  ["Wie hießen die gewaltigen Stufentempel in Mesopotamien?", "Zikkurate", ["Pyramiden von Gizeh", "Amphitheater", "Kathedralen"], "Zikkurate waren Stufentürme mit Tempeln – Wahrzeichen mesopotamischer Städte."],
  ["Welche wichtige Erfindung für Transport und Töpferei stammt aus Mesopotamien?", "das Rad", ["der Computer", "das Steinbeil", "der Kompass kam aus Ägypten"], "Rad und Töpferscheibe wurden in Mesopotamien schon vor über 5000 Jahren genutzt."],
  ["Warum war die Erfindung der Schrift so wichtig für die Hochkulturen?", "Vorräte, Steuern und Gesetze konnten festgehalten werden", ["man konnte damit besser jagen", "sie war nur zur Dekoration da", "sie ersetzte das Sprechen"], "Verwaltung großer Städte brauchte Aufzeichnungen – so entstand die Schrift."],
  ["Was bedeutet Arbeitsteilung in einer Hochkultur?", "nicht alle arbeiten als Bauern – es gibt z. B. Handwerker, Händler, Priester und Beamte", ["jeder macht alles selbst", "nur der König arbeitet", "niemand arbeitet"], "Ernteüberschüsse erlaubten Berufe jenseits der Landwirtschaft – ein Merkmal von Hochkulturen."],
  ["Womit trieben die frühen Hochkulturen untereinander Handel?", "mit Waren wie Getreide, Stoffen, Metallen und Schmuck – oft im Tauschhandel", ["mit Kreditkarten", "mit Papiergeld aus Baumwolle", "gar nicht"], "Vor der Erfindung der Münzen tauschte man Waren oder wog Silber ab."],
  ["Wie zählten und rechneten die Sumerer unter anderem?", "im Sechziger-System – daher haben Stunde und Minute 60 Einheiten", ["nur mit römischen Zahlen", "im Zehnersystem wie wir – sonst nichts", "gar nicht"], "Unser 60-Minuten- und 360-Grad-System geht auf die Sumerer und Babylonier zurück."],
  ["Was war eine wichtige Aufgabe der Priester in frühen Hochkulturen?", "Tempeldienst, Beobachtung des Himmels und Festlegen des Kalenders", ["Autos reparieren", "Zeitungen drucken", "Fußballspiele leiten"], "Priester beobachteten die Sterne, um Aussaat- und Festtermine zu bestimmen."],
  ["In welchem heutigen Land lag Mesopotamien größtenteils?", "im Irak", ["in Spanien", "in Norwegen", "in Japan"], "Das Kernland Mesopotamiens liegt im heutigen Irak."],
  ["Was ermöglichte den Bauern der Flusskulturen Ernteüberschüsse?", "Bewässerungsanlagen wie Kanäle und Deiche", ["Kunstdünger aus Fabriken", "Traktoren", "Gewächshäuser aus Glas"], "Mit Kanälen, Dämmen und Speichern nutzten sie das Flusswasser – die Erträge stiegen."],
  ["Wie veränderten Städte das Zusammenleben der Menschen?", "es entstanden Verwaltung, Märkte, Tempel und feste Regeln", ["alle Menschen wurden wieder Jäger", "es gab keine Regeln mehr", "jeder lebte allein"], "In Städten mussten viele Menschen organisiert werden – Staat und Verwaltung entstanden."],
];

// Mehr Frage-Einstiege, damit aus der Faktenbank genug eindeutige Texte entstehen.
const GESCHICHTE_LEADS = [
  ...LEADS,
  "Geschichts-Quiz: ",
  "Zeitreise in die Frühgeschichte: ",
  "Weißt du es? ",
  "Frage aus dem Geschichtsunterricht: ",
];

function geschichte3Generators() {
  const gens = [];
  gens.push((r) => {
    const [q, a, d, e] = r.pick(STEINZEIT_FAKTEN);
    return mc(r, "Steinzeit", `${r.pick(GESCHICHTE_LEADS)}${q}`, a, r.shuffle(d), e);
  });
  gens.push((r) => {
    const [q, a, d, e] = r.pick(AEGYPTEN_FAKTEN);
    return mc(r, "Altes Ägypten", `${r.pick(GESCHICHTE_LEADS)}${q}`, a, r.shuffle(d), e);
  });
  gens.push((r) => {
    const [q, a, d, e] = r.pick(HOCHKULTUREN_FAKTEN);
    return mc(r, "Erste Hochkulturen", `${r.pick(GESCHICHTE_LEADS)}${q}`, a, r.shuffle(d), e);
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

  console.log("Informatik-Grundlagen (Klasse 5–6, je >= 300):");
  for (let k = 5; k <= 6; k++)
    total += writeBank("informatik4", k, generateBank(141000 + k, 300, informatik4Generators(k)), 300);

  console.log("Wirtschaft (Klasse 9–13, je >= 300):");
  for (let k = 9; k <= 13; k++)
    total += writeBank("wirtschaft2", k, generateBank(142000 + k, 300, wirtschaft2Generators(k)), 300);

  console.log("Französisch-Oberstufe (Klasse 11–13, je >= 300):");
  for (let k = 11; k <= 13; k++)
    total += writeBank("franzoesisch3", k, generateBank(143000 + k, 300, franzoesisch3Generators(k)), 300);

  console.log("Geschichte (Klasse 5, >= 300):");
  total += writeBank("geschichte3", 5, generateBank(144005, 300, geschichte3Generators()), 300);

  console.log(`\nGesamt (Runde 14): ${total} Fragen.`);
}

main();
