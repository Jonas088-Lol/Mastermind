"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Schulart, TreeNodeStatus } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { derivePflichtfaecher } from "@/lib/curriculum";
import { initializeUserTree } from "@/lib/tree-generator";
import { assignFrontierQuests } from "@/lib/tree-quest-engine";
import { addToLeaderboard, removeFromLeaderboard } from "@/lib/leaderboard";

export async function saveCurriculumSetup(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "student") return;

  // Bundesland comes from the school, not from the form
  const userWithSchool = await prisma.user.findUnique({
    where:  { id: session.userId },
    select: { school: { select: { bundeslandCode: true } } },
  });
  const bundeslandCode = userWithSchool?.school?.bundeslandCode;
  if (!bundeslandCode) return;

  const landkreisId      = formData.get("landkreisId")    as string;
  const schulartRaw      = formData.get("schulart")       as string;
  const jahrgangsstufe   = parseInt(formData.get("jahrgangsstufe") as string, 10);
  const displayName      = (formData.get("displayName") as string | null)?.trim() || null;
  const leaderboardOptIn = formData.get("leaderboardOptIn") === "on";
  const extraSubjectIds  = formData.getAll("extraSubjectId") as string[];

  if (!schulartRaw || isNaN(jahrgangsstufe)) return;

  let schulart: Schulart;
  try {
    schulart = Schulart[schulartRaw as keyof typeof Schulart];
    if (!schulart) return;
  } catch { return; }

  await prisma.user.update({
    where: { id: session.userId },
    data: {
      bundeslandCode,
      landkreisId:      landkreisId || null,
      schulart,
      jahrgangsstufe,
      displayName:      displayName || null,
      leaderboardOptIn,
      anonymousMode:    !leaderboardOptIn,
    },
  });

  // Build subject ID list: Pflichtfächer + user-chosen Wahlpflichtfächer
  const pflichtfaecher = await derivePflichtfaecher(bundeslandCode, schulart, jahrgangsstufe);
  const pflichtIds     = pflichtfaecher.map((s) => s.id);
  const allSubjectIds  = [...new Set([...pflichtIds, ...extraSubjectIds])];

  // Initialize tree (creates UserTreeProgress rows)
  await initializeUserTree(session.userId, allSubjectIds);

  // Hub is AVAILABLE from init; assign its quest so user can unlock it
  const hub = await prisma.treeNode.findFirst({ where: { isHub: true } });
  if (hub) {
    await prisma.userTreeProgress.upsert({
      where:  { userId_nodeId: { userId: session.userId, nodeId: hub.id } },
      create: { userId: session.userId, nodeId: hub.id, status: TreeNodeStatus.AVAILABLE },
      update: {},
    });
    await assignFrontierQuests(session.userId);
  }

  // Leaderboard
  const user = await prisma.user.findUnique({
    where: { id: session.userId }, select: { xp: true },
  });
  if (leaderboardOptIn && user) {
    await addToLeaderboard(session.userId, user.xp, bundeslandCode, landkreisId || null);
  } else {
    await removeFromLeaderboard(session.userId, bundeslandCode, landkreisId || null);
  }

  revalidatePath("/app/skills");
  redirect("/app/skills");
}

export async function updateLeaderboardPrefs(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "student") return;

  const optIn       = formData.get("leaderboardOptIn") === "on";
  const displayName = (formData.get("displayName") as string | null)?.trim() || null;

  const user = await prisma.user.update({
    where:  { id: session.userId },
    data:   { leaderboardOptIn: optIn, anonymousMode: !optIn, displayName },
    select: { xp: true, bundeslandCode: true, landkreisId: true },
  });

  if (optIn) {
    await addToLeaderboard(session.userId, user.xp, user.bundeslandCode, user.landkreisId);
  } else {
    await removeFromLeaderboard(session.userId, user.bundeslandCode, user.landkreisId);
  }

  revalidatePath("/app/skills");
  revalidatePath("/app/ranking");
}
