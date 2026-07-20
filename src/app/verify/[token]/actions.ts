/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { consumeToken } from "@/lib/auth/tokens";
import { hashPassword } from "@/lib/auth/passwords";

/**
 * Bestätigt die E-Mail-Adresse eines neu angelegten Accounts und setzt das
 * selbstgewählte Passwort. Der Token wird erst beim Absenden verbraucht —
 * ein bloßer Seitenaufruf (Mail-Scanner, Vorschau) entwertet den Link nicht.
 */
export async function activateAccount(formData: FormData): Promise<void> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("password-confirm") ?? "");

  if (password.length < 12) {
    redirect(`/verify/${token}?error=too-short`);
  }
  if (password !== confirm) {
    redirect(`/verify/${token}?error=mismatch`);
  }

  const consumed = await consumeToken("email_verify", token);
  if (!consumed) {
    redirect(`/verify/${token}?error=invalid-token`);
  }

  const user = consumed.userId
    ? await prisma.user.findUnique({ where: { id: consumed.userId }, select: { id: true } })
    : await prisma.user.findUnique({ where: { email: consumed.email }, select: { id: true } });
  if (!user) {
    redirect(`/verify/${token}?error=invalid-token`);
  }

  const passwordHash = await hashPassword(password);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, verifiedAt: new Date() },
  });

  // Eventuelle Alt-Sessions (Temp-Passwort) beenden.
  await prisma.session.deleteMany({ where: { userId: user.id } }).catch(() => undefined);

  redirect("/login?verified=1");
}
