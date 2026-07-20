/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { canManageSchool, canAccessArea } from "@/lib/school-admin";

async function requireAdmin() {
  const session = await getSession();
  if (!session) return null;
  if (!canManageSchool(effectiveRole(session))) return null;
  if (!canAccessArea(effectiveRole(session), "fehlzeiten")) redirect("/admin");
  return session;
}

export async function confirmAbsence(absenceId: string): Promise<void> {
  const session = await requireAdmin();
  if (!session) return;

  // updateMany statt update: kein P2025-Crash bei fremder/veralteter ID
  await prisma.absence.updateMany({
    where: { id: absenceId, schoolId: session.schoolId ?? "" },
    data: {
      status: "confirmed",
      confirmedById: session.userId,
      confirmedAt: new Date(),
    },
  });

  revalidatePath("/admin/fehlzeiten");
}

export async function rejectAbsence(absenceId: string): Promise<void> {
  const session = await requireAdmin();
  if (!session) return;

  await prisma.absence.updateMany({
    where: { id: absenceId, schoolId: session.schoolId ?? "" },
    data: {
      status: "rejected",
      confirmedById: session.userId,
      confirmedAt: new Date(),
    },
  });

  revalidatePath("/admin/fehlzeiten");
}
