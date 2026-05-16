# SP-1: Währungssystem + Shop + Avatar — Implementierungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Vollständiges In-App-Shop-System mit Silber/Gold-Coins, 15+ Item-Kategorien, Avatar-Upload, Cosmetics-System und Premium-Abo-Flag.

**Architecture:** Neue Prisma-Modelle (CoinBalance, ShopItem, UserInventory, EquippedCosmetics) + zentrale `src/lib/coins.ts` und `src/lib/shop.ts` Bibliotheken. Shop-Seiten unter `/app/shop/*`, Inventar unter `/app/inventar`. Coin-Awards werden in bestehende XP-Events eingehängt.

**Tech Stack:** Prisma (SQLite/Postgres), Next.js 16 Server Actions, Tailwind CSS, Canvas API (Avatar-Crop im Browser), Lucide Icons.

---

## Datei-Übersicht

### Neue Dateien
- `src/lib/coins.ts` — awardCoins(), deductCoins(), getCoinBalance()
- `src/lib/shop.ts` — getShopItems(), purchaseItem(), getInventory(), getEquipped(), equipItem()
- `src/lib/booster.ts` — getActiveBooster(), applyBoosterToXp()
- `prisma/shop-seed.ts` — alle Shop-Items als Seed
- `src/app/app/shop/page.tsx` — Shop-Hauptseite
- `src/app/app/shop/[category]/page.tsx` — Kategorie-Ansicht
- `src/app/app/shop/loot-box/LootBoxClient.tsx` — Loot-Box-Animation Client
- `src/app/app/shop/loot-box/page.tsx` — Loot-Box-Seite
- `src/app/app/shop/wheel/WheelClient.tsx` — Glücksrad Client
- `src/app/app/shop/wheel/page.tsx` — Glücksrad-Seite
- `src/app/app/coins/page.tsx` — Coin-Balance + Pakete
- `src/app/app/inventar/page.tsx` — Inventar verwalten + ausrüsten
- `src/app/app/inventar/actions.ts` — equipItem Server Action
- `src/app/api/shop/purchase/route.ts` — Kauf-API
- `src/app/api/shop/wheel-spin/route.ts` — Glücksrad-API
- `src/app/api/upload/avatar/route.ts` — Avatar-Upload
- `src/app/admin/shop/page.tsx` — Admin-Shop-Verwaltung
- `src/app/admin/shop/actions.ts` — Admin Server Actions

### Modifizierte Dateien
- `prisma/schema.prisma` — 5 neue Modelle + User-Erweiterung
- `src/lib/xp.ts` — Booster-Multiplikator + Streak-Freeze integrieren
- `src/app/app/tagesbelohnung/actions.ts` — Coins bei Daily Login
- `src/app/app/quests/actions.ts` — Coins bei Quest-Abschluss
- `src/app/app/boss/actions.ts` — Coins bei Boss-Sieg
- `src/app/app/duelle/actions.ts` — Coins bei Duell-Sieg
- `src/app/app/layout.tsx` — Shop + Inventar + Coins in Sidebar + Coin-Balance im Header laden
- `src/components/app/AppHeader.tsx` — Coin-Balance anzeigen
- `src/components/app/Sidebar.tsx` — ShoppingBag Icon hinzufügen

---

## Task 1: Prisma-Schema erweitern

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Schritt 1: Neue Modelle ans Ende von schema.prisma anhängen**

Füge nach dem letzten Model in `prisma/schema.prisma` folgende Blöcke ein:

```prisma
// ── Shop & Coins ──────────────────────────────────────────

model CoinBalance {
  id        String   @id @default(cuid())
  userId    String   @unique
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  silver    Int      @default(0)
  gold      Int      @default(0)
  updatedAt DateTime @updatedAt
}

model CoinTransaction {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  amount    Int
  currency  String
  reason    String
  refId     String?
  createdAt DateTime @default(now())

  @@index([userId])
}

model ShopItem {
  id            String    @id @default(cuid())
  slug          String    @unique
  name          String
  description   String
  category      String
  rarity        String    @default("common")
  priceSilver   Int?
  priceGold     Int?
  isPremiumOnly Boolean   @default(false)
  isLimited     Boolean   @default(false)
  seasonId      String?
  expiresAt     DateTime?
  previewData   String?
  isActive      Boolean   @default(true)
  sortOrder     Int       @default(0)
  createdAt     DateTime  @default(now())

  inventory UserInventory[]
}

model UserInventory {
  id          String    @id @default(cuid())
  userId      String
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  itemId      String
  item        ShopItem  @relation(fields: [itemId], references: [id])
  purchasedAt DateTime  @default(now())
  expiresAt   DateTime?

  @@unique([userId, itemId])
  @@index([userId])
}

model EquippedCosmetics {
  id             String  @id @default(cuid())
  userId         String  @unique
  user           User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  frameSlug      String?
  backgroundSlug String?
  nameColorSlug  String?
  companionSlug  String?
  emoteSlug      String?
  musicSlug      String?
  quizEffectSlug String?
  cardThemeSlug  String?
  updatedAt      DateTime @updatedAt
}

model UserSubscription {
  id               String    @id @default(cuid())
  userId           String    @unique
  user             User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  stripeCustomerId String?
  stripeSubId      String?
  status           String    @default("inactive")
  currentPeriodEnd DateTime?
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt
}

model StripePurchase {
  id              String   @id @default(cuid())
  userId          String?
  schoolId        String?
  stripePaymentId String   @unique
  amount          Int
  currency        String   @default("eur")
  type            String
  metadata        String?
  createdAt       DateTime @default(now())

  @@index([userId])
  @@index([schoolId])
}
```

- [ ] **Schritt 2: User-Modell erweitern**

Im `model User` Block, direkt vor `@@index([role])`, einfügen:

```prisma
  avatarUrl           String?
  parentEmail         String?
  streakFreezeCount   Int       @default(0)
  activeBossBoost     Int       @default(1)
  activeBoosterUntil  DateTime?
  activeBoosterMult   Float     @default(1.0)
  lastWheelSpin       DateTime?
  extraWheelSpins     Int       @default(0)
  isPremium           Boolean   @default(false)
  premiumSince        DateTime?

  coinBalance       CoinBalance?
  coinTransactions  CoinTransaction[]
  inventory         UserInventory[]
  equippedCosmetics EquippedCosmetics?
  subscription      UserSubscription?
```

- [ ] **Schritt 3: Migration erstellen und ausführen**

```bash
cd /home/jonass/Development/mastermind
npx prisma migrate dev --name add_shop_coins_cosmetics
```

Erwartete Ausgabe: `Your database is now in sync with your schema.`

- [ ] **Schritt 4: Prisma Client regenerieren**

```bash
npx prisma generate
```

- [ ] **Schritt 5: Commit**

```bash
git add prisma/
git commit -m "feat: add shop, coins, cosmetics models to schema"
```

---

## Task 2: Coins-Bibliothek erstellen

**Files:**
- Create: `src/lib/coins.ts`

- [ ] **Schritt 1: coins.ts erstellen**

```typescript
import { prisma } from "@/lib/db/client";

export type CoinCurrency = "silver" | "gold";

export async function getCoinBalance(userId: string): Promise<{ silver: number; gold: number }> {
  const balance = await prisma.coinBalance.findUnique({ where: { userId } });
  return { silver: balance?.silver ?? 0, gold: balance?.gold ?? 0 };
}

export async function awardCoins(
  userId: string,
  amount: number,
  currency: CoinCurrency,
  reason: string,
  refId?: string,
): Promise<void> {
  await prisma.$transaction([
    prisma.coinBalance.upsert({
      where: { userId },
      create: {
        userId,
        silver: currency === "silver" ? amount : 0,
        gold: currency === "gold" ? amount : 0,
      },
      update: {
        silver: currency === "silver" ? { increment: amount } : undefined,
        gold: currency === "gold" ? { increment: amount } : undefined,
      },
    }),
    prisma.coinTransaction.create({
      data: { userId, amount, currency, reason, refId },
    }),
  ]);
}

export async function deductCoins(
  userId: string,
  amount: number,
  currency: CoinCurrency,
  reason: string,
  refId?: string,
): Promise<boolean> {
  const balance = await getCoinBalance(userId);
  const current = currency === "silver" ? balance.silver : balance.gold;
  if (current < amount) return false;

  await prisma.$transaction([
    prisma.coinBalance.update({
      where: { userId },
      data: {
        silver: currency === "silver" ? { decrement: amount } : undefined,
        gold: currency === "gold" ? { decrement: amount } : undefined,
      },
    }),
    prisma.coinTransaction.create({
      data: { userId, amount: -amount, currency, reason, refId },
    }),
  ]);
  return true;
}
```

- [ ] **Schritt 2: Commit**

```bash
git add src/lib/coins.ts
git commit -m "feat: add coins library (awardCoins, deductCoins, getCoinBalance)"
```

---

## Task 3: Booster-Bibliothek erstellen

**Files:**
- Create: `src/lib/booster.ts`

- [ ] **Schritt 1: booster.ts erstellen**

```typescript
import { prisma } from "@/lib/db/client";

export async function getActiveBoosterMult(userId: string): Promise<number> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { activeBoosterUntil: true, activeBoosterMult: true },
  });
  if (!user) return 1.0;
  if (!user.activeBoosterUntil || user.activeBoosterUntil < new Date()) return 1.0;
  return user.activeBoosterMult;
}

export async function activateBooster(
  userId: string,
  multiplier: number,
  durationHours: number,
): Promise<void> {
  const until = new Date(Date.now() + durationHours * 3_600_000);
  await prisma.user.update({
    where: { id: userId },
    data: { activeBoosterUntil: until, activeBoosterMult: multiplier },
  });
}

export function applyBooster(xp: number, mult: number): number {
  return Math.round(xp * mult);
}
```

- [ ] **Schritt 2: Commit**

```bash
git add src/lib/booster.ts
git commit -m "feat: add booster library"
```

---

## Task 4: XP-Bibliothek um Booster + Streak-Freeze erweitern

**Files:**
- Modify: `src/lib/xp.ts`

- [ ] **Schritt 1: xp.ts vollständig ersetzen**

