/* Copyright 2026 Elian Schock, Jonas Schwenk */
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Trophy, Crown, Swords, Flame, Coins, Timer, Sparkles, Award } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db/client";
import { ROLE_HOME, effectiveRole, getSession } from "@/lib/session";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Hall of Fame · MasterMind" };

// ── Datenschutz: nur Vorname + erster Buchstabe des Nachnamens ────────────────
function shortName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 1) return parts[0] ?? "";
  return `${parts[0]} ${parts[parts.length - 1].charAt(0)}.`;
}

const CATEGORY_META: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; color: string; unit: string }> = {
  xp:      { label: "XP",         icon: Trophy, color: "text-warning",   unit: "XP"    },
  coins:   { label: "Münzen",     icon: Coins,  color: "text-amber-500", unit: "🪙"    },
  boss:    { label: "Boss-DMG",   icon: Swords, color: "text-danger",    unit: "DMG"   },
  mvp:     { label: "MVP",        icon: Crown,  color: "text-yellow-400", unit: "×"    },
  streak:  { label: "Streak",     icon: Flame,  color: "text-orange-400", unit: "Tage" },
  lernzeit:{ label: "Lernzeit",   icon: Timer,  color: "text-brand",     unit: "min"   },
};

interface RankedEntry {
  userId: string;
  name: string;
  avatarUrl: string | null;
  score: number;
}

interface CategoryBoard {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  unit: string;
  top: RankedEntry[];       // Top 5
  myRank: number | null;    // 1-basiert, null = ohne Wertung
  myScore: number;
}

