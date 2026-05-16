"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/client";
import { getSession } from "@/lib/session";
import { awardXp } from "@/lib/xp";
import { incrementQuestProgress } from "@/lib/quests";

export async function saveQuizResult(topicId: string, score: number): Promise<void> {
  const session = await getSession();
  if (!session) return;

  await prisma.exerciseProgress.upsert({
    where: { userId_topicId: { userId: session.userId, topicId } },
    update: { score, completedAt: new Date() },
    create: { userId: session.userId, topicId, score, completedAt: new Date() },
  });

  await awardXp(session.userId, "quiz_completed", topicId);

  // Update quest progress for exercise category (1 exercise completed)
  // Also count correct answers towards flashcard streak if score is high
  await incrementQuestProgress(session.userId, "exercise", score);

  revalidatePath("/app/uebungen");
}