```typescript
import { prisma } from "@/lib/db/client";
import { checkAndAwardAchievements } from "@/lib/achievements";
import { getActiveBoosterMult, applyBooster } from "@/lib/booster";
import { awardCoins } from "@/lib/coins";

export const XP_REWARDS = {
  aufgabe_abgabe: 20,
  aufgabe_bewertet: 10,
  karteikarte_session: 5,
  note_geteilt: 15,
  quiz_completed: 10,
} as const;

export type XpReason = keyof typeof XP_REWARDS;

export function levelFromXp(xp: number): number {
  return Math.floor(xp / 100) + 1;
}

export function xpToNextLevel(xp: number): number {
  const currentLevel = levelFromXp(xp);
  return currentLevel * 100 - xp;
}

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function awardXp(
  userId: string,
  reason: XpReason,
  referenceId?: string,
): Promise<void> {
  const baseAmount = XP_REWARDS[reason];
  const today = todayUTC();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      streak: true,
      lastActiveDate: true,
      streakFreezeCount: true,
      xp: true,
    },
  });

  let newStreak = user?.streak ?? 0;
  const lastDate = user?.lastActiveDate?.toISOString().slice(0, 10);
  let newFreezeCount = user?.streakFreezeCount ?? 0;

  if (lastDate !== today) {
    const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
    if (lastDate === yesterday) {
      newStreak = newStreak + 1;
    } else {
      // Streak break — check for freeze
      if (newFreezeCount > 0) {
        newFreezeCount -= 1;
        // Streak preserved, no change to newStreak
      } else {
        newStreak = 1;
      }
    }
  }

  const mult = await getActiveBoosterMult(userId);
  const amount = applyBooster(baseAmount, mult);

  const prevLevel = user ? levelFromXp(user.xp) : 1;
  const newXp = (user?.xp ?? 0) + amount;
  const newLevel = levelFromXp(newXp);
  const leveledUp = newLevel > prevLevel;

  await prisma.$transaction([
    prisma.xpLog.create({ data: { userId, amount, reason, referenceId } }),
    prisma.user.update({
      where: { id: userId },
      data: {
        xp: { increment: amount },
        streak: newStreak,
        streakFreezeCount: newFreezeCount,
        lastActiveDate: new Date(),
      },
    }),
  ]);

  // Coins on level-up
  if (leveledUp) {
    const coinReward = newLevel * 50;
    await awardCoins(userId, coinReward, "silver", "level_up", String(newLevel));
  }

  checkAndAwardAchievements(userId).catch(() => {});
}
```

- [ ] **Schritt 2: Commit**

```bash
git add src/lib/xp.ts
git commit -m "feat: integrate booster multiplier and streak-freeze into awardXp"
```

---

## Task 5: Coins in bestehende Events integrieren

**Files:**
- Modify: `src/app/app/tagesbelohnung/actions.ts`
- Modify: `src/app/app/quests/actions.ts`
- Modify: `src/app/app/boss/actions.ts`
- Modify: `src/app/app/duelle/actions.ts`

- [ ] **Schritt 1: tagesbelohnung/actions.ts — Coins beim Daily Login**

Ersetze `claimDailyLoginReward` vollständig:

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { LOGIN_REWARD_SCHEDULE } from "@/lib/game";
import { incrementQuestProgress } from "@/lib/quests";
import { awardCoins } from "@/lib/coins";

export async function claimDailyLoginReward(): Promise<void> {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "student") return;

  const today = new Date().toISOString().slice(0, 10);

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { lastLoginDate: true, totalDailyLogins: true, isPremium: true },
  });

  if (!user || user.lastLoginDate === today) return;

  const newTotalLogins = (user.totalDailyLogins ?? 0) + 1;
  const dayInCycle = ((newTotalLogins - 1) % LOGIN_REWARD_SCHEDULE.length) + 1;
  const reward = LOGIN_REWARD_SCHEDULE.find((r) => r.day === dayInCycle) ?? LOGIN_REWARD_SCHEDULE[0];
  const xpAmount = user.isPremium ? reward.xp * 2 : reward.xp;

  await prisma.$transaction([
    prisma.user.update({
      where: { id: session.userId },
      data: {
        lastLoginDate: today,
        totalDailyLogins: newTotalLogins,
        xp: { increment: xpAmount },
      },
    }),
    prisma.xpLog.create({
      data: { userId: session.userId, amount: xpAmount, reason: "daily_login_reward" },
    }),
    prisma.dailyLoginReward.create({
      data: { userId: session.userId, day: dayInCycle, xpAwarded: xpAmount },
    }),
  ]);

  // Silber-Coins: 10 SC base, +50 für Premium
  const coinAmount = user.isPremium ? 60 : 10;
  await awardCoins(session.userId, coinAmount, "silver", "daily_login");

  // Wochenbonus Tag 7: Extra-Coins
  if (dayInCycle === 7) {
    await awardCoins(session.userId, 200, "silver", "weekly_login_bonus");
  }

  await incrementQuestProgress(session.userId, "login");
  revalidatePath("/app/tagesbelohnung");
}
```

- [ ] **Schritt 2: quests/actions.ts — Coins bei Quest-Abschluss**

Ersetze `claimQuestReward`:

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { awardCoins } from "@/lib/coins";

export async function claimQuestReward(questId: string): Promise<void> {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "student") return;

  const userQuest = await prisma.userQuest.findFirst({
    where: { userId: session.userId, questId, completedAt: { not: null }, claimedAt: null },
    include: { quest: true },
  });

  if (!userQuest) return;

  const xpReward = userQuest.quest.xpReward;

  // Coin reward: 10% of XP reward as Silber-Coins (minimum 20)
  const coinReward = Math.max(20, Math.round(xpReward * 0.1));

  await prisma.$transaction([
    prisma.userQuest.update({
      where: { id: userQuest.id },
      data: { claimedAt: new Date() },
    }),
    prisma.xpLog.create({
      data: { userId: session.userId, amount: xpReward, reason: "quest_reward", referenceId: questId },
    }),
    prisma.user.update({
      where: { id: session.userId },
      data: { xp: { increment: xpReward } },
    }),
  ]);

  await awardCoins(session.userId, coinReward, "silver", "quest_reward", questId);

  if (userQuest.quest.titleReward) {
    await prisma.userTitle.upsert({
      where: { userId_titleSlug: { userId: session.userId, titleSlug: userQuest.quest.titleReward } },
      create: { userId: session.userId, titleSlug: userQuest.quest.titleReward },
      update: {},
    });
  }

  revalidatePath("/app/quests");
}
```

- [ ] **Schritt 3: boss/actions.ts — Coins bei Boss-Sieg**

Ersetze `attackBoss`:

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { awardCoins } from "@/lib/coins";

