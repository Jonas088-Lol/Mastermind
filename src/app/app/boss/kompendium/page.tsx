import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { ROLE_HOME, effectiveRole, getSession } from "@/lib/session";
import { BossCompendiumWrapper } from "./BossCompendiumWrapper";

export const metadata: Metadata = { title: "Boss-Kompendium · MasterMind" };

export default async function BossKompendiumPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "student") redirect(ROLE_HOME[effectiveRole(session)]);

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      schoolClass: { select: { grade: true } },
      bossProgress: { select: { bossId: true, kills: true } },
    },
  });

  const grade       = user?.schoolClass?.grade ?? 8;
  const defeatedIds = (user?.bossProgress ?? [])
    .filter((p) => p.kills > 0)
    .map((p) => p.bossId);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <BossCompendiumWrapper grade={grade} defeatedIds={defeatedIds} />
    </div>
  );
}
