/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { ROLE_HOME, effectiveRole, getSession } from "@/lib/session";

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const a = Array.from(randomBytes(3)).map((b) => chars[b % chars.length]).join("");
  const b = Array.from(randomBytes(3)).map((b) => chars[b % chars.length]).join("");
  const c = Array.from(randomBytes(3)).map((b) => chars[b % chars.length]).join("");
  return `${a}-${b}-${c}`;
}

export async function createClassJoinCode(classId: string, schoolId: string, formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "admin") redirect(ROLE_HOME[effectiveRole(session)]);
  if (session.schoolId !== schoolId) redirect("/admin");

  const maxUses = Math.max(1, parseInt(formData.get("maxUses") as string) || 30);
  const expiresInDays = parseInt(formData.get("expiresInDays") as string) || 0;
  const expiresAt = expiresInDays > 0
    ? new Date(Date.now() + expiresInDays * 86_400_000)
    : null;
  const note = (formData.get("note") as string | null)?.trim() || null;

  await prisma.provisioningCode.create({
    data: {
      code: generateCode(),
      kind: "CLASS_JOIN",
      schoolId,
      classId,
      maxUses,
      expiresAt,
      note,
      createdById: session.userId,
    },
  });

  revalidatePath(`/admin/klassen/${classId}/codes`);
}

export async function revokeClassCode(codeId: string, classId: string) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "admin") redirect(ROLE_HOME[effectiveRole(session)]);

  const code = await prisma.provisioningCode.findUnique({ where: { id: codeId } });
  if (!code || code.schoolId !== session.schoolId) return;

  await prisma.provisioningCode.update({ where: { id: codeId }, data: { revoked: true } });

  revalidatePath(`/admin/klassen/${classId}/codes`);
}