export async function attackBoss(battleId: string): Promise<void> {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "student") return;

  const battle = await prisma.bossBattle.findFirst({
    where: { id: battleId, isActive: true, currentHp: { gt: 0 } },
  });

  if (!battle) return;

  const BASE_DAMAGE: Record<string, number> = {
    normal: 50, hard: 100, epic: 200, legendary: 350,
  };
  const userBoost = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { activeBossBoost: true },
  });
  const dmg = (BASE_DAMAGE[battle.difficulty] ?? 75) * (userBoost?.activeBossBoost ?? 1);

  const newHp = Math.max(0, battle.currentHp - dmg);
  const defeated = newHp === 0;

  await prisma.$transaction(async (tx) => {
    await tx.bossBattle.update({
      where: { id: battleId },
      data: { currentHp: newHp, isActive: defeated ? false : true },
    });

    await tx.bossParticipant.upsert({
      where: { userId_battleId: { userId: session.userId, battleId } },
      create: { userId: session.userId, battleId, damage: dmg, correctAnswers: 1 },
      update: { damage: { increment: dmg }, correctAnswers: { increment: 1 } },
    });

    // Reset boss boost to 1 after use
    if ((userBoost?.activeBossBoost ?? 1) > 1) {
      await tx.user.update({ where: { id: session.userId }, data: { activeBossBoost: 1 } });
    }

    if (defeated) {
      const participants = await tx.bossParticipant.findMany({
        where: { battleId },
        orderBy: { damage: "desc" },
      });

      const totalDamage = participants.reduce((s, p) => s + p.damage, 0);
      for (const p of participants) {
        const shareRatio = totalDamage > 0 ? p.damage / totalDamage : 1 / participants.length;
        const xpShare = Math.round(battle.xpReward * shareRatio);
        await tx.user.update({ where: { id: p.userId }, data: { xp: { increment: xpShare } } });
        await tx.xpLog.create({ data: { userId: p.userId, amount: xpShare, reason: "boss_battle_reward", referenceId: battleId } });
      }

      // Award title to participants
      for (const p of participants) {
        await tx.userTitle.upsert({
          where: { userId_titleSlug: { userId: p.userId, titleSlug: "boss_slayer" } },
          create: { userId: p.userId, titleSlug: "boss_slayer" },
          update: {},
        });
      }
    }
  });

  // Award coins to attacker (outside tx to use awardCoins helper)
  await awardCoins(session.userId, defeated ? 200 : 5, "silver", "boss_attack", battleId);

  revalidatePath("/app/boss");
}
```

- [ ] **Schritt 4: duelle/actions.ts — Coins bei Duell-Sieg**

Im `submitDuelScore` nach dem XP-Award Block (nach `await prisma.xpLog.create({ data: { userId: loserId ...`) einfügen:

```typescript
    // Coin awards
    if (winnerId) {
      await awardCoins(winnerId, 30, "silver", "duel_win", duelId);
    }
    await awardCoins(loserId, 10, "silver", "duel_participate", duelId);
```

Und am Anfang der Datei den Import ergänzen:
```typescript
import { awardCoins } from "@/lib/coins";
```

- [ ] **Schritt 5: Commit**

```bash
git add src/app/app/tagesbelohnung/actions.ts src/app/app/quests/actions.ts src/app/app/boss/actions.ts src/app/app/duelle/actions.ts
git commit -m "feat: award silver coins in all XP events (login, quests, boss, duels)"
```

---

## Task 6: Shop-Seed mit allen Items

**Files:**
- Create: `prisma/shop-seed.ts`

- [ ] **Schritt 1: shop-seed.ts erstellen**

```typescript
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SHOP_ITEMS = [
  // ── Avatar Frames ─────────────────────────────────────
  { slug: "frame_none",       name: "Standard",          description: "Kein Rahmen",                  category: "frame", rarity: "common",    priceSilver: null, priceGold: null,  sortOrder: 0,  previewData: JSON.stringify({ css: "none" }) },
  { slug: "frame_blue_flame", name: "Blaue Flammen",     description: "Lodernde blaue Flammen",       category: "frame", rarity: "uncommon",  priceSilver: 200,  priceGold: null,  sortOrder: 10, previewData: JSON.stringify({ css: "0 0 0 3px #3b82f6, 0 0 12px #3b82f6" }) },
  { slug: "frame_ice",        name: "Eisrand",           description: "Kristallklarer Eisrand",       category: "frame", rarity: "uncommon",  priceSilver: 300,  priceGold: null,  sortOrder: 11, previewData: JSON.stringify({ css: "0 0 0 3px #06b6d4, 0 0 12px #a5f3fc" }) },
  { slug: "frame_gold_crown", name: "Goldkrone",         description: "Majestätischer Goldrahmen",    category: "frame", rarity: "rare",      priceSilver: 800,  priceGold: 200,   sortOrder: 20, previewData: JSON.stringify({ css: "0 0 0 3px #fbbf24, 0 0 16px #fbbf24" }) },
  { slug: "frame_rainbow",    name: "Regenbogen-Puls",   description: "Animierter Regenbogenrahmen",  category: "frame", rarity: "epic",      priceSilver: null, priceGold: 500,   sortOrder: 30, previewData: JSON.stringify({ css: "rainbow", animated: true }) },
  { slug: "frame_lightning",  name: "Blitz",             description: "Elektrischer Blitzrahmen",     category: "frame", rarity: "rare",      priceSilver: 400,  priceGold: null,  sortOrder: 21, previewData: JSON.stringify({ css: "0 0 0 3px #a855f7, 0 0 12px #a855f7" }) },
  { slug: "frame_premium",    name: "Premium-Rahmen",    description: "Exklusiv für Premium-Mitglieder", category: "frame", rarity: "epic", priceSilver: null, priceGold: null, isPremiumOnly: true, sortOrder: 5, previewData: JSON.stringify({ css: "0 0 0 3px #fbbf24, 0 0 20px #f59e0b", animated: true }) },

  // ── Profilhintergründe ────────────────────────────────
  { slug: "bg_none",          name: "Standard",          description: "Kein Hintergrund",             category: "background", rarity: "common",   priceSilver: null, priceGold: null, sortOrder: 0,  previewData: JSON.stringify({ type: "color", value: "transparent" }) },
  { slug: "bg_stars",         name: "Sternenhimmel",     description: "Funkelnder Sternenhimmel",     category: "background", rarity: "uncommon", priceSilver: 150,  priceGold: null, sortOrder: 10, previewData: JSON.stringify({ type: "gradient", value: "radial-gradient(ellipse at top, #1e1b4b, #0f172a)" }) },
  { slug: "bg_galaxy",        name: "Galaxie-Gradient",  description: "Lila-blaue Galaxie",           category: "background", rarity: "uncommon", priceSilver: 250,  priceGold: null, sortOrder: 11, previewData: JSON.stringify({ type: "gradient", value: "linear-gradient(135deg, #1e1b4b, #312e81, #4c1d95)" }) },
  { slug: "bg_purple_dusk",   name: "Lila Dämmerung",    description: "Sanfter Lila-Gradient",        category: "background", rarity: "common",   priceSilver: 200,  priceGold: null, sortOrder: 12, previewData: JSON.stringify({ type: "gradient", value: "linear-gradient(180deg, #2e1065, #4c1d95)" }) },
  { slug: "bg_matrix",        name: "Matrix-Regen",      description: "Animierter Matrix-Code-Regen", category: "background", rarity: "epic",     priceSilver: null, priceGold: 400,  sortOrder: 30, previewData: JSON.stringify({ type: "animated", value: "matrix" }) },
  { slug: "bg_gold_particles",name: "Goldene Partikel",  description: "Animierte Goldpartikel",       category: "background", rarity: "legendary",priceSilver: null, priceGold: 600,  sortOrder: 40, previewData: JSON.stringify({ type: "animated", value: "gold_particles" }) },

  // ── Namensfarben ──────────────────────────────────────
  { slug: "nc_default",       name: "Standard",          description: "Standard Textfarbe",           category: "namecolor", rarity: "common",   priceSilver: null, priceGold: null,  sortOrder: 0,  previewData: JSON.stringify({ color: "inherit" }) },
  { slug: "nc_red",           name: "Feuerrot",          description: "Leuchtend rot",                category: "namecolor", rarity: "uncommon", priceSilver: null, priceGold: 100,   sortOrder: 10, previewData: JSON.stringify({ color: "#ef4444" }) },
  { slug: "nc_purple",        name: "Mystisch Lila",     description: "Tiefes Lila",                  category: "namecolor", rarity: "uncommon", priceSilver: null, priceGold: 100,   sortOrder: 11, previewData: JSON.stringify({ color: "#a855f7" }) },
  { slug: "nc_cyan",          name: "Cyber-Cyan",        description: "Knalliges Cyan",               category: "namecolor", rarity: "uncommon", priceSilver: null, priceGold: 100,   sortOrder: 12, previewData: JSON.stringify({ color: "#06b6d4" }) },
  { slug: "nc_gold",          name: "Gold",              description: "Edles Gold",                   category: "namecolor", rarity: "rare",     priceSilver: null, priceGold: 250,   sortOrder: 20, previewData: JSON.stringify({ color: "#fbbf24" }) },
  { slug: "nc_rainbow",       name: "Regenbogen",        description: "Animierter Regenbogen",        category: "namecolor", rarity: "legendary",priceSilver: null, priceGold: 500,   sortOrder: 40, previewData: JSON.stringify({ color: "rainbow", animated: true }) },

  // ── XP-Booster ────────────────────────────────────────
  { slug: "boost_15_24h",     name: "×1,5 XP (24h)",    description: "1,5-fache XP für 24 Stunden",  category: "booster", rarity: "uncommon", priceSilver: null, priceGold: 300,   sortOrder: 10, previewData: JSON.stringify({ mult: 1.5, hours: 24 }) },
  { slug: "boost_20_24h",     name: "×2,0 XP (24h)",    description: "Doppelte XP für 24 Stunden",   category: "booster", rarity: "rare",     priceSilver: null, priceGold: 500,   sortOrder: 11, previewData: JSON.stringify({ mult: 2.0, hours: 24 }) },
  { slug: "boost_15_3d",      name: "×1,5 XP (3 Tage)", description: "1,5-fache XP für 3 Tage",      category: "booster", rarity: "rare",     priceSilver: null, priceGold: 700,   sortOrder: 20, previewData: JSON.stringify({ mult: 1.5, hours: 72 }) },
  { slug: "boost_20_3d",      name: "×2,0 XP (3 Tage)", description: "Doppelte XP für 3 Tage",       category: "booster", rarity: "epic",     priceSilver: null, priceGold: 1000,  sortOrder: 21, previewData: JSON.stringify({ mult: 2.0, hours: 72 }) },
  { slug: "boost_25_weekend", name: "Weekend-Booster",   description: "×2,5 XP Fr–So",               category: "booster", rarity: "epic",     priceSilver: null, priceGold: 1200,  sortOrder: 30, previewData: JSON.stringify({ mult: 2.5, hours: 60 }) },

  // ── Streak-Freeze ─────────────────────────────────────
  { slug: "freeze_1d",        name: "Streak-Schutz 1 Tag",  description: "Rettet deinen Streak für 1 Tag", category: "streak_freeze", rarity: "uncommon", priceSilver: 200, priceGold: 80,  sortOrder: 10, previewData: JSON.stringify({ days: 1 }) },
  { slug: "freeze_3d",        name: "Streak-Schutz 3 Tage", description: "Streak-Schutz für 3 Tage",      category: "streak_freeze", rarity: "rare",     priceSilver: 500, priceGold: 180, sortOrder: 20, previewData: JSON.stringify({ days: 3 }) },
  { slug: "freeze_7d",        name: "Streak-Schutz Woche",  description: "Streak-Schutz für 7 Tage",      category: "streak_freeze", rarity: "epic",     priceSilver: 1000,priceGold: 350, sortOrder: 30, previewData: JSON.stringify({ days: 7 }) },

  // ── Boss-Boosts ───────────────────────────────────────
  { slug: "boss_boost_2x",    name: "Boss-Angriff ×2",   description: "Doppelter Schaden beim nächsten Angriff", category: "boss_boost", rarity: "uncommon", priceSilver: 150, priceGold: null, sortOrder: 10, previewData: JSON.stringify({ mult: 2 }) },
  { slug: "boss_boost_3x",    name: "Boss-Angriff ×3",   description: "Dreifacher Schaden beim nächsten Angriff",category: "boss_boost", rarity: "rare",     priceSilver: 300, priceGold: 80,  sortOrder: 20, previewData: JSON.stringify({ mult: 3 }) },

  // ── Karteikarten-Themes ───────────────────────────────
  { slug: "card_default",     name: "Standard",          description: "Standard Karten-Design",       category: "card_theme", rarity: "common",   priceSilver: null, priceGold: null, sortOrder: 0,  previewData: JSON.stringify({ theme: "default" }) },
  { slug: "card_wood",        name: "Holz-Optik",        description: "Warmes Holz-Design",           category: "card_theme", rarity: "uncommon", priceSilver: 200,  priceGold: null, sortOrder: 10, previewData: JSON.stringify({ theme: "wood", bg: "#92400e", text: "#fef3c7" }) },
  { slug: "card_neon_dark",   name: "Neon-Dunkel",       description: "Dunkles Neon-Design",          category: "card_theme", rarity: "uncommon", priceSilver: 300,  priceGold: null, sortOrder: 11, previewData: JSON.stringify({ theme: "neon_dark", bg: "#0f172a", text: "#a855f7", border: "#a855f7" }) },
  { slug: "card_pastel",      name: "Pastell-Hell",      description: "Sanftes Pastell-Design",       category: "card_theme", rarity: "common",   priceSilver: 150,  priceGold: null, sortOrder: 12, previewData: JSON.stringify({ theme: "pastel", bg: "#fdf4ff", text: "#4a044e", border: "#e879f9" }) },

  // ── Quiz-Effekte ──────────────────────────────────────
  { slug: "qfx_default",      name: "Standard Grün",     description: "Standard Richtig-Animation",   category: "quiz_effect", rarity: "common",   priceSilver: null, priceGold: null, sortOrder: 0,  previewData: JSON.stringify({ effect: "green_flash" }) },
  { slug: "qfx_confetti",     name: "Konfetti-Regen",    description: "Bunter Konfetti-Regen",        category: "quiz_effect", rarity: "rare",     priceSilver: null, priceGold: 200,  sortOrder: 10, previewData: JSON.stringify({ effect: "confetti" }) },
  { slug: "qfx_lightning",    name: "Blitz-Einschlag",   description: "Elektrischer Blitz",           category: "quiz_effect", rarity: "uncommon", priceSilver: null, priceGold: 150,  sortOrder: 11, previewData: JSON.stringify({ effect: "lightning" }) },
  { slug: "qfx_fire",         name: "Feuer-Explosion",   description: "Feurige Explosion",            category: "quiz_effect", rarity: "rare",     priceSilver: null, priceGold: 300,  sortOrder: 20, previewData: JSON.stringify({ effect: "fire" }) },
  { slug: "qfx_stars",        name: "Sternenregen",      description: "Goldener Sternenregen",        category: "quiz_effect", rarity: "rare",     priceSilver: null, priceGold: 250,  sortOrder: 21, previewData: JSON.stringify({ effect: "stars" }) },

  // ── Loot Boxes ────────────────────────────────────────
  { slug: "lootbox_bronze",   name: "Bronze Mystery Box",  description: "Common bis Uncommon Item",  category: "loot_box", rarity: "common",    priceSilver: 300,  priceGold: null, sortOrder: 10, previewData: JSON.stringify({ tier: "bronze", odds: { common: 0.7, uncommon: 0.3 } }) },
  { slug: "lootbox_silver",   name: "Silber Mystery Box",  description: "Uncommon bis Rare Item",    category: "loot_box", rarity: "uncommon",  priceSilver: null, priceGold: 150,  sortOrder: 20, previewData: JSON.stringify({ tier: "silver", odds: { uncommon: 0.6, rare: 0.35, epic: 0.05 } }) },
  { slug: "lootbox_gold",     name: "Gold Mystery Box",    description: "Rare bis Epic Item",        category: "loot_box", rarity: "rare",      priceSilver: null, priceGold: 400,  sortOrder: 30, previewData: JSON.stringify({ tier: "gold", odds: { rare: 0.55, epic: 0.35, legendary: 0.1 } }) },
  { slug: "lootbox_legendary",name: "Legendäre Box",       description: "Legendary/Mythic garantiert",category: "loot_box", rarity: "legendary",priceSilver: null, priceGold: 1000, sortOrder: 40, previewData: JSON.stringify({ tier: "legendary", odds: { legendary: 0.8, mythic: 0.2 } }) },

  // ── Companions ────────────────────────────────────────
  { slug: "comp_dragon",      name: "Kleiner Drache",    description: "Feuriger Mini-Drache",         category: "companion", rarity: "rare",     priceSilver: null, priceGold: 500,  sortOrder: 10, previewData: JSON.stringify({ emoji: "🐉", size: 24 }) },
  { slug: "comp_dog",         name: "Pixel-Hund",        description: "Treuer Pixel-Hund",            category: "companion", rarity: "uncommon", priceSilver: null, priceGold: 300,  sortOrder: 11, previewData: JSON.stringify({ emoji: "🐕", size: 24 }) },
  { slug: "comp_star",        name: "Leuchtender Stern", description: "Animierter Stern",             category: "companion", rarity: "rare",     priceSilver: null, priceGold: 400,  sortOrder: 12, previewData: JSON.stringify({ emoji: "⭐", size: 24, animated: true }) },
  { slug: "comp_miniboss",    name: "Mini-Boss",         description: "Nur nach Boss-Sieg erhältlich",category: "companion", rarity: "epic",     priceSilver: null, priceGold: null, isLimited: true, sortOrder: 5, previewData: JSON.stringify({ emoji: "👹", size: 24 }) },
  { slug: "comp_season_pet",  name: "Saison-Pet",        description: "Exklusives Saison-Begleiter",  category: "companion", rarity: "legendary",priceSilver: null, priceGold: 800,  sortOrder: 40, previewData: JSON.stringify({ emoji: "🦋", size: 24, animated: true }) },

  // ── Emotes ────────────────────────────────────────────
  { slug: "emote_thumbs_up",  name: "Daumen hoch",       description: "Klassischer Daumen hoch",      category: "emote", rarity: "common",   priceSilver: null, priceGold: null, sortOrder: 0,  previewData: JSON.stringify({ emoji: "👍" }) },
  { slug: "emote_fire",       name: "Feuer",             description: "Das war heiß!",                category: "emote", rarity: "common",   priceSilver: 100,  priceGold: null, sortOrder: 10, previewData: JSON.stringify({ emoji: "🔥" }) },
  { slug: "emote_crown",      name: "Krone",             description: "Du bist der König!",           category: "emote", rarity: "uncommon", priceSilver: 200,  priceGold: null, sortOrder: 11, previewData: JSON.stringify({ emoji: "👑" }) },
  { slug: "emote_gg",         name: "GG",                description: "Good Game!",                   category: "emote", rarity: "common",   priceSilver: 150,  priceGold: null, sortOrder: 12, previewData: JSON.stringify({ text: "GG" }) },
  { slug: "emote_trollface",  name: "Trollface",         description: "Der Klassiker",                category: "emote", rarity: "rare",     priceSilver: null, priceGold: 200,  sortOrder: 20, previewData: JSON.stringify({ emoji: "😈" }) },

  // ── Musik-Playlists ───────────────────────────────────
  { slug: "music_lofi",       name: "Lo-Fi Hip-Hop",     description: "Entspannte Lo-Fi Beats",       category: "music", rarity: "uncommon", priceSilver: 500,  priceGold: null, sortOrder: 10, previewData: JSON.stringify({ playlist: "lofi", icon: "🎵" }) },
  { slug: "music_focus",      name: "Konzentrations-Sounds", description: "Deep Focus Sounds",        category: "music", rarity: "uncommon", priceSilver: 500,  priceGold: null, sortOrder: 11, previewData: JSON.stringify({ playlist: "focus", icon: "🧘" }) },
  { slug: "music_classical",  name: "Classical Focus",   description: "Klassische Musik zum Lernen",  category: "music", rarity: "uncommon", priceSilver: 500,  priceGold: null, sortOrder: 12, previewData: JSON.stringify({ playlist: "classical", icon: "🎻" }) },
  { slug: "music_nature",     name: "Nature Ambience",   description: "Regen, Wald, Meeresrauschen",  category: "music", rarity: "common",   priceSilver: 300,  priceGold: null, sortOrder: 13, previewData: JSON.stringify({ playlist: "nature", icon: "🌿" }) },
];

async function seedShopItems() {
  console.log("Seeding shop items...");
  for (const item of SHOP_ITEMS) {
    await prisma.shopItem.upsert({
      where: { slug: item.slug },
      create: item,
      update: item,
    });
  }
  console.log(`Seeded ${SHOP_ITEMS.length} shop items.`);
}

seedShopItems()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

- [ ] **Schritt 2: Seed ausführen**

```bash
npx tsx prisma/shop-seed.ts
```

Erwartete Ausgabe: `Seeded 52 shop items.`

- [ ] **Schritt 3: Commit**

```bash
git add prisma/shop-seed.ts
git commit -m "feat: add shop seed with 52 items across 12 categories"
```

---

## Task 7: Shop-Bibliothek erstellen

**Files:**
- Create: `src/lib/shop.ts`

- [ ] **Schritt 1: shop.ts erstellen**

```typescript
import { prisma } from "@/lib/db/client";
import { deductCoins } from "@/lib/coins";
import { activateBooster } from "@/lib/booster";

export type ShopItemCategory =
  | "frame" | "background" | "namecolor" | "booster"
  | "streak_freeze" | "boss_boost" | "card_theme"
  | "quiz_effect" | "loot_box" | "companion" | "emote"
  | "music";

export async function getShopItems(category?: ShopItemCategory) {
  return prisma.shopItem.findMany({
    where: { isActive: true, ...(category ? { category } : {}) },
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
  });
}

export async function getInventory(userId: string) {
  return prisma.userInventory.findMany({
    where: { userId },
    include: { item: true },
    orderBy: { purchasedAt: "desc" },
  });
}

export async function hasItem(userId: string, itemSlug: string): Promise<boolean> {
  const item = await prisma.shopItem.findUnique({ where: { slug: itemSlug } });
  if (!item) return false;
  const inv = await prisma.userInventory.findUnique({
    where: { userId_itemId: { userId, itemId: item.id } },
  });
  return !!inv;
}

export async function getEquipped(userId: string) {
  return prisma.equippedCosmetics.findUnique({ where: { userId } });
}

export type PurchaseResult = { ok: true } | { ok: false; error: string };

export async function purchaseItem(
  userId: string,
  itemSlug: string,
  currency: "silver" | "gold",
): Promise<PurchaseResult> {
  const item = await prisma.shopItem.findUnique({ where: { slug: itemSlug } });
  if (!item) return { ok: false, error: "Item nicht gefunden" };
  if (!item.isActive) return { ok: false, error: "Item nicht verfügbar" };

  // Premium check
  if (item.isPremiumOnly) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { isPremium: true } });
    if (!user?.isPremium) return { ok: false, error: "Nur für Premium-Mitglieder" };
  }

  // Duplicate check (only for non-consumables)
  const isConsumable = ["booster", "streak_freeze", "boss_boost", "loot_box"].includes(item.category);
  if (!isConsumable) {
    const already = await hasItem(userId, itemSlug);
    if (already) return { ok: false, error: "Item bereits vorhanden" };
  }

  const price = currency === "silver" ? item.priceSilver : item.priceGold;
  if (!price) return { ok: false, error: `Item nicht für ${currency === "silver" ? "Silber" : "Gold"}-Coins erhältlich` };

  const deducted = await deductCoins(userId, price, currency, "shop_purchase", itemSlug);
  if (!deducted) return { ok: false, error: "Nicht genug Coins" };

  // Apply consumable effects immediately
  if (item.category === "booster" && item.previewData) {
    const data = JSON.parse(item.previewData) as { mult: number; hours: number };
    await activateBooster(userId, data.mult, data.hours);
    return { ok: true };
  }

  if (item.category === "streak_freeze" && item.previewData) {
    const data = JSON.parse(item.previewData) as { days: number };
    await prisma.user.update({
      where: { id: userId },
      data: { streakFreezeCount: { increment: data.days } },
    });
    return { ok: true };
  }

  if (item.category === "boss_boost" && item.previewData) {
    const data = JSON.parse(item.previewData) as { mult: number };
    await prisma.user.update({
      where: { id: userId },
      data: { activeBossBoost: data.mult },
    });
    return { ok: true };
  }

  // Non-consumable: add to inventory
  await prisma.userInventory.create({
    data: { userId, itemId: item.id },
  });

  return { ok: true };
}

export async function equipItem(
  userId: string,
  slot: keyof Omit<Awaited<ReturnType<typeof getEquipped>>, "id" | "userId" | "updatedAt">,
  itemSlug: string | null,
): Promise<void> {
  // Verify ownership (null = unequip)
  if (itemSlug !== null) {
    const owned = await hasItem(userId, itemSlug);
    if (!owned) throw new Error("Item nicht im Inventar");
  }

  await prisma.equippedCosmetics.upsert({
    where: { userId },
    create: { userId, [slot]: itemSlug },
    update: { [slot]: itemSlug },
  });
}
```

- [ ] **Schritt 2: Commit**

```bash
git add src/lib/shop.ts
git commit -m "feat: add shop library (getShopItems, purchaseItem, equipItem)"
```

---

## Task 8: Shop-API Route

**Files:**
- Create: `src/app/api/shop/purchase/route.ts`

- [ ] **Schritt 1: purchase route erstellen**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { purchaseItem } from "@/lib/shop";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const body = await req.json() as { itemSlug: string; currency: "silver" | "gold" };
  if (!body.itemSlug || !body.currency) {
    return NextResponse.json({ error: "itemSlug und currency erforderlich" }, { status: 400 });
  }

  const result = await purchaseItem(session.userId, body.itemSlug, body.currency);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

  return NextResponse.json({ ok: true });
}
```

- [ ] **Schritt 2: Commit**

```bash
git add src/app/api/shop/purchase/route.ts
git commit -m "feat: add shop purchase API route"
```

---

## Task 9: Avatar-Upload Route

**Files:**
- Create: `src/app/api/upload/avatar/route.ts`

- [ ] **Schritt 1: Avatar-Upload erstellen**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db/client";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "Keine Datei" }, { status: 400 });

  if (file.size > 2 * 1024 * 1024) {
    return NextResponse.json({ error: "Datei zu groß (max. 2 MB)" }, { status: 400 });
  }

  const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowed.includes(file.type)) {
    return NextResponse.json({ error: "Nur JPG, PNG, WEBP, GIF erlaubt" }, { status: 400 });
  }

  const ext = file.type.split("/")[1];
  const filename = `avatar_${session.userId}.${ext}`;
  const uploadDir = path.join(process.cwd(), "public", "avatars");
  await mkdir(uploadDir, { recursive: true });

  const bytes = await file.arrayBuffer();
  await writeFile(path.join(uploadDir, filename), Buffer.from(bytes));

  const avatarUrl = `/avatars/${filename}`;
  await prisma.user.update({ where: { id: session.userId }, data: { avatarUrl } });

  return NextResponse.json({ ok: true, avatarUrl });
}
```

- [ ] **Schritt 2: Commit**

```bash
git add src/app/api/upload/avatar/route.ts
git commit -m "feat: add avatar upload API route"
```

---

## Task 10: Shop-Hauptseite

**Files:**
- Create: `src/app/app/shop/page.tsx`

- [ ] **Schritt 1: shop/page.tsx erstellen**

```typescript
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ShoppingBag, Zap, Coins } from "lucide-react";
import { getSession, effectiveRole } from "@/lib/session";
import { getShopItems } from "@/lib/shop";
import { getCoinBalance } from "@/lib/coins";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Shop" };

const CATEGORY_META: Record<string, { label: string; icon: string; href: string }> = {
  frame:        { label: "Avatar-Frames",       icon: "🖼️",  href: "/app/shop/frame" },
  background:   { label: "Profilhintergründe",  icon: "🌌",  href: "/app/shop/background" },
  namecolor:    { label: "Namensfarben",         icon: "🎨",  href: "/app/shop/namecolor" },
  booster:      { label: "XP-Booster",           icon: "⚡",  href: "/app/shop/booster" },
  streak_freeze:{ label: "Streak-Schutz",        icon: "🛡️",  href: "/app/shop/streak_freeze" },
  boss_boost:   { label: "Boss-Boosts",          icon: "⚔️",  href: "/app/shop/boss_boost" },
  card_theme:   { label: "Karten-Themes",        icon: "🃏",  href: "/app/shop/card_theme" },
  quiz_effect:  { label: "Quiz-Effekte",         icon: "✨",  href: "/app/shop/quiz_effect" },
  loot_box:     { label: "Mystery Boxes",        icon: "📦",  href: "/app/shop/loot-box" },
  companion:    { label: "Companions",           icon: "🐉",  href: "/app/shop/companion" },
  emote:        { label: "Emotes",               icon: "😎",  href: "/app/shop/emote" },
  music:        { label: "Musik-Playlists",      icon: "🎵",  href: "/app/shop/music" },
};

const RARITY_COLORS: Record<string, string> = {
  common:    "text-muted-fg",
  uncommon:  "text-success",
  rare:      "text-info",
  epic:      "text-brand",
  legendary: "text-warning",
  mythic:    "text-danger",
};

export default async function ShopPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "student") redirect("/");

  const [items, balance] = await Promise.all([
    getShopItems(),
    getCoinBalance(session.userId),
  ]);

  const byCategory = items.reduce<Record<string, typeof items>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Shop</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
            <ShoppingBag className="mb-1 mr-2 inline size-8" />
            Shop
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/app/coins" className={buttonVariants({ variant: "outline", size: "sm" })}>
            <span className="text-warning">🥈</span>
            <span className="font-mono font-bold">{balance.silver.toLocaleString("de-DE")}</span>
            <span className="text-muted-fg text-xs">SC</span>
          </Link>
          <Link href="/app/coins" className={buttonVariants({ variant: "outline", size: "sm" })}>
            <span className="text-warning">🥇</span>
            <span className="font-mono font-bold">{balance.gold.toLocaleString("de-DE")}</span>
            <span className="text-muted-fg text-xs">GC</span>
          </Link>
          <Link href="/app/inventar" className={buttonVariants({ size: "sm" })}>
            Inventar
          </Link>
        </div>
      </header>

      <div className="grid gap-8">
        {Object.entries(CATEGORY_META).map(([cat, meta]) => {
          const catItems = byCategory[cat] ?? [];
          if (catItems.length === 0) return null;
          const featured = catItems.slice(0, 4);

          return (
            <section key={cat}>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-lg font-bold">
                  <span>{meta.icon}</span>
                  {meta.label}
                </h2>
                <Link href={meta.href} className="text-xs text-brand hover:underline">
                  Alle {catItems.length} →
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-px border border-border bg-border sm:grid-cols-3 lg:grid-cols-4">
                {featured.map((item) => {
                  const preview = item.previewData ? JSON.parse(item.previewData) as Record<string, unknown> : {};
                  return (
                    <div key={item.id} className="flex flex-col gap-3 bg-bg p-4">
                      <div className="flex items-center gap-2">
                        <div className="grid size-10 place-items-center bg-surface text-2xl">
                          {preview.emoji as string ?? meta.icon}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{item.name}</p>
                          <p className={cn("text-[10px] font-semibold uppercase tracking-wider", RARITY_COLORS[item.rarity])}>
                            {item.rarity}
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-muted-fg line-clamp-2">{item.description}</p>
                      <div className="mt-auto flex flex-wrap items-center gap-1.5">
                        {item.priceSilver && (
                          <Badge variant="secondary">🥈 {item.priceSilver.toLocaleString("de-DE")} SC</Badge>
                        )}
                        {item.priceGold && (
                          <Badge variant="warning">🥇 {item.priceGold.toLocaleString("de-DE")} GC</Badge>
                        )}
                        {!item.priceSilver && !item.priceGold && (
                          <Badge variant="success">Gratis</Badge>
                        )}
                        {item.isPremiumOnly && (
                          <Badge variant="brand">Premium</Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Schritt 2: Commit**

```bash
git add src/app/app/shop/page.tsx
git commit -m "feat: add shop main page with category overview"
```

---

## Task 11: Kategorie-Seite mit Kaufen-Funktion

**Files:**
- Create: `src/app/app/shop/[category]/page.tsx`

- [ ] **Schritt 1: [category]/page.tsx erstellen**

```typescript
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getSession, effectiveRole } from "@/lib/session";
import { getShopItems, getInventory, type ShopItemCategory } from "@/lib/shop";
import { getCoinBalance } from "@/lib/coins";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BuyButton } from "./BuyButton";

