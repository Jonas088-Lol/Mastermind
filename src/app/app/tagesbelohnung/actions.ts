"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { LOGIN_REWARD_SCHEDULE } from "@/lib/game";
import { incrementQuestProgress } from "@/lib/quests";
import { awardCoins, COIN_REWARDS } from "@/lib/coins";

export async function claimDailyLoginReward(): Promise<void> {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "student") return;

  const today = new Date().toISOString().slice(0, 10);

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { lastLoginDate: true, totalDailyLogins: true },
  });

  if (!user || user.lastLoginDate === today) return;

  const newTotalLogins = (user.totalDailyLogins ?? 0) + 1;
  const dayInCycle = ((newTotalLogins - 1) % LOGIN_REWARD_SCHEDULE.length) + 1;
  const reward = LOGIN_REWARD_SCHEDULE.find((r) => r.day === dayInCycle) ?? LOGIN_REWARD_SCHEDULE[0];

  await prisma.$transaction([
    prisma.user.update({
      where: { id: session.userId },
      data: {
        lastLoginDate: today,
        totalDailyLogins: newTotalLogins,
        xp: { increment: reward.xp },
      },
    }),
    prisma.xpLog.create({
      data: { userId: session.userId, amount: reward.xp, reason: "daily_login_reward" },
    }),
    prisma.dailyLoginReward.create({
      data: { userId: session.userId, day: dayInCycle, xpAwarded: reward.xp },
    }),
  ]);

  await incrementQuestProgress(session.userId, "login");
  await awardCoins(session.userId, "daily_login_reward", COIN_REWARDS.daily_login_reward);

  revalidatePath("/app/tagesbelohnung");
}
