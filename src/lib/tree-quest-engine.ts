/* Copyright 2026 Elian Schock, Jonas Schwenk */
/**
 * tree-quest-engine.ts
 * Server-only. Manages quest assignment and progress for the curriculum tree.
 *
 * Anti-cheat: all progress writes happen here, triggered by real feature events.
 * The client NEVER sends XP or mastery claims — it only sends event types.
 *
 * Daily cap: PACING.dailyProgressCap tree-progress-points per calendar day.
 * Each completed TreeQuest = 1 progress point toward a node.
 */

import { TreeNodeStatus, TreeQuestType } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { propagateUnlocks } from "@/lib/tree-generator";
import { addToLeaderboard } from "@/lib/leaderboard";

// ── Pacing config (tune here) ─────────────────────────────────────────────────
export const PACING = {
  dailyProgressCap:  3,  // max TreeQuest completions per day that count toward nodes
  minLearningDayXp: 10,  // XP threshold for a day to count as a "learning day"
  spacedRepIntervals: [1, 3, 7, 14] as const,  // days between review prompts
} as const;

function todayStr() {
  return new Date().toISOString().slice(0, 10);  // "YYYY-MM-DD"
}

// ── Daily cap check ──────────────────────────────────────────────────────────

async function getDailyProgressPts(userId: string): Promise<number> {
  const day = todayStr();
  const row = await prisma.dailyActivity.findUnique({
    where: { userId_day: { userId, day } },
    select: { treeProgressPts: true },
  });
  return row?.treeProgressPts ?? 0;
}

async function incrementDailyActivity(userId: string, xpEarned: number, treeProgressPts: number) {
  const day = todayStr();
  await prisma.dailyActivity.upsert({
    where:  { userId_day: { userId, day } },
    create: { userId, day, questsDone: 1, xpEarned, treeProgressPts },
    update: {
      questsDone:      { increment: 1 },
      xpEarned:        { increment: xpEarned },
      treeProgressPts: { increment: treeProgressPts },
    },
  });
}

// ── Quest assignment ──────────────────────────────────────────────────────────

/**
 * Assign active TreeQuests for all AVAILABLE nodes the user hasn't started yet.
 * Called after curriculum setup and after each node unlock.
 */
export async function assignFrontierQuests(userId: string): Promise<void> {
  const availableProgress = await prisma.userTreeProgress.findMany({
    where:  { userId, status: { in: [TreeNodeStatus.AVAILABLE, TreeNodeStatus.IN_PROGRESS] } },
    select: { nodeId: true },
  });

  const nodeIds = availableProgress.map((p) => p.nodeId);
  if (nodeIds.length === 0) return;

  const quests = await prisma.treeQuest.findMany({
    where:  { nodeId: { in: nodeIds } },
    select: { id: true, nodeId: true },
  });

  for (const quest of quests) {
    await prisma.userTreeQuest.upsert({
      where:  { userId_questId: { userId, questId: quest.id } },
      create: { userId, questId: quest.id },
      update: {},
    });
  }

  // Mark newly assigned nodes as IN_PROGRESS
  await prisma.userTreeProgress.updateMany({
    where:  { userId, nodeId: { in: nodeIds }, status: TreeNodeStatus.AVAILABLE },
    data:   { status: TreeNodeStatus.IN_PROGRESS },
  });
}

// ── Progress advancement ──────────────────────────────────────────────────────

export interface QuestAdvanceResult {
  questCompleted: boolean;
  nodeUnlocked:   boolean;
  newlyAvailable: string[];  // node IDs that just became available
  xpEarned:       number;
  cappedByDay:    boolean;
}

/**
 * Advance progress on all active UserTreeQuests of a given type for a user.
 * Called from feature event handlers (exercise complete, PPTX created, etc.)
 *
 * This is the anti-cheat boundary — only real events reach here.
 */
