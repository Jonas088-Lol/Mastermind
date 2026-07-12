/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { auditLog } from "@/lib/audit";
import { sendEmail, twoFactorResetEmail } from "@/lib/email";
import { effectiveRole, getSession, isAssignableRole } from "@/lib/session";

export async function updateUserRole(userId: string, formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "admin") redirect("/admin");

  const role = formData.get("role");
  // Nur vom Admin vergebbare Rollen zulassen — verhindert Eskalation auf
  // "super" / "school_company" über ein manipuliertes Formularfeld.
  if (!isAssignableRole(role)) return;

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, schoolId: true, role: true },
  });
  if (!target || target.schoolId !== session.schoolId) return;

  // Ein bestehender plattformweiter Account darf nicht vom Schul-Admin
  // umgeschrieben werden (weder hoch- noch herabgestuft).
  if (target.role === "super" || target.role === "school_company") return;

  await prisma.user.update({ where: { id: userId }, data: { role } });
  await auditLog({
    action: "user.role_changed",
    actorId: session.userId,
    targetId: userId,
    schoolId: session.schoolId ?? undefined,
    details: { newRole: role, oldRole: target.role },
  }).catch(() => undefined);
  revalidatePath(`/admin/nutzer/${userId}`);
}

export async function updateUserClass(userId: string, formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "admin") redirect("/admin");

  const raw = formData.get("classId") as string;
  const classId = raw || null;

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target || target.schoolId !== session.schoolId) return;

  // Klasse muss zur eigenen Schule gehören — sonst schulfremde Zuweisung möglich
  if (classId) {
    const klass = await prisma.schoolClass.findUnique({
      where: { id: classId },
      select: { schoolId: true },
    });
    if (!klass || klass.schoolId !== session.schoolId) return;
  }

  await prisma.user.update({ where: { id: userId }, data: { classId } });
  revalidatePath(`/admin/nutzer/${userId}`);
}

export async function updateStudentFeatures(userId: string, formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "admin") redirect("/admin");

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target || target.schoolId !== session.schoolId) return;
  if (target.role !== "student") return;

  const { serializeStudentFeatures } = await import("@/lib/student-features");
  const features = serializeStudentFeatures(formData.getAll("features").map(String));
  await prisma.user.update({ where: { id: userId }, data: { studentFeatures: features } });
  revalidatePath(`/admin/nutzer/${userId}`);
}

export async function deleteUser(userId: string): Promise<void> {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "admin") redirect("/admin");

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target || target.schoolId !== session.schoolId) return;
  if (target.id === session.userId) return;

  await auditLog({
    schoolId: session.schoolId ?? undefined,
    actorId: session.userId,
    targetId: userId,
    action: "user.deleted",
    details: { role: target.role, email: target.email },
  });

  await prisma.user.delete({ where: { id: userId } });
  redirect("/admin/nutzer");
}

export async function resetTwoFactor(userId: string): Promise<void> {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "admin") redirect("/admin");

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, schoolId: true },
  });
  if (!target || target.schoolId !== session.schoolId) return;

  const adminUser = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { name: true },
  });

  await prisma.user.update({
    where: { id: userId },
    data: { twoFactor: false, twoFactorSecret: null },
  });
  await prisma.backupCode.deleteMany({ where: { userId } });

  await auditLog({
    schoolId: session.schoolId ?? undefined,
    actorId: session.userId,
    targetId: userId,
    action: "user.2fa_reset",
  });

  await sendEmail(
    twoFactorResetEmail({
      email: target.email,
      adminName: adminUser?.name ?? "Administrator",
    })
  );

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

  // Link muss zu diesem Elternteil gehören — sonst Löschen beliebiger fremder Links
  await prisma.parentStudentLink.deleteMany({ where: { id: linkId, parentId } });

  revalidatePath(`/admin/nutzer/${parentId}`);
}
