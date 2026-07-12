/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { pushToUsers } from "@/lib/push";
import { logger } from "@/lib/logger";

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) return new Response("Unauthorized", { status: 401 });

  const now = new Date();

  // Find all seasons that ended but haven't been archived yet
  const expiredSeasons = await prisma.season.findMany({
    where: { isActive: true, endAt: { lte: now } },
  });

  if (expiredSeasons.length === 0) {
    return Response.json({ ok: true, archived: 0 });
  }

  let archived = 0;

  for (const season of expiredSeasons) {
    const schoolFilter = season.schoolId ? { schoolId: season.schoolId } : {};
    const studentFilter = { role: "student", ...schoolFilter };

    // Gather all leaderboard data
    const [xpTop, coinsTop, streakTop, bossTop, mvpTop] = await Promise.all([
      prisma.user.findMany({ where: studentFilter, select: { id: true, xp: true }, orderBy: { xp: "desc" }, take: 100 }),
      prisma.user.findMany({ where: studentFilter, select: { id: true, coins: true }, orderBy: { coins: "desc" }, take: 100 }),
      prisma.user.findMany({ where: { ...studentFilter, streak: { gt: 0 } }, select: { id: true, streak: true }, orderBy: { streak: "desc" }, take: 100 }),
      prisma.bossParticipant.groupBy({
        by: ["userId"],
        _sum: { damage: true },
        where: { user: studentFilter },
        orderBy: { _sum: { damage: "desc" } },
        take: 100,
      }),
      prisma.bossParticipant.groupBy({
        by: ["userId"],
        _count: { isMvp: true },
        where: { user: studentFilter, isMvp: true },
        orderBy: { _count: { isMvp: "desc" } },
        take: 100,
      }),
    ]);

    // Write ranking entries
    const entries: {
      seasonId: string; userId: string; category: string;
      rank: number; score: bigint; schoolId: string | null;
    }[] = [];

    xpTop.forEach((u, i) => entries.push({ seasonId: season.id, userId: u.id, category: "xp", rank: i + 1, score: BigInt(u.xp), schoolId: season.schoolId ?? null }));
    coinsTop.forEach((u, i) => entries.push({ seasonId: season.id, userId: u.id, category: "coins", rank: i + 1, score: BigInt(u.coins), schoolId: season.schoolId ?? null }));
    streakTop.forEach((u, i) => entries.push({ seasonId: season.id, userId: u.id, category: "streak", rank: i + 1, score: BigInt(u.streak), schoolId: season.schoolId ?? null }));
    bossTop.forEach((r, i) => entries.push({ seasonId: season.id, userId: r.userId, category: "boss", rank: i + 1, score: BigInt(r._sum.damage ?? 0), schoolId: season.schoolId ?? null }));
    mvpTop.forEach((r, i) => entries.push({ seasonId: season.id, userId: r.userId, category: "mvp", rank: i + 1, score: BigInt(r._count.isMvp), schoolId: season.schoolId ?? null }));

    if (entries.length > 0) {
      // skipDuplicates gibt es nur beim Postgres-Client (Produktion); der lokale
      // SQLite-Client kennt es nicht → Cast, Laufzeitverhalten bleibt gleich.
      await prisma.seasonRankingEntry.createMany({ data: entries, skipDuplicates: true } as Prisma.SeasonRankingEntryCreateManyArgs);
    }

    // Deactivate season
    await prisma.season.update({ where: { id: season.id }, data: { isActive: false } });

    // Notify students
    const students = await prisma.user.findMany({ where: studentFilter, select: { id: true } });
    pushToUsers(students.map((u) => u.id), {
      title: "🏆 Saison beendet!",
      body: `Saison "${season.name}" ist vorbei. Schau dir die Hall of Fame an!`,
      url: "/app/hall-of-fame",
    }).catch(() => {});

    archived++;
    logger.info("season archived", { seasonId: season.id, entries: entries.length });
  }

  return Response.json({ ok: true, archived });
}
