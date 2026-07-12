/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { getSession, isSuper } from "@/lib/session";

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const a = Array.from(randomBytes(4)).map((b) => chars[b % chars.length]).join("");
  const b = Array.from(randomBytes(4)).map((b) => chars[b % chars.length]).join("");
  return `${a}-${b}`;
}

export async function createSchoolActivationCode(schoolId: string, formData: FormData) {
  const session = await getSession();
  if (!session || !isSuper(session)) redirect("/login");

  const maxUses = Math.max(1, parseInt(formData.get("maxUses") as string) || 1);
  const note = (formData.get("note") as string | null)?.trim() || null;

  const expiresInDays = parseInt(formData.get("expiresInDays") as string) || 0;
  const expiresAt = expiresInDays > 0
    ? new Date(Date.now() + expiresInDays * 86_400_000)
    : null;

  await prisma.provisioningCode.create({
    data: {
      code: generateCode(),
      kind: "SCHOOL_ACTIVATION",
      schoolId,
      maxUses,
      expiresAt,
      note,
      createdById: session.userId,
    },
  });

  revalidatePath(`/plattform/schulen/${schoolId}/codes`);
}

export async function revokeCode(codeId: string, schoolId: string) {
  const session = await getSession();
  if (!session || !isSuper(session)) redirect("/login");

  await prisma.provisioningCode.update({
    where: { id: codeId },
    data: { revoked: true },
  });

  revalidatePath(`/plattform/schulen/${schoolId}/codes`);
}
