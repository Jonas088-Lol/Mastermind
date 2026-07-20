/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { pushToUsers } from "@/lib/push";
import { logger } from "@/lib/logger";
import { can } from "@/lib/permissions";

export async function sendTeacherBroadcast(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "teacher") return;
  // Von der Schulleitung sperrbar
  if (!(await can(session, "teacher.broadcast"))) return;

  const targetType = (formData.get("targetType") as string | null)?.trim() ?? "class";
  const classId = (formData.get("classId") as string | null)?.trim() ?? "";
  const subject = (formData.get("subject") as string | null)?.trim() ?? "";
  const message = (formData.get("message") as string | null)?.trim() ?? "";

  if (!subject || !message) return;

  const recipientIds: string[] = [];

  if (targetType === "class") {
    if (!classId) return;
    // Verify teacher teaches this class
    const tsc = await prisma.teacherSubjectClass.findFirst({
      where: { teacherId: session.userId, classId },
    });
    if (!tsc) return;
    const students = await prisma.user.findMany({
      where: { classId, role: "student" },
      select: { id: true },
    });
    recipientIds.push(...students.map((s) => s.id));
  } else if (targetType === "all_students") {
    const tscEntries = await prisma.teacherSubjectClass.findMany({
      where: { teacherId: session.userId },
      select: { classId: true },
    });
    const classIds = [...new Set(tscEntries.map((t) => t.classId))];
    const students = await prisma.user.findMany({
      where: { classId: { in: classIds }, role: "student" },
      select: { id: true },
    });
    recipientIds.push(...students.map((s) => s.id));
  } else if (targetType === "all_parents") {
    const tscEntries = await prisma.teacherSubjectClass.findMany({
      where: { teacherId: session.userId },
      select: { classId: true },
    });
    const classIds = [...new Set(tscEntries.map((t) => t.classId))];
    const links = await prisma.parentStudentLink.findMany({
      where: { student: { classId: { in: classIds } } },
      select: { parentId: true },
    });
    recipientIds.push(...links.map((l) => l.parentId));
  }

  const unique = [...new Set(recipientIds)];
  if (unique.length === 0) return;

  await prisma.appNotification.createMany({
    data: unique.map((userId) => ({
      userId,
      type: "broadcast",
      title: subject,
      body: message,
      linkUrl: null,
    })),
  });

  // Fire push notifications (fire-and-forget)
  pushToUsers(unique, { title: subject, body: message, url: "/app/nachrichten" }).catch((err) => {
    logger.warn("broadcast: push notification failed", { error: String(err) });
  });

  revalidatePath("/teach/broadcast");
  redirect("/teach/broadcast?sent=1");
}
