"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { pushToUsers } from "@/lib/push";
import { BOSS_TIERS, type BossTier } from "@/lib/game";
import { getEventMultiplier } from "@/lib/settings";

export interface AttackResult {
  correct: boolean;
  newHp: number;
  maxHp: number;
  defeated: boolean;
  firstBlood: boolean;
  lastHit: boolean;
  coinsEarned: number;
  isMvp?: boolean;
}

export async function attackBoss(
  battleId: string,
  questionId: string,
  selectedOptionIndex: number,
): Promise<AttackResult | { error: string }> {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "student") return { error: "Unauthorized" };

  const [battle, question] = await Promise.all([
    prisma.bossBattle.findFirst({ where: { id: battleId, isActive: true, currentHp: { gt: 0 } } }),
    prisma.exerciseQuestion.findUnique({ where: { id: questionId } }),
  ]);

  if (!battle) return { error: "Boss not active" };
  if (!question) return { error: "Question not found" };

  const opts = JSON.parse(question.options) as Array<{ text: string; correct?: boolean }>;
  const correct = opts[selectedOptionIndex]?.correct === true;
  const isFirstBlood = battle.firstBloodUserId === null;

  if (!correct) {
    await prisma.bossParticipant.upsert({
      where: { userId_battleId: { userId: session.userId, battleId } },
      create: { userId: session.userId, battleId, wrongAnswers: 1 },
      update: { wrongAnswers: { increment: 1 } },
    });
    return { correct: false, newHp: battle.currentHp, maxHp: battle.maxHp, defeated: false, firstBlood: false, lastHit: false, coinsEarned: 0 };
  }

  const newHp = Math.max(0, battle.currentHp - 1);
  const defeated = newHp === 0;
  let coinsEarned = 0;
  let isMvp = false;
  let participantIds: string[] = [];

  const [xpMulti, coinMulti] = await Promise.all([
    getEventMultiplier("xp"),
    getEventMultiplier("coins"),
  ]);

  await prisma.$transaction(async (tx) => {
    // Update boss HP and first blood / last hit
    await tx.bossBattle.update({
      where: { id: battleId },
      data: {
        currentHp: newHp,
        isActive: defeated ? false : true,
        ...(isFirstBlood ? { firstBloodUserId: session.userId } : {}),
        ...(defeated ? { killedByUserId: session.userId } : {}),
      },
    });

    // Upsert participant
    await tx.bossParticipant.upsert({
      where: { userId_battleId: { userId: session.userId, battleId } },
      create: { userId: session.userId, battleId, damage: 1, correctAnswers: 1, firstBlood: isFirstBlood },
      update: { damage: { increment: 1 }, correctAnswers: { increment: 1 }, ...(isFirstBlood ? { firstBlood: true } : {}) },
    });

    // First blood coin bonus
    if (isFirstBlood) {
      coinsEarned += 10;
      await tx.user.update({ where: { id: session.userId }, data: { coins: { increment: 10 } } });
      await tx.coinLog.create({ data: { userId: session.userId, amount: 10, reason: "boss_first_blood", referenceId: battleId } });
    }

    if (defeated) {
      const tier = (battle.tier as BossTier) in BOSS_TIERS ? battle.tier as BossTier : "common";
      const tierData = BOSS_TIERS[tier];

      const participants = await tx.bossParticipant.findMany({
        where: { battleId },
        orderBy: { damage: "desc" },
      });

      participantIds = participants.map((p) => p.userId);
      const totalDamage = participants.reduce((s, p) => s + p.damage, 0);

      for (let i = 0; i < participants.length; i++) {
        const p = participants[i];
        const isPlayerMvp = i === 0;
        const isLastHitter = p.userId === session.userId;
        const shareRatio = totalDamage > 0 ? p.damage / totalDamage : 1 / participants.length;
        const xpShare = Math.round(tierData.xpReward * shareRatio * xpMulti);
        const coins = Math.round((isPlayerMvp ? tierData.mvpCoinReward : tierData.coinReward) * coinMulti);
        const lastHitBonus = isLastHitter ? 15 : 0;
        const totalCoins = coins + lastHitBonus;

        // Update XP
        await tx.user.update({ where: { id: p.userId }, data: { xp: { increment: xpShare } } });
        await tx.xpLog.create({ data: { userId: p.userId, amount: xpShare, reason: "boss_battle_reward", referenceId: battleId } });

        // Award coins
        await tx.user.update({ where: { id: p.userId }, data: { coins: { increment: totalCoins } } });
        await tx.coinLog.create({
          data: { userId: p.userId, amount: coins, reason: isPlayerMvp ? "boss_mvp_bonus" : "boss_battle_reward", referenceId: battleId },
        });
        if (lastHitBonus > 0) {
          await tx.coinLog.create({ data: { userId: p.userId, amount: lastHitBonus, reason: "boss_last_hit", referenceId: battleId } });
        }

        // Update participant record
        await tx.bossParticipant.update({
          where: { id: p.id },
          data: { isMvp: isPlayerMvp, coinsEarned: totalCoins, lastHit: isLastHitter },
        });

        if (p.userId === session.userId) {
          coinsEarned += totalCoins;
          isMvp = isPlayerMvp;
        }
      }
    }
  });

  // Push notification after transaction (non-critical)
  if (defeated && participantIds.length > 0) {
    const tier = (battle.tier as BossTier) in BOSS_TIERS ? battle.tier as BossTier : "common";
    const tierData = BOSS_TIERS[tier];
    pushToUsers(participantIds, {
      title: `${battle.icon} Boss besiegt!`,
      body: `Der ${tierData.label}-Boss "${battle.name}" wurde vernichtet! ${isMvp ? "Du bist MVP! 👑" : ""}`,
      url: "/app/boss",
    }).catch(() => {});
  }

  revalidatePath("/app/boss");

  return {
    correct: true,
    newHp,
    maxHp: battle.maxHp,
    defeated,
    firstBlood: isFirstBlood,
    lastHit: defeated,
    coinsEarned,
    isMvp,
  };
}
