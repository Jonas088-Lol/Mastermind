/* Copyright 2026 Elian Schock, Jonas Schwenk */
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CheckCircle2, Clock, Lock, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { prisma } from "@/lib/db/client";
import { berlinDayKey, berlinStartOfDay, berlinStartOfWeek, berlinEndOfMonth, berlinMonthKey } from "@/lib/date-de";
import { ROLE_HOME, effectiveRole, getSession } from "@/lib/session";
import {
  DAILY_QUEST_POOL,
  WEEKLY_QUEST_POOL,
  MONTHLY_QUEST_POOL,
  HIDDEN_QUEST_POOL,
  type QuestDef,
} from "@/lib/game";
import { cn } from "@/lib/utils";
import { claimQuestReward } from "./actions";

export const metadata: Metadata = { title: "Quests · MasterMind" };

const DIFFICULTY_COLORS: Record<string, string> = {
  easy:      "text-success",
  normal:    "text-info",
  hard:      "text-warning",
  epic:      "text-brand",
  legendary: "text-danger",
};

const RARITY_VARIANT: Record<string, "outline" | "brand" | "warning" | "danger" | "info"> = {
  common:    "outline",
  uncommon:  "info",
  rare:      "brand",
  epic:      "brand",
  legendary: "warning",
  mythic:    "danger",
};

function deterministicPick<T extends { slug: string }>(
  pool: T[],
  userId: string,
  dateStr: string,
  count: number,
): T[] {
  let hash = 5381;
  const seed = `${userId}-${dateStr}`;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) + hash + seed.charCodeAt(i)) >>> 0;
  }
  const copy = [...pool];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = hash % (i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
    hash = (hash * 1664525 + 1013904223) >>> 0;
  }
  return copy.slice(0, Math.min(count, copy.length));
}

async function ensureQuestsSeeded(pool: QuestDef[]) {
  // Existenz-Ensure der statischen Quest-Definitionen. Statt pro Quest ein
  // upsert (N Queries bei jedem Seitenaufruf) einmal die vorhandenen Slugs
  // laden und nur die fehlenden per createMany anlegen — im eingeschwungenen
  // Zustand nur noch eine einzige findMany-Abfrage. skipDuplicates gibt es nur
  // beim Postgres-Client, daher stattdessen createMany im try/catch (bei
  // parallelem Seed greift der @unique(slug), die andere Anfrage hat's angelegt).
  const existing = await prisma.quest.findMany({
    where: { slug: { in: pool.map((q) => q.slug) } },
    select: { slug: true },
  });
  const have = new Set(existing.map((e) => e.slug));
  const missing = pool.filter((q) => !have.has(q.slug));
  if (missing.length === 0) return;
  try {
    await prisma.quest.createMany({
      data: missing.map((q) => ({
        slug: q.slug,
        title: q.title,
        description: q.description,
        lore: q.lore,
        type: q.type,
        category: q.category,
        targetCount: q.targetCount,
        xpReward: q.xpReward,
        titleReward: q.titleReward ?? null,
        icon: q.icon,
        difficulty: q.difficulty,
        rarity: q.rarity,
      })),
    });
  } catch {
    // Unique-Konflikt aus parallelem Seed — Definitionen sind bereits angelegt.
  }
}

