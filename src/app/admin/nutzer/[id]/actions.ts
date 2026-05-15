"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";

export async function updateUserRole(userId: string, formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "admin") redirect("/admin");

  const role = formData.get("role") as string;
  if (!role) return;

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target || target.schoolId !== session.schoolId) return;

  await prisma.user.update({ where: { id: userId }, data: { role } });
  revalidatePath(`/admin/nutzer/${userId}`);
}

export async function updateUserClass(userId: string, formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "admin") redirect("/admin");

  const raw = formData.get("classId") as string;
  const classId = raw || null;

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target || target.schoolId !== session.schoolId) return;

  await prisma.user.update({ where: { id: userId }, data: { classId } });
  revalidatePath(`/admin/nutzer/${userId}`);
}

export async function deleteUser(userId: string): Promise<void> {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "admin") redirect("/admin");

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target || target.schoolId !== session.schoolId) return;
  if (target.id === session.userId) return;

  await prisma.user.delete({ where: { id: userId } });
  redirect("/admin/nutzer");
}

export async function resetTwoFactor(userId: string): Promise<void> {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "admin") redirect("/admin");

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target || target.schoolId !== session.schoolId) return;

  await prisma.user.update({
    where: { id: userId },
    data: { twoFactor: false, twoFactorSecret: null },
  });
  await prisma.backupCode.deleteMany({ where: { userId } });
  revalidatePath(`/admin/nutzer/${userId}`);
}

export async function linkParentToStudent(parentId: string, formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "admin") redirect("/admin");

  const studentEmail = (formData.get("studentEmail") as string | null)?.trim().toLowerCase() ?? "";
  if (!studentEmail) return;

  const parent = await prisma.user.findUnique({ where: { id: parentId } });
  if (!parent || parent.schoolId !== session.schoolId) return;

  const student = await prisma.user.findFirst({
    where: { email: studentEmail, schoolId: session.schoolId, role: "student" },
    select: { id: true },
  });
  if (!student) return;

  await prisma.parentStudentLink.upsert({
    where: { parentId_studentId: { parentId, studentId: student.id } },
    create: { parentId, studentId: student.id },
    update: {},
  });

  revalidatePath(`/admin/nutzer/${parentId}`);
}

export async function unlinkParentFromStudent(parentId: string, linkId: string): Promise<void> {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "admin") redirect("/admin");

  const parent = await prisma.user.findUnique({ where: { id: parentId } });
  if (!parent || parent.schoolId !== session.schoolId) return;

  await prisma.parentStudentLink.delete({ where: { id: linkId } });

  revalidatePath(`/admin/nutzer/${parentId}`);
}
