"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/client";
import { getSession } from "@/lib/session";
import { awardXp } from "@/lib/xp";
import { awardCoins } from "@/lib/coins";
import { incrementQuestProgress } from "@/lib/quests";
import { onExerciseComplete } from "@/lib/tree-quest-engine";

export async function saveQuizResult(topicId: string, score: number): Promise<void> {
  const session = await getSession();
  if (!session) return;

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

  // Update quest progress for exercise category (1 exercise completed)
  // Also count correct answers towards flashcard streak if score is high
  await incrementQuestProgress(session.userId, "exercise", score);

  // Fire tree quest engine hook (non-blocking)
  onExerciseComplete(session.userId, Math.round(score / 20)).catch(() => undefined);

  revalidatePath("/app/uebungen");
}
