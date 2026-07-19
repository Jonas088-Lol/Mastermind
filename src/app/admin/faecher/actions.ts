/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { canManageSchool, canAccessArea } from "@/lib/school-admin";

async function guardAdmin() {
  const session = await getSession();
  if (!session || !canManageSchool(effectiveRole(session))) redirect("/login");
  if (!canAccessArea(effectiveRole(session), "faecher")) redirect("/admin");
  if (!session.schoolId) redirect("/admin");
  return session;
}

/**
 * Deletes a subject. Warns if the subject is still referenced in timetable or
 * assignments — but proceeds with deletion (cascades are handled by Prisma/DB).
 *
 * Throws a user-visible error when the subject still has active timetable entries
 * or open assignments to prevent accidental data loss.
 */
export async function deleteSubject(subjectId: string): Promise<void> {
  const session = await guardAdmin();

  const subject = await prisma.subject.findUnique({
    where: { id: subjectId },
    select: {
      schoolId: true,
      name: true,
      _count: {
        select: {
          timetableEntries: true,
          teacherSubjectClasses: true,
          assignments: true,
        },
      },
    },
  });

  if (!subject || subject.schoolId !== session.schoolId) return;

  const usageCount =
    subject._count.timetableEntries +
    subject._count.teacherSubjectClasses +
    subject._count.assignments;

  if (usageCount > 0) {
    throw new Error(
      `Fach "${subject.name}" wird noch verwendet: ${subject._count.timetableEntries} Stundenplan-Einträge, ${subject._count.teacherSubjectClasses} Klassen-Zuweisungen, ${subject._count.assignments} Aufgaben. Entferne alle Zuweisungen bevor du das Fach löscht.`
    );
  }

  await prisma.subject.delete({ where: { id: subjectId } });

  revalidatePath("/admin/faecher");
  redirect("/admin/faecher");
}
