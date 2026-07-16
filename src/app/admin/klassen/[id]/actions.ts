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

export async function updateClass(classId: string, formData: FormData): Promise<void> {
  const session = await guardAdmin();

  const name = (formData.get("name") as string | null)?.trim().toUpperCase() ?? "";
  const grade = parseInt((formData.get("grade") as string | null) ?? "0", 10);
  if (!name || !grade) return;

  const klass = await prisma.schoolClass.findUnique({ where: { id: classId }, select: { schoolId: true } });
  if (!klass || klass.schoolId !== session.schoolId) return;

  await prisma.schoolClass.update({ where: { id: classId }, data: { name, grade } });
  revalidatePath(`/admin/klassen/${classId}`);
  revalidatePath("/admin/klassen");
}

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
      `Klasse "${klass.name}" kann nicht gelöscht werden – es sind noch ${klass._count.students} Schüler zugewiesen.`
    );
  }

  await prisma.schoolClass.delete({ where: { id: classId } });
  revalidatePath("/admin/klassen");
  redirect("/admin/klassen");
}

export async function assignStudent(classId: string, formData: FormData): Promise<void> {
  const session = await guardAdmin();

  const userId = (formData.get("userId") as string | null)?.trim() ?? "";
  if (!userId) return;

  const [klass, user] = await Promise.all([
    prisma.schoolClass.findUnique({ where: { id: classId }, select: { schoolId: true } }),
    prisma.user.findUnique({ where: { id: userId }, select: { schoolId: true, role: true } }),
  ]);
  if (!klass || klass.schoolId !== session.schoolId) return;
  if (!user || user.schoolId !== session.schoolId || user.role !== "student") return;

  await prisma.user.update({ where: { id: userId }, data: { classId } });
  revalidatePath(`/admin/klassen/${classId}`);
}

export async function removeStudent(classId: string, userId: string): Promise<void> {
  const session = await guardAdmin();

  const [klass, student] = await Promise.all([
    prisma.schoolClass.findUnique({ where: { id: classId }, select: { schoolId: true } }),
    prisma.user.findUnique({ where: { id: userId }, select: { schoolId: true, role: true } }),
  ]);
  if (!klass || klass.schoolId !== session.schoolId) return;
  if (!student || student.schoolId !== session.schoolId || student.role !== "student") return;

  await prisma.user.update({ where: { id: userId }, data: { classId: null } });
  revalidatePath(`/admin/klassen/${classId}`);
}

/**
 * Ordnet eine Lehrkraft mit einem Fach einer Klasse zu.
 * Lehrkraft, Fach und Klasse müssen zur eigenen Schule gehören.
 */
export async function assignTeacherToClass(formData: FormData): Promise<void> {
  const session = await guardAdmin();

  const classId = String(formData.get("classId") ?? "").trim();
  const teacherId = String(formData.get("teacherId") ?? "").trim();
  const subjectId = String(formData.get("subjectId") ?? "").trim();
  if (!classId || !teacherId || !subjectId) return;

  // Alles gegen die eigene Schule prüfen (kein Zugriff auf fremde Schulen).
  const [klass, teacher, subject] = await Promise.all([
    prisma.schoolClass.findUnique({ where: { id: classId }, select: { schoolId: true } }),
    prisma.user.findUnique({ where: { id: teacherId }, select: { schoolId: true, role: true } }),
    prisma.subject.findUnique({ where: { id: subjectId }, select: { schoolId: true } }),
  ]);
  if (!klass || klass.schoolId !== session.schoolId) return;
  if (!teacher || teacher.schoolId !== session.schoolId || teacher.role !== "teacher") return;
  if (!subject || subject.schoolId !== session.schoolId) return;

  // Idempotent: doppelte Zuordnung ist kein Fehler (@@unique).
  await prisma.teacherSubjectClass.upsert({
    where: { teacherId_subjectId_classId: { teacherId, subjectId, classId } },
    create: { teacherId, subjectId, classId },
    update: {},
  });

  revalidatePath(`/admin/klassen/${classId}`);
  revalidatePath("/teach/uebungen");
}

/** Entfernt eine Lehrkraft-Fach-Zuordnung aus einer Klasse. */
export async function unassignTeacherFromClass(formData: FormData): Promise<void> {
  const session = await guardAdmin();

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;

  const row = await prisma.teacherSubjectClass.findUnique({
    where: { id },
    select: { classId: true, class: { select: { schoolId: true } } },
  });
  if (!row || row.class.schoolId !== session.schoolId) return;

  await prisma.teacherSubjectClass.delete({ where: { id } });

  revalidatePath(`/admin/klassen/${row.classId}`);
  revalidatePath("/teach/uebungen");
}
