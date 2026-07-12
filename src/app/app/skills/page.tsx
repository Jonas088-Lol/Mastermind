/* Copyright 2026 Elian Schock, Jonas Schwenk */
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

  const [user, purchases] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.userId },
      select: { name: true, displayName: true, xp: true },
    }),
    prisma.userSkillPurchase.findMany({
      where: { userId: session.userId },
      select: { nodeKey: true },
    }),
  ]);

  const unlockedKeys = purchases.map((p) => p.nodeKey);
  const displayName  = user?.displayName ?? user?.name ?? "Du";

  return (
    <SkillTreeView
      unlockedKeys={unlockedKeys}
      userXp={user?.xp ?? 0}
      displayName={displayName}
    />
  );
}
