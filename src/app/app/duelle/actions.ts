/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { awardCoins } from "@/lib/coins";

export async function sendChallenge(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "student") return;

  const challengedId = (formData.get("challengedId") as string | null)?.trim();
  const topicId = (formData.get("topicId") as string | null)?.trim();
  const message = (formData.get("message") as string | null)?.trim() ?? null;

  if (!challengedId || !topicId) return;
  if (challengedId === session.userId) return;

  // Verify opponent is in the same school and class
  const opponent = await prisma.user.findUnique({
    where: { id: challengedId },
    select: { schoolId: true, classId: true, role: true },
  });
  if (!opponent || opponent.schoolId !== session.schoolId) return;
  if (opponent.role !== "student") return;
  if (session.classId && opponent.classId !== session.classId) return;

  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48h

  await prisma.duel.create({
    data: {
      challengerId: session.userId,
      challengedId,
      topicId,
      message,
      expiresAt,
    },
  });

  // Notification für Herausgeforderter
  await prisma.appNotification.create({
    data: {
      userId: challengedId,
      type: "duel_challenge",
      title: "Duell-Herausforderung!",
      body: `${session.name} hat dich zu einem Quiz-Duell herausgefordert.`,
      linkUrl: "/app/duelle",
    },
  });

  revalidatePath("/app/duelle");
}

export async function rematchDuel(duelId: string): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "student") return;

  const id = duelId?.trim();
  if (!id) return;

  const duel = await prisma.duel.findUnique({
    where: { id },
    select: { challengerId: true, challengedId: true, topicId: true, status: true },
  });
  if (!duel || duel.status !== "completed") return;

  const isChallenger = duel.challengerId === session.userId;
  const isChallenged = duel.challengedId === session.userId;
  if (!isChallenger && !isChallenged) return;

  const opponentId = isChallenger ? duel.challengedId : duel.challengerId;

  // Gegner muss weiterhin Schüler derselben Schule sein
  const opponent = await prisma.user.findUnique({
    where: { id: opponentId },
    select: { schoolId: true, role: true },
  });
  if (!opponent || opponent.role !== "student" || opponent.schoolId !== session.schoolId) return;

  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48h

  await prisma.duel.create({
    data: {
      challengerId: session.userId,
      challengedId: opponentId,
      topicId: duel.topicId,
      message: "Revanche!",
      expiresAt,
    },
  });

  await prisma.appNotification.create({
    data: {
      userId: opponentId,
      type: "duel_challenge",
      title: "Revanche-Herausforderung!",
      body: `${session.name} fordert dich zur Revanche heraus.`,
      linkUrl: "/app/duelle",
    },
  });

  revalidatePath("/app/duelle");
}

export async function acceptDuel(duelId: string): Promise<void> {
  const session = await getSession();
  if (!session) return;

  const duel = await prisma.duel.findUnique({ where: { id: duelId } });
  if (!duel || duel.challengedId !== session.userId || duel.status !== "pending") return;

  await prisma.duel.update({
    where: { id: duelId },
    data: { status: "accepted" },
  });

  revalidatePath("/app/duelle");
}

export async function declineDuel(duelId: string): Promise<void> {
  const session = await getSession();
  if (!session) return;

  const duel = await prisma.duel.findUnique({ where: { id: duelId } });
  if (!duel || duel.challengedId !== session.userId || duel.status !== "pending") return;

  await prisma.duel.update({
    where: { id: duelId },
    data: { status: "declined" },
  });

  revalidatePath("/app/duelle");
}

