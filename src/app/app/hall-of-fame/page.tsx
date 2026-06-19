import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Trophy, Crown, Swords, Flame, Coins, Timer } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db/client";
import { ROLE_HOME, effectiveRole, getSession } from "@/lib/session";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Hall of Fame · MasterMind" };

const CATEGORY_META: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; color: string; unit: string }> = {
  xp:      { label: "XP",         icon: Trophy, color: "text-warning",   unit: "XP"    },
  coins:   { label: "Münzen",     icon: Coins,  color: "text-amber-500", unit: "🪙"    },
  boss:    { label: "Boss-DMG",   icon: Swords, color: "text-danger",    unit: "DMG"   },
  mvp:     { label: "MVP",        icon: Crown,  color: "text-yellow-400", unit: "×"    },
  streak:  { label: "Streak",     icon: Flame,  color: "text-orange-400", unit: "Tage" },
  lernzeit:{ label: "Lernzeit",   icon: Timer,  color: "text-brand",     unit: "min"   },
};

export default async function HallOfFamePage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "student") redirect(ROLE_HOME[effectiveRole(session)]);

  // Load all archived seasons (newest first)
  const seasons = await prisma.season.findMany({
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
  });

  if (seasons.length === 0) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Gamification</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Hall of Fame</h1>
        </header>
        <Card>
          <CardBody className="py-16 text-center">
            <Trophy className="mx-auto mb-4 size-12 text-muted-fg" strokeWidth={1.5} />
            <p className="text-lg font-bold">Noch keine abgeschlossenen Saisons</p>
            <p className="mt-1 text-sm text-muted-fg">Warte bis die aktuelle Saison endet.</p>
          </CardBody>
        </Card>
      </div>
    );
  }

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
        <p className="mt-1 text-sm text-muted-fg">Die besten Spieler aller Saisons</p>
      </header>

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
                          const isMe = e.userId === session.userId;
                          const medal = e.rank === 1 ? "🥇" : e.rank === 2 ? "🥈" : "🥉";
                          return (
                            <li key={e.id} className={cn("flex items-center gap-2", isMe && "font-bold")}>
                              <span className="text-sm">{medal}</span>
                              <Avatar name={e.user.name} src={e.user.avatarUrl ?? undefined} size="xs" />
                              <span className={cn("flex-1 truncate text-sm", isMe && "text-brand")}>
                                {e.user.name}{isMe && " (Du)"}
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
    </div>
  );
}
