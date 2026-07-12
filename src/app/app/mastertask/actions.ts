/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/client";
import { getSession } from "@/lib/session";

export async function updateTaskStatus(taskId: string, status: "todo" | "in_progress" | "done") {
  const session = await getSession();
  if (!session) return;

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

  const comment = String(formData.get("comment") ?? "").trim() || null;
  const filePath = String(formData.get("filePath") ?? "").trim() || null;
  const fileName = String(formData.get("fileName") ?? "").trim() || null;

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