export async function submitDuelScore(duelId: string, score: number): Promise<{ done: boolean }> {
  const session = await getSession();
  if (!session) return { done: false };

  const duel = await prisma.duel.findUnique({ where: { id: duelId } });
  if (!duel || duel.status !== "accepted") return { done: false };

  const isChallenger = duel.challengerId === session.userId;
  const isChallenged = duel.challengedId === session.userId;
  if (!isChallenger && !isChallenged) return { done: false };

  if (isChallenger && duel.challengerScore !== null) return { done: false };
  if (isChallenged && duel.challengedScore !== null) return { done: false };

  const update = isChallenger
    ? { challengerScore: score }
    : { challengedScore: score };

  const updated = await prisma.duel.update({
    where: { id: duelId },
    data: update,
  });

  // Both submitted → finalize
  const challScore = isChallenger ? score : updated.challengerScore;
  const challedScore = isChallenged ? score : updated.challengedScore;

  if (challScore !== null && challedScore !== null) {
    const winnerId =
      challScore > challedScore
        ? duel.challengerId
        : challedScore > challScore
        ? duel.challengedId
        : null;

    await prisma.duel.update({
      where: { id: duelId },
      data: { status: "completed", winnerId, completedAt: new Date() },
    });

    // XP awards — all writes in one transaction to avoid partial state
    const WINNER_XP = 30;
    const PARTICIPANT_XP = 10;

    if (winnerId) {
      const loserId = winnerId === duel.challengerId ? duel.challengedId : duel.challengerId;
      await prisma.$transaction([
        prisma.user.update({ where: { id: winnerId }, data: { xp: { increment: WINNER_XP } } }),
        prisma.xpLog.create({ data: { userId: winnerId, amount: WINNER_XP, reason: "duel_win", referenceId: duelId } }),
        prisma.user.update({ where: { id: loserId }, data: { xp: { increment: PARTICIPANT_XP } } }),
        prisma.xpLog.create({ data: { userId: loserId, amount: PARTICIPANT_XP, reason: "duel_participate", referenceId: duelId } }),
      ]);

      // Coin awards for winner and loser
      awardCoins(winnerId, "duel_win", undefined, duelId).catch(() => undefined);
      awardCoins(loserId, "duel_participate", undefined, duelId).catch(() => undefined);

      const winnerMsg = `Du hast gewonnen! ${challScore}:${challedScore} — +${WINNER_XP} XP`;
      const loserMsg = `Duell beendet: ${challScore}:${challedScore} — +${PARTICIPANT_XP} XP`;
      await prisma.appNotification.createMany({
        data: [
          { userId: winnerId, type: "duel_result", title: "Duell beendet", body: winnerMsg, linkUrl: `/app/duelle/${duelId}` },
          { userId: loserId, type: "duel_result", title: "Duell beendet", body: loserMsg, linkUrl: `/app/duelle/${duelId}` },
        ],
      });
    } else {
      // Draw — both players get participation XP and notifications
      const drawMsg = `Unentschieden! ${challScore}:${challedScore} — +${PARTICIPANT_XP} XP`;
      awardCoins(duel.challengerId, "duel_participate", undefined, duelId).catch(() => undefined);
      awardCoins(duel.challengedId, "duel_participate", undefined, duelId).catch(() => undefined);
      await prisma.$transaction([
        prisma.user.update({ where: { id: duel.challengerId }, data: { xp: { increment: PARTICIPANT_XP } } }),
        prisma.xpLog.create({ data: { userId: duel.challengerId, amount: PARTICIPANT_XP, reason: "duel_participate", referenceId: duelId } }),
        prisma.user.update({ where: { id: duel.challengedId }, data: { xp: { increment: PARTICIPANT_XP } } }),
        prisma.xpLog.create({ data: { userId: duel.challengedId, amount: PARTICIPANT_XP, reason: "duel_participate", referenceId: duelId } }),
      ]);
      await prisma.appNotification.createMany({
        data: [
          { userId: duel.challengerId, type: "duel_result", title: "Duell beendet", body: drawMsg, linkUrl: `/app/duelle/${duelId}` },
          { userId: duel.challengedId, type: "duel_result", title: "Duell beendet", body: drawMsg, linkUrl: `/app/duelle/${duelId}` },
        ],
      });
    }

    return { done: true };
  }

  revalidatePath("/app/duelle");
  return { done: false };
}
