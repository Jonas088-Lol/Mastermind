"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";

export async function createSubject(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "admin") redirect("/login");
  if (!session.schoolId) return;

  const name = (formData.get("name") as string | null)?.trim() ?? "";
  const shortName = (formData.get("shortName") as string | null)?.trim().toUpperCase() ?? "";
  const color = (formData.get("color") as string | null)?.trim() ?? "#6366f1";
  const category = (formData.get("category") as string | null)?.trim() || "allgemein";

  if (!name || !shortName) return;

  await prisma.subject.create({
    data: { name, shortName, color, category, schoolId: session.schoolId },
  });

  revalidatePath("/admin/faecher");
  redirect("/admin/faecher");
}
