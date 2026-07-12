/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use server";

import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { redirect } from "next/navigation";

export async function toggleHomeworkDone(homeworkId: string, done: boolean): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "student") redirect("/");

  // Hausaufgabe muss existieren und zur Klasse des Schülers gehören
  // (sonst FK-Crash bei erfundener ID bzw. Fremd-Completions)
  const hw = await prisma.homework.findUnique({
    where: { id: homeworkId },
    select: { classId: true },
  });
  if (!hw || !session.classId || hw.classId !== session.classId) return;

  await prisma.homeworkCompletion.upsert({
    where: { homeworkId_studentId: { homeworkId, studentId: session.userId } },
    create: {
      homeworkId,
      studentId: session.userId,
      done,
      doneAt: done ? new Date() : null,
    },
    update: {
      done,
      doneAt: done ? new Date() : null,
    },
  });

  revalidatePath("/app/hausaufgaben");
}

export async function uploadHomeworkFile(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "student") redirect("/");

  const homeworkId = (formData.get("homeworkId") as string | null)?.trim() ?? "";
  const file = formData.get("file") as File | null;
  if (!homeworkId || !file || file.size === 0) return;

  // Validate homework belongs to student's class
  const completion = await prisma.homeworkCompletion.findUnique({
    where: { homeworkId_studentId: { homeworkId, studentId: session.userId } },
  });
  if (!completion) return;

  const MAX_SIZE = 20 * 1024 * 1024; // 20 MB
  if (file.size > MAX_SIZE) return;

  // Typ-Whitelist; Extension aus dem MIME-Typ ableiten (nicht aus dem Dateinamen).
  const HW_EXT: Record<string, string> = {
    "application/pdf": "pdf",
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
    "image/heic": "heic",
    "text/plain": "txt",
    "application/msword": "doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  };
  const ext = HW_EXT[file.type];
  if (!ext) return;

  const safeName = `hw_${homeworkId}_${session.userId}_${Date.now()}.${ext}`;
  const uploadDir = join(process.cwd(), "uploads", "homework");
  await mkdir(uploadDir, { recursive: true });

  const bytes = await file.arrayBuffer();
  await writeFile(join(uploadDir, safeName), Buffer.from(bytes));

  const fileUrl = `/uploads/homework/${safeName}`;

  await prisma.homeworkCompletion.update({
    where: { homeworkId_studentId: { homeworkId, studentId: session.userId } },
    data: {
      done: true,
      doneAt: new Date(),
      fileUrl,
      fileName: String(file.name ?? "").slice(0, 255),
    },
  });

  revalidatePath("/app/hausaufgaben");
}