export async function advanceTreeQuestProgress(
  userId:    string,
  questType: TreeQuestType,
  increment: number = 1,
): Promise<QuestAdvanceResult> {
  const result: QuestAdvanceResult = {
    questCompleted: false,
    nodeUnlocked:   false,
    newlyAvailable: [],
    xpEarned:       0,
    cappedByDay:    false,
  };

  const dailyPts = await getDailyProgressPts(userId);

  // Find all active quests of this type for this user
  const activeQuests = await prisma.userTreeQuest.findMany({
    where: {
      userId,
      completedAt: null,
      quest: { type: questType },
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    include: { quest: { include: { node: { include: { quests: true } } } } },
  });

  for (const uq of activeQuests) {
    const newProgress = uq.progress + increment;
    const isComplete  = newProgress >= uq.quest.target;

    await prisma.userTreeQuest.update({
      where: { id: uq.id },
      data:  { progress: newProgress, ...(isComplete ? { completedAt: new Date() } : {}) },
    });

    if (!isComplete) continue;
    result.questCompleted = true;

    // Check daily cap before counting this as tree progress
    if (dailyPts >= PACING.dailyProgressCap) {
      result.cappedByDay = true;
      // Still reward XP for completing the quest, but don't advance node
      const xp = uq.quest.rewardXp;
      result.xpEarned += xp;
      await awardXp(userId, xp);
      await incrementDailyActivity(userId, xp, 0);
      continue;
    }

    // Count completed quests for this node
    const node = uq.quest.node;
    const completedQuestCount = await prisma.userTreeQuest.count({
      where: {
        userId,
        completedAt: { not: null },
        quest: { nodeId: node.id },
      },
    });

    await prisma.userTreeProgress.upsert({
      where:  { userId_nodeId: { userId, nodeId: node.id } },
      create: { userId, nodeId: node.id, status: TreeNodeStatus.IN_PROGRESS, questsDone: 1 },
      update: { questsDone: completedQuestCount },
    });

    const xp = uq.quest.rewardXp;
    result.xpEarned += xp;
    await awardXp(userId, xp);
    await incrementDailyActivity(userId, xp, 1);

    // Check if node is now mastered
    if (completedQuestCount >= node.requiredQuestCount) {
      const now = new Date();
      await prisma.userTreeProgress.update({
        where: { userId_nodeId: { userId, nodeId: node.id } },
        data:  { status: TreeNodeStatus.MASTERED, masteryTier: 1, masteredAt: now, unlockedAt: now },
      });
      result.nodeUnlocked = true;

      // Propagate unlocks to children
      const newlyAvailable = await propagateUnlocks(userId, node.id);
      result.newlyAvailable.push(...newlyAvailable);

      // Assign quests for newly available nodes
      if (newlyAvailable.length > 0) {
        await assignFrontierQuests(userId);
      }
    }
  }

  return result;
}

/** Award XP to user + update leaderboard. */
async function awardXp(userId: string, amount: number): Promise<void> {
  const updated = await prisma.user.update({
    where:  { id: userId },
    data:   { xp: { increment: amount } },
    select: { xp: true, bundeslandCode: true, landkreisId: true },
  });

  await addToLeaderboard(userId, updated.xp, updated.bundeslandCode, updated.landkreisId);
}

// ── Event hooks (called by existing features) ────────────────────────────────

/** Call this when a user completes an exercise session with ≥70% score. */
export async function onExerciseComplete(userId: string, count: number = 1) {
  return advanceTreeQuestProgress(userId, TreeQuestType.EXERCISES, count);
}

/** Call this when a user creates/submits a PPTX. */
export async function onPptxCreated(userId: string) {
  return advanceTreeQuestProgress(userId, TreeQuestType.PPTX, 1);
}

/** Call this when a user wins a boss fight round. */
export async function onBossFightWin(userId: string) {
  return advanceTreeQuestProgress(userId, TreeQuestType.BOSS_FIGHT, 1);
}

/** Call this when a user completes a flashcard review session. */
export async function onFlashcardsReviewed(userId: string, count: number = 1) {
  return advanceTreeQuestProgress(userId, TreeQuestType.FLASHCARDS, count);
}

/** Call this for quiz completions (general knowledge, quizzes). */
export async function onQuizComplete(userId: string, count: number = 1) {
  return advanceTreeQuestProgress(userId, TreeQuestType.QUIZ, count);
}

/** Call this when a user completes a worksheet. */
export async function onWorksheetComplete(userId: string) {
  return advanceTreeQuestProgress(userId, TreeQuestType.WORKSHEET, 1);
}

/** Call this when a user wins a duel. */
export async function onDuelWon(userId: string) {
  return advanceTreeQuestProgress(userId, TreeQuestType.DUEL, 1);
}

/** Call this at streak update time. */
export async function onStreakDay(userId: string) {
  return advanceTreeQuestProgress(userId, TreeQuestType.STREAK, 1);
}
