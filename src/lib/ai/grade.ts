/**
 * KI-Korrektur-Vorschlag.
 *
 * Nimmt eine Schüler-Abgabe + Bewertungsraster, gibt Notenvorschlag,
 * Kriterien-Treffer und kurze Begründung zurück. Ist eine Server-Action,
 * läuft also nie im Client.
 *
 * Wenn ANTHROPIC_API_KEY fehlt, kommt eine deterministische Mock-Antwort
 * — gleiche Shape, sodass UI-Code einheitlich bleibt.
 */

import { chat, isAiConfigured } from "@/lib/ai";

export interface GradeInput {
  /** Frei formulierter Aufgabenstellung-Text */
  assignment: string;
  /** Schüler-Antwort/Abgabe als Volltext */
  submission: string;
  /** Bewertungsraster: Liste von Kriterien mit Maximalpunkten */
  rubric: { label: string; maxPoints: number }[];
  /** Klassenstufe für Lehrplan-Kontext (optional) */
  klasse?: string;
  /** Fach (optional) */
  subject?: string;
}

export interface RubricHit {
  label: string;
  awarded: number;
  max: number;
  comment: string;
}

export interface GradeResult {
  /** Note 1.0–6.0 (deutsch), eine Nachkommastelle */
  grade: number;
  /** 0–100, Konfidenz des Modells */
  confidence: number;
  rubric: RubricHit[];
  /** Lob, Verbesserungsvorschläge — für die Lehrkraft */
  feedback: string;
  /** Ob real KI oder Mock */
  source: "ai" | "mock";
}

const SYSTEM_PROMPT = `Du bist KI-Korrektur-Assistent für deutsche Schulen.

Aufgabe:
- Bewerte die Schüler-Abgabe gegen das gelieferte Raster.
- Vergib pro Kriterium Punkte (zwischen 0 und maxPoints).
- Berechne eine deutsche Schul-Note (1.0 sehr gut bis 6.0 ungenügend) mit einer Nachkommastelle.
- Schätze deine Confidence (0–100): wie sicher bist du, dass deine Bewertung der einer erfahrenen Lehrkraft entspräche.
- Schreibe eine knappe, lehrkraftgerechte Begründung — kein Schul-Marketing, keine Floskeln.

Strikte Regeln:
- KEINE Endbewertung — du lieferst Vorschläge, die Lehrkraft entscheidet.
- KEINE personenbezogene Bewertung (Charakter, Intelligenz). Nur fachlich.
- KEIN Lob/Tadel-Ton.

Antworte ausschließlich als JSON, ohne Markdown-Codefence:
{
  "grade": number,
  "confidence": number,
  "rubric": [{"label": string, "awarded": number, "max": number, "comment": string}],
  "feedback": string
}`;

function mockResult(input: GradeInput): GradeResult {
  const total = input.rubric.reduce((s, r) => s + r.maxPoints, 0);
  const awarded = input.rubric.map((r) => ({
    label: r.label,
    awarded: Math.round(r.maxPoints * 0.75),
    max: r.maxPoints,
    comment: "Solide Lösung, kleine Lücken in der Begründung.",
  }));
  const sumAwarded = awarded.reduce((s, r) => s + r.awarded, 0);
  const ratio = total > 0 ? sumAwarded / total : 0.75;
  const grade = Math.round((6 - ratio * 5) * 10) / 10;

  return {
    grade,
    confidence: 78,
    rubric: awarded,
    feedback:
      "Die Aufgabe ist im Kern verstanden. Bewertungs-Vorschlag basiert auf Mock-Modus — sobald ANTHROPIC_API_KEY gesetzt ist, liefert Claude eine echte Einschätzung.",
    source: "mock",
  };
}

function clampGrade(n: unknown): number {
  if (typeof n !== "number" || Number.isNaN(n)) return 4.0;
  return Math.max(1.0, Math.min(6.0, Math.round(n * 10) / 10));
}

function clampConfidence(n: unknown): number {
  if (typeof n !== "number" || Number.isNaN(n)) return 50;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export async function aiGradeSubmission(
  input: GradeInput
): Promise<GradeResult> {
  if (!isAiConfigured()) {
    return mockResult(input);
  }

  const userPrompt = JSON.stringify(
    {
      klasse: input.klasse,
      subject: input.subject,
      assignment: input.assignment,
      submission: input.submission,
      rubric: input.rubric,
    },
    null,
    2
  );

  const raw = await chat({
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
    maxTokens: 4000,
  });

  // Robustes JSON-Parsing — falls Modell Erklärtext drumherum schreibt
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return mockResult(input);

  let parsed: Partial<GradeResult>;
  try {
    parsed = JSON.parse(match[0]) as Partial<GradeResult>;
  } catch {
    return mockResult(input);
  }

  const rubric: RubricHit[] = Array.isArray(parsed.rubric)
    ? parsed.rubric
        .filter(
          (r): r is RubricHit =>
            r != null &&
            typeof r === "object" &&
            typeof r.label === "string"
        )
        .map((r) => ({
          label: r.label,
          awarded: Math.max(0, Math.min(r.max ?? 0, Number(r.awarded) || 0)),
          max: Number(r.max) || 0,
          comment:
            typeof r.comment === "string"
              ? r.comment
              : "(keine Anmerkung)",
        }))
    : input.rubric.map((r) => ({
        label: r.label,
        awarded: 0,
        max: r.maxPoints,
        comment: "—",
      }));

  return {
    grade: clampGrade(parsed.grade),
    confidence: clampConfidence(parsed.confidence),
    rubric,
    feedback:
      typeof parsed.feedback === "string"
        ? parsed.feedback
        : "(keine Begründung geliefert)",
    source: "ai",
  };
}
