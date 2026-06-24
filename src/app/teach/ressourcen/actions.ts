"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";

export async function bookResource(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "teacher") redirect("/login");

  const resourceId = (formData.get("resourceId") as string | null)?.trim() ?? "";
  const title = (formData.get("title") as string | null)?.trim() ?? "";
  const startsAtRaw = formData.get("startsAt") as string | null;
  const endsAtRaw = formData.get("endsAt") as string | null;
  const note = (formData.get("note") as string | null)?.trim() || null;

  if (!resourceId || !title || !startsAtRaw || !endsAtRaw) return;

  const startsAt = new Date(startsAtRaw);
  const endsAt = new Date(endsAtRaw);
  if (isNaN(startsAt.getTime()) || isNaN(endsAt.getTime())) return;
  if (endsAt <= startsAt) return;

  // Check for conflicts
  const conflict = await prisma.resourceBooking.findFirst({
    where: {
      resourceId,
      OR: [{ startsAt: { lt: endsAt }, endsAt: { gt: startsAt } }],
    },
  });
  if (conflict) return;

  await prisma.resourceBooking.create({
    data: { resourceId, userId: session.userId, title, startsAt, endsAt, note },
  });

  revalidatePath("/teach/ressourcen");
  redirect("/teach/ressourcen");
}

export async function deleteBooking(bookingId: string): Promise<void> {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "teacher") redirect("/login");

  await prisma.resourceBooking.deleteMany({
    where: { id: bookingId, userId: session.userId },
  });

  revalidatePath("/teach/ressourcen");
}
