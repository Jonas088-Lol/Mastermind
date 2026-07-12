/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/client";
import { getSession } from "@/lib/session";
import { addToLeaderboard, removeFromLeaderboard } from "@/lib/leaderboard";

export async function updateLeaderboardOptIn(optIn: boolean): Promise<void> {
  const session = await getSession();
  if (!session) return;

  const user = await prisma.user.findUnique({
    where:  { id: session.userId },
    select: { xp: true, bundeslandCode: true, landkreisId: true },
  });
  if (!user) return;

  await prisma.user.update({
    where: { id: session.userId },
    data:  { leaderboardOptIn: optIn },
  });

  if (optIn) {
    await addToLeaderboard(session.userId, user.xp, user.bundeslandCode, user.landkreisId);
  } else {
    await removeFromLeaderboard(session.userId, user.bundeslandCode, user.landkreisId);
  }

  revalidatePath("/app/rangliste");
}
