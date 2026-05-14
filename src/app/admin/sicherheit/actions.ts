"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { ROLE_HOME, effectiveRole, getSession } from "@/lib/session";

export async function sendTwoFAReminders(): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "admin") redirect(ROLE_HOME[effectiveRole(session)]);

  const schoolId = session.schoolId;
  const teachers = await prisma.user.findMany({
    where: { ...(schoolId ? { schoolId } : {}), role: "teacher", twoFactor: false },
    select: { id: true },
  });

  if (teachers.length === 0) return;

  await prisma.appNotification.createMany({
    data: teachers.map((t) => ({
      userId: t.id,
      type: "system",
      title: "Bitte 2FA aktivieren",
      body: "Die Schulleitung bittet Sie, die Zwei-Faktor-Authentifizierung in Ihrem Profil zu aktivieren.",
      linkUrl: "/profil/sicherheit",
    })),
  });

  revalidatePath("/admin/sicherheit");
}
