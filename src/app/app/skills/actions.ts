/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { SKILL_MAP, type MasteryLevel } from "@/lib/skill-graph";
import { SKILL_NODE_MAP } from "@/lib/skill-tree-nodes";

// ── XP-based skill tree unlock ────────────────────────────────────────────────
export async function unlockSkillNode(
  nodeKey: string
): Promise<{ ok: boolean; error?: string; newXp?: number }> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Nicht eingeloggt" };
  if (effectiveRole(session) !== "student") return { ok: false, error: "Nur für Schüler" };

  const node = SKILL_NODE_MAP.get(nodeKey);
  if (!node || node.isHub) return { ok: false, error: "Ungültiger Knoten" };

  const [user, existing] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.userId }, select: { xp: true } }),
    prisma.userSkillPurchase.findMany({
      where: { userId: session.userId },
      select: { nodeKey: true },
    }),
  ]);

  if (!user) return { ok: false, error: "Benutzer nicht gefunden" };

  const purchased = new Set(existing.map((r) => r.nodeKey));

  if (purchased.has(nodeKey)) return { ok: false, error: "Bereits freigeschaltet" };

  for (const req of node.requires) {
    if (req !== "hub" && !purchased.has(req)) {
      return { ok: false, error: "Voraussetzungen nicht erfüllt" };
    }
  }

  if (user.xp < node.xpCost) {
    return {
      ok: false,
      error: `Nicht genug XP — du brauchst ${node.xpCost.toLocaleString("de-DE")} XP`,
    };
  }

  // Atomar: XP nur abziehen, wenn noch genug vorhanden (Race: parallele Käufe),
  // und Doppelkauf über das Unique-Constraint abfangen (Doppelklick → kein Crash).
  let newXpValue: number;
  try {
    newXpValue = await prisma.$transaction(async (tx) => {
      const spent = await tx.user.updateMany({
        where: { id: session.userId, xp: { gte: node.xpCost } },
        data: { xp: { decrement: node.xpCost } },
      });
      if (spent.count === 0) throw new Error("INSUFFICIENT_XP");
      await tx.userSkillPurchase.create({
        data: { userId: session.userId, nodeKey },
      });
      const u = await tx.user.findUnique({ where: { id: session.userId }, select: { xp: true } });
      return u?.xp ?? 0;
    });
  } catch (err) {
    if (err instanceof Error && err.message === "INSUFFICIENT_XP") {
      return { ok: false, error: `Nicht genug XP — du brauchst ${node.xpCost.toLocaleString("de-DE")} XP` };
    }
    // z. B. Unique-Violation bei Doppelklick
    return { ok: false, error: "Bereits freigeschaltet" };
  }
  const updated = { xp: newXpValue };

  // Apply feature effects immediately on purchase
  if (node.nodeType === "feature" && node.featureId) {
    await applyFeatureEffect(session.userId, node.featureId);
  }

  return { ok: true, newXp: updated.xp };
}

async function applyFeatureEffect(userId: string, featureId: string): Promise<void> {
  const now = Date.now();
  switch (featureId) {
    case "streak_shield":
      // Grant 3 streak freezes
      await prisma.user.update({
        where: { id: userId },
        data: { streakFreezes: { increment: 3 } },
      });
      break;

    case "xp_boost":
      // 1.2× XP booster for 7 days
      await prisma.userBooster.create({
        data: {
          userId,
          boosterSlug: "skill_tree_xp_boost",
          multiplier: 1.2,
          expiresAt: new Date(now + 7 * 24 * 60 * 60 * 1000),
        },
      });
      break;

    case "daily_coin":
      // Instant 150 coin grant
      await prisma.user.update({
        where: { id: userId },
        data: { coins: { increment: 150 } },
      });
      break;

    case "mystery_box":
      // 750 XP + 200 coins
      await prisma.user.update({
        where: { id: userId },
        data: { xp: { increment: 750 }, coins: { increment: 200 } },
      });
      break;

    case "mega_boost":
      // ×2 XP booster for 24h
      await prisma.userBooster.create({
        data: {
          userId,
          boosterSlug: "skill_tree_mega_boost",
          multiplier: 2.0,
          expiresAt: new Date(now + 24 * 60 * 60 * 1000),
        },
      });
      break;

    // combo, combo_master, timer, profile_frame, missions, boss_buff, prestige
    // are passive/UI features — no server-side effect needed on purchase
    default:
      break;
  }
}

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
    select: { correct: true, topic: { select: { subject: true } } },
  });
  if (!q) return { correct: false };

  // Frage muss zum Fach des Skill-Knotens gehören (sonst: eine bekannte leichte
  // Frage für beliebige Skills wiederverwenden)
  const nodeSubjects = node.subjects ?? (node.subject ? [node.subject] : []);
  if (nodeSubjects.length > 0 && !nodeSubjects.includes(q.topic.subject)) {
    return { correct: false };
  }

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
