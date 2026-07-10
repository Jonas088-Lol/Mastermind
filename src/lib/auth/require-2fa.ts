import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

/**
 * Erzwingt 2FA für Personal mit Zugriff auf Kinderdaten (Lehrkräfte, Schul-
 * verwaltung). Opt-in über ENV REQUIRE_2FA_STAFF=true — standardmäßig aus,
 * damit niemand versehentlich ausgesperrt wird.
 *
 * Wird in den Staff-Layouts aufgerufen. Betroffene ohne aktives 2FA landen
 * auf der Einrichtungsseite (kein Loop: die liegt unter /app, nicht im Staff-Layout).
 */
const STAFF_ROLES = new Set([
  "teacher",
  "admin",
  "rector",
  "vice_rector",
  "secretary",
]);

export async function enforceStaff2FA(): Promise<void> {
  if (process.env.REQUIRE_2FA_STAFF !== "true") return;
  const session = await getSession();
  if (!session) return; // Authentifizierung erzwingt das jeweilige Layout selbst
  if (STAFF_ROLES.has(session.realRole) && !session.twoFactor) {
    redirect("/app/einstellungen/2fa?required=1");
  }
}
