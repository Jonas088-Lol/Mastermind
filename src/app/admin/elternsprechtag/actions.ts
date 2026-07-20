/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { canManageSchool, canAccessArea } from "@/lib/school-admin";

async function guard() {
  const session = await getSession();
  if (!session || !canManageSchool(effectiveRole(session))) redirect("/login");
  if (!canAccessArea(effectiveRole(session), "elternsprechtag")) redirect("/admin");
  if (!session.schoolId) redirect("/admin");
  return session;
}

/** "16:00" → gültig? */
function isTime(v: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
}

/** Legt einen Elternsprechtag an oder aktualisiert ihn. */
export async function saveMeetingDay(formData: FormData): Promise<void> {
  const session = await guard();
  const schoolId = session.schoolId!;

  const id = String(formData.get("id") ?? "").trim() || null;
  const title = String(formData.get("title") ?? "").trim() || "Elternsprechtag";
  const dateRaw = String(formData.get("date") ?? "").trim();
  const startTime = String(formData.get("startTime") ?? "").trim();
  const endTime = String(formData.get("endTime") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim() || null;
  const note = String(formData.get("note") ?? "").trim() || null;
  const slotMinutesRaw = Number(formData.get("slotMinutes"));
  const isPublished = formData.get("isPublished") === "on";

  const date = new Date(dateRaw);
  if (!dateRaw || isNaN(date.getTime())) return;
  if (!isTime(startTime) || !isTime(endTime)) return;
  if (endTime <= startTime) return;

  const slotMinutes =
    Number.isFinite(slotMinutesRaw) && slotMinutesRaw >= 5 && slotMinutesRaw <= 60
      ? Math.round(slotMinutesRaw)
      : 15;

  const data = { title, date, startTime, endTime, slotMinutes, location, note, isPublished };

  if (id) {
    // Nur eigene Schule bearbeiten.
    const existing = await prisma.parentMeetingDay.findUnique({
      where: { id },
      select: { schoolId: true },
    });
    if (!existing || existing.schoolId !== schoolId) return;
    await prisma.parentMeetingDay.update({ where: { id }, data });
  } else {
    await prisma.parentMeetingDay.create({ data: { ...data, schoolId } });
  }

  revalidatePath("/admin/elternsprechtag");
  revalidatePath("/teach/elternsprechtag");
  revalidatePath("/eltern/elternsprechtag");
  redirect("/admin/elternsprechtag");
}

/** Veröffentlichen bzw. zurückziehen. */
export async function toggleMeetingDayPublished(formData: FormData): Promise<void> {
  const session = await guard();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;

  const day = await prisma.parentMeetingDay.findUnique({
    where: { id },
    select: { schoolId: true, isPublished: true },
  });
  if (!day || day.schoolId !== session.schoolId) return;

  await prisma.parentMeetingDay.update({
    where: { id },
    data: { isPublished: !day.isPublished },
  });

  revalidatePath("/admin/elternsprechtag");
  revalidatePath("/teach/elternsprechtag");
  revalidatePath("/eltern/elternsprechtag");
}

/** Löscht einen Elternsprechtag samt zugehöriger Termine (Cascade). */
export async function deleteMeetingDay(formData: FormData): Promise<void> {
  const session = await guard();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;

  const day = await prisma.parentMeetingDay.findUnique({
    where: { id },
    select: { schoolId: true },
  });
  if (!day || day.schoolId !== session.schoolId) return;

  await prisma.parentMeetingDay.delete({ where: { id } });

  revalidatePath("/admin/elternsprechtag");
  revalidatePath("/teach/elternsprechtag");
  revalidatePath("/eltern/elternsprechtag");
}
