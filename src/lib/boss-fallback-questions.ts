/**
 * Eingebauter Notfall-Fragenpool für Boss-Fights.
 *
 * Wird verwendet, wenn weder Boss-eigene Fragen noch der Frage-Pool noch
 * ExerciseQuestions Inhalte liefern (z. B. frische Installationen oder
 * Demo-/Test-Umgebungen). So "passiert" beim Angreifen immer etwas.
 *
 * Frage-IDs haben das Format `builtin_<index>` — attackBoss prüft die
 * Korrektheit direkt gegen diesen Pool.
 */

export interface BuiltinQuestion {
  question: string;
  subject: string;
  grade: number;
  options: [string, string, string, string];
  correct: number; // 0-basierter Index
  explanation: string;
}

export const BUILTIN_BOSS_QUESTIONS: BuiltinQuestion[] = [
  { question: "Was ist 7 × 8?", subject: "Mathematik", grade: 5, options: ["54", "56", "64", "48"], correct: 1, explanation: "7 × 8 = 56." },
  { question: "Was ist 144 ÷ 12?", subject: "Mathematik", grade: 5, options: ["11", "14", "12", "13"], correct: 2, explanation: "12 × 12 = 144, also 144 ÷ 12 = 12." },
  { question: "Wie viele Grad hat die Innenwinkelsumme eines Dreiecks?", subject: "Mathematik", grade: 7, options: ["90°", "180°", "270°", "360°"], correct: 1, explanation: "Die Innenwinkelsumme eines Dreiecks beträgt immer 180°." },
  { question: "Was ist 25 % von 200?", subject: "Mathematik", grade: 6, options: ["25", "75", "50", "100"], correct: 2, explanation: "25 % = ein Viertel; 200 ÷ 4 = 50." },
  { question: "Welche Zahl ist eine Primzahl?", subject: "Mathematik", grade: 6, options: ["15", "21", "17", "27"], correct: 2, explanation: "17 ist nur durch 1 und sich selbst teilbar." },
  { question: "Wie lautet das Ergebnis von 3² + 4²?", subject: "Mathematik", grade: 7, options: ["25", "14", "49", "12"], correct: 0, explanation: "9 + 16 = 25 (bekannt aus dem Satz des Pythagoras)." },
  { question: "Wie heißt die Hauptstadt von Deutschland?", subject: "Erdkunde", grade: 5, options: ["München", "Hamburg", "Berlin", "Frankfurt"], correct: 2, explanation: "Berlin ist seit 1990 die Hauptstadt Deutschlands." },
  { question: "Welcher ist der längste Fluss Deutschlands (Anteil in Deutschland)?", subject: "Erdkunde", grade: 6, options: ["Donau", "Rhein", "Elbe", "Main"], correct: 1, explanation: "Der Rhein hat mit ca. 865 km den längsten Lauf innerhalb Deutschlands." },
  { question: "Wie viele Bundesländer hat Deutschland?", subject: "Erdkunde", grade: 5, options: ["14", "15", "16", "17"], correct: 2, explanation: "Deutschland besteht aus 16 Bundesländern." },
  { question: "Welches Gas atmen Pflanzen bei der Photosynthese ein?", subject: "Biologie", grade: 6, options: ["Sauerstoff", "Kohlenstoffdioxid", "Stickstoff", "Wasserstoff"], correct: 1, explanation: "Pflanzen nehmen CO₂ auf und geben Sauerstoff ab." },
  { question: "Wie viele Knochen hat ein erwachsener Mensch ungefähr?", subject: "Biologie", grade: 6, options: ["106", "156", "206", "306"], correct: 2, explanation: "Ein Erwachsener hat rund 206 Knochen." },
  { question: "Was ist das chemische Symbol für Wasser?", subject: "Chemie", grade: 7, options: ["CO₂", "H₂O", "O₂", "NaCl"], correct: 1, explanation: "Wasser besteht aus zwei Wasserstoff- und einem Sauerstoffatom: H₂O." },
  { question: "Bei welcher Temperatur gefriert Wasser (bei Normaldruck)?", subject: "Physik", grade: 6, options: ["0 °C", "−10 °C", "10 °C", "100 °C"], correct: 0, explanation: "Wasser gefriert bei 0 °C und siedet bei 100 °C." },
  { question: "Wie schreibt man das englische Wort für „Schule“?", subject: "Englisch", grade: 5, options: ["Shool", "School", "Schule", "Scool"], correct: 1, explanation: "„School“ — mit „ch“." },
  { question: "Welche Wortart ist „schnell“ in „Er läuft schnell“?", subject: "Deutsch", grade: 6, options: ["Nomen", "Verb", "Adjektiv/Adverb", "Artikel"], correct: 2, explanation: "„schnell“ beschreibt hier das Verb näher (adverbial gebrauchtes Adjektiv)." },
  { question: "In welchem Jahr fiel die Berliner Mauer?", subject: "Geschichte", grade: 8, options: ["1985", "1989", "1991", "1993"], correct: 1, explanation: "Die Berliner Mauer fiel am 9. November 1989." },
];

/** Zufällige Builtin-Frage im API-Antwortformat der Frage-Route. */
export function pickBuiltinQuestion() {
  const idx = Math.floor(Math.random() * BUILTIN_BOSS_QUESTIONS.length);
  const q = BUILTIN_BOSS_QUESTIONS[idx];
  return {
    id: `builtin_${idx}`,
    question: q.question,
    subject: q.subject,
    grade: q.grade,
    source: "builtin" as const,
    options: q.options.map((text, i) => ({ id: i, text })),
  };
}
