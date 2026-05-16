"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { awardCoins, COIN_REWARDS } from "@/lib/coins";

export async function attackBoss(battleId: string): Promise<void> {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "student") return;

  const battle = await prisma.bossBattle.findFirst({
    where: { id: battleId, isActive: true, currentHp: { gt: 0 } },
  });

  if (!battle) return;

  // Damage scales with difficulty
  const BASE_DAMAGE: Record<string, number> = {
    normal: 50, hard: 100, epic: 200, legendary: 350,
  };
  const dmg = BASE_DAMAGE[battle.difficulty] ?? 75;

  const newHp = Math.max(0, battle.currentHp - dmg);
  const defeated = newHp === 0;

  await prisma.$transaction(async (tx) => {
    await tx.bossBattle.update({
      where: { id: battleId },
      data: { currentHp: newHp, isActive: defeated ? false : true },
    });

    await tx.bossParticipant.upsert({
      where: { userId_battleId: { userId: session.userId, battleId } },
      create: { userId: session.userId, battleId, damage: dmg, correctAnswers: 1 },
      update: { damage: { increment: dmg }, correctAnswers: { increment: 1 } },
    });

    if (defeated) {
      // Award XP to all participants
      const participants = await tx.bossParticipant.findMany({
        where: { battleId },
        orderBy: { damage: "desc" },
      });

      const totalDamage = participants.reduce((s, p) => s + p.damage, 0);
      for (let i = 0; i < participants.length; i++) {
        const p = participants[i];
        const shareRatio = totalDamage > 0 ? p.damage / totalDamage : 1 / participants.length;
        const xpShare = Math.round(battle.xpReward * shareRatio);
        await tx.user.update({ where: { id: p.userId }, data: { xp: { increment: xpShare } } });
        await tx.xpLog.create({ data: { userId: p.userId, amount: xpShare, reason: "boss_battle_reward", referenceId: battleId } });
        // Award coins — MVP (index 0, sorted by damage desc) gets bonus
        const coins = i === 0 ? COIN_REWARDS.boss_battle_reward + COIN_REWARDS.boss_mvp_bonus : COIN_REWARDS.boss_battle_reward;
        await awardCoins(p.userId, i === 0 ? "boss_mvp_bonus" : "boss_battle_reward", coins, battleId);
      }
    }
  });

  revalidatePath("/app/boss");
}
