/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { canManageSchool, canAccessArea } from "@/lib/school-admin";

/** Zugriff prüfen und Session mit Schul-ID liefern. */
async function guard() {
  const session = await getSession();
  if (!session || !canManageSchool(effectiveRole(session))) redirect("/login");
  if (!canAccessArea(effectiveRole(session), "notenschluessel")) redirect("/admin");
  if (!session.schoolId) redirect("/admin");
  return session;
}

/** Liest die 6 Notenstufen aus dem Formular. */
function readEntries(formData: FormData) {
  const entries: { grade: string; label: string; minPercent: number }[] = [];
  for (let g = 1; g <= 6; g++) {
    const label = (formData.get(`label_${g}`) as string | null)?.trim() || String(g);
    const raw = formData.get(`minPercent_${g}`) as string | null;
    const minPercent = raw !== null ? parseFloat(raw) : NaN;
    if (!isNaN(minPercent) && minPercent >= 0 && minPercent <= 100) {
      entries.push({ grade: String(g), label, minPercent });
    }
  }
  return entries;
}

/** Genau ein Standard je Schule — alle anderen zurücksetzen. */
async function setDefaultInternal(schoolId: string, scaleId: string) {
  await prisma.$transaction([
    prisma.gradeScale.updateMany({ where: { schoolId }, data: { isDefault: false } }),
    prisma.gradeScale.update({ where: { id: scaleId }, data: { isDefault: true } }),
  ]);
}

/**
 * Legt einen Notenschlüssel an oder aktualisiert ihn.
 * Ohne `id` entsteht ein neuer — so sind mehrere je Schule möglich
 * (z. B. je einer für den R- und den M-Zweig).
 */
export async function saveGradeScale(formData: FormData): Promise<void> {
  const session = await guard();
  const schoolId = session.schoolId!;

  const id = (formData.get("id") as string | null)?.trim() || null;
  const name = (formData.get("name") as string | null)?.trim() || "Notenschlüssel";
  const description = (formData.get("description") as string | null)?.trim() || null;
  const isDefault = formData.get("isDefault") === "on";

  const entries = readEntries(formData);
  if (entries.length === 0) return;

  let scaleId = id;
  if (id) {
    // Nur eigene Schlüssel bearbeiten (kein Zugriff auf fremde Schulen).
    const existing = await prisma.gradeScale.findUnique({
      where: { id },
      select: { schoolId: true },
    });
    if (!existing || existing.schoolId !== schoolId) return;

    await prisma.$transaction([
      prisma.gradeScaleEntry.deleteMany({ where: { gradeScaleId: id } }),
      prisma.gradeScale.update({
        where: { id },
        data: { name, description, entries: { create: entries } },
      }),
    ]);
  } else {
    const created = await prisma.gradeScale.create({
      data: { schoolId, name, description, entries: { create: entries } },
      select: { id: true },
    });
    scaleId = created.id;
  }

  // Erster Schlüssel der Schule wird automatisch Standard.
  const count = await prisma.gradeScale.count({ where: { schoolId } });
  if (scaleId && (isDefault || count === 1)) {
    await setDefaultInternal(schoolId, scaleId);
  }

  revalidatePath("/admin/notenschluessel");
  revalidatePath("/teach/notenschluessel");
  redirect("/admin/notenschluessel");
}

export async function setDefaultGradeScale(formData: FormData): Promise<void> {
  const session = await guard();
  const id = (formData.get("id") as string | null)?.trim();
  if (!id) return;

  const scale = await prisma.gradeScale.findUnique({
    where: { id },
    select: { schoolId: true },
  });
  if (!scale || scale.schoolId !== session.schoolId) return;

  await setDefaultInternal(session.schoolId!, id);
  revalidatePath("/admin/notenschluessel");
  revalidatePath("/teach/notenschluessel");
}

export async function deleteGradeScale(formData: FormData): Promise<void> {
  const session = await guard();
  const id = (formData.get("id") as string | null)?.trim();
  if (!id) return;

  const scale = await prisma.gradeScale.findUnique({
    where: { id },
    select: { schoolId: true, isDefault: true },
  });
  if (!scale || scale.schoolId !== session.schoolId) return;

  await prisma.gradeScale.delete({ where: { id } });

  // War es der Standard, rückt der älteste verbleibende nach — sonst hätte
  // die Schule keinen vorausgewählten Schlüssel mehr.
  if (scale.isDefault) {
    const next = await prisma.gradeScale.findFirst({
      where: { schoolId: session.schoolId! },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    if (next) await setDefaultInternal(session.schoolId!, next.id);
  }

  revalidatePath("/admin/notenschluessel");
  revalidatePath("/teach/notenschluessel");
}
