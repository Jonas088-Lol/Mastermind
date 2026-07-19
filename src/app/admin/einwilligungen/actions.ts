/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { canManageSchool, canAccessArea } from "@/lib/school-admin";

async function requireAdmin() {
  const session = await getSession();
  if (!session) return null;
  if (!canManageSchool(effectiveRole(session))) return null;
  if (!canAccessArea(effectiveRole(session), "einwilligungen")) redirect("/admin");
  return session;
}

export async function createConsentForm(formData: FormData): Promise<void> {
  const session = await requireAdmin();
  if (!session) return;

  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const deadlineStr = (formData.get("deadline") as string) || null;
  const targetClassIdsRaw = formData.getAll("targetClassIds") as string[];

  if (!title || !description) return;
  if (!session.schoolId) return;

  const targetClassIds =
    targetClassIdsRaw.length > 0 ? JSON.stringify(targetClassIdsRaw) : null;

  // Ungültige Datumseingabe darf keine "Invalid Date" an Prisma (DateTime?) geben
  const deadlineParsed = deadlineStr ? new Date(deadlineStr) : null;
  const deadline = deadlineParsed && !isNaN(deadlineParsed.getTime()) ? deadlineParsed : null;

  await prisma.consentForm.create({
    data: {
      schoolId: session.schoolId,
      title,
      description,
      deadline,
      isActive: true,
      targetClassIds,
    },
  });

  revalidatePath("/admin/einwilligungen");
}

export async function toggleConsentForm(formId: string): Promise<void> {
  const session = await requireAdmin();
  if (!session) return;

  const form = await prisma.consentForm.findFirst({
    where: { id: formId, schoolId: session.schoolId ?? "" },
    select: { isActive: true },
  });
  if (!form) return;

  await prisma.consentForm.update({
    where: { id: formId },
    data: { isActive: !form.isActive },
  });

  revalidatePath("/admin/einwilligungen");
}
