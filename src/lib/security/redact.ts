/* Copyright 2026 Elian Schock, Jonas Schwenk */
/**
 * Zentrale PII-Maskierung für Logs, Fehlermeldungen und Diagnose-Ausgaben.
 * Ziel: personenbezogene Daten (E-Mail, IP, Tokens) tauchen nicht im Klartext
 * in Logs auf (Art. 5/32 DSGVO, Datenminimierung in der Verarbeitung).
 */

/** "max.mustermann@schule.de" → "m***@schule.de" */
export function maskEmail(email: string | null | undefined): string {
  if (!email) return "(keine)";
  const at = email.indexOf("@");
  if (at < 1) return "***";
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  const first = local[0] ?? "";
  return `${first}***@${domain}`;
}

/** IPv4/IPv6 kürzen: nur Netzwerk-Präfix behalten (z.B. "84.130.x.x"). */
export function maskIp(ip: string | null | undefined): string {
  if (!ip) return "(keine)";
  if (ip.includes(":")) {
    // IPv6 → erste zwei Gruppen
    const parts = ip.split(":");
    return `${parts.slice(0, 2).join(":")}::/masked`;
  }
  const parts = ip.split(".");
  if (parts.length === 4) return `${parts[0]}.${parts[1]}.x.x`;
  return "***";
}

/** Zeigt nur Länge + Anfang eines Tokens/Secrets. */
export function maskToken(token: string | null | undefined): string {
  if (!token) return "(keins)";
  return `${token.slice(0, 4)}…(${token.length})`;
}

/** User-Agent auf Grobinfo kürzen (kein Fingerprint im Log). */
export function maskUserAgent(ua: string | null | undefined): string {
  if (!ua) return "(kein)";
  return ua.slice(0, 40);
}

/**
 * Deterministisches Pseudonym aus einer User-ID für Analytics/Statistik.
 * Gleiche ID → gleiches Pseudonym (Kohorten-Analyse möglich), aber ohne
 * Rückschluss auf Klarname/E-Mail. Mit SESSION_SECRET gesalzen, damit das
 * Pseudonym nicht extern reproduzierbar ist (Art. 4 Nr. 5 — Pseudonymisierung).
 */
export function pseudonymId(userId: string): string {
  // Lazy require, damit dieses Modul auch in Edge-Kontexten importierbar bleibt.
  const { createHmac } = require("node:crypto") as typeof import("node:crypto");
  const secret = process.env.SESSION_SECRET || "mm-pseudonym-dev-salt";
  return createHmac("sha256", secret).update(`analytics:${userId}`).digest("hex").slice(0, 16);
}
