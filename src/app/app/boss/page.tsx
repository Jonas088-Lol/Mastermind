import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Swords, Users, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Avatar } from "@/components/ui/avatar";
import { prisma } from "@/lib/db/client";
import { ROLE_HOME, effectiveRole, getSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { attackBoss } from "./actions";

export const metadata: Metadata = { title: "Boss-Battle · MasterMind" };

const DIFFICULTY_LABELS: Record<string, string> = {
  normal: "Normal", hard: "Schwer", epic: "Episch", legendary: "Legendär",
};

const DIFFICULTY_COLORS: Record<string, string> = {
  normal: "border-info/40",
  hard: "border-warning/40",
  epic: "border-brand/40",
  legendary: "border-danger/40",
};

export default async function BossPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "student") redirect(ROLE_HOME[effectiveRole(session)]);

  const activeBattles = await prisma.bossBattle.findMany({
    where: {
      isActive: true,
      OR: [{ schoolId: null }, { schoolId: session.schoolId ?? "" }],
    },
    include: {
      participants: {
        orderBy: { damage: "desc" },
        take: 10,
        include: { user: { select: { id: true, name: true } } },
      },
    },
    orderBy: { startAt: "asc" },
  });

  const pastBattles = await prisma.bossBattle.findMany({
    where: {
      isActive: false,
      currentHp: 0,
      OR: [{ schoolId: null }, { schoolId: session.schoolId ?? "" }],
    },
    take: 5,
    orderBy: { endAt: "desc" },
    include: {
      participants: {
        where: { userId: session.userId },
      },
    },
  });

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Gamification</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Boss-Battles</h1>
        <p className="mt-1 text-sm text-muted-fg">
          {activeBattles.length > 0
            ? `${activeBattles.length} aktiver Boss`
            : "Kein aktiver Boss — schau bald wieder vorbei"}
        </p>
      </header>

      {activeBattles.length === 0 ? (
        <Card>
          <CardBody className="py-16 text-center">
            <span className="text-5xl">😴</span>
            <p className="mt-4 text-lg font-bold">Kein Boss momentan aktiv</p>
            <p className="mt-1 text-sm text-muted-fg">Dein Admin startet Boss-Events im Admin-Bereich</p>
          </CardBody>
        </Card>
      ) : (
        activeBattles.map((battle) => {
          const hpPct = Math.round((battle.currentHp / battle.maxHp) * 100);
          const myParticipation = battle.participants.find((p) => p.userId === session.userId);
          const totalParticipants = battle.participants.length;

          return (
            <div key={battle.id} className={cn("border-2 bg-bg p-6", DIFFICULTY_COLORS[battle.difficulty] ?? "border-border")}>
              <div className="flex items-start gap-4">
                <span className="shrink-0 text-5xl leading-none">{battle.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-black">{battle.name}</h2>
                    <Badge variant={battle.difficulty === "legendary" ? "danger" : battle.difficulty === "epic" ? "brand" : "warning"}>
                      {DIFFICULTY_LABELS[battle.difficulty] ?? battle.difficulty}
                    </Badge>
                    {battle.subject && <Badge variant="outline">{battle.subject}</Badge>}
                  </div>
                  <p className="mt-0.5 text-sm text-muted-fg">{battle.description}</p>
                  {battle.lore && (
                    <p className="mt-2 border-l-2 border-border pl-2 text-xs italic text-muted-fg/70">{battle.lore}</p>
                  )}
                </div>
              </div>

              {/* HP Bar */}
              <div className="mt-6 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold">Leben</span>
                  <span className="font-mono font-bold">
                    {battle.currentHp.toLocaleString("de-DE")} / {battle.maxHp.toLocaleString("de-DE")} HP
                  </span>
                </div>
                <Progress
                  value={hpPct}
                  tone={hpPct > 50 ? "success" : hpPct > 25 ? "warning" : "danger"}
                  className="h-4"
                />
                <p className="text-xs text-muted-fg">{hpPct}% verbleibend</p>
              </div>

              {/* Attack + reward */}
              <div className="mt-6 flex flex-wrap items-center gap-4">
                <form action={attackBoss.bind(null, battle.id)}>
                  <Button size="lg" variant="secondary" disabled={!battle.isActive || battle.currentHp === 0}>
                    <Swords className="size-4" />
                    Angreifen!
                  </Button>
                </form>
                <div className="flex items-center gap-1.5 text-sm text-muted-fg">
                  <Zap className="size-4 text-warning" />
                  <span>Belohnung: <span className="font-bold text-fg">{battle.xpReward} XP</span> (aufgeteilt nach Schaden)</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm text-muted-fg">
                  <Users className="size-4" />
                  <span>{totalParticipants} Teilnehmer</span>
                </div>
              </div>

              {myParticipation && (
                <div className="mt-4 border-t border-border pt-4 text-sm">
                  <span className="text-muted-fg">Dein Schaden: </span>
                  <span className="font-mono font-bold text-danger">{myParticipation.damage.toLocaleString("de-DE")}</span>
                  <span className="ml-3 text-muted-fg">Treffer: </span>
                  <span className="font-mono font-bold">{myParticipation.correctAnswers}</span>
                </div>
              )}

              {/* Leaderboard */}
              {battle.participants.length > 0 && (
                <div className="mt-6">
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-fg">Schaden-Ranking</h3>
                  <ol className="space-y-1.5">
                    {battle.participants.slice(0, 5).map((p, i) => {
                      const isMe = p.userId === session.userId;
                      const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;
                      return (
                        <li
                          key={p.id}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2",
                            isMe ? "bg-brand/[0.06]" : "bg-surface",
                          )}
                        >
                          <span className="w-6 text-center font-mono text-sm font-bold text-muted-fg">
                            {medal ?? `#${i + 1}`}
                          </span>
                          <Avatar name={p.user.name} size="sm" />
                          <span className={cn("flex-1 text-sm font-medium", isMe && "font-bold")}>
                            {p.user.name}
                            {isMe && " (Du)"}
                          </span>
                          <span className="font-mono text-sm font-bold text-danger">
                            {p.damage.toLocaleString("de-DE")}
                          </span>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              )}
            </div>
          );
        })
      )}

      {/* Past battles */}
      {pastBattles.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-fg">Vergangene Kämpfe</h2>
          <div className="divide-y divide-border border border-border">
            {pastBattles.map((battle) => {
              const myDmg = battle.participants[0]?.damage ?? 0;
              return (
                <div key={battle.id} className="flex items-center gap-4 px-4 py-3">
                  <span className="text-2xl">{battle.icon}</span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{battle.name}</p>
                    <p className="text-xs text-muted-fg">
                      {battle.endAt.toLocaleDateString("de-DE", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <Badge variant="success">Besiegt</Badge>
                  {myDmg > 0 && (
                    <span className="font-mono text-sm font-bold text-danger">{myDmg} DMG</span>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
