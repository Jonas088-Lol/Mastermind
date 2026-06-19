import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Swords, Crown, Droplets, Skull } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody } from "@/components/ui/card";
import { prisma } from "@/lib/db/client";
import { ROLE_HOME, effectiveRole, getSession } from "@/lib/session";
import { BOSS_TIERS, type BossTier } from "@/lib/game";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Boss-Bestiary · MasterMind" };

export default async function BossbestiaryPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "student") redirect(ROLE_HOME[effectiveRole(session)]);

  const [allBattles, myStats] = await Promise.all([
    prisma.bossBattle.findMany({
      where: {
        OR: [{ schoolId: null }, { schoolId: session.schoolId ?? "" }],
      },
      include: {
        participants: {
          orderBy: { damage: "desc" },
          take: 1,
          include: { user: { select: { name: true } } },
        },
        _count: { select: { participants: true } },
      },
      orderBy: { startAt: "desc" },
      take: 50,
    }),
    prisma.bossParticipant.findMany({
      where: { userId: session.userId },
      select: {
        battleId: true, damage: true, correctAnswers: true,
        coinsEarned: true, isMvp: true, firstBlood: true, lastHit: true,
      },
    }),
  ]);

  const myStatMap = new Map(myStats.map((s) => [s.battleId, s]));

  const totalMyDmg    = myStats.reduce((s, p) => s + p.damage, 0);
  const totalMyCoins  = myStats.reduce((s, p) => s + p.coinsEarned, 0);
  const totalMvps     = myStats.filter((p) => p.isMvp).length;
  const totalFirstBld = myStats.filter((p) => p.firstBlood).length;
  const totalLastHit  = myStats.filter((p) => p.lastHit).length;

  const defeated  = allBattles.filter((b) => b.currentHp === 0);
  const active    = allBattles.filter((b) => b.isActive && b.currentHp > 0);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Boss-Battles</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Bestiary</h1>
        <p className="mt-1 text-sm text-muted-fg">Alle Bosses und deine Statistiken</p>
      </header>

      {/* My stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          { label: "Gesamt-Schaden", value: totalMyDmg.toLocaleString("de-DE"), icon: "⚔️" },
          { label: "Verdiente Münzen", value: totalMyCoins.toLocaleString("de-DE"), icon: "🪙" },
          { label: "MVP-Trophäen", value: totalMvps, icon: "👑" },
          { label: "First Blood", value: totalFirstBld, icon: "🩸" },
          { label: "Last Hit", value: totalLastHit, icon: "💀" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-border bg-bg p-4 text-center">
            <p className="text-2xl">{stat.icon}</p>
            <p className="mt-1 text-xl font-black">{stat.value}</p>
            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-fg">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Active boss shortcut */}
      {active.length > 0 && (
        <div className="rounded-2xl border-2 border-brand/30 bg-brand/5 p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{active[0].icon}</span>
            <div>
              <p className="font-bold">Aktiver Boss: {active[0].name}</p>
              <p className="text-xs text-muted-fg">{active[0].currentHp} HP verbleibend</p>
            </div>
          </div>
          <Link href="/app/boss" className="rounded-xl border border-brand/40 bg-brand/10 px-4 py-2 text-sm font-bold text-brand hover:bg-brand/20">
            Jetzt angreifen →
          </Link>
        </div>
      )}

      {/* All battles */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-fg">
          Alle Kämpfe ({allBattles.length})
        </h2>
        <div className="space-y-2">
          {allBattles.map((battle) => {
            const tier = (battle.tier as BossTier) in BOSS_TIERS ? battle.tier as BossTier : "common";
            const tierData = BOSS_TIERS[tier];
            const myPart = myStatMap.get(battle.id);
            const mvp = battle.participants[0];
            const isDefeated = battle.currentHp === 0;
            const hpPct = Math.round((battle.currentHp / battle.maxHp) * 100);

            return (
              <div key={battle.id} className="flex items-center gap-4 rounded-2xl border border-border bg-bg px-4 py-3">
                <span className="text-2xl shrink-0">{battle.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold truncate">{battle.name}</p>
                    <span className="rounded-full border px-1.5 py-0.5 text-[10px] font-bold"
                      style={{ borderColor: `${tierData.color}60`, color: tierData.color }}>
                      {tierData.label}
                    </span>
                    {battle.isActive && !isDefeated && <Badge variant="success">Aktiv</Badge>}
                    {isDefeated && <Badge variant="outline">Besiegt</Badge>}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-3 text-[10px] text-muted-fg">
                    <span>{battle.startAt.toLocaleDateString("de-DE", { day: "numeric", month: "short", year: "numeric" })}</span>
                    <span>{battle._count.participants} Teilnehmer</span>
                    {!isDefeated && !battle.isActive && <span className="text-orange-400">Abgelaufen — {hpPct}% HP</span>}
                    {mvp && <span>MVP: {mvp.user.name}</span>}
                  </div>
                </div>
                {myPart ? (
                  <div className="shrink-0 text-right space-y-0.5">
                    <p className="font-mono text-sm font-bold text-danger">{myPart.damage} DMG</p>
                    <div className="flex items-center justify-end gap-1.5">
                      {myPart.isMvp     && <Crown    className="size-3.5 text-yellow-400" />}
                      {myPart.firstBlood && <Droplets className="size-3.5 text-red-400" />}
                      {myPart.lastHit   && <Skull    className="size-3.5 text-fg/60" />}
                    </div>
                  </div>
                ) : (
                  <span className="shrink-0 text-xs text-muted-fg">Nicht teilgenommen</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
