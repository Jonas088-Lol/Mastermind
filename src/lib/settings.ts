/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { prisma } from "@/lib/db/client";
import { unstable_cache, revalidateTag } from "next/cache";

export type SettingKey =
  | "EVENT_DOUBLE_XP_UNTIL"
  | "EVENT_DOUBLE_COINS_UNTIL"
  | "MAINTENANCE_MODE"
  | "SUPER_ADMIN_EMAILS"
  | "BOSS_RUSH_ACTIVE"
  | "ANNOUNCE_BANNER"
  | "PLATFORM_UPDATE";

export async function getSetting(key: SettingKey): Promise<string | null> {
  const row = await prisma.globalSetting.findUnique({ where: { key } });
  return row?.value ?? null;
}

export async function setSetting(key: SettingKey, value: string, actorId?: string): Promise<void> {
  await prisma.globalSetting.upsert({
    where: { key },
    create: { key, value, updatedBy: actorId },
    update: { value, updatedBy: actorId },
  });
  // Invalidate immediately so admin sees changes right away
  revalidateTag("global-settings", { expire: 0 });
}

export async function deleteSetting(key: SettingKey): Promise<void> {
  await prisma.globalSetting.deleteMany({ where: { key } }).catch(() => {});
  // Invalidate immediately so admin sees changes right away
  revalidateTag("global-settings", { expire: 0 });
}

export async function getEventMultiplier(type: "xp" | "coins"): Promise<number> {
  const key = type === "xp" ? "EVENT_DOUBLE_XP_UNTIL" : "EVENT_DOUBLE_COINS_UNTIL";
  const until = await getSetting(key as SettingKey);
  if (!until) return 1;
  if (new Date(until) < new Date()) return 1;
  return 2;
}

const _fetchActiveEvents = async () => {
  const rows = await prisma.globalSetting.findMany({
    where: {
      key: {
        in: [
          "EVENT_DOUBLE_XP_UNTIL",
          "EVENT_DOUBLE_COINS_UNTIL",
          "MAINTENANCE_MODE",
          "ANNOUNCE_BANNER",
        ],
      },
    },
  });

  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const now = new Date();

  const doubleXpUntil = map["EVENT_DOUBLE_XP_UNTIL"] ? new Date(map["EVENT_DOUBLE_XP_UNTIL"]) : null;
  const doubleCoinsUntil = map["EVENT_DOUBLE_COINS_UNTIL"] ? new Date(map["EVENT_DOUBLE_COINS_UNTIL"]) : null;

  return {
    doubleXp: doubleXpUntil !== null && doubleXpUntil > now,
    doubleXpUntil: doubleXpUntil && doubleXpUntil > now ? doubleXpUntil : null,
    doubleCoins: doubleCoinsUntil !== null && doubleCoinsUntil > now,
    doubleCoinsUntil: doubleCoinsUntil && doubleCoinsUntil > now ? doubleCoinsUntil : null,
    maintenance: map["MAINTENANCE_MODE"] === "true",
    banner: map["ANNOUNCE_BANNER"] || null,
  };
};

export const getActiveEvents = unstable_cache(_fetchActiveEvents, ["active-events"], {
  revalidate: 120,
  tags: ["global-settings"],
});

export async function isSuperAdmin(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isSuperAdmin: true },
  });
  return user?.isSuperAdmin === true;
}
