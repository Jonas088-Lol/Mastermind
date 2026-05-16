import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CheckCircle2, Clock, Lock, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { prisma } from "@/lib/db/client";
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
  for (const q of pool) {
    await prisma.quest.upsert({
      where: { slug: q.slug },
      create: {
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
      },
      update: {},
    });
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
  const todayStr = now.toISOString().slice(0, 10);

  // Calculate time boundaries
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  const endOfWeek = new Date(now);
  endOfWeek.setDate(now.getDate() + (7 - now.getDay()));
  endOfWeek.setHours(23, 59, 59, 999);

  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

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
    const monthStr = `${now.getFullYear()}-${now.getMonth()}`;
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

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Gamification</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Quests</h1>
          <p className="mt-1 text-sm text-muted-fg">
            {totalCompleted} abgeschlossen · {totalClaimed} eingelöst
            {pendingClaim > 0 && (
              <span className="ml-2 font-semibold text-warning">{pendingClaim} bereit zum Einlösen</span>
            )}
          </p>
        </div>
        <Zap className="size-10 text-warning opacity-20" strokeWidth={1} />
      </header>

      <QuestSection title="Täglich" subtitle={`Erneuert sich um Mitternacht`} quests={daily} timeLeft={timeLeft} claimAction={claimQuestReward} />
      <QuestSection title="Wöchentlich" subtitle="Diese Woche" quests={weekly} timeLeft={timeLeft} claimAction={claimQuestReward} />
      <QuestSection title="Monatlich" subtitle="Diesen Monat" quests={monthly} timeLeft={timeLeft} claimAction={claimQuestReward} />
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
        canClaim   && "border-warning/50 bg-warning/[0.03]",
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
                canClaim ? "border-warning/50 bg-warning/[0.03]" : "border-border bg-bg",
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
