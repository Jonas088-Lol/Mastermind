/* Copyright 2026 Elian Schock, Jonas Schwenk */
import type { Role } from "@/lib/session";

/**
 * MasterOffice — geteilt von Schüler-, Lehrer-, Schulleitungs- und
 * Sekretariats-Ansicht.
 *
 * Dokumente, Tabellen und Präsentationen hängen ausschließlich am `userId`,
 * sind also von Haus aus rollenneutral. Nur die Guards und die fest
 * verdrahteten `/app/...`-Pfade waren auf Schüler zugeschnitten. Diese Datei
 * bündelt, unter welchem Präfix eine Rolle MasterOffice erreicht, damit jede
 * Ansicht ihre eigene Navigation behält.
 */

/** Basis-Pfad je Rolle — jede Ansicht bleibt in ihrer eigenen Shell. */
export function officeBasePath(role: Role | string): string {
  switch (role) {
    case "teacher":
      return "/teach/office";
    case "rector":
    case "vice_rector":
    // Plattform-Admins arbeiten in der Schulleitungs-Ansicht.
    case "admin":
    case "super":
      return "/rektor/office";
    case "secretary":
      return "/sekretariat/office";
    default:
      // Schüler behalten ihre gewohnten Pfade.
      return "/app";
  }
}

/** Rollen, die MasterOffice nutzen dürfen. */
export const OFFICE_ROLES = [
  "student",
  "teacher",
  "rector",
  "vice_rector",
  "secretary",
  "admin",
  "super",
] as const;

export function canUseOffice(role: Role | string): boolean {
  return (OFFICE_ROLES as readonly string[]).includes(role);
}

export interface OfficeTool {
  /** Pfad-Segment unterhalb des Basis-Pfads. */
  segment: string;
  label: string;
  icon: string;
}

/** Die vier MasterOffice-Bereiche — Quelle für Navigation und Kategorien. */
export const OFFICE_TOOLS: OfficeTool[] = [
  { segment: "dokumente", label: "MasterDoc", icon: "fileText" },
  { segment: "tabellen", label: "MasterCalc", icon: "grid" },
  { segment: "praesentationen", label: "MasterSlides", icon: "monitor" },
  { segment: "drive", label: "MasterDrive", icon: "hardDrive" },
  { segment: "folder", label: "MasterFolder", icon: "box" },
  { segment: "vault", label: "MasterVault", icon: "shield" },
];

/** Navigations-Einträge für eine Rolle (href + Label + Icon). */
export function officeNavItems(role: Role | string) {
  const base = officeBasePath(role);
  return OFFICE_TOOLS.map((t) => ({
    href: `${base}/${t.segment}`,
    label: t.label,
    icon: t.icon,
  }));
}

/** Die href-Liste für die Nav-Kategorie „MasterOffice". */
export function officeNavHrefs(role: Role | string): string[] {
  return officeNavItems(role).map((i) => i.href);
}
