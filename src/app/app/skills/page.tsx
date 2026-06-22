import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { ROLE_HOME, effectiveRole, getSession } from "@/lib/session";
import { getUserTreeState } from "@/lib/tree-generator";
import { getUserPacingStats } from "@/lib/pacing-sim";
import { CurriculumTreeCanvas } from "./CurriculumTreeCanvas";

export const metadata: Metadata = { title: "Wissens-Baum · MasterMind" };

export default async function SkillsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "student") redirect(ROLE_HOME[effectiveRole(session)]);

  // Check whether curriculum is set up
  const user = await prisma.user.findUnique({
    where:  { id: session.userId },
    select: {
      bundeslandCode:  true,
      schulart:        true,
      jahrgangsstufe:  true,
      displayName:     true,
      leaderboardOptIn:true,
      xp:              true,
    },
  });

  if (!user?.bundeslandCode || !user.schulart || !user.jahrgangsstufe) {
    redirect("/app/skills/setup");
  }

  // Get subject IDs that this user has in their tree
  const treeProgresses = await prisma.userTreeProgress.findMany({
    where:   { userId: session.userId },
    include: { node: { select: { subjectId: true } } },
  });
  const subjectIdSet = new Set<string>();
  for (const tp of treeProgresses) {
    if (tp.node.subjectId) subjectIdSet.add(tp.node.subjectId);
  }
  const subjectIds = [...subjectIdSet];

  // Load tree display state
  const { nodes, edges } = await getUserTreeState(session.userId, subjectIds);

  // Pacing stats for header
  const pacing = await getUserPacingStats(prisma, session.userId);

  const masteredCount = nodes.filter((n) => n.status === "MASTERED").length;
  const totalCount    = nodes.filter((n) => !n.status || n.status !== "HIDDEN").length || nodes.length;

  return (
    <div className="flex flex-col gap-0 h-full">
      {/* Header bar */}
      <div className="flex items-center justify-between gap-4 px-4 pt-4 pb-3 shrink-0">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/30">Wissens-Baum</p>
          <h1 className="text-xl font-black text-white leading-tight">
            {user.displayName ? `${user.displayName}s Baum` : "Mein Skill-Baum"}
          </h1>
        </div>
        <div className="flex items-center gap-3 text-right">
          <div>
            <p className="text-[10px] text-white/30">Gemeistert</p>
            <p className="text-sm font-black text-white">
              {masteredCount}
              <span className="text-white/30 font-normal">/{nodes.length}</span>
            </p>
          </div>
          {pacing && (
            <div>
              <p className="text-[10px] text-white/30">Lerntage</p>
              <p className="text-sm font-black text-white">
                {pacing.learningDays}
                <span className="text-white/30 font-normal">/{pacing.medianEstimate}</span>
              </p>
            </div>
          )}
          <div>
            <p className="text-[10px] text-white/30">XP</p>
            <p className="text-sm font-black text-indigo-400">{user.xp.toLocaleString("de-DE")}</p>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-0.5 w-full bg-white/5 shrink-0">
        <div
          className="h-full transition-all duration-700"
          style={{
            width: `${pacing?.completionPct ?? 0}%`,
            background: "linear-gradient(90deg, #6366f1, #f59e0b, #22c55e)",
          }}
        />
      </div>

      {/* Canvas */}
      <CurriculumTreeCanvas nodes={nodes} edges={edges} />
    </div>
  );
}
