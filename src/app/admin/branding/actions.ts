"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { ROLE_HOME, effectiveRole, getSession } from "@/lib/session";

export async function saveBranding(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "admin") redirect(ROLE_HOME[effectiveRole(session)]);
  if (!session.schoolId) return;

  const schoolName = (formData.get("schoolName") as string | null)?.trim() ?? "";
  if (!schoolName) return;

  await prisma.school.update({
    where: { id: session.schoolId },
    data: { name: schoolName },
  });

  revalidatePath("/admin/branding");
  revalidatePath("/admin");
}
