import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { prisma } from "@/lib/db/client";
import { ROLE_HOME, effectiveRole, getSession } from "@/lib/session";
import {
  ALL_SKILL_TREES,
  CORE_NODE,
  SUBJECT_SKILL_CONFIGS,
  formatXp,
} from "@/lib/game";
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

  const unlockedNodes = await prisma.userSkillNode.findMany({
    where: { userId: session.userId },
    include: { node: true },
  });
  const unlockedSlugs = new Set(unlockedNodes.map((un) => un.node.slug));
  const totalUnlocked = unlockedNodes.length;
  const coreUnlocked = unlockedSlugs.has("core");

  const totalPossible = 1 + SUBJECT_SKILL_CONFIGS.length * 4;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <style>{`
        @keyframes core-glow {
          0%,100% { box-shadow: 0 0 40px 0 #f59e0b35, 0 8px 32px rgba(0,0,0,0.18); }
          50%      { box-shadow: 0 0 80px 0 #f59e0b60, 0 12px 40px rgba(0,0,0,0.22); }
        }
        @keyframes core-pulse {
          0%,100% { transform: scale(1); }
          50%      { transform: scale(1.12); }
        }
        @keyframes node-in {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .core-glow { animation: core-glow 3s ease-in-out infinite; }
        .core-icon { animation: core-pulse 2.4s ease-in-out infinite; display: inline-block; }
        .subject-card { animation: node-in 0.35s ease both; }
      `}</style>

      {/* ── Header ── */}
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Gamification</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Skill-Bäume</h1>
        <p className="mt-1 text-sm text-muted-fg">
          {totalUnlocked}/{totalPossible} Fähigkeiten freigeschaltet
          <span className="mx-2 text-border">·</span>
          {formatXp(userXp)} XP verfügbar
        </p>
      </header>

      {/* ── Core Hub Node ── */}
      <div className="flex justify-center">
        <div
          className={cn(
            "relative w-full max-w-sm rounded-3xl border-2 p-7 text-center",
            coreUnlocked
              ? "border-amber-500/40 bg-amber-500/5"
              : "core-glow border-amber-500/70 cursor-pointer",
          )}
          style={
            coreUnlocked
              ? undefined
              : { background: "linear-gradient(135deg, #f59e0b08 0%, transparent 70%)" }
          }
        >
          {coreUnlocked && (
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-amber-500 px-3 py-0.5 text-[10px] font-black uppercase tracking-widest text-white shadow">
              Aktiv
            </span>
          )}

          <div className={cn("mb-3 text-6xl leading-none", !coreUnlocked && "core-icon")}>
            {CORE_NODE.icon}
          </div>
          <p className="text-xl font-black tracking-tight">{CORE_NODE.title}</p>
          <p className="mt-1 text-sm text-muted-fg">
            {coreUnlocked
              ? "Du hast den Skill-Baum freigeschaltet — wähle jetzt deine Fächer"
              : CORE_NODE.description}
          </p>

          {!coreUnlocked && (
            <form action={unlockSkillNode.bind(null, "core", "core")} className="mt-5">
              <button
                type="submit"
                className="w-full rounded-xl bg-amber-500 px-6 py-2.5 text-sm font-bold text-white shadow-lg transition-all hover:bg-amber-600 active:scale-95"
              >
                🌟 Kostenlos freischalten
              </button>
            </form>
          )}

          {coreUnlocked && (
            <p className="mt-3 text-xs font-semibold text-amber-600 dark:text-amber-400">
              ✓ +{CORE_NODE.xpBonus} XP Bonus auf alle Aufgaben aktiv
            </p>
          )}
        </div>
      </div>

      {/* ── Connector ── */}
      <div className="flex flex-col items-center -my-2 gap-0.5">
        <div className="h-8 w-px bg-linear-to-b from-amber-500/60 to-border/30" />
        <div className="h-px w-48 bg-linear-to-r from-transparent via-border to-transparent" />
        <p className="mt-1 text-[10px] font-black uppercase tracking-[0.3em] text-muted-fg/40">
          Fächer
        </p>
      </div>

      {/* ── Subject Grid ── */}
      <div
        className={cn(
          "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 transition-all duration-500",
          !coreUnlocked && "pointer-events-none select-none opacity-25",
        )}
      >
        {SUBJECT_SKILL_CONFIGS.map((cfg, colIdx) => {
          const tree = ALL_SKILL_TREES[cfg.key] ?? [];
          const unlockedCount = tree.filter((n) => unlockedSlugs.has(n.slug)).length;

          const eligibleNode = tree.find((node) => {
            const parentOk = !node.parentSlug || unlockedSlugs.has(node.parentSlug);
            return !unlockedSlugs.has(node.slug) && parentOk && userXp >= node.requiredXp;
          });

          const maxUnlockedTier = tree.reduce(
            (max, n) => (unlockedSlugs.has(n.slug) ? Math.max(max, n.tier) : max),
            0,
          );

          return (
            <div
              key={cfg.key}
              className="subject-card overflow-hidden rounded-2xl border"
              style={{
                borderColor: `${cfg.color}30`,
                animationDelay: `${colIdx * 0.04}s`,
              }}
            >
              {/* Subject header */}
              <div
                className="flex items-center gap-2.5 px-3 py-2.5"
                style={{
                  background: `${cfg.color}12`,
                  borderBottom: `1px solid ${cfg.color}20`,
                }}
              >
                <span className="text-lg leading-none">{cfg.icon}</span>
                <p className="min-w-0 flex-1 truncate text-xs font-black">{cfg.label}</p>
                <span className="shrink-0 font-mono text-[10px] text-muted-fg">
                  {unlockedCount}/4
                </span>
              </div>

              {/* Progress bar */}
              <div className="h-0.5 w-full bg-surface">
                <div
                  className="h-full transition-all duration-700"
                  style={{
                    width: `${(unlockedCount / 4) * 100}%`,
                    background: cfg.color,
                  }}
                />
              </div>

              {/* Tier rows */}
              <div className="divide-y divide-border/40">
                {tree.map((node, tierIdx) => {
                  const isUnlocked = unlockedSlugs.has(node.slug);
                  const parentUnlocked = !node.parentSlug || unlockedSlugs.has(node.parentSlug);
                  const canAfford = userXp >= node.requiredXp;
                  const isNext = !isUnlocked && parentUnlocked;
                  const isLocked = !isUnlocked && !parentUnlocked;

                  return (
                    <div
                      key={node.slug}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 transition-colors",
                        isUnlocked && "bg-success/4",
                        isNext && canAfford && "bg-fg/2",
                        isLocked && "opacity-35",
                      )}
                    >
                      {/* Tier indicator line */}
                      <div className="flex flex-col items-center self-stretch shrink-0">
                        <div
                          className={cn(
                            "size-2 rounded-full shrink-0 mt-1.5",
                            isUnlocked ? "shadow-sm" : "bg-border",
                          )}
                          style={isUnlocked ? { background: cfg.color, boxShadow: `0 0 6px ${cfg.color}80` } : undefined}
                        />
                        {tierIdx < 3 && (
                          <div
                            className="mt-0.5 w-px flex-1"
                            style={{
                              background:
                                tierIdx < maxUnlockedTier - 1
                                  ? `${cfg.color}60`
                                  : "var(--color-border)",
                              minHeight: 10,
                            }}
                          />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1">
                          <span className="shrink-0 text-sm leading-none">
                            {isLocked ? "🔒" : node.icon}
                          </span>
                          <p
                            className={cn(
                              "truncate text-[11px] font-bold leading-tight",
                              isUnlocked && "text-fg",
                              isNext && "text-fg",
                            )}
                          >
                            {node.title}
                          </p>
                          {isUnlocked && (
                            <CheckCircle2 className="size-3 shrink-0 text-success" />
                          )}
                        </div>
                        {node.unlocksGrade && !isUnlocked && (
                          <p className="text-[9px] text-muted-fg leading-tight mt-0.5">
                            Bis Kl. {node.unlocksGrade}
                          </p>
                        )}
                        {isUnlocked && (
                          <p
                            className="text-[9px] font-semibold leading-tight mt-0.5"
                            style={{ color: cfg.color }}
                          >
                            +{node.xpBonus} XP · {node.unlocksGrade ? `Kl. bis ${node.unlocksGrade}` : "Kl. 1–5"}
                          </p>
                        )}
                      </div>

                      {isNext && !isUnlocked && (
                        <span
                          className={cn(
                            "shrink-0 font-mono text-[10px] font-bold",
                            canAfford ? "opacity-100" : "text-muted-fg",
                          )}
                          style={canAfford ? { color: cfg.color } : undefined}
                        >
                          {node.requiredXp === 0 ? "gratis" : formatXp(node.requiredXp)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Unlock button */}
              {eligibleNode && (
                <div className="px-3 pb-3 pt-1">
                  <form action={unlockSkillNode.bind(null, cfg.key, eligibleNode.slug)}>
                    <button
                      type="submit"
                      className="w-full rounded-xl py-2 text-[11px] font-bold transition-all hover:opacity-80 active:scale-95"
                      style={{
                        background: `${cfg.color}18`,
                        color: cfg.color,
                        border: `1px solid ${cfg.color}35`,
                      }}
                    >
                      {eligibleNode.icon}{" "}
                      {eligibleNode.requiredXp === 0
                        ? `${eligibleNode.title} freischalten`
                        : `${formatXp(eligibleNode.requiredXp)} XP → ${eligibleNode.title}`}
                    </button>
                  </form>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Legend ── */}
      <div className="flex flex-wrap gap-4 border-t border-border pt-6 text-[11px] text-muted-fg">
        <span className="flex items-center gap-1.5">
          <CheckCircle2 className="size-3.5 text-success" /> Freigeschaltet
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full border border-border bg-transparent" /> Verfügbar
        </span>
        <span className="flex items-center gap-1.5">
          <span>🔒</span> Vorgänger benötigt
        </span>
        <span className="flex items-center gap-1.5 ml-auto font-semibold text-fg">
          Stufe 2 → bis Klasse 8 · Stufe 3 → bis Klasse 11 · Stufe 4 → bis Klasse 13
        </span>
      </div>
    </div>
  );
}
