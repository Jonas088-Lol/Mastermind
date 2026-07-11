/**
 * Token-Authentifizierung für die Read-only REST-API v1 (/api/v1/**).
 *
 * Tokens werden im Admin-Bereich (admin/sicherheit) erzeugt: der Rohwert
 * (64 Hex-Zeichen) wird dem Admin einmalig angezeigt, in der DB liegt nur
 * der SHA-256-Hash (ApiToken.tokenHash). Der Vergleich erfolgt daher über
 * den Hash des mitgeschickten Bearer-Tokens.
 *
 * Verwendung: Authorization: Bearer <token>
 */
import { createHash } from "crypto";
import { prisma } from "@/lib/db/client";

export type ApiAuthContext = {
  schoolId: string;
  tokenId: string;
};

/**
 * Prüft den Authorization-Header einer eingehenden Anfrage.
 * Gibt { schoolId, tokenId } zurück oder null (→ Route antwortet 401).
 * Abgelaufene Tokens (expiresAt in der Vergangenheit) werden abgelehnt.
 * lastUsedAt wird fire-and-forget aktualisiert.
 */
export async function authenticateApiRequest(req: Request): Promise<ApiAuthContext | null> {
  const header = req.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;

  const raw = match[1].trim().slice(0, 256);
  if (!raw) return null;

  const tokenHash = createHash("sha256").update(raw).digest("hex");

  const token = await prisma.apiToken.findUnique({
    where: { tokenHash },
    select: { id: true, schoolId: true, expiresAt: true },
  });
  if (!token) return null;
  if (token.expiresAt && token.expiresAt.getTime() < Date.now()) return null;

  // Fire-and-forget: Fehler hier dürfen die Anfrage nicht blockieren.
  prisma.apiToken
    .update({ where: { id: token.id }, data: { lastUsedAt: new Date() } })
    .catch(() => {});

  return { schoolId: token.schoolId, tokenId: token.id };
}
