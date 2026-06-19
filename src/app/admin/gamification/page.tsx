import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Swords, Gift, Trophy, Medal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { prisma } from "@/lib/db/client";
import { ROLE_HOME, effectiveRole, getSession } from "@/lib/session";
import { BOSS_TEMPLATES, BOSS_TIERS, BOSS_GRADES, type BossTier } from "@/lib/game";
import { spawnBossBattle, createSeason, endBossBattle, awardWeeklyClassRankings } from "./actions";
import { CommandField } from "./CommandField";

export const metadata: Metadata = { title: "Gamification · Admin" };

export default async function AdminGamificationPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "admin") redirect(ROLE_HOME[effectiveRole(session)]);

  const [activeBattles, activeSeason, recentBattles] = await Promise.all([
    prisma.bossBattle.findMany({
      where: { isActive: true, OR: [{ schoolId: null }, { schoolId: session.schoolId ?? "" }] },
      include: { participants: { select: { id: true } } },
      orderBy: { startAt: "desc" },
    }),
    prisma.season.findFirst({
      where: { isActive: true, OR: [{ schoolId: null }, { schoolId: session.schoolId ?? "" }] },
    }),
    prisma.bossBattle.findMany({
      where: { isActive: false, OR: [{ schoolId: null }, { schoolId: session.schoolId ?? "" }] },
      orderBy: { endAt: "desc" },
      take: 5,
    }),
  ]);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Schul-Admin</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Gamification</h1>
        <p className="mt-1 text-sm text-muted-fg">Boss-Battles starten · Saisons verwalten · Events schalten</p>
      </header>

      {/* Command Terminal */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Admin Command Terminal</CardTitle>
            <p className="mt-1 text-sm text-muted-fg">Doppel-XP, Events, Boss-Rush, Coin-Vergabe und mehr</p>
          </div>
        </CardHeader>
        <CardBody>
          <CommandField />
        </CardBody>
      </Card>

      {/* Active Boss Battles */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Aktive Boss-Battles</CardTitle>
            <p className="mt-1 text-sm text-muted-fg">{activeBattles.length} laufend</p>
          </div>
          {activeBattles.length > 0 && <Badge variant="success">{activeBattles.length} aktiv</Badge>}
        </CardHeader>
        <CardBody className="px-0! pb-0!">
          {activeBattles.length === 0 ? (
            <div className="border-t border-border px-5 py-6 text-sm text-muted-fg">
              Kein aktiver Boss. Starte einen unten.
            </div>
          ) : (
            <ul className="divide-y divide-border border-t border-border">
              {activeBattles.map((battle) => {
                const hpPct = Math.round((battle.currentHp / battle.maxHp) * 100);
                const tier = (battle.tier as BossTier) in BOSS_TIERS ? battle.tier as BossTier : "common";
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
                      </div>
                      <div className="mt-1.5">
                        <Progress value={hpPct} tone={hpPct > 50 ? "success" : hpPct > 25 ? "warning" : "danger"} className="h-1.5" />
                      </div>
                      <p className="mt-1 text-[10px] text-muted-fg">
                        {battle.currentHp.toLocaleString("de-DE")} / {battle.maxHp.toLocaleString("de-DE")} HP
                        · {battle.participants.length} Teilnehmer
                        · Endet {battle.endAt.toLocaleString("de-DE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <form action={endBossBattle.bind(null, battle.id)}>
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
            <CardTitle>Boss-Battle starten</CardTitle>
            <p className="mt-1 text-sm text-muted-fg">Tier und Vorlage wählen</p>
          </div>
          <Swords className="size-5 text-danger" strokeWidth={1.75} />
        </CardHeader>
        <CardBody>
          <form action={spawnBossBattle} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-fg">Boss-Vorlage</label>
                <select name="template" className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm" required>
                  {BOSS_TEMPLATES.map((t) => (
                    <option key={t.name} value={t.name}>
                      {t.icon} {t.name} ({t.subject})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-fg">Tier (Schwierigkeit)</label>
                <select name="tier" className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm">
                  {(Object.entries(BOSS_TIERS) as [BossTier, typeof BOSS_TIERS[BossTier]][]).map(([key, t]) => (
                    <option key={key} value={key}>
                      {t.label} — {t.hp} HP · {t.coinReward} Münzen · {t.xpReward} XP
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-fg">Klassenstufe</label>
                <select name="gradeLevel" className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm">
                  {BOSS_GRADES.map((g) => (
                    <option key={g} value={g}>Klasse {g}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-fg">Dauer (Stunden)</label>
                <input
                  type="number" name="durationHours" min="1" max="168" defaultValue="24"
                  className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm"
                />
              </div>
            </div>

            {/* Tier preview */}
            <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-7">
              {(Object.entries(BOSS_TIERS) as [BossTier, typeof BOSS_TIERS[BossTier]][]).map(([key, t]) => (
                <div key={key} className="rounded-xl border p-2 text-center" style={{ borderColor: `${t.color}40`, backgroundColor: `${t.color}08` }}>
                  <p className="text-[10px] font-black leading-tight" style={{ color: t.color }}>{t.label}</p>
                  <p className="mt-0.5 text-[10px] text-muted-fg">{t.hp} HP</p>
                </div>
              ))}
            </div>

            <Button type="submit" variant="secondary">
              <Swords className="size-4 text-danger" />
              Boss starten
            </Button>
          </form>
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
                <input type="number" name="durationDays" min="7" max="365" defaultValue="30"
                  className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm" />
              </div>
            </div>
            <Button type="submit" variant="secondary">
              <Trophy className="size-4 text-warning" />
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

      {/* Past battles */}
      {recentBattles.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Vergangene Battles</CardTitle></CardHeader>
          <CardBody className="px-0! pb-0!">
            <ul className="divide-y divide-border border-t border-border">
              {recentBattles.map((battle) => {
                const tier = (battle.tier as BossTier) in BOSS_TIERS ? battle.tier as BossTier : "common";
                const tierData = BOSS_TIERS[tier];
                return (
                  <li key={battle.id} className="flex items-center gap-4 px-5 py-3">
                    <span className="text-xl">{battle.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold">{battle.name}</p>
                        <span className="text-[10px] font-bold" style={{ color: tierData.color }}>{tierData.label}</span>
                      </div>
                      <p className="text-xs text-muted-fg">
                        {battle.endAt.toLocaleDateString("de-DE", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </div>
                    {battle.currentHp === 0 && <Badge variant="success">Besiegt</Badge>}
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
