/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { randomBytes, createHash } from "node:crypto";
import { cookies, headers } from "next/headers";
import { signSession, verifySession } from "@/lib/auth/cookies";
import { verifyPassword, hashPassword, needsRehash } from "@/lib/auth/passwords";
import { prisma } from "@/lib/db/client";

export type Role =
  | "student"
  | "teacher"
  | "parent"
  | "admin"
  | "super"
  | "secretary"
  | "rector"
  | "vice_rector"
  | "school_company";

export const ROLES: Role[] = ["student", "teacher", "parent", "admin", "super", "secretary", "rector", "vice_rector", "school_company"];

/**
 * Rollen, die ein Schul-Admin einem Nutzer seiner Schule zuweisen darf.
 * Bewusst OHNE "super" und "school_company" — plattformweite Rollen dürfen
 * niemals über die Schul-Admin-Oberfläche vergeben werden (Privilege Escalation).
 */
export const ASSIGNABLE_BY_ADMIN: Role[] = ["student", "teacher", "parent", "secretary", "rector", "vice_rector", "admin"];

/** Prüft, ob ein Wert eine gültige, vom Admin vergebbare Rolle ist. */
export function isAssignableRole(value: unknown): value is Role {
  return typeof value === "string" && (ASSIGNABLE_BY_ADMIN as string[]).includes(value);
}

/** Rollen, in die ein super-User wechseln kann */
export const VIEW_ROLES: Role[] = ["student", "teacher", "parent", "admin", "secretary", "rector", "vice_rector"];

export const ROLE_LABEL: Record<Role, string> = {
  student: "Schüler",
  teacher: "Lehrer",
  parent: "Eltern",
  admin: "Schul-Admin",
  super: "Plattform-Admin",
  secretary: "Sekretariat",
  rector: "Schulleiter",
  vice_rector: "Stellv. Schulleiter",
  school_company: "Schulträger",
};

export const ROLE_HOME: Record<Role, string> = {
  student: "/app",
  teacher: "/teach",
  parent: "/eltern",
  admin: "/admin",
  super: "/plattform",
  secretary: "/sekretariat",
  rector: "/rektor",
  vice_rector: "/rektor",
  school_company: "/schultraeger",
};

export const DEMO_USERS: Record<Role, { name: string; subtitle: string }> = {
  student: { name: "Lukas Meier", subtitle: "Klasse 9b" },
  teacher: { name: "Markus Becker", subtitle: "Mathe · Physik" },
  parent: { name: "Sandra Meier", subtitle: "Mutter von Lukas" },
  admin: { name: "Andrea Hoffmann", subtitle: "Realschule München" },
  super: { name: "Plattform-Admin", subtitle: "MasterMind Demo" },
  secretary: { name: "Martina Berger", subtitle: "Sekretariat" },
  rector: { name: "Dr. Klaus Müller", subtitle: "Schulleiter" },
  vice_rector: { name: "Sabine Wolf", subtitle: "Konrektorin" },
  school_company: { name: "Schulträger GmbH", subtitle: "Verwaltung" },
};

export interface Account {
  email: string;
  role: Role;
}

/**
 * Demo-Account-Liste, nur für die Anzeige auf der Login-Seite ("Demo-Quick-Login").
 * Die echte Authentifizierung läuft gegen die DB (siehe validateCredentials).
 * Die Liste hier muss mit prisma/seed.ts synchron bleiben.
 */
export const DEMO_ACCOUNTS: Account[] = [
  { email: "super@mastermind.app", role: "super" },
  { email: "admin@schule.de", role: "admin" },
  { email: "becker@schule.de", role: "teacher" },
  { email: "lukas@schule.de", role: "student" },
  { email: "sandra.meier@email.de", role: "parent" },
];

/** Backwards-compat-Alias für bestehende Aufrufer. */
export const ACCOUNTS = DEMO_ACCOUNTS;

/** Plaintext-Passwörter — nur für die Demo-Login-Liste auf der Login-Seite. */
export const DEMO_PASSWORDS: Record<string, string> = {
  "super@mastermind.app": "super",
  "admin@schule.de": "admin",
  "becker@schule.de": "lehrer",
  "lukas@schule.de": "schueler",
  "sandra.meier@email.de": "eltern",
};

