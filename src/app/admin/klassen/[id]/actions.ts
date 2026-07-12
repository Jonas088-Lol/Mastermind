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
