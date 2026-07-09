/**
 * Zentrales Datenklassifizierungs-Schema (Art. 5, 25, 32 DSGVO).
 *
 * Eine einzige Quelle der Wahrheit dafür, welche Daten wie schützenswert sind.
 * Wird referenziert von:
 *  - Field-Level-Encryption (Phase 2): welche Felder verschlüsselt werden
 *  - Datenexport/Löschung (Phase 11): was exportiert/anonymisiert wird
 *  - Logging/Redaction: was maskiert werden muss
 *  - VVT/Doku (Phase 14): Verzeichnis von Verarbeitungstätigkeiten
 *
 * Die Zuordnung ist bewusst konservativ: Im Zweifel höhere Schutzstufe.
 * Ein großer Teil der Nutzer ist minderjährig → viele Felder sind
 * SENSITIVE_MINOR statt nur PII.
 */

export enum DataClass {
  /** Frei zugänglich, kein Personenbezug (z.B. Fächerkatalog, Landkreise). */
  PUBLIC = "PUBLIC",
  /** Intern, aber kein Personenbezug (Konfiguration, aggregierte Zähler). */
  INTERNAL = "INTERNAL",
  /** Personenbezogene Daten (Art. 4 Nr. 1). */
  PII = "PII",
  /** PII von Minderjährigen oder besonders sensible Profile (Art. 8). */
  SENSITIVE_MINOR = "SENSITIVE_MINOR",
  /** Besondere Kategorien (Art. 9), z.B. Gesundheit aus Krankmeldungen. */
  SPECIAL_CATEGORY = "SPECIAL_CATEGORY",
  /** Authentifizierungs-Geheimnisse (Hashes, Tokens, Secrets). */
  SECRET = "SECRET",
}

export type FieldClassification = {
  model: string;
  field: string;
  class: DataClass;
  /** Zweck der Verarbeitung (für VVT). */
  purpose: string;
  /** Empfohlene Behandlung. */
  encrypt?: boolean;
  redactInLogs?: boolean;
};

/**
 * Klassifizierung der schützenswerten Felder. Nicht gelistete Felder gelten
 * als INTERNAL. Diese Liste deckt die im Audit (Data Map, 09.07.2026)
 * identifizierten personenbezogenen Felder ab.
 */