const DUMMY_HASH =
  "scrypt$00000000000000000000000000000000$00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000";

export async function validateCredentials(
  email: string,
  password: string
): Promise<Account | null> {
  const trimmed = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email: trimmed },
    select: { id: true, email: true, role: true, passwordHash: true },
  });
  if (!user) {
    await verifyPassword(password, DUMMY_HASH);
    return null;
  }
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return null;
  if (!ROLES.includes(user.role as Role)) return null;

  // Passwort-Hash bei Bedarf transparent auf aktuelle Kosten-Parameter heben.
  if (needsRehash(user.passwordHash)) {
    const fresh = await hashPassword(password);
    await prisma.user
      .update({ where: { id: user.id }, data: { passwordHash: fresh } })
      .catch(() => undefined);
  }

  return { email: user.email, role: user.role as Role };
}

export async function findFirstUserWithRole(
  role: Role
): Promise<Account | null> {
  const user = await prisma.user.findFirst({
    where: { role },
    select: { email: true, role: true },
    orderBy: { createdAt: "asc" },
  });
  if (!user) return null;
  return { email: user.email, role: user.role as Role };
}

/* ── Session-Layer ─────────────────────────────────────────── */

export interface Session {
  userId: string;
  email: string;
  name: string;
  klasse?: string;
  classId?: string;
  schoolId?: string;
  realRole: Role;
  viewAs?: Role;
  /** Plattform-weiter Super-Admin (aus User.isSuperAdmin) */
  isSuperAdmin: boolean;
  /** 2FA aktiv (aus User.twoFactor) */
  twoFactor: boolean;
  /** Server-Side Session-ID (DB) */
  sid: string;
  /** Issued-At, Sekunden seit Epoch */
  iat: number;
}

interface CookieEnvelope {
  sid: string;
}

const COOKIE = "mm_session";
const ONE_WEEK_SEC = 60 * 60 * 24 * 365;
const ONE_WEEK_MS = ONE_WEEK_SEC * 1000;

function generateSessionToken(): string {
  return randomBytes(32)
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

/**
 * Der rohe Session-Token liegt nur im (HMAC-signierten) Cookie. In der DB wird
 * ausschließlich der SHA-256-Hash gespeichert — ein DB-Leak allein erlaubt so
 * keine Session-Übernahme.
 */
function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

async function clientHints(): Promise<{ ip?: string; ua?: string }> {
  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    undefined;
  const ua = h.get("user-agent") ?? undefined;
  return { ip, ua };
}

export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  const value = store.get(COOKIE)?.value;
  const envelope = verifySession<CookieEnvelope>(value);
  if (!envelope?.sid) return null;

  const row = await prisma.session.findUnique({
    where: { token: hashSessionToken(envelope.sid) },
    select: {
      id: true,
      userId: true,
      expiresAt: true,
      viewAs: true,
      createdAt: true,
      user: { select: { id: true, email: true, name: true, role: true, klasse: true, classId: true, schoolId: true, isSuperAdmin: true, twoFactor: true } },
    },
  });
  if (!row) return null;
  if (row.expiresAt < new Date()) {
    // Best-effort GC
    await prisma.session
      .delete({ where: { id: row.id } })
      .catch(() => undefined);
    return null;
  }

  // Touch lastUsedAt — best-effort, keine Fehler-Propagation
  prisma.session
    .update({
      where: { id: row.id },
      data: { lastUsedAt: new Date() },
    })
    .catch(() => undefined);

  if (!ROLES.includes(row.user.role as Role)) return null;
  const viewAs =
    row.viewAs && VIEW_ROLES.includes(row.viewAs as Role)
      ? (row.viewAs as Role)
      : undefined;

  return {
    userId: row.userId,
    email: row.user.email,
    name: row.user.name,
    klasse: row.user.klasse ?? undefined,
    classId: row.user.classId ?? undefined,
    schoolId: row.user.schoolId ?? undefined,
    realRole: row.user.role as Role,
    viewAs,
    isSuperAdmin: row.user.isSuperAdmin === true,
    twoFactor: row.user.twoFactor === true,
    sid: envelope.sid,
    iat: Math.floor(row.createdAt.getTime() / 1000),
  };
}