async function ensureUserQuestAssigned(
  userId: string,
  slug: string,
  expiresAt: Date,
) {
  const quest = await prisma.quest.findUnique({ where: { slug } });
  if (!quest) return;

  const now = new Date();
  const startOfPeriod = new Date(expiresAt);
  // For daily: start = today midnight; for weekly: start = start of week
  // We detect duplicates by checking if a UserQuest with this questId exists that hasn't expired
  const existing = await prisma.userQuest.findFirst({
    where: {
      userId,
      questId: quest.id,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
  });

  if (!existing) {
    await prisma.userQuest.create({
      data: { userId, questId: quest.id, assignedAt: now, expiresAt },
    }).catch(() => {}); // ignore unique constraint errors from race
  }
}

export default async function QuestsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "student") redirect(ROLE_HOME[effectiveRole(session)]);

  const now = new Date();
  const todayStr = berlinDayKey(now);

  // Tagesgrenzen in Europe/Berlin (nicht Server-/UTC-Zeit), damit tägliche und
  // wöchentliche Quests exakt zur deutschen Mitternacht rollen.
  // Berlin-Tagesende = 1 ms vor der nächsten Berliner Mitternacht. +36 h ab
  // Mitternacht landet garantiert im nächsten Kalendertag (auch an DST-Tagen).
  const startOfDayBerlin = berlinStartOfDay(now);
  const endOfDay = new Date(
    berlinStartOfDay(new Date(startOfDayBerlin.getTime() + 36 * 3_600_000)).getTime() - 1,
  );

  // Berlin-Wochenende = 1 ms vor dem nächsten Montag. +10 Tage ab Wochenstart
  // landet sicher in der Folgewoche.
  const startOfWeekBerlin = berlinStartOfWeek(now);
  const endOfWeek = new Date(
    berlinStartOfWeek(new Date(startOfWeekBerlin.getTime() + 10 * 86_400_000)).getTime() - 1,
  );

  const endOfMonth = berlinEndOfMonth(now);

  // Seed quest definitions
  await ensureQuestsSeeded([...DAILY_QUEST_POOL, ...WEEKLY_QUEST_POOL, ...MONTHLY_QUEST_POOL, ...HIDDEN_QUEST_POOL]);

  // Assign daily quests if not already done today
  const existingDailies = await prisma.userQuest.findMany({
    where: {
      userId: session.userId,
      quest: { type: "daily" },
      expiresAt: { gt: now },
    },
  });

  if (existingDailies.length === 0) {
    const pickedDaily = deterministicPick(DAILY_QUEST_POOL, session.userId, todayStr, 3);
    for (const q of pickedDaily) {
      await ensureUserQuestAssigned(session.userId, q.slug, endOfDay);
    }
  }

  // Assign weekly quests if not already active
  const existingWeeklies = await prisma.userQuest.findMany({
    where: {
      userId: session.userId,
      quest: { type: "weekly" },
      expiresAt: { gt: now },
    },
  });

  if (existingWeeklies.length === 0) {
    const weekStr = `${todayStr}-week${Math.floor(now.getDate() / 7)}`;
    const pickedWeekly = deterministicPick(WEEKLY_QUEST_POOL, session.userId, weekStr, 3);
    for (const q of pickedWeekly) {
      await ensureUserQuestAssigned(session.userId, q.slug, endOfWeek);
    }
  }

  // Assign monthly quests if not already active
  const existingMonthlies = await prisma.userQuest.findMany({
    where: {
      userId: session.userId,
      quest: { type: "monthly" },
      expiresAt: { gt: now },
    },
  });

  if (existingMonthlies.length === 0) {
    const monthStr = berlinMonthKey(now);
    const pickedMonthly = deterministicPick(MONTHLY_QUEST_POOL, session.userId, monthStr, 2);
    for (const q of pickedMonthly) {
      await ensureUserQuestAssigned(session.userId, q.slug, endOfMonth);
    }
  }

  // Assign hidden quests once (no expiry)
  const existingHidden = await prisma.userQuest.findMany({
    where: { userId: session.userId, quest: { type: "hidden" } },
  });

  if (existingHidden.length === 0) {
    for (const q of HIDDEN_QUEST_POOL) {
      await ensureUserQuestAssigned(session.userId, q.slug, new Date("2099-01-01"));
    }
  }

  // Load all user quests
  const userQuests = await prisma.userQuest.findMany({
    where: {
      userId: session.userId,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    include: { quest: true },
    orderBy: { assignedAt: "desc" },
  });

  const daily   = userQuests.filter((uq) => uq.quest.type === "daily");
  const weekly  = userQuests.filter((uq) => uq.quest.type === "weekly");
  const monthly = userQuests.filter((uq) => uq.quest.type === "monthly");
  const hidden  = userQuests.filter((uq) => uq.quest.type === "hidden");

  const totalCompleted = userQuests.filter((uq) => uq.completedAt).length;
  const totalClaimed   = userQuests.filter((uq) => uq.claimedAt).length;
  const pendingClaim   = userQuests.filter((uq) => uq.completedAt && !uq.claimedAt).length;

  // "Heute"-Statistiken (server-berechnet, Berliner Tagesgrenze)
  const startOfDay = startOfDayBerlin;
  const dailyDone = daily.filter((uq) => uq.completedAt).length;
  const completedToday = userQuests.filter(
    (uq) => uq.completedAt && uq.completedAt >= startOfDay,
  );
  const xpToday = completedToday.reduce((sum, uq) => sum + uq.quest.xpReward, 0);

  function timeLeft(expiresAt: Date | null): string {
    if (!expiresAt) return "";
    const ms = expiresAt.getTime() - now.getTime();
    if (ms <= 0) return "Abgelaufen";
    const h = Math.floor(ms / 3_600_000);
    const m = Math.floor((ms % 3_600_000) / 60_000);
    if (h >= 24) return `${Math.floor(h / 24)}T ${h % 24}h`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  }

  function endetIn(expiresAt: Date): string {
    const ms = expiresAt.getTime() - now.getTime();
    if (ms <= 0) return "abgelaufen";
    const totalMinutes = Math.floor(ms / 60_000);
    const d = Math.floor(totalMinutes / 1440);
    const h = Math.floor((totalMinutes % 1440) / 60);
    const m = totalMinutes % 60;
    if (d > 0) return `endet in ${d}T ${h}h`;
    return `endet in ${h}h ${m}m`;
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Gamification</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Quests</h1>
          <p className="mt-1 text-sm font-semibold">
            {dailyDone} von {daily.length} Quests heute geschafft
          </p>
          <p className="mt-0.5 text-sm text-muted-fg">
            {totalCompleted} abgeschlossen · {totalClaimed} eingelöst
            {xpToday > 0 && (
              <span className="ml-2 font-semibold text-brand">+{xpToday} XP heute</span>
            )}
            {pendingClaim > 0 && (
              <span className="ml-2 font-semibold text-warning">{pendingClaim} bereit zum Einlösen</span>
            )}
          </p>
        </div>
        <Zap className="size-10 text-warning opacity-20" strokeWidth={1} />
      </header>

      {completedToday.length > 0 && (
        <section className="rounded-2xl border border-success/30 bg-success/5 px-4 py-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-success">
              Erledigt heute
            </p>
            {completedToday.map((uq) => (
              <span
                key={uq.id}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-2.5 py-1 text-xs"
              >
                <CheckCircle2 className="size-3.5 shrink-0 text-success" />
                <span className="max-w-40 truncate font-medium">{uq.quest.title}</span>
                <span className="text-muted-fg">+{uq.quest.xpReward} XP</span>
              </span>
            ))}
          </div>
        </section>
      )}

      <QuestSection title="Täglich" subtitle={`Erneuert sich um Mitternacht · ${endetIn(endOfDay)}`} quests={daily} timeLeft={timeLeft} claimAction={claimQuestReward} />
      <QuestSection title="Wöchentlich" subtitle={`Diese Woche · ${endetIn(endOfWeek)}`} quests={weekly} timeLeft={timeLeft} claimAction={claimQuestReward} />
      <QuestSection title="Monatlich" subtitle={`Diesen Monat · ${endetIn(endOfMonth)}`} quests={monthly} timeLeft={timeLeft} claimAction={claimQuestReward} />
      <HiddenSection quests={hidden} claimAction={claimQuestReward} />
    </div>
  );
}

