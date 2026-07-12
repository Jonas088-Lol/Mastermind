/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { prisma } from "@/lib/db/client";

export async function incrementQuestProgress(
  userId: string,
  category: string,
  increment = 1,
): Promise<void> {
  const now = new Date();

  const activeQuests = await prisma.userQuest.findMany({
    where: {
      userId,
      completedAt: null,
      quest: { category },
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    include: { quest: { select: { targetCount: true } } },
  });

  for (const uq of activeQuests) {
    const newProgress = uq.progress + increment;
    const isComplete = newProgress >= uq.quest.targetCount;

    await prisma.userQuest.update({
      where: { id: uq.id },
      data: {
        progress: newProgress,
        ...(isComplete ? { completedAt: now } : {}),
      },
    });
  }
}
