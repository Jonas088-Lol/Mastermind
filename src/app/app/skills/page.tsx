import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { ROLE_HOME, effectiveRole, getSession } from "@/lib/session";
import { SkillTreeView } from "./SkillTreeView";

export const metadata: Metadata = { title: "Skill-Baum · MasterMind" };

export default async function SkillsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "student") redirect(ROLE_HOME[effectiveRole(session)]);

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { name: true, displayName: true, xp: true },
  });

  const subjectMinutesRows = await prisma.userSubjectMinutes.findMany({
    where: { userId: session.userId },
    select: { subjectKey: true, totalMinutes: true },
  });

  const progress = subjectMinutesRows.map((r) => ({
    subjectKey: r.subjectKey,
    totalMinutes: r.totalMinutes,
  }));

  const displayName = user?.displayName ?? user?.name ?? "Du";

  return (
    <div className="flex flex-col gap-0 h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 px-4 pt-4 pb-3 shrink-0">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/30">Skill-Baum</p>
          <h1 className="text-xl font-black text-white leading-tight">
            {displayName}s Fortschritt
          </h1>
        </div>
        <div className="flex items-center gap-3 text-right">
          <div>
            <p className="text-[10px] text-white/30">XP</p>
            <p className="text-sm font-black text-indigo-400">{(user?.xp ?? 0).toLocaleString("de-DE")}</p>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px w-full bg-white/5 shrink-0" />

      {/* Content */}
      <SkillTreeView progress={progress} />
    </div>
  );
}
