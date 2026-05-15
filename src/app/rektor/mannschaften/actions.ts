"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { ROLE_HOME, effectiveRole, getSession } from "@/lib/session";

async function guardRector() {
  const session = await getSession();
  if (!session) redirect("/login");
  const role = effectiveRole(session);
  if (!["rector", "vice_rector", "admin", "super"].includes(role)) {
    redirect(ROLE_HOME[role] ?? "/login");
  }
  return session;
}

export async function createTeam(formData: FormData): Promise<void> {
  const session = await guardRector();
  if (!session.schoolId) return;

  const name = (formData.get("name") as string | null)?.trim() ?? "";
  const sport = (formData.get("sport") as string | null)?.trim() ?? "";
  const season = (formData.get("season") as string | null)?.trim() || null;
  const coach = (formData.get("coach") as string | null)?.trim() || null;

  if (!name || !sport) return;

  await prisma.schoolTeam.create({
    data: { schoolId: session.schoolId, name, sport, season, coach },
  });

  revalidatePath("/rektor/mannschaften");
}

export async function deleteTeam(teamId: string): Promise<void> {
  const session = await guardRector();
  if (!session.schoolId) return;

  const team = await prisma.schoolTeam.findUnique({ where: { id: teamId } });
  if (!team || team.schoolId !== session.schoolId) return;

  await prisma.schoolTeam.delete({ where: { id: teamId } });
  revalidatePath("/rektor/mannschaften");
}

interface MatchResult {
  date: string;
  opponent: string;
  scoreHome: number;
  scoreAway: number;
}

export async function addResult(teamId: string, formData: FormData): Promise<void> {
  const session = await guardRector();
  if (!session.schoolId) return;

  const team = await prisma.schoolTeam.findUnique({ where: { id: teamId } });
  if (!team || team.schoolId !== session.schoolId) return;

  const date = (formData.get("date") as string | null)?.trim() ?? "";
  const opponent = (formData.get("opponent") as string | null)?.trim() ?? "";
  const scoreHomeRaw = formData.get("scoreHome") as string | null;
  const scoreAwayRaw = formData.get("scoreAway") as string | null;

  if (!date || !opponent || scoreHomeRaw === null || scoreAwayRaw === null) return;

  const scoreHome = parseInt(scoreHomeRaw, 10);
  const scoreAway = parseInt(scoreAwayRaw, 10);
  if (isNaN(scoreHome) || isNaN(scoreAway)) return;

  let existing: MatchResult[] = [];
  try {
    existing = JSON.parse(team.results ?? "[]") as MatchResult[];
  } catch {
    existing = [];
  }

  const updated = [{ date, opponent, scoreHome, scoreAway }, ...existing];

  await prisma.schoolTeam.update({
    where: { id: teamId },
    data: { results: JSON.stringify(updated) },
  });

  revalidatePath("/rektor/mannschaften");
}

export async function deleteResult(teamId: string, resultIndex: number): Promise<void> {
  const session = await guardRector();
  if (!session.schoolId) return;

  const team = await prisma.schoolTeam.findUnique({ where: { id: teamId } });
  if (!team || team.schoolId !== session.schoolId) return;

  let results: MatchResult[] = [];
  try { results = JSON.parse(team.results ?? "[]") as MatchResult[]; } catch { results = []; }

  results.splice(resultIndex, 1);

  await prisma.schoolTeam.update({
    where: { id: teamId },
    data: { results: JSON.stringify(results) },
  });

  revalidatePath("/rektor/mannschaften");
}
