/* Copyright 2026 Elian Schock, Jonas Schwenk */
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

  // Verify the parent is linked to this student
  const link = await prisma.parentStudentLink.findUnique({
    where: { parentId_studentId: { parentId: session.userId, studentId } },
  });
  if (!link) throw new Error("Kein Zugriff auf dieses Kind.");

  // Verify the slot is still free
  const slot = await prisma.parentTeacherSlot.findUnique({
    where: { id: slotId },
    include: { teacher: { select: { schoolId: true } } },
  });
  if (!slot || slot.isBooked) {
    throw new Error("Dieser Slot ist nicht mehr verfügbar.");
  }
  // Slot muss zu einer Lehrkraft der eigenen Schule gehören — sonst können
  // Eltern Termine an fremden Schulen blockieren
  if (!session.schoolId || slot.teacher.schoolId !== session.schoolId) {
    throw new Error("Kein Zugriff auf diesen Termin.");
  }

  // Atomar buchen: erst den Slot konditional auf isBooked=true setzen
  // (nur wenn er noch frei ist). Gewinnt genau ein paralleler Request —
  // der andere bekommt count=0 und eine saubere Meldung statt P2002-Crash.
  const claimed = await prisma.parentTeacherSlot.updateMany({
    where: { id: slotId, isBooked: false },
    data: { isBooked: true },
  });
  if (claimed.count === 0) {
    throw new Error("Dieser Slot wurde gerade von jemand anderem gebucht.");
  }
  try {
    await prisma.parentTeacherBooking.create({
      data: { slotId, parentId: session.userId, studentId, note: note || null },
    });
  } catch (e) {
    // Buchung fehlgeschlagen → Slot wieder freigeben, damit er nicht blockiert bleibt
    await prisma.parentTeacherSlot.update({ where: { id: slotId }, data: { isBooked: false } }).catch(() => {});
    throw e;
  }

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
