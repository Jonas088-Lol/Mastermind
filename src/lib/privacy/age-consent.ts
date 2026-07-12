/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { prisma } from "@/lib/db/client";

/**
 * Technischer Rahmen für Altersprüfung & Elternzustimmung (Art. 8 DSGVO).
 *
 * ⚖️ WICHTIG: Dies ist der technische Unterbau (Age-Gate, Consent-Records mit
 * Zeitstempel/Version). Die rechtssichere Ausgestaltung — welche
 * Verifikationsmethode genügt, wie die Elternzustimmung nachgewiesen wird —
 * ist mit DSB/Anwalt zu klären. Der Code erzwingt hier keine spezifische
 * Methode, sondern protokolliert nachvollziehbar, was passiert ist.
 *
 * In Deutschland liegt die Altersgrenze der Einwilligungsfähigkeit bei 16
 * Jahren (Art. 8 Abs. 1 DSGVO, keine abweichende nationale Regelung nach unten).
 */

export const CONSENT_AGE = 16;
export const CONSENT_VERSION = "1.0";

export type AgeBand = "under16" | "16plus" | "adult";

/** Altersband aus einem Geburtsdatum ableiten. */
export function ageBandFromBirthDate(birthDate: Date, now = new Date()): AgeBand {
  let age = now.getFullYear() - birthDate.getFullYear();
  const m = now.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birthDate.getDate())) age--;
  if (age < CONSENT_AGE) return "under16";
  if (age < 18) return "16plus";
  return "adult";
}

export function isMinorBand(band: AgeBand): boolean {
  return band === "under16";
}

/**
 * Erfasst das Ergebnis des Age-Gates. Legt/aktualisiert den AgeVerification-
 * Record. Gibt zurück, ob für diesen Nutzer noch eine Elternzustimmung aussteht.
 */
export async function recordAgeDeclaration(params: {
  userId: string;
  band: AgeBand;
  ipAddress?: string | null;
}): Promise<{ needsParentConsent: boolean }> {
  const isMinor = isMinorBand(params.band);
  await prisma.ageVerification.upsert({
    where: { userId: params.userId },
    create: {
      userId: params.userId,
      declaredAgeBand: params.band,
      isMinor,
      ipAddress: params.ipAddress ?? null,
      consentVersion: CONSENT_VERSION,
    },
    update: {
      declaredAgeBand: params.band,
      isMinor,
    },
  });
  return { needsParentConsent: isMinor };
}

/**
 * Protokolliert eine erteilte Elternzustimmung. `method` dokumentiert, wie sie
 * eingeholt wurde (z.B. Bestätigungslink an Eltern-E-Mail, Schul-verifiziert,
 * verknüpftes Eltern-Konto).
 */
export async function recordParentConsent(params: {
  userId: string;
  parentEmail?: string | null;
  method: "email_confirmation" | "school_verified" | "parent_account";
  ipAddress?: string | null;
}): Promise<void> {
  await prisma.ageVerification.update({
    where: { userId: params.userId },
    data: {
      parentConsent: true,
      parentEmail: params.parentEmail ?? null,
      parentConsentAt: new Date(),
      consentMethod: params.method,
      consentVersion: CONSENT_VERSION,
      ipAddress: params.ipAddress ?? null,
    },
  });
}

/**
 * Prüft, ob die Verarbeitung für diesen Nutzer rechtlich abgedeckt ist:
 * volljährig/16+ ODER (minderjährig UND Elternzustimmung vorhanden).
 * Nutzer ohne AgeVerification gelten als "noch nicht geprüft" (blockierend
 * je nach Aufrufer).
 */
export async function hasValidConsent(userId: string): Promise<{
  ok: boolean;
  reason: "ok" | "no_record" | "parent_consent_missing";
}> {
  const av = await prisma.ageVerification.findUnique({
    where: { userId },
    select: { isMinor: true, parentConsent: true },
  });
  if (!av) return { ok: false, reason: "no_record" };
  if (!av.isMinor) return { ok: true, reason: "ok" };
  if (av.parentConsent) return { ok: true, reason: "ok" };
  return { ok: false, reason: "parent_consent_missing" };
}
