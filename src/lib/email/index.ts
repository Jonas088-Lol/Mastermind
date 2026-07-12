/* Copyright 2026 Elian Schock, Jonas Schwenk */
/**
 * E-Mail-Versand für Magic-Link, Passwort-Reset, Notifications.
 *
 * - Wenn `RESEND_API_KEY` gesetzt ist: echte E-Mails via Resend-API.
 * - Sonst: Console-Transport, der den E-Mail-Inhalt nur loggt. Für lokale
 *   Demos genügt das — der Empfänger sieht den Link in den Server-Logs.
 *
 * Production: Resend (oder vergleichbar) mit AVV abschließen, Domain
 * verifizieren, `EMAIL_FROM` und `EMAIL_REPLY_TO` setzen.
 */

import { maskEmail } from "@/lib/security/redact";

const RESEND_URL = "https://api.resend.com/emails";

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
  from?: string;  // überschreibt EMAIL_FROM (z.B. für Postfach-Mails)
}

export interface SendResult {
  ok: boolean;
  id?: string;
  error?: string;
}

function fromAddress(): string {
  return process.env.EMAIL_FROM ?? "MasterMind <noreply@mastermind.app>";
}

function replyTo(): string | undefined {
  return process.env.EMAIL_REPLY_TO;
}

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

async function sendEmailOnce(msg: EmailMessage): Promise<SendResult> {
  const res = await fetch(RESEND_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: msg.from ?? fromAddress(),
      to: [msg.to],
      subject: msg.subject,
      text: msg.text,
      html: msg.html,
      reply_to: replyTo(),
    }),
  });
  if (!res.ok) {
    const error = await res.text().catch(() => "");
    return { ok: false, error: `Resend ${res.status}: ${error}` };
  }
  const data = (await res.json()) as { id?: string };
  return { ok: true, id: data.id };
}

export async function sendEmail(msg: EmailMessage, maxAttempts = 3): Promise<SendResult> {
  if (!isEmailConfigured()) {
    // In Produktion NIEMALS Empfänger + Body (Magic-/Reset-Links!) ins Log
    // schreiben. Fehlt der Mail-Provider in Prod, ist das ein Konfigurationsfehler.
    if (process.env.NODE_ENV === "production") {
      console.error("[email] Kein Mail-Provider konfiguriert — E-Mail NICHT versendet.");
      return { ok: false, error: "Email provider not configured" };
    }
    // Nur in Dev: Empfänger maskiert, Body zur lokalen Ansicht.
    console.log(
      `\n────── E-Mail (Console-Transport, DEV) ──────\n` +
        `To:      ${maskEmail(msg.to)}\n` +
        `From:    ${fromAddress()}\n` +
        `Subject: ${msg.subject}\n` +
        `\n${msg.text}\n` +
        `─────────────────────────────────────────\n`
    );
    return { ok: true, id: `console-${Date.now()}` };
  }

  let lastErr = "";
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await sendEmailOnce(msg);
      if (result.ok) return result;
      // Only retry on 5xx (server errors), not 4xx (client errors)
      if (result.error?.startsWith("Resend 4")) return result;
      lastErr = result.error ?? "Unknown error";
    } catch (err) {
      lastErr = err instanceof Error ? err.message : "Unbekannter Fehler";
    }
    if (attempt < maxAttempts) {
      await new Promise((r) => setTimeout(r, 500 * attempt));
    }
  }
  return { ok: false, error: lastErr };
}

/* ── Templates ───────────────────────────────────────────────── */

export function magicLinkEmail(opts: {
  email: string;
  url: string;
  expiresMin: number;
}): EmailMessage {
  return {
    to: opts.email,
    subject: "Dein MasterMind-Anmelde-Link",
    text:
      `Hallo,\n\n` +
      `klick den Link unten an, um dich bei MasterMind anzumelden:\n\n` +
      `${opts.url}\n\n` +
      `Der Link gilt ${opts.expiresMin} Minuten und kann nur einmal verwendet werden.\n\n` +
      `Falls du das nicht warst, ignoriere diese E-Mail.\n\n` +
      `— MasterMind\n`,
  };
}

export function passwordResetEmail(opts: {
  email: string;
  url: string;
  expiresMin: number;
}): EmailMessage {
  return {
    to: opts.email,
    subject: "Passwort zurücksetzen — MasterMind",
    text:
      `Hallo,\n\n` +
      `du hast ein neues Passwort angefordert. Setze es über den folgenden Link:\n\n` +
      `${opts.url}\n\n` +
      `Der Link gilt ${opts.expiresMin} Minuten und ist einmalig.\n\n` +
      `Falls du keinen Reset wolltest, ignoriere diese E-Mail — dein Passwort bleibt unverändert.\n\n` +
      `— MasterMind\n`,
  };
}

export function twoFactorResetEmail(opts: { email: string; adminName: string }): EmailMessage {
  return {
    to: opts.email,
    subject: "Deine Zwei-Faktor-Authentifizierung wurde zurückgesetzt — MasterMind",
    text:
      `Hallo,\n\n` +
      `ein Administrator (${opts.adminName}) hat deine Zwei-Faktor-Authentifizierung zurückgesetzt.\n\n` +
      `Falls du das nicht erwartet hast, wende dich bitte sofort an deine Schuladministration oder ändere dein Passwort.\n\n` +
      `— MasterMind\n`,
  };
}

export function backupCodeUsedEmail(opts: { email: string }): EmailMessage {
  return {
    to: opts.email,
    subject: "Backup-Code verwendet — MasterMind",
    text:
      `Hallo,\n\n` +
      `ein Backup-Code für deinen MasterMind-Account wurde soeben verwendet.\n\n` +
      `Falls du das warst: Kein Problem. Du hast noch Backup-Codes übrig — du kannst neue unter Einstellungen → Sicherheit generieren.\n\n` +
      `Falls du das NICHT warst: Ändere sofort dein Passwort und kontaktiere deinen Administrator.\n\n` +
      `— MasterMind\n`,
  };
}
