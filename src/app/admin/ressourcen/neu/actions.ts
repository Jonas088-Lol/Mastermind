/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";

export async function createResource(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "admin") redirect("/login");
  if (!session.schoolId) return;

  const name = (formData.get("name") as string | null)?.trim() ?? "";
  const description = (formData.get("description") as string | null)?.trim() || null;
  const category = (formData.get("category") as string | null)?.trim() || "sonstiges";
  const icon = (formData.get("icon") as string | null)?.trim() || "box";
  const color = (formData.get("color") as string | null)?.trim() || "#6366f1";

  if (!name) return;

  await prisma.resource.create({
    data: { name, description, category, icon, color, schoolId: session.schoolId },
  });

  revalidatePath("/admin/ressourcen");
  redirect("/admin/ressourcen");
}
