/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { effectiveRole, getSession, type Role, type Session } from "@/lib/session";

/**
 * Zentrale Autorisierungs-Guards für Route Handler und Server Actions.
 *
 * Ziel: eine einheitliche Stelle für „eingeloggt?" und „richtige Rolle?",
 * damit kein Endpoint eine vergessene Prüfung hat und die Logik konsistent
 * ist (inkl. effectiveRole = viewAs bei super-Impersonation).
 *
 * Zwei Varianten:
 *  - requireSession/requireRole  → für Server Actions (redirect bei Fehler)
 *  - apiSession/apiRole          → für Route Handler (NextResponse bei Fehler)
 */

// ── Server Actions (werfen via redirect) ──────────────────────

/** Session erzwingen; sonst Redirect zum Login. */
export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

/** Rolle(n) erzwingen; sonst Redirect. */
export async function requireRole(...roles: Role[]): Promise<Session> {
  const session = await requireSession();
  if (!roles.includes(effectiveRole(session))) {
    redirect("/login");
  }
  return session;
}

// ── Route Handler (geben Fehler-Response zurück) ─────────────

type ApiResult = { session: Session } | { error: NextResponse };

/** Session für API-Routen. Rückgabe entweder Session oder 401-Response. */
export async function apiSession(): Promise<ApiResult> {
  const session = await getSession();
  if (!session) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { session };
}

/** Rolle für API-Routen. Rückgabe Session oder 401/403-Response. */
export async function apiRole(...roles: Role[]): Promise<ApiResult> {
  const res = await apiSession();
  if ("error" in res) return res;
  if (!roles.includes(effectiveRole(res.session))) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return res;
}

/**
 * Horizontale Zugriffskontrolle: prüft, dass eine Ressource dem Nutzer bzw.
 * seiner Schule gehört. Gibt true/false zurück — für die Verwendung nach dem
 * Laden der Ressource. Verhindert IDOR über die Rollenprüfung hinaus.
 */
export function ownsOrSameSchool(
  session: Session,
  resource: { userId?: string | null; schoolId?: string | null }
): boolean {
  if (resource.userId && resource.userId === session.userId) return true;
  if (
    resource.schoolId &&
    session.schoolId &&
    resource.schoolId === session.schoolId &&
    ["teacher", "admin", "secretary", "rector", "vice_rector"].includes(effectiveRole(session))
  ) {
    return true;
  }
  return false;
}
