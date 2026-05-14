"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";

async function requireSecretary() {
  const session = await getSession();
  if (!session) return null;
  const role = effectiveRole(session);
  if (!["secretary", "rector", "vice_rector", "admin", "super"].includes(role)) return null;
  return session;
}

export async function confirmAbsence(absenceId: string): Promise<void> {
  const session = await requireSecretary();
  if (!session) return;

  await prisma.absence.update({
    where: { id: absenceId },
    data: {
      status: "confirmed",
      confirmedById: session.userId,
      confirmedAt: new Date(),
    },
  });

  revalidatePath("/sekretariat/fehlzeiten");
}

export async function rejectAbsence(absenceId: string): Promise<void> {
  const session = await requireSecretary();
  if (!session) return;

  await prisma.absence.update({
    where: { id: absenceId },
    data: {
      status: "rejected",
      confirmedById: session.userId,
      confirmedAt: new Date(),
    },
  });

  revalidatePath("/sekretariat/fehlzeiten");
}
