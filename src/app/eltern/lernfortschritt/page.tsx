import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Flame, Zap, Coins, Trophy } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { prisma } from "@/lib/db/client";
import { ROLE_HOME, effectiveRole, getSession } from "@/lib/session";
import { levelFromXp, getRankForXp, formatXp, xpProgressInLevel, xpToNextLevel } from "@/lib/game";

export const metadata: Metadata = { title: "Lernfortschritt · Eltern" };

const XP_REASON_LABEL: Record<string, string> = {
  aufgabe_abgabe: "Aufgabe abgegeben",
  aufgabe_bewertet: "Aufgabe bewertet",
  karteikarte: "Karteikarten",
  note_geteilt: "Notiz geteilt",
  login: "Täglicher Login",
  quest: "Quest abgeschlossen",
  daily_login: "Tägliches Einloggen",
  streak: "Streak-Bonus",
  exercise: "Übungsaufgabe",
  flashcard: "Karteikarte",
  submission: "Abgabe",
  duel: "Duell gewonnen",
  boss: "Boss besiegt",
};

function xpReasonLabel(reason: string): string {
  return XP_REASON_LABEL[reason] ?? reason.replace(/_/g, " ");
}

export default async function LernfortschrittPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "parent") redirect(ROLE_HOME[effectiveRole(session)]);

  const now = new Date();

  const links = await prisma.parentStudentLink.findMany({
    where: { parentId: session.userId },
    include: {
      student: {
        select: {
          id: true,
          name: true,
          xp: true,
          streak: true,
          coins: true,
          totalDailyLogins: true,
          schoolClass: { select: { name: true } },
          xpLogs: {
            orderBy: { createdAt: "desc" },
            take: 10,
            select: { id: true, amount: true, reason: true, createdAt: true },
          },
          userQuests: {
            where: { completedAt: { not: null } },
            orderBy: { completedAt: "desc" },
            take: 5,
            include: {
              quest: { select: { title: true, icon: true, xpReward: true, rarity: true } },
            },
          },
          userBoosters: {
            where: { expiresAt: { gt: now } },
            orderBy: { expiresAt: "asc" },
            take: 1,
          },
        },
      },
    },
    orderBy: { student: { name: "asc" } },
  });

  const RARITY_VARIANT: Record<string, "success" | "info" | "warning" | "danger" | "neutral"> = {
    common: "neutral",
    uncommon: "success",
    rare: "info",
    epic: "warning",
    legendary: "danger",
    mythic: "danger",
  };

  const RARITY_LABEL: Record<string, string> = {
    common: "Gewöhnlich",
    uncommon: "Ungewöhnlich",
    rare: "Selten",
    epic: "Episch",
    legendary: "Legendär",
    mythic: "Mythisch",
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-10">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Schule</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Lernfortschritt</h1>
        <p className="mt-1 text-sm text-muted-fg">
          Gamification-Statistiken, Quests und XP-Verlauf deiner Kinder.
        </p>
      </header>

      {links.length === 0 && (
        <p className="text-sm text-muted-fg">Kein Kind mit deinem Konto verknüpft.</p>
      )}

      {links.map(({ student }) => {
        const level = levelFromXp(student.xp);
        const rank = getRankForXp(student.xp);
        const progressPct = xpProgressInLevel(student.xp);
        const toNext = xpToNextLevel(student.xp);
        const activeBooster = student.userBoosters[0] ?? null;

        return (
          <section key={student.id} className="flex flex-col gap-6">
            {links.length > 1 && (
              <div className="flex items-baseline gap-3">
                <h2 className="text-xl font-bold">{student.name}</h2>
                {student.schoolClass && (
                  <span className="text-sm text-muted-fg">Klasse {student.schoolClass.name}</span>
                )}
              </div>
            )}

            {/* Rank & Level Card */}
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{rank.icon}</span>
                    <div>
                      <p className="font-bold text-fg" style={{ color: rank.color }}>
                        {rank.nameDE}
                      </p>
                      <p className="text-xs text-muted-fg">Level {level} · {formatXp(student.xp)} XP gesamt</p>
                    </div>
                  </div>
                </div>
                {activeBooster && (
                  <Badge variant="warning">
                    <Zap className="size-2.5" strokeWidth={2.5} />
                    ×{activeBooster.multiplier} Booster aktiv
                  </Badge>
                )}
              </CardHeader>
              <CardBody>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs text-muted-fg">
                    <span>Level {level}</span>
                    <span>{progressPct}% · noch {formatXp(toNext)} XP</span>
                    <span>Level {Math.min(level + 1, 500)}</span>
                  </div>
                  <Progress value={progressPct} max={100} tone="brand" />
                </div>
              </CardBody>
            </Card>

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-px border border-border bg-border sm:grid-cols-4">
              <div className="bg-bg p-5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">Gesamte XP</p>
                <p className="mt-2 font-mono text-2xl font-bold">{formatXp(student.xp)}</p>
              </div>
              <div className="bg-bg p-5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">Streak</p>
                <div className="mt-2 flex items-center gap-1.5">
                  <Flame className="size-5 text-warning" strokeWidth={1.75} />
                  <p className="font-mono text-2xl font-bold">{student.streak}</p>
                </div>
                <p className="mt-0.5 text-xs text-muted-fg">Tage in Folge</p>
              </div>
              <div className="bg-bg p-5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">Coins</p>
                <div className="mt-2 flex items-center gap-1.5">
                  <Coins className="size-5 text-warning" strokeWidth={1.75} />
                  <p className="font-mono text-2xl font-bold">{student.coins.toLocaleString("de-DE")}</p>
                </div>
              </div>
              <div className="bg-bg p-5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">Logins</p>
                <p className="mt-2 font-mono text-2xl font-bold">{student.totalDailyLogins}</p>
                <p className="mt-0.5 text-xs text-muted-fg">Tage gesamt</p>
              </div>
            </div>

            {/* Recent quests */}
            {student.userQuests.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Trophy className="size-4 text-muted-fg" strokeWidth={1.75} />
                    <CardTitle>Zuletzt abgeschlossene Quests</CardTitle>
                  </div>
                </CardHeader>
                <CardBody className="!px-0 !pb-0">
                  <ul className="divide-y divide-border border-t border-border">
                    {student.userQuests.map((uq) => (
                      <li key={uq.id} className="flex items-center gap-4 px-5 py-3 text-sm">
                        <span className="shrink-0 text-lg">{uq.quest.icon}</span>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium">{uq.quest.title}</p>
                          <p className="text-xs text-muted-fg">
                            {uq.completedAt?.toLocaleDateString("de-DE", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </p>
                        </div>
                        <Badge variant={RARITY_VARIANT[uq.quest.rarity] ?? "neutral"}>
                          {RARITY_LABEL[uq.quest.rarity] ?? uq.quest.rarity}
                        </Badge>
                        <span className="shrink-0 font-mono text-xs font-semibold text-success">
                          +{uq.quest.xpReward} XP
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardBody>
              </Card>
            )}

            {/* XP log */}
            {student.xpLogs.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Zap className="size-4 text-muted-fg" strokeWidth={1.75} />
                    <CardTitle>Letzte XP-Einträge</CardTitle>
                  </div>
                </CardHeader>
                <CardBody className="!px-0 !pb-0">
                  <ul className="divide-y divide-border border-t border-border">
                    {student.xpLogs.map((log) => (
                      <li key={log.id} className="flex items-center gap-4 px-5 py-3 text-sm">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium">{xpReasonLabel(log.reason)}</p>
                          <p className="text-xs text-muted-fg">
                            {log.createdAt.toLocaleDateString("de-DE", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </p>
                        </div>
                        <span className="shrink-0 font-mono text-sm font-semibold text-success">
                          +{log.amount} XP
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardBody>
              </Card>
            )}
          </section>
        );
      })}
    </div>
  );
}
