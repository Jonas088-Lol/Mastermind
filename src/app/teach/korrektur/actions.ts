/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use server";

import { aiGradeSubmission, type GradeInput, type GradeResult } from "@/lib/ai/grade";
import { incrementAiQuota } from "@/lib/db/store";
import { effectiveRole, getSession } from "@/lib/session";

export interface RunAiGradeResult {
  ok: boolean;
  result?: GradeResult;
  error?: string;
}

export async function runAiGrade(input: GradeInput): Promise<RunAiGradeResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Nicht angemeldet" };
  const role = effectiveRole(session);
  if (role !== "teacher" && role !== "super") {
    return { ok: false, error: "Nur Lehrer:innen dürfen korrigieren" };
  }

  const quota = await incrementAiQuota(session.email);
  if (quota.exceeded) {
    return { ok: false, error: "KI-Wochenkontingent erreicht" };
  }

  if (!input.assignment?.trim() || !input.submission?.trim()) {
    return { ok: false, error: "Aufgabenstellung und Abgabe sind Pflicht" };
  }
  if (!Array.isArray(input.rubric) || input.rubric.length === 0) {
    return { ok: false, error: "Bewertungsraster fehlt" };
  }

  try {
    const result = await aiGradeSubmission(input);
    return { ok: true, result };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "KI-Aufruf fehlgeschlagen",
    };
  }
}
