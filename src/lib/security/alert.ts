/* Copyright 2026 Elian Schock, Jonas Schwenk */
/**
 * Fehler-Alerting per E-Mail.
 *
 * Wird von logger.error() in Produktion gefeuert. Pro Fehler-Signatur nur
 * 1 Mail / 15 Min (Rate-Limit), damit ein Fehler-Sturm nicht das Postfach
 * flutet. Alerting darf NIE den Hauptpfad stören — alle Fehler werden geschluckt.
 *
 * Aktiv nur wenn: NODE_ENV=production, ALERT_EMAIL gesetzt, E-Mail konfiguriert.
 */

export async function alertError(title: string, detail: string): Promise<void> {
  if (process.env.NODE_ENV !== "production") return;
  const to = process.env.ALERT_EMAIL;
  if (!to) return;

  try {
    const { isEmailConfigured, sendEmail } = await import("@/lib/email");
    if (!isEmailConfigured()) return;

    // Rate-Limit pro Fehler-Signatur (Titel), damit Wiederholungen nicht spammen.
    const { rateLimit } = await import("@/lib/security/rate-limit");
    const { createHash } = await import("crypto");
    const sig = createHash("sha256").update(title).digest("hex").slice(0, 16);
    const rl = await rateLimit({ scope: "error-alert", key: sig, limit: 1, windowSec: 900 });
    if (!rl.ok) return; // in den letzten 15 Min schon alarmiert

    await sendEmail({
      to,
      subject: `[MasterMind] Serverfehler: ${title}`.slice(0, 120),
      text: `Zeitpunkt: ${new Date().toISOString()}\n\n${detail}`.slice(0, 4000),
    });
  } catch {
    /* Alerting-Fehler nie propagieren */
  }
}
