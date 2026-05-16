import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Gift, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { prisma } from "@/lib/db/client";
import { ROLE_HOME, effectiveRole, getSession } from "@/lib/session";
import { generateSeasonTiers } from "@/lib/game";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Saison · MasterMind" };

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

  const currentXp = seasonPass?.xpEarned ?? 0;
  const currentTier = seasonPass?.tier ?? 0;

  const tiers = generateSeasonTiers(activeSeason.number);
  const totalXpRequired = tiers.reduce((sum, t) => sum + t.xpRequired, 0);

  // XP needed to reach current tier
  const xpForCurrentTier = tiers.slice(0, currentTier).reduce((sum, t) => sum + t.xpRequired, 0);
  const nextTierDef = tiers[currentTier]; // tier index = currentTier (0-indexed next)
  const xpInCurrentTier = currentXp - xpForCurrentTier;
  const xpNeededForNext = nextTierDef?.xpRequired ?? 0;
  const progressToNextTier = nextTierDef
    ? Math.min(100, Math.round((xpInCurrentTier / xpNeededForNext) * 100))
    : 100;

  const daysLeft = Math.max(0, Math.floor((activeSeason.endAt.getTime() - Date.now()) / 86_400_000));

  const REWARD_TYPE_LABEL: Record<string, string> = {
    xp: "XP",
    title: "Titel",
    cosmetic: "Kosmetik",
    powerup: "Power-Up",
  };

  const REWARD_TYPE_VARIANT: Record<string, "outline" | "brand" | "warning" | "info"> = {
    xp: "outline",
    title: "warning",
    cosmetic: "brand",
    powerup: "info",
  };

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Gamification</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
            {activeSeason.name}
          </h1>
          <p className="mt-1 text-sm text-muted-fg">
            Saison {activeSeason.number} · {daysLeft} Tage verbleibend
          </p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-black">Tier {currentTier}</p>
          <p className="text-xs text-muted-fg">{currentXp} Saison-XP</p>
        </div>
      </header>

      {/* Progress to next tier */}
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
            Nächste Belohnung: <span className="font-semibold text-fg">{nextTierDef.reward}</span>
          </p>
        </div>
      )}

      {/* Tier grid */}
      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-fg">Alle 50 Tiers</h2>
        <div className="grid grid-cols-5 gap-px border border-border bg-border sm:grid-cols-10">
          {tiers.map((tier) => {
            const isUnlocked = tier.tier <= currentTier;
            const isCurrent = tier.tier === currentTier + 1;

            return (
              <div
                key={tier.tier}
                className={cn(
                  "flex flex-col items-center gap-1 bg-bg p-2 text-center",
                  isUnlocked && "bg-success/[0.04]",
                  isCurrent && "bg-brand/[0.06] ring-1 ring-inset ring-brand/30",
                  !isUnlocked && !isCurrent && "opacity-40",
                )}
              >
                <span className="text-base leading-none">{tier.icon}</span>
                <span className="font-mono text-[9px] font-bold text-muted-fg">{tier.tier}</span>
                {tier.isPremium && (
                  <Trophy className="size-2.5 text-warning" />
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Key milestones */}
      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-fg">Meilensteine</h2>
        <div className="space-y-2">
          {tiers.filter((t) => t.isPremium || ["title", "powerup"].includes(t.rewardType)).map((tier) => {
            const isUnlocked = tier.tier <= currentTier;
            return (
              <div
                key={tier.tier}
                className={cn(
                  "flex items-center gap-4 border px-4 py-3",
                  isUnlocked ? "border-success/30 bg-success/[0.04]" : "border-border opacity-60",
                )}
              >
                <span className="text-2xl">{tier.icon}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold">Tier {tier.tier}</p>
                    <Badge variant={REWARD_TYPE_VARIANT[tier.rewardType] ?? "outline"} className="text-[10px]">
                      {REWARD_TYPE_LABEL[tier.rewardType] ?? tier.rewardType}
                    </Badge>
                    {tier.isPremium && <Badge variant="warning" className="text-[10px]">Premium</Badge>}
                  </div>
                  <p className="text-sm text-muted-fg">{tier.reward}</p>
                </div>
                {isUnlocked && <span className="text-success">✓</span>}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
