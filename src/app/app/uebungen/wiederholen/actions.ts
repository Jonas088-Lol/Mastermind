/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use server";

import { prisma } from "@/lib/db/client";
import { getSession } from "@/lib/session";
import { awardXpCustom } from "@/lib/xp";

const REASON = "fehler_wiederholung";
const DAILY_CAP = 3;

/**
 * Vergibt 3 XP für eine abgeschlossene Fehler-Wiederhol-Session.
 * Maximal 3 Belohnungen pro Tag (über XpLog gezählt).
 */
export async function rewardRepeatSession(): Promise<void> {
  const session = await getSession();
  if (!session) return;

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const todayCount = await prisma.xpLog.count({
    where: { userId: session.userId, reason: REASON, createdAt: { gte: startOfDay } },
  });
  if (todayCount >= DAILY_CAP) return;

  awardXpCustom(session.userId, 3, REASON).catch(() => undefined);
}
