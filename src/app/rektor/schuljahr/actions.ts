/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";

export async function createSchoolYearEvent(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/login");
  const role = effectiveRole(session);
  if (!["rector", "vice_rector", "admin", "super"].includes(role)) redirect("/login");

  const title = formData.get("title") as string;
  const startAt = new Date(formData.get("startAt") as string);
  const endAt = formData.get("endAt") ? new Date(formData.get("endAt") as string) : null;
  const category = (formData.get("category") as string) || "event";
  const description = (formData.get("description") as string) || null;

  await prisma.schoolEvent.create({
    data: {
      schoolId: session.schoolId!,
      title,
      startAt,
      endAt,
      category,
      description,
      allDay: true,
      createdBy: session.userId,
    },
  });

  revalidatePath("/rektor/schuljahr");
}

export async function deleteSchoolYearEvent(eventId: string): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/login");
  const role = effectiveRole(session);
  if (!["rector", "vice_rector", "admin", "super"].includes(role)) redirect("/login");

  await prisma.schoolEvent.deleteMany({
    where: { id: eventId, schoolId: session.schoolId! },
  });
  revalidatePath("/rektor/schuljahr");
}