function QuestSection({
  title,
  subtitle,
  quests,
  timeLeft,
  claimAction,
}: {
  title: string;
  subtitle: string;
  quests: Array<{ id: string; progress: number; completedAt: Date | null; claimedAt: Date | null; expiresAt: Date | null; quest: { id: string; title: string; description: string; lore: string | null; targetCount: number; xpReward: number; icon: string; difficulty: string; rarity: string; titleReward: string | null } }>;
  timeLeft: (d: Date | null) => string;
  claimAction: (id: string) => Promise<void>;
}) {
  if (quests.length === 0) return null;
  const done = quests.filter((q) => q.completedAt).length;

  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between">
        <div>
          <h2 className="text-lg font-bold">{title}</h2>
          <p className="text-xs text-muted-fg">{subtitle}</p>
        </div>
        <span className="font-mono text-sm text-muted-fg">{done}/{quests.length}</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {quests.map((uq) => (
          <QuestCard key={uq.id} uq={uq} timeLeft={timeLeft} claimAction={claimAction} />
        ))}
      </div>
    </section>
  );
}

function QuestCard({
  uq,
  timeLeft,
  claimAction,
}: {
  uq: { id: string; progress: number; completedAt: Date | null; claimedAt: Date | null; expiresAt: Date | null; quest: { id: string; title: string; description: string; lore: string | null; targetCount: number; xpReward: number; icon: string; difficulty: string; rarity: string; titleReward: string | null } };
  timeLeft: (d: Date | null) => string;
  claimAction: (id: string) => Promise<void>;
}) {
  const q = uq.quest;
  const pct = Math.min(100, Math.round((uq.progress / Math.max(1, q.targetCount)) * 100));
  const isCompleted = !!uq.completedAt;
  const isClaimed = !!uq.claimedAt;
  const canClaim = isCompleted && !isClaimed;

  return (
    <div
      className={cn(
        "flex flex-col gap-3 border p-4 transition-colors",
        isClaimed  && "border-border opacity-60",
        canClaim   && "border-warning/50 bg-warning/3",
        !isCompleted && !isClaimed && "border-border bg-bg",
      )}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl leading-none">{q.icon}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold leading-tight">{q.title}</p>
            {isClaimed && <CheckCircle2 className="size-3.5 shrink-0 text-success" />}
          </div>
          <p className="mt-0.5 text-xs text-muted-fg">{q.description}</p>
        </div>
      </div>

      {q.lore && (
        <p className="border-l-2 border-border pl-2 text-[11px] italic text-muted-fg/70">{q.lore}</p>
      )}

      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-fg">{uq.progress}/{q.targetCount}</span>
          <span className={cn("font-semibold", DIFFICULTY_COLORS[q.difficulty] ?? "text-muted-fg")}>
            {pct}%
          </span>
        </div>
        <Progress value={pct} tone={isCompleted ? "success" : "brand"} className="h-1.5" />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Badge variant={RARITY_VARIANT[q.rarity] ?? "outline"} className="text-[10px]">
            +{q.xpReward} XP
          </Badge>
          {q.titleReward && (
            <Badge variant="warning" className="text-[10px]">Titel</Badge>
          )}
        </div>
        {uq.expiresAt && !isClaimed && (
          <div className="flex items-center gap-1 text-[10px] text-muted-fg">
            <Clock className="size-3" />
            {timeLeft(uq.expiresAt)}
          </div>
        )}
      </div>

      {canClaim && (
        <form action={claimAction.bind(null, q.id)}>
          <Button type="submit" size="sm" variant="secondary" className="w-full">
            <Zap className="size-3.5 text-warning" />
            Einlösen · +{q.xpReward} XP
          </Button>
        </form>
      )}
    </div>
  );
}

