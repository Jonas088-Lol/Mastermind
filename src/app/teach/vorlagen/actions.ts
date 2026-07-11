"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";

export interface TemplateActionResult {
  ok: boolean;
  error?: string;
}

export async function createTemplate(formData: FormData): Promise<TemplateActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Nicht angemeldet" };
  if (effectiveRole(session) !== "teacher") return { ok: false, error: "Nur für Lehrkräfte" };
  if (!session.schoolId) return { ok: false, error: "Keine Schule zugeordnet" };

  const title = ((formData.get("title") as string | null) ?? "").trim().slice(0, 200);
  const description = ((formData.get("description") as string | null) ?? "").trim().slice(0, 2000);
  const subjectName = ((formData.get("subjectName") as string | null) ?? "").trim().slice(0, 100);
  const taskText = ((formData.get("taskText") as string | null) ?? "").trim().slice(0, 8000);
  const type = ((formData.get("type") as string | null) ?? "homework").trim().slice(0, 40);
  const maxPointsRaw = ((formData.get("maxPoints") as string | null) ?? "").trim();

  if (!title) return { ok: false, error: "Titel ist Pflicht" };

  const maxPoints = maxPointsRaw ? parseInt(maxPointsRaw, 10) : null;

  const content = JSON.stringify({
    taskText,
    type,
    maxPoints: maxPoints != null && !isNaN(maxPoints) ? maxPoints : null,
  });

  await prisma.assignmentTemplate.create({
    data: {
      schoolId: session.schoolId,
      teacherId: session.userId,
      teacherName: session.name || "Lehrkraft",
      title,
      description: description || null,
      subjectName: subjectName || null,
      content,
      shared: (formData.get("shared") as string | null) === "on",
    },
  });

  revalidatePath("/teach/vorlagen");
  return { ok: true };
}

export async function toggleShared(templateId: string): Promise<TemplateActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Nicht angemeldet" };
  if (effectiveRole(session) !== "teacher") return { ok: false, error: "Nur für Lehrkräfte" };

  const id = templateId.trim().slice(0, 64);
  const tpl = await prisma.assignmentTemplate.findFirst({
    where: { id, teacherId: session.userId, schoolId: session.schoolId ?? "" },
    select: { id: true, shared: true },
  });
  if (!tpl) return { ok: false, error: "Vorlage nicht gefunden" };

  await prisma.assignmentTemplate.update({
    where: { id: tpl.id },
    data: { shared: !tpl.shared },
  });

  revalidatePath("/teach/vorlagen");
  return { ok: true };
}

export async function deleteTemplate(templateId: string): Promise<TemplateActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Nicht angemeldet" };
  if (effectiveRole(session) !== "teacher") return { ok: false, error: "Nur für Lehrkräfte" };

  const id = templateId.trim().slice(0, 64);
  const res = await prisma.assignmentTemplate.deleteMany({
    where: { id, teacherId: session.userId, schoolId: session.schoolId ?? "" },
  });
  if (res.count === 0) return { ok: false, error: "Vorlage nicht gefunden" };

  revalidatePath("/teach/vorlagen");
  return { ok: true };
}
