/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { hashPassword } from "@/lib/auth/passwords";
import { effectiveRole, getSession } from "@/lib/session";
import { sendAccountVerification } from "@/lib/account-invite";

export async function registerNewStudent(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/login");
  const role = effectiveRole(session);
  if (!["secretary", "rector", "vice_rector", "admin", "super"].includes(role)) redirect("/login");

  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const classId = (formData.get("classId") as string) || null;
  const klasse = (formData.get("klasse") as string) || null;
  const parentEmail = (formData.get("parentEmail") as string) || null;

  if (!name || !email) return;
  if (!session.schoolId) redirect("/sekretariat");

  const schoolId = session.schoolId;

  // Doppelte E-Mail würde am Unique-Constraint crashen (Fehlerseite)
  const existing = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
    select: { id: true },
  });
  if (existing) return;

  // Klasse muss zur eigenen Schule gehören — sonst schulfremde Zuweisung möglich
  if (classId) {
    const klass = await prisma.schoolClass.findUnique({
      where: { id: classId },
      select: { schoolId: true },
    });
    if (!klass || klass.schoolId !== schoolId) return;
  }

  // Temporäres Passwort wie in admin/nutzer/neu — kein leerer Hash, sonst
  // ist Login unmöglich und kein Passwort-Reset-Flow greift.
  const tempPassword = randomBytes(8).toString("hex");
  const passwordHash = await hashPassword(tempPassword);

  const student = await prisma.user.create({
    data: {
      name,
      email: email.trim().toLowerCase(),
      passwordHash,
      role: "student",
      schoolId,
      classId: classId || null,
      klasse: klasse || null,
    },
  });

  // Bestätigungs-Mail mit Verifizierungslink — dort setzt der Schüler sein
  // eigenes Passwort (das Temp-Passwort wird nie verschickt).
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { name: true },
  });
  await sendAccountVerification({
    userId: student.id,
    email: student.email,
    name,
    schoolName: school?.name,
  });

  if (parentEmail) {
    const parent = await prisma.user.findFirst({
      where: { email: parentEmail, schoolId, role: "parent" },
    });
    if (parent) {
      await prisma.parentStudentLink.upsert({
        where: { parentId_studentId: { parentId: parent.id, studentId: student.id } },
        create: { parentId: parent.id, studentId: student.id },
        update: {},
      });
    }
  }

  revalidatePath("/sekretariat/schueler");
  redirect("/sekretariat/schueler");
}
