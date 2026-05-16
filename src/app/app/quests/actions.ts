"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";

export async function claimQuestReward(questId: string): Promise<void> {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "student") return;

  const userQuest = await prisma.userQuest.findFirst({
    where: { userId: session.userId, questId, completedAt: { not: null }, claimedAt: null },
    include: { quest: true },
  });

  if (!userQuest) return;

  const xpReward = userQuest.quest.xpReward;

  await prisma.$transaction([
    prisma.userQuest.update({
      where: { id: userQuest.id },
      data: { claimedAt: new Date() },
    }),
    prisma.xpLog.create({
      data: { userId: session.userId, amount: xpReward, reason: "quest_reward", referenceId: questId },
    }),
    prisma.user.update({
      where: { id: session.userId },
      data: { xp: { increment: xpReward } },
    }),
  ]);

  // Award title reward if applicable
  if (userQuest.quest.titleReward) {
    await prisma.userTitle.upsert({
      where: { userId_titleSlug: { userId: session.userId, titleSlug: userQuest.quest.titleReward } },
      create: { userId: session.userId, titleSlug: userQuest.quest.titleReward },
      update: {},
    });
  }

  revalidatePath("/app/quests");
}
