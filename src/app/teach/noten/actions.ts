/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";

export async function deleteGrade(gradeId: string): Promise<void> {
  const session = await getSession();
  if (!session) return;
  if (effectiveRole(session) !== "teacher") return;

  const grade = await prisma.grade.findUnique({
    where: { id: gradeId },
    select: { teacherId: true },
  });
  if (!grade || grade.teacherId !== session.userId) return;

  await prisma.grade.delete({ where: { id: gradeId } });
  revalidatePath("/teach/noten");
}
