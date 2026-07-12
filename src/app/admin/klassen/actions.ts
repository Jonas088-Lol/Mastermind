/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";

async function guardAdmin() {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "admin") redirect("/login");
  if (!session.schoolId) redirect("/admin");
  return session;
}

/**
 * Deletes a class only if it has no students enrolled.
 * Throws a user-visible error if students are still assigned.
 */
export async function deleteClass(classId: string): Promise<void> {
  const session = await guardAdmin();

  const klass = await prisma.schoolClass.findUnique({
    where: { id: classId },
    select: {
      schoolId: true,
      name: true,
      _count: { select: { students: true } },
    },
  });

  if (!klass || klass.schoolId !== session.schoolId) return;

  if (klass._count.students > 0) {
    throw new Error(
      `Klasse "${klass.name}" kann nicht gelöscht werden – es sind noch ${klass._count.students} Schüler zugewiesen. Weise die Schüler zuerst einer anderen Klasse zu.`
    );
  }

  await prisma.schoolClass.delete({ where: { id: classId } });

  revalidatePath("/admin/klassen");
  redirect("/admin/klassen");
}