function HiddenSection({
  quests,
  claimAction,
}: {
  quests: Array<{ id: string; progress: number; completedAt: Date | null; claimedAt: Date | null; expiresAt: Date | null; quest: { id: string; title: string; description: string; lore: string | null; targetCount: number; xpReward: number; icon: string; difficulty: string; rarity: string; titleReward: string | null } }>;
  claimAction: (id: string) => Promise<void>;
}) {
  if (quests.length === 0) return null;
  const unlocked = quests.filter((q) => q.completedAt);

  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between">
        <div>
          <h2 className="text-lg font-bold">Geheime Missionen</h2>
          <p className="text-xs text-muted-fg">Entdecke versteckte Herausforderungen</p>
        </div>
        <span className="font-mono text-sm text-muted-fg">{unlocked.length}/{quests.length}</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {quests.map((uq) => {
          const q = uq.quest;
          const isRevealed = !!uq.completedAt || uq.progress > 0;
          const canClaim = !!uq.completedAt && !uq.claimedAt;

          return (
            <div
              key={uq.id}
              className={cn(
                "flex flex-col gap-3 border p-4",
                canClaim ? "border-warning/50 bg-warning/3" : "border-border bg-bg",
              )}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl leading-none">{isRevealed ? q.icon : "❓"}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold leading-tight">
                    {isRevealed ? q.title : "???"}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-fg">
                    {isRevealed ? q.description : "Noch nicht entdeckt"}
                  </p>
                </div>
                {!isRevealed && <Lock className="size-4 shrink-0 text-muted-fg/40" />}
              </div>

              {q.lore && (
                <p className="border-l-2 border-border pl-2 text-[11px] italic text-muted-fg/70">{q.lore}</p>
              )}

              {isRevealed && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-fg">{uq.progress}/{q.targetCount}</span>
                  </div>
                  <Progress
                    value={Math.min(100, Math.round((uq.progress / Math.max(1, q.targetCount)) * 100))}
                    tone="brand"
                    className="h-1.5"
                  />
                </div>
              )}

              <div className="flex items-center gap-1.5">
                <Badge variant="warning" className="text-[10px]">+{q.xpReward} XP</Badge>
                <Badge variant="danger" className="text-[10px]">Geheim</Badge>
              </div>

              {canClaim && (
                <form action={claimAction.bind(null, q.id)}>
                  <Button type="submit" size="sm" variant="secondary" className="w-full">
                    <Zap className="size-3.5 text-warning" />
                    Einlösen · +{q.xpReward} XP
                  </Button>
                </form>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
