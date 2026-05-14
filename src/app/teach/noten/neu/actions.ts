"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { pushToUsers } from "@/lib/push";

export async function saveGrade(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "teacher") return;

  const studentId = (formData.get("studentId") as string | null)?.trim() ?? "";
  const subjectId = (formData.get("subjectId") as string | null)?.trim() ?? "";
  const classSlug = (formData.get("classSlug") as string | null)?.trim() ?? "";
  const rawValue = (formData.get("value") as string | null)?.trim() ?? "";
  const type = (formData.get("type") as string | null)?.trim() ?? "test";
  const comment = (formData.get("comment") as string | null)?.trim() || null;
  const dateStr = (formData.get("date") as string | null)?.trim() ?? "";

  if (!studentId || !subjectId || !rawValue) return;

  const value = parseFloat(rawValue);
  if (isNaN(value) || value < 1 || value > 6) return;

  const date = dateStr ? new Date(dateStr) : new Date();

  const subject = await prisma.subject.findUnique({
    where: { id: subjectId },
    select: { name: true },
  });

  await prisma.grade.create({
    data: {
      studentId,
      teacherId: session.userId,
      subjectId,
      value,
      weight: 1.0,
      type,
      comment,
      date,
    },
  });

  // Push to student (fire-and-forget)
  pushToUsers([studentId], {
    title: "Neue Note eingetragen",
    body: `${subject?.name ?? "Fach"}: ${value.toFixed(1).replace(".", ",")}`,
    url: "/app/noten",
  }).catch(() => {});

  revalidatePath(`/teach/klassen/${classSlug}`);
  redirect(`/teach/klassen/${classSlug}`);
}
