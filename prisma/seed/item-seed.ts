/* Copyright 2026 Elian Schock, Jonas Schwenk */
/**
 * item-seed.ts — seeds ItemDef + ShopListing records
 * Run: npx ts-node --project tsconfig.json prisma/seed/item-seed.ts
 * Idempotent: upsert on key.
 */

import { PrismaClient, Rarity, ItemKind } from "@prisma/client";

const prisma = new PrismaClient();

// ── Item definitions ──────────────────────────────────────────────────────────
const ITEMS = [
  // ── Cosmetic: Profile Frames ──────────────────────────────────────────────
  { key: "frame_bronze",    name: "Bronze-Rahmen",     description: "Bronzener Profilrahmen",            kind: ItemKind.COSMETIC, rarity: Rarity.COMMON,    priceCoins: 80,   pricePremium: null, componentKey: "frame_bronze",    meta: { slot: "frame" } },
  { key: "frame_silver",    name: "Silber-Rahmen",     description: "Silberner Profilrahmen",            kind: ItemKind.COSMETIC, rarity: Rarity.UNCOMMON,  priceCoins: 150,  pricePremium: null, componentKey: "frame_silver",    meta: { slot: "frame" } },
  { key: "frame_gold",      name: "Gold-Rahmen",       description: "Goldener Profilrahmen",             kind: ItemKind.COSMETIC, rarity: Rarity.RARE,      priceCoins: 300,  pricePremium: null, componentKey: "frame_gold",      meta: { slot: "frame" } },
  { key: "frame_diamond",   name: "Diamant-Rahmen",    description: "Funkelnder Diamantrahmen",          kind: ItemKind.COSMETIC, rarity: Rarity.EPIC,      priceCoins: 600,  pricePremium: null, componentKey: "frame_diamond",   meta: { slot: "frame" } },
  { key: "frame_legendary", name: "Legendärer Rahmen", description: "Flammendes Legendenrahmen",        kind: ItemKind.COSMETIC, rarity: Rarity.LEGENDARY, priceCoins: 1200, pricePremium: null, componentKey: "frame_legendary", meta: { slot: "frame" } },
  { key: "frame_boss",      name: "Boss-Rahmen",       description: "Nur für echte Boss-Slayer",         kind: ItemKind.COSMETIC, rarity: Rarity.MYTHIC,    priceCoins: null, pricePremium: 99,   componentKey: "frame_boss",      meta: { slot: "frame" } },

  // ── Cosmetic: Profile Backgrounds ────────────────────────────────────────
  { key: "bg_stars",        name: "Sternenhimmel",     description: "Profilhintergrund: Sterne",         kind: ItemKind.COSMETIC, rarity: Rarity.UNCOMMON,  priceCoins: 120,  pricePremium: null, componentKey: "bg_stars",        meta: { slot: "background" } },
  { key: "bg_forest",       name: "Mystischer Wald",   description: "Profilhintergrund: Wald",           kind: ItemKind.COSMETIC, rarity: Rarity.RARE,      priceCoins: 250,  pricePremium: null, componentKey: "bg_forest",       meta: { slot: "background" } },
  { key: "bg_galaxy",       name: "Galaxis",           description: "Profilhintergrund: Galaxie",        kind: ItemKind.COSMETIC, rarity: Rarity.EPIC,      priceCoins: 500,  pricePremium: null, componentKey: "bg_galaxy",       meta: { slot: "background" } },
  { key: "bg_void",         name: "Die Leere",         description: "Profilhintergrund: Void",           kind: ItemKind.COSMETIC, rarity: Rarity.MYTHIC,    priceCoins: null, pricePremium: 149,  componentKey: "bg_void",         meta: { slot: "background" } },

  // ── Cosmetic: Avatars / Pet icons ─────────────────────────────────────────
  { key: "pet_fox",         name: "Fuchs-Begleiter",   description: "Ein kleiner Fuchs begleitet dich",  kind: ItemKind.COSMETIC, rarity: Rarity.UNCOMMON,  priceCoins: 200,  pricePremium: null, componentKey: "pet_fox",         meta: { slot: "pet" } },
  { key: "pet_owl",         name: "Eulen-Begleiter",   description: "Weise Eule an deiner Seite",        kind: ItemKind.COSMETIC, rarity: Rarity.RARE,      priceCoins: 400,  pricePremium: null, componentKey: "pet_owl",         meta: { slot: "pet" } },
  { key: "pet_dragon",      name: "Drachen-Begleiter", description: "Miniatur-Drache begleitet dich",    kind: ItemKind.COSMETIC, rarity: Rarity.EPIC,      priceCoins: 900,  pricePremium: null, componentKey: "pet_dragon",      meta: { slot: "pet" } },
  { key: "pet_mastermind",  name: "MASTERMIND-Clone",  description: "Ein Mini-MASTERMIND folgt dir",     kind: ItemKind.COSMETIC, rarity: Rarity.SECRET,    priceCoins: null, pricePremium: null, componentKey: "pet_mastermind",  meta: { slot: "pet", requiresBoss: "mastermind" } },

  // ── Consumable: XP Boosters ───────────────────────────────────────────────
  { key: "boost_1_5x_1h",   name: "XP-Booster ×1.5 (1h)",    description: "+50% XP für 1 Stunde",              kind: ItemKind.CONSUMABLE, rarity: Rarity.COMMON,    priceCoins: 50,   pricePremium: null, componentKey: "boost_xp", meta: { multiplier: 1.5, minutes: 60 } },
  { key: "boost_2x_1h",     name: "XP-Booster ×2 (1h)",      description: "Doppelte XP für 1 Stunde",           kind: ItemKind.CONSUMABLE, rarity: Rarity.UNCOMMON,  priceCoins: 90,   pricePremium: null, componentKey: "boost_xp", meta: { multiplier: 2.0, minutes: 60 } },
  { key: "boost_3x_30m",    name: "XP-Booster ×3 (30min)",   description: "Dreifache XP für 30 Minuten",        kind: ItemKind.CONSUMABLE, rarity: Rarity.RARE,      priceCoins: 120,  pricePremium: null, componentKey: "boost_xp", meta: { multiplier: 3.0, minutes: 30 } },
  { key: "boost_2x_24h",    name: "XP-Booster ×2 (24h)",     description: "Doppelte XP für 24 Stunden",         kind: ItemKind.CONSUMABLE, rarity: Rarity.EPIC,      priceCoins: 350,  pricePremium: null, componentKey: "boost_xp", meta: { multiplier: 2.0, minutes: 1440 } },
  { key: "boost_2x_7d",     name: "XP-Booster ×2 (7 Tage)",  description: "Doppelte XP für eine ganze Woche",   kind: ItemKind.CONSUMABLE, rarity: Rarity.LEGENDARY, priceCoins: 1800, pricePremium: null, componentKey: "boost_xp", meta: { multiplier: 2.0, minutes: 10080 } },

  // ── Consumable: Streak Freezes ────────────────────────────────────────────
  { key: "streak_freeze_1", name: "Streak-Schutz (1 Tag)",    description: "Schützt deinen Streak für 1 Tag",    kind: ItemKind.CONSUMABLE, rarity: Rarity.COMMON,    priceCoins: 80,   pricePremium: null, componentKey: "streak_freeze", meta: { days: 1 } },
  { key: "streak_freeze_3", name: "Streak-Schutz (3 Tage)",   description: "Schützt deinen Streak für 3 Tage",   kind: ItemKind.CONSUMABLE, rarity: Rarity.UNCOMMON,  priceCoins: 200,  pricePremium: null, componentKey: "streak_freeze", meta: { days: 3 } },
  { key: "streak_freeze_7", name: "Streak-Schutz (7 Tage)",   description: "Schützt deinen Streak für eine Woche", kind: ItemKind.CONSUMABLE, rarity: Rarity.RARE,    priceCoins: 400,  pricePremium: null, componentKey: "streak_freeze", meta: { days: 7 } },

  // ── Consumable: AI Power-Ups ──────────────────────────────────────────────
  { key: "ai_quota_10",     name: "+10 KI-Anfragen",          description: "10 zusätzliche KI-Tutor Anfragen",   kind: ItemKind.CONSUMABLE, rarity: Rarity.COMMON,    priceCoins: 60,   pricePremium: null, componentKey: "ai_quota", meta: { amount: 10 } },
  { key: "ai_quota_50",     name: "+50 KI-Anfragen",          description: "50 zusätzliche KI-Tutor Anfragen",   kind: ItemKind.CONSUMABLE, rarity: Rarity.UNCOMMON,  priceCoins: 250,  pricePremium: null, componentKey: "ai_quota", meta: { amount: 50 } },
  { key: "ai_quota_200",    name: "+200 KI-Anfragen",         description: "200 zusätzliche KI-Tutor Anfragen",  kind: ItemKind.CONSUMABLE, rarity: Rarity.RARE,      priceCoins: 800,  pricePremium: null, componentKey: "ai_quota", meta: { amount: 200 } },

  // ── Consumable: Tipps für Übungen ─────────────────────────────────────────
  { key: "hint_1",          name: "1 Tipp",                   description: "1 Tipp zum Aufdecken in Übungen",    kind: ItemKind.CONSUMABLE, rarity: Rarity.COMMON,    priceCoins: 50,   pricePremium: null, componentKey: "hint_token", meta: { amount: 1 } },
  { key: "hint_5",          name: "5 Tipps",                  description: "5 Tipps für Übungen — etwas günstiger", kind: ItemKind.CONSUMABLE, rarity: Rarity.UNCOMMON, priceCoins: 220,  pricePremium: null, componentKey: "hint_token", meta: { amount: 5 } },
  { key: "hint_15",         name: "15 Tipps",                 description: "15 Tipps für Übungen — bester Preis", kind: ItemKind.CONSUMABLE, rarity: Rarity.RARE,      priceCoins: 600,  pricePremium: null, componentKey: "hint_token", meta: { amount: 15 } },

  // ── Gear: Boss-Fight Equipment ────────────────────────────────────────────
  { key: "gear_shield",     name: "Schild der Weisheit",      description: "+10% HP bei Boss-Fights",            kind: ItemKind.GEAR,      rarity: Rarity.RARE,      priceCoins: 500,  pricePremium: null, componentKey: "gear_shield",    meta: { slot: "defense", hpBonus: 0.10 } },
  { key: "gear_sword",      name: "Schwert des Wissens",      description: "+15% Schaden bei Boss-Fights",       kind: ItemKind.GEAR,      rarity: Rarity.EPIC,      priceCoins: 900,  pricePremium: null, componentKey: "gear_sword",     meta: { slot: "weapon", dmgBonus: 0.15 } },
  { key: "gear_boots",      name: "Schnellläufer-Stiefel",    description: "+3 Sek. bei Boss-Fragen",            kind: ItemKind.GEAR,      rarity: Rarity.RARE,      priceCoins: 450,  pricePremium: null, componentKey: "gear_boots",     meta: { slot: "boots", timeBonus: 3 } },
  { key: "gear_tome",       name: "Buch des Vergessens",      description: "Zeige einen falschen Hinweis aus",   kind: ItemKind.GEAR,      rarity: Rarity.EPIC,      priceCoins: 800,  pricePremium: null, componentKey: "gear_tome",      meta: { slot: "offhand", eliminateWrong: 1 } },
  { key: "gear_crown",      name: "Krone des Meisters",       description: "+25% Coins aus Boss-MVP",            kind: ItemKind.GEAR,      rarity: Rarity.LEGENDARY, priceCoins: 2000, pricePremium: null, componentKey: "gear_crown",     meta: { slot: "head", mvpCoinBonus: 0.25 } },

  // ── Title: Earned by achievements ────────────────────────────────────────
  { key: "title_boss_slayer",    name: "Boss-Slayer",          description: "Titel: Boss-Slayer",                kind: ItemKind.TITLE, rarity: Rarity.UNCOMMON,  priceCoins: 200,  pricePremium: null, componentKey: "title", meta: { text: "Boss-Slayer" } },
  { key: "title_mvp",            name: "MVP",                  description: "Titel: MVP",                        kind: ItemKind.TITLE, rarity: Rarity.RARE,      priceCoins: 400,  pricePremium: null, componentKey: "title", meta: { text: "MVP" } },
  { key: "title_legendenbrecher",name: "Legendenbrecher",      description: "Titel: Legendenbrecher",            kind: ItemKind.TITLE, rarity: Rarity.EPIC,      priceCoins: null, pricePremium: null, componentKey: "title", meta: { text: "Legendenbrecher", requiresAchievement: "boss_legendary_mvp" } },
  { key: "title_wissensmeister", name: "Wissensmeister",       description: "Titel: Wissensmeister",             kind: ItemKind.TITLE, rarity: Rarity.LEGENDARY, priceCoins: null, pricePremium: null, componentKey: "title", meta: { text: "Wissensmeister", requiresAchievement: "tree_complete" } },
  { key: "title_mastermind",     name: "MASTERMIND",           description: "Titel: MASTERMIND — nur für Endboss-Bezwinger", kind: ItemKind.TITLE, rarity: Rarity.SECRET, priceCoins: null, pricePremium: null, componentKey: "title", meta: { text: "MASTERMIND", requiresAchievement: "boss_mastermind" } },
] as const;

// ── Seed ─────────────────────────────────────────────────────────────────────
export async function seedItems(): Promise<void> {
  console.log("🛍️  Seeding ItemDefs…");

  for (const item of ITEMS) {
    const { meta, ...rest } = item;
    const created = await prisma.itemDef.upsert({
      where:  { key: rest.key },
      create: { ...rest, meta: JSON.stringify(meta) },
      update: {
        name:        rest.name,
        description: rest.description,
        priceCoins:  rest.priceCoins ?? null,
        pricePremium: rest.pricePremium ?? null,
        meta:        JSON.stringify(meta),
        isActive:    true,
      },
    });

    // Create a default ShopListing if none exists
    const existing = await prisma.shopListing.findFirst({ where: { itemId: created.id } });
    if (!existing) {
      await prisma.shopListing.create({
        data: { itemId: created.id, featured: false },
      });
    }
  }

  console.log(`   ✓ ${ITEMS.length} items upserted`);
}

// ── Direct run ────────────────────────────────────────────────────────────────
if (require.main === module) {
  seedItems()
    .then(() => { console.log("✅  Item seed complete"); process.exit(0); })
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
}
