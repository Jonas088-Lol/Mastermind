/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/client";
import { pushToUsers } from "@/lib/push";
import { logger } from "@/lib/logger";

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) return new Response("Unauthorized", { status: 401 });

  // Users who have a streak > 0 and haven't been active today
  const todayStr = new Date().toISOString().slice(0, 10);

  const atRisk = await prisma.user.findMany({
    where: {
      role: "student",
      streak: { gt: 0 },
      OR: [
        { lastActiveDate: null },
        { lastActiveDate: { lt: new Date(todayStr) } },
      ],
    },
    select: { id: true, streak: true, name: true },
  });

  if (atRisk.length === 0) {
    return Response.json({ ok: true, notified: 0 });
  }

  const ids = atRisk.map((u) => u.id);

  // Send individual pushes so we can include streak count
  // Batch into groups of 100 to avoid overloading
  for (let i = 0; i < ids.length; i += 100) {
    const batch = ids.slice(i, i + 100);
    await pushToUsers(batch, {
      title: "🔥 Streak in Gefahr!",
      body: "Dein Streak endet heute Nacht — lern noch kurz was!",
      url: "/app",
    }).catch(() => {});
  }

  logger.info("streak-alarm sent", { count: atRisk.length });
  return Response.json({ ok: true, notified: atRisk.length });
}