export const metadata: Metadata = { title: "Shop" };

const VALID_CATEGORIES: ShopItemCategory[] = [
  "frame","background","namecolor","booster","streak_freeze",
  "boss_boost","card_theme","quiz_effect","companion","emote","music",
];

const RARITY_COLORS: Record<string, string> = {
  common: "text-muted-fg", uncommon: "text-success", rare: "text-info",
  epic: "text-brand", legendary: "text-warning", mythic: "text-danger",
};

export default async function ShopCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  if (!VALID_CATEGORIES.includes(category as ShopItemCategory)) notFound();

  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "student") redirect("/");

  const [items, inventory, balance] = await Promise.all([
    getShopItems(category as ShopItemCategory),
    getInventory(session.userId),
    getCoinBalance(session.userId),
  ]);

  const ownedIds = new Set(inventory.map((i) => i.item.slug));

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <header className="flex items-center gap-4">
        <Link href="/app/shop" className={buttonVariants({ variant: "ghost", size: "sm" })}>
          <ArrowLeft className="size-4" /> Zurück
        </Link>
        <div className="flex flex-1 items-center justify-between">
          <h1 className="text-2xl font-bold capitalize">{category.replace("_", " ")}</h1>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-fg">🥈 <strong>{balance.silver.toLocaleString("de-DE")}</strong></span>
            <span className="text-muted-fg">🥇 <strong>{balance.gold.toLocaleString("de-DE")}</strong></span>
          </div>
        </div>
      </header>

      <div className="grid gap-px border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const owned = ownedIds.has(item.slug);
          const preview = item.previewData ? JSON.parse(item.previewData) as Record<string, unknown> : {};
          return (
            <div key={item.id} className={cn("flex flex-col gap-4 bg-bg p-5", owned && "opacity-75")}>
              <div className="flex items-start gap-3">
                <div className="grid size-12 place-items-center bg-surface text-2xl">
                  {preview.emoji as string ?? "🎁"}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{item.name}</p>
                    {owned && <Badge variant="success">Besitzt</Badge>}
                    {item.isPremiumOnly && <Badge variant="brand">Premium</Badge>}
                  </div>
                  <p className={cn("text-[10px] font-semibold uppercase tracking-wider", RARITY_COLORS[item.rarity])}>
                    {item.rarity}
                  </p>
                </div>
              </div>
              <p className="text-sm text-muted-fg">{item.description}</p>
              <div className="mt-auto flex flex-wrap gap-2">
                {item.priceSilver && !owned && (
                  <BuyButton itemSlug={item.slug} currency="silver" price={item.priceSilver} canAfford={balance.silver >= item.priceSilver} />
                )}
                {item.priceGold && !owned && (
                  <BuyButton itemSlug={item.slug} currency="gold" price={item.priceGold} canAfford={balance.gold >= item.priceGold} />
                )}
                {!item.priceSilver && !item.priceGold && !owned && (
                  <BuyButton itemSlug={item.slug} currency="silver" price={0} canAfford={true} />
                )}
                {owned && <p className="text-xs text-muted-fg">Im Inventar — ausrüsten unter <Link href="/app/inventar" className="text-brand underline">Inventar</Link></p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Schritt 2: BuyButton Client Component erstellen**

```typescript
// src/app/app/shop/[category]/BuyButton.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export function BuyButton({
  itemSlug,
  currency,
  price,
  canAfford,
}: {
  itemSlug: string;
  currency: "silver" | "gold";
  price: number;
  canAfford: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const router = useRouter();

  async function handleBuy() {
    if (!canAfford || loading) return;
    setLoading(true);
    const res = await fetch("/api/shop/purchase", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemSlug, currency }),
    });
    setLoading(false);
    if (res.ok) {
      setDone(true);
      router.refresh();
    } else {
      const data = await res.json() as { error: string };
      alert(data.error);
    }
  }

  if (done) return <p className="text-xs font-semibold text-success">✓ Gekauft!</p>;

  return (
    <Button
      size="sm"
      variant={currency === "gold" ? "primary" : "secondary"}
      disabled={!canAfford || loading}
      onClick={handleBuy}
    >
      {loading ? "…" : price === 0 ? "Gratis holen" : `${currency === "silver" ? "🥈" : "🥇"} ${price.toLocaleString("de-DE")}`}
    </Button>
  );
}
```

- [ ] **Schritt 3: Commit**

```bash
git add src/app/app/shop/
git commit -m "feat: add shop category page with buy functionality"
```

---

## Task 12: Inventar-Seite mit Ausrüsten-Funktion

**Files:**
- Create: `src/app/app/inventar/page.tsx`
- Create: `src/app/app/inventar/actions.ts`

- [ ] **Schritt 1: inventar/actions.ts erstellen**

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { getSession, effectiveRole } from "@/lib/session";
import { equipItem } from "@/lib/shop";

export async function equipCosmetic(
  slot: string,
  itemSlug: string | null,
): Promise<void> {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "student") return;

  const validSlots = ["frameSlug","backgroundSlug","nameColorSlug","companionSlug","emoteSlug","musicSlug","quizEffectSlug","cardThemeSlug"] as const;
  if (!validSlots.includes(slot as typeof validSlots[number])) return;

  await equipItem(session.userId, slot as typeof validSlots[number], itemSlug);
  revalidatePath("/app/inventar");
  revalidatePath("/app/profil");
}
```

- [ ] **Schritt 2: inventar/page.tsx erstellen**

```typescript
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Package } from "lucide-react";
import { getSession, effectiveRole } from "@/lib/session";
import { getInventory, getEquipped } from "@/lib/shop";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { EquipButton } from "./EquipButton";

