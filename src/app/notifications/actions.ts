"use server";

import { prisma } from "@/lib/db/client";
import { getSession } from "@/lib/session";

export async function markNotificationsAsRead(ids: string[]) {
  const session = await getSession();
  if (!session) return { ok: false as const, reason: "unauthenticated" };
  if (!Array.isArray(ids) || ids.length === 0) {
    return { ok: false as const, reason: "no-ids" };
  }
  await prisma.appNotification.updateMany({
    where: { id: { in: ids }, userId: session.userId, readAt: null },
    data: { readAt: new Date() },
  });
  return { ok: true as const, count: ids.length };
}
