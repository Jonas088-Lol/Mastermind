/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { getSession } from "@/lib/session";
import { awardXp } from "@/lib/xp";
import { awardCoins } from "@/lib/coins";

export async function submitAnswer(
  questionId: string,
  answer: string,
  correct: boolean,
): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/login");

  // Frage muss existieren (sonst FK-Fehler → Crash der Action)
  const question = await prisma.quizQuestion.findUnique({
    where: { id: questionId },
    select: { id: true },
  });
  if (!question) return;

  await prisma.quizAnswer.create({
    data: { userId: session.userId, questionId, answer: String(answer ?? "").slice(0, 1000), correct: Boolean(correct) },
  });
}

export async function completeModule(pathId: string, moduleId: string): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/login");

  // Modul muss existieren und zum angegebenen Pfad gehören
  // (sonst FK-Fehler → Crash bzw. Fortschritt unter falschem Pfad)
  const learningModule = await prisma.learningModule.findUnique({
    where: { id: moduleId },
    select: { pathId: true },
  });
  if (!learningModule || learningModule.pathId !== pathId) return;

  const existing = await prisma.learningProgress.findUnique({
    where: { userId_moduleId: { userId: session.userId, moduleId } },
    select: { completedAt: true },
  });

  await prisma.learningProgress.upsert({
    where: { userId_moduleId: { userId: session.userId, moduleId } },
    create: { userId: session.userId, pathId, moduleId },
    update: { completedAt: new Date() },
  });

  // Only award XP on first completion
  if (!existing) {
    await awardXp(session.userId, "karteikarte_session");

    // Check if all modules in this path are now completed
    const [totalModules, completedModules] = await Promise.all([
      prisma.learningModule.count({ where: { pathId } }),
      prisma.learningProgress.count({ where: { userId: session.userId, pathId } }),
    ]);
    if (totalModules > 0 && completedModules >= totalModules) {
      awardCoins(session.userId, "lernpfad_completed", undefined, pathId).catch(() => undefined);
    }
  }

  revalidatePath(`/app/lernen/${pathId}`);
  revalidatePath("/app/lernen");
}