export const metadata: Metadata = { title: "Inventar" };

const SLOT_META: Record<string, { label: string; field: string }> = {
  frame:       { label: "Avatar-Frame",      field: "frameSlug" },
  background:  { label: "Hintergrund",       field: "backgroundSlug" },
  namecolor:   { label: "Namensfarbe",       field: "nameColorSlug" },
  companion:   { label: "Companion",         field: "companionSlug" },
  emote:       { label: "Emote",             field: "emoteSlug" },
  music:       { label: "Musik",             field: "musicSlug" },
  quiz_effect: { label: "Quiz-Effekt",       field: "quizEffectSlug" },
  card_theme:  { label: "Karten-Theme",      field: "cardThemeSlug" },
};

export default async function InventarPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "student") redirect("/");

  const [inventory, equipped] = await Promise.all([
    getInventory(session.userId),
    getEquipped(session.userId),
  ]);

  const byCategory = inventory.reduce<Record<string, typeof inventory>>((acc, inv) => {
    const cat = inv.item.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(inv);
    return acc;
  }, {});

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Mein</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
            <Package className="mb-1 mr-2 inline size-8" />
            Inventar
          </h1>
        </div>
        <Link href="/app/shop" className={buttonVariants({ variant: "outline", size: "sm" })}>
          Zum Shop →
        </Link>
      </header>

      {inventory.length === 0 ? (
        <div className="border border-dashed border-border p-12 text-center">
          <p className="text-muted-fg">Noch keine Items. Besuche den <Link href="/app/shop" className="text-brand underline">Shop</Link>!</p>
        </div>
      ) : (
        Object.entries(SLOT_META).map(([cat, meta]) => {
          const catItems = byCategory[cat] ?? [];
          if (catItems.length === 0) return null;
          const equippedSlug = equipped ? (equipped as Record<string, string | null>)[meta.field] : null;

          return (
            <Card key={cat}>
              <CardHeader>
                <CardTitle>{meta.label}</CardTitle>
                {equippedSlug && <Badge variant="success">Ausgerüstet: {equippedSlug}</Badge>}
              </CardHeader>
              <CardBody className="!p-0">
                <div className="grid gap-px border-t border-border bg-border sm:grid-cols-2 md:grid-cols-3">
                  {catItems.map((inv) => {
                    const preview = inv.item.previewData ? JSON.parse(inv.item.previewData) as Record<string, unknown> : {};
                    const isEquipped = equippedSlug === inv.item.slug;
                    return (
                      <div key={inv.id} className={cn("flex items-center gap-3 bg-bg p-4", isEquipped && "bg-brand/[0.05]")}>
                        <div className="grid size-10 place-items-center bg-surface text-xl">
                          {preview.emoji as string ?? "🎁"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{inv.item.name}</p>
                          <p className="text-xs text-muted-fg">
                            {inv.purchasedAt.toLocaleDateString("de-DE", { day: "numeric", month: "short" })}
                          </p>
                        </div>
                        <EquipButton
                          slot={meta.field}
                          itemSlug={inv.item.slug}
                          isEquipped={isEquipped}
                        />
                      </div>
                    );
                  })}
                </div>
              </CardBody>
            </Card>
          );
        })
      )}
    </div>
  );
}
```

- [ ] **Schritt 3: EquipButton Client Component erstellen**

```typescript
// src/app/app/inventar/EquipButton.tsx
"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { equipCosmetic } from "./actions";

