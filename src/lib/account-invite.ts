/* Copyright 2026 Elian Schock, Jonas Schwenk */
// Verschickt die Bestätigungs-Mail für neu angelegte Accounts (Sekretariat /
// Schulverwaltung). Der Link führt zu /verify/<token>, wo der Nutzer die
// E-Mail bestätigt und sein eigenes Passwort festlegt.
import "server-only";
import { createToken } from "@/lib/auth/tokens";
import { accountVerifyEmail, sendEmail } from "@/lib/email";

const VERIFY_TTL_MINUTES = 24 * 60; // 24 Stunden

/**
 * Best-effort: Fehler beim Mailversand dürfen die Account-Anlage nicht
 * zurückrollen — der Link kann später über den Passwort-Reset ersetzt werden.
 */
export async function sendAccountVerification(opts: {
  userId: string;
  email: string;
  name: string;
  schoolName?: string | null;
}): Promise<void> {
  try {
    const { token } = await createToken({
      email: opts.email,
      type: "email_verify",
      userId: opts.userId,
      ttlMinutes: VERIFY_TTL_MINUTES,
    });
    const base = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
    await sendEmail(
      accountVerifyEmail({
        email: opts.email,
        name: opts.name,
        schoolName: opts.schoolName,
        url: `${base}/verify/${token}`,
        expiresHours: VERIFY_TTL_MINUTES / 60,
      })
    );
  } catch {
    // bewusst verschluckt — siehe Doc-Kommentar
  }
}
