/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { canManageSchool, canAccessArea } from "@/lib/school-admin";

export async function createClass(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session || !canManageSchool(effectiveRole(session))) redirect("/login");
  if (!canAccessArea(effectiveRole(session), "klassen")) redirect("/admin");
  if (!session.schoolId) return;

  const name = (formData.get("name") as string | null)?.trim().toUpperCase() ?? "";
  const grade = parseInt((formData.get("grade") as string | null) ?? "0", 10);

  if (!name || !grade) return;

  await prisma.schoolClass.upsert({
    where: { schoolId_name: { schoolId: session.schoolId, name } },
    update: {},
    create: { name, grade, schoolId: session.schoolId },
  });

  revalidatePath("/admin/klassen");
  redirect("/admin/klassen");
}