export function EquipButton({
  slot,
  itemSlug,
  isEquipped,
}: {
  slot: string;
  itemSlug: string;
  isEquipped: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      size="sm"
      variant={isEquipped ? "ghost" : "outline"}
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          await equipCosmetic(slot, isEquipped ? null : itemSlug);
        });
      }}
    >
      {pending ? "…" : isEquipped ? "Ablegen" : "Ausrüsten"}
    </Button>
  );
}
```

- [ ] **Schritt 4: Commit**

```bash
git add src/app/app/inventar/
git commit -m "feat: add inventory page with equip/unequip functionality"
```

---

## Task 13: Coin-Balance Seite (Gold-Coins kaufen)

**Files:**
- Create: `src/app/app/coins/page.tsx`

- [ ] **Schritt 1: coins/page.tsx erstellen**

```typescript
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getSession, effectiveRole } from "@/lib/session";
import { getCoinBalance } from "@/lib/coins";
import { Card, CardBody } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Coins" };

const COIN_PACKAGES = [
  { id: "coins_500",   gold: 500,   price: "1,99",  bonus: null,   popular: false },
  { id: "coins_1500",  gold: 1500,  price: "4,99",  bonus: "+10%", popular: true  },
  { id: "coins_4000",  gold: 4000,  price: "9,99",  bonus: "+33%", popular: false },
  { id: "coins_10000", gold: 10000, price: "19,99", bonus: "+100%",popular: false },
];

