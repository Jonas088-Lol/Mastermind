import { prisma } from "@/lib/db/client";

export interface BoosterDef {
  slug: string;
  name: string;
  multiplier: number;
  durationMinutes: number;
  icon: string;
  color: string;
}

export const BOOSTER_DEFS: BoosterDef[] = [
  { slug: "boost_1_5x_1h",  name: "XP-Booster ×1.5 (1h)",   multiplier: 1.5, durationMinutes: 60,   icon: "⚡", color: "#f59e0b" },
  { slug: "boost_2x_1h",    name: "XP-Booster ×2 (1h)",     multiplier: 2.0, durationMinutes: 60,   icon: "🚀", color: "#ef4444" },
  { slug: "boost_3x_30m",   name: "XP-Booster ×3 (30min)",  multiplier: 3.0, durationMinutes: 30,   icon: "💥", color: "#dc2626" },
  { slug: "boost_1_5x_24h", name: "XP-Booster ×1.5 (24h)",  multiplier: 1.5, durationMinutes: 1440, icon: "🌟", color: "#8b5cf6" },
  { slug: "boost_2x_24h",   name: "XP-Booster ×2 (24h)",    multiplier: 2.0, durationMinutes: 1440, icon: "💎", color: "#7c3aed" },
  { slug: "boost_2x_7d",    name: "XP-Booster ×2 (7 Tage)", multiplier: 2.0, durationMinutes: 10080, icon: "👑", color: "#fbbf24" },
];

export function getBoosterDef(slug: string): BoosterDef | undefined {
  return BOOSTER_DEFS.find((b) => b.slug === slug);
}

export async function getActiveBooster(userId: string): Promise<{
  boosterSlug: string;
  multiplier: number;
  expiresAt: Date;
} | null> {
  const now = new Date();
  const active = await prisma.userBooster.findFirst({
    where: { userId, expiresAt: { gt: now } },
    orderBy: { multiplier: "desc" },
  });
  return active
    ? { boosterSlug: active.boosterSlug, multiplier: active.multiplier, expiresAt: active.expiresAt }
    : null;
}

export async function activateBooster(userId: string, boosterSlug: string): Promise<boolean> {
  const def = getBoosterDef(boosterSlug);
  if (!def) return false;

  const now = new Date();
  const expiresAt = new Date(now.getTime() + def.durationMinutes * 60_000);

  await prisma.userBooster.create({
    data: { userId, boosterSlug, multiplier: def.multiplier, activatedAt: now, expiresAt },
  });
  return true;
}

export async function applyBoosterToXp(baseXp: number, userId: string): Promise<number> {
  const booster = await getActiveBooster(userId);
  if (!booster) return baseXp;
  return Math.round(baseXp * booster.multiplier);
}
