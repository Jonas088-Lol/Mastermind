"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";

export async function updateSubject(id: string, formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "admin") redirect("/login");
  if (!session.schoolId) return;

  const name = (formData.get("name") as string | null)?.trim() ?? "";
  const shortName = (formData.get("shortName") as string | null)?.trim().toUpperCase() ?? "";
  const color = (formData.get("color") as string | null)?.trim() ?? "#6366f1";

  if (!name || !shortName) return;

  await prisma.subject.updateMany({
    where: { id, schoolId: session.schoolId },
    data: { name, shortName, color },
  });

  revalidatePath("/admin/faecher");
  redirect("/admin/faecher");
}

export async function deleteSubject(id: string): Promise<void> {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "admin") return;
  if (!session.schoolId) return;

  await prisma.subject.deleteMany({
    where: { id, schoolId: session.schoolId },
  });

  revalidatePath("/admin/faecher");
}
