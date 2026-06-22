/**
 * curriculum.ts
 * Server-only functions for deriving a user's subject set from their
 * (Bundesland, Schulart, Jahrgangsstufe) combination.
 */

import { Schulart } from "@prisma/client";
import { prisma } from "@/lib/db/client";

export type { Schulart };

export interface DerivedSubject {
  id: string;
  key: string;
  label: string;
  color: string;
  icon: string;
  order: number;
  wochenstunden: number | null;
  isWahlpflicht: boolean;
}

/** Fetch the subjects for a given curriculum combination. */
export async function deriveSubjects(
  bundeslandCode: string,
  schulart: Schulart,
  jahrgangsstufe: number,
): Promise<DerivedSubject[]> {
  const rows = await prisma.curriculum.findMany({
    where: { bundeslandCode, schulart, jahrgangsstufe },
    include: { subject: true },
    orderBy: { subject: { order: "asc" } },
  });

  return rows.map((r) => ({
    id:            r.subject.id,
    key:           r.subject.key,
    label:         r.subject.label,
    color:         r.subject.color,
    icon:          r.subject.icon,
    order:         r.subject.order,
    wochenstunden: r.wochenstunden,
    isWahlpflicht: r.isWahlpflicht,
  }));
}

/**
 * Returns only the Pflichtfächer (non-wahlpflicht) — used for tree generation
 * when the user hasn't selected their optional subjects yet.
 */
export async function derivePflichtfaecher(
  bundeslandCode: string,
  schulart: Schulart,
  jahrgangsstufe: number,
): Promise<DerivedSubject[]> {
  const all = await deriveSubjects(bundeslandCode, schulart, jahrgangsstufe);
  return all.filter((s) => !s.isWahlpflicht);
}

/** Human-readable Schulart labels (de). */
export const SCHULART_LABELS: Record<Schulart, string> = {
  GRUNDSCHULE:      "Grundschule",
  MITTELSCHULE:     "Mittelschule",
  REALSCHULE:       "Realschule",
  GYMNASIUM:        "Gymnasium",
  WIRTSCHAFTSSCHULE:"Wirtschaftsschule",
  FOS:              "FOS",
  BOS:              "BOS",
  FOERDERSCHULE:    "Förderschule",
  GESAMTSCHULE:     "Gesamtschule",
};

/** Schularten available per Bundesland (subset — others are stubs). */
export const SCHULARTEN_BY_BUNDESLAND: Record<string, Schulart[]> = {
  BY: [Schulart.GRUNDSCHULE, Schulart.MITTELSCHULE, Schulart.REALSCHULE,
       Schulart.GYMNASIUM, Schulart.WIRTSCHAFTSSCHULE, Schulart.FOS,
       Schulart.BOS, Schulart.FOERDERSCHULE],
  // Stubs — fill in as more curricula are seeded:
  BW: [Schulart.GRUNDSCHULE, Schulart.REALSCHULE, Schulart.GYMNASIUM, Schulart.GESAMTSCHULE],
  NW: [Schulart.GRUNDSCHULE, Schulart.REALSCHULE, Schulart.GYMNASIUM, Schulart.GESAMTSCHULE],
  _default: [Schulart.GRUNDSCHULE, Schulart.REALSCHULE, Schulart.GYMNASIUM],
};

export function getSchularten(bundeslandCode: string): Schulart[] {
  return SCHULARTEN_BY_BUNDESLAND[bundeslandCode] ?? SCHULARTEN_BY_BUNDESLAND["_default"]!;
}

/** Grade ranges per Schulart. */
export const GRADE_RANGE: Record<Schulart, [number, number]> = {
  GRUNDSCHULE:       [1, 4],
  MITTELSCHULE:      [5, 10],
  REALSCHULE:        [5, 10],
  GYMNASIUM:         [5, 12],
  WIRTSCHAFTSSCHULE: [7, 10],
  FOS:               [11, 12],
  BOS:               [11, 12],
  FOERDERSCHULE:     [1, 9],
  GESAMTSCHULE:      [5, 10],
};
