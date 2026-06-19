"use server";

import { prisma } from "@/lib/db/client";
import { getSession } from "@/lib/session";
import { awardCoins } from "@/lib/coins";
import { WHEEL_SEGMENTS } from "./LuckyWheelClient";

export async function spinWheel(): Promise<
  { segmentIndex: number; label: string; type: string; value: number } | { error: string }
> {
  const session = await getSession();
  if (!session) return { error: "Unauthorized" };

  // Check already spun today
  const todayStr = new Date().toISOString().slice(0, 10);
  const alreadySpun = await prisma.coinLog.findFirst({
    where: { userId: session.userId, reason: "lucky_wheel", createdAt: { gte: new Date(todayStr) } },
  });
  if (alreadySpun) return { error: "Bereits heute gedreht" };

  // Weighted random (common segments are just repeated in the array)
  const idx = Math.floor(Math.random() * WHEEL_SEGMENTS.length);
  const seg = WHEEL_SEGMENTS[idx];

  if (seg.type === "coins") {
    await awardCoins(session.userId, "lucky_wheel", seg.value);
  } else if (seg.type === "xp") {
    await prisma.user.update({ where: { id: session.userId }, data: { xp: { increment: seg.value } } });
    await prisma.xpLog.create({ data: { userId: session.userId, amount: seg.value, reason: "lucky_wheel" } });
    // Log entry for dedup check (reuse coinLog with amount=0 and a referenceId)
    await prisma.coinLog.create({ data: { userId: session.userId, amount: 0, reason: "lucky_wheel", referenceId: todayStr } });
  } else if (seg.type === "booster") {
    const expiresAt = new Date(Date.now() + 2 * 3_600_000); // 2h booster
    await prisma.userBooster.create({
      data: { userId: session.userId, boosterSlug: "xp-2x-2h", multiplier: 2, activatedAt: new Date(), expiresAt },
    });
    await prisma.coinLog.create({ data: { userId: session.userId, amount: 0, reason: "lucky_wheel", referenceId: todayStr } });
  }

  return { segmentIndex: idx, label: seg.label, type: seg.type, value: seg.value };
}
