/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { getSession } from "@/lib/session";
import { canManageSchool } from "@/lib/school-admin";

export async function deleteNote(noteId: string): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/login");

  const note = await prisma.note.findUnique({
    where: { id: noteId },
    select: { authorId: true, author: { select: { schoolId: true } } },
  });
  if (!note) return;

  const { effectiveRole } = await import("@/lib/session");
  const role = effectiveRole(session);
  const isOwner = note.authorId === session.userId;
  const isSameSchool = note.author.schoolId === session.schoolId;
  const isModerator = (role === "teacher" || canManageSchool(role) || role === "super") && isSameSchool;

  if (!isOwner && !isModerator) return;

  await prisma.note.delete({ where: { id: noteId } });
  revalidatePath("/app/community/notizen");
  redirect("/app/community/notizen");
}
