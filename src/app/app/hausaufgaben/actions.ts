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

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
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
      fileName: file.name,
    },
  });

  revalidatePath("/app/hausaufgaben");
}
