/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/client";
import { getSession } from "@/lib/session";
import { awardXp, awardXpCustom } from "@/lib/xp";
import { awardCoins } from "@/lib/coins";
import { incrementQuestProgress } from "@/lib/quests";
import { onExerciseComplete } from "@/lib/tree-quest-engine";

/**
 * Verbraucht einen gekauften Tipp. Atomarer, konditionaler Abzug (kein
 * Check-then-Act), damit paralleles Aufdecken nicht ins Minus läuft.
 * Gibt das verbleibende Guthaben zurück, oder null wenn keine Tipps übrig.
 */
export async function spendHintToken(): Promise<number | null> {
  const session = await getSession();
  if (!session) return null;

  return prisma.$transaction(async (tx) => {
    const updated = await tx.user.updateMany({
      where: { id: session.userId, hintTokens: { gte: 1 } },
      data: { hintTokens: { decrement: 1 } },
    });
    if (updated.count === 0) return null;
    const user = await tx.user.findUnique({
      where: { id: session.userId },
      select: { hintTokens: true },
    });
    return user?.hintTokens ?? 0;
  });
}

export async function saveQuizResult(topicId: string, score: number, maxCombo?: number): Promise<void> {
  const session = await getSession();
  if (!session) return;

  // Eingaben validieren: score 0–100 (ganzzahlig), Topic muss existieren
  // (sonst FK-Fehler → Crash), maxCombo geclampt (sonst unbegrenzte Bonus-XP).
  if (!Number.isInteger(score) || score < 0 || score > 100) return;
  const topic = await prisma.exerciseTopic.findUnique({
    where: { id: topicId },
    select: { _count: { select: { questions: true } } },
  });
  if (!topic) return;
  const comboCap = Math.max(0, topic._count.questions);
  const safeCombo = maxCombo ? Math.min(Math.max(0, Math.floor(maxCombo)), comboCap) : 0;

  const existing = await prisma.exerciseProgress.findUnique({
    where: { userId_topicId: { userId: session.userId, topicId } },
    select: { score: true },
  });

  await prisma.exerciseProgress.upsert({
    where: { userId_topicId: { userId: session.userId, topicId } },
    update: { score, completedAt: new Date() },
    create: { userId: session.userId, topicId, score, completedAt: new Date() },
  });

  // Only award XP on first completion or genuine score improvement
  if (!existing || score > existing.score) {
    await awardXp(session.userId, "quiz_completed", topicId);
  }

  // Award bonus coins for a perfect score (only if this is the first time achieving it)
  if (score === 100 && (!existing || existing.score < 100)) {
    awardCoins(session.userId, "quiz_perfect_score", undefined, topicId).catch(() => undefined);
  }

  // Award combo bonus XP if combo was active
  if (safeCombo >= 3) {
    const comboXp = safeCombo * 15;
    await awardXpCustom(session.userId, comboXp, `combo_bonus_${safeCombo}x`, topicId);
  }

  // Update quest progress for exercise category (1 exercise completed)
  // Also count correct answers towards flashcard streak if score is high
  await incrementQuestProgress(session.userId, "exercise", score);

  // Fire tree quest engine hook (non-blocking)
  onExerciseComplete(session.userId, Math.round(score / 20)).catch(() => undefined);

  revalidatePath("/app/uebungen");
}
