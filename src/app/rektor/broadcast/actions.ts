/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";

export async function sendBroadcast(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/login");
  const role = effectiveRole(session);
  if (role !== "rector" && role !== "vice_rector" && role !== "admin" && role !== "super") return;
  if (!session.schoolId) return;

  const target = (formData.get("target") as string | null)?.trim() ?? "";
  const subject = (formData.get("subject") as string | null)?.trim() ?? "";
  const message = (formData.get("message") as string | null)?.trim() ?? "";

  if (!target || !subject || !message) return;

  const roleFilter =
    target === "all"
      ? ["student", "teacher", "parent", "admin", "secretary", "rector", "vice_rector"]
      : [target];

  const recipients = await prisma.user.findMany({
    where: { schoolId: session.schoolId, role: { in: roleFilter } },
    select: { id: true },
  });

  await prisma.appNotification.createMany({
    data: recipients.map((r) => ({
      userId: r.id,
      type: "broadcast",
      title: subject,
      body: message,
      linkUrl: null,
    })),
  });

  revalidatePath("/rektor/broadcast");
  redirect("/rektor");
}
