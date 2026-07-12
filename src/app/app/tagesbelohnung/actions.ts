/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/client";
import { berlinDayKey } from "@/lib/date-de";
import { effectiveRole, getSession } from "@/lib/session";
import { LOGIN_REWARD_SCHEDULE } from "@/lib/game";
import { incrementQuestProgress } from "@/lib/quests";
import { awardCoins, COIN_REWARDS } from "@/lib/coins";

export async function claimDailyLoginReward(): Promise<void> {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "student") return;

  const today = berlinDayKey();

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { lastLoginDate: true, totalDailyLogins: true, streak: true },
  });

  if (!user || user.lastLoginDate === today) return;

  const newTotalLogins = (user.totalDailyLogins ?? 0) + 1;
  const dayInCycle = ((newTotalLogins - 1) % LOGIN_REWARD_SCHEDULE.length) + 1;
  const reward = LOGIN_REWARD_SCHEDULE.find((r) => r.day === dayInCycle) ?? LOGIN_REWARD_SCHEDULE[0];

  // Claim atomar: nur der ERSTE Request des Tages gewinnt (Race: parallele
  // Requests würden sonst die Tagesbelohnung doppelt vergeben).
  const claimed = await prisma.user.updateMany({
    where: {
      id: session.userId,
      OR: [{ lastLoginDate: null }, { lastLoginDate: { not: today } }],
    },
    data: {
      lastLoginDate: today,
      totalDailyLogins: newTotalLogins,
      xp: { increment: reward.xp },
    },
  });
  if (claimed.count === 0) return;

  await prisma.$transaction([
    prisma.xpLog.create({
      data: { userId: session.userId, amount: reward.xp, reason: "daily_login_reward" },
    }),
    prisma.dailyLoginReward.create({
      data: { userId: session.userId, day: dayInCycle, xpAwarded: reward.xp },
    }),
  ]);

  await incrementQuestProgress(session.userId, "login");
  await awardCoins(session.userId, "daily_login_reward", COIN_REWARDS.daily_login_reward);

  // Award streak bonus when the user has already established a streak (streak > 0 before today)
  if ((user.streak ?? 0) > 1) {
    awardCoins(session.userId, "daily_streak_bonus").catch(() => undefined);
  }

  revalidatePath("/app/tagesbelohnung");
}
