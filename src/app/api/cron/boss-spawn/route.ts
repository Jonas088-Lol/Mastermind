/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/client";
import { pushToUsers } from "@/lib/push";
import { logger } from "@/lib/logger";
import { randomBossTier, BOSS_TIERS, BOSS_INDEX, BOSS_GRADES } from "@/lib/game";

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Only spawn if no global boss is currently active
  const existing = await prisma.bossBattle.findFirst({
    where: { isActive: true, currentHp: { gt: 0 }, schoolId: null },
  });

  if (existing) {
    logger.info("boss-spawn skipped: active boss exists", { battleId: existing.id });
    return Response.json({ ok: true, skipped: true, reason: "active_boss_exists" });
  }

  const tier = randomBossTier();
  const tierData = BOSS_TIERS[tier];

  // Pick random template matching the rolled tier
  const pool = BOSS_INDEX.filter((b) => b.tier === tier);
  const template = pool[Math.floor(Math.random() * pool.length)] ?? BOSS_INDEX[0];
  // Pick random grade
  const gradeLevel = BOSS_GRADES[Math.floor(Math.random() * BOSS_GRADES.length)];

  const now = new Date();
  const endAt = new Date(now.getTime() + 12 * 60 * 60 * 1000); // 12h window to defeat

  const battle = await prisma.bossBattle.create({
    data: {
      schoolId: null, // global boss for all schools
      name: template.name,
      description: template.description,
      lore: template.lore,
      subject: template.subject,
      gradeLevel,
      tier,
      maxHp: tierData.hp,
      currentHp: tierData.hp,
      difficulty: "hard",
      coinReward: tierData.coinReward,
      mvpCoinReward: tierData.mvpCoinReward,
      xpReward: tierData.xpReward,
      icon: template.icon,
      startAt: now,
      endAt,
      isActive: true,
    },
  });

  // Push notification to all students
  const studentIds = await prisma.user.findMany({
    where: { role: "student" },
    select: { id: true },
  });

  const ids = studentIds.map((u) => u.id);
  if (ids.length > 0) {
    pushToUsers(ids, {
      title: `${template.icon} Neuer Boss spawnt!`,
      body: `${tierData.label}-Boss "${template.name}" greift an! ${tierData.hp} HP — besiegt ihn gemeinsam!`,
      url: "/app/boss",
    }).catch((err) => logger.warn("boss-spawn push failed", { error: String(err) }));
  }

  logger.info("boss-spawn: new boss created", { battleId: battle.id, tier, template: template.name });
  return Response.json({ ok: true, battleId: battle.id, tier, template: template.name, grade: gradeLevel });
}
