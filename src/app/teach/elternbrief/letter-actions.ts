/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use server";

import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { can } from "@/lib/permissions";
import { pushToUsers } from "@/lib/push";

/**
 * Elternbrief einer Lehrkraft einstellen.
 *
 * Der Brief wird als ConsentForm gespeichert — dieselbe Struktur, die die
 * Verwaltung für Einwilligungen nutzt. Dadurch greift die bestehende digitale
 * Bestätigung der Eltern unter /eltern/einwilligungen ohne Zweitsystem.
 */

/** Nur Formate, die Eltern auf jedem Gerät öffnen können. */
const ALLOWED_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

function fail(msg: string): never {
  redirect(`/teach/elternbrief?error=${encodeURIComponent(msg)}`);
}

export async function publishParentLetter(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "teacher") redirect("/");
  if (!session.schoolId) fail("Kein Schulkontext.");

  // Von der Schulleitung erteiltes Recht — Standard ist aus.
  if (!(await can(session, "teacher.parent_letters"))) {
    fail("Dir fehlt die Berechtigung, Elternbriefe einzustellen.");
  }

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const deadlineStr = String(formData.get("deadline") ?? "").trim();
  const classIds = (formData.getAll("classIds") as string[]).filter(Boolean);
  const file = formData.get("file") as File | null;

  if (!title || !description) fail("Titel und Text sind erforderlich.");
  if (classIds.length === 0) fail("Bitte mindestens eine Klasse auswählen.");

  // Nur an Klassen, die die Lehrkraft auch unterrichtet.
  const own = await prisma.teacherSubjectClass.findMany({
    where: { teacherId: session.userId, classId: { in: classIds } },
    select: { classId: true },
  });
  const allowedClassIds = [...new Set(own.map((o) => o.classId))];
  if (allowedClassIds.length === 0) {
    fail("Du unterrichtest keine der ausgewählten Klassen.");
  }

  // Datei ist optional — ein reiner Textbrief ist auch gültig.
  let fileUrl: string | null = null;
  let fileName: string | null = null;
  if (file && file.size > 0) {
    const ext = ALLOWED_TYPES[file.type];
    if (!ext) fail("Nur PDF, PNG, JPEG oder WebP sind erlaubt.");
    if (file.size > MAX_BYTES) fail("Die Datei darf höchstens 10 MB groß sein.");

    const dir = join(process.cwd(), "public", "uploads", "elternbriefe");
    await mkdir(dir, { recursive: true });
    // Zufälliger Dateiname: der Originalname ist nicht vertrauenswürdig.
    const stored = `${session.schoolId}-${randomUUID()}.${ext}`;
    await writeFile(join(dir, stored), Buffer.from(await file.arrayBuffer()));
    fileUrl = `/uploads/elternbriefe/${stored}`;
    fileName = file.name.slice(0, 120);
  }

  const parsed = deadlineStr ? new Date(deadlineStr) : null;
  const deadline = parsed && !Number.isNaN(parsed.getTime()) ? parsed : null;

  const letter = await prisma.consentForm.create({
    data: {
      schoolId: session.schoolId,
      title,
      description,
      deadline,
      isActive: true,
      targetClassIds: JSON.stringify(allowedClassIds),
      fileUrl,
      fileName,
      createdById: session.userId,
      createdByName: session.name,
    },
  });

  // ── Eltern benachrichtigen ────────────────────────────────────────────────
  const students = await prisma.user.findMany({
    where: {
      role: "student",
      schoolId: session.schoolId,
      classId: { in: allowedClassIds },
    },
    select: { id: true },
  });

  const links = await prisma.parentStudentLink.findMany({
    where: { studentId: { in: students.map((s) => s.id) } },
    select: { parentId: true },
  });
  const parentIds = [...new Set(links.map((l) => l.parentId))];

  if (parentIds.length > 0) {
    const body = `${session.name}: ${title} — bitte digital bestätigen.`;
    await prisma.appNotification.createMany({
      data: parentIds.map((userId) => ({
        userId,
        type: "consent",
        title: "Neuer Elternbrief",
        body,
        linkUrl: "/eltern/einwilligungen",
      })),
    });

    // Push darf das Einstellen nicht scheitern lassen.
    pushToUsers(parentIds, {
      title: "Neuer Elternbrief",
      body,
      url: "/eltern/einwilligungen",
      data: { type: "consent", formId: letter.id },
    }).catch(() => undefined);
  }

  revalidatePath("/teach/elternbrief");
  revalidatePath("/eltern/einwilligungen");
  redirect(`/teach/elternbrief?sent=${parentIds.length}`);
}

/** Brief zurückziehen — Eltern sehen ihn danach nicht mehr. */
export async function withdrawParentLetter(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "teacher") redirect("/");

  const id = String(formData.get("id") ?? "");
  // Nur eigene Briefe — nicht die der Verwaltung.
  const letter = await prisma.consentForm.findFirst({
    where: { id, schoolId: session.schoolId ?? "", createdById: session.userId },
    select: { id: true },
  });
  if (!letter) return;

  await prisma.consentForm.update({
    where: { id: letter.id },
    data: { isActive: false },
  });

  revalidatePath("/teach/elternbrief");
  revalidatePath("/eltern/einwilligungen");
}
