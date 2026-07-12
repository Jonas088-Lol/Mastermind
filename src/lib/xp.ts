/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { prisma } from "@/lib/db/client";
import { checkAndAwardAchievements } from "@/lib/achievements";
import { applyBoosterToXp } from "@/lib/booster";
import { awardCoins, COIN_REWARDS } from "@/lib/coins";
import { logger } from "@/lib/logger";

export const XP_REWARDS = {
  aufgabe_abgabe: 20,
  aufgabe_bewertet: 10,
  karteikarte_session: 5,
  note_geteilt: 15,
  quiz_completed: 10,
} as const;

export type XpReason = keyof typeof XP_REWARDS;

export function levelFromXp(xp: number): number {
  return Math.floor(xp / 100) + 1;
}

export function xpToNextLevel(xp: number): number {
  const currentLevel = levelFromXp(xp);
  return currentLevel * 100 - xp;
}

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

async function awardXpCore(
  userId: string,
  amount: number,
  reason: string,
  referenceId?: string
): Promise<{ newStreak: number; prevStreak: number }> {
  const today = todayUTC();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { streak: true, lastActiveDate: true },
  });

  let newStreak = user?.streak ?? 0;
  const lastDate = user?.lastActiveDate?.toISOString().slice(0, 10);

  if (lastDate !== today) {
    const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
    newStreak = lastDate === yesterday ? newStreak + 1 : 1;
  }

  await prisma.$transaction([
    prisma.xpLog.create({ data: { userId, amount, reason, referenceId } }),
    prisma.user.update({
      where: { id: userId },
      data: {
        xp: { increment: amount },
        streak: newStreak,
        lastActiveDate: new Date(),
      },
    }),
  ]);

  return { newStreak, prevStreak: user?.streak ?? 0 };
}

/** Award a fixed XP amount with an arbitrary reason string (for skill tree rank-ups etc.) */
export async function awardXpCustom(
  userId: string,
  amount: number,
  reason: string,
  referenceId?: string
): Promise<void> {
  await awardXpCore(userId, amount, reason, referenceId);
  checkAndAwardAchievements(userId).catch(() => undefined);
}

export async function awardXp(
  userId: string,
  reason: XpReason,
  referenceId?: string
): Promise<void> {
  const base = XP_REWARDS[reason];
  const amount = await applyBoosterToXp(base, userId);

  const { newStreak, prevStreak } = await awardXpCore(userId, amount, reason, referenceId);

  // Award coins for this activity (fire-and-forget)
  const coinAmount = COIN_REWARDS[reason as keyof typeof COIN_REWARDS] ?? 0;
  if (coinAmount > 0) {
    awardCoins(userId, reason, coinAmount, referenceId).catch((err) => {
      logger.error("xp: coin award failed", err, { userId, reason });
    });
  }

  // One-time streak milestone coin awards (7-day and 30-day streaks)
  if (prevStreak < 7 && newStreak >= 7) {
    awardCoins(userId, "streak_7_tage").catch((err) => {
      logger.error("xp: streak_7_tage coin failed", err, { userId });
    });
  }
  if (prevStreak < 30 && newStreak >= 30) {
    awardCoins(userId, "streak_30_tage").catch((err) => {
      logger.error("xp: streak_30_tage coin failed", err, { userId });
    });
  }

  // Fire-and-forget achievement check (non-blocking)
  checkAndAwardAchievements(userId).catch((err) => {
    logger.error("xp: achievement check failed", err, { userId });
  });
}
