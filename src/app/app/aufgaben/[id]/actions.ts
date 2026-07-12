/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { awardXp } from "@/lib/xp";
import { awardCoins } from "@/lib/coins";
import { incrementQuestProgress } from "@/lib/quests";

export async function submitAssignment(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");
  const role = effectiveRole(session);
  if (role !== "student") throw new Error("Nur Schüler:innen können Aufgaben abgeben");

  const assignmentId = String(formData.get("assignmentId") ?? "");
  const content = String(formData.get("content") ?? "").slice(0, 100_000);
  if (!assignmentId) throw new Error("assignmentId fehlt");

  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    select: { classId: true },
  });
  if (!assignment || assignment.classId !== session.classId) {
    throw new Error("Aufgabe nicht gefunden");
  }

  await prisma.submission.upsert({
    where: { assignmentId_studentId: { assignmentId, studentId: session.userId } },
    update: {
      content,
      status: "submitted",
      submittedAt: new Date(),
    },
    create: {
      assignmentId,
      studentId: session.userId,
      content,
      status: "submitted",
      submittedAt: new Date(),
    },
  });

  // Award first-submission coin bonus (once per student, lifetime)
  const priorSubmissions = await prisma.submission.count({
    where: { studentId: session.userId, assignmentId: { not: assignmentId } },
  });
  if (priorSubmissions === 0) {
    awardCoins(session.userId, "erste_aufgabe_semester", undefined, assignmentId).catch(() => undefined);
  }

  // XP/Coins nur bei der ERSTEN Abgabe dieser Aufgabe — erneutes Abgeben
  // (Upsert) darf keine Belohnung mehr auslösen (Farming-Exploit).
  const alreadyRewarded = await prisma.xpLog.findFirst({
    where: { userId: session.userId, reason: "aufgabe_abgabe", referenceId: assignmentId },
    select: { id: true },
  });
  if (!alreadyRewarded) {
    await awardXp(session.userId, "aufgabe_abgabe", assignmentId);
    await incrementQuestProgress(session.userId, "submission");
  }

  revalidatePath("/app/aufgaben");
  redirect("/app/aufgaben");
}
