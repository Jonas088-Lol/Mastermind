"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";

export async function updateAssignment(id: string, formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "teacher") return;

  const assignment = await prisma.assignment.findUnique({
    where: { id },
    select: { teacherId: true },
  });
  if (!assignment || assignment.teacherId !== session.userId) return;

  const title = (formData.get("title") as string | null)?.trim();
  const description = (formData.get("description") as string | null)?.trim() || null;
  const dateStr = (formData.get("dueAt") as string | null)?.trim();
  const maxPointsStr = (formData.get("maxPoints") as string | null)?.trim();
  const type = (formData.get("type") as string | null)?.trim() ?? "homework";

  if (!title || !dateStr) return;

  const dueAt = new Date(dateStr);
  if (isNaN(dueAt.getTime())) return;

  const maxPoints = maxPointsStr ? parseInt(maxPointsStr) : null;

  await prisma.assignment.update({
    where: { id },
    data: { title, description, dueAt, type, maxPoints: maxPoints ?? undefined },
  });

  revalidatePath(`/teach/aufgaben/${id}`);
  redirect(`/teach/aufgaben/${id}`);
}
