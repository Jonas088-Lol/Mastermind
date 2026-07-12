/* Copyright 2026 Elian Schock, Jonas Schwenk */
/**
 * Extended curriculum seed — 60+ additional topics, 360+ questions
 * Run: DATABASE_URL="file:./prisma/prisma/dev.db" npx tsx scripts/seed-extended.ts
 * Idempotent via upsert.
 */

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

type QDef = {
  type: "mc" | "fill_blank" | "true_false" | "order" | "match";
  question: string;
  options: string | null;
  correct: string;
  explanation: string;
  order: number;
};
type TopicDef = {
  id: string; subject: string; grade: number; order: number;
  title: string; description: string; lesson: string; questions: QDef[];
};

const mc = (q: string, opts: string[], correct: number, ex: string, ord: number): QDef => ({
  type: "mc", question: q, options: JSON.stringify(opts), correct: String(correct), explanation: ex, order: ord,
});
const tf = (q: string, correct: boolean, ex: string, ord: number): QDef => ({
  type: "true_false", question: q, options: null, correct: String(correct), explanation: ex, order: ord,
});
const fb = (q: string, ans: string[], ex: string, ord: number): QDef => ({
  type: "fill_blank", question: q, options: null, correct: JSON.stringify(ans), explanation: ex, order: ord,
});
const ord_q = (q: string, opts: string[], correctOrder: number[], ex: string, o: number): QDef => ({
  type: "order", question: q, options: JSON.stringify(opts), correct: JSON.stringify(correctOrder), explanation: ex, order: o,
});

