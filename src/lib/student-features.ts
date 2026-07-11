import { prisma } from "@/lib/db/client";
import { safeJsonParse } from "@/lib/safe-json";

/**
 * Schüler-Zusatzrollen ("Features") — mehrere pro Account kombinierbar.
 * Gespeichert als JSON-Array in User.studentFeatures.
 */

export const STUDENT_FEATURES = [
  { key: "klassensprecher",  label: "Klassensprecher",  icon: "🗣️", description: "Kann Nachrichten an die eigene Klasse senden" },
  { key: "schuelersprecher", label: "Schülersprecher",  icon: "📣", description: "Kann schulweite Nachrichten an alle Schüler senden" },
  { key: "schuelerzeitung",  label: "Schülerzeitung",   icon: "📰", description: "Kann Artikel in der Schülerzeitung veröffentlichen" },
] as const;

export type StudentFeature = (typeof STUDENT_FEATURES)[number]["key"];

const VALID = new Set<string>(STUDENT_FEATURES.map((f) => f.key));

export function parseStudentFeatures(raw: string | null | undefined): StudentFeature[] {
  if (!raw) return [];
  const arr = safeJsonParse<unknown>(raw, []);
  if (!Array.isArray(arr)) return [];
  return arr.filter((f): f is StudentFeature => typeof f === "string" && VALID.has(f));
}

export function serializeStudentFeatures(features: string[]): string | null {
  const clean = [...new Set(features.filter((f) => VALID.has(f)))];
  return clean.length > 0 ? JSON.stringify(clean) : null;
}

/** Features eines Users aus der DB (leer bei Nicht-Schülern). */
export async function getStudentFeatures(userId: string): Promise<StudentFeature[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, studentFeatures: true },
  });
  if (!user || user.role !== "student") return [];
  return parseStudentFeatures(user.studentFeatures);
}

export function featureLabel(key: string): string {
  return STUDENT_FEATURES.find((f) => f.key === key)?.label ?? key;
}
