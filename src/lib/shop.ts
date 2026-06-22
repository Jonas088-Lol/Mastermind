import { prisma } from "@/lib/db/client";
import { spendCoins } from "@/lib/coins";
import { activateBooster } from "@/lib/booster";

export interface ShopItemDef {
  slug: string;
  name: string;
  description: string;
  category: "booster" | "streak_freeze" | "cosmetic" | "title" | "powerup" | "bundle";
  coinPrice: number;
  realPrice?: number; // cents
  icon: string;
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
  effect?: string;
  effectValue?: string;
  isLimited?: boolean;
  sortOrder: number;
}

export const SHOP_ITEMS: ShopItemDef[] = [
  // ── Boosters ────────────────────────────────────────────
  { slug: "boost_1_5x_1h",  name: "XP-Booster ×1.5 (1h)",   description: "+50% XP für 1 Stunde",                 category: "booster",       coinPrice: 50,   icon: "⚡", rarity: "common",    effect: "xp_boost", effectValue: '{"multiplier":1.5,"minutes":60}',   sortOrder: 10 },
  { slug: "boost_2x_1h",    name: "XP-Booster ×2 (1h)",     description: "Doppelte XP für 1 Stunde",              category: "booster",       coinPrice: 90,   icon: "🚀", rarity: "uncommon",  effect: "xp_boost", effectValue: '{"multiplier":2.0,"minutes":60}',   sortOrder: 11 },
  { slug: "boost_3x_30m",   name: "XP-Booster ×3 (30min)",  description: "Dreifache XP für 30 Minuten",           category: "booster",       coinPrice: 120,  icon: "💥", rarity: "rare",      effect: "xp_boost", effectValue: '{"multiplier":3.0,"minutes":30}',   sortOrder: 12 },
  { slug: "boost_1_5x_24h", name: "XP-Booster ×1.5 (24h)",  description: "+50% XP für 24 Stunden",                category: "booster",       coinPrice: 200,  icon: "🌟", rarity: "rare",      effect: "xp_boost", effectValue: '{"multiplier":1.5,"minutes":1440}', sortOrder: 13 },
  { slug: "boost_2x_24h",   name: "XP-Booster ×2 (24h)",    description: "Doppelte XP für 24 Stunden",            category: "booster",       coinPrice: 350,  icon: "💎", rarity: "epic",      effect: "xp_boost", effectValue: '{"multiplier":2.0,"minutes":1440}', sortOrder: 14 },
  { slug: "boost_2x_7d",    name: "XP-Booster ×2 (7 Tage)", description: "Doppelte XP für eine ganze Woche",      category: "booster",       coinPrice: 1800, icon: "👑", rarity: "legendary", effect: "xp_boost", effectValue: '{"multiplier":2.0,"minutes":10080}',sortOrder: 15 },

  // ── Streak Freezes ───────────────────────────────────────
  { slug: "streak_freeze_1",  name: "Streak-Schutz (1 Tag)",   description: "Schützt deinen Streak für 1 Tag",       category: "streak_freeze", coinPrice: 80,   icon: "🛡️", rarity: "common",    effect: "streak_freeze", effectValue: "1",  sortOrder: 20 },
  { slug: "streak_freeze_3",  name: "Streak-Schutz (3 Tage)",  description: "Schützt deinen Streak für 3 Tage",      category: "streak_freeze", coinPrice: 200,  icon: "🧊", rarity: "uncommon",  effect: "streak_freeze", effectValue: "3",  sortOrder: 21 },
  { slug: "streak_freeze_7",  name: "Streak-Schutz (7 Tage)",  description: "Schützt deinen Streak für eine Woche",  category: "streak_freeze", coinPrice: 400,  icon: "❄️", rarity: "rare",      effect: "streak_freeze", effectValue: "7",  sortOrder: 22 },

  // ── AI Power-Ups ─────────────────────────────────────────
  { slug: "ai_quota_10",   name: "+10 KI-Anfragen",      description: "10 zusätzliche KI-Tutor Anfragen",        category: "powerup", coinPrice: 60,   icon: "🤖", rarity: "common",    effect: "ai_quota", effectValue: "10",  sortOrder: 30 },
  { slug: "ai_quota_50",   name: "+50 KI-Anfragen",      description: "50 zusätzliche KI-Tutor Anfragen",        category: "powerup", coinPrice: 250,  icon: "🧠", rarity: "uncommon",  effect: "ai_quota", effectValue: "50",  sortOrder: 31 },
  { slug: "ai_quota_200",  name: "+200 KI-Anfragen",     description: "200 zusätzliche KI-Tutor Anfragen",       category: "powerup", coinPrice: 800,  icon: "💡", rarity: "rare",      effect: "ai_quota", effectValue: "200", sortOrder: 32 },

  // ── Cosmetics: Profile Frames ─────────────────────────────
  { slug: "frame_gold",     name: "Gold-Rahmen",      description: "Goldener Profilrahmen",                     category: "cosmetic", coinPrice: 150,  icon: "🟡", rarity: "uncommon",  effect: "frame", effectValue: "gold",     sortOrder: 40 },
  { slug: "frame_fire",     name: "Feuer-Rahmen",     description: "Brennender Profilrahmen",                   category: "cosmetic", coinPrice: 250,  icon: "🔥", rarity: "rare",      effect: "frame", effectValue: "fire",     sortOrder: 41 },
  { slug: "frame_diamond",  name: "Diamant-Rahmen",   description: "Funkelnder Diamant-Rahmen",                 category: "cosmetic", coinPrice: 500,  icon: "💎", rarity: "epic",      effect: "frame", effectValue: "diamond",  sortOrder: 42 },
  { slug: "frame_rainbow",  name: "Regenbogen-Rahmen",description: "Animierter Regenbogen-Rahmen",              category: "cosmetic", coinPrice: 800,  icon: "🌈", rarity: "epic",      effect: "frame", effectValue: "rainbow",  sortOrder: 43 },
  { slug: "frame_mythic",   name: "Mythischer Rahmen",description: "Ultraseltener Mythisch-Rahmen",             category: "cosmetic", coinPrice: 2000, icon: "🌌", rarity: "legendary", effect: "frame", effectValue: "mythic",   sortOrder: 44 },

  // ── Cosmetics: Backgrounds ────────────────────────────────
  { slug: "bg_night",    name: "Sternenhimmel",      description: "Dunkler Sternenhimmel-Hintergrund",          category: "cosmetic", coinPrice: 100, icon: "🌌", rarity: "common",   effect: "background", effectValue: "night",    sortOrder: 50 },
  { slug: "bg_aurora",   name: "Polarlicht",         description: "Aurora Borealis Hintergrund",                category: "cosmetic", coinPrice: 200, icon: "🌠", rarity: "uncommon", effect: "background", effectValue: "aurora",   sortOrder: 51 },
  { slug: "bg_fire",     name: "Inferno",            description: "Flammenhölle-Hintergrund",                  category: "cosmetic", coinPrice: 300, icon: "🔥", rarity: "rare",     effect: "background", effectValue: "fire",     sortOrder: 52 },
  { slug: "bg_ocean",    name: "Tiefsee",            description: "Meerestiefe-Hintergrund",                   category: "cosmetic", coinPrice: 200, icon: "🌊", rarity: "uncommon", effect: "background", effectValue: "ocean",    sortOrder: 53 },
  { slug: "bg_galaxy",   name: "Galaxie",            description: "Galaktischer Weltraum-Hintergrund",          category: "cosmetic", coinPrice: 500, icon: "🔭", rarity: "epic",     effect: "background", effectValue: "galaxy",   sortOrder: 54 },

  // ── Cosmetics: Chat Bubbles ────────────────────────────────
  { slug: "bubble_neon",   name: "Neon-Bubble",     description: "Neon-grüne Chat-Blasen",                     category: "cosmetic", coinPrice: 80,  icon: "💬", rarity: "common",   effect: "bubble", effectValue: "neon",    sortOrder: 60 },
  { slug: "bubble_gold",   name: "Gold-Bubble",     description: "Goldene Chat-Blasen",                        category: "cosmetic", coinPrice: 150, icon: "💬", rarity: "uncommon", effect: "bubble", effectValue: "gold",    sortOrder: 61 },
  { slug: "bubble_fire",   name: "Feuer-Bubble",    description: "Flammende Chat-Blasen",                      category: "cosmetic", coinPrice: 250, icon: "💬", rarity: "rare",     effect: "bubble", effectValue: "fire",    sortOrder: 62 },

  // ── Titles ────────────────────────────────────────────────
  { slug: "title_scholar_plus",   name: "Titel: Übergelehrter",  description: "Zeige allen deine Intelligenz",     category: "title", coinPrice: 300,  icon: "🎓", rarity: "rare",      effect: "title", effectValue: "scholar_plus",   sortOrder: 70 },
  { slug: "title_coin_master",    name: "Titel: Münzmeister",    description: "Der reichste Schüler",              category: "title", coinPrice: 500,  icon: "💰", rarity: "epic",      effect: "title", effectValue: "coin_master",    sortOrder: 71 },
  { slug: "title_night_owl",      name: "Titel: Nachteule",      description: "Du lernst wenn alle schlafen",      category: "title", coinPrice: 400,  icon: "🦉", rarity: "rare",      effect: "title", effectValue: "night_owl",      sortOrder: 72 },
  { slug: "title_speedrunner",    name: "Titel: Speedrunner",    description: "Schneller als das Licht",           category: "title", coinPrice: 600,  icon: "⚡", rarity: "epic",      effect: "title", effectValue: "speedrunner",    sortOrder: 73 },
  { slug: "title_the_grind",      name: "Titel: The Grind",      description: "Kein Ruhetag",                      category: "title", coinPrice: 800,  icon: "💪", rarity: "epic",      effect: "title", effectValue: "the_grind",      sortOrder: 74 },
  { slug: "title_og",             name: "Titel: OG",             description: "Original Gangster",                 category: "title", coinPrice: 2000, icon: "👴", rarity: "legendary", effect: "title", effectValue: "og",             sortOrder: 75 },

  // ── Bundles ───────────────────────────────────────────────
  { slug: "bundle_starter",  name: "Starter-Paket",    description: "Booster ×1.5 (1h) + Streak-Schutz (1 Tag)",   category: "bundle", coinPrice: 110, icon: "🎁", rarity: "common",    effect: "bundle", effectValue: '["boost_1_5x_1h","streak_freeze_1"]',                  sortOrder: 80 },
  { slug: "bundle_grinder",  name: "Grinder-Paket",    description: "Booster ×2 (24h) + 3× Streak-Schutz",         category: "bundle", coinPrice: 500, icon: "📦", rarity: "rare",      effect: "bundle", effectValue: '["boost_2x_24h","streak_freeze_3"]',                    sortOrder: 81 },
  { slug: "bundle_whale",    name: "Whale-Paket",      description: "Booster ×2 (7 Tage) + 7× Streak-Schutz + AI", category: "bundle", coinPrice: 2200, icon: "🐋", rarity: "legendary", effect: "bundle", effectValue: '["boost_2x_7d","streak_freeze_7","ai_quota_50"]',        sortOrder: 82 },
  { slug: "bundle_exam",     name: "Prüfungs-Paket",   description: "Booster ×2 (24h) + +50 KI + Streak-Schutz",   category: "bundle", coinPrice: 700, icon: "📚", rarity: "epic",      effect: "bundle", effectValue: '["boost_2x_24h","ai_quota_50","streak_freeze_3"]',       sortOrder: 83 },

  // ── Limited / Seasonal ────────────────────────────────────
  { slug: "title_pioneer",     name: "Titel: Pionier",       description: "Einer der ersten MasterMind-Nutzer",  category: "title",    coinPrice: 0,    realPrice: 0, icon: "🚀", rarity: "legendary", isLimited: true, effect: "title", effectValue: "pioneer",     sortOrder: 90 },
  { slug: "frame_christmas",   name: "Weihnachts-Rahmen",    description: "Limitierter Weihnachts-Rahmen",       category: "cosmetic", coinPrice: 0,    realPrice: 0, icon: "🎄", rarity: "rare",      isLimited: true, effect: "frame", effectValue: "christmas",   sortOrder: 91 },
  { slug: "frame_halloween",   name: "Halloween-Rahmen",     description: "Limitierter Halloween-Rahmen",        category: "cosmetic", coinPrice: 0,    realPrice: 0, icon: "🎃", rarity: "rare",      isLimited: true, effect: "frame", effectValue: "halloween",   sortOrder: 92 },
  { slug: "boost_5x_15m",      name: "Mega-Booster ×5",      description: "5-fache XP für 15 Minuten (selten)", category: "booster",  coinPrice: 500,               icon: "🌪️", rarity: "legendary", isLimited: true, effect: "xp_boost", effectValue: '{"multiplier":5.0,"minutes":15}', sortOrder: 93 },

  // ── More Power-Ups ────────────────────────────────────────
  { slug: "quest_reset",     name: "Quest-Reset",      description: "Setze deine täglichen Quests zurück",      category: "powerup", coinPrice: 120, icon: "🔄", rarity: "uncommon", effect: "quest_reset",   sortOrder: 100 },
  { slug: "xp_grant_500",    name: "+500 XP Sofort",   description: "500 XP direkt gutgeschrieben",             category: "powerup", coinPrice: 400, icon: "⚡", rarity: "rare",     effect: "xp_grant",      effectValue: "500", sortOrder: 101 },
  { slug: "xp_grant_2000",   name: "+2000 XP Sofort",  description: "2000 XP direkt gutgeschrieben",            category: "powerup", coinPrice: 1400, icon: "💫", rarity: "epic",    effect: "xp_grant",      effectValue: "2000", sortOrder: 102 },
  { slug: "coin_doubler_1d", name: "Münz-Verdoppler",  description: "Doppelte Münzen für 24 Stunden",           category: "powerup", coinPrice: 200, icon: "🪙", rarity: "rare",     effect: "coin_doubler",  effectValue: "1440", sortOrder: 103 },
  { slug: "boss_damage_2x",  name: "Boss-Schadensverdoppler", description: "Doppelter Schaden im Boss-Battle",  category: "powerup", coinPrice: 150, icon: "⚔️", rarity: "uncommon", effect: "boss_damage",    effectValue: "2",   sortOrder: 104 },

  // ── Cosmetics: Badges / Emoji ─────────────────────────────
  { slug: "badge_star",      name: "Stern-Badge",       description: "Goldener Stern auf deinem Profil",        category: "cosmetic", coinPrice: 50,  icon: "⭐", rarity: "common",    effect: "badge", effectValue: "star",    sortOrder: 110 },
  { slug: "badge_fire",      name: "Feuer-Badge",       description: "Flammen-Badge auf deinem Profil",         category: "cosmetic", coinPrice: 100, icon: "🔥", rarity: "uncommon",  effect: "badge", effectValue: "fire",    sortOrder: 111 },
  { slug: "badge_lightning", name: "Blitz-Badge",       description: "Blitz-Badge auf deinem Profil",           category: "cosmetic", coinPrice: 150, icon: "⚡", rarity: "uncommon",  effect: "badge", effectValue: "lightning",sortOrder: 112 },
  { slug: "badge_crown",     name: "Kronen-Badge",      description: "Königliche Krone auf deinem Profil",      category: "cosmetic", coinPrice: 300, icon: "👑", rarity: "rare",      effect: "badge", effectValue: "crown",   sortOrder: 113 },
  { slug: "badge_diamond",   name: "Diamant-Badge",     description: "Glitzernder Diamant-Badge",               category: "cosmetic", coinPrice: 500, icon: "💎", rarity: "epic",      effect: "badge", effectValue: "diamond", sortOrder: 114 },
];

