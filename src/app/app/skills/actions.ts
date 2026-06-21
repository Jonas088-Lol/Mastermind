"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { SKILL_MAP, type MasteryLevel } from "@/lib/skill-graph";

// ── Unlock node (first unlock = bronze tier 1 with 0 progress) ────────────────
export async function unlockNode(slug: string): Promise<void> {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "student") return;

  const node = SKILL_MAP.get(slug);
  if (!node) return;

  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { xp: true } });
  if (!user || user.xp < node.requiredXp) return;

  // Check all prerequisites are bronze (tier >= 1)
  if (node.prerequisites.length > 0) {
    const prereqMasteries = await prisma.userSkillMastery.findMany({
      where: { userId: session.userId, nodeSlug: { in: node.prerequisites } },
      select: { nodeSlug: true, masteryTier: true },
    });
    const metMap = new Map(prereqMasteries.map((m) => [m.nodeSlug, m.masteryTier]));
    const allMet = node.prerequisites.every((p) => (metMap.get(p) ?? 0) >= 1);
    if (!allMet) return;
  }

  await prisma.userSkillMastery.upsert({
    where: { userId_nodeSlug: { userId: session.userId, nodeSlug: slug } },
    create: { userId: session.userId, nodeSlug: slug, masteryTier: 1, exercisesDone: 0, unlockedAt: new Date() },
    update: {},
  });

  revalidatePath("/app/skills");
  revalidatePath("/app/uebungen");
}

// ── Submit a practice answer ──────────────────────────────────────────────────
export async function practiceAnswer(
  slug: string,
  questionId: string,
  answeredOption: number,
): Promise<{ correct: boolean; newMastery?: { tier: MasteryLevel; progress: number } }> {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "student") return { correct: false };

  const node = SKILL_MAP.get(slug);
  if (!node) return { correct: false };

  // Verify the question exists and get the correct answer
  const q = await prisma.exerciseQuestion.findUnique({
    where: { id: questionId },
    select: { correct: true },
  });
  if (!q) return { correct: false };

  const correctIdx = parseInt(q.correct ?? "-1", 10);
  const isCorrect  = answeredOption === correctIdx;

  if (!isCorrect) return { correct: false };

  // Increment progress and potentially advance mastery tier
  const current = await prisma.userSkillMastery.findUnique({
    where: { userId_nodeSlug: { userId: session.userId, nodeSlug: slug } },
  });
  if (!current || current.masteryTier < 1) return { correct: true };

  const newDone = current.exercisesDone + 1;
  const reqsForCurrentTier = node.masteryReqs[current.masteryTier - 1]!;

  let newTier  = current.masteryTier as MasteryLevel;
  let progress = newDone;

  if (newDone >= reqsForCurrentTier && current.masteryTier < 3) {
    newTier  = (current.masteryTier + 1) as MasteryLevel;
    progress = 0;
  }

  const updated = await prisma.userSkillMastery.update({
    where: { userId_nodeSlug: { userId: session.userId, nodeSlug: slug } },
    data: {
      exercisesDone: newDone,
      masteryTier:   newTier,
      masteredAt:    newTier === 3 ? new Date() : undefined,
    },
  });

  const progressInCurrentTier = newTier > current.masteryTier ? 0 : newDone - (
    current.masteryTier > 1 ? node.masteryReqs[current.masteryTier - 2]! : 0
  );

  revalidatePath("/app/skills");
  revalidatePath("/app/uebungen");

  return {
    correct: true,
    newMastery: {
      tier:     updated.masteryTier as MasteryLevel,
      progress: progressInCurrentTier,
    },
  };
}
