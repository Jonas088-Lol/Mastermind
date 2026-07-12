/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";

export async function saveMailboxSettings(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "admin") redirect("/login");
  if (!session.schoolId) return;

  const mailboxAddress = String(formData.get("mailboxAddress") ?? "").trim().toLowerCase();
  const mailboxName = String(formData.get("mailboxName") ?? "").trim();

  await prisma.school.update({
    where: { id: session.schoolId },
    data: {
      mailboxAddress: mailboxAddress || null,
      mailboxName: mailboxName || null,
    },
  });

  revalidatePath("/admin/postfach");
  revalidatePath("/admin/postfach/einstellungen");
  redirect("/admin/postfach/einstellungen?saved=1");
}
