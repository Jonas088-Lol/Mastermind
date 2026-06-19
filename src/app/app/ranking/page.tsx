import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Trophy, Coins, Crown, Timer, Flame, Swords } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { prisma } from "@/lib/db/client";
import { ROLE_HOME, effectiveRole, getSession } from "@/lib/session";
import { levelFromXp, getRankForXp, formatXp, xpProgressInLevel } from "@/lib/game";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Ranking · MasterMind" };

interface PageProps {
  searchParams: Promise<{ tab?: string }>;
}

const TABS = [
  { key: "klasse",   label: "Klasse",       icon: Trophy  },
  { key: "schule",   label: "Schule",        icon: Trophy  },
  { key: "streak",   label: "Streak",        icon: Flame   },
  { key: "boss",     label: "Boss-Schaden",  icon: Swords  },
  { key: "mvp",      label: "MVP",           icon: Crown   },
  { key: "coins",    label: "Münzen",        icon: Coins   },
  { key: "lernzeit", label: "Lernzeit",      icon: Timer   },
  { key: "weekly",   label: "Diese Woche",   icon: Trophy  },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default async function RankingPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "student") redirect(ROLE_HOME[effectiveRole(session)]);

  const { tab: tabParam } = await searchParams;
  const activeTab: TabKey = (TABS.find((t) => t.key === tabParam)?.key ?? "klasse") as TabKey;

  // Only fetch data for the active tab — saves 6-7 DB queries per page load
  let classmatesRaw: XpUser[] = [];
  let schoolRaw: XpUser[] = [];
  let streakRaw: XpUser[] = [];
  let bossRaw: { userId: string; _sum: { damage: number | null } }[] = [];
  let mvpRaw: { userId: string; _count: { isMvp: number } }[] = [];
  let coinsRaw: Array<XpUser & { coins: number }> = [];
  let lernzeitRaw: { userId: string; _sum: { activeSeconds: number | null } }[] = [];
  let weeklyRaw: { userId: string; _sum: { amount: number | null } }[] = [];

  if (activeTab === "klasse" && session.classId) {
    classmatesRaw = await prisma.user.findMany({
      where: { classId: session.classId, role: "student" },
      select: { id: true, name: true, xp: true, streak: true, equippedTitle: true, prestige: true },
      orderBy: { xp: "desc" },
    });
  } else if (activeTab === "schule" && session.schoolId) {
    schoolRaw = await prisma.user.findMany({
      where: { schoolId: session.schoolId, role: "student" },
      select: { id: true, name: true, xp: true, streak: true, equippedTitle: true, prestige: true },
      orderBy: { xp: "desc" },
      take: 50,
    });
  } else if (activeTab === "streak" && session.schoolId) {
    streakRaw = await prisma.user.findMany({
      where: { schoolId: session.schoolId, role: "student", streak: { gt: 0 } },
      select: { id: true, name: true, xp: true, streak: true, equippedTitle: true, prestige: true },
      orderBy: { streak: "desc" },
      take: 30,
    });
  } else if (activeTab === "boss" && session.schoolId) {
    bossRaw = (await prisma.bossParticipant.groupBy({
      by: ["userId"],
      _sum: { damage: true },
      where: { user: { schoolId: session.schoolId } },
      orderBy: { _sum: { damage: "desc" } },
      take: 30,
    })) as typeof bossRaw;
  } else if (activeTab === "mvp" && session.schoolId) {
    mvpRaw = (await prisma.bossParticipant.groupBy({
      by: ["userId"],
      _count: { isMvp: true },
      where: { user: { schoolId: session.schoolId }, isMvp: true },
      orderBy: { _count: { isMvp: "desc" } },
      take: 30,
    })) as typeof mvpRaw;
  } else if (activeTab === "coins" && session.schoolId) {
    coinsRaw = (await prisma.user.findMany({
      where: { schoolId: session.schoolId, role: "student" },
      select: { id: true, name: true, xp: true, coins: true, equippedTitle: true, prestige: true },
      orderBy: { coins: "desc" },
      take: 30,
    })) as typeof coinsRaw;
  } else if (activeTab === "lernzeit" && session.schoolId) {
    lernzeitRaw = (await prisma.activitySession.groupBy({
      by: ["userId"],
      _sum: { activeSeconds: true },
      where: { user: { schoolId: session.schoolId, role: "student" } },
      orderBy: { _sum: { activeSeconds: "desc" } },
      take: 30,
    })) as typeof lernzeitRaw;
  } else if (activeTab === "weekly" && session.schoolId) {
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    weeklyRaw = (await prisma.xpLog.groupBy({
      by: ["userId"],
      _sum: { amount: true },
      where: {
        user: { schoolId: session.schoolId, role: "student" },
        createdAt: { gte: startOfWeek },
      },
      orderBy: { _sum: { amount: "desc" } },
      take: 30,
    })) as typeof weeklyRaw;
  }

  // Resolve user details for aggregation-based tabs
  const extraIds = [
    ...bossRaw.map((r) => r.userId),
    ...mvpRaw.map((r) => r.userId),
    ...lernzeitRaw.map((r) => r.userId),
    ...weeklyRaw.map((r) => r.userId),
  ];
  const uniqueExtraIds = [...new Set(extraIds)];

  const extraUsers =
    uniqueExtraIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: uniqueExtraIds } },
          select: { id: true, name: true, xp: true, equippedTitle: true, prestige: true },
        })
      : [];

  const extraUserMap = new Map(extraUsers.map((u) => [u.id, u]));

  const bossLeaderboard = bossRaw
    .map((r) => ({ user: extraUserMap.get(r.userId)!, score: r._sum.damage ?? 0 }))
    .filter((r) => r.user);

  const mvpLeaderboard = mvpRaw
    .map((r) => ({ user: extraUserMap.get(r.userId)!, score: r._count.isMvp }))
    .filter((r) => r.user);

  const lernzeitLeaderboard = lernzeitRaw
    .map((r) => ({ user: extraUserMap.get(r.userId)!, seconds: r._sum.activeSeconds ?? 0 }))
    .filter((r) => r.user);

  const weeklyLeaderboard = weeklyRaw
    .map((r) => ({ user: extraUserMap.get(r.userId)!, score: r._sum.amount ?? 0 }))
    .filter((r) => r.user);

  function tabHref(key: string) {
    return `/app/ranking?tab=${key}`;
  }

  function formatTime(seconds: number) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Gamification</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Ranking</h1>
      </header>

      {/* Tab bar */}
      <div className="flex flex-wrap gap-1.5">
        {TABS.map((tab) => (
          <Link
            key={tab.key}
            href={tabHref(tab.key)}
            className={cn(
              "rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors",
              activeTab === tab.key
                ? "border-fg bg-fg text-bg"
                : "border-border text-muted-fg hover:border-fg/30 hover:text-fg",
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Klassen-Ranking */}
      {activeTab === "klasse" && (
        !session.classId
          ? <Empty>Keine Klasse zugewiesen.</Empty>
          : classmatesRaw.length === 0
          ? <Empty>Keine Mitschüler gefunden.</Empty>
          : <XpLeaderboard users={classmatesRaw} currentUserId={session.userId} />
      )}

      {/* Schul-Ranking */}
      {activeTab === "schule" && (
        !session.schoolId
          ? <Empty>Keine Schule zugewiesen.</Empty>
          : schoolRaw.length === 0
          ? <Empty>Keine Schüler gefunden.</Empty>
          : <XpLeaderboard users={schoolRaw} currentUserId={session.userId} />
      )}

      {/* Streak-Ranking */}
      {activeTab === "streak" && (
        streakRaw.length === 0
          ? <Empty>Noch keine Streaks.</Empty>
          : (
            <ol className="space-y-2">
              {streakRaw.map((u, i) => {
                const isMe = u.id === session.userId;
                const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;
                return (
                  <li key={u.id} className={cn("flex items-center gap-3 rounded-2xl border px-4 py-3", isMe && "border-brand/40 bg-brand/3")}>
                    <span className="w-8 text-center font-mono text-sm font-bold text-muted-fg">{medal ?? `#${i + 1}`}</span>
                    <Avatar name={u.name} size="sm" />
                    <span className={cn("flex-1 text-sm font-medium", isMe && "font-bold")}>{u.name}{isMe && " (Du)"}</span>
                    <div className="flex items-center gap-1.5">
                      <Flame className="size-4 text-orange-400" />
                      <span className="font-mono font-bold">{u.streak}</span>
                      <span className="text-xs text-muted-fg">Tage</span>
                    </div>
                  </li>
                );
              })}
            </ol>
          )
      )}

      {/* Boss-Schaden-Ranking */}
      {activeTab === "boss" && (
        bossLeaderboard.length === 0
          ? <Empty>Noch keine Boss-Kämpfe.</Empty>
          : (
            <ol className="space-y-2">
              {bossLeaderboard.map(({ user: u, score }, i) => {
                const isMe = u.id === session.userId;
                const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;
                return (
                  <li key={u.id} className={cn("flex items-center gap-3 rounded-2xl border px-4 py-3", isMe && "border-brand/40 bg-brand/3")}>
                    <span className="w-8 text-center font-mono text-sm font-bold text-muted-fg">{medal ?? `#${i + 1}`}</span>
                    <Avatar name={u.name} size="sm" />
                    <span className={cn("flex-1 text-sm font-medium", isMe && "font-bold")}>{u.name}{isMe && " (Du)"}</span>
                    <div className="flex items-center gap-1.5">
                      <Swords className="size-4 text-danger" strokeWidth={1.75} />
                      <span className="font-mono font-bold text-danger">{score.toLocaleString("de-DE")}</span>
                      <span className="text-xs text-muted-fg">DMG</span>
                    </div>
                  </li>
                );
              })}
            </ol>
          )
      )}

      {/* MVP-Count-Ranking */}
      {activeTab === "mvp" && (
        mvpLeaderboard.length === 0
          ? <Empty>Noch keine MVP-Auszeichnungen.</Empty>
          : (
            <ol className="space-y-2">
              {mvpLeaderboard.map(({ user: u, score }, i) => {
                const isMe = u.id === session.userId;
                const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;
                return (
                  <li key={u.id} className={cn("flex items-center gap-3 rounded-2xl border px-4 py-3", isMe && "border-brand/40 bg-brand/3")}>
                    <span className="w-8 text-center font-mono text-sm font-bold text-muted-fg">{medal ?? `#${i + 1}`}</span>
                    <Avatar name={u.name} size="sm" />
                    <span className={cn("flex-1 text-sm font-medium", isMe && "font-bold")}>{u.name}{isMe && " (Du)"}</span>
                    <div className="flex items-center gap-1.5">
                      <Crown className="size-4 text-yellow-400" />
                      <span className="font-mono font-bold text-yellow-500">{score}×</span>
                      <span className="text-xs text-muted-fg">MVP</span>
                    </div>
                  </li>
                );
              })}
            </ol>
          )
      )}

      {/* Münzen-Ranking */}
      {activeTab === "coins" && (
        coinsRaw.length === 0
          ? <Empty>Keine Daten.</Empty>
          : (
            <ol className="space-y-2">
              {coinsRaw.map((u, i) => {
                const isMe = u.id === session.userId;
                const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;
                return (
                  <li key={u.id} className={cn("flex items-center gap-3 rounded-2xl border px-4 py-3", isMe && "border-brand/40 bg-brand/3")}>
                    <span className="w-8 text-center font-mono text-sm font-bold text-muted-fg">{medal ?? `#${i + 1}`}</span>
                    <Avatar name={u.name} size="sm" />
                    <span className={cn("flex-1 text-sm font-medium", isMe && "font-bold")}>{u.name}{isMe && " (Du)"}</span>
                    <div className="flex items-center gap-1.5">
                      <Coins className="size-4 text-amber-400" />
                      <span className="font-mono font-bold text-amber-500">{u.coins.toLocaleString("de-DE")}</span>
                    </div>
                  </li>
                );
              })}
            </ol>
          )
      )}

      {/* Lernzeit-Ranking */}
      {activeTab === "lernzeit" && (
        lernzeitLeaderboard.length === 0
          ? (
            <Card>
              <CardBody className="py-10 text-center">
                <Timer className="mx-auto mb-3 size-8 text-muted-fg" strokeWidth={1.5} />
                <p className="text-sm font-semibold">Keine Lernzeit-Daten</p>
                <p className="mt-1 text-xs text-muted-fg">
                  Nur Schüler die der Aktivitätsverfolgung zugestimmt haben erscheinen hier.
                </p>
              </CardBody>
            </Card>
          ) : (
            <ol className="space-y-2">
              {lernzeitLeaderboard.map(({ user: u, seconds }, i) => {
                const isMe = u.id === session.userId;
                const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;
                return (
                  <li key={u.id} className={cn("flex items-center gap-3 rounded-2xl border px-4 py-3", isMe && "border-brand/40 bg-brand/3")}>
                    <span className="w-8 text-center font-mono text-sm font-bold text-muted-fg">{medal ?? `#${i + 1}`}</span>
                    <Avatar name={u.name} size="sm" />
                    <span className={cn("flex-1 text-sm font-medium", isMe && "font-bold")}>{u.name}{isMe && " (Du)"}</span>
                    <div className="flex items-center gap-1.5">
                      <Timer className="size-4 text-brand" strokeWidth={1.75} />
                      <span className="font-mono font-bold text-brand">{formatTime(seconds)}</span>
                    </div>
                  </li>
                );
              })}
            </ol>
          )
      )}

      {/* Weekly-Ranking */}
      {activeTab === "weekly" && (
        weeklyLeaderboard.length === 0
          ? <Empty>Noch keine XP diese Woche.</Empty>
          : (
            <ol className="space-y-2">
              {weeklyLeaderboard.map(({ user: u, score }, i) => {
                const isMe = u.id === session.userId;
                const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;
                return (
                  <li key={u.id} className={cn("flex items-center gap-3 rounded-2xl border px-4 py-3", isMe && "border-brand/40 bg-brand/3")}>
                    <span className="w-8 text-center font-mono text-sm font-bold text-muted-fg">{medal ?? `#${i + 1}`}</span>
                    <Avatar name={u.name} size="sm" />
                    <span className={cn("flex-1 text-sm font-medium", isMe && "font-bold")}>{u.name}{isMe && " (Du)"}</span>
                    <div className="flex items-center gap-1.5">
                      <Trophy className="size-4 text-warning" />
                      <span className="font-mono font-bold text-warning">{score}</span>
                      <span className="text-xs text-muted-fg">XP</span>
                    </div>
                  </li>
                );
              })}
            </ol>
          )
      )}
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────────

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <Card><CardBody><p className="py-8 text-center text-sm text-muted-fg">{children}</p></CardBody></Card>
  );
}

interface XpUser {
  id: string;
  name: string;
  xp: number;
  streak: number;
  equippedTitle: string | null;
  prestige: number;
}

function XpLeaderboard({ users, currentUserId }: { users: XpUser[]; currentUserId: string }) {
  return (
    <ol className="space-y-2">
      {users.map((u, i) => {
        const level = levelFromXp(u.xp);
        const rank = getRankForXp(u.xp);
        const pct = xpProgressInLevel(u.xp);
        const isMe = u.id === currentUserId;
        const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;

        return (
          <li key={u.id} className={cn("rounded-2xl border px-4 py-3", isMe && "border-brand/40 bg-brand/3")}>
            <div className="flex items-center gap-3">
              <span className="w-8 shrink-0 text-center font-mono text-sm font-bold text-muted-fg">
                {medal ?? `#${i + 1}`}
              </span>
              <Avatar name={u.name} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className={cn("text-sm font-medium", isMe && "font-bold")}>
                    {u.name}{isMe && " (Du)"}
                  </p>
                  <span className="text-sm">{rank.icon}</span>
                  <Badge variant="outline" className="text-[10px]">Lv.{level}</Badge>
                  {u.streak > 0 && <span className="text-xs text-muted-fg">🔥 {u.streak}</span>}
                </div>
                <div className="mt-1.5">
                  <Progress value={pct} tone="brand" className="h-1" />
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Trophy className="size-3.5 text-warning" strokeWidth={1.75} />
                <span className="font-mono text-sm font-bold">{formatXp(u.xp)}</span>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