export default async function CoinsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "student") redirect("/");

  const balance = await getCoinBalance(session.userId);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Guthaben</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Coins</h1>
      </header>

      {/* Balance */}
      <section className="grid grid-cols-2 gap-px border border-border bg-border">
        <div className="bg-bg p-6 text-center">
          <p className="text-4xl">🥈</p>
          <p className="mt-2 font-mono text-3xl font-bold">{balance.silver.toLocaleString("de-DE")}</p>
          <p className="mt-1 text-xs uppercase tracking-wider text-muted-fg">Silber-Coins</p>
          <p className="mt-2 text-xs text-muted-fg">Durch Spielen verdienen</p>
        </div>
        <div className="bg-bg p-6 text-center">
          <p className="text-4xl">🥇</p>
          <p className="mt-2 font-mono text-3xl font-bold text-warning">{balance.gold.toLocaleString("de-DE")}</p>
          <p className="mt-1 text-xs uppercase tracking-wider text-muted-fg">Gold-Coins</p>
          <p className="mt-2 text-xs text-muted-fg">Mit echtem Geld kaufen</p>
        </div>
      </section>

      {/* Gold Pakete */}
      <section>
        <h2 className="mb-4 text-lg font-bold">Gold-Coins kaufen</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {COIN_PACKAGES.map((pkg) => (
            <article
              key={pkg.id}
              className={cn(
                "relative flex flex-col border bg-bg p-6",
                pkg.popular ? "border-warning" : "border-border"
              )}
            >
              {pkg.popular && (
                <span className="absolute -top-3 left-4 bg-warning px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-black">
                  Beliebt
                </span>
              )}
              <div className="flex items-center gap-3">
                <span className="text-3xl">🥇</span>
                <div>
                  <p className="font-mono text-2xl font-bold text-warning">
                    {pkg.gold.toLocaleString("de-DE")}
                    {pkg.bonus && <span className="ml-2 text-sm font-normal text-success">{pkg.bonus}</span>}
                  </p>
                  <p className="text-xs text-muted-fg">Gold-Coins</p>
                </div>
              </div>
              <p className="mt-4 font-mono text-3xl font-bold">€ {pkg.price}</p>
              {/* Stripe-Integration folgt in SP-2 */}
              <Link
                href={`/app/coins/buy?package=${pkg.id}`}
                className={cn(buttonVariants({ size: "lg" }), "mt-4")}
              >
                Kaufen
                <ArrowRight className="size-4" />
              </Link>
            </article>
          ))}
        </div>
        <p className="mt-4 text-center text-xs text-muted-fg">
          Alle Preise inkl. 19% MwSt. · Zahlung via Stripe · Sicher und verschlüsselt
        </p>
      </section>

      {/* Silber verdienen */}
      <section>
        <h2 className="mb-4 text-lg font-bold">Silber-Coins verdienen</h2>
        <div className="grid gap-px border border-border bg-border sm:grid-cols-2">
          {[
            { action: "Daily Login",          coins: "+10 SC",         detail: "Täglich" },
            { action: "Quest abschließen",    coins: "+20–100 SC",     detail: "Je nach Schwierigkeit" },
            { action: "Boss besiegen",        coins: "+200 SC",        detail: "Mit deiner Klasse" },
            { action: "Level-Up",             coins: "+50×Level SC",   detail: "Z.B. Level 10 = +500 SC" },
            { action: "Duell gewinnen",       coins: "+30 SC",         detail: "1v1 Quiz-Duelle" },
            { action: "Streak 7 Tage",        coins: "+100 SC",        detail: "Streak-Meilenstein" },
            { action: "Streak 30 Tage",       coins: "+500 SC",        detail: "Streak-Meilenstein" },
            { action: "Wochenbonus (Tag 7)",   coins: "+200 SC",        detail: "Tagesbelohnung" },
          ].map((item) => (
            <div key={item.action} className="flex items-center justify-between bg-bg px-4 py-3">
              <div>
                <p className="text-sm font-medium">{item.action}</p>
                <p className="text-xs text-muted-fg">{item.detail}</p>
              </div>
              <p className="font-mono text-sm font-bold text-success">{item.coins}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Schritt 2: Commit**

```bash
git add src/app/app/coins/page.tsx
git commit -m "feat: add coins page with balance display and package overview"
```

---

## Task 14: Navigation + Header erweitern

**Files:**
- Modify: `src/app/app/layout.tsx`
- Modify: `src/components/app/AppHeader.tsx`

- [ ] **Schritt 1: Shop + Inventar + Coins in layout.tsx Sidebar eintragen**

In `navItems` Array nach `{ href: "/app/erfolge", ... }` einfügen:

```typescript
    { href: "/app/shop", label: "Shop", icon: "shoppingBag" },
    { href: "/app/inventar", label: "Inventar", icon: "package" },
    { href: "/app/coins", label: "Coins", icon: "coins" },
```

- [ ] **Schritt 2: Icons in Sidebar.tsx ergänzen**

In `src/components/app/Sidebar.tsx` die Imports um `ShoppingBag`, `Package`, `Coins` erweitern:

```typescript
import {
  // ... vorhandene imports ...
  ShoppingBag,
  Package,
  Coins,
} from "lucide-react";
```

Und in das `ICONS` Objekt eintragen:

```typescript
  shoppingBag: ShoppingBag,
  package: Package,
  coins: Coins,
```

- [ ] **Schritt 3: Coin-Balance im AppHeader anzeigen**

`src/app/app/layout.tsx` — Coin-Balance laden und an AppHeader übergeben. Nach dem `fetchNotifications` Aufruf ergänzen:

```typescript
import { getCoinBalance } from "@/lib/coins";

// In der Promise.all:
const [{ notifications, unreadCount }, dueFlashcards, pendingAssignments, coinBalance] = await Promise.all([
  fetchNotifications(session.userId),
  prisma.flashcard.count({ ... }),
  prisma.submission.count({ ... }),
  getCoinBalance(session.userId),
]);
```

AppHeader Aufruf ändern:
```typescript
<AppHeader
  user={displayUser(session)}
  unreadCount={unreadCount}
  notifications={notifications}
  coinBalance={coinBalance}
/>
```

`src/components/app/AppHeader.tsx` — Props erweitern und Coin-Balance anzeigen:

```typescript
export interface AppHeaderProps {
  user: { name: string; subtitle: string };
  searchPlaceholder?: string;
  unreadCount?: number;
  notifications?: NotificationItem[];
  coinBalance?: { silver: number; gold: number };
}

// Im JSX, vor ThemeToggle:
{coinBalance && (
  <Link href="/app/coins" className="hidden items-center gap-2 text-xs sm:flex">
    <span className="font-mono font-semibold text-muted-fg">🥈 {coinBalance.silver.toLocaleString("de-DE")}</span>
    <span className="font-mono font-semibold text-warning">🥇 {coinBalance.gold.toLocaleString("de-DE")}</span>
  </Link>
)}
```

- [ ] **Schritt 4: Commit**

```bash
git add src/app/app/layout.tsx src/components/app/AppHeader.tsx src/components/app/Sidebar.tsx
git commit -m "feat: add shop/inventory/coins to navigation and coin balance to header"
```

---

## Task 15: Avatar-Upload auf Profilseite aktivieren

**Files:**
- Modify: `src/app/app/profil/page.tsx`

- [ ] **Schritt 1: AvatarUploadButton Client Component erstellen**

```typescript
// src/app/app/profil/AvatarUploadButton.tsx
"use client";

import { useRef, useState } from "react";
import { Camera } from "lucide-react";
import { useRouter } from "next/navigation";

export function AvatarUploadButton({ currentUrl }: { currentUrl: string | null }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const router = useRouter();

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload/avatar", { method: "POST", body: fd });
    setUploading(false);
    if (res.ok) router.refresh();
    else {
      const data = await res.json() as { error: string };
      alert(data.error);
    }
  }

  return (
    <>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      <button
        type="button"
        aria-label="Avatar ändern"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        className="absolute -bottom-1 -right-1 grid size-7 place-items-center bg-fg text-bg transition-transform hover:scale-110 disabled:opacity-50"
      >
        <Camera className="size-3.5" />
      </button>
    </>
  );
}
```

- [ ] **Schritt 2: Avatar in profil/page.tsx verwenden**

In `profil/page.tsx`:
- Import hinzufügen: `import { AvatarUploadButton } from "./AvatarUploadButton";`
- `user` select um `avatarUrl` erweitern: `avatarUrl: true`
- Den statischen `<button>` durch `<AvatarUploadButton currentUrl={user.avatarUrl} />` ersetzen
- Avatar-Bild anzeigen wenn `avatarUrl` vorhanden: `<Avatar name={user.name} src={user.avatarUrl ?? undefined} size="lg" className="size-20 text-2xl" />`

- [ ] **Schritt 3: Avatar-Komponente um `src`-Prop erweitern**

In `src/components/ui/avatar.tsx` die Props um `src?: string` ergänzen und ein `<img>` rendern wenn `src` vorhanden ist.

- [ ] **Schritt 4: Commit**

```bash
git add src/app/app/profil/ src/components/ui/avatar.tsx src/app/api/upload/avatar/
git commit -m "feat: enable avatar upload on profile page"
```

---

## Task 16: Loot-Box Seite

**Files:**
- Create: `src/app/app/shop/loot-box/page.tsx`
- Create: `src/app/app/shop/loot-box/LootBoxClient.tsx`

- [ ] **Schritt 1: Loot-Box Server Action erstellen**

```typescript
// src/app/app/shop/loot-box/actions.ts
"use server";

import { getSession, effectiveRole } from "@/lib/session";
import { prisma } from "@/lib/db/client";
import { deductCoins } from "@/lib/coins";

type BoxTier = "bronze" | "silver" | "gold" | "legendary";

const BOX_PRICES: Record<BoxTier, { currency: "silver" | "gold"; amount: number }> = {
  bronze:    { currency: "silver", amount: 300 },
  silver:    { currency: "gold",   amount: 150 },
  gold:      { currency: "gold",   amount: 400 },
  legendary: { currency: "gold",   amount: 1000 },
};

const BOX_RARITY_POOLS: Record<BoxTier, Record<string, number>> = {
  bronze:    { common: 0.7, uncommon: 0.3 },
  silver:    { uncommon: 0.6, rare: 0.35, epic: 0.05 },
  gold:      { rare: 0.55, epic: 0.35, legendary: 0.1 },
  legendary: { legendary: 0.8, mythic: 0.2 },
};

function pickRarity(pool: Record<string, number>): string {
  const r = Math.random();
  let cumulative = 0;
  for (const [rarity, prob] of Object.entries(pool)) {
    cumulative += prob;
    if (r <= cumulative) return rarity;
  }
  return Object.keys(pool)[0];
}

export async function openLootBox(tier: BoxTier): Promise<{ ok: boolean; item?: { name: string; rarity: string; emoji: string }; error?: string }> {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "student") return { ok: false, error: "Nicht angemeldet" };

  const price = BOX_PRICES[tier];
  const deducted = await deductCoins(session.userId, price.amount, price.currency, `loot_box_${tier}`);
  if (!deducted) return { ok: false, error: "Nicht genug Coins" };

  const rarity = pickRarity(BOX_RARITY_POOLS[tier]);

  // Pick random item of that rarity that user doesn't own
  const ownedItems = await prisma.userInventory.findMany({
    where: { userId: session.userId },
    select: { itemId: true },
  });
  const ownedIds = new Set(ownedItems.map((i) => i.itemId));

  const candidates = await prisma.shopItem.findMany({
    where: {
      rarity,
      isActive: true,
      category: { notIn: ["booster", "streak_freeze", "boss_boost", "loot_box"] },
      id: { notIn: Array.from(ownedIds) },
    },
  });

  if (candidates.length === 0) {
    // Refund and return silver coins as consolation
    await deductCoins(session.userId, -price.amount, price.currency, "loot_box_refund");
    return { ok: false, error: "Keine neuen Items dieser Seltenheit verfügbar" };
  }

  const winner = candidates[Math.floor(Math.random() * candidates.length)];
  await prisma.userInventory.create({ data: { userId: session.userId, itemId: winner.id } });

  const preview = winner.previewData ? JSON.parse(winner.previewData) as Record<string, unknown> : {};
  return {
    ok: true,
    item: {
      name: winner.name,
      rarity: winner.rarity,
      emoji: (preview.emoji as string) ?? "🎁",
    },
  };
}
```

- [ ] **Schritt 2: LootBoxClient.tsx erstellen**

```typescript
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { openLootBox } from "./actions";

const RARITY_COLORS: Record<string, string> = {
  common: "text-muted-fg", uncommon: "text-success", rare: "text-info",
  epic: "text-brand", legendary: "text-warning", mythic: "text-danger",
};

const BOXES = [
  { tier: "bronze" as const,    name: "Bronze Box",    icon: "📦", price: "300 SC",  currency: "silver" },
  { tier: "silver" as const,    name: "Silber Box",    icon: "🎁", price: "150 GC",  currency: "gold" },
  { tier: "gold" as const,      name: "Gold Box",      icon: "💎", price: "400 GC",  currency: "gold" },
  { tier: "legendary" as const, name: "Legendäre Box", icon: "🌟", price: "1.000 GC",currency: "gold" },
];

export function LootBoxClient() {
  const [opening, setOpening] = useState<string | null>(null);
  const [result, setResult] = useState<{ name: string; rarity: string; emoji: string } | null>(null);
  const [animating, setAnimating] = useState(false);

  async function handleOpen(tier: "bronze" | "silver" | "gold" | "legendary") {
    if (opening) return;
    setOpening(tier);
    setResult(null);
    setAnimating(true);

    setTimeout(async () => {
      const res = await openLootBox(tier);
      setAnimating(false);
      setOpening(null);
      if (res.ok && res.item) setResult(res.item);
      else alert(res.error ?? "Fehler");
    }, 2000);
  }

  return (
    <div className="space-y-8">
      {result && (
        <div className="border border-border bg-gradient-to-br from-brand/[0.08] to-transparent p-8 text-center">
          <p className="text-6xl">{result.emoji}</p>
          <p className="mt-4 text-xl font-bold">{result.name}</p>
          <p className={cn("mt-1 text-sm font-semibold uppercase tracking-wider", RARITY_COLORS[result.rarity])}>
            {result.rarity}
          </p>
          <p className="mt-2 text-xs text-muted-fg">Zum Inventar hinzugefügt!</p>
          <Button className="mt-4" variant="outline" size="sm" onClick={() => setResult(null)}>
            Weitermachen
          </Button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {BOXES.map((box) => (
          <div key={box.tier} className={cn("border bg-bg p-6 text-center", opening === box.tier && "animate-pulse border-brand")}>
            <p className={cn("text-4xl transition-transform", animating && opening === box.tier && "scale-125")}>{box.icon}</p>
            <p className="mt-3 text-lg font-bold">{box.name}</p>
            <p className="mt-1 text-sm text-muted-fg">{box.price}</p>
            <Button
              className="mt-4 w-full"
              disabled={!!opening}
              onClick={() => handleOpen(box.tier)}
            >
              {opening === box.tier && animating ? "Öffnet…" : "Öffnen"}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Schritt 3: loot-box/page.tsx erstellen**

```typescript
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getSession, effectiveRole } from "@/lib/session";
import { getCoinBalance } from "@/lib/coins";
import { buttonVariants } from "@/components/ui/button";
import { LootBoxClient } from "./LootBoxClient";

export const metadata: Metadata = { title: "Mystery Boxes" };

export default async function LootBoxPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "student") redirect("/");

  const balance = await getCoinBalance(session.userId);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <header>
        <Link href="/app/shop" className={buttonVariants({ variant: "ghost", size: "sm" })}>
          <ArrowLeft className="size-4" /> Zurück zum Shop
        </Link>
        <h1 className="mt-4 text-3xl font-bold">📦 Mystery Boxes</h1>
        <p className="mt-1 text-sm text-muted-fg">
          🥈 {balance.silver.toLocaleString("de-DE")} SC · 🥇 {balance.gold.toLocaleString("de-DE")} GC
        </p>
      </header>

      <div className="border border-warning/30 bg-warning/[0.03] p-4 text-sm text-muted-fg">
        <strong className="text-warning">Wahrscheinlichkeiten:</strong>{" "}
        Bronze: Common 70%, Uncommon 30% ·
        Silber: Uncommon 60%, Rare 35%, Epic 5% ·
        Gold: Rare 55%, Epic 35%, Legendary 10% ·
        Legendär: Legendary 80%, Mythic 20%
      </div>

      <LootBoxClient />
    </div>
  );
}
```

- [ ] **Schritt 4: Commit**

```bash
git add src/app/app/shop/loot-box/
git commit -m "feat: add loot box page with animated opening"
```

---

## Task 17: Admin Shop-Verwaltung

**Files:**
- Create: `src/app/admin/shop/page.tsx`
- Create: `src/app/admin/shop/actions.ts`

- [ ] **Schritt 1: admin/shop/actions.ts erstellen**

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/client";
import { getSession, effectiveRole } from "@/lib/session";

export async function toggleShopItem(itemId: string, isActive: boolean): Promise<void> {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "admin") return;

  await prisma.shopItem.update({ where: { id: itemId }, data: { isActive } });
  revalidatePath("/admin/shop");
}

export async function createShopItem(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "admin") return;

  await prisma.shopItem.create({
    data: {
      slug: (formData.get("slug") as string).trim(),
      name: (formData.get("name") as string).trim(),
      description: (formData.get("description") as string).trim(),
      category: formData.get("category") as string,
      rarity: (formData.get("rarity") as string) || "common",
      priceSilver: formData.get("priceSilver") ? Number(formData.get("priceSilver")) : null,
      priceGold:   formData.get("priceGold")   ? Number(formData.get("priceGold"))   : null,
      previewData: (formData.get("previewData") as string) || null,
    },
  });

  revalidatePath("/admin/shop");
}
```

