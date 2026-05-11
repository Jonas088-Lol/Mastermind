"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { awardXp } from "@/lib/xp";

export async function submitAssignment(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");
  const role = effectiveRole(session);
  if (role !== "student") throw new Error("Nur Schüler:innen können Aufgaben abgeben");

  const assignmentId = String(formData.get("assignmentId") ?? "");
  const content = String(formData.get("content") ?? "");
  if (!assignmentId) throw new Error("assignmentId fehlt");

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

  await awardXp(session.userId, "aufgabe_abgabe", assignmentId);

  revalidatePath("/app/aufgaben");
  redirect("/app/aufgaben");
}