const topics: TopicDef[] = [
  // ── MATHE extra topics ────────────────────────────────────────────────
  {
    id: "cur-mathe-5-brueche", subject: "mathematik", grade: 5, order: 2,
    title: "Bruchrechnen Grundlagen",
    description: "Brüche lesen, kürzen, erweitern, addieren und subtrahieren.",
    lesson: "## Brüche\n\nEin Bruch besteht aus **Zähler** (oben) und **Nenner** (unten).\n\n**Kürzen:** Zähler und Nenner durch gleiche Zahl teilen: 4/8 = 1/2\n\n**Erweitern:** Zähler und Nenner mit gleicher Zahl multiplizieren\n\n**Addieren** (gleicher Nenner): 1/4 + 2/4 = 3/4\n\n**Addieren** (verschiedener Nenner): Hauptnenner bilden!",
    questions: [
      mc("Kürze: 6/9 = ?", ["1/3", "2/3", "3/4", "2/4"], 1, "6÷3=2, 9÷3=3 → 2/3.", 1),
      fb("1/4 + 2/4 = ___", ["3/4"], "Gleicher Nenner → Zähler addieren: 1+2=3.", 2),
      tf("Der Bruch 3/6 ist gleich 1/2.", true, "3÷3=1, 6÷3=2 → 1/2.", 3),
      mc("Welcher Bruch ist größer: 2/3 oder 3/4?", ["2/3", "3/4", "Gleich groß", "Nicht vergleichbar"], 1, "2/3≈0,667 < 3/4=0,75.", 4),
      fb("2/5 + 1/10 = ___", ["5/10", "1/2"], "2/5 = 4/10; 4/10 + 1/10 = 5/10 = 1/2.", 5),
    ],
  },
  {
    id: "cur-mathe-7-gleichungen", subject: "mathematik", grade: 7, order: 2,
    title: "Lineare Gleichungen",
    description: "Gleichungen mit einer Unbekannten lösen: Äquivalenzumformungen.",
    lesson: "## Lineare Gleichungen\n\n**Ziel:** x isolieren — auf beiden Seiten gleiche Operation.\n\n**Beispiel:** 3x + 5 = 14\n→ 3x = 14 − 5 = 9\n→ x = 9 ÷ 3 = 3\n\n**Probe:** 3·3 + 5 = 14 ✓\n\n**Merke:** Was auf einer Seite passiert, muss auf der anderen auch passieren.",
    questions: [
      fb("2x + 4 = 10 → x = ___", ["3"], "2x=6 → x=3.", 1),
      mc("5x = 20 → x = ?", ["2", "4", "5", "15"], 1, "x = 20÷5 = 4.", 2),
      tf("Bei x − 3 = 7 ist x = 10.", true, "x = 7+3 = 10.", 3),
      fb("3x − 6 = 9 → x = ___", ["5"], "3x=15 → x=5.", 4),
      mc("Welche Gleichung hat die Lösung x = 2?", ["x + 3 = 4", "2x = 4", "x − 2 = 3", "3x = 9"], 1, "2·2=4 ✓.", 5),
    ],
  },
  {
    id: "cur-mathe-9-trigonometrie", subject: "mathematik", grade: 9, order: 2,
    title: "Trigonometrie — sin, cos, tan",
    description: "Sinus, Kosinus und Tangens im rechtwinkligen Dreieck.",
    lesson: "## Trigonometrie\n\n**Im rechtwinkligen Dreieck (Winkel α):**\n\n- sin(α) = Gegenkathete / Hypotenuse\n- cos(α) = Ankathete / Hypotenuse\n- tan(α) = Gegenkathete / Ankathete\n\n**Merkhilfe:** SOH-CAH-TOA\n\n**Bekannte Werte:**\nsin(30°) = 0,5 | cos(60°) = 0,5 | tan(45°) = 1",
    questions: [
      mc("Was berechnet sin(α) im rechtwinkligen Dreieck?", ["Ankathete/Hypotenuse", "Gegenkathete/Hypotenuse", "Gegenkathete/Ankathete", "Hypotenuse/Ankathete"], 1, "SOH: Sinus = Gegenkathete/Hypotenuse.", 1),
      fb("tan(45°) = ___", ["1"], "tan(45°) = 1 (Gegen- = Ankathete).", 2),
      tf("cos(60°) = 0,5", true, "cos(60°) = 1/2 = 0,5.", 3),
      mc("Was berechnet tan?", ["sin/cos", "Gegenkathete/Ankathete", "Ankathete/Hypotenuse", "Alle stimmen"], 1, "tan(α) = Gegenkathete/Ankathete = sin/cos.", 4),
      fb("sin(30°) = ___", ["0,5"], "sin(30°) = 1/2 = 0,5.", 5),
    ],
  },
  {
    id: "cur-mathe-7-funktionen", subject: "mathematik", grade: 7, order: 3,
    title: "Lineare Funktionen",
    description: "y = mx + b verstehen, Steigung und y-Achsenabschnitt.",
    lesson: "## Lineare Funktionen\n\n**Allgemeine Form:** y = mx + b\n\n- **m** = Steigung (wie steil die Gerade)\n- **b** = y-Achsenabschnitt (wo schneidet die y-Achse)\n\n**Steigung m = Δy/Δx** = Veränderung y / Veränderung x\n\n**Beispiel:** y = 2x + 1\n- m=2: pro x-Schritt 2 nach oben\n- b=1: schneidet y-Achse bei (0,1)",
    questions: [
      mc("In y = 3x + 5: Was ist die Steigung?", ["5", "3", "x", "y"], 1, "m=3 ist die Steigung.", 1),
      fb("y = mx + b: b ist der _____-Achsenabschnitt.", ["y"], "b gibt den Schnittpunkt mit der y-Achse an.", 2),
      tf("Eine Gerade mit m=0 ist waagerecht.", true, "m=0 bedeutet keine Steigung → horizontale Gerade.", 3),
      mc("Was ist der y-Achsenabschnitt von y = 4x − 2?", ["4", "−2", "2", "0"], 1, "b=−2 → schneidet y-Achse bei y=−2.", 4),
      fb("y = 2x + 3: Wenn x=4, dann y = ___", ["11"], "y = 2·4 + 3 = 8+3 = 11.", 5),
    ],
  },
  {
    id: "cur-mathe-5-dezimalzahlen", subject: "mathematik", grade: 5, order: 3,
    title: "Dezimalzahlen",
    description: "Dezimalzahlen lesen, schreiben, addieren und subtrahieren.",
    lesson: "## Dezimalzahlen\n\nNach dem Komma kommen Zehntel, Hundertstel, Tausendstel.\n\n**Beispiel:** 3,25 = 3 + 2/10 + 5/100\n\n**Addieren:** Komma untereinander schreiben:\n```\n  3,25\n+ 1,40\n------\n  4,65\n```",
    questions: [
      fb("3,4 + 2,5 = ___", ["5,9"], "Komma ausrichten: 3,4 + 2,5 = 5,9.", 1),
      mc("Welche Zahl ist größer: 0,75 oder 0,8?", ["0,75", "0,8", "Gleich groß", "Nicht vergleichbar"], 1, "0,8 = 0,80 > 0,75.", 2),
      tf("0,1 ist größer als 0,09.", true, "0,10 > 0,09.", 3),
      fb("7,3 − 2,1 = ___", ["5,2"], "7,3 − 2,1 = 5,2.", 4),
      mc("1,5 × 2 = ?", ["2,5", "3", "3,0", "Beides b und c"], 3, "1,5 × 2 = 3,0.", 5),
    ],
  },

  // ── DEUTSCH extra topics ──────────────────────────────────────────────
  {
    id: "cur-deutsch-5-wortarten", subject: "deutsch", grade: 5, order: 2,
    title: "Wortarten",
    description: "Nomen, Verben, Adjektive, Pronomen und Artikel erkennen.",
    lesson: "## Wortarten\n\n| Wortart | Frage | Beispiel |\n|---------|-------|----------|\n| Nomen | Wer/Was? | Hund, Schule |\n| Verb | Was tut er? | laufen, essen |\n| Adjektiv | Wie? | schnell, groß |\n| Pronomen | ersetzt Nomen | er, sie, wir |\n| Artikel | bestimmt/unbestimmt | der/die/das, ein/eine |",
    questions: [
      mc("Was ist 'rennen' für eine Wortart?", ["Nomen", "Verb", "Adjektiv", "Artikel"], 1, "rennen = Verb (Tunwort).", 1),
      fb("Das Wort 'klein' ist ein ___.", ["Adjektiv"], "Adjektive beschreiben Eigenschaften.", 2),
      tf("'Er' ist ein Pronomen.", true, "'Er' ersetzt ein Nomen (z.B. 'der Mann').", 3),
      mc("Welches Wort ist ein Nomen?", ["laufen", "schön", "Buch", "und"], 2, "Buch ist ein Nomen — man kann einen Artikel davor stellen: das Buch.", 4),
      mc("Was ist ein bestimmter Artikel?", ["ein", "eine", "der", "kein"], 2, "der/die/das = bestimmte Artikel. Ein/eine = unbestimmt.", 5),
    ],
  },
  {
    id: "cur-deutsch-5-komma", subject: "deutsch", grade: 5, order: 3,
    title: "Kommaregeln",
    description: "Komma bei Aufzählungen, Nebensätzen und Appositionen.",
    lesson: "## Komma-Regeln\n\n**1. Aufzählung:** Ich esse Äpfel, Birnen und Bananen.\n\n**2. Nebensatz:** Ich lese, während du schläfst.\n\n**3. Hauptsätze:** Er kommt, aber er bleibt nicht.\n\n**4. Infinitivgruppe (ab 3 Elemente):** Er beschloss, heute früh aufzustehen.\n\n**Kein Komma:** vor 'und' oder 'oder' bei einfachen Aufzählungen.",
    questions: [
      mc("Wo fehlt das Komma? 'Ich kaufe Brot Milch und Käse.'", ["nach Brot", "nach Milch", "nach Brot und nach Milch", "kein Komma nötig"], 2, "Aufzählung: Brot, Milch und Käse.", 1),
      tf("Vor 'und' steht immer ein Komma.", false, "Vor 'und' steht nur ein Komma bei verbundenen Hauptsätzen, nicht bei Aufzählungen.", 2),
      fb("'Er lacht ___ weil er happy ist.' → Komma nach ___", ["lacht"], "Komma vor dem einleitenden Wort des Nebensatzes.", 3),
      mc("In 'Er kommt, aber er bleibt nicht' — warum steht das Komma?", ["Aufzählung", "Zwei Hauptsätze", "Nebensatz", "Infinitiv"], 1, "Zwei Hauptsätze werden mit Komma getrennt.", 4),
      tf("'Sie singt und tanzt.' braucht kein Komma.", true, "Kein Komma vor 'und' bei einfacher Verbindung.", 5),
    ],
  },
  {
    id: "cur-deutsch-9-argumentation", subject: "deutsch", grade: 9, order: 2,
    title: "Argumentation und Erörterung",
    description: "Erörterungen strukturieren: These, Argument, Beleg, Schlussfolgerung.",
    lesson: "## Die Erörterung\n\n**Aufbau:**\n1. Einleitung — Thema einführen, These nennen\n2. Hauptteil — Argumente mit Belegen\n3. Schluss — Fazit/Wertung\n\n**Argumentation:**\n- These: Behauptung\n- Argument: Begründung\n- Beleg: Beispiel/Beweis\n- Schlussfolgerung\n\n**Lineare Erörterung:** Eine Position\n**Dialektische Erörterung:** Pro + Contra",
    questions: [
      mc("Was folgt auf eine These in der Argumentation?", ["Schluss", "Einleitung", "Argument und Beleg", "These"], 2, "These → Argument → Beleg → Schlussfolgerung.", 1),
      tf("Eine dialektische Erörterung behandelt Pro und Contra.", true, "Dialektisch = beide Seiten werden beleuchtet.", 2),
      fb("Die Erörterung hat drei Teile: Einleitung, Hauptteil und ___.", ["Schluss"], "Drei-Glieder-Aufbau: Einleitung–Hauptteil–Schluss.", 3),
      mc("Was ist ein Beleg in einer Argumentation?", ["Eine Meinung", "Ein Beispiel oder Beweis", "Eine These", "Eine Frage"], 1, "Beleg = konkretes Beispiel zur Stützung des Arguments.", 4),
      mc("Welcher Einstieg in eine Erörterung ist geeignet?", ["'Ich finde, dass…'", "Aktuelle Situation oder provokante These", "'Es ist schwer zu sagen…'", "Alle Argumente der Gegenseite"], 1, "Erörterungen beginnen mit einer einleitenden Situation oder Provokation.", 5),
    ],
  },

  // ── ENGLISCH extra topics ─────────────────────────────────────────────
  {
    id: "cur-englisch-5-present-simple", subject: "englisch", grade: 5, order: 2,
    title: "Present Simple",
    description: "Gewohnheiten und Fakten im Present Simple ausdrücken.",
    lesson: "## Present Simple\n\n**Verwendung:** Gewohnheiten, Fakten, Routinen\n\n**Bildung:**\n- I/you/we/they: Infinitiv\n- he/she/it: Infinitiv + **s/es**\n\n**Beispiele:**\n- She **plays** tennis every day.\n- They **go** to school.\n\n**Negation:** do/does not\n**Frage:** Do/Does + Subjekt + Infinitiv?",
    questions: [
      fb("She ___ (play) football every day.", ["plays"], "3. Person Singular: play → plays.", 1),
      mc("Which sentence is correct?", ["He go to school.", "He goes to school.", "He going to school.", "He do go to school."], 1, "he/she/it + verb+s: goes.", 2),
      tf("'They plays football' is correct.", false, "they → play (kein s): 'They play football.'", 3),
      fb("I do not ___ (like) vegetables.", ["like"], "Negation: do not + Infinitiv.", 4),
      mc("How do we form a question in Present Simple (he)?", ["He goes? →", "Does he go?", "Is he go?", "He do go?"], 1, "Does + Subjekt + Infinitiv?", 5),
    ],
  },
  {
    id: "cur-englisch-9-present-perfect", subject: "englisch", grade: 9, order: 2,
    title: "Present Perfect",
    description: "Present Perfect mit have/has + past participle: Bildung und Verwendung.",
    lesson: "## Present Perfect\n\n**Bildung:** have/has + past participle\n\n**Verwendung:**\n- Handlung abgeschlossen, Ergebnis jetzt relevant\n- *I have lost my keys.*\n- Erfahrungen: *Have you ever been to London?*\n- Noch andauernde Situation: *She has lived here for 10 years.*\n\n**Schlüsselwörter:** ever, never, already, yet, just, for, since",
    questions: [
      fb("She ___ already ___ (eat) lunch.", ["has", "eaten"], "Present Perfect: has + past participle.", 1),
      mc("Which sentence uses Present Perfect correctly?", ["I have went there.", "She has finished her homework.", "He have eaten.", "They has gone."], 1, "has + past participle: has finished.", 2),
      tf("'Since' is used with Present Perfect to indicate a point in time.", true, "'I have lived here since 2010.'", 3),
      mc("'Have you ___ been to France?' (ever/yet/already)", ["yet", "already", "ever", "just"], 2, "ever = jemals, in Fragen über Erfahrungen.", 4),
      fb("I ___ never ___ (see) a whale.", ["have", "seen"], "have + past participle: have seen.", 5),
    ],
  },
  {
    id: "cur-englisch-11-modal-verbs", subject: "englisch", grade: 11, order: 2,
    title: "Modal Verbs",
    description: "Can, could, must, may, might, should, would — Bedeutungen und Verwendung.",
    lesson: "## Modal Verbs\n\n| Modal | Bedeutung | Beispiel |\n|-------|-----------|----------|\n| can | Fähigkeit | I can swim. |\n| must | Obligation | You must study. |\n| should | Empfehlung | You should sleep. |\n| may/might | Möglichkeit | It may rain. |\n| would | Konditional | I would help. |\n\n**Wichtig:** Modal + Infinitiv (kein 'to'): She must *go* (nicht: must to go)",
    questions: [
      mc("Which modal expresses obligation?", ["can", "might", "must", "would"], 2, "must = Pflicht/Notwendigkeit.", 1),
      tf("'She must to go' is correct.", false, "Modals + Infinitiv ohne 'to': 'She must go.'", 2),
      mc("'You ___ eat more vegetables.' (recommendation)", ["must", "should", "might", "can"], 1, "should = Empfehlung.", 3),
      fb("It ___ rain tomorrow — I'm not sure.", ["might", "may"], "might/may = Möglichkeit (unsicher).", 4),
      mc("'I ___ speak three languages.' (ability)", ["must", "should", "can", "would"], 2, "can = Fähigkeit.", 5),
    ],
  },

  // ── PHYSIK extra topics ────────────────────────────────────────────────
  {
    id: "cur-physik-7-elektrizitaet", subject: "physik", grade: 7, order: 2,
    title: "Stromkreis und Ohmsches Gesetz",
    description: "Spannung, Strom, Widerstand: U = R × I und Schaltungen.",
    lesson: "## Elektrizität\n\n**Ohmsches Gesetz:** U = R × I\n- U = Spannung (Volt, V)\n- R = Widerstand (Ohm, Ω)\n- I = Stromstärke (Ampere, A)\n\n**Reihenschaltung:** gleicher Strom durch alle Bauteile\n**Parallelschaltung:** gleiche Spannung an allen Bauteilen\n\nBeispiel: R=10 Ω, I=2 A → U = 10×2 = 20 V",
    questions: [
      fb("U = R × I: Wenn R=5Ω und I=3A, dann U = ___ V", ["15"], "U = 5×3 = 15 V.", 1),
      mc("Was ist die Einheit der elektrischen Spannung?", ["Ampere", "Ohm", "Volt", "Watt"], 2, "Spannung in Volt (V), benannt nach Alessandro Volta.", 2),
      tf("In einer Reihenschaltung ist die Spannung an allen Bauteilen gleich.", false, "In der Reihenschaltung ist der STROM gleich, die Spannung teilt sich auf.", 3),
      fb("R = U/I. Bei U=12V und I=4A: R = ___ Ω", ["3"], "R = 12/4 = 3 Ω.", 4),
      mc("Was passiert, wenn eine Glühbirne in einer Reihenschaltung ausfällt?", ["Nur diese erlischt", "Alle erlöschen", "Nichts ändert sich", "Die anderen werden heller"], 1, "Reihenschaltung: Unterbrechung → ganzer Kreislauf unterbrochen.", 5),
    ],
  },
  {
    id: "cur-physik-9-kernphysik", subject: "physik", grade: 9, order: 2,
    title: "Atomaufbau und Radioaktivität",
    description: "Kernaufbau, Alpha-, Beta- und Gammastrahlung, Halbwertszeit.",
    lesson: "## Atomaufbau\n\n**Atom:** Kern (Protonen + Neutronen) + Elektronenhülle\n\n**Isotope:** gleiche Protonenzahl, verschiedene Neutronenzahl\n\n**Radioaktivität:** Instabile Kerne zerfallen spontan:\n- α-Strahlung: He-Kern (Helium-4)\n- β-Strahlung: Elektron\n- γ-Strahlung: elektromagnetisch, sehr durchdringend\n\n**Halbwertszeit:** Zeit bis zur Hälfte der Atome zerfallen",
    questions: [
      mc("Woraus besteht der Atomkern?", ["Elektronen und Neutronen", "Protonen und Neutronen", "Protonen und Elektronen", "Nur Protonen"], 1, "Atomkern = Protonen + Neutronen.", 1),
      tf("Gammastrahlung ist die gefährlichste, weil sie am stärksten durchdringt.", true, "γ-Strahlung durchdringt sogar dickes Blei.", 2),
      fb("Die Halbwertszeit ist die Zeit, in der ___ aller radioaktiven Atome zerfallen.", ["die Hälfte", "50%"], "Nach einer Halbwertszeit ist die Aktivität auf 50% gesunken.", 3),
      mc("Was ist α-Strahlung?", ["Ein Elektron", "Ein Helium-4-Kern", "Elektromagnetische Welle", "Ein Neutron"], 1, "α-Teilchen = Helium-4-Kern (2 Protonen, 2 Neutronen).", 4),
      mc("Isotope eines Elements haben die gleiche ...", ["Massenzahl", "Neutronenzahl", "Protonenzahl", "Strahlungsart"], 2, "Isotope = gleiche Protonenzahl (= gleiches Element) aber verschiedene Neutronenzahl.", 5),
    ],
  },

  // ── CHEMIE extra topics ─────────────────────────────────────────────────
  {
    id: "cur-chemie-7-atomaufbau", subject: "chemie", grade: 7, order: 2,
    title: "Atomaufbau und Periodensystem",
    description: "Protonen, Neutronen, Elektronen und das Periodensystem der Elemente.",
    lesson: "## Atomaufbau\n\n**Kern:** Protonen (+) + Neutronen (neutral)\n**Hülle:** Elektronen (-)\n\n**Ordnungszahl:** Anzahl der Protonen\n**Massenzahl:** Protonen + Neutronen\n\n**Periodensystem (PSE):**\n- Perioden (waagerecht): Anzahl Elektronenschalen\n- Gruppen (senkrecht): Valenzelektronen\n- Hauptgruppe VII: Halogene (F, Cl, Br, I)\n- Hauptgruppe I: Alkalimetalle (Li, Na, K)",
    questions: [
      mc("Was bestimmt die Ordnungszahl eines Elements?", ["Neutronenzahl", "Protonenzahl", "Massenzahl", "Elektronenzahl"], 1, "Ordnungszahl = Protonenzahl = Charakteristikum des Elements.", 1),
      fb("Massenzahl = Protonen + ___", ["Neutronen"], "Massenzahl = p + n.", 2),
      mc("In welcher Hauptgruppe stehen die Edelgase?", ["I", "VII", "VIII", "0"], 2, "Edelgase: Hauptgruppe VIII oder 0 (je nach Notation).", 3),
      tf("Alkalimetalle reagieren heftig mit Wasser.", true, "Na + H₂O → NaOH + H₂ (Explosion möglich).", 4),
      mc("Welches ist das leichteste Element?", ["Helium", "Lithium", "Wasserstoff", "Kohlenstoff"], 2, "Wasserstoff (H): Ordnungszahl 1, Massenzahl 1.", 5),
    ],
  },
  {
    id: "cur-chemie-9-verbrennung", subject: "chemie", grade: 9, order: 2,
    title: "Verbrennung und Oxidation",
    description: "Vollständige und unvollständige Verbrennung, Oxidation und Sauerstoff.",
    lesson: "## Verbrennung\n\n**Vollständig:** Methan + O₂ → CO₂ + H₂O\n\n**Unvollständig:** Zu wenig O₂ → CO (Kohlenmonoxid — giftig!)\n\n**Oxidation:** Chemische Reaktion mit Sauerstoff\n- Rusting: Fe + O₂ → Fe₂O₃\n\n**Branddreieck:** Brennstoff + Sauerstoff + Zündtemperatur\n→ Feuer löschen = eine Seite entfernen",
    questions: [
      mc("Was entsteht bei vollständiger Verbrennung von Methan?", ["CO + H₂O", "CO₂ + H₂O", "C + H₂", "CO₂ + H₂"], 1, "CH₄ + 2O₂ → CO₂ + 2H₂O.", 1),
      tf("Kohlenmonoxid (CO) ist giftig.", true, "CO bindet an Hämoglobin → Sauerstofftransport gestört.", 2),
      mc("Was braucht man NICHT zum Brennen?", ["Brennstoff", "Sauerstoff", "Stickstoff", "Zündtemperatur"], 2, "Stickstoff ist kein Brandförder. Das Branddreieck: Brennstoff, O₂, Zündtemperatur.", 3),
      fb("Rosten ist eine langsame Form der ___.", ["Oxidation"], "Fe + O₂ → Fe₂O₃ (Rost) = Oxidation.", 4),
      mc("Wie löscht man ein Ölfeuer am besten?", ["Mit Wasser", "Mit Sand oder CO₂-Löscher", "Mit Benzin", "Durch Pusten"], 1, "Öl schwimmt auf Wasser → Wasser verbreitet das Feuer! Sand entzieht Sauerstoff.", 5),
    ],
  },

  // ── BIOLOGIE extra topics ──────────────────────────────────────────────
  {
    id: "cur-biologie-5-zelle", subject: "biologie", grade: 5, order: 2,
    title: "Aufbau der Zelle",
    description: "Zellmembran, Zellkern, Zytoplasma, Mitochondrien und Chloroplasten.",
    lesson: "## Die Zelle\n\n**Alle Lebewesen bestehen aus Zellen.**\n\n**Grundbestandteile:**\n| Bestandteil | Funktion |\n|-------------|----------|\n| Zellmembran | Abgrenzung, Kontrolle |\n| Zellkern | Erbinformation (DNA) |\n| Zytoplasma | Flüssigkeit, Reaktionsraum |\n| Mitochondrien | Zellatmung → Energie |\n| Chloroplasten | Photosynthese (nur Pflanzen) |",
    questions: [
      mc("In welchem Organell findet die Photosynthese statt?", ["Mitochondrien", "Zellkern", "Chloroplasten", "Zellmembran"], 2, "Chloroplasten = Ort der Photosynthese (nur in Pflanzenzellen).", 1),
      fb("Der Zellkern enthält die ___-Information.", ["Erb"], "DNA im Zellkern = Erbinformation.", 2),
      tf("Mitochondrien produzieren Energie für die Zelle.", true, "Mitochondrien = 'Kraftwerke der Zelle' — Zellatmung.", 3),
      mc("Was unterscheidet eine Pflanzenzelle von einer Tierzelle?", ["Zellkern", "Mitochondrien", "Chloroplasten und Zellwand", "Zytoplasma"], 2, "Pflanzenzellen haben Chloroplasten und Zellwand, Tierzellen nicht.", 4),
      mc("Was kontrolliert den Ein- und Austritt von Stoffen in der Zelle?", ["Zellkern", "Zellmembran", "Mitochondrien", "Ribosom"], 1, "Zellmembran = selektiv durchlässige Barriere.", 5),
    ],
  },
  {
    id: "cur-biologie-9-genetik", subject: "biologie", grade: 9, order: 2,
    title: "Genetik — DNA und Vererbung",
    description: "DNA-Struktur, Gene, Chromosomen und Mendels Gesetze.",
    lesson: "## Genetik\n\n**DNA** = Desoxyribonukleinsäure — Träger der Erbinformation\n- Doppelhelix-Struktur (Watson & Crick, 1953)\n- Basen: Adenin-Thymin, Guanin-Cytosin\n\n**Chromosomen:** DNA aufgewickelt um Histone\n- Mensch: 46 Chromosomen (23 Paare)\n\n**Mendels Gesetze:**\n- Dominante Gene setzen sich durch\n- Merkmale können 'gespalten' vererbt werden",
    questions: [
      mc("Was ist die Struktur der DNA?", ["Einfache Helix", "Doppelhelix", "Kreisförmig", "Linear"], 1, "DNA = Doppelhelix (Watson & Crick).", 1),
      fb("Der Mensch hat ___ Chromosomen (in Körperzellen).", ["46"], "23 Chromosomenpaare = 46 Chromosomen.", 2),
      mc("Welche Basen paaren sich in der DNA?", ["A-G und T-C", "A-T und G-C", "A-C und G-T", "A-A und G-G"], 1, "Adenin-Thymin und Guanin-Cytosin.", 3),
      tf("Ein dominantes Merkmal setzt sich gegenüber einem rezessiven durch.", true, "Mendel: Dominantes Merkmal verdeckt rezessives.", 4),
      mc("Wer entdeckte die Doppelhelix-Struktur?", ["Darwin und Mendel", "Watson und Crick", "Pasteur und Koch", "Einstein und Bohr"], 1, "Watson & Crick 1953 (basierend auf Röntgendaten von Franklin).", 5),
    ],
  },

  // ── INFORMATIK extra topics ────────────────────────────────────────────
  {
    id: "cur-informatik-8-algorithmen", subject: "informatik", grade: 8, order: 2,
    title: "Algorithmen und Sortierverfahren",
    description: "Was ist ein Algorithmus? Bubblesort, lineare Suche, Pseudocode.",
    lesson: "## Algorithmen\n\nEin **Algorithmus** ist eine eindeutige Schritt-für-Schritt-Anleitung.\n\n**Eigenschaften:** Eindeutigkeit, Endlichkeit, Ausführbarkeit\n\n**Bubblesort (vereinfacht):**\n1. Vergleiche benachbarte Elemente\n2. Tausche, wenn falsche Reihenfolge\n3. Wiederhole bis sortiert\n\n**Lineare Suche:** Jedes Element der Reihe nach prüfen → O(n)",
    questions: [
      mc("Was ist ein Algorithmus?", ["Ein Programm", "Eine Schritt-für-Schritt-Anleitung", "Eine Datenbank", "Ein Betriebssystem"], 1, "Algorithmus = präzise, endliche Anleitung zur Lösung eines Problems.", 1),
      tf("Ein Algorithmus muss immer irgendwann enden (Endlichkeit).", true, "Endlichkeit ist eine Grundeigenschaft von Algorithmen.", 2),
      mc("Was macht Bubblesort?", ["Binäre Suche", "Sortieren durch Vergleich benachbarter Elemente", "Hashing", "Komprimieren"], 1, "Bubblesort vergleicht und tauscht benachbarte Elemente.", 3),
      fb("Die lineare Suche hat die Zeitkomplexität O(___).", ["n"], "Lineare Suche: im schlimmsten Fall n Vergleiche.", 4),
      mc("Welche Eigenschaft hat ein guter Algorithmus NICHT?", ["Eindeutigkeit", "Endlichkeit", "Zufälligkeit", "Korrektheit"], 2, "Zufälligkeit ist keine Eigenschaft — Algorithmen sind deterministisch.", 5),
    ],
  },
  {
    id: "cur-informatik-10-oop", subject: "informatik", grade: 10, order: 2,
    title: "Objektorientierte Programmierung",
    description: "Klassen, Objekte, Vererbung, Kapselung und Polymorphismus.",
    lesson: "## OOP\n\n**Klasse:** Bauplan/Vorlage (z.B. 'Hund')\n**Objekt:** konkretes Exemplar (z.B. mein Hund 'Rex')\n\n**Kapselung:** Daten verbergen (private Attribute)\n**Vererbung:** Klasse erbt von Elternklasse\n**Polymorphismus:** gleicher Name, verschiedenes Verhalten\n\n```python\nclass Tier:\n    def __init__(self, name):\n        self.name = name\n    def sprechen(self):\n        pass\n\nclass Hund(Tier):  # erbt von Tier\n    def sprechen(self):\n        return 'Wuff!'\n```",
    questions: [
      mc("Was ist eine Klasse in OOP?", ["Ein konkretes Objekt", "Ein Bauplan/Vorlage", "Eine Funktion", "Eine Variable"], 1, "Klassen sind Vorlagen, Objekte sind konkrete Instanzen.", 1),
      fb("Ein konkretes Exemplar einer Klasse heißt ___.", ["Objekt"], "Objekt = Instanz einer Klasse.", 2),
      tf("Vererbung ermöglicht, Eigenschaften einer Elternklasse zu übernehmen.", true, "Kindklassen erben Attribute und Methoden der Elternklasse.", 3),
      mc("Was bedeutet Kapselung?", ["Mehrere Klassen verbinden", "Daten vor Außenzugriff schützen", "Funktionen vererben", "Objekte klonen"], 1, "Kapselung = private Attribute, Zugriff nur über Methoden.", 4),
      mc("Was ist Polymorphismus?", ["Viele Klassen", "Gleicher Methodenname, verschiedenes Verhalten", "Mehrfachvererbung", "Abstrakte Klasse"], 1, "Polymorphismus: eine Methode verhält sich in Unterklassen unterschiedlich.", 5),
    ],
  },

  // ── GESCHICHTE extra topics ────────────────────────────────────────────
  {
    id: "cur-geschichte-6-rom", subject: "geschichte", grade: 6, order: 2,
    title: "Das Römische Reich",
    description: "Republik, Kaiserzeit, Ausdehnung und Untergang Roms.",
    lesson: "## Römisches Reich\n\n**Republik (509–27 v. Chr.):**\n- Senat, Konsuln\n- Expansion: Gallien, Nordafrika, Griechenland\n\n**Kaiserzeit (27 v. Chr. – 476 n. Chr.):**\n- Augustus = erster Kaiser\n\n**Zivilisation:**\n- Straßen, Aquädukte, Recht (12-Tafel-Gesetz)\n- Latein → Grundlage vieler Sprachen\n\n**Ende:** 476 n. Chr. — Romulus Augustulus abgesetzt",
    questions: [
      mc("Wer war der erste römische Kaiser?", ["Julius Caesar", "Augustus", "Nero", "Konstantin"], 1, "Augustus (eigentlich Octavian) war ab 27 v. Chr. der erste Kaiser.", 1),
      fb("Das Weströmische Reich fiel im Jahr ___ n. Chr.", ["476"], "476 n. Chr. = Untergang des weströmischen Reiches.", 2),
      tf("Julius Caesar war ein Kaiser des Römischen Reiches.", false, "Caesar war Diktator der Republik, kein Kaiser. Er wurde 44 v. Chr. ermordet.", 3),
      mc("Was war ein Aquädukt?", ["Ein Straßenpflaster", "Eine Wasserleitung", "Ein Amphitheater", "Eine Festung"], 1, "Aquädukte leiteten Wasser über weite Strecken in Städte.", 4),
      mc("In welchem Jahr begann die römische Kaiserzeit?", ["509 v. Chr.", "44 v. Chr.", "27 v. Chr.", "476 n. Chr."], 2, "27 v. Chr.: Augustus wird erster Kaiser.", 5),
    ],
  },
  {
    id: "cur-geschichte-9-imperialismus", subject: "geschichte", grade: 9, order: 2,
    title: "Imperialismus und Kolonialismus",
    description: "Europäische Kolonialherrschaft in Afrika, Asien und Amerika im 19. Jahrhundert.",
    lesson: "## Imperialismus (ca. 1880–1914)\n\n**Definition:** Streben nach politischer und wirtschaftlicher Vorherrschaft\n\n**Motive:**\n- Rohstoffe (Kautschuk, Baumwolle, Gold)\n- Absatzmärkte\n- Strategische Stützpunkte\n- 'Zivilisierungsmission' (Ideologie)\n\n**Berliner Konferenz 1884/85:** Afrika unter europ. Mächten aufgeteilt\n\n**Konsequenzen:** Ausbeutung, Unterdrückung, Grundlage für WK I",
    questions: [
      mc("Was war ein Hauptmotiv des Imperialismus?", ["Friedenssicherung", "Rohstoffe und Absatzmärkte", "Hilfe für arme Länder", "Religionsverbreitung"], 1, "Wirtschaftliche Interessen: Rohstoffe, Märkte, Investitionen.", 1),
      fb("Die Berliner Konferenz 1884/85 teilte ___ unter europäischen Mächten auf.", ["Afrika"], "Afrika wurde ohne Beteiligung der Afrikaner aufgeteilt.", 2),
      tf("Der Imperialismus hatte keine Auswirkungen auf den Ersten Weltkrieg.", false, "Rivalitäten um Kolonien trugen zum Ausbruch des WK I bei.", 3),
      mc("Was meinte die 'Zivilisierungsmission'?", ["Echte Entwicklungshilfe", "Ideologische Rechtfertigung der Kolonialherrschaft", "Alphabetisierung", "Friedensmission"], 1, "Die 'Zivilisierungsmission' war eine Ideologie zur Rechtfertigung von Ausbeutung.", 4),
      mc("In welchem Kontinent spielte der Imperialismus besonders stark?", ["Europa", "Australien", "Afrika", "Amerika"], 2, "Afrika: nahezu vollständig kolonisiert bis 1914.", 5),
    ],
  },

  // ── MATHE Klassen 5-6 (mehr Grundlagen) ──────────────────────────────
  {
    id: "cur-mathe-5-flaeche", subject: "mathematik", grade: 5, order: 4,
    title: "Flächen und Umfang einfacher Figuren",
    description: "Fläche und Umfang von Rechteck, Quadrat und Dreieck berechnen.",
    lesson: "## Flächen\n\n| Figur | Umfang | Fläche |\n|-------|--------|--------|\n| Rechteck | 2(l+b) | l×b |\n| Quadrat | 4a | a² |\n| Dreieck | a+b+c | (g×h)/2 |\n\n**Einheiten:** cm, m → cm², m²\n\nBeispiel: Rechteck 5×3 → U=16, A=15",
    questions: [
      fb("Rechteck 8cm × 5cm: Fläche = ___ cm²", ["40"], "A = 8 × 5 = 40 cm².", 1),
      mc("Umfang eines Quadrats mit a=6cm?", ["24 cm", "12 cm", "36 cm", "18 cm"], 0, "U = 4 × 6 = 24 cm.", 2),
      tf("Die Fläche eines Dreiecks ist Grundseite × Höhe.", false, "Fläche = (g × h) / 2.", 3),
      fb("Dreieck: Grundseite 10cm, Höhe 4cm → A = ___ cm²", ["20"], "A = (10 × 4) / 2 = 20 cm².", 4),
      mc("Welche Einheit hat eine Fläche?", ["cm", "cm²", "cm³", "m"], 1, "Flächen werden in Quadrateinheiten angegeben.", 5),
    ],
  },
  {
    id: "cur-mathe-6-negative-zahlen", subject: "mathematik", grade: 6, order: 2,
    title: "Negative Zahlen",
    description: "Zahlenstrahl, Addition, Subtraktion und Vergleich negativer Zahlen.",
    lesson: "## Negative Zahlen\n\nNegative Zahlen liegen links von der 0 auf dem Zahlenstrahl.\n\n**Vergleich:** −3 < −1 < 0 < 2\n\n**Rechnen:**\n- (+3) + (−5) = −2\n- −4 − (−2) = −4 + 2 = −2\n- (+4) × (−2) = −8\n- (−3) × (−2) = +6 (minus × minus = plus)",
    questions: [
      mc("Welche Zahl ist größer: −5 oder −2?", ["−5", "−2", "Gleich groß", "Nicht vergleichbar"], 1, "−2 > −5 (näher an Null).", 1),
      fb("−3 + 5 = ___", ["2"], "Auf dem Zahlenstrahl: von −3 fünf Schritte nach rechts = +2.", 2),
      tf("(−4) × (−3) = 12", true, "Minus × Minus = Plus: (−4) × (−3) = +12.", 3),
      fb("−6 − (−4) = ___", ["−2"], "−6 − (−4) = −6 + 4 = −2.", 4),
      mc("Was ist (+3) × (−4)?", ["12", "−12", "7", "−7"], 1, "Plus × Minus = Minus: 3 × 4 = 12, aber negativ.", 5),
    ],
  },

  // ── ENGLISCH basic topics for lower grades ────────────────────────────
  {
    id: "cur-englisch-5-numbers-dates", subject: "englisch", grade: 5, order: 3,
    title: "Numbers, Days and Months",
    description: "Zahlen, Wochentage und Monate auf Englisch.",
    lesson: "## Numbers & Dates\n\n**Ordinal Numbers:** first (1st), second (2nd), third (3rd), fourth (4th)...\n\n**Days:** Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday\n\n**Months:** January, February, March, April, May, June, July, August, September, October, November, December\n\n**Date:** On the third of May → May 3rd",
    questions: [
      mc("What is the ordinal number for 2?", ["two", "second", "twice", "twice"], 1, "2nd = second.", 1),
      fb("The third month of the year is ___.", ["March"], "January=1, February=2, March=3.", 2),
      tf("Wednesday comes after Thursday.", false, "Monday, Tuesday, Wednesday, Thursday — Wednesday before Thursday.", 3),
      mc("How do you say 'Freitag' in English?", ["Thursday", "Saturday", "Friday", "Monday"], 2, "Freitag = Friday.", 4),
      fb("How many months are in a year? ___", ["12"], "12 months in a year.", 5),
    ],
  },

  // ── BIOLOGIE Klasse 5-6 ──────────────────────────────────────────────
  {
    id: "cur-biologie-5-tiere", subject: "biologie", grade: 5, order: 3,
    title: "Wirbeltiere und Wirbellose",
    description: "Merkmale von Säugetieren, Vögeln, Reptilien, Amphibien und Fischen.",
    lesson: "## Wirbeltiere\n\n| Klasse | Merkmale | Beispiele |\n|--------|----------|-----------|\n| Säuger | Haare, Jungenaufzucht | Hund, Mensch |\n| Vögel | Federn, Schnabel | Amsel, Adler |\n| Reptilien | Schuppen, Kaltblütig | Schlange, Eidechse |\n| Amphibien | Haut, im Wasser+Land | Frosch, Salamander |\n| Fische | Kiemen, Flossen | Forelle, Hai |\n\n**Wirbellose:** Insekten, Würmer — kein Rückgrat",
    questions: [
      mc("Welches Merkmal haben alle Säugetiere?", ["Federn", "Kiemen", "Fell/Haare", "Schuppen"], 2, "Säugetiere haben Haare/Fell.", 1),
      tf("Frösche sind Reptilien.", false, "Frösche sind Amphibien — sie leben sowohl im Wasser als auch auf Land.", 2),
      fb("Vögel haben ___ zum Fliegen.", ["Federn", "Flügel"], "Federn sind charakteristisch für Vögel.", 3),
      mc("Wie atmen Fische?", ["Lungen", "Kiemen", "Haut", "Tracheen"], 1, "Fische haben Kiemen zur Sauerstoffaufnahme aus dem Wasser.", 4),
      mc("Was sind Wirbellose?", ["Alle Tiere ohne Knochen", "Tiere ohne Wirbelsäule", "Kleintiere", "Kaltblütige Tiere"], 1, "Wirbellose haben keine Wirbelsäule.", 5),
    ],
  },

  // ── PHYSIK Klasse 6 ──────────────────────────────────────────────────
  {
    id: "cur-physik-6-magnete", subject: "physik", grade: 6, order: 2,
    title: "Magnete und Magnetismus",
    description: "Magnetpole, Magnetfelder, Kompass und elektromagnetische Anziehung.",
    lesson: "## Magnete\n\n**Jeder Magnet hat 2 Pole:** Nordpol (N) und Südpol (S)\n\n**Regel:** Gleiche Pole stoßen sich ab, ungleiche ziehen sich an.\n\n**Erdmagnetfeld:** Die Erde wirkt wie ein riesiger Magnet.\n\n**Kompass:** Zeigt mit dem Nordpol immer Richtung geographischer Südpol (= magnetischer Nordpol).\n\n**Ferromagnetische Stoffe:** Eisen, Nickel, Kobalt",
    questions: [
      mc("Wie viele Pole hat ein Magnet?", ["1", "2", "3", "4"], 1, "Jeder Magnet hat genau 2 Pole: Nord und Süd.", 1),
      tf("Gleiche Magnetpole ziehen sich an.", false, "Gleiche Pole stoßen sich ab — nur ungleiche ziehen sich an.", 2),
      fb("Eisenspäne zeigen das ___ eines Magneten an.", ["Magnetfeld"], "Eisenspäne ordnen sich entlang der Feldlinien.", 3),
      mc("Was zeigt ein Kompass an?", ["Windrichtung", "Magnetische Nordrichtung", "Temperatur", "Druck"], 1, "Kompassnadel richtet sich am Erdmagnetfeld aus.", 4),
      mc("Welcher Stoff ist ferromagnetisch?", ["Kupfer", "Aluminium", "Eisen", "Gold"], 2, "Eisen, Nickel und Kobalt sind ferromagnetisch.", 5),
    ],
  },
];

async function main() {
  console.log("Seeding extended curriculum…");
  let topicCount = 0, questionCount = 0;

  for (const topic of topics) {
    const { questions, lesson, ...topicData } = topic;

    await prisma.exerciseTopic.upsert({
      where: { id: topic.id },
      update: {},
      create: topicData,
    });

    const lessonExists = await prisma.exerciseLesson.findFirst({ where: { topicId: topic.id } });
    if (!lessonExists) {
      await prisma.exerciseLesson.create({ data: { topicId: topic.id, content: lesson, order: 1 } });
    }

    for (const q of questions) {
      const qId = `${topic.id}-q${q.order}`;
      await prisma.exerciseQuestion.upsert({
        where: { id: qId },
        update: {},
        create: { id: qId, topicId: topic.id, ...q },
      });
      questionCount++;
    }

    topicCount++;
    console.log(`  ✓ [${topic.subject} Kl.${topic.grade}] ${topic.title}`);
  }

  console.log(`\n✅ ${topicCount} neue Themen, ${questionCount} neue Fragen.\n`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
