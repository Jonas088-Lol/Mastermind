"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { pushToUsers } from "@/lib/push";

export async function sendTeacherBroadcast(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "teacher") return;

  const classId = (formData.get("classId") as string | null)?.trim() ?? "";
  const target = (formData.get("target") as string | null)?.trim() ?? "students";
  const subject = (formData.get("subject") as string | null)?.trim() ?? "";
  const message = (formData.get("message") as string | null)?.trim() ?? "";

  if (!classId || !subject || !message) return;

  const students = await prisma.user.findMany({
    where: { classId, role: "student" },
    select: { id: true },
  });
  const studentIds = students.map((s) => s.id);

  const recipientIds: string[] = [];

  if (target === "students" || target === "both") {
    recipientIds.push(...studentIds);
  }

  if (target === "parents" || target === "both") {
    const parentLinks = await prisma.parentStudentLink.findMany({
      where: { studentId: { in: studentIds } },
      select: { parentId: true },
    });
    recipientIds.push(...parentLinks.map((l) => l.parentId));
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
  pushToUsers(unique, { title: subject, body: message, url: "/app/nachrichten" }).catch(() => {});

  revalidatePath("/teach/broadcast");
  redirect("/teach");
}
