/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { canManageSchool, canAccessArea } from "@/lib/school-admin";

export async function updateSubject(id: string, formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session || !canManageSchool(effectiveRole(session))) redirect("/login");
  if (!canAccessArea(effectiveRole(session), "faecher")) redirect("/admin");
  if (!session.schoolId) return;

  const name = (formData.get("name") as string | null)?.trim() ?? "";
  const shortName = (formData.get("shortName") as string | null)?.trim().toUpperCase() ?? "";
  const color = (formData.get("color") as string | null)?.trim() ?? "#6366f1";
  const category = (formData.get("category") as string | null)?.trim() || "allgemein";

  if (!name || !shortName) return;

  await prisma.subject.updateMany({
    where: { id, schoolId: session.schoolId },
    data: { name, shortName, color, category },
  });

  revalidatePath("/admin/faecher");
  redirect("/admin/faecher");
}

export async function deleteSubject(id: string): Promise<void> {
  const session = await getSession();
  if (!session || !canManageSchool(effectiveRole(session))) return;
  if (!session.schoolId) return;

  const subject = await prisma.subject.findFirst({
    where: { id, schoolId: session.schoolId },
    select: {
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

  if (!subject) return;

  const usageCount =
    subject._count.timetableEntries +
    subject._count.teacherSubjectClasses +
    subject._count.assignments;

  if (usageCount > 0) {
    throw new Error(
      `Fach "${subject.name}" wird noch verwendet: ${subject._count.timetableEntries} Stundenplan-Einträge, ${subject._count.teacherSubjectClasses} Klassen-Zuweisungen, ${subject._count.assignments} Aufgaben.`
    );
  }

  await prisma.subject.deleteMany({
    where: { id, schoolId: session.schoolId },
  });

  revalidatePath("/admin/faecher");
  redirect("/admin/faecher");
}
