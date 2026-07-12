/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";

export async function createSlot(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session) return;
  if (effectiveRole(session) !== "teacher") return;

  const startsAtRaw = String(formData.get("startsAt") ?? "").trim();
  const durationRaw = formData.get("duration");
  const location = String(formData.get("location") ?? "").trim();

  if (!startsAtRaw) return;

  const startsAt = new Date(startsAtRaw);
  if (isNaN(startsAt.getTime())) return;

  const parsedDuration = durationRaw ? Number(durationRaw) : 15;
  // NaN/0/negativ abfangen — sonst Prisma-Fehler bzw. unsinnige Slots
  const duration = Number.isFinite(parsedDuration) && parsedDuration > 0 ? parsedDuration : 15;

  await prisma.parentTeacherSlot.create({
    data: {
      teacherId: session.userId,
      startsAt,
      duration,
      location: location || null,
      isBooked: false,
    },
  });

  revalidatePath("/teach/elternsprechtag");
}

export async function deleteSlot(slotId: string): Promise<void> {
  const session = await getSession();
  if (!session) return;
  if (effectiveRole(session) !== "teacher") return;

  const slot = await prisma.parentTeacherSlot.findUnique({
    where: { id: slotId },
    select: { teacherId: true, isBooked: true },
  });

  if (!slot) return;
  if (slot.teacherId !== session.userId) return;
  if (slot.isBooked) return;

  await prisma.parentTeacherSlot.delete({ where: { id: slotId } });
  revalidatePath("/teach/elternsprechtag");
}