export const FIELD_CLASSIFICATIONS: FieldClassification[] = [
  // ── Auth-Geheimnisse ──────────────────────────────────────
  { model: "User", field: "passwordHash", class: DataClass.SECRET, purpose: "Authentifizierung", redactInLogs: true },
  { model: "User", field: "twoFactorSecret", class: DataClass.SECRET, purpose: "2FA", encrypt: true, redactInLogs: true },
  { model: "Session", field: "token", class: DataClass.SECRET, purpose: "Session", redactInLogs: true },
  { model: "BackupCode", field: "codeHash", class: DataClass.SECRET, purpose: "2FA-Wiederherstellung", redactInLogs: true },
  { model: "VerificationToken", field: "token", class: DataClass.SECRET, purpose: "E-Mail-/Reset-Verifikation", redactInLogs: true },
  { model: "SsoConfig", field: "clientSecret", class: DataClass.SECRET, purpose: "SSO", encrypt: true, redactInLogs: true },
  { model: "ApiToken", field: "tokenHash", class: DataClass.SECRET, purpose: "API-Zugriff", redactInLogs: true },
  { model: "PushSubscription", field: "auth", class: DataClass.SECRET, purpose: "Web-Push", redactInLogs: true },
  { model: "PushSubscription", field: "p256dh", class: DataClass.SECRET, purpose: "Web-Push", redactInLogs: true },

  // ── Identität ─────────────────────────────────────────────
  { model: "User", field: "name", class: DataClass.SENSITIVE_MINOR, purpose: "Konto/Anzeige", redactInLogs: true },
  { model: "User", field: "email", class: DataClass.PII, purpose: "Konto/Kommunikation", redactInLogs: true },
  { model: "User", field: "bio", class: DataClass.SENSITIVE_MINOR, purpose: "Profil (optional)" },
  { model: "User", field: "quote", class: DataClass.SENSITIVE_MINOR, purpose: "Profil (optional)" },
  { model: "User", field: "avatarUrl", class: DataClass.PII, purpose: "Profilbild" },

  // ── Netzwerk-Identifier ───────────────────────────────────
  { model: "Session", field: "ipAddress", class: DataClass.PII, purpose: "Session-Sicherheit", redactInLogs: true },
  { model: "Session", field: "userAgent", class: DataClass.PII, purpose: "Session-Sicherheit", redactInLogs: true },
  { model: "UserConsent", field: "ipAddress", class: DataClass.PII, purpose: "Einwilligungsnachweis", redactInLogs: true },
  { model: "AuditLog", field: "ip", class: DataClass.PII, purpose: "Sicherheits-Audit", redactInLogs: true },

  // ── Leistungsdaten (Minderjährige) ────────────────────────
  { model: "Grade", field: "value", class: DataClass.SENSITIVE_MINOR, purpose: "Bewertung" },
  { model: "Grade", field: "comment", class: DataClass.SENSITIVE_MINOR, purpose: "Bewertung" },
  { model: "Grade", field: "topic", class: DataClass.SENSITIVE_MINOR, purpose: "Kompetenz-Heatmap" },
  { model: "Submission", field: "content", class: DataClass.SENSITIVE_MINOR, purpose: "Abgabe" },

  // ── Gesundheitsnahe / besondere Kategorien ────────────────
  { model: "Absence", field: "reason", class: DataClass.SPECIAL_CATEGORY, purpose: "Entschuldigung (kann Krankheit nennen)", redactInLogs: true },
  { model: "AttendanceRecord", field: "reason", class: DataClass.SPECIAL_CATEGORY, purpose: "Fehlzeit (kann Krankheit nennen)", redactInLogs: true },

  // ── Verhaltens-/Disziplinprofile ──────────────────────────
  { model: "ClassbookIncident", field: "text", class: DataClass.SENSITIVE_MINOR, purpose: "Klassenbuch" },
  { model: "TeacherMeetingNote", field: "notes", class: DataClass.SENSITIVE_MINOR, purpose: "Elterngespräch" },
  { model: "TeacherMeetingNote", field: "parentName", class: DataClass.PII, purpose: "Elterngespräch" },

  // ── Kommunikationsinhalte ─────────────────────────────────
  { model: "Message", field: "content", class: DataClass.PII, purpose: "Nachrichten" },
  { model: "DirectMessage", field: "content", class: DataClass.PII, purpose: "Direktnachrichten" },
  { model: "SpaceMessage", field: "content", class: DataClass.PII, purpose: "Space-Chat" },
  { model: "MailboxEmail", field: "bodyHtml", class: DataClass.PII, purpose: "Postfach" },
  { model: "MailboxEmail", field: "bodyText", class: DataClass.PII, purpose: "Postfach" },

  // ── Aktivitäts-/Tracking-Daten ────────────────────────────
  { model: "ActivitySession", field: "currentActivity", class: DataClass.SENSITIVE_MINOR, purpose: "Lernzeit-Monitoring (einwilligungsbasiert)" },
  { model: "ActivitySession", field: "tabSwitches", class: DataClass.SENSITIVE_MINOR, purpose: "Lernzeit-Monitoring (einwilligungsbasiert)" },

  // ── Zahlungsdaten ─────────────────────────────────────────
  { model: "StripeOrder", field: "sessionId", class: DataClass.PII, purpose: "Zahlung" },
  { model: "MollieOrder", field: "mollieId", class: DataClass.PII, purpose: "Zahlung" },
];

// ── Nachschlage-Helfer ───────────────────────────────────────

const byKey = new Map(FIELD_CLASSIFICATIONS.map((c) => [`${c.model}.${c.field}`, c]));

export function classify(model: string, field: string): FieldClassification | undefined {
  return byKey.get(`${model}.${field}`);
}

/** Alle Felder, die field-level verschlüsselt werden sollen. */
export function fieldsToEncrypt(): FieldClassification[] {
  return FIELD_CLASSIFICATIONS.filter((c) => c.encrypt);
}

/** Alle Felder, die in Logs maskiert werden müssen. */
export function fieldsToRedact(): FieldClassification[] {
  return FIELD_CLASSIFICATIONS.filter((c) => c.redactInLogs);
}

/** Prüft, ob ein Feld eine besondere Kategorie (Art. 9) ist. */
export function isSpecialCategory(model: string, field: string): boolean {
  return classify(model, field)?.class === DataClass.SPECIAL_CATEGORY;
}
