/* Copyright 2026 Elian Schock, Jonas Schwenk */
/**
 * Rate-Limiter — persistent & multi-instanz-fähig.
 *
 * Backend-Reihenfolge:
 *  1. Upstash Redis (REST) — wenn UPSTASH_REDIS_REST_URL/TOKEN gesetzt.
 *  2. TCP-Redis via ioredis — wenn REDIS_URL gesetzt (self-hosted Container).
 *  3. In-Memory-Fallback — nur für lokale Entwicklung (nicht persistent).
 *
 * In Produktion MUSS 1 oder 2 verfügbar sein, sonst greift der Missbrauchs-
 * schutz (Login-Brute-Force, KI-Kosten) nur pro Prozess und übersteht keinen
 * Neustart.
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import IORedis from "ioredis";

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

// ── TCP-Redis (ioredis, self-hosted Container) ────────────

let ioredisClient: IORedis | null | undefined;

function getIoRedis(): IORedis | null {
  if (ioredisClient !== undefined) return ioredisClient;
  const url = process.env.REDIS_URL;
  if (!url) {
    ioredisClient = null;
    return null;
  }
  try {
    ioredisClient = new IORedis(url, {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      lazyConnect: false,
      // Bei Verbindungsfehler nicht endlos loggen
      retryStrategy: (times) => (times > 3 ? null : Math.min(times * 200, 1000)),
    });
    ioredisClient.on("error", () => { /* Fehler still schlucken — Fallback greift */ });
    return ioredisClient;
  } catch {
    ioredisClient = null;
    return null;
  }
}

// Atomares Sliding-Window per Lua: alte Einträge entfernen, zählen, ggf. hinzufügen.
// KEYS[1]=bucket, ARGV[1]=nowMs, ARGV[2]=windowMs, ARGV[3]=limit, ARGV[4]=member
const SLIDING_WINDOW_LUA = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
local member = ARGV[4]
redis.call('ZREMRANGEBYSCORE', key, 0, now - window)
local count = redis.call('ZCARD', key)
if count >= limit then
  local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
  local resetAt = now + window
  if oldest[2] then resetAt = tonumber(oldest[2]) + window end
  return {0, 0, resetAt}
end
redis.call('ZADD', key, now, member)
redis.call('PEXPIRE', key, window)
return {1, limit - count - 1, now + window}
`;

async function ioredisRateLimit(
  client: IORedis,
  opts: RateLimitOptions
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowMs = opts.windowSec * 1000;
  const key = `mm:rl:${opts.scope}:${opts.key}`;
  const member = `${now}-${Math.floor(now * 1000) % 1000}`;

  const res = (await client.eval(
    SLIDING_WINDOW_LUA,
    1,
    key,
    String(now),
    String(windowMs),
    String(opts.limit),
    member
  )) as [number, number, number];

  const ok = res[0] === 1;
  const resetMs = res[2];
  return {
    ok,
    remaining: res[1],
    resetMs,
    retryAfterSec: ok ? 0 : Math.max(1, Math.ceil((resetMs - now) / 1000)),
  };
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
  // 1. Upstash REST
  const limiter = getRedisLimiter(opts.scope, opts.limit, opts.windowSec);
  if (limiter) {
    const { success, remaining, reset } = await limiter.limit(opts.key);
    const now = Date.now();
    return {
      ok: success,
      remaining,
      resetMs: reset,
      retryAfterSec: success ? 0 : Math.max(1, Math.ceil((reset - now) / 1000)),
    };
  }

  // 2. TCP-Redis (self-hosted Container)
  const io = getIoRedis();
  if (io) {
    try {
      return await ioredisRateLimit(io, opts);
    } catch {
      // Redis nicht erreichbar → auf In-Memory zurückfallen (fail-open mit Log)
      if (process.env.NODE_ENV === "production") {
        console.warn(`[rate-limit] Redis unreachable, falling back to in-memory for scope=${opts.scope}`);
      }
    }
  }

  // 3. In-Memory (Dev / Notfall)
  return inMemoryRateLimit(opts);
}

/**
 * Redis-Liveness für den Health-Check. Pingt das konfigurierte Backend.
 * Kein Redis konfiguriert (Dev) → ok:true, backend:null (kein Fehler).
 */
export async function redisHealth(): Promise<{
  ok: boolean;
  backend: "upstash" | "ioredis" | null;
  latencyMs: number | null;
}> {
  const start = Date.now();
  const up = getRedis();
  if (up) {
    try {
      await up.ping();
      return { ok: true, backend: "upstash", latencyMs: Date.now() - start };
    } catch {
      return { ok: false, backend: "upstash", latencyMs: null };
    }
  }
  const io = getIoRedis();
  if (io) {
    try {
      await io.ping();
      return { ok: true, backend: "ioredis", latencyMs: Date.now() - start };
    } catch {
      return { ok: false, backend: "ioredis", latencyMs: null };
    }
  }
  return { ok: true, backend: null, latencyMs: null };
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
