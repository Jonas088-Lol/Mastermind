"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { BOSS_TEMPLATES } from "@/lib/game";
import { awardCoins } from "@/lib/coins";

export async function spawnBossBattle(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "admin") return;

  const templateName = String(formData.get("template") ?? "");
  const durationHours = Number(formData.get("durationHours") ?? 24);

  const template = BOSS_TEMPLATES.find((t) => t.name === templateName);
  if (!template) return;

  const startAt = new Date();
  const endAt = new Date(startAt.getTime() + durationHours * 3_600_000);

  await prisma.bossBattle.create({
    data: {
      schoolId: session.schoolId ?? null,
      name: template.name,
      description: template.description,
      lore: template.lore,
      subject: template.subject,
      gradeLevel: template.gradeLevel,
      maxHp: template.maxHp,
      currentHp: template.maxHp,
      difficulty: template.difficulty,
      xpReward: template.xpReward,
      icon: template.icon,
      startAt,
      endAt,
      isActive: true,
    },
  });

  revalidatePath("/admin/gamification");
  revalidatePath("/app/boss");
}

export async function createSeason(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "admin") return;

  const name = String(formData.get("name") ?? "");
  const theme = String(formData.get("theme") ?? "");
  const durationDays = Number(formData.get("durationDays") ?? 30);
  if (!name) return;

  const existing = await prisma.season.count({ where: { schoolId: session.schoolId ?? undefined } });
  const seasonNumber = existing + 1;

  const startAt = new Date();
  const endAt = new Date(startAt.getTime() + durationDays * 86_400_000);

  // Deactivate previous seasons
  await prisma.season.updateMany({
    where: { schoolId: session.schoolId ?? undefined },
    data: { isActive: false },
  });

  await prisma.season.create({
    data: {
      schoolId: session.schoolId ?? null,
      name,
      number: seasonNumber,
      theme: theme || null,
      startAt,
      endAt,
      isActive: true,
    },
  });

  revalidatePath("/admin/gamification");
  revalidatePath("/app/saison");
}

export async function endBossBattle(battleId: string): Promise<void> {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "admin") return;

  await prisma.bossBattle.update({
    where: { id: battleId },
    data: { isActive: false, currentHp: 0 },
  });

  revalidatePath("/admin/gamification");
  revalidatePath("/app/boss");
}

export async function awardWeeklyClassRankings(): Promise<void> {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "admin") return;

  const schoolId = session.schoolId ?? "";

  // Last week's Monday → Sunday
  const now = new Date();
  const dayOfWeek = now.getDay() === 0 ? 7 : now.getDay();
  const lastMonday = new Date(now.getTime() - (dayOfWeek - 1 + 7) * 86_400_000);
  lastMonday.setHours(0, 0, 0, 0);
  const lastSunday = new Date(lastMonday.getTime() + 7 * 86_400_000 - 1);

  const weekKey = lastMonday.toISOString().slice(0, 10);

  // Check if already awarded for this week
  const alreadyAwarded = await prisma.coinLog.findFirst({
    where: { reason: "klasse_platz_1_woche", referenceId: `week-${weekKey}-${schoolId}` },
  });
  if (alreadyAwarded) return;

  // Get all classes in this school
  const classes = await prisma.schoolClass.findMany({
    where: { schoolId },
    select: { id: true },
  });

  for (const cls of classes) {
    // Top student by XP earned last week
    const xpLogs = await prisma.xpLog.groupBy({
      by: ["userId"],
      _sum: { amount: true },
      where: {
        user: { classId: cls.id, role: "student" },
        createdAt: { gte: lastMonday, lte: lastSunday },
      },
      orderBy: { _sum: { amount: "desc" } },
      take: 1,
    });
    if (xpLogs.length === 0 || (xpLogs[0]._sum.amount ?? 0) === 0) continue;

    const winnerId = xpLogs[0].userId;
    await awardCoins(winnerId, "klasse_platz_1_woche", undefined, `week-${weekKey}-${schoolId}`);
  }

  revalidatePath("/admin/gamification");
}
