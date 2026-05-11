"use server";

import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { awardXp } from "@/lib/xp";
import { redirect } from "next/navigation";

export async function gradeCard(cardId: string, rating: number) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "student") throw new Error("Nur Schüler:innen können Karten bewerten");

  const card = await prisma.flashcard.findUnique({
    where: { id: cardId },
    include: { deck: { select: { userId: true } } },
  });

  if (!card || card.deck.userId !== session.userId) {
    throw new Error("Karte nicht gefunden oder kein Zugriff");
  }

  let { interval, easeFactor, repetitions } = card;

  if (rating === 0) {
    // Again: reset
    interval = 1;
    repetitions = 0;
    easeFactor = Math.max(1.3, easeFactor - 0.15);
  } else {
    // Good (rating 4)
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    easeFactor = Math.max(1.3, easeFactor + 0.05);
    repetitions += 1;
  }

  const nextReviewAt = new Date();
  nextReviewAt.setDate(nextReviewAt.getDate() + interval);

  await prisma.flashcard.update({
    where: { id: cardId },
    data: { interval, easeFactor, repetitions, nextReviewAt },
  });

  await awardXp(session.userId, "karteikarte_session", cardId);
}
