/**
 * Rate-Limiter — serverless-safe.
 *
 * - Mit UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN: Upstash Redis
 *   (sliding-window, funktioniert über alle Vercel-Funktions-Instanzen).
 * - Ohne Env-Vars: In-Memory-Fallback (nur für lokale Entwicklung geeignet).
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export interface RateLimitOptions {
  /** Logischer Namespace (z. B. "ai-tutor", "login") */
  scope: string;
  /** Eindeutiger Key — IP, E-Mail, User-ID */
  key: string;
  /** Erlaubte Hits innerhalb des Fensters */
  limit: number;
  /** Fenstergröße in Sekunden */
  windowSec: number;
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetMs: number;
  retryAfterSec: number;
}

// ── Upstash Redis Client (lazy) ───────────────────────────

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

// Cache der Ratelimit-Instanzen pro scope+window, damit wir nicht bei jedem
// Request ein neues Objekt erstellen (teuer, da Client-Init).
const limiterCache = new Map<string, Ratelimit>();

function getRedisLimiter(
  scope: string,
  limit: number,
  windowSec: number
): Ratelimit | null {
  const redis = getRedis();
  if (!redis) return null;

  const cacheKey = `${scope}:${limit}:${windowSec}`;
  if (limiterCache.has(cacheKey)) return limiterCache.get(cacheKey)!;

  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, `${windowSec} s`),
    prefix: `mm:rl:${scope}`,
  });
  limiterCache.set(cacheKey, limiter);
  return limiter;
}

// ── In-Memory-Fallback (Dev) ──────────────────────────────

interface Bucket {
  hits: number[];
}

const BUCKETS = new Map<string, Bucket>();

function inMemoryRateLimit(opts: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const windowMs = opts.windowSec * 1000;
  const cutoff = now - windowMs;
  const id = `${opts.scope}::${opts.key}`;

  const bucket = BUCKETS.get(id) ?? { hits: [] };
  while (bucket.hits.length > 0 && bucket.hits[0] < cutoff) {
    bucket.hits.shift();
  }

  if (bucket.hits.length >= opts.limit) {
    const oldest = bucket.hits[0];
    const resetMs = oldest + windowMs;
    BUCKETS.set(id, bucket);
    return {
      ok: false,
      remaining: 0,
      resetMs,
      retryAfterSec: Math.max(1, Math.ceil((resetMs - now) / 1000)),
    };
  }

  bucket.hits.push(now);
  BUCKETS.set(id, bucket);

  if (BUCKETS.size > 5000) {
    for (const [k, b] of BUCKETS) {
      while (b.hits.length > 0 && b.hits[0] < cutoff) b.hits.shift();
      if (b.hits.length === 0) BUCKETS.delete(k);
    }
  }

  return {
    ok: true,
    remaining: Math.max(0, opts.limit - bucket.hits.length),
    resetMs: now + windowMs,
    retryAfterSec: 0,
  };
}

// ── Public API ────────────────────────────────────────────

export async function rateLimit(
  opts: RateLimitOptions
): Promise<RateLimitResult> {
  const limiter = getRedisLimiter(opts.scope, opts.limit, opts.windowSec);

  if (!limiter) {
    // Kein Redis konfiguriert → In-Memory-Fallback (Dev only)
    return inMemoryRateLimit(opts);
  }

  const { success, remaining, reset } = await limiter.limit(opts.key);
  const now = Date.now();
  return {
    ok: success,
    remaining,
    resetMs: reset,
    retryAfterSec: success ? 0 : Math.max(1, Math.ceil((reset - now) / 1000)),
  };
}

/**
 * Extrahiert eine sinnvolle Key-ID aus den Request-Headers.
 */
export function ipFromHeaders(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "unknown"
  );
}
