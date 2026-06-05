"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";

export async function sendChallenge(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "student") return;

  const challengedId = (formData.get("challengedId") as string | null)?.trim();
  const topicId = (formData.get("topicId") as string | null)?.trim();
  const message = (formData.get("message") as string | null)?.trim() ?? null;

  if (!challengedId || !topicId) return;
  if (challengedId === session.userId) return;

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
    const loserId = winnerId === duel.challengerId ? duel.challengedId : duel.challengerId;
    await prisma.$transaction([
      ...(winnerId
        ? [
            prisma.user.update({ where: { id: winnerId }, data: { xp: { increment: WINNER_XP } } }),
            prisma.xpLog.create({ data: { userId: winnerId, amount: WINNER_XP, reason: "duel_win", referenceId: duelId } }),
          ]
        : []),
      prisma.user.update({ where: { id: loserId }, data: { xp: { increment: PARTICIPANT_XP } } }),
      prisma.xpLog.create({ data: { userId: loserId, amount: PARTICIPANT_XP, reason: "duel_participate", referenceId: duelId } }),
    ]);

    // Notification for both
    const winnerMsg = winnerId
      ? `Du hast gewonnen! ${challScore}:${challedScore} — +${WINNER_XP} XP`
      : `Unentschieden! ${challScore}:${challedScore} — +${PARTICIPANT_XP} XP`;
    const loserMsg = `Duell beendet: ${challScore}:${challedScore} — +${PARTICIPANT_XP} XP`;

    await prisma.appNotification.createMany({
      data: [
        { userId: winnerId ?? duel.challengerId, type: "duel_result", title: "Duell beendet", body: winnerMsg, linkUrl: `/app/duelle/${duelId}` },
        { userId: loserId, type: "duel_result", title: "Duell beendet", body: loserMsg, linkUrl: `/app/duelle/${duelId}` },
      ],
    });

    return { done: true };
  }

  revalidatePath("/app/duelle");
  return { done: false };
}
