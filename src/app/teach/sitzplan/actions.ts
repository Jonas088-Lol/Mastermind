/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";

export async function saveSeatingPlan(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session) return;
  if (effectiveRole(session) !== "teacher") return;

  const classId = String(formData.get("classId") ?? "").trim();
  const rows = parseInt(String(formData.get("rows") ?? "5"), 10);
  const cols = parseInt(String(formData.get("cols") ?? "6"), 10);
  const layoutRaw = String(formData.get("layout") ?? "[]").trim();

  if (!classId || !layoutRaw) return;

  // Verify teacher teaches this class
  const tsc = await prisma.teacherSubjectClass.findFirst({
    where: { teacherId: session.userId, classId },
  });
  if (!tsc) return;

  const safeRows = isNaN(rows) ? 5 : rows;
  const safeCols = isNaN(cols) ? 6 : cols;

  const existing = await prisma.seatingPlan.findFirst({ where: { classId } });

  if (existing) {
    await prisma.seatingPlan.update({
      where: { id: existing.id },
      data: { layout: layoutRaw, rows: safeRows, cols: safeCols },
    });
  } else {
    await prisma.seatingPlan.create({
      data: { classId, layout: layoutRaw, rows: safeRows, cols: safeCols },
    });
  }

  revalidatePath("/teach/sitzplan");
}
