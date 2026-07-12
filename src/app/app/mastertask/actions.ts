/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/client";
import { getSession } from "@/lib/session";

/** Nur Aufgaben der eigenen Klasse dürfen bearbeitet werden. */
async function canAccessTask(taskId: string, userId: string): Promise<boolean> {
  const [user, task] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { classId: true } }),
    prisma.masterTask.findUnique({ where: { id: taskId }, select: { classId: true } }),
  ]);
  return !!user?.classId && !!task && task.classId === user.classId;
}

export async function updateTaskStatus(taskId: string, status: "todo" | "in_progress" | "done") {
  const session = await getSession();
  if (!session) return;
  if (!(await canAccessTask(taskId, session.userId))) return;

  await prisma.masterTaskProgress.upsert({
    where: { taskId_studentId: { taskId, studentId: session.userId } },
    create: { taskId, studentId: session.userId, status },
    update: { status },
  });

  revalidatePath("/app/mastertask");
  revalidatePath(`/app/mastertask/${taskId}`);
}

export async function saveSubmission(taskId: string, formData: FormData) {
  const session = await getSession();
  if (!session) return;
  if (!(await canAccessTask(taskId, session.userId))) return;

  const comment = String(formData.get("comment") ?? "").trim().slice(0, 2000) || null;
  let filePath = String(formData.get("filePath") ?? "").trim() || null;
  const fileName = String(formData.get("fileName") ?? "").trim().slice(0, 200) || null;

  // Nur Pfade akzeptieren, die der Upload-Endpoint für DIESEN Schüler und DIESE
  // Aufgabe vergeben hat — verhindert gespeicherte Fremd-/Traversal-Pfade.
  if (filePath) {
    const expectedPrefix = `mastertask-submissions/${taskId}/${session.userId}/`;
    if (!filePath.startsWith(expectedPrefix) || filePath.includes("..")) {
      filePath = null;
    }
  }

  await prisma.masterTaskProgress.upsert({
    where: { taskId_studentId: { taskId, studentId: session.userId } },
    create: {
      taskId,
      studentId: session.userId,
      status: "done",
      comment,
      submissionPath: filePath,
      submissionName: fileName,
    },
    update: {
      status: "done",
      comment,
      ...(filePath ? { submissionPath: filePath, submissionName: fileName } : {}),
    },
  });

  revalidatePath("/app/mastertask");
  revalidatePath(`/app/mastertask/${taskId}`);
}
