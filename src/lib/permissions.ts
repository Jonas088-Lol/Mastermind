/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { prisma } from "@/lib/db/client";
import { safeJsonParse } from "@/lib/safe-json";
import type { Session } from "@/lib/session";
import { effectiveRole } from "@/lib/session";

/**
 * Rollenrechte je Schule — „wer darf was".
 *
 * Die Schulleitung kann einzelne Fähigkeiten pro Rolle ein- und ausschalten.
 * Gespeichert wird nur, was vom Standard abweicht (`School.rolePermissions`);
 * fehlt ein Eintrag, gilt der Standard aus diesem Katalog. Dadurch wirken neue
 * Fähigkeiten sofort sinnvoll, ohne dass jede Schule nachpflegen muss.
 */

export type Capability =
  // Lehrkräfte
  | "teacher.broadcast"
  | "teacher.class_message"
  | "teacher.create_exercises"
  | "teacher.ai_generator"
  | "teacher.parent_slots"
  // Schüler
  | "student.ai_tutor"
  | "student.community"
  | "student.duels"
  | "student.shop"
  | "student.masterspace"
  | "student.newspaper";

export interface CapabilityDef {
  id: Capability;
  /** Rolle, für die die Fähigkeit gilt. */
  role: "teacher" | "student";
  label: string;
  description: string;
  /** Standard, wenn die Schule nichts eingestellt hat. */
  default: boolean;
  group: string;
}

export const CAPABILITIES: CapabilityDef[] = [
  // ── Lehrkräfte ────────────────────────────────────────────────────────────
  {
    id: "teacher.class_message",
    role: "teacher",
    group: "Kommunikation",
    label: "Nachrichten an ganze Klassen",
    description: "Lehrkräfte können eine Nachricht an alle Schüler einer Klasse senden.",
    default: true,
  },
  {
    id: "teacher.broadcast",
    role: "teacher",
    group: "Kommunikation",
    label: "Rundnachrichten (Broadcast)",
    description: "Lehrkräfte können Rundnachrichten verschicken.",
    default: true,
  },
  {
    id: "teacher.parent_slots",
    role: "teacher",
    group: "Kommunikation",
    label: "Elternsprechtag-Termine anbieten",
    description: "Lehrkräfte können eigene Gesprächstermine eintragen.",
    default: true,
  },
  {
    id: "teacher.create_exercises",
    role: "teacher",
    group: "Unterricht",
    label: "Eigene Übungen erstellen",
    description: "Lehrkräfte können Übungsaufgaben für ihre Klassen anlegen.",
    default: true,
  },
  {
    id: "teacher.ai_generator",
    role: "teacher",
    group: "Unterricht",
    label: "KI-Generator nutzen",
    description: "Erstellt Arbeitsblätter und Aufgaben mit KI-Unterstützung.",
    default: true,
  },

  // ── Schüler ───────────────────────────────────────────────────────────────
  {
    id: "student.ai_tutor",
    role: "student",
    group: "Lernen",
    label: "KI-Tutor",
    description: "Schüler können den KI-Tutor für Fragen nutzen.",
    default: true,
  },
  {
    id: "student.masterspace",
    role: "student",
    group: "Kommunikation",
    label: "MasterSpace",
    description: "Zugang zu Sprach-/Videoräumen und Kanälen.",
    default: true,
  },
  {
    id: "student.community",
    role: "student",
    group: "Kommunikation",
    label: "Community",
    description: "Öffentliche Notizen und Community-Bereich.",
    default: true,
  },
  {
    id: "student.newspaper",
    role: "student",
    group: "Kommunikation",
    label: "Schülerzeitung",
    description: "Zugriff auf die Schülerzeitung.",
    default: true,
  },
  {
    id: "student.duels",
    role: "student",
    group: "Spiel",
    label: "Duelle",
    description: "Schüler können sich gegenseitig herausfordern.",
    default: true,
  },
  {
    id: "student.shop",
    role: "student",
    group: "Spiel",
    label: "Shop & Münzen",
    description: "Belohnungssystem mit Shop, Inventar und Münzen.",
    default: true,
  },
];

/** Gespeicherte Abweichungen: { rolle: { fähigkeit: boolean } } */
export type PermissionOverrides = Record<string, Record<string, boolean>>;

export function defaultFor(capability: Capability): boolean {
  return CAPABILITIES.find((c) => c.id === capability)?.default ?? false;
}

/** Wendet die Abweichungen einer Schule auf den Standard an. */
export function resolveCapability(
  capability: Capability,
  role: string,
  overrides: PermissionOverrides | null,
): boolean {
  const value = overrides?.[role]?.[capability];
  return typeof value === "boolean" ? value : defaultFor(capability);
}

/** Liest die Abweichungen einer Schule. */
export async function getPermissionOverrides(
  schoolId: string | null | undefined,
): Promise<PermissionOverrides | null> {
  if (!schoolId) return null;
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { rolePermissions: true },
  });
  return safeJsonParse<PermissionOverrides>(school?.rolePermissions ?? null, {});
}

/**
 * Darf der angemeldete Nutzer diese Fähigkeit nutzen?
 *
 * Nutzer ohne Schule (private Accounts) behalten die Standardrechte — dort gibt
 * es keine Schulleitung, die etwas einschränken könnte.
 */
export async function can(session: Session, capability: Capability): Promise<boolean> {
  const role = effectiveRole(session);
  const def = CAPABILITIES.find((c) => c.id === capability);
  // Fähigkeit gilt nur für die vorgesehene Rolle.
  if (!def || def.role !== role) return false;
  if (!session.schoolId) return def.default;

  const overrides = await getPermissionOverrides(session.schoolId);
  return resolveCapability(capability, role, overrides);
}
