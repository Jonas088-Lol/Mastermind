/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use server";

import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { canManageSchool, canAccessArea } from "@/lib/school-admin";
import { pushToUsers } from "@/lib/push";

/** Nur Formate, die Eltern auf jedem Gerät öffnen können. */
const ALLOWED_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

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

  // Optionaler Elternbrief als Datei — gleiche Regeln wie bei Lehrkräften.
  const file = formData.get("file") as File | null;
  let fileUrl: string | null = null;
  let fileName: string | null = null;
  if (file && file.size > 0) {
    const ext = ALLOWED_TYPES[file.type];
    if (!ext) return;
    if (file.size > MAX_BYTES) return;
    const dir = join(process.cwd(), "public", "uploads", "elternbriefe");
    await mkdir(dir, { recursive: true });
    const stored = `${session.schoolId}-${randomUUID()}.${ext}`;
    await writeFile(join(dir, stored), Buffer.from(await file.arrayBuffer()));
    fileUrl = `/uploads/elternbriefe/${stored}`;
    fileName = file.name.slice(0, 120);
  }

  const form = await prisma.consentForm.create({
    data: {
      schoolId: session.schoolId,
      title,
      description,
      deadline,
      isActive: true,
      targetClassIds,
      fileUrl,
      fileName,
      createdById: session.userId,
      createdByName: session.name,
    },
  });

  // Bisher erfuhren Eltern nichts von einem neuen Formular — es tauchte
  // stillschweigend in ihrer Liste auf. Jetzt wird benachrichtigt.
  const students = await prisma.user.findMany({
    where: {
      role: "student",
      schoolId: session.schoolId,
      ...(targetClassIdsRaw.length > 0 ? { classId: { in: targetClassIdsRaw } } : {}),
    },
    select: { id: true },
  });
  const links = await prisma.parentStudentLink.findMany({
    where: { studentId: { in: students.map((s) => s.id) } },
    select: { parentId: true },
  });
  const parentIds = [...new Set(links.map((l) => l.parentId))];

  if (parentIds.length > 0) {
    const body = `${title} — bitte digital bestätigen.`;
    await prisma.appNotification.createMany({
      data: parentIds.map((userId) => ({
        userId,
        type: "consent",
        title: "Neuer Elternbrief",
        body,
        linkUrl: "/eltern/einwilligungen",
      })),
    });
    // Push darf das Anlegen nicht scheitern lassen.
    pushToUsers(parentIds, {
      title: "Neuer Elternbrief",
      body,
      url: "/eltern/einwilligungen",
      data: { type: "consent", formId: form.id },
    }).catch(() => undefined);
  }

  revalidatePath("/admin/einwilligungen");
  revalidatePath("/eltern/einwilligungen");
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
