/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { getSession, isSuper } from "@/lib/session";

export async function createSupportTicket(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session || !isSuper(session)) redirect("/login");

  const school = (formData.get("school") as string | null)?.trim() ?? "";
  const subject = (formData.get("subject") as string | null)?.trim() ?? "";
  const body = (formData.get("body") as string | null)?.trim() ?? "";
  const priority = (formData.get("priority") as string | null)?.trim() || "low";

  if (!subject) return;

  await prisma.appNotification.create({
    data: {
      userId: session.userId,
      type: "support_ticket",
      title: subject,
      body: [school, body].filter(Boolean).join(" · ").slice(0, 500),
      linkUrl: priority, // reuse field as priority store
    },
  });

  revalidatePath("/plattform/support");
}

export async function resolveTicket(ticketId: string): Promise<void> {
  const session = await getSession();
  if (!session || !isSuper(session)) return;

  await prisma.appNotification.update({
    where: { id: ticketId, userId: session.userId },
    data: { readAt: new Date() },
  });

  revalidatePath("/plattform/support");
}
