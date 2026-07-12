/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { ROLE_HOME, effectiveRole, getSession } from "@/lib/session";

export async function confirmAbsence(absenceId: string): Promise<void> {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "teacher") redirect(ROLE_HOME["teacher"]);

  await prisma.absence.updateMany({
    where: { id: absenceId, schoolId: session.schoolId ?? undefined },
    data: { status: "confirmed", confirmedById: session.userId, confirmedAt: new Date() },
  });
  revalidatePath("/teach/abwesenheit");
}

export async function rejectAbsence(absenceId: string): Promise<void> {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "teacher") redirect(ROLE_HOME["teacher"]);

  await prisma.absence.updateMany({
    where: { id: absenceId, schoolId: session.schoolId ?? undefined },
    data: { status: "rejected", confirmedById: session.userId, confirmedAt: new Date() },
  });
  revalidatePath("/teach/abwesenheit");
}