export interface SetSessionInput {
  email: string;
  realRole: Role;
  viewAs?: Role;
}

export async function setSession(input: SetSessionInput): Promise<void> {
  const store = await cookies();
  const existing = store.get(COOKIE)?.value;
  const previous = verifySession<CookieEnvelope>(existing);

  // Existing session löschen — wir geben immer einen neuen Token aus.
  if (previous?.sid) {
    await prisma.session
      .delete({ where: { token: hashSessionToken(previous.sid) } })
      .catch(() => undefined);
  }

  const user = await prisma.user.findUnique({
    where: { email: input.email.toLowerCase() },
    select: { id: true, role: true },
  });
  if (!user) throw new Error("User existiert nicht in der DB");
  if (user.role !== input.realRole) {
    throw new Error("Rollen-Konflikt zwischen Input und DB-User");
  }

  const token = generateSessionToken();
  const { ip, ua } = await clientHints();

  await prisma.session.create({
    data: {
      userId: user.id,
      token: hashSessionToken(token),
      expiresAt: new Date(Date.now() + ONE_WEEK_MS),
      ipAddress: ip,
      userAgent: ua,
      viewAs: input.viewAs ?? null,
    },
  });

  store.set(COOKIE, signSession<CookieEnvelope>({ sid: token }), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: ONE_WEEK_SEC,
    secure: process.env.NODE_ENV === "production",
  });
}

export async function clearSession() {
  const store = await cookies();
  const envelope = verifySession<CookieEnvelope>(store.get(COOKIE)?.value);
  if (envelope?.sid) {
    await prisma.session
      .delete({ where: { token: hashSessionToken(envelope.sid) } })
      .catch(() => undefined);
  }
  store.delete(COOKIE);
}

/**
 * Beendet ALLE DB-Sessions eines Nutzers. Nach Passwort-Reset/-Änderung, damit
 * mit dem alten Passwort erlangte Sessions sofort ungültig werden.
 */
export async function invalidateAllSessions(userId: string): Promise<void> {
  await prisma.session.deleteMany({ where: { userId } }).catch(() => undefined);
}

/**
 * Beendet alle Sessions eines Nutzers AUSSER der aktuellen. Für Passwort-
 * Änderung durch den eingeloggten Nutzer selbst (er bleibt eingeloggt, alle
 * anderen Geräte/Sitzungen fliegen raus).
 */
export async function invalidateOtherSessions(userId: string): Promise<void> {
  const store = await cookies();
  const envelope = verifySession<CookieEnvelope>(store.get(COOKIE)?.value);
  const currentHash = envelope?.sid ? hashSessionToken(envelope.sid) : null;
  await prisma.session
    .deleteMany({
      where: {
        userId,
        ...(currentHash ? { token: { not: currentHash } } : {}),
      },
    })
    .catch(() => undefined);
}

/** Effektive Rolle: falls super eine viewAs gesetzt hat, gilt diese. */
export function effectiveRole(s: Session): Role {
  if (s.viewAs) return s.viewAs;
  return s.realRole;
}

export function isSuper(s: Session): boolean {
  return s.realRole === "super";
}

export function isImpersonating(s: Session): boolean {
  return Boolean(s.viewAs);
}

const ROLE_SUBTITLE: Record<Role, string> = {
  student: "Schüler",
  teacher: "Lehrkraft",
  parent: "Elternteil",
  admin: "Schul-Admin",
  super: "Plattform-Admin",
  secretary: "Sekretariat",
  rector: "Schulleiter",
  vice_rector: "Stellv. Schulleiter",
  school_company: "Schulträger",
};

export function isPrivateUser(session: Session): boolean {
  return !session.schoolId;
}

/** Header-User: super bei Impersonation zeigt Zielrolle als Demo-Kontext. */
export function displayUser(s: Session): { name: string; subtitle: string } {
  if (isSuper(s) && s.viewAs) return DEMO_USERS[s.viewAs];
  const subtitle =
    s.realRole === "student" && s.klasse
      ? `Klasse ${s.klasse}`
      : ROLE_SUBTITLE[s.realRole];
  return { name: s.name, subtitle };
}
