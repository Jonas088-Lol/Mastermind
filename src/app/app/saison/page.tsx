import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Gift, ShoppingBag, Trophy } from "lucide-react";
import { CoinIcon } from "@/components/ui/CoinIcon";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { prisma } from "@/lib/db/client";
import { ROLE_HOME, effectiveRole, getSession } from "@/lib/session";
import { generateSeasonTiers } from "@/lib/game";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Saison · MasterMind" };

const REWARD_TYPE_LABEL: Record<string, string> = {
  xp:      "XP",
  title:   "Titel",
  cosmetic:"Kosmetik",
  powerup: "Power-Up",
};

const REWARD_TYPE_VARIANT: Record<string, "outline" | "brand" | "warning" | "info"> = {
  xp:      "outline",
  title:   "warning",
  cosmetic:"brand",
  powerup: "info",
};

export default async function SaisonPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "student") redirect(ROLE_HOME[effectiveRole(session)]);

  const activeSeason = await prisma.season.findFirst({
    where: {
      isActive: true,
      OR: [{ schoolId: null }, { schoolId: session.schoolId ?? "" }],
    },
  });

  if (!activeSeason) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-8">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Gamification</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Saison</h1>
        </header>
        <Card>
          <CardBody className="py-16 text-center">
            <Gift className="mx-auto size-12 text-muted-fg opacity-30" strokeWidth={1.5} />
            <p className="mt-4 text-lg font-bold">Keine aktive Saison</p>
            <p className="mt-1 text-sm text-muted-fg">Dein Admin startet die nächste Saison im Admin-Bereich</p>
          </CardBody>
        </Card>
      </div>
    );
  }

  const seasonPass = await prisma.userSeasonPass.findUnique({
    where: { userId_seasonId: { userId: session.userId, seasonId: activeSeason.id } },
  });

  const hasPremium = !!seasonPass;
  const currentXp  = seasonPass?.xpEarned ?? 0;
  const currentTier = seasonPass?.tier ?? 0;

  const tiers = generateSeasonTiers(activeSeason.number);
  const freeTiers    = tiers.filter((t) => !t.isPremium);
  const premiumTiers = tiers.filter((t) =>  t.isPremium);

  // Progress to next tier
  const xpForCurrentTier = tiers.slice(0, currentTier).reduce((sum, t) => sum + t.xpRequired, 0);
  const nextTierDef       = tiers[currentTier];
  const xpInCurrentTier   = currentXp - xpForCurrentTier;
  const xpNeededForNext   = nextTierDef?.xpRequired ?? 0;
  const progressToNextTier = nextTierDef
    ? Math.min(100, Math.round((xpInCurrentTier / xpNeededForNext) * 100))
    : 100;

  const daysLeft = Math.max(0, Math.floor((activeSeason.endAt.getTime() - Date.now()) / 86_400_000));

  // ── Leaderboard rank ──
  // Rank = how many passes in this season have more XP than the current user + 1
  const betterCount = await prisma.userSeasonPass.count({
    where: { seasonId: activeSeason.id, xpEarned: { gt: currentXp } },
  });
  const totalParticipants = await prisma.userSeasonPass.count({
    where: { seasonId: activeSeason.id },
  });
  const leaderboardRank = hasPremium ? betterCount + 1 : null;

  // ── Key XP-gated milestones (tiers that give titles or powerups) ──
  const milestones = tiers.filter(
    (t) => t.rewardType === "title" || t.rewardType === "powerup",
  );
  // Cumulative XP required to reach a given tier
  function xpToReachTier(tierIndex: number): number {
    return tiers.slice(0, tierIndex).reduce((sum, t) => sum + t.xpRequired, 0);
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      {/* ── Page header ── */}
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Gamification</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
            {activeSeason.name}
          </h1>
          <p className="mt-1 text-sm text-muted-fg">
            Saison {activeSeason.number}
            {activeSeason.theme ? ` · ${activeSeason.theme}` : ""}
            {" · "}{daysLeft} Tage verbleibend
          </p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-black">Tier {currentTier}</p>
          <p className="text-xs text-muted-fg">{currentXp} Saison-XP</p>
          {leaderboardRank !== null && (
            <p className="mt-0.5 text-xs text-muted-fg">
              Rang <span className="font-bold text-fg">#{leaderboardRank}</span>
              {" "}von {totalParticipants}
            </p>
          )}
        </div>
      </header>

      {/* ── CTA: buy season pass if not yet enrolled ── */}
      {!hasPremium && (
        <Card className="border-warning/40 bg-warning/4">
          <CardBody className="flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <span className="text-3xl leading-none">🎟️</span>
              <div>
                <p className="font-bold">Saison-Pass kaufen</p>
                <p className="mt-0.5 text-sm text-muted-fg">
                  Schalte die Premium-Belohnungsspur frei und sammle exklusive Titel & Power-Ups.
                </p>
                <p className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-warning">500 <CoinIcon className="size-3.5" /> Münzen</p>
              </div>
            </div>
            <Link
              href="/app/shop"
              className={cn(buttonVariants({ variant: "primary", size: "sm" }), "shrink-0 gap-2")}
            >
              <ShoppingBag className="size-4" />
              Im Shop kaufen
            </Link>
          </CardBody>
        </Card>
      )}

      {/* ── Progress to next tier ── */}
      {nextTierDef && (
        <div className="border border-border bg-bg p-5">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold">Fortschritt zu Tier {currentTier + 1}</span>
            <span className="font-mono text-muted-fg">
              {xpInCurrentTier} / {xpNeededForNext} XP
            </span>
          </div>
          <Progress value={progressToNextTier} tone="brand" className="mt-3 h-3" />
          <p className="mt-2 text-xs text-muted-fg">
            Nächste Belohnung:{" "}
            <span className="font-semibold text-fg">{nextTierDef.reward}</span>
          </p>
        </div>
      )}

      {/* ── Two-column free / premium track ── */}
      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-fg">
          Belohnungsspuren
        </h2>
        <div className="grid grid-cols-2 gap-px border border-border bg-border">
          {/* Free track */}
          <div className="bg-bg">
            <div className="flex items-center gap-2 border-b border-border bg-surface px-4 py-3">
              <span className="text-base">🎁</span>
              <p className="text-xs font-semibold uppercase tracking-wider">Kostenlos</p>
            </div>
            <ul className="divide-y divide-border">
              {freeTiers.map((tier) => {
                const isUnlocked = tier.tier <= currentTier;
                return (
                  <li
                    key={tier.tier}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3",
                      !isUnlocked && "opacity-50",
                    )}
                  >
                    <span className="text-lg leading-none">{tier.icon}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold">Tier {tier.tier}</p>
                      <p className="truncate text-[11px] text-muted-fg">{tier.reward}</p>
                    </div>
                    {isUnlocked && (
                      <span className="shrink-0 text-success text-xs font-bold">✓</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Premium track */}
          <div className="bg-bg">
            <div className="flex items-center gap-2 border-b border-border bg-warning/6 px-4 py-3">
              <span className="text-base">⭐</span>
              <p className="text-xs font-semibold uppercase tracking-wider text-warning">Premium</p>
              {!hasPremium && (
                <Badge variant="warning" className="ml-auto">Gesperrt</Badge>
              )}
            </div>
            <ul className="divide-y divide-border">
              {premiumTiers.map((tier) => {
                const isUnlocked = hasPremium && tier.tier <= currentTier;
                return (
                  <li
                    key={tier.tier}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3",
                      !hasPremium && "opacity-40",
                      hasPremium && !isUnlocked && "opacity-50",
                    )}
                  >
                    <span className="text-lg leading-none">{tier.icon}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold">Tier {tier.tier}</p>
                      <p className="truncate text-[11px] text-muted-fg">{tier.reward}</p>
                    </div>
                    {isUnlocked && (
                      <span className="shrink-0 text-success text-xs font-bold">✓</span>
                    )}
                    {!hasPremium && (
                      <span className="shrink-0 text-[10px] text-warning">🔒</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </section>

      {/* ── XP-gated milestones ── */}
      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-fg">
          Meilensteine
        </h2>
        <div className="space-y-2">
          {milestones.map((tier) => {
            const isUnlocked = tier.tier <= currentTier;
            const requiredXp = xpToReachTier(tier.tier - 1) + tier.xpRequired;
            return (
              <div
                key={tier.tier}
                className={cn(
                  "flex items-center gap-4 border px-4 py-3",
                  isUnlocked
                    ? "border-success/30 bg-success/4"
                    : "border-border opacity-60",
                )}
              >
                <span className="text-2xl">{tier.icon}</span>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-bold">Tier {tier.tier}</p>
                    <Badge
                      variant={REWARD_TYPE_VARIANT[tier.rewardType] ?? "outline"}
                      className="text-[10px]"
                    >
                      {REWARD_TYPE_LABEL[tier.rewardType] ?? tier.rewardType}
                    </Badge>
                    {tier.isPremium && (
                      <Badge variant="warning" className="text-[10px]">Premium</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-fg">{tier.reward}</p>
                </div>
                <div className="shrink-0 text-right">
                  {isUnlocked ? (
                    <span className="text-success font-bold">✓</span>
                  ) : (
                    <p className="font-mono text-xs text-muted-fg">{requiredXp} XP</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Full tier grid ── */}
      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-fg">Alle 50 Tiers</h2>
        <div className="grid grid-cols-5 gap-px border border-border bg-border sm:grid-cols-10">
          {tiers.map((tier) => {
            const isUnlocked = tier.tier <= currentTier;
            const isCurrent  = tier.tier === currentTier + 1;

            return (
              <div
                key={tier.tier}
                title={tier.reward}
                className={cn(
                  "flex flex-col items-center gap-1 bg-bg p-2 text-center",
                  isUnlocked && "bg-success/4",
                  isCurrent  && "bg-brand/6 ring-1 ring-inset ring-brand/30",
                  !isUnlocked && !isCurrent && "opacity-40",
                )}
              >
                <span className="text-base leading-none">{tier.icon}</span>
                <span className="font-mono text-[9px] font-bold text-muted-fg">{tier.tier}</span>
                {tier.isPremium && <Trophy className="size-2.5 text-warning" />}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