- [ ] **Schritt 2: admin/shop/page.tsx erstellen**

```typescript
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { getSession, effectiveRole, ROLE_HOME } from "@/lib/session";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toggleShopItem, createShopItem } from "./actions";

export const metadata: Metadata = { title: "Shop-Verwaltung · Admin" };

export default async function AdminShopPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "admin") redirect(ROLE_HOME[effectiveRole(session)]);

  const items = await prisma.shopItem.findMany({ orderBy: [{ category: "asc" }, { sortOrder: "asc" }] });

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Admin</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Shop-Verwaltung</h1>
        <p className="mt-1 text-sm text-muted-fg">{items.length} Items · {items.filter(i => i.isActive).length} aktiv</p>
      </header>

      <Card>
        <CardHeader><CardTitle>Neues Item erstellen</CardTitle></CardHeader>
        <CardBody>
          <form action={createShopItem} className="grid gap-3 sm:grid-cols-3">
            <input name="slug" placeholder="slug (z.B. frame_fire)" required className="border border-border bg-bg px-3 py-2 text-sm" />
            <input name="name" placeholder="Name" required className="border border-border bg-bg px-3 py-2 text-sm" />
            <input name="description" placeholder="Beschreibung" className="border border-border bg-bg px-3 py-2 text-sm" />
            <select name="category" className="border border-border bg-bg px-3 py-2 text-sm">
              {["frame","background","namecolor","booster","streak_freeze","boss_boost","card_theme","quiz_effect","loot_box","companion","emote","music"].map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <select name="rarity" className="border border-border bg-bg px-3 py-2 text-sm">
              {["common","uncommon","rare","epic","legendary","mythic"].map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            <input name="priceSilver" type="number" placeholder="Preis SC (optional)" className="border border-border bg-bg px-3 py-2 text-sm" />
            <input name="priceGold" type="number" placeholder="Preis GC (optional)" className="border border-border bg-bg px-3 py-2 text-sm" />
            <input name="previewData" placeholder='{"emoji":"🎁"}' className="border border-border bg-bg px-3 py-2 text-sm sm:col-span-2" />
            <Button type="submit">Item erstellen</Button>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader><CardTitle>Alle Items</CardTitle></CardHeader>
        <CardBody className="!p-0">
          <ul className="divide-y divide-border">
            {items.map((item) => (
              <li key={item.id} className="flex items-center gap-4 px-5 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{item.name}</p>
                  <p className="text-xs text-muted-fg">{item.slug} · {item.category} · {item.rarity}</p>
                  <p className="text-xs text-muted-fg">
                    {item.priceSilver ? `${item.priceSilver} SC` : ""} {item.priceGold ? `${item.priceGold} GC` : ""}
                    {!item.priceSilver && !item.priceGold ? "Gratis" : ""}
                  </p>
                </div>
                <Badge variant={item.isActive ? "success" : "secondary"}>
                  {item.isActive ? "Aktiv" : "Inaktiv"}
                </Badge>
                <form action={toggleShopItem.bind(null, item.id, !item.isActive)}>
                  <Button type="submit" size="sm" variant="ghost">
                    {item.isActive ? "Deaktivieren" : "Aktivieren"}
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}
```

- [ ] **Schritt 3: Admin-Navigation ergänzen**

In `src/app/admin/layout.tsx` den Shop-Link hinzufügen:
```typescript
{ href: "/admin/shop", label: "Shop", icon: "shoppingBag" }
```

- [ ] **Schritt 4: Commit**

```bash
git add src/app/admin/shop/
git commit -m "feat: add admin shop management page"
```

---

## Task 18: Equipped Cosmetics auf Profilseite anzeigen

**Files:**
- Modify: `src/app/app/profil/page.tsx`

- [ ] **Schritt 1: Equipped Cosmetics laden und anzeigen**

In `profil/page.tsx` die `getEquipped` Funktion importieren und laden:

```typescript
import { getEquipped } from "@/lib/shop";
// In Promise.all ergänzen:
const equipped = await getEquipped(session.userId);
```

Dann im JSX unterhalb des XP-Progression-Blocks einen neuen Bereich hinzufügen:

```typescript
{equipped && (equipped.frameSlug || equipped.companionSlug || equipped.backgroundSlug) && (
  <Card>
    <CardHeader>
      <CardTitle>Ausgerüstete Cosmetics</CardTitle>
      <Link href="/app/inventar" className={buttonVariants({ variant: "ghost", size: "sm" })}>
        Verwalten →
      </Link>
    </CardHeader>
    <CardBody>
      <div className="flex flex-wrap gap-4 text-sm">
        {equipped.frameSlug && <span>🖼️ Frame: <strong>{equipped.frameSlug}</strong></span>}
        {equipped.companionSlug && <span>🐉 Companion: <strong>{equipped.companionSlug}</strong></span>}
        {equipped.backgroundSlug && <span>🌌 Hintergrund: <strong>{equipped.backgroundSlug}</strong></span>}
        {equipped.nameColorSlug && <span>🎨 Namensfarbe: <strong>{equipped.nameColorSlug}</strong></span>}
      </div>
    </CardBody>
  </Card>
)}
```

- [ ] **Schritt 2: Commit**

```bash
git add src/app/app/profil/page.tsx
git commit -m "feat: show equipped cosmetics on profile page"
```

---

## Abschluss SP-1

- [ ] **Finaler Build-Check**

```bash
npm run build
```

Erwartete Ausgabe: Kein Fehler, alle Seiten korrekt kompiliert.

- [ ] **Finaler Commit**

```bash
git add -A
git commit -m "feat: SP-1 complete — currency system, shop, avatar, cosmetics"
```
