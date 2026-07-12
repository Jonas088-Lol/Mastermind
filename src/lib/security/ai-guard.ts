/* Copyright 2026 Elian Schock, Jonas Schwenk */
/**
 * AI Guard — fail-closed cost-cap + input validation for Anthropic calls.
 *
 * Always active regardless of SECURITY_RATE_LIMIT_ENABLED because AI costs
 * are real money even in development.
 *
 * Guards:
 *   1. Prompt length cap (characters)
 *   2. Message count cap (conversation history)
 *   3. Daily per-user request cap via Redis sliding window
 *   4. Model allowlist — unknown models fall back to DEFAULT_MODEL
 */

import { rateLimit } from "@/lib/security/rate-limit";

/* ── Config ──────────────────────────────────────────────────────────────── */

export const AI_MAX_PROMPT_CHARS = 8_000;
export const AI_MAX_MESSAGES = 20;

// Models the app is allowed to use. Anything else falls back to the default.
const ALLOWED_MODELS = new Set([
  "claude-haiku-4-5-20251001",
  "claude-sonnet-4-6",
  "claude-opus-4-7",
  "claude-opus-4-8",
]);

// Günstigster Fallback (Lernapp-Default). Teurere Modelle nur explizit pro Call.
export const AI_DEFAULT_MODEL = "claude-haiku-4-5-20251001";

// Daily cap per user. Override via env var.
function getDailyCap(): number {
  const v = parseInt(process.env.AI_DAILY_CAP_PER_USER ?? "100", 10);
  return Number.isFinite(v) && v > 0 ? v : 100;
}

/* ── Public types ─────────────────────────────────────────────────────────── */

export type AiGuardOk = { ok: true; model: string };
export type AiGuardErr = { ok: false; status: 400 | 413 | 429; error: string };
export type AiGuardResult = AiGuardOk | AiGuardErr;

export interface AiGuardOptions {
  /** Unique user identifier (email or userId) for the daily cap bucket. */
  userId: string;
  /** Total character count of the last user message. */
  promptChars: number;
  /** Number of messages in the conversation history. */
  messageCount?: number;
  /** Model requested by the caller. Validated against allowlist. */
  requestedModel?: string;
}

/* ── guardAiRequest ──────────────────────────────────────────────────────── */

export async function guardAiRequest(
  opts: AiGuardOptions
): Promise<AiGuardResult> {
  // 1 — Prompt length
  if (opts.promptChars > AI_MAX_PROMPT_CHARS) {
    return {
      ok: false,
      status: 413,
      error: `Eingabe zu lang (max ${AI_MAX_PROMPT_CHARS} Zeichen)`,
    };
  }

  // 2 — Message count
  const msgCount = opts.messageCount ?? 0;
  if (msgCount > AI_MAX_MESSAGES) {
    return {
      ok: false,
      status: 400,
      error: `Zu viele Nachrichten (max ${AI_MAX_MESSAGES})`,
    };
  }

  // 3 — Daily per-user cap (always enforced — not affected by SECURITY_RATE_LIMIT_ENABLED)
  const dailyCap = getDailyCap();
  const capResult = await rateLimit({
    scope: "ai-guard:daily",
    key: opts.userId,
    limit: dailyCap,
    windowSec: 24 * 60 * 60,
  });
  if (!capResult.ok) {
    return {
      ok: false,
      status: 429,
      error: `Tages-KI-Limit erreicht (${dailyCap} Anfragen/Tag). Morgen wieder verfügbar.`,
    };
  }

  // 4 — Model allowlist
  const model =
    opts.requestedModel && ALLOWED_MODELS.has(opts.requestedModel)
      ? opts.requestedModel
      : AI_DEFAULT_MODEL;

  return { ok: true, model };
}
