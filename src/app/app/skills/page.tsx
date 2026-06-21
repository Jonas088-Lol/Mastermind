import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { ROLE_HOME, effectiveRole, getSession } from "@/lib/session";
import { TOTAL_NODES, TOTAL_MASTERY_PTS, type MasteryLevel } from "@/lib/skill-graph";
import { SkillTreeCanvas, type MasteryEntry } from "./SkillTreeCanvas";

export const metadata: Metadata = { title: "Skill-Baum · MasterMind" };

export default async function SkillsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "student") redirect(ROLE_HOME[effectiveRole(session)]);

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { xp: true },
  });
  const userXp = user?.xp ?? 0;

  const masteries = await prisma.userSkillMastery.findMany({
    where: { userId: session.userId, masteryTier: { gte: 1 } },
    select: { nodeSlug: true, masteryTier: true, exercisesDone: true },
  });

  // Build mastery map: slug → { tier, progress }
  const masteryMap: Record<string, MasteryEntry> = {};
  for (const m of masteries) {
    masteryMap[m.nodeSlug] = {
      tier:     m.masteryTier as MasteryLevel,
      progress: m.exercisesDone,
    };
  }

  const unlockedCount  = masteries.length;
  const goldCount      = masteries.filter((m) => m.masteryTier === 3).length;
  const totalMasteryPts = masteries.reduce((s, m) => s + m.masteryTier, 0);
  const pct = Math.round((totalMasteryPts / TOTAL_MASTERY_PTS) * 100);

  return (
    <div className="flex flex-col gap-0">
      {/* Header bar */}
      <div className="flex items-center justify-between gap-4 px-4 pt-4 pb-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/30">Skill-Baum</p>
          <h1 className="text-xl font-black text-white leading-tight">Meisterschaft</h1>
        </div>
        <div className="flex items-center gap-3 text-right">
          <div>
            <p className="text-[10px] text-white/30">Knoten</p>
            <p className="text-sm font-black text-white">{unlockedCount}<span className="text-white/30 font-normal">/{TOTAL_NODES}</span></p>
          </div>
          <div>
            <p className="text-[10px] text-white/30">Gold</p>
            <p className="text-sm font-black text-amber-400">{goldCount}</p>
          </div>
          <div>
            <p className="text-[10px] text-white/30">Gesamt</p>
            <p className="text-sm font-black text-white">{pct}%</p>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-0.5 w-full bg-white/5">
        <div
          className="h-full transition-all duration-700"
          style={{ width: `${pct}%`, background: "linear-gradient(90deg, #6366f1, #f59e0b, #22c55e)" }}
        />
      </div>

      {/* Canvas */}
      <SkillTreeCanvas masteryMap={masteryMap} userXp={userXp} />
    </div>
  );
}
