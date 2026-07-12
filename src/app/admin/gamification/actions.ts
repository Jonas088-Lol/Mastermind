/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { awardCoins } from "@/lib/coins";

export async function createSeason(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "admin") return;

  const name        = String(formData.get("name") ?? "");
  const theme       = String(formData.get("theme") ?? "");
  const durationDays = Number(formData.get("durationDays") ?? 30);
  if (!name) return;

  // "?? null" statt "?? undefined": ohne schoolId würde der Filter komplett
  // entfallen und ALLE Saisons aller Schulen deaktiviert werden
  const existing = await prisma.season.count({ where: { schoolId: session.schoolId ?? null } });
  const seasonNumber = existing + 1;

  const safeDuration = Number.isFinite(durationDays) && durationDays > 0 ? durationDays : 30;
  const startAt = new Date();
  const endAt   = new Date(startAt.getTime() + safeDuration * 86_400_000);

  await prisma.season.updateMany({
    where: { schoolId: session.schoolId ?? null },
    data:  { isActive: false },
  });

  await prisma.season.create({
    data: {
      schoolId: session.schoolId ?? null,
      name,
      number: seasonNumber,
      theme:  theme || null,
      startAt,
      endAt,
      isActive: true,
    },
  });

  revalidatePath("/admin/gamification");
  revalidatePath("/app/saison");
}

export async function awardWeeklyClassRankings(): Promise<void> {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "admin") return;

  const schoolId = session.schoolId ?? "";

  const now        = new Date();
  const dayOfWeek  = now.getDay() === 0 ? 7 : now.getDay();
  const lastMonday = new Date(now.getTime() - (dayOfWeek - 1 + 7) * 86_400_000);
  lastMonday.setHours(0, 0, 0, 0);
  const lastSunday = new Date(lastMonday.getTime() + 7 * 86_400_000 - 1);

  const weekKey = lastMonday.toISOString().slice(0, 10);

  const alreadyAwarded = await prisma.coinLog.findFirst({
    where: { reason: "klasse_platz_1_woche", referenceId: `week-${weekKey}-${schoolId}` },
  });
  if (alreadyAwarded) return;

  const classes = await prisma.schoolClass.findMany({
    where: { schoolId },
    select: { id: true },
  });

  for (const cls of classes) {
    const xpLogs = await prisma.xpLog.groupBy({
      by: ["userId"],
      _sum: { amount: true },
      where: {
        user:      { classId: cls.id, role: "student" },
        createdAt: { gte: lastMonday, lte: lastSunday },
      },
      orderBy: { _sum: { amount: "desc" } },
      take: 1,
    });
    if (xpLogs.length === 0 || (xpLogs[0]._sum.amount ?? 0) === 0) continue;
    await awardCoins(xpLogs[0].userId, "klasse_platz_1_woche", undefined, `week-${weekKey}-${schoolId}`);
  }

  revalidatePath("/admin/gamification");
}
