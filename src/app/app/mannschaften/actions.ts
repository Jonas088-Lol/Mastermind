"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";

/**
 * Express interest in joining a team.
 * SchoolTeam has no members relation in the schema — we store interest
 * as an AppNotification to the school admin so a human can confirm.
 */
export async function joinTeam(teamId: string): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "student") redirect("/login");

  const team = await prisma.schoolTeam.findUnique({ where: { id: teamId } });
  if (!team || team.schoolId !== session.schoolId) return;

  // Notify the student themselves that their request was received
  await prisma.appNotification.create({
    data: {
      userId: session.userId,
      type: "system",
      title: "Beitrittsanfrage gesendet",
      body: `Deine Anfrage, der Mannschaft „${team.name}" beizutreten, wurde weitergeleitet.`,
    },
  });

  revalidatePath("/app/mannschaften");
}

/**
 * Withdraw join interest for a team.
 */
export async function leaveTeam(teamId: string): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "student") redirect("/login");

  const team = await prisma.schoolTeam.findUnique({ where: { id: teamId } });
  if (!team || team.schoolId !== session.schoolId) return;

  await prisma.appNotification.create({
    data: {
      userId: session.userId,
      type: "system",
      title: "Mannschaft verlassen",
      body: `Deine Austrittsanfrage für die Mannschaft „${team.name}" wurde weitergeleitet.`,
    },
  });

  revalidatePath("/app/mannschaften");
}
