"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { hashPassword } from "@/lib/auth/passwords";
import {
  clearPending2FA,
  getPending2FA,
  setPending2FA,
} from "@/lib/auth/pending-2fa";
import { consumeToken, createToken } from "@/lib/auth/tokens";
import { verifyTotp } from "@/lib/auth/totp";
import { TwoFactorSecret } from "@/lib/privacy/field-encryption";
import { prisma } from "@/lib/db/client";
import {
  magicLinkEmail,
  passwordResetEmail,
  sendEmail,
} from "@/lib/email";
import { auditLog } from "@/lib/audit";
import { checkAndAwardAchievements } from "@/lib/achievements";
import { ipFromHeaders, rateLimit } from "@/lib/security/rate-limit";
import {
  ROLE_HOME,
  VIEW_ROLES,
  type Role,
  clearSession,
  effectiveRole,
  getSession,
  isSuper,
  setSession,
  validateCredentials,
} from "@/lib/session";

function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

async function origin(): Promise<string> {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

async function ip(): Promise<string> {
  const h = await headers();
  return ipFromHeaders(h);
}

export async function loginWithCredentials(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  // Zweistufiger Brute-Force-Schutz:
  //  (1) pro IP+E-Mail: 8/10min — normaler Missbrauch.
  //  (2) pro E-Mail (IP-unabhängig): 20/30min — verteilter Angriff auf EIN
  //      Konto über viele IPs (Account-Lockout).
  const ipAddr = await ip();
  const perIp = await rateLimit({ scope: "login", key: `${ipAddr}:${email}`, limit: 8, windowSec: 600 });
  if (!perIp.ok) {
    redirect("/login?error=rate-limit");
  }
  const perAccount = await rateLimit({ scope: "login-account", key: email, limit: 20, windowSec: 1800 });
  if (!perAccount.ok) {
    redirect("/login?error=rate-limit");
  }

  const account = await validateCredentials(email, password);
  if (!account) {
    redirect("/login?error=invalid");
  }

  // 2FA-Gate: wenn aktiviert, in Pending-State und 2FA-Page zeigen.
  const user = await prisma.user.findUnique({
    where: { email: account.email },
    select: { id: true, twoFactor: true },
  });
  if (user?.twoFactor) {
    await setPending2FA({ userId: user.id, email: account.email });
    redirect("/login/2fa");
  }

  await setSession({ email: account.email, realRole: account.role });
  if (user?.id) void checkAndAwardAchievements(user.id).catch(() => undefined);
  redirect(ROLE_HOME[account.role]);
}

export async function verifyLoginTwoFactor(formData: FormData) {
  const code = String(formData.get("code") ?? "").trim();
  const pending = await getPending2FA();
  if (!pending) {
    redirect("/login?error=2fa-expired");
  }

  // Rate-Limit pro pending-User: 5 Versuche / 5 Min
  const limit = await rateLimit({
    scope: "2fa-verify",
    key: pending.userId,
    limit: 5,
    windowSec: 300,
  });
  if (!limit.ok) {
    await clearPending2FA();
    redirect("/login?error=2fa-rate-limit");
  }

  const user = await prisma.user.findUnique({
    where: { id: pending.userId },
    select: {
      email: true,
      role: true,
      twoFactor: true,
      twoFactorSecret: true,
    },
  });
  if (!user || !user.twoFactor || !user.twoFactorSecret) {
    await clearPending2FA();
    redirect("/login?error=2fa-not-active");
  }

  // Zuerst TOTP prüfen; schlägt das fehl, einen Backup-Code akzeptieren
  // (Wiederherstellung, wenn das Authenticator-Gerät verloren ging).
  let verified = verifyTotp(TwoFactorSecret.decrypt(user.twoFactorSecret)!, code);
  if (!verified) {
    const { consumeBackupCode } = await import("@/lib/auth/backup-codes");
    verified = await consumeBackupCode(pending.userId, code);
  }
  if (!verified) {
    redirect("/login/2fa?error=invalid");
  }

  await clearPending2FA();
  await setSession({ email: user.email, realRole: user.role as Role });
  void checkAndAwardAchievements(pending.userId).catch(() => undefined);
  redirect(ROLE_HOME[user.role as Role]);
}

export async function cancelTwoFactorLogin() {
  await clearPending2FA();
  redirect("/login");
}

// Demo-Quick-Login: meldet gezielt in einen der demo.*-Wegwerf-Accounts an
// (KEIN "erster User dieser Rolle" — das könnte echte Konten treffen).
// Über ENV DISABLE_DEMO_LOGIN=true abschaltbar.
// Key = Kachel-Slug (kann von der Rolle abweichen, z. B. student2 → Rolle student)
const DEMO_LOGINS: Record<string, { email: string; role: string }> = {
  super:          { email: "demo.super@konvertis.de",       role: "super" },
  admin:          { email: "demo.admin@konvertis.de",       role: "admin" },
  rector:         { email: "demo.schulleiter@konvertis.de", role: "rector" },
  vice_rector:    { email: "demo.konrektor@konvertis.de",   role: "vice_rector" },
  secretary:      { email: "demo.sekretariat@konvertis.de", role: "secretary" },
  teacher:        { email: "demo.lehrer@konvertis.de",      role: "teacher" },
  student:        { email: "demo.schueler@konvertis.de",    role: "student" },
  student2:       { email: "demo.schueler2@konvertis.de",   role: "student" },
  student3:       { email: "demo.sprecher@konvertis.de",    role: "student" },
  parent:         { email: "demo.eltern@konvertis.de",      role: "parent" },
  school_company: { email: "demo.traeger@konvertis.de",     role: "school_company" },
};

export async function loginAsDemoRole(roleKey: string) {
  if (process.env.DISABLE_DEMO_LOGIN === "true") {
    redirect("/login?error=demo-disabled");
  }
  const entry = DEMO_LOGINS[roleKey];
  if (!entry) redirect("/login?error=invalid");
  const { email, role } = entry;

  // Nur einloggen, wenn der Demo-Account wirklich existiert und die Rolle passt.
  const user = await prisma.user.findUnique({
    where: { email },
    select: { role: true },
  });
  if (!user || user.role !== role) {
    redirect("/login?error=demo-missing");
  }

  await setSession({ email, realRole: user.role as Role });
  redirect(ROLE_HOME[user.role as Role]);
}

export async function switchView(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!isSuper(session)) redirect(ROLE_HOME[effectiveRole(session)]);

  const target = String(formData.get("role") ?? "");
  if (!VIEW_ROLES.includes(target as Role)) {
    throw new Error("Ungültige Sicht");
  }

  await auditLog({
    actorId: session.userId,
    action: "session.impersonation_start",
    details: { viewAs: target },
  });

  await setSession({
    email: session.email,
    realRole: session.realRole,
    viewAs: target as Role,
  });
  redirect(ROLE_HOME[target as Role]);
}

