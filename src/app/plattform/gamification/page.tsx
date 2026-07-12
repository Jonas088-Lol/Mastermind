/* Copyright 2026 Elian Schock, Jonas Schwenk */
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Swords } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { BOSS_INDEX, BOSS_TIERS, BOSS_GRADES, type BossTier } from "@/lib/game";
import { spawnGlobalBoss, endGlobalBoss } from "./actions";
import { SuperCommandField } from "./CommandField";

export const metadata: Metadata = { title: "Gamification · Plattform" };

export default async function PlattformGamificationPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "super") redirect("/plattform");

  const [activeBattles, recentBattles, totalStudents] = await Promise.all([
    prisma.bossBattle.findMany({
      where: { isActive: true },
      include: { participants: { select: { id: true } } },
      orderBy: { startAt: "desc" },
    }),
    prisma.bossBattle.findMany({
      where: { isActive: false },
      orderBy: { endAt: "desc" },
      take: 8,
    }),
    prisma.user.count({ where: { role: "student" } }),
  ]);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Plattform-Admin</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Gamification</h1>
        <p className="mt-1 text-sm text-muted-fg">
          Globale Boss-Battles · Events · Befehle — wirkt für alle{" "}
          <span className="font-semibold text-fg">{totalStudents.toLocaleString("de-DE")}</span> Schüler
        </p>
      </header>

      {/* Command Terminal */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Plattform Command Terminal</CardTitle>
            <p className="mt-1 text-sm text-muted-fg">
              Doppel-XP, Events, Boss-Rush, Bans — alles global
            </p>
          </div>
        </CardHeader>
        <CardBody>
          <SuperCommandField />
        </CardBody>
      </Card>

      {/* Active Boss Battles */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Aktive Boss-Battles</CardTitle>
            <p className="mt-1 text-sm text-muted-fg">
              {activeBattles.length === 0 ? "Kein aktiver Boss" : `${activeBattles.length} laufend — global für alle Schüler`}
            </p>
          </div>
          {activeBattles.length > 0 && <Badge variant="success">{activeBattles.length} aktiv</Badge>}
        </CardHeader>
        <CardBody className="px-0! pb-0!">
          {activeBattles.length === 0 ? (
            <div className="border-t border-border px-5 py-8 text-sm text-muted-fg">
              Kein Boss aktiv. Starte einen unten oder nutze <code className="rounded bg-surface px-1">/bossrush</code>.
            </div>
          ) : (
            <ul className="divide-y divide-border border-t border-border">
              {activeBattles.map((battle) => {
                const hpPct   = Math.round((battle.currentHp / battle.maxHp) * 100);
                const tier    = (battle.tier as BossTier) in BOSS_TIERS ? battle.tier as BossTier : "common";
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
                        {battle.schoolId === null && (
                          <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-semibold text-brand">
                            Global
                          </span>
                        )}
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
                    <form action={endGlobalBoss.bind(null, battle.id)}>
                      <Button type="submit" size="sm" variant="ghost">Beenden</Button>
                    </form>
                  </li>
                );
              })}
            </ul>
          )}
        </CardBody>
      </Card>

      {/* Spawn Boss */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Globalen Boss starten</CardTitle>
            <p className="mt-1 text-sm text-muted-fg">
              Kämpfen alle Schüler der Plattform gemeinsam
            </p>
          </div>
          <Swords className="size-5 text-danger" strokeWidth={1.75} />
        </CardHeader>
        <CardBody>
          <form action={spawnGlobalBoss} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-fg">
                  Boss wählen
                </label>
                <select
                  name="bossSlug"
                  className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm"
                  required
                >
                  {(["common","uncommon","rare","epic","legendary","mythic","secret"] as BossTier[]).map((tier) => (
                    <optgroup key={tier} label={`── ${BOSS_TIERS[tier].label} ──`}>
                      {BOSS_INDEX.filter((b) => b.tier === tier).map((b) => (
                        <option key={b.slug} value={b.slug}>
                          {b.icon} {b.name} · {b.subject}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-fg">
                  Klassenstufe
                </label>
                <select name="gradeLevel" className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm">
                  {BOSS_GRADES.map((g) => (
                    <option key={g} value={g}>Klasse {g}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-fg">
                  Dauer (Stunden)
                </label>
                <input
                  type="number" name="durationHours" min="1" max="168" defaultValue="24"
                  className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm"
                />
              </div>
            </div>

            {/* Tier overview */}
            <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-7">
              {(Object.entries(BOSS_TIERS) as [BossTier, typeof BOSS_TIERS[BossTier]][]).map(([key, t]) => (
                <div
                  key={key}
                  className="rounded-xl border p-2 text-center"
                  style={{ borderColor: `${t.color}40`, backgroundColor: `${t.color}08` }}
                >
                  <p className="text-[10px] font-black leading-tight" style={{ color: t.color }}>{t.label}</p>
                  <p className="mt-0.5 text-[10px] text-muted-fg">{t.hp} HP</p>
                </div>
              ))}
            </div>

            <Button type="submit" variant="secondary">
              <Swords className="size-4 text-danger" />
              Boss global starten
            </Button>
          </form>
        </CardBody>
      </Card>

      {/* Recent battles */}
      {recentBattles.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Vergangene Battles</CardTitle></CardHeader>
          <CardBody className="px-0! pb-0!">
            <ul className="divide-y divide-border border-t border-border">
              {recentBattles.map((battle) => {
                const tier     = (battle.tier as BossTier) in BOSS_TIERS ? battle.tier as BossTier : "common";
                const tierData = BOSS_TIERS[tier];
                return (
                  <li key={battle.id} className="flex items-center gap-4 px-5 py-3">
                    <span className="text-xl">{battle.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold">{battle.name}</p>
                        <span className="text-[10px] font-bold" style={{ color: tierData.color }}>
                          {tierData.label}
                        </span>
                      </div>
                      <p className="text-xs text-muted-fg">
                        {battle.endAt?.toLocaleDateString("de-DE", { day: "numeric", month: "short", year: "numeric" })}
                        {" · "}{battle.schoolId === null ? "Global" : "Schule"}
                      </p>
                    </div>
                    {battle.currentHp === 0 && <Badge variant="success">Besiegt</Badge>}
                    {battle.currentHp > 0 && <Badge variant="warning">Abgebrochen</Badge>}
                  </li>
                );
              })}
            </ul>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
