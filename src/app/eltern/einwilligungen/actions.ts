/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";

export async function respondToConsent(
  formId: string,
  studentId: string,
  agreed: boolean
): Promise<void> {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "parent") redirect("/login");

  // Verify parent is linked to this student
  const link = await prisma.parentStudentLink.findUnique({
    where: { parentId_studentId: { parentId: session.userId, studentId } },
  });
  if (!link) return;

  // Verify the consent form belongs to the parent's school
  const form = await prisma.consentForm.findFirst({
    where: { id: formId, schoolId: session.schoolId ?? "" },
  });
  if (!form) return;

  await prisma.consentResponse.upsert({
    where: {
      formId_parentId_studentId: {
        formId,
        parentId: session.userId,
        studentId,
      },
    },
    create: {
      formId,
      parentId: session.userId,
      studentId,
      agreed,
      respondedAt: new Date(),
    },
    update: {
      agreed,
      respondedAt: new Date(),
    },
  });

  revalidatePath("/eltern/einwilligungen");
}
