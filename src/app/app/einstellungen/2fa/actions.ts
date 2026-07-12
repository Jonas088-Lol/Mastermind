/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { generateTotpSecret, verifyTotp } from "@/lib/auth/totp";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { TwoFactorSecret } from "@/lib/privacy/field-encryption";
import { rateLimit } from "@/lib/security/rate-limit";

export interface StartSetupResult {
  ok: boolean;
  secret?: string;
  otpauthUrl?: string;
  error?: string;
}

/**
 * Erzeugt ein neues TOTP-Secret. Persistiert NOCH NICHT — Client zeigt den
 * QR-Code, dann gibt der User einen Code ein, der gegen den gleichen Secret
 * geprüft wird. Bei Erfolg wird das Secret commited.
 */
export async function startTwoFactorSetup(): Promise<StartSetupResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Nicht angemeldet" };

  // Self-only — User aktiviert 2FA für sich. Bei effectiveRole=super könnte
  // der Plattform-Admin (impersonating) versuchen, das für andere zu setzen
  // — wir benutzen immer session.email (real account).
  const setup = generateTotpSecret(session.email);
  return {
    ok: true,
    secret: setup.secret,
    otpauthUrl: setup.otpauthUrl,
  };
}

export interface ConfirmSetupResult {
  ok: boolean;
  backupCodes?: string[];
  error?: string;
}

export async function confirmTwoFactorSetup(
  formData: FormData
): Promise<ConfirmSetupResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Nicht angemeldet" };

  const secret = String(formData.get("secret") ?? "");
  const code = String(formData.get("code") ?? "");

  if (!secret || !code) return { ok: false, error: "Code fehlt" };

  // Brute-Force-Schutz für den 6-stelligen Code
  const rl = await rateLimit({ scope: "2fa-confirm", key: session.userId, limit: 10, windowSec: 900 });
  if (!rl.ok) return { ok: false, error: "Zu viele Versuche. Bitte kurz warten." };

  if (!verifyTotp(secret, code)) return { ok: false, error: "Code ungültig" };

  const user = await prisma.user.update({
    where: { email: session.email },
    data: { twoFactor: true, twoFactorSecret: TwoFactorSecret.encrypt(secret) },
    select: { id: true },
  });

  // Backup-Codes generieren und EINMALIG zurückgeben (Wiederherstellung, falls
  // das Authenticator-Gerät verloren geht).
  const { regenerateBackupCodes } = await import("@/lib/auth/backup-codes");
  const backupCodes = await regenerateBackupCodes(user.id);

  revalidatePath("/app/einstellungen");
  return { ok: true, backupCodes };
}

export async function disableTwoFactor(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");

  const code = String(formData.get("code") ?? "");

  // Brute-Force-Schutz: 2FA-Deaktivierung darf nicht durchprobierbar sein
  const rl = await rateLimit({ scope: "2fa-disable", key: session.userId, limit: 10, windowSec: 900 });
  if (!rl.ok) redirect("/app/einstellungen?error=2fa-code-invalid");

  const user = await prisma.user.findUnique({
    where: { email: session.email },
    select: { twoFactorSecret: true, twoFactor: true },
  });
  if (!user || !user.twoFactor || !user.twoFactorSecret) {
    redirect("/app/einstellungen?error=2fa-not-active");
  }
  if (!verifyTotp(TwoFactorSecret.decrypt(user.twoFactorSecret)!, code)) {
    redirect("/app/einstellungen?error=2fa-code-invalid");
  }

  const updated = await prisma.user.update({
    where: { email: session.email },
    data: { twoFactor: false, twoFactorSecret: null },
    select: { id: true },
  });

  // Verwaiste Backup-Codes entfernen.
  const { clearBackupCodes } = await import("@/lib/auth/backup-codes");
  await clearBackupCodes(updated.id);

  revalidatePath("/app/einstellungen");
  // Wenn ein Lehrer/Admin 2FA deaktiviert, wird das normalerweise
  // erlaubt sein — Production: hier optional die School-Policy prüfen.
  redirect("/app/einstellungen?ok=2fa-off");
}

// Hilfsfunktion für Server-Components, um den 2FA-Status zu lesen.
export async function getTwoFactorStatus(): Promise<{ enabled: boolean }> {
  const session = await getSession();
  if (!session) return { enabled: false };
  // effective role wird ignoriert — Status kommt vom realen User.
  void effectiveRole(session);
  const user = await prisma.user.findUnique({
    where: { email: session.email },
    select: { twoFactor: true },
  });
  return { enabled: Boolean(user?.twoFactor) };
}
