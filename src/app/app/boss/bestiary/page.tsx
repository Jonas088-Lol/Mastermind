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
        battleId: true, damage: true, correctAnswers: true, wrongAnswers: true,
        coinsEarned: true, isMvp: true, firstBlood: true, lastHit: true,
      },
    }),
  ]);

  // Global per-boss stats (defeated battles of this school scope)
  const defeatedBattleIds = allBattles.filter((b) => b.currentHp === 0).map((b) => b.id);
  const defeatedParticipants = defeatedBattleIds.length > 0
    ? await prisma.bossParticipant.findMany({
        where: { battleId: { in: defeatedBattleIds } },
        select: {
          battleId: true, userId: true, damage: true, joinedAt: true,
          user: { select: { name: true } },
        },
      })
    : [];

  const myStatMap = new Map(myStats.map((s) => [s.battleId, s]));

  const totalMyBattles  = myStats.length;
  const totalMyDmg      = myStats.reduce((s, p) => s + p.damage, 0);
  const totalMyCoins    = myStats.reduce((s, p) => s + p.coinsEarned, 0);
  const totalMyCorrect  = myStats.reduce((s, p) => s + p.correctAnswers, 0);
  const totalMyWrong    = myStats.reduce((s, p) => s + p.wrongAnswers, 0);
  const totalMyAnswers  = totalMyCorrect + totalMyWrong;
  const myQuote         = totalMyAnswers > 0 ? Math.round((totalMyCorrect / totalMyAnswers) * 100) : null;
  const totalMvps       = myStats.filter((p) => p.isMvp).length;
  const totalFirstBld   = myStats.filter((p) => p.firstBlood).length;
  const totalLastHit    = myStats.filter((p) => p.lastHit).length;

  const defeated  = allBattles.filter((b) => b.currentHp === 0);
  const active    = allBattles.filter((b) => b.isActive && b.currentHp > 0);

  // ── Aggregation: pro Boss-Name über alle besiegten Kämpfe ──
  const participantsByBattle = new Map<string, typeof defeatedParticipants>();
  for (const p of defeatedParticipants) {
    const arr = participantsByBattle.get(p.battleId);
    if (arr) arr.push(p); else participantsByBattle.set(p.battleId, [p]);
  }

  interface BossAgg {
    name: string;
    icon: string;
    tier: BossTier;
    kills: number;
    fastestKillMs: number | null; // Näherung: letzter Beitritt − Kampfstart
    damageByUser: Map<string, { name: string; damage: number }>;
  }

  const bossAggs = new Map<string, BossAgg>();
  for (const battle of defeated) {
    const tier = (battle.tier as BossTier) in BOSS_TIERS ? battle.tier as BossTier : "common";
    let agg = bossAggs.get(battle.name);
    if (!agg) {
      agg = { name: battle.name, icon: battle.icon, tier, kills: 0, fastestKillMs: null, damageByUser: new Map() };
      bossAggs.set(battle.name, agg);
    }
    agg.kills += 1;

    const parts = participantsByBattle.get(battle.id) ?? [];
    let lastAction = 0;
    for (const p of parts) {
      lastAction = Math.max(lastAction, p.joinedAt.getTime());
      const entry = agg.damageByUser.get(p.userId);
      if (entry) entry.damage += p.damage;
      else agg.damageByUser.set(p.userId, { name: p.user.name, damage: p.damage });
    }
    if (lastAction > battle.startAt.getTime()) {
      const dur = lastAction - battle.startAt.getTime();
      if (agg.fastestKillMs === null || dur < agg.fastestKillMs) agg.fastestKillMs = dur;
    }
  }

  const bossStats = [...bossAggs.values()]
    .map((agg) => ({
      ...agg,
      topPlayers: [...agg.damageByUser.values()].sort((a, b) => b.damage - a.damage).slice(0, 3),
    }))
    .sort((a, b) => b.kills - a.kills);

  const formatDuration = (ms: number) => {
    const mins = Math.floor(ms / 60000);
    if (mins < 60) return `${mins} Min.`;
    const h = Math.floor(mins / 60);
    if (h < 48) return `${h} Std. ${mins % 60} Min.`;
    return `${Math.floor(h / 24)} Tage`;
  };

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Boss-Battles</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Bestiary</h1>
        <p className="mt-1 text-sm text-muted-fg">Alle Bosses und deine Statistiken</p>
      </header>

      {/* Meine Bilanz */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-fg">Meine Bilanz</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Kämpfe gesamt", value: totalMyBattles.toLocaleString("de-DE"), icon: "🛡️" },
            { label: "Treffer gesamt", value: totalMyDmg.toLocaleString("de-DE"), icon: "⚔️" },
            {
              label: "Antwort-Quote",
              value: myQuote === null ? "—" : `${myQuote}%`,
              icon: "🎯",
              sub: totalMyAnswers > 0 ? `${totalMyCorrect.toLocaleString("de-DE")} richtig · ${totalMyWrong.toLocaleString("de-DE")} falsch` : undefined,
            },
            { label: "Verdiente Münzen", value: totalMyCoins.toLocaleString("de-DE"), icon: "🪙" },
            { label: "MVP-Trophäen", value: totalMvps, icon: "👑" },
            { label: "First Blood", value: totalFirstBld, icon: "🩸" },
            { label: "Last Hit", value: totalLastHit, icon: "💀" },
            { label: "Ø Treffer / Kampf", value: totalMyBattles > 0 ? Math.round(totalMyDmg / totalMyBattles).toLocaleString("de-DE") : "—", icon: "📊" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-2xl border border-border bg-bg p-4 text-center">
              <p className="text-2xl">{stat.icon}</p>
              <p className="mt-1 text-xl font-black">{stat.value}</p>
              <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-fg">{stat.label}</p>
              {"sub" in stat && stat.sub && (
                <p className="mt-0.5 text-[10px] text-muted-fg">{stat.sub}</p>
              )}
            </div>
          ))}
        </div>
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

      {/* Schul-Statistik pro Boss */}
      {bossStats.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-fg">
            Besiegte Bosse — Schul-Statistik ({bossStats.length})
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {bossStats.map((boss) => {
              const tierData = BOSS_TIERS[boss.tier];
              return (
                <div key={boss.name} className="rounded-2xl border border-border bg-bg p-4">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl shrink-0">{boss.icon}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-bold truncate">{boss.name}</p>
                        <span
                          className="rounded-full border px-1.5 py-0.5 text-[10px] font-bold"
                          style={{ borderColor: `${tierData.color}60`, color: tierData.color }}
                        >
                          {tierData.label}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-muted-fg">
                        {boss.kills}× besiegt
                        {boss.fastestKillMs !== null && <> · Schnellster Kill ≈ {formatDuration(boss.fastestKillMs)}</>}
                      </p>
                    </div>
                  </div>
                  {boss.topPlayers.length > 0 && (
                    <div className="mt-3 space-y-1 border-t border-border pt-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-fg">Top-Schaden (alle Kämpfe)</p>
                      {boss.topPlayers.map((player, i) => (
                        <div key={`${boss.name}-${player.name}-${i}`} className="flex items-center justify-between gap-2 text-xs">
                          <span className="truncate">
                            <span className="mr-1.5">{["🥇", "🥈", "🥉"][i]}</span>
                            {player.name}
                          </span>
                          <span className="shrink-0 font-mono font-bold text-danger">{player.damage.toLocaleString("de-DE")} DMG</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
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