export async function buyItem(
  userId: string,
  itemSlug: string,
): Promise<{ ok: boolean; message?: string }> {
  const itemDef = SHOP_ITEMS.find((i) => i.slug === itemSlug);
  if (!itemDef) return { ok: false, message: "Item nicht gefunden" };
  if (itemDef.coinPrice === 0) return { ok: false, message: "Nur mit Echtgeld erhältlich" };

  const paid = await spendCoins(userId, itemDef.coinPrice, "shop_purchase", itemSlug);
  if (!paid) return { ok: false, message: "Nicht genug Münzen" };

  // Dispatch effect
  if (itemDef.category === "booster" && itemDef.effect === "xp_boost") {
    await activateBooster(userId, itemSlug);
  } else if (itemDef.category === "bundle" && itemDef.effectValue) {
    const slugs: string[] = JSON.parse(itemDef.effectValue);
    for (const slug of slugs) {
      const sub = SHOP_ITEMS.find((i) => i.slug === slug);
      if (sub?.category === "booster") {
        await activateBooster(userId, slug);
      } else if (sub?.effect === "streak_freeze") {
        const days = Number(sub.effectValue ?? 1);
        await prisma.user.update({ where: { id: userId }, data: { streakFreezes: { increment: days } } });
      } else if (sub?.effect === "ai_quota") {
        const quota = Number(sub.effectValue ?? 10);
        await applyAiQuota(userId, quota);
      } else {
        await addToInventory(userId, slug);
      }
    }
  } else if (itemDef.effect === "streak_freeze") {
    const days = Number(itemDef.effectValue ?? 1);
    await prisma.user.update({ where: { id: userId }, data: { streakFreezes: { increment: days } } });
  } else if (itemDef.effect === "ai_quota") {
    const quota = Number(itemDef.effectValue ?? 10);
    await applyAiQuota(userId, quota);
  } else if (itemDef.effect === "xp_grant") {
    const amount = Number(itemDef.effectValue ?? 0);
    if (amount > 0) {
      await prisma.$transaction([
        prisma.user.update({ where: { id: userId }, data: { xp: { increment: amount } } }),
        prisma.xpLog.create({ data: { userId, amount, reason: "shop_xp_grant", referenceId: itemSlug } }),
      ]);
    }
  } else {
    // Cosmetic, title, badge, powerup — just inventory
    await addToInventory(userId, itemSlug);
  }

  return { ok: true };
}

