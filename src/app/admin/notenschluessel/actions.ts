/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";

export async function saveGradeScale(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "admin") redirect("/login");
  if (!session.schoolId) return;

  const name = (formData.get("name") as string | null)?.trim() || "Notenschlüssel";

  // Collect entries — expect fields: grade_1..6 and minPercent_1..6
  const entries: { grade: string; label: string; minPercent: number }[] = [];
  for (let g = 1; g <= 6; g++) {
    const label = (formData.get(`label_${g}`) as string | null)?.trim() || String(g);
    const minPercentRaw = formData.get(`minPercent_${g}`) as string | null;
    const minPercent = minPercentRaw !== null ? parseFloat(minPercentRaw) : NaN;
    if (!isNaN(minPercent) && minPercent >= 0 && minPercent <= 100) {
      entries.push({ grade: String(g), label, minPercent });
    }
  }

  if (entries.length === 0) return;

  const existing = await prisma.gradeScale.findUnique({ where: { schoolId: session.schoolId } });

  if (existing) {
    await prisma.$transaction([
      prisma.gradeScaleEntry.deleteMany({ where: { gradeScaleId: existing.id } }),
      prisma.gradeScale.update({
        where: { id: existing.id },
        data: {
          name,
          entries: { create: entries },
        },
      }),
    ]);
  } else {
    await prisma.gradeScale.create({
      data: {
        schoolId: session.schoolId,
        name,
        entries: { create: entries },
      },
    });
  }

  revalidatePath("/admin/notenschluessel");
  revalidatePath("/teach/notenschluessel");
  redirect("/admin/notenschluessel");
}
