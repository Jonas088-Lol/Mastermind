"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { getSession } from "@/lib/session";

export async function markNotificationsAsRead(ids: string[]): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!Array.isArray(ids) || ids.length === 0) return;
  await prisma.appNotification.updateMany({
    where: { id: { in: ids }, userId: session.userId, readAt: null },
    data: { readAt: new Date() },
  });
  revalidatePath("/notifications");
}

/** Mark every unread notification for the current user as read. */
export async function markAllNotificationsRead(): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/login");
  await prisma.appNotification.updateMany({
    where: { userId: session.userId, readAt: null },
    data: { readAt: new Date() },
  });
  revalidatePath("/notifications");
}