async function addToInventory(userId: string, itemSlug: string) {
  const existing = await prisma.userInventoryItem.findFirst({
    where: { userId, itemSlug },
  });
  if (existing) {
    await prisma.userInventoryItem.update({
      where: { id: existing.id },
      data: { quantity: { increment: 1 } },
    });
  } else {
    await prisma.userInventoryItem.create({ data: { userId, itemSlug, quantity: 1 } });
  }
}

async function applyAiQuota(userId: string, amount: number) {
  const existing = await prisma.aiQuotaEntry.findUnique({ where: { userId } });
  if (!existing || existing.resetAt < new Date()) return;
  await prisma.aiQuotaEntry.update({
    where: { userId },
    data: { used: Math.max(0, existing.used - amount) },
  });
}

// ── New ItemDef-based purchase ─────────────────────────────────────────────────

export async function buyItemDef(
  userId: string,
  itemDefId: string,
): Promise<{ ok: boolean; message?: string }> {
  const item = await prisma.itemDef.findUnique({ where: { id: itemDefId } });
  if (!item || !item.isActive) return { ok: false, message: "Item nicht gefunden" };

  // Determine price
  const price = item.priceCoins;
  if (!price || price <= 0) return { ok: false, message: "Nicht mit Münzen kaufbar" };

  const paid = await spendCoins(userId, price, "shop_purchase", item.key);
  if (!paid) return { ok: false, message: "Nicht genug Münzen" };

  const meta: Record<string, unknown> = item.meta ? JSON.parse(item.meta) : {};

  // Dispatch by componentKey
  if (item.componentKey === "boost_xp") {
    await activateBooster(userId, item.key);
  } else if (item.componentKey === "streak_freeze") {
    const days = Number(meta.days ?? 1);
    await prisma.user.update({ where: { id: userId }, data: { streakFreezes: { increment: days } } });
  } else if (item.componentKey === "ai_quota") {
    const amount = Number(meta.amount ?? 10);
    await applyAiQuota(userId, amount);
  } else {
    // Cosmetic, gear, title — track in UserItem (upsert qty)
    await prisma.userItem.upsert({
      where:  { userId_itemId: { userId, itemId: item.id } },
      create: { userId, itemId: item.id, qty: 1 },
      update: { qty: { increment: 1 } },
    });
  }

  return { ok: true };
}

// Icon mapping for componentKey (UI concern, kept here for server + client reuse)
export const COMPONENT_ICON: Record<string, string> = {
  frame_bronze:    "🥉", frame_silver:    "🥈", frame_gold:   "🥇",
  frame_diamond:   "💎", frame_legendary: "🌟", frame_boss:   "👑",
  bg_stars:        "🌌", bg_forest:       "🌿", bg_galaxy:    "🔭", bg_void: "🕳️",
  pet_fox:         "🦊", pet_owl:         "🦉", pet_dragon:   "🐉", pet_mastermind: "🧠",
  boost_xp:        "⚡",
  streak_freeze:   "🛡️",
  ai_quota:        "🤖",
  gear_shield:     "🛡️", gear_sword:      "⚔️", gear_boots:   "👟",
  gear_tome:       "📖", gear_crown:      "👑",
  title:           "🏷️",
};

