/* Copyright 2026 Elian Schock, Jonas Schwenk */
/**
 * pacing-sim.ts
 * Estimates the median completion time (in "learning days") for the skill tree.
 *
 * A "learning day" = a calendar day with ≥ PACING.minLearningDayXp XP earned.
 * The median days to 100% is the primary tuneable metric.
 *
 * Formula (deterministic, runs in O(1)):
 *   totalNodes      = Σ tiers across all user subjects
 *   questsPerNode   = avg requiredQuestCount
 *   progressPerDay  = PACING.dailyProgressCap  (quests/day that count)
 *   nodesPerDay     ≈ progressPerDay / questsPerNode
 *   medianDays      = ceil(totalNodes / nodesPerDay)
 *
 * Real-world corrections:
 *   +20% for days where user doesn't hit the cap (assumed 80% efficiency)
 *   +N days for mandatory spaced repetition reviews
 */

import { PACING } from "@/lib/tree-quest-engine";

export interface PacingConfig {
  numSubjects:      number;   // how many subject arms the user has
  tiersPerSubject:  number;   // average tier count per subject (default 6)
  avgQuestsPerNode: number;   // avg requiredQuestCount (default 2)
  dailyProgressCap: number;   // from PACING (default 3)
  efficiencyFactor: number;   // 0–1, how often user hits daily cap (default 0.75)
}

export interface PacingEstimate {
  totalNodes:          number;
  questsTotal:         number;
  rawDays:             number;
  medianLearningDays:  number;  // ≥80 target
  meetsTarget:         boolean;
  config:              PacingConfig;
}

export function estimateCompletionDays(
  partial?: Partial<PacingConfig>,
): PacingEstimate {
  const cfg: PacingConfig = {
    numSubjects:      partial?.numSubjects      ?? 8,
    tiersPerSubject:  partial?.tiersPerSubject  ?? 6,
    avgQuestsPerNode: partial?.avgQuestsPerNode ?? 2,
    dailyProgressCap: partial?.dailyProgressCap ?? PACING.dailyProgressCap,
    efficiencyFactor: partial?.efficiencyFactor ?? 0.75,
  };

  const totalNodes    = cfg.numSubjects * cfg.tiersPerSubject + 1;  // +1 for hub
  const questsTotal   = totalNodes * cfg.avgQuestsPerNode;
  const effectiveCap  = cfg.dailyProgressCap * cfg.efficiencyFactor;
  const nodesPerDay   = effectiveCap / cfg.avgQuestsPerNode;
  const rawDays       = totalNodes / nodesPerDay;

  // Add spaced repetition overhead: each mastered node gets ~2 review sessions
  // Reviews don't count toward progress cap but consume time
  const reviewOverhead = totalNodes * 2 * (1 / cfg.dailyProgressCap);
  const medianDays     = Math.ceil(rawDays + reviewOverhead);

  return {
    totalNodes,
    questsTotal,
    rawDays:            Math.ceil(rawDays),
    medianLearningDays: medianDays,
    meetsTarget:        medianDays >= 80,
    config:             cfg,
  };
}

/**
 * Compute real-time pacing stats for a specific user from DB data.
 * Call this in analytics dashboards.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getUserPacingStats(prisma: any, userId: string) {
  const [totalNodes, masteredNodes, learningDays] = await Promise.all([
    prisma.treeNode.count({ where: {} }),
    prisma.userTreeProgress.count({ where: { userId, status: "MASTERED" } }),
    prisma.dailyActivity.count({
      where: { userId, xpEarned: { gte: PACING.minLearningDayXp } },
    }),
  ]);

  const pct = totalNodes > 0 ? (masteredNodes / totalNodes) * 100 : 0;
  const estimate = estimateCompletionDays({ numSubjects: 8 });

  return {
    masteredNodes,
    totalNodes,
    completionPct:     Math.round(pct),
    learningDays,
    projectedDaysLeft: totalNodes > 0
      ? Math.ceil((totalNodes - masteredNodes) / (masteredNodes / Math.max(1, learningDays)))
      : estimate.medianLearningDays,
    medianEstimate:    estimate.medianLearningDays,
    onTrack:           learningDays > 0
      ? (masteredNodes / learningDays) >= (totalNodes / estimate.medianLearningDays)
      : true,
  };
}
