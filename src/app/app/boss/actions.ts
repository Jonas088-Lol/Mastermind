"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { pushToUsers } from "@/lib/push";
import { BOSS_TIERS, BOSS_INDEX, type BossTier } from "@/lib/game";
import { getEventMultiplier } from "@/lib/settings";
import { onBossFightWin } from "@/lib/tree-quest-engine";

export interface AttackResult {
  correct: boolean;
  newHp: number;
  maxHp: number;
  defeated: boolean;
  firstBlood: boolean;
  lastHit: boolean;
  coinsEarned: number;
  isMvp?: boolean;
  killData?: {
    mvpName: string;
    mvpAnswers: number;
    totalParticipants: number;
    bossTier: string;
    bossName: string;
    bossIcon: string;
  };
}

export async function attackBoss(
  battleId: string,
  questionId: string,
  selectedOptionIndex: number,
): Promise<AttackResult | { error: string }> {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "student") return { error: "Unauthorized" };

  const battle = await prisma.bossBattle.findFirst({ where: { id: battleId, isActive: true, currentHp: { gt: 0 } } });
  if (!battle) return { error: "Boss not active" };

  // Resolve question — check boss-custom pool first, then general pool
  const bossQ = await prisma.bossQuestion.findUnique({ where: { id: questionId } });
  const genQ  = bossQ ? null : await prisma.exerciseQuestion.findUnique({ where: { id: questionId } });

  if (!bossQ && !genQ) return { error: "Question not found" };

  // Check correctness
  const correct = bossQ
    ? selectedOptionIndex === bossQ.correct
    : String(selectedOptionIndex) === genQ!.correct;

  // Record seen status for boss-custom questions
  if (bossQ) {
    await prisma.bossQuestionSeen.upsert({
      where: { userId_questionId: { userId: session.userId, questionId: bossQ.id } },
      create: { userId: session.userId, questionId: bossQ.id, answeredCorrect: correct },
      update: { answeredCorrect: correct, seenAt: new Date() },
    }).catch(() => {});
  }
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
        include: { user: { select: { name: true } } },
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

  let killData: AttackResult["killData"] | undefined;

  // Award boss-slayer title to MVP and build kill overlay data (non-critical, after TX)
  if (defeated && participantIds.length > 0) {
    const tier = (battle.tier as BossTier) in BOSS_TIERS ? battle.tier as BossTier : "common";
    const tierData = BOSS_TIERS[tier];

    // Find matching BOSS_INDEX entry by name for title awarding
    const indexEntry = BOSS_INDEX.find((b) => b.name === battle.name);
    if (indexEntry && isMvp) {
      const titleSlug = `boss_mvp_${indexEntry.slug}`;
      await prisma.userTitle.upsert({
        where: { userId_titleSlug: { userId: session.userId, titleSlug } },
        create: { userId: session.userId, titleSlug, unlockedAt: new Date() },
        update: {},
      }).catch(() => {});
    }

    // Fetch MVP name for overlay
    const mvpUser = await prisma.user.findUnique({ where: { id: participantIds[0] }, select: { name: true } });
    const mvpParticipant = await prisma.bossParticipant.findFirst({ where: { battleId, isMvp: true }, select: { correctAnswers: true } });

    killData = {
      mvpName: mvpUser?.name ?? "Unbekannt",
      mvpAnswers: mvpParticipant?.correctAnswers ?? 0,
      totalParticipants: participantIds.length,
      bossTier: battle.tier,
      bossName: battle.name,
      bossIcon: battle.icon,
    };

    pushToUsers(participantIds, {
      title: `${battle.icon} Boss besiegt!`,
      body: `Der ${tierData.label}-Boss "${battle.name}" wurde vernichtet! ${isMvp ? "Du bist MVP! 👑" : ""}`,
      url: "/app/boss",
    }).catch(() => {});

    onBossFightWin(session.userId).catch(() => undefined);
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
    killData,
  };
}
