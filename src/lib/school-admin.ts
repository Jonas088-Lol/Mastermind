/* Copyright 2026 Elian Schock, Jonas Schwenk */
import type { Role } from "@/lib/session";

/**
 * Schulverwaltung — früher die eigene Rolle „Schul-Admin".
 *
 * Diese Rolle gibt es im echten Schulbetrieb nicht; die Aufgaben liegen bei der
 * **Schulleitung** (strategisch/pädagogisch) und dem **Sekretariat** (operativ).
 * Deshalb ist sie aufgelöst: Beide Rollen teilen sich die Verwaltungsbereiche,
 * jeweils passend zu ihrer Verantwortung.
 *
 * Der Konrektor („vice_rector") ist ebenfalls entfallen — er hatte exakt die
 * gleichen Rechte wie der Schulleiter und ist damit fachlich die Schulleitung.
 */

/** Rollen, die überhaupt Schulverwaltung sehen dürfen. */
const MANAGING_ROLES: Role[] = ["rector", "secretary"];

export function canManageSchool(role: Role | string): boolean {
  return (MANAGING_ROLES as string[]).includes(role);
}

/** Kennung eines Verwaltungsbereichs (entspricht dem Pfad unter /admin). */
export type SchoolArea =
  | "nutzer" | "klassen" | "faecher" | "stundenplan" | "vertretungsplan"
  | "fehlzeiten" | "elternverwaltung" | "postfach" | "nachrichten"
  | "schulkalender" | "ressourcen" | "import" | "abgaben"
  | "anzeigetafel" | "anzeigetafel-verwaltung" | "einwilligungen"
  | "branding" | "lizenz" | "berichte" | "notenspiegel" | "notenschluessel"
  | "gamification" | "sicherheit" | "audit" | "einstellungen" | "integrationen";

/**
 * Schulleitung — strategisch, pädagogisch, rechtlich.
 * Alles, was die Schule als Ganzes betrifft oder Außenwirkung/Verantwortung hat.
 */
export const RECTOR_AREAS: SchoolArea[] = [
  "branding",
  "lizenz",
  "berichte",
  "notenspiegel",
  "notenschluessel",
  "gamification",
  "sicherheit",
  "audit",
  "einstellungen",
  "integrationen",
  "einwilligungen",
];

/**
 * Sekretariat — operatives Tagesgeschäft der Schulverwaltung.
 */
export const SECRETARY_AREAS: SchoolArea[] = [
  "nutzer",
  "klassen",
  "faecher",
  "stundenplan",
  "vertretungsplan",
  "fehlzeiten",
  "elternverwaltung",
  "postfach",
  "nachrichten",
  "schulkalender",
  "ressourcen",
  "import",
  "abgaben",
  "anzeigetafel",
  "anzeigetafel-verwaltung",
];

/** Bereiche, die eine Rolle sehen darf. */
export function areasForRole(role: Role | string): SchoolArea[] {
  if (role === "rector") return RECTOR_AREAS;
  if (role === "secretary") return SECRETARY_AREAS;
  return [];
}

/** Darf diese Rolle den Bereich öffnen? */
export function canAccessArea(role: Role | string, area: SchoolArea): boolean {
  return areasForRole(role).includes(area);
}

/**
 * Leitet den Bereich aus einem /admin-Pfad ab.
 * "/admin/klassen/abc" → "klassen"; "/admin" → null (Übersicht, immer erlaubt).
 */
export function areaFromPath(pathname: string): SchoolArea | null {
  const m = /^\/admin\/([^/?#]+)/.exec(pathname);
  return (m?.[1] as SchoolArea) ?? null;
}