export default async function HallOfFamePage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "student") redirect(ROLE_HOME[effectiveRole(session)]);

  // ── Schulweite Ruhmeshalle: alle Kategorien parallel laden ─────────────────
  const [students, duelWinsRaw, bossDamageRaw, achievementsRaw, seasons] = await Promise.all([
    session.schoolId
      ? prisma.user.findMany({
          where:  { schoolId: session.schoolId, role: "student" },
          select: { id: true, name: true, avatarUrl: true, xp: true, streak: true },
        })
      : Promise.resolve([]),
    (prisma.duel.groupBy({
      by: ["winnerId"], _count: { winnerId: true },
      where: { status: "completed", winnerId: { not: null } },
      orderBy: { _count: { winnerId: "desc" } },
    } as unknown as Parameters<typeof prisma.duel.groupBy>[0])) as unknown as Promise<{ winnerId: string | null; _count: { winnerId: number } }[]>,
    session.schoolId
      ? ((prisma.bossParticipant.groupBy({
          by: ["userId"], _sum: { damage: true },
          where: { user: { schoolId: session.schoolId } },
          orderBy: { _sum: { damage: "desc" } },
        } as unknown as Parameters<typeof prisma.bossParticipant.groupBy>[0])) as unknown as Promise<{ userId: string; _sum: { damage: number | null } }[]>)
      : Promise.resolve([]),
    session.schoolId
      ? ((prisma.userAchievement.groupBy({
          by: ["userId"], _count: { userId: true },
          where: { user: { schoolId: session.schoolId } },
          orderBy: { _count: { userId: "desc" } },
        } as unknown as Parameters<typeof prisma.userAchievement.groupBy>[0])) as unknown as Promise<{ userId: string; _count: { userId: number } }[]>)
      : Promise.resolve([]),
    prisma.season.findMany({
      where: {
        isActive: false,
        rankingEntries: { some: {} },
        OR: [{ schoolId: null }, { schoolId: session.schoolId ?? "" }],
      },
      orderBy: { endAt: "desc" },
      include: {
        rankingEntries: {
          where: { rank: { lte: 3 } },
          orderBy: [{ category: "asc" }, { rank: "asc" }],
          include: { user: { select: { id: true, name: true, avatarUrl: true } } },
        },
      },
      take: 10,
    }),
  ]);

  const studentMap = new Map(students.map((s) => [s.id, s]));

  function buildBoard(
    key: string,
    label: string,
    icon: React.ComponentType<{ className?: string }>,
    color: string,
    unit: string,
    scores: Map<string, number>,
  ): CategoryBoard {
    const ranked: RankedEntry[] = [...scores.entries()]
      .filter(([userId, score]) => score > 0 && studentMap.has(userId))
      .map(([userId, score]) => {
        const u = studentMap.get(userId)!;
        return { userId, name: u.name, avatarUrl: u.avatarUrl, score };
      })
      .sort((a, b) => b.score - a.score);

    const myIndex = ranked.findIndex((e) => e.userId === session!.userId);
    return {
      key, label, icon, color, unit,
      top:     ranked.slice(0, 5),
      myRank:  myIndex >= 0 ? myIndex + 1 : null,
      myScore: myIndex >= 0 ? ranked[myIndex].score : 0,
    };
  }

  const boards: CategoryBoard[] = [
    buildBoard("xp", "Meiste XP", Trophy, "text-warning", "XP",
      new Map(students.map((s) => [s.id, s.xp]))),
    buildBoard("streak", "Längster Streak", Flame, "text-orange-400", "Tage",
      new Map(students.map((s) => [s.id, s.streak]))),
    buildBoard("duels", "Duell-Siege", Swords, "text-danger", "Siege",
      new Map(duelWinsRaw.filter((d) => d.winnerId).map((d) => [d.winnerId!, d._count.winnerId]))),
    buildBoard("boss", "Boss-Schaden", Sparkles, "text-brand", "DMG",
      new Map(bossDamageRaw.map((b) => [b.userId, b._sum.damage ?? 0]))),
    buildBoard("achievements", "Meiste Erfolge", Award, "text-yellow-400", "Erfolge",
      new Map(achievementsRaw.map((a) => [a.userId, a._count.userId]))),
  ];

  function formatScore(category: string, score: bigint): string {
    const n = Number(score);
    if (category === "lernzeit") return `${Math.round(n / 60)}min`;
    return n.toLocaleString("de-DE");
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Gamification</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Hall of Fame</h1>
        <p className="mt-1 text-sm text-muted-fg">Die Ruhmeshalle deiner Schule</p>
      </header>

      {/* ── Aktuelle Bestenlisten der Schule ─────────────────────────────── */}
      <section className="grid gap-4 sm:grid-cols-2">
        {boards.map((board) => {
          const Icon = board.icon;
          const podium = board.top.slice(0, 3);
          const rest = board.top.slice(3);
          // Podium-Reihenfolge: 2 – 1 – 3
          const podiumOrder = [podium[1], podium[0], podium[2]].filter(Boolean) as RankedEntry[];

          return (
            <Card key={board.key} className={cn(board.key === "xp" && "sm:col-span-2")}>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Icon className={cn("size-5", board.color)} strokeWidth={1.75} />
                  <CardTitle>{board.label}</CardTitle>
                </div>
              </CardHeader>
              <CardBody>
                {board.top.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-fg">Noch keine Einträge.</p>
                ) : (
                  <>
                    {/* Podium für Platz 1–3 */}
                    <div className="flex items-end justify-center gap-3 sm:gap-6">
                      {podiumOrder.map((entry) => {
                        const rank = board.top.indexOf(entry) + 1;
                        const isMe = entry.userId === session!.userId;
                        const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉";
                        const isFirst = rank === 1;
                        return (
                          <div
                            key={entry.userId}
                            className={cn(
                              "flex w-24 flex-col items-center gap-1 rounded-2xl border border-border bg-surface p-3 text-center",
                              isFirst && "w-28 -translate-y-2 border-warning/40 p-4",
                              isMe && "bg-brand/5",
                            )}
                          >
                            <span className={cn("text-xl", isFirst && "text-3xl")}>{medal}</span>
                            <Avatar name={entry.name} src={entry.avatarUrl ?? undefined} size={isFirst ? "md" : "sm"} />
                            <span className={cn("w-full truncate text-xs font-semibold", isFirst && "text-sm", isMe && "text-brand")}>
                              {shortName(entry.name)}{isMe && " (du)"}
                            </span>
                            <span className={cn("font-mono text-xs font-bold", board.color)}>
                              {entry.score.toLocaleString("de-DE")} {board.unit}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Plätze 4–5 */}
                    {rest.length > 0 && (
                      <ol className="mt-4 space-y-1">
                        {rest.map((entry, i) => {
                          const rank = i + 4;
                          const isMe = entry.userId === session!.userId;
                          return (
                            <li
                              key={entry.userId}
                              className={cn(
                                "flex items-center gap-2 rounded-xl px-2 py-1.5",
                                isMe && "bg-brand/5",
                              )}
                            >
                              <span className="w-6 shrink-0 text-center font-mono text-xs font-bold text-muted-fg">#{rank}</span>
                              <Avatar name={entry.name} src={entry.avatarUrl ?? undefined} size="xs" />
                              <span className={cn("flex-1 truncate text-sm", isMe && "font-bold text-brand")}>
                                {shortName(entry.name)}{isMe && " (du)"}
                              </span>
                              <span className={cn("shrink-0 font-mono text-xs font-bold", board.color)}>
                                {entry.score.toLocaleString("de-DE")} {board.unit}
                              </span>
                            </li>
                          );
                        })}
                      </ol>
                    )}

                    {/* Eigene Platzierung außerhalb der Top 5 */}
                    {board.myRank !== null && board.myRank > 5 && (
                      <div className="mt-4 flex items-center gap-2 rounded-xl bg-brand/5 px-3 py-2">
                        <span className="font-mono text-xs font-bold text-brand">Dein Platz: #{board.myRank}</span>
                        <span className={cn("ml-auto font-mono text-xs font-bold", board.color)}>
                          {board.myScore.toLocaleString("de-DE")} {board.unit}
                        </span>
                      </div>
                    )}
                    {board.myRank === null && (
                      <p className="mt-4 text-center text-xs text-muted-fg">Du bist hier noch nicht platziert.</p>
                    )}
                  </>
                )}
              </CardBody>
            </Card>
          );
        })}
      </section>

      {/* ── Archiv abgeschlossener Saisons ───────────────────────────────── */}
      {seasons.length === 0 ? (
        <Card>
          <CardBody className="py-16 text-center">
            <Trophy className="mx-auto mb-4 size-12 text-muted-fg" strokeWidth={1.5} />
            <p className="text-lg font-bold">Noch keine abgeschlossenen Saisons</p>
            <p className="mt-1 text-sm text-muted-fg">Warte bis die aktuelle Saison endet.</p>
          </CardBody>
        </Card>
      ) : (
        <>
          <h2 className="text-xl font-bold tracking-tight">Saison-Archiv</h2>
          {seasons.map((season) => {
            const byCategory = new Map<string, typeof season.rankingEntries>();
            for (const entry of season.rankingEntries) {
              if (!byCategory.has(entry.category)) byCategory.set(entry.category, []);
              byCategory.get(entry.category)!.push(entry);
            }

            return (
              <Card key={season.id}>
                <CardHeader>
                  <div>
                    <CardTitle>{season.name}</CardTitle>
                    <p className="mt-1 text-xs text-muted-fg">
                      Saison {season.number}
                      {season.theme && ` · ${season.theme}`}
                      {" · "}
                      {season.startAt.toLocaleDateString("de-DE", { month: "short", year: "numeric" })}
                      {" – "}
                      {season.endAt.toLocaleDateString("de-DE", { month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <Trophy className="size-5 text-warning" strokeWidth={1.75} />
                </CardHeader>
                <CardBody>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {[...byCategory.entries()].map(([cat, entries]) => {
                      const meta = CATEGORY_META[cat];
                      if (!meta) return null;
                      const Icon = meta.icon;
                      return (
                        <div key={cat} className="rounded-2xl border border-border bg-surface p-4">
                          <div className="mb-3 flex items-center gap-2">
                            <Icon className={cn("size-4", meta.color)} />
                            <span className="text-xs font-bold uppercase tracking-wider text-muted-fg">{meta.label}</span>
                          </div>
                          <ol className="space-y-2">
                            {entries.slice(0, 3).map((e) => {
                              const isMe = e.userId === session!.userId;
                              const medal = e.rank === 1 ? "🥇" : e.rank === 2 ? "🥈" : "🥉";
                              return (
                                <li key={e.id} className={cn("flex items-center gap-2 rounded-lg", isMe && "bg-brand/5 font-bold")}>
                                  <span className="text-sm">{medal}</span>
                                  <Avatar name={e.user.name} src={e.user.avatarUrl ?? undefined} size="xs" />
                                  <span className={cn("flex-1 truncate text-sm", isMe && "text-brand")}>
                                    {shortName(e.user.name)}{isMe && " (du)"}
                                  </span>
                                  <span className={cn("shrink-0 font-mono text-xs font-bold", meta.color)}>
                                    {formatScore(cat, e.score)} {meta.unit}
                                  </span>
                                </li>
                              );
                            })}
                          </ol>
                        </div>
                      );
                    })}
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </>
      )}
    </div>
  );
}
