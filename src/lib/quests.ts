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
    // Atomarer Increment statt Read-Modify-Write: zwei parallele Events
    // würden sonst denselben Ausgangswert lesen und Fortschritt verlieren.
    await prisma.userQuest.update({
      where: { id: uq.id },
      data: { progress: { increment } },
    });
    await prisma.userQuest.updateMany({
      where: { id: uq.id, completedAt: null, progress: { gte: uq.quest.targetCount } },
      data: { completedAt: now },
    });
  }
}
