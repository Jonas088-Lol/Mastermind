/* Copyright 2026 Elian Schock, Jonas Schwenk */
/**
 * KI-Klassenarbeits-Generator.
 *
 * Generiert Aufgaben + Bewertungsraster zu einem Lernziel. Mock-Fallback
 * für Dev ohne API-Key.
 */

import { chat, isAiConfigured, MODELS } from "@/lib/ai";

export interface ExamInput {
  klasse: string;
  subject: string;
  topic: string;
  duration: number; // Minuten
  questionCount: number;
  difficulty: "leicht" | "mittel" | "schwer";
  types: string[]; // Rechnen / Begründen / Skizzieren / Multiple Choice / Anwendung
  goalHint?: string;
}

export interface ExamQuestion {
  number: number;
  type: string;
  title: string;
  points: number;
  expected: string;
}

export interface ExamResult {
  title: string;
  totalPoints: number;
  estimatedMinutes: number;
  questions: ExamQuestion[];
  rubric: { label: string; maxPoints: number }[];
  source: "ai" | "mock";
  curriculumScore: number;
}

const SYSTEM_PROMPT = `Du bist KI-Generator für deutsche Klassenarbeiten und Tests.

Aufgabe:
- Generiere eine Klassenarbeit mit der angegebenen Anzahl Aufgaben.
- Aufgaben sollen im Schwierigkeits-Bereich liegen und mehrere Aufgabentypen abdecken.
- Pro Aufgabe: Punkte zwischen 1 und 8.
- Für jede Aufgabe einen kurzen Erwartungs-Horizont (was die korrekte Antwort beinhalten sollte).
- Bewertungsraster (3–6 Kriterien) am Ende.
- Lehrplan-Score 0–100 ist deine Selbsteinschätzung der KMK-Konformität.

Strikte Regeln:
- Aufgaben müssen zur Klassenstufe passen.
- Kein Internet-Lookup, keine Bilder, keine externen Links.
- Antworte ausschließlich als JSON, ohne Markdown-Codefence:
{
  "title": string,
  "totalPoints": number,
  "estimatedMinutes": number,
  "questions": [{"number": number, "type": string, "title": string, "points": number, "expected": string}],
  "rubric": [{"label": string, "maxPoints": number}],
  "curriculumScore": number
}`;

function mockExam(input: ExamInput): ExamResult {
  const pointsEach = input.difficulty === "schwer" ? 6 : input.difficulty === "mittel" ? 4 : 3;
  const questions: ExamQuestion[] = Array.from(
    { length: input.questionCount },
    (_, i) => ({
      number: i + 1,
      type: input.types[i % input.types.length] ?? "Rechnen",
      title: `Aufgabe ${i + 1}: ${input.topic} — Demo-Aufgabe (Mock-Modus, kein API-Key gesetzt).`,
      points: pointsEach,
      expected: "Erwartungs-Horizont: korrekte Anwendung der Methode aus dem Unterricht.",
    })
  );
  const totalPoints = questions.reduce((s, q) => s + q.points, 0);
  return {
    title: `${input.subject} ${input.klasse} — ${input.topic}`,
    totalPoints,
    estimatedMinutes: input.duration,
    questions,
    rubric: [
      { label: "Korrekte Anwendung der Methode", maxPoints: Math.round(totalPoints * 0.5) },
      { label: "Lösungsweg vollständig", maxPoints: Math.round(totalPoints * 0.25) },
      { label: "Begründung & Interpretation", maxPoints: Math.round(totalPoints * 0.15) },
      { label: "Sauberkeit & Form", maxPoints: Math.round(totalPoints * 0.1) },
    ],
    curriculumScore: 85,
    source: "mock",
  };
}

export async function aiGenerateExam(input: ExamInput): Promise<ExamResult> {
  if (!isAiConfigured()) return mockExam(input);

  const userPrompt = JSON.stringify(input, null, 2);
  const raw = await chat({
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
    model: MODELS.balanced,
    maxTokens: 6000,
  });

  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return mockExam(input);

  let parsed: Partial<ExamResult>;
  try {
    parsed = JSON.parse(match[0]) as Partial<ExamResult>;
  } catch {
    return mockExam(input);
  }

  const questions: ExamQuestion[] = Array.isArray(parsed.questions)
    ? parsed.questions.map((q, i) => ({
        number: typeof q.number === "number" ? q.number : i + 1,
        type: typeof q.type === "string" ? q.type : "Aufgabe",
        title: typeof q.title === "string" ? q.title : "(leere Aufgabe)",
        points: typeof q.points === "number" ? Math.max(1, q.points) : 1,
        expected: typeof q.expected === "string" ? q.expected : "",
      }))
    : [];

  const rubric =
    Array.isArray(parsed.rubric)
      ? parsed.rubric
          .filter((r): r is { label: string; maxPoints: number } =>
            r != null && typeof r.label === "string"
          )
          .map((r) => ({
            label: r.label,
            maxPoints: typeof r.maxPoints === "number" ? r.maxPoints : 1,
          }))
      : [];

  return {
    title:
      typeof parsed.title === "string"
        ? parsed.title
        : `${input.subject} ${input.klasse} — ${input.topic}`,
    totalPoints:
      typeof parsed.totalPoints === "number"
        ? parsed.totalPoints
        : questions.reduce((s, q) => s + q.points, 0),
    estimatedMinutes:
      typeof parsed.estimatedMinutes === "number"
        ? parsed.estimatedMinutes
        : input.duration,
    questions,
    rubric,
    curriculumScore:
      typeof parsed.curriculumScore === "number"
        ? Math.max(0, Math.min(100, Math.round(parsed.curriculumScore)))
        : 80,
    source: "ai",
  };
}
