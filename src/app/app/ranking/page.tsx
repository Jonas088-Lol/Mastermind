import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Trophy } from "lucide-react";
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
  { key: "klasse",  label: "Klasse" },
  { key: "schule",  label: "Schule" },
  { key: "streak",  label: "Streak" },
  { key: "boss",    label: "Boss" },
  { key: "weekly",  label: "Diese Woche" },
] as const;

type TabKey = typeof TABS[number]["key"];

export default async function RankingPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "student") redirect(ROLE_HOME[effectiveRole(session)]);

  const { tab: tabParam } = await searchParams;
  const activeTab: TabKey = (TABS.find((t) => t.key === tabParam)?.key ?? "klasse") as TabKey;

  // Fetch data for all tabs in parallel
  const [classmatesRaw, schoolRaw, streakRaw, bossRaw, weeklyRaw] = await Promise.all([
    // Class ranking
    session.classId
      ? prisma.user.findMany({
          where: { classId: session.classId, role: "student" },
          select: { id: true, name: true, xp: true, streak: true, equippedTitle: true, prestige: true },
          orderBy: { xp: "desc" },
        })
      : [],

    // School ranking
    session.schoolId
      ? prisma.user.findMany({
          where: { schoolId: session.schoolId, role: "student" },
          select: { id: true, name: true, xp: true, streak: true, equippedTitle: true, prestige: true },
          orderBy: { xp: "desc" },
          take: 50,
        })
      : [],

    // Streak ranking
    session.schoolId
      ? prisma.user.findMany({
          where: { schoolId: session.schoolId, role: "student", streak: { gt: 0 } },
          select: { id: true, name: true, xp: true, streak: true, equippedTitle: true, prestige: true },
          orderBy: { streak: "desc" },
          take: 30,
        })
      : [],

    // Boss battle ranking (by total damage)
    session.schoolId
      ? prisma.bossParticipant.groupBy({
          by: ["userId"],
          _sum: { damage: true },
          where: {
            user: { schoolId: session.schoolId },
          },
          orderBy: { _sum: { damage: "desc" } },
          take: 30,
        })
      : [],

    // Weekly XP ranking (this week)
    session.schoolId
      ? (async () => {
          const startOfWeek = new Date();
          startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
          startOfWeek.setHours(0, 0, 0, 0);
          return prisma.xpLog.groupBy({
            by: ["userId"],
            _sum: { amount: true },
            where: {
              user: { schoolId: session.schoolId, role: "student" },
              createdAt: { gte: startOfWeek },
            },
            orderBy: { _sum: { amount: "desc" } },
            take: 30,
          });
        })()
      : [],
  ]);

  // For boss/weekly we need user details
  const bossUserIds = bossRaw.map((r) => r.userId);
  const weeklyUserIds = (weeklyRaw as Array<{ userId: string; _sum: { amount: number | null } }>).map((r) => r.userId);

  const [bossUsers, weeklyUsers] = await Promise.all([
    bossUserIds.length > 0
      ? prisma.user.findMany({
          where: { id: { in: bossUserIds } },
          select: { id: true, name: true, xp: true, equippedTitle: true, prestige: true },
        })
      : [],
    weeklyUserIds.length > 0
      ? prisma.user.findMany({
          where: { id: { in: weeklyUserIds } },
          select: { id: true, name: true, xp: true, equippedTitle: true, prestige: true },
        })
      : [],
  ]);

  const bossUserMap = new Map(bossUsers.map((u) => [u.id, u]));
  const weeklyUserMap = new Map(weeklyUsers.map((u) => [u.id, u]));

  const bossLeaderboard = bossRaw.map((r) => ({
    user: bossUserMap.get(r.userId)!,
    score: r._sum.damage ?? 0,
  })).filter((r) => r.user);

  const weeklyLeaderboard = (weeklyRaw as Array<{ userId: string; _sum: { amount: number | null } }>).map((r) => ({
    user: weeklyUserMap.get(r.userId)!,
    score: r._sum.amount ?? 0,
  })).filter((r) => r.user);

  function tabHref(key: string) {
    return `/app/ranking?tab=${key}`;
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
              "border px-3 py-1.5 text-xs font-semibold transition-colors",
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
        !session.classId ? (
          <Card><CardBody><p className="py-8 text-center text-sm text-muted-fg">Keine Klasse zugewiesen.</p></CardBody></Card>
        ) : classmatesRaw.length === 0 ? (
          <Card><CardBody><p className="py-8 text-center text-sm text-muted-fg">Keine Mitschüler gefunden.</p></CardBody></Card>
        ) : (
          <XpLeaderboard users={classmatesRaw} currentUserId={session.userId} />
        )
      )}

      {/* Schul-Ranking */}
      {activeTab === "schule" && (
        !session.schoolId ? (
          <Card><CardBody><p className="py-8 text-center text-sm text-muted-fg">Keine Schule zugewiesen.</p></CardBody></Card>
        ) : schoolRaw.length === 0 ? (
          <Card><CardBody><p className="py-8 text-center text-sm text-muted-fg">Keine Schüler gefunden.</p></CardBody></Card>
        ) : (
          <XpLeaderboard users={schoolRaw} currentUserId={session.userId} />
        )
      )}

      {/* Streak-Ranking */}
      {activeTab === "streak" && (
        streakRaw.length === 0 ? (
          <Card><CardBody><p className="py-8 text-center text-sm text-muted-fg">Noch keine Streaks.</p></CardBody></Card>
        ) : (
          <ol className="space-y-2">
            {streakRaw.map((u, i) => {
              const isMe = u.id === session.userId;
              const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;
              return (
                <li key={u.id} className={cn("flex items-center gap-3 border px-4 py-3", isMe && "border-brand/40 bg-brand/[0.03]")}>
                  <span className="w-8 text-center font-mono text-sm font-bold text-muted-fg">{medal ?? `#${i + 1}`}</span>
                  <Avatar name={u.name} size="sm" />
                  <span className={cn("flex-1 text-sm font-medium", isMe && "font-bold")}>{u.name}{isMe && " (Du)"}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-base">🔥</span>
                    <span className="font-mono font-bold">{u.streak}</span>
                    <span className="text-xs text-muted-fg">Tage</span>
                  </div>
                </li>
              );
            })}
          </ol>
        )
      )}

      {/* Boss-Ranking */}
      {activeTab === "boss" && (
        bossLeaderboard.length === 0 ? (
          <Card><CardBody><p className="py-8 text-center text-sm text-muted-fg">Noch keine Boss-Kämpfe.</p></CardBody></Card>
        ) : (
          <ol className="space-y-2">
            {bossLeaderboard.map(({ user: u, score }, i) => {
              const isMe = u.id === session.userId;
              const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;
              return (
                <li key={u.id} className={cn("flex items-center gap-3 border px-4 py-3", isMe && "border-brand/40 bg-brand/[0.03]")}>
                  <span className="w-8 text-center font-mono text-sm font-bold text-muted-fg">{medal ?? `#${i + 1}`}</span>
                  <Avatar name={u.name} size="sm" />
                  <span className={cn("flex-1 text-sm font-medium", isMe && "font-bold")}>{u.name}{isMe && " (Du)"}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-base">⚔️</span>
                    <span className="font-mono font-bold text-danger">{score.toLocaleString("de-DE")}</span>
                    <span className="text-xs text-muted-fg">DMG</span>
                  </div>
                </li>
              );
            })}
          </ol>
        )
      )}

      {/* Weekly-Ranking */}
      {activeTab === "weekly" && (
        weeklyLeaderboard.length === 0 ? (
          <Card><CardBody><p className="py-8 text-center text-sm text-muted-fg">Noch keine XP diese Woche.</p></CardBody></Card>
        ) : (
          <ol className="space-y-2">
            {weeklyLeaderboard.map(({ user: u, score }, i) => {
              const isMe = u.id === session.userId;
              const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;
              return (
                <li key={u.id} className={cn("flex items-center gap-3 border px-4 py-3", isMe && "border-brand/40 bg-brand/[0.03]")}>
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

function XpLeaderboard({
  users,
  currentUserId,
}: {
  users: Array<{ id: string; name: string; xp: number; streak: number; equippedTitle: string | null; prestige: number }>;
  currentUserId: string;
}) {
  return (
    <ol className="space-y-2">
      {users.map((u, i) => {
        const level = levelFromXp(u.xp);
        const rank = getRankForXp(u.xp);
        const pct = xpProgressInLevel(u.xp);
        const isMe = u.id === currentUserId;
        const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;

        return (
          <li key={u.id} className={cn("border px-4 py-3", isMe && "border-brand/40 bg-brand/[0.03]")}>
            <div className="flex items-center gap-3">
              <span className="w-8 shrink-0 text-center font-mono text-sm font-bold text-muted-fg">
                {medal ?? `#${i + 1}`}
              </span>
              <Avatar name={u.name} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className={cn("text-sm font-medium", isMe && "font-bold")}>
                    {u.name}
                    {isMe && " (Du)"}
                  </p>
                  <span className="text-sm">{rank.icon}</span>
                  <Badge variant="outline" className="text-[10px]">Lv.{level}</Badge>
                  {u.streak > 0 && (
                    <span className="text-xs text-muted-fg">🔥 {u.streak}</span>
                  )}
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
