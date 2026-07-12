/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";

async function requireAdmin() {
  const session = await getSession();
  if (!session) return null;
  if (effectiveRole(session) !== "admin") return null;
  return session;
}

export async function createSchoolEvent(formData: FormData): Promise<void> {
  const session = await requireAdmin();
  if (!session) return;

  const title = formData.get("title") as string;
  const description = (formData.get("description") as string) || null;
  const startAtStr = formData.get("startAt") as string;
  const endAtStr = (formData.get("endAt") as string) || null;
  const allDay = formData.get("allDay") === "on";
  const category = (formData.get("category") as string) || "event";

  if (!title || !startAtStr) return;

  await prisma.schoolEvent.create({
    data: {
      schoolId: session.schoolId ?? "",
      title,
      description: description || undefined,
      startAt: new Date(startAtStr),
      endAt: endAtStr ? new Date(endAtStr) : null,
      allDay,
      category,
      createdBy: session.userId,
    },
  });

  revalidatePath("/admin/schulkalender");
}

export async function deleteSchoolEvent(eventId: string): Promise<void> {
  const session = await requireAdmin();
  if (!session) return;

  await prisma.schoolEvent.deleteMany({
    where: { id: eventId, schoolId: session.schoolId ?? "" },
  });

  revalidatePath("/admin/schulkalender");
}
