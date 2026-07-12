/* Copyright 2026 Elian Schock, Jonas Schwenk */
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Crown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/db/client";
import { ROLE_HOME, effectiveRole, getSession } from "@/lib/session";
import { BOSS_INDEX, BOSS_TIERS, type BossTier } from "@/lib/game";

export const metadata: Metadata = { title: "Boss-Index · MasterMind" };

const TIER_ORDER: BossTier[] = ["common", "uncommon", "rare", "epic", "legendary", "mythic", "secret"];

const TIER_LABELS: Record<BossTier, string> = {
  common:    "Common",
  uncommon:  "Uncommon",
  rare:      "Rare",
  epic:      "Epic",
  legendary: "Legendary",
  mythic:    "Mythic",
  secret:    "Secret",
};

const TIER_COUNT: Record<BossTier, number> = {
  common: 20, uncommon: 15, rare: 12, epic: 10, legendary: 7, mythic: 6, secret: 5,
};

export default async function BossIndexPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "student") redirect(ROLE_HOME[effectiveRole(session)]);

  // Fetch all battles where this user was MVP (killed as MVP)
  const mvpBattles = await prisma.bossParticipant.findMany({
    where: { userId: session.userId, isMvp: true },
    select: { battle: { select: { name: true, currentHp: true } } },
  });

  // Names of bosses where user was MVP AND the boss was actually killed (hp=0)
  const mvpKilledNames = new Set(
    mvpBattles
      .filter((p) => p.battle.currentHp === 0)
      .map((p) => p.battle.name),
  );

  const totalBosses = BOSS_INDEX.length;
  const totalMvpKills = BOSS_INDEX.filter((b) => mvpKilledNames.has(b.name)).length;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-10">
      {/* Header */}
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Gamification</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Boss-Index</h1>
        <p className="mt-1 text-sm text-muted-fg">
          {totalMvpKills} von {totalBosses} als MVP besiegt · Für jeden MVP-Kill erhältst du einen einzigartigen Titel
        </p>
      </header>

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-fg">
          <span>MVP-Kill Fortschritt</span>
          <span className="font-bold">{totalMvpKills} / {totalBosses}</span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-surface-2 border border-border">
          <div
            className="h-full rounded-full bg-linear-to-r from-yellow-500 to-orange-500 transition-all duration-700"
            style={{ width: `${Math.round((totalMvpKills / totalBosses) * 100)}%` }}
          />
        </div>
      </div>

      {/* Tier sections */}
      {TIER_ORDER.map((tier) => {
        const tierData = BOSS_TIERS[tier];
        const bosses = BOSS_INDEX.filter((b) => b.tier === tier);
        const killedInTier = bosses.filter((b) => mvpKilledNames.has(b.name)).length;

        return (
          <section key={tier}>
            {/* Tier header */}
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-px w-6 shrink-0" style={{ backgroundColor: tierData.color }} />
                <h2 className="text-lg font-black uppercase tracking-wider" style={{ color: tierData.color }}>
                  {TIER_LABELS[tier]}
                </h2>
                <span className="text-xs text-muted-fg">
                  {killedInTier} / {TIER_COUNT[tier]} MVP-Kills
                </span>
              </div>
              <div
                className="rounded-full border px-2.5 py-0.5 text-[10px] font-bold"
                style={{ borderColor: `${tierData.color}50`, color: tierData.color, backgroundColor: `${tierData.color}10` }}
              >
                {tierData.hp} HP · {tierData.xpReward} XP · {tierData.coinReward} Münzen
              </div>
            </div>

            {/* Boss grid */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {bosses.map((boss) => {
                const isMvpKilled = mvpKilledNames.has(boss.name);
                return (
                  <div
                    key={boss.slug}
                    className="relative flex flex-col gap-2 rounded-2xl border p-4 transition-all"
                    style={{
                      borderColor: isMvpKilled ? tierData.color : undefined,
                      backgroundColor: isMvpKilled ? `${tierData.color}08` : undefined,
                    }}
                  >
                    {/* MVP crown badge */}
                    {isMvpKilled && (
                      <div
                        className="absolute -top-2 -right-2 flex size-7 items-center justify-center rounded-full border-2 border-bg text-sm"
                        style={{ backgroundColor: tierData.color }}
                      >
                        <Crown className="size-3.5 text-white" />
                      </div>
                    )}

                    <div className="flex items-start gap-3">
                      <span
                        className="text-2xl leading-none shrink-0"
                        style={{ filter: isMvpKilled ? `drop-shadow(0 0 8px ${tierData.color})` : "grayscale(0.6) opacity(0.5)" }}
                      >
                        {boss.icon}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p
                          className="text-sm font-bold leading-tight truncate"
                          style={{ color: isMvpKilled ? tierData.color : undefined }}
                        >
                          {boss.name}
                        </p>
                        <p className="mt-0.5 text-[10px] text-muted-fg">{boss.subject}</p>
                      </div>
                    </div>

                    {isMvpKilled ? (
                      <div className="space-y-1">
                        <p className="text-[10px] text-muted-fg leading-snug line-clamp-2">{boss.description}</p>
                        <div className="flex items-center gap-1">
                          <Badge variant="success" className="text-[9px]">MVP-Kill</Badge>
                          <span className="text-[10px] text-muted-fg">Titel freigeschaltet</span>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <p className="text-[10px] text-muted-fg/60 leading-snug line-clamp-2 italic">
                          Besiege diesen Boss als MVP um ihn freizuschalten
                        </p>
                        <p className="text-[10px] text-muted-fg/40">
                          Titel: [{boss.name}-Bezwinger]
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      {/* Link to boss battles */}
      <div className="rounded-2xl border border-border bg-bg p-5 text-center">
        <p className="text-sm font-semibold">Bereit zu kämpfen?</p>
        <p className="mt-1 text-xs text-muted-fg">Besiege Bosse als MVP um Titel zu sammeln</p>
        <Link
          href="/app/boss"
          className="mt-3 inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2 text-sm font-bold text-white hover:bg-brand/90"
        >
          Zu den aktiven Boss-Battles →
        </Link>
      </div>
    </div>
  );
}
