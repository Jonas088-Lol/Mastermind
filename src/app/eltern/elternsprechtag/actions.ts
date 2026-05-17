"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";

export async function bookSlot(
  slotId: string,
  studentId: string,
  formData: FormData
): Promise<void> {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "parent") redirect("/login");

  const note = (formData.get("note") as string | null) ?? undefined;

  // Verify the slot is still free
  const slot = await prisma.parentTeacherSlot.findUnique({ where: { id: slotId } });
  if (!slot || slot.isBooked) {
    throw new Error("Dieser Slot ist nicht mehr verfügbar.");
  }

  await prisma.$transaction([
    prisma.parentTeacherBooking.create({
      data: {
        slotId,
        parentId: session.userId,
        studentId,
        note: note || null,
      },
    }),
    prisma.parentTeacherSlot.update({
      where: { id: slotId },
      data: { isBooked: true },
    }),
  ]);

  revalidatePath("/eltern/elternsprechtag");
}

export async function cancelBooking(bookingId: string): Promise<void> {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "parent") redirect("/login");

  const booking = await prisma.parentTeacherBooking.findUnique({
    where: { id: bookingId },
  });
  if (!booking || booking.parentId !== session.userId) {
    throw new Error("Buchung nicht gefunden.");
  }

  await prisma.$transaction([
    prisma.parentTeacherBooking.delete({ where: { id: bookingId } }),
    prisma.parentTeacherSlot.update({
      where: { id: booking.slotId },
      data: { isBooked: false },
    }),
  ]);

  revalidatePath("/eltern/elternsprechtag");
}
