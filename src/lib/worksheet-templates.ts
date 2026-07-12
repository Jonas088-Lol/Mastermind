/* Copyright 2026 Elian Schock, Jonas Schwenk */
export interface WorksheetTemplate {
  title: string;
  description: string;
  subject: string;
  gradeLevel: number;
  difficulty: "leicht" | "mittel" | "schwer";
  estimatedMinutes: number;
  items: Array<{
    type: string;
    order: number;
    config: string;
    correctAnswer: string | null;
    hint: string | null;
    points: number;
  }>;
}

export const WORKSHEET_TEMPLATES: WorksheetTemplate[] = [
  // ─── 1. Mathe Klasse 2: Zahlenmauer ────────────────────────────────────────
  {
    title: "Mathe Klasse 2: Zahlenmauer",
    description:
      "Ergänze die fehlenden Zahlen in der Zahlenmauer. Benachbarte Zahlen werden addiert, um die Zahl darüber zu erhalten.",
    subject: "Mathematik",
    gradeLevel: 2,
    difficulty: "leicht",
    estimatedMinutes: 15,
    items: [
      {
        type: "number_wall",
        order: 1,
        config: JSON.stringify({
          label: "Zahlenmauer 1",
          rows: [
            [3, null, 5, 2],
            [null, null, null],
            [null, null],
            [null],
          ],
        }),
        correctAnswer: JSON.stringify({
          "0-1": 8,
          "1-0": 11,
          "1-1": 13,
          "1-2": 7,
          "2-0": 24,
          "2-1": 20,
          "3-0": 44,
        }),
        hint: "Addiere immer die zwei Zahlen nebeneinander, um die Zahl darüber zu finden.",
        points: 3,
      },
      {
        type: "number_wall",
        order: 2,
        config: JSON.stringify({
          label: "Zahlenmauer 2",
          rows: [
            [4, null, 3, 6],
            [null, null, null],
            [null, null],
            [null],
          ],
        }),
        correctAnswer: JSON.stringify({
          "0-1": 7,
          "1-0": 11,
          "1-1": 10,
          "1-2": 9,
          "2-0": 21,
          "2-1": 19,
          "3-0": 40,
        }),
        hint: "Fange unten an und arbeite dich nach oben vor.",
        points: 3,
      },
      {
        type: "number_wall",
        order: 3,
        config: JSON.stringify({
          label: "Zahlenmauer 3",
          rows: [
            [2, 6, null, 4],
            [null, null, null],
            [null, null],
            [null],
          ],
        }),
        correctAnswer: JSON.stringify({
          "0-2": 1,
          "1-0": 8,
          "1-1": 7,
          "1-2": 5,
          "2-0": 15,
          "2-1": 12,
          "3-0": 27,
        }),
        hint: "Denke daran: Nebeneinander stehende Zahlen werden addiert.",
        points: 3,
      },
      {
        type: "true_false",
        order: 4,
        config: JSON.stringify({
          statement: "5 + 3 = 8 ist richtig.",
        }),
        correctAnswer: JSON.stringify("true"),
        hint: "Zähle auf deinen Fingern: 5 und 3 mehr.",
        points: 1,
      },
    ],
  },

  // ─── 2. Mathe Klasse 3: Rechenrad Mal 6 ───────────────────────────────────
  {
    title: "Mathe Klasse 3: Rechenrad Mal 6",
    description:
      "Übe die 6er-Reihe mit dem Rechenrad und einer Aufgabe zum Überprüfen.",
    subject: "Mathematik",
    gradeLevel: 3,
    difficulty: "mittel",
    estimatedMinutes: 20,
    items: [
      {
        type: "calculation_wheel",
        order: 1,
        config: JSON.stringify({
          label: "Rechenrad: mal 6",
          center: 6,
          op: "*",
          mode: "fill_outer",
          spokes: [
            { inner: 1, outer: 6 },
            { inner: 2, outer: null },
            { inner: 3, outer: null },
            { inner: 4, outer: 24 },
            { inner: 5, outer: null },
            { inner: 6, outer: null },
            { inner: 7, outer: null },
            { inner: 8, outer: 48 },
          ],
        }),
        correctAnswer: JSON.stringify({
          "1": 12,
          "2": 18,
          "4": 30,
          "5": 36,
          "6": 42,
        }),
        hint: "Multipliziere jeden Speichenwert mit der Mitte (6).",
        points: 4,
      },
      {
        type: "calculation_wheel",
        order: 2,
        config: JSON.stringify({
          label: "Rechenrad: mal 6 – Fortsetzung",
          center: 6,
          op: "*",
          mode: "fill_outer",
          spokes: [
            { inner: 9, outer: null },
            { inner: 10, outer: 60 },
            { inner: 11, outer: null },
            { inner: 12, outer: null },
            { inner: 3, outer: 18 },
            { inner: 7, outer: null },
          ],
        }),
        correctAnswer: JSON.stringify({
          "0": 54,
          "2": 66,
          "3": 72,
          "5": 42,
        }),
        hint: "Denke an die 6er-Reihe: 6, 12, 18, 24, …",
        points: 3,
      },
      {
        type: "multiple_choice",
        order: 3,
        config: JSON.stringify({
          question: "Was ist 6 × 7?",
          options: ["36", "42", "48", "54"],
          multiple: false,
        }),
        correctAnswer: JSON.stringify("1"),
        hint: "Zähle die 6er-Reihe bis zum 7. Ergebnis.",
        points: 1,
      },
    ],
  },

  // ─── 3. Mathe Klasse 4: Hundertertafel ────────────────────────────────────
  {
    title: "Mathe Klasse 4: Hundertertafel",
    description:
      "Markiere Vielfache und Primzahlen in der Hundertertafel und erkenne Muster.",
    subject: "Mathematik",
    gradeLevel: 4,
    difficulty: "mittel",
    estimatedMinutes: 20,
    items: [
      {
        type: "hundred_chart",
        order: 1,
        config: JSON.stringify({
          instruction: "Markiere alle Vielfachen von 4 (4, 8, 12, … bis 100).",
          mode: "mark",
          start: 1,
          end: 100,
        }),
        correctAnswer: JSON.stringify([
          4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60, 64, 68,
          72, 76, 80, 84, 88, 92, 96, 100,
        ]),
        hint: "Fange bei 4 an und zähle immer 4 weiter.",
        points: 3,
      },
      {
        type: "hundred_chart",
        order: 2,
        config: JSON.stringify({
          instruction: "Markiere alle Primzahlen bis 30.",
          mode: "mark",
          start: 1,
          end: 30,
        }),
        correctAnswer: JSON.stringify([2, 3, 5, 7, 11, 13, 17, 19, 23, 29]),
        hint: "Primzahlen sind nur durch 1 und sich selbst teilbar. Die erste ist 2.",
        points: 3,
      },
    ],
  },

  // ─── 4. Mathe Klasse 5: Zahlenstrahl ──────────────────────────────────────
  {
    title: "Mathe Klasse 5: Zahlenstrahl",
    description:
      "Übe das Ablesen und Einordnen von Zahlen auf dem Zahlenstrahl.",
    subject: "Mathematik",
    gradeLevel: 5,
    difficulty: "leicht",
    estimatedMinutes: 15,
    items: [
      {
        type: "number_line",
        order: 1,
        config: JSON.stringify({
          label: "Zahlenstrahl 1–20",
          min: 0,
          max: 20,
          step: 1,
          marks: [0, 5, 10, 15, 20],
          task: "Markiere die Zahlen 3, 7, 12 und 18 auf dem Zahlenstrahl.",
          targets: [3, 7, 12, 18],
        }),
        correctAnswer: JSON.stringify([3, 7, 12, 18]),
        hint: "Orientiere dich an den markierten Hauptpunkten 0, 5, 10, 15, 20.",
        points: 2,
      },
      {
        type: "number_line",
        order: 2,
        config: JSON.stringify({
          label: "Zahlenstrahl 0–100",
          min: 0,
          max: 100,
          step: 10,
          marks: [0, 25, 50, 75, 100],
          task: "Markiere die Zahlen 30, 65 und 90 auf dem Zahlenstrahl.",
          targets: [30, 65, 90],
        }),
        correctAnswer: JSON.stringify([30, 65, 90]),
        hint: "Beachte die Schrittweite: Jeder Abschnitt zwischen zwei Markierungen beträgt 25.",
        points: 2,
      },
      {
        type: "fill_blank",
        order: 3,
        config: JSON.stringify({
          text: "Der Abstand von 0 bis {{blank:0}} auf dem Zahlenstrahl beträgt 10. Zwischen 15 und 25 liegen {{blank:1}} Schritte.",
          blanks: ["__", "__"],
        }),
        correctAnswer: JSON.stringify(["10", "10"]),
        hint: "Denke an die Abstände auf dem Zahlenstrahl.",
        points: 2,
      },
    ],
  },

  // ─── 5. Deutsch Klasse 3: Wortarten zuordnen ──────────────────────────────
  {
    title: "Deutsch Klasse 3: Wortarten zuordnen",
    description:
      "Ordne Nomen, Verben und Adjektive richtig zu und festige dein Wissen über Wortarten.",
    subject: "Deutsch",
    gradeLevel: 3,
    difficulty: "mittel",
    estimatedMinutes: 20,
    items: [
      {
        type: "drag_drop",
        order: 1,
        config: JSON.stringify({
          instruction:
            "Ordne die Wörter den richtigen Wortarten zu.",
          items: [
            "Hund",
            "laufen",
            "schön",
            "Schule",
            "spielen",
            "groß",
            "Baum",
            "singen",
            "klein",
          ],
          categories: ["Nomen", "Verb", "Adjektiv"],
        }),
        correctAnswer: JSON.stringify({
          Nomen: ["Hund", "Schule", "Baum"],
          Verb: ["laufen", "spielen", "singen"],
          Adjektiv: ["schön", "groß", "klein"],
        }),
        hint: "Nomen schreibt man groß. Verben beschreiben eine Tätigkeit. Adjektive beschreiben Eigenschaften.",
        points: 3,
      },
      {
        type: "multiple_choice",
        order: 2,
        config: JSON.stringify({
          question: "Welches Wort ist ein Nomen?",
          options: ["laufen", "schnell", "Haus", "blau"],
          multiple: false,
        }),
        correctAnswer: JSON.stringify("2"),
        hint: "Nomen schreibt man immer groß und man kann einen Artikel (der, die, das) davor stellen.",
        points: 1,
      },
      {
        type: "fill_blank",
        order: 3,
        config: JSON.stringify({
          text: "Das {{blank:0}} ist blau. (Substantiv/Nomen) Der Hund {{blank:1}} laut. (Verb) Die Blume ist {{blank:2}}. (Adjektiv)",
          blanks: ["___", "___", "___"],
        }),
        correctAnswer: JSON.stringify(["Himmel", "bellt", "schön"]),
        hint: "Setze passende Wörter der jeweiligen Wortart ein.",
        points: 3,
      },
    ],
  },

  // ─── 6. Deutsch Klasse 4: Satzglieder ────────────────────────────────────
  {
    title: "Deutsch Klasse 4: Satzglieder",
    description:
      "Erkenne und benenne die Satzglieder: Subjekt, Prädikat und Objekt.",
    subject: "Deutsch",
    gradeLevel: 4,
    difficulty: "schwer",
    estimatedMinutes: 25,
    items: [
      {
        type: "sorting",
        order: 1,
        config: JSON.stringify({
          instruction:
            "Bringe die Satzglieder in die richtige Reihenfolge, um einen Satz zu bilden.",
          items: ["liest", "Das Mädchen", "ein spannendes Buch", "heute"],
          hint: "Im Deutschen steht das Prädikat an zweiter Stelle.",
        }),
        correctAnswer: JSON.stringify([
          "Das Mädchen",
          "liest",
          "heute",
          "ein spannendes Buch",
        ]),
        hint: "Wer oder was? (Subjekt) – Was tut er/sie? (Prädikat) – Wann? (Temporalangabe) – Was? (Objekt)",
        points: 2,
      },
      {
        type: "text_input",
        order: 2,
        config: JSON.stringify({
          question:
            "Stelle den Satz um, indem du mit dem Objekt beginnst: 'Der Lehrer erklärt den Schülern die Aufgabe.'",
          placeholder: "Den Schülern …",
          multiline: false,
        }),
        correctAnswer: null,
        hint: "Wenn du mit einem anderen Satzglied beginnst, ändert sich die Position des Prädikats nicht – es bleibt an zweiter Stelle.",
        points: 2,
      },
      {
        type: "text_input",
        order: 3,
        config: JSON.stringify({
          question:
            "Formuliere den Satz in der Vergangenheit (Präteritum): 'Die Kinder spielen auf dem Schulhof.'",
          placeholder: "Die Kinder …",
          multiline: false,
        }),
        correctAnswer: null,
        hint: "Das Verb 'spielen' lautet im Präteritum 'spielten'.",
        points: 2,
      },
      {
        type: "true_false",
        order: 4,
        config: JSON.stringify({
          statement:
            "Im Satz 'Maria backt einen Kuchen.' ist 'Maria' das Subjekt.",
        }),
        correctAnswer: JSON.stringify("true"),
        hint: "Das Subjekt beantwortet die Frage: Wer oder was tut etwas?",
        points: 1,
      },
    ],
  },

  // ─── 7. Englisch Klasse 5: Vocabulary ────────────────────────────────────
  {
    title: "Englisch Klasse 5: Vokabeln",
    description:
      "Übe englische Vokabeln durch Zuordnung, Lückentexte und Multiple Choice.",
    subject: "Englisch",
    gradeLevel: 5,
    difficulty: "leicht",
    estimatedMinutes: 20,
    items: [
      {
        type: "matching",
        order: 1,
        config: JSON.stringify({
          instruction: "Ordne die deutschen Wörtern den englischen Übersetzungen zu.",
          pairs: [
            { left: "der Hund", right: "the dog" },
            { left: "das Haus", right: "the house" },
            { left: "die Schule", right: "the school" },
            { left: "das Buch", right: "the book" },
            { left: "der Freund", right: "the friend" },
          ],
        }),
        correctAnswer: JSON.stringify({
          "der Hund": "the dog",
          "das Haus": "the house",
          "die Schule": "the school",
          "das Buch": "the book",
          "der Freund": "the friend",
        }),
        hint: "Denke an bekannte Wörter aus dem Unterricht.",
        points: 3,
      },
      {
        type: "fill_blank",
        order: 2,
        config: JSON.stringify({
          text: "The cat is {{blank:0}} the table. The dog sleeps {{blank:1}} the sofa.",
          blanks: ["___", "___"],
        }),
        correctAnswer: JSON.stringify(["on", "on"]),
        hint: "'On' bedeutet auf/oben auf einer Fläche.",
        points: 2,
      },
      {
        type: "multiple_choice",
        order: 3,
        config: JSON.stringify({
          question: "Which word means 'groß' in English?",
          options: ["small", "big", "fast", "old"],
          multiple: false,
        }),
        correctAnswer: JSON.stringify("1"),
        hint: "Das Gegenteil von 'big' ist 'small'.",
        points: 1,
      },
    ],
  },

  // ─── 8. Englisch Klasse 6: Irregular Verbs ───────────────────────────────
  {
    title: "Englisch Klasse 6: Unregelmäßige Verben",
    description:
      "Lerne und übe die wichtigsten unregelmäßigen englischen Verben.",
    subject: "Englisch",
    gradeLevel: 6,
    difficulty: "mittel",
    estimatedMinutes: 25,
    items: [
      {
        type: "sorting",
        order: 1,
        config: JSON.stringify({
          instruction:
            "Bringe die Verbformen in die richtige Reihenfolge: Grundform – Simple Past – Past Participle.",
          items: ["gone", "go", "went"],
        }),
        correctAnswer: JSON.stringify(["go", "went", "gone"]),
        hint: "Grundform (Infinitiv) → Simple Past → Past Participle (3. Form)",
        points: 2,
      },
      {
        type: "matching",
        order: 2,
        config: JSON.stringify({
          instruction:
            "Ordne das Verb seiner Simple-Past-Form zu.",
          pairs: [
            { left: "go", right: "went" },
            { left: "eat", right: "ate" },
            { left: "come", right: "came" },
            { left: "see", right: "saw" },
            { left: "write", right: "wrote" },
          ],
        }),
        correctAnswer: JSON.stringify({
          go: "went",
          eat: "ate",
          come: "came",
          see: "saw",
          write: "wrote",
        }),
        hint: "Diese Verben ändern ihre Form unregelmäßig in der Vergangenheit.",
        points: 3,
      },
      {
        type: "fill_blank",
        order: 3,
        config: JSON.stringify({
          text: "Yesterday, Tom {{blank:0}} (eat) a pizza. Last week, we {{blank:1}} (go) to the cinema.",
          blanks: ["___", "___"],
        }),
        correctAnswer: JSON.stringify(["ate", "went"]),
        hint: "Setze die Simple-Past-Form des Verbs in Klammern ein.",
        points: 2,
      },
      {
        type: "fill_blank",
        order: 4,
        config: JSON.stringify({
          text: "She has {{blank:0}} (write) a letter. They have {{blank:1}} (come) home.",
          blanks: ["___", "___"],
        }),
        correctAnswer: JSON.stringify(["written", "come"]),
        hint: "Nach 'have/has' verwendet man das Past Participle (3. Form).",
        points: 2,
      },
    ],
  },

  // ─── 9. Sachkunde Klasse 3: Tiere ────────────────────────────────────────
  {
    title: "Sachkunde Klasse 3: Tiere",
    description:
      "Lerne mehr über Tiere, ihre Lebensräume und Nahrung.",
    subject: "Sachkunde",
    gradeLevel: 3,
    difficulty: "leicht",
    estimatedMinutes: 20,
    items: [
      {
        type: "drag_drop",
        order: 1,
        config: JSON.stringify({
          instruction: "Ordne die Tiere ihrem Lebensraum zu.",
          items: ["Adler", "Frosch", "Maulwurf", "Delfin", "Eichhörnchen", "Hai"],
          categories: ["Luft / Wald", "Wasser / Teich", "Erde / Boden", "Meer"],
        }),
        correctAnswer: JSON.stringify({
          "Luft / Wald": ["Adler", "Eichhörnchen"],
          "Wasser / Teich": ["Frosch"],
          "Erde / Boden": ["Maulwurf"],
          Meer: ["Delfin", "Hai"],
        }),
        hint: "Überlege, wo das jeweilige Tier lebt und was es zum Überleben braucht.",
        points: 3,
      },
      {
        type: "matching",
        order: 2,
        config: JSON.stringify({
          instruction: "Ordne das Tier seiner Nahrung zu.",
          pairs: [
            { left: "Löwe", right: "Fleisch (Raubtier)" },
            { left: "Kuh", right: "Gras und Pflanzen" },
            { left: "Specht", right: "Insekten und Larven" },
            { left: "Biene", right: "Blütennektar" },
          ],
        }),
        correctAnswer: JSON.stringify({
          Löwe: "Fleisch (Raubtier)",
          Kuh: "Gras und Pflanzen",
          Specht: "Insekten und Larven",
          Biene: "Blütennektar",
        }),
        hint: "Pflanzenfresser, Fleischfresser oder Allesfresser – was ist das Tier?",
        points: 2,
      },
      {
        type: "true_false",
        order: 3,
        config: JSON.stringify({
          statement: "Fische atmen durch Kiemen.",
        }),
        correctAnswer: JSON.stringify("true"),
        hint: "Kiemen sind die Atemorgane der Fische – ähnlich wie Lungen beim Menschen.",
        points: 1,
      },
      {
        type: "text_input",
        order: 4,
        config: JSON.stringify({
          question:
            "Erkläre in 2–3 Sätzen, wie sich ein Schmetterling entwickelt. Welche Stadien gibt es?",
          placeholder: "Ein Schmetterling beginnt als …",
          multiline: true,
        }),
        correctAnswer: null,
        hint: "Denke an: Ei → Raupe → Puppe → Schmetterling (Metamorphose).",
        points: 3,
      },
    ],
  },

  // ─── 10. Allgemein: Lernstandscheck ──────────────────────────────────────
  {
    title: "Allgemein: Lernstandscheck Klasse 5",
    description:
      "Ein gemischter Lernstandscheck mit verschiedenen Aufgabentypen aus Mathematik und Deutsch.",
    subject: "Allgemein",
    gradeLevel: 5,
    difficulty: "mittel",
    estimatedMinutes: 20,
    items: [
      {
        type: "multiple_choice",
        order: 1,
        config: JSON.stringify({
          question: "Was ist das Ergebnis von 7 × 8?",
          options: ["48", "54", "56", "64"],
          multiple: false,
        }),
        correctAnswer: JSON.stringify("2"),
        hint: "Denke an die 8er-Reihe: 8, 16, 24, 32, 40, 48, 56 …",
        points: 1,
      },
      {
        type: "true_false",
        order: 2,
        config: JSON.stringify({
          statement:
            "Ein Quadrat hat vier gleich lange Seiten und vier rechte Winkel.",
        }),
        correctAnswer: JSON.stringify("true"),
        hint: "Überlege, was ein Quadrat von einem Rechteck unterscheidet.",
        points: 1,
      },
      {
        type: "text_input",
        order: 3,
        config: JSON.stringify({
          question:
            "Schreibe einen vollständigen Satz, der das Wort 'Freundschaft' enthält.",
          placeholder: "Freundschaft ist …",
          multiline: false,
        }),
        correctAnswer: null,
        hint: "Achte auf Groß- und Kleinschreibung sowie einen Punkt am Satzende.",
        points: 2,
      },
      {
        type: "fill_blank",
        order: 4,
        config: JSON.stringify({
          text: "Deutschland hat {{blank:0}} Bundesländer. Die Hauptstadt heißt {{blank:1}}.",
          blanks: ["__", "____"],
        }),
        correctAnswer: JSON.stringify(["16", "Berlin"]),
        hint: "Deutschland ist ein Bundesstaat – denke an Geografie.",
        points: 2,
      },
      {
        type: "sorting",
        order: 5,
        config: JSON.stringify({
          instruction:
            "Bringe die Jahreszeiten in die richtige Reihenfolge, beginnend mit dem Winter.",
          items: ["Frühling", "Sommer", "Herbst", "Winter"],
        }),
        correctAnswer: JSON.stringify(["Winter", "Frühling", "Sommer", "Herbst"]),
        hint: "Winter beginnt im Dezember. Danach folgt der Frühling im März.",
        points: 2,
      },
    ],
  },
];
