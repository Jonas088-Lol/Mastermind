/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { ROLE_HOME, effectiveRole, getSession } from "@/lib/session";

export async function sendTwoFAReminders(): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "admin") redirect(ROLE_HOME[effectiveRole(session)]);

  const schoolId = session.schoolId;
  const teachers = await prisma.user.findMany({
    where: { ...(schoolId ? { schoolId } : {}), role: "teacher", twoFactor: false },
    select: { id: true },
  });

  if (teachers.length === 0) return;

  await prisma.appNotification.createMany({
    data: teachers.map((t) => ({
      userId: t.id,
      type: "system",
      title: "Bitte 2FA aktivieren",
      body: "Die Schulleitung bittet Sie, die Zwei-Faktor-Authentifizierung in Ihrem Profil zu aktivieren.",
      linkUrl: "/profil/sicherheit",
    })),
  });

  revalidatePath("/admin/sicherheit");
}

export async function createApiToken(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "admin") redirect(ROLE_HOME[effectiveRole(session)]);
  if (!session.schoolId) redirect("/admin");

  const name = (formData.get("name") as string | null)?.trim() ?? "";
  const scopes = (formData.get("scopes") as string | null)?.trim() ?? "read";
  const expiresIn = (formData.get("expiresIn") as string | null) ?? "";

  if (!name) return;

  const raw = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(raw).digest("hex");
  const prefix = `mm_${raw.slice(0, 8)}`;

  const expiresAt = expiresIn === "30d"
    ? new Date(Date.now() + 30 * 86400_000)
    : expiresIn === "90d"
    ? new Date(Date.now() + 90 * 86400_000)
    : expiresIn === "365d"
    ? new Date(Date.now() + 365 * 86400_000)
    : null;

  await prisma.apiToken.create({
    data: {
      schoolId: session.schoolId,
      name,
      tokenHash,
      prefix,
      scopes,
      ...(expiresAt ? { expiresAt } : {}),
    },
  });

  const params = new URLSearchParams({ newToken: raw, tokenName: name });
  redirect(`/admin/sicherheit?${params.toString()}`);
}

export async function revokeApiToken(tokenId: string): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "admin") redirect(ROLE_HOME[effectiveRole(session)]);
  if (!session.schoolId) return;

  const token = await prisma.apiToken.findUnique({ where: { id: tokenId }, select: { schoolId: true } });
  if (!token || token.schoolId !== session.schoolId) return;

  await prisma.apiToken.delete({ where: { id: tokenId } });
  revalidatePath("/admin/sicherheit");
}
