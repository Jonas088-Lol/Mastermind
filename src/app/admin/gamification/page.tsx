/* Copyright 2026 Elian Schock, Jonas Schwenk */
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Gift, Medal, Swords } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { prisma } from "@/lib/db/client";
import { ROLE_HOME, effectiveRole, getSession } from "@/lib/session";
import { BOSS_TIERS, type BossTier } from "@/lib/game";
import { createSeason, awardWeeklyClassRankings } from "./actions";

export const metadata: Metadata = { title: "Gamification · Admin" };

export default async function AdminGamificationPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "admin") redirect(ROLE_HOME[effectiveRole(session)]);

  const [activeSeason, globalBattles] = await Promise.all([
    prisma.season.findFirst({
      where: { isActive: true, OR: [{ schoolId: null }, { schoolId: session.schoolId ?? "" }] },
    }),
    prisma.bossBattle.findMany({
      where: { isActive: true },
      include: { participants: { select: { id: true } } },
      orderBy: { startAt: "desc" },
    }),
  ]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Schul-Admin</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Gamification</h1>
        <p className="mt-1 text-sm text-muted-fg">Saisons verwalten · Wochensieger belohnen</p>
      </header>

      {/* Global Boss Status (read-only) */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Aktive Boss-Battles</CardTitle>
            <p className="mt-1 text-sm text-muted-fg">
              {globalBattles.length === 0
                ? "Kein aktiver Boss auf der Plattform"
                : `${globalBattles.length} aktiv — global für alle Schüler`}
            </p>
          </div>
          <Swords className="size-5 text-muted-fg" strokeWidth={1.75} />
        </CardHeader>
        <CardBody className="px-0! pb-0!">
          {globalBattles.length === 0 ? (
            <div className="border-t border-border px-5 py-6 text-sm text-muted-fg">
              Bosse werden von Plattform-Admins gestartet und laufen global für alle Schulen.
            </div>
          ) : (
            <ul className="divide-y divide-border border-t border-border">
              {globalBattles.map((battle) => {
                const hpPct    = Math.round((battle.currentHp / battle.maxHp) * 100);
                const tier     = (battle.tier as BossTier) in BOSS_TIERS ? battle.tier as BossTier : "common";
                const tierData = BOSS_TIERS[tier];
                return (
                  <li key={battle.id} className="flex items-center gap-4 px-5 py-4">
                    <span className="text-2xl">{battle.icon}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold">{battle.name}</p>
                        <span
                          className="rounded-full border px-1.5 py-0.5 text-[10px] font-bold"
                          style={{ borderColor: `${tierData.color}60`, color: tierData.color }}
                        >
                          {tierData.label}
                        </span>
                        <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-semibold text-brand">
                          Global
                        </span>
                      </div>
                      <div className="mt-1.5">
                        <Progress
                          value={hpPct}
                          tone={hpPct > 50 ? "success" : hpPct > 25 ? "warning" : "danger"}
                          className="h-1.5"
                        />
                      </div>
                      <p className="mt-1 text-[10px] text-muted-fg">
                        {battle.currentHp.toLocaleString("de-DE")} / {battle.maxHp.toLocaleString("de-DE")} HP
                        · {battle.participants.length} Teilnehmer
                        · Endet {battle.endAt.toLocaleString("de-DE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardBody>
      </Card>

      {/* Season management */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Aktuelle Saison</CardTitle>
            {activeSeason ? (
              <p className="mt-1 text-sm text-muted-fg">
                {activeSeason.name} · Endet {activeSeason.endAt.toLocaleDateString("de-DE", { day: "numeric", month: "short", year: "numeric" })}
              </p>
            ) : (
              <p className="mt-1 text-sm text-muted-fg">Keine aktive Saison</p>
            )}
          </div>
          <Gift className="size-5 text-brand" strokeWidth={1.75} />
        </CardHeader>
        <CardBody>
          {activeSeason && (
            <div className="mb-6 rounded-xl border border-success/30 bg-success/3 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold">{activeSeason.name}</p>
                  <p className="text-xs text-muted-fg">Saison {activeSeason.number} · {activeSeason.theme ?? "Kein Theme"}</p>
                </div>
                <Badge variant="success">Aktiv</Badge>
              </div>
            </div>
          )}

          <form action={createSeason} className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-fg">
              {activeSeason ? "Neue Saison starten (beendet die aktuelle)" : "Erste Saison starten"}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-muted-fg">Saisonname</label>
                <input name="name" type="text" placeholder="z.B. Saison 1: Frühjahr 2025"
                  className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm" required />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-muted-fg">Theme (optional)</label>
                <input name="theme" type="text" placeholder="z.B. Mathematik-Challenge"
                  className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-muted-fg">Dauer (Tage)</label>
                <input type="number" name="durationDays" min="7" max="365" defaultValue="90"
                  className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm" />
              </div>
            </div>
            <Button type="submit" variant="secondary">
              <Gift className="size-4 text-brand" />
              Saison starten
            </Button>
          </form>
        </CardBody>
      </Card>

      {/* Weekly ranking award */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Wochensieger-Belohnung</CardTitle>
            <p className="mt-1 text-sm text-muted-fg">Verleiht dem XP-Klassenersten der letzten Woche 40 Coins</p>
          </div>
          <Medal className="size-5 text-warning" strokeWidth={1.75} />
        </CardHeader>
        <CardBody>
          <form action={awardWeeklyClassRankings}>
            <Button type="submit" variant="secondary">
              <Medal className="size-4 text-warning" />
              Wochensieger belohnen
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
