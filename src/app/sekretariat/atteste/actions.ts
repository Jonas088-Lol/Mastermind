/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";

async function requireSecretary() {
  const session = await getSession();
  if (!session) redirect("/login");
  const role = effectiveRole(session);
  if (!["secretary", "rector", "vice_rector", "admin", "super"].includes(role)) redirect("/login");
  return session;
}

export async function confirmAttest(absenceId: string): Promise<void> {
  const session = await requireSecretary();

  await prisma.absence.update({
    where: { id: absenceId, schoolId: session.schoolId ?? "" },
    data: {
      status: "confirmed",
      confirmedById: session.userId,
      confirmedAt: new Date(),
    },
  });

  revalidatePath("/sekretariat/atteste");
}

export async function rejectAttest(absenceId: string): Promise<void> {
  const session = await requireSecretary();

  await prisma.absence.update({
    where: { id: absenceId, schoolId: session.schoolId ?? "" },
    data: {
      status: "rejected",
      confirmedById: session.userId,
      confirmedAt: new Date(),
    },
  });

  revalidatePath("/sekretariat/atteste");
}
