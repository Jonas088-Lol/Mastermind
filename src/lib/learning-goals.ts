/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { prisma } from "@/lib/db/client";
import { berlinStartOfDay, berlinStartOfWeek } from "@/lib/date-de";
import { COIN_REWARDS } from "@/lib/coins";

export const DAILY_GOAL_TARGET_XP = 100;
export const WEEKLY_GOAL_TARGET_XP = 500;

export type GoalStatus = {
  targetXp: number;
  earnedXp: number;
  reached: boolean;
  claimed: boolean;
};

/** Beginn des heutigen Tages (Europe/Berlin). */
function startOfToday(): Date {
  return berlinStartOfDay();
}

/** Beginn der aktuellen Woche (Montag, Europe/Berlin). */
function startOfWeek(): Date {
  return berlinStartOfWeek();
}

async function getGoalStatus(
  userId: string,
  since: Date,
  targetXp: number,
  claimReason: string,
): Promise<GoalStatus> {
  const [xpSum, claimLog] = await Promise.all([
    prisma.xpLog.aggregate({
      where: { userId, createdAt: { gte: since } },
      _sum: { amount: true },
    }),
    prisma.coinLog.findFirst({
      where: { userId, reason: claimReason, createdAt: { gte: since } },
      select: { id: true },
    }),
  ]);

  const earnedXp = xpSum._sum.amount ?? 0;
  return {
    targetXp,
    earnedXp,
    reached: earnedXp >= targetXp,
    claimed: !!claimLog,
  };
}

export async function getDailyGoalStatus(userId: string): Promise<GoalStatus> {
  return getGoalStatus(userId, startOfToday(), DAILY_GOAL_TARGET_XP, "daily_goal");
}

export async function getWeeklyGoalStatus(userId: string): Promise<GoalStatus> {
  return getGoalStatus(userId, startOfWeek(), WEEKLY_GOAL_TARGET_XP, "weekly_goal");
}

/**
 * Ziel einlösen — atomar in einer serialisierbaren Transaktion, damit zwei
 * parallele Claim-Requests nicht beide den "noch nicht geclaimt"-Check
 * passieren und die Coins doppelt vergeben werden.
 */
async function claimGoal(
  userId: string,
  since: Date,
  targetXp: number,
  reason: string,
  coinAmount: number,
): Promise<boolean> {
  try {
    return await prisma.$transaction(
      async (tx) => {
        const xpSum = await tx.xpLog.aggregate({
          where: { userId, createdAt: { gte: since } },
          _sum: { amount: true },
        });
        if ((xpSum._sum.amount ?? 0) < targetXp) return false;

        const claimLog = await tx.coinLog.findFirst({
          where: { userId, reason, createdAt: { gte: since } },
          select: { id: true },
        });
        if (claimLog) return false;

        await tx.user.update({ where: { id: userId }, data: { coins: { increment: coinAmount } } });
        await tx.coinLog.create({ data: { userId, amount: coinAmount, reason } });
        return true;
      },
      { isolationLevel: "Serializable" },
    );
  } catch {
    // Serialisierungskonflikt (paralleler Claim) oder DB-Fehler → kein Claim
    return false;
  }
}

/** Tagesziel einlösen — mit Doppel-Claim-Schutz. Gibt true zurück, wenn Coins vergeben wurden. */
export async function claimDailyGoal(userId: string): Promise<boolean> {
  return claimGoal(userId, startOfToday(), DAILY_GOAL_TARGET_XP, "daily_goal", COIN_REWARDS.daily_goal);
}

/** Wochenziel einlösen — mit Doppel-Claim-Schutz. Gibt true zurück, wenn Coins vergeben wurden. */
export async function claimWeeklyGoal(userId: string): Promise<boolean> {
  return claimGoal(userId, startOfWeek(), WEEKLY_GOAL_TARGET_XP, "weekly_goal", COIN_REWARDS.weekly_goal);
}
