/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { incrementAiQuota } from "@/lib/db/store";
import { rateLimit } from "@/lib/security/rate-limit";

/**
 * Kostenschutz für KI-Aufrufe in Server Actions (die keinen Request-Kontext für
 * IP-Limits haben). Kombiniert einen per-User-Rate-Limit mit der persistenten
 * Anthropic-Quota. Bei Überschreitung wird ein Fehlerobjekt zurückgegeben, das
 * die Action direkt ans Frontend geben kann.
 *
 * @returns null wenn erlaubt, sonst { error } zum direkten Zurückgeben.
 */
export async function guardAiAction(params: {
  userId: string;
  email: string;
  scope: string;
  /** Erlaubte Aufrufe pro Fenster (Default 10) */
  limit?: number;
  /** Fenster in Sekunden (Default 3600) */
  windowSec?: number;
}): Promise<{ error: string } | null> {
  const { userId, email, scope, limit = 10, windowSec = 3600 } = params;

  const rl = await rateLimit({ scope: `ai-action:${scope}`, key: userId, limit, windowSec });
  if (!rl.ok) {
    return { error: `Zu viele Anfragen. Bitte in ${rl.retryAfterSec}s erneut versuchen.` };
  }

  const quota = await incrementAiQuota(email);
  if (quota.exceeded) {
    return { error: `KI-Kontingent erreicht (${quota.used}/${quota.limit}).` };
  }

  return null;
}
