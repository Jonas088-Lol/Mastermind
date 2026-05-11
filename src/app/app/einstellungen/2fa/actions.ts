"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { generateTotpSecret, verifyTotp } from "@/lib/auth/totp";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";

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

export async function confirmTwoFactorSetup(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");

  const secret = String(formData.get("secret") ?? "");
  const code = String(formData.get("code") ?? "");

  if (!secret || !code) {
    redirect("/app/einstellungen?error=missing-2fa");
  }
  if (!verifyTotp(secret, code)) {
    redirect("/app/einstellungen?error=2fa-code-invalid");
  }

  await prisma.user.update({
    where: { email: session.email },
    data: { twoFactor: true, twoFactorSecret: secret },
  });

  revalidatePath("/app/einstellungen");
  redirect("/app/einstellungen?ok=2fa-on");
}

export async function disableTwoFactor(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");

  const code = String(formData.get("code") ?? "");
  const user = await prisma.user.findUnique({
    where: { email: session.email },
    select: { twoFactorSecret: true, twoFactor: true },
  });
  if (!user || !user.twoFactor || !user.twoFactorSecret) {
    redirect("/app/einstellungen?error=2fa-not-active");
  }
  if (!verifyTotp(user.twoFactorSecret, code)) {
    redirect("/app/einstellungen?error=2fa-code-invalid");
  }

  await prisma.user.update({
    where: { email: session.email },
    data: { twoFactor: false, twoFactorSecret: null },
  });

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
