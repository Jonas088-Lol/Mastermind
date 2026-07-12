/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { prisma } from "@/lib/db/client";
import { awardCoins, COIN_REWARDS } from "@/lib/coins";

export const DAILY_GOAL_TARGET_XP = 100;
export const WEEKLY_GOAL_TARGET_XP = 500;

export type GoalStatus = {
  targetXp: number;
  earnedXp: number;
  reached: boolean;
  claimed: boolean;
};

/** Beginn des heutigen Tages (UTC). */
function startOfTodayUTC(): Date {
  return new Date(new Date().toISOString().slice(0, 10) + "T00:00:00.000Z");
}

/** Beginn der aktuellen Woche (Montag, UTC). */
function startOfWeekUTC(): Date {
  const today = startOfTodayUTC();
  const daysSinceMonday = (today.getUTCDay() + 6) % 7;
  return new Date(today.getTime() - daysSinceMonday * 86_400_000);
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
  return getGoalStatus(userId, startOfTodayUTC(), DAILY_GOAL_TARGET_XP, "daily_goal");
}

export async function getWeeklyGoalStatus(userId: string): Promise<GoalStatus> {
  return getGoalStatus(userId, startOfWeekUTC(), WEEKLY_GOAL_TARGET_XP, "weekly_goal");
}

/** Tagesziel einlösen — mit Doppel-Claim-Schutz. Gibt true zurück, wenn Coins vergeben wurden. */
export async function claimDailyGoal(userId: string): Promise<boolean> {
  const status = await getDailyGoalStatus(userId);
  if (!status.reached || status.claimed) return false;
  await awardCoins(userId, "daily_goal", COIN_REWARDS.daily_goal).catch(() => undefined);
  return true;
}

/** Wochenziel einlösen — mit Doppel-Claim-Schutz. Gibt true zurück, wenn Coins vergeben wurden. */
export async function claimWeeklyGoal(userId: string): Promise<boolean> {
  const status = await getWeeklyGoalStatus(userId);
  if (!status.reached || status.claimed) return false;
  await awardCoins(userId, "weekly_goal", COIN_REWARDS.weekly_goal).catch(() => undefined);
  return true;
}
