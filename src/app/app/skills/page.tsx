import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CheckCircle2, Lock, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/db/client";
import { ROLE_HOME, effectiveRole, getSession } from "@/lib/session";
import { ALL_SKILL_TREES, formatXp, type SkillNodeDef } from "@/lib/game";
import { cn } from "@/lib/utils";
import { unlockSkillNode } from "./actions";

export const metadata: Metadata = { title: "Skill-Bäume · MasterMind" };

export default async function SkillsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "student") redirect(ROLE_HOME[effectiveRole(session)]);

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { xp: true },
  });

  const userXp = user?.xp ?? 0;

  // Load all unlocked skill nodes for this user
  const unlockedNodes = await prisma.userSkillNode.findMany({
    where: { userId: session.userId },
    include: { node: true },
  });

  const unlockedSlugs = new Set(unlockedNodes.map((un) => un.node.slug));

  const subjects = Object.keys(ALL_SKILL_TREES);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-10">
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Gamification</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Skill-Bäume</h1>
          <p className="mt-1 text-sm text-muted-fg">
            {unlockedNodes.length} Fähigkeiten freigeschaltet · {formatXp(userXp)} XP verfügbar
          </p>
        </div>
        <Target className="size-10 text-brand opacity-20" strokeWidth={1} />
      </header>

      {subjects.map((subject) => {
        const tree = ALL_SKILL_TREES[subject];
        const unlockedInSubject = tree.filter((n) => unlockedSlugs.has(n.slug)).length;

        // Group nodes by tier
        const byTier = new Map<number, SkillNodeDef[]>();
        for (const node of tree) {
          if (!byTier.has(node.tier)) byTier.set(node.tier, []);
          byTier.get(node.tier)!.push(node);
        }
        const tiers = [...byTier.keys()].sort();

        return (
          <section key={subject}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">{subject}</h2>
              <span className="font-mono text-sm text-muted-fg">{unlockedInSubject}/{tree.length}</span>
            </div>

            <div className="space-y-4">
              {tiers.map((tier) => {
                const nodes = byTier.get(tier) ?? [];
                return (
                  <div key={tier} className="space-y-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-fg">Tier {tier}</p>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {nodes.map((node) => {
                        const isUnlocked = unlockedSlugs.has(node.slug);
                        const parentUnlocked = !node.parentSlug || unlockedSlugs.has(node.parentSlug);
                        const canAfford = userXp >= node.requiredXp;
                        const canUnlock = !isUnlocked && parentUnlocked && canAfford;
                        const isLocked = !isUnlocked && !parentUnlocked;

                        return (
                          <div
                            key={node.slug}
                            className={cn(
                              "flex flex-col gap-3 border p-4 transition-colors",
                              isUnlocked && "border-success/40 bg-success/[0.04]",
                              canUnlock  && "border-brand/40 bg-brand/[0.02]",
                              isLocked   && "border-border opacity-40",
                              !isUnlocked && !canUnlock && !isLocked && "border-border",
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <span
                                className="grid size-10 shrink-0 place-items-center text-xl"
                                style={{ background: `${node.color}20` }}
                              >
                                {isLocked ? "🔒" : node.icon}
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                  <p className="text-sm font-bold">{node.title}</p>
                                  {isUnlocked && <CheckCircle2 className="size-3.5 text-success" />}
                                  {isLocked && <Lock className="size-3.5 text-muted-fg/40" />}
                                </div>
                                <p className="text-xs text-muted-fg">{node.description}</p>
                              </div>
                            </div>

                            <div className="flex items-center justify-between text-xs">
                              <Badge variant="outline">+{node.xpBonus} XP Bonus</Badge>
                              {node.requiredXp > 0 && (
                                <span className={cn("font-mono font-semibold", canAfford ? "text-success" : "text-muted-fg")}>
                                  {formatXp(node.requiredXp)} XP
                                </span>
                              )}
                            </div>

                            {canUnlock && (
                              <form action={unlockSkillNode.bind(null, subject, node.slug)}>
                                <Button type="submit" size="sm" variant="secondary" className="w-full">
                                  Freischalten
                                </Button>
                              </form>
                            )}

                            {isLocked && node.parentSlug && (
                              <p className="text-[10px] text-muted-fg">
                                Benötigt: {tree.find((n) => n.slug === node.parentSlug)?.title ?? node.parentSlug}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
