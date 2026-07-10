/**
 * KI-Antwort-Cache.
 *
 * Identische Generierungs-Anfragen (dasselbe Quiz, dieselbe Vokabelliste …)
 * werden zwischengespeichert statt erneut bei Anthropic bezahlt. Nur für
 * deterministische Generierung sinnvoll — NICHT für den Tutor-Chat (jede
 * Konversation ist einzigartig) oder Benotung (jede Abgabe ist anders).
 *
 * Backends (gleiche Priorität wie der Rate-Limiter):
 *   1. Upstash Redis (REST)
 *   2. TCP-Redis (ioredis, self-hosted Container)
 *   3. In-Memory (Dev / Notfall)
 */

import { createHash } from "crypto";
import IORedis from "ioredis";
import { Redis as UpstashRedis } from "@upstash/redis";

const PREFIX = "mm:aicache:";
const DEFAULT_TTL_SEC = 60 * 60 * 24 * 30; // 30 Tage

export function aiCacheKey(parts: unknown): string {
  const hash = createHash("sha256").update(JSON.stringify(parts)).digest("hex");
  return PREFIX + hash;
}

// ── Backends ────────────────────────────────────────────────────────────────

function getUpstash(): UpstashRedis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new UpstashRedis({ url, token });
}

let ioredisClient: IORedis | null | undefined;
function getIoRedis(): IORedis | null {
  if (ioredisClient !== undefined) return ioredisClient;
  const url = process.env.REDIS_URL;
  if (!url) return (ioredisClient = null);
  try {
    ioredisClient = new IORedis(url, {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      retryStrategy: (times) => (times > 3 ? null : Math.min(times * 200, 1000)),
    });
    ioredisClient.on("error", () => { /* still — Fallback greift */ });
    return ioredisClient;
  } catch {
    return (ioredisClient = null);
  }
}

// In-Memory mit Ablauf (Dev / Notfall)
const memory = new Map<string, { value: string; exp: number }>();

// ── Öffentliche API ─────────────────────────────────────────────────────────

export async function aiCacheGet(key: string): Promise<string | null> {
  try {
    const up = getUpstash();
    if (up) return (await up.get<string>(key)) ?? null;
    const io = getIoRedis();
    if (io) return await io.get(key);
  } catch { /* Cache-Fehler nie propagieren */ }

  const hit = memory.get(key);
  if (hit && hit.exp > Date.now()) return hit.value;
  if (hit) memory.delete(key);
  return null;
}

export async function aiCacheSet(
  key: string,
  value: string,
  ttlSec: number = DEFAULT_TTL_SEC
): Promise<void> {
  try {
    const up = getUpstash();
    if (up) { await up.set(key, value, { ex: ttlSec }); return; }
    const io = getIoRedis();
    if (io) { await io.set(key, value, "EX", ttlSec); return; }
  } catch { /* Cache-Fehler nie propagieren */ }

  if (memory.size > 2000) memory.clear(); // simple Deckelung
  memory.set(key, { value, exp: Date.now() + ttlSec * 1000 });
}
