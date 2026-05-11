"use server";

import { revalidatePath } from "next/cache";
import { aiGenerateExam, type ExamInput, type ExamResult } from "@/lib/ai/exam";
import { prisma } from "@/lib/db/client";
import { incrementAiQuota } from "@/lib/db/store";
import { effectiveRole, getSession } from "@/lib/session";

export interface RunAiGenerateResult {
  ok: boolean;
  result?: ExamResult;
  error?: string;
}

export async function runAiGenerate(
  input: ExamInput
): Promise<RunAiGenerateResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Nicht angemeldet" };
  const role = effectiveRole(session);
  if (role !== "teacher" && role !== "super") {
    return { ok: false, error: "Nur Lehrer:innen dürfen generieren" };
  }

  if (!input.klasse || !input.topic || !input.subject) {
    return { ok: false, error: "Klasse, Fach und Thema sind Pflicht" };
  }
  if (input.questionCount < 1 || input.questionCount > 25) {
    return { ok: false, error: "questionCount zwischen 1 und 25" };
  }

  const quota = await incrementAiQuota(session.email);
  if (quota.exceeded) {
    return { ok: false, error: "KI-Wochenkontingent erreicht" };
  }

  try {
    const result = await aiGenerateExam(input);
    return { ok: true, result };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "KI-Aufruf fehlgeschlagen",
    };
  }
}

export async function sendToClass(
  classId: string,
  subjectId: string,
  title: string
): Promise<void> {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");
  await prisma.assignment.create({
    data: {
      title,
      type: "test",
      dueAt: new Date(Date.now() + 7 * 86400000), // 1 week from now
      teacherId: session.userId,
      classId,
      subjectId,
    },
  });
  revalidatePath("/teach/aufgaben");
}