export async function stopImpersonation() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!isSuper(session)) redirect(ROLE_HOME[effectiveRole(session)]);

  await auditLog({
    actorId: session.userId,
    action: "session.impersonation_end",
    details: { wasViewAs: effectiveRole(session) },
  });

  await setSession({ email: session.email, realRole: session.realRole });
  redirect(ROLE_HOME[session.realRole]);
}

export async function logout() {
  await clearSession();
  redirect("/login");
}

/* ── Magic-Link ──────────────────────────────────────────────── */

export async function requestMagicLink(formData: FormData) {
  const rawEmail = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!isValidEmail(rawEmail)) {
    redirect("/login?method=magic&error=invalid-email");
  }

  const limit = await rateLimit({
    scope: "magic-link",
    key: `${await ip()}:${rawEmail}`,
    limit: 3,
    windowSec: 600,
  });
  if (!limit.ok) {
    redirect("/login?method=magic&error=rate-limit");
  }

  // Existiert der User? Egal — wir antworten immer "gesendet", damit
  // E-Mail-Enumeration nicht möglich ist. Token wird nur erzeugt, wenn der
  // User existiert.
  const user = await prisma.user.findUnique({
    where: { email: rawEmail },
    select: { id: true, email: true },
  });

  if (user) {
    const created = await createToken({
      email: user.email,
      type: "magic_link",
      userId: user.id,
    });
    const url = `${await origin()}/login/magic-link/${created.token}`;
    await sendEmail(
      magicLinkEmail({
        email: user.email,
        url,
        expiresMin: created.expiresMinutes,
      })
    );
  }

  redirect("/login?method=magic&sent=1");
}

/* ── Password-Reset ──────────────────────────────────────────── */

export async function requestPasswordReset(formData: FormData) {
  const rawEmail = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!isValidEmail(rawEmail)) {
    redirect("/login/passwort-vergessen?error=invalid-email");
  }

  const limit = await rateLimit({
    scope: "password-reset",
    key: `${await ip()}:${rawEmail}`,
    limit: 3,
    windowSec: 900,
  });
  if (!limit.ok) {
    redirect("/login/passwort-vergessen?error=rate-limit");
  }

  const user = await prisma.user.findUnique({
    where: { email: rawEmail },
    select: { id: true, email: true },
  });

  if (user) {
    const created = await createToken({
      email: user.email,
      type: "password_reset",
      userId: user.id,
    });
    const url = `${await origin()}/login/passwort-zuruecksetzen?token=${created.token}`;
    await sendEmail(
      passwordResetEmail({
        email: user.email,
        url,
        expiresMin: created.expiresMinutes,
      })
    );
  }

  redirect(
    `/login/passwort-vergessen?sent=1&email=${encodeURIComponent(rawEmail)}`
  );
}

export async function resetPassword(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("password-confirm") ?? "");

  if (password.length < 12) {
    redirect(`/login/passwort-zuruecksetzen?token=${token}&error=too-short`);
  }
  if (password !== confirm) {
    redirect(`/login/passwort-zuruecksetzen?token=${token}&error=mismatch`);
  }

  const consumed = await consumeToken("password_reset", token);
  if (!consumed || !consumed.userId) {
    redirect("/login/passwort-zuruecksetzen?error=invalid-token");
  }

  const passwordHash = await hashPassword(password);
  await prisma.user.update({
    where: { id: consumed.userId },
    data: { passwordHash },
  });

  // Alle bestehenden Sessions des Users beenden — Sicherheits-Bestpractice
  await prisma.session
    .deleteMany({ where: { userId: consumed.userId } })
    .catch(() => undefined);

  redirect("/login/passwort-zuruecksetzen?ok=1");
}
