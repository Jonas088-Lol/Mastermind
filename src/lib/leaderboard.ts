/**
 * leaderboard.ts
 * Leaderboard management using Upstash Redis ZSETs.
 *
 * Three scopes:
 *   lb:national            — all opted-in users
 *   lb:bl:{bundeslandCode} — users in a Bundesland
 *   lb:lk:{landkreisId}    — users in a Landkreis
 *
 * Score = user.xp (PostgreSQL is source of truth; Redis is the read cache).
 * k-Anonymity: scopes with < K_MIN members show no individual ranks.
 *
 * GDPR / Jugendschutz:
 *   - Only users with leaderboardOptIn=true appear.
 *   - Display is pseudonym (displayName ?? name), never email.
 *   - anonymousMode users show as "Anonym #N" in tiny scopes.
 */

import { Redis } from "@upstash/redis";
import { prisma } from "@/lib/db/client";

const K_MIN = 20;       // minimum members to show individual ranks
const PAGE  = 25;       // entries per leaderboard page
const TOP_N = 10;       // top entries always shown

function getRedis(): Redis | null {
  const url   = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

function keyNational()              { return "lb:national"; }
function keyBundesland(code: string){ return `lb:bl:${code}`; }
function keyLandkreis(id: string)   { return `lb:lk:${id}`; }

// ── Write ─────────────────────────────────────────────────────────────────────

/**
 * Update a user's score in all leaderboard ZSETs.
 * Called whenever xp changes.
 */
export async function addToLeaderboard(
  userId:        string,
  xp:            number,
  bundeslandCode: string | null,
  landkreisId:   string | null,
): Promise<void> {
  const redis = getRedis();
  if (!redis) return;  // no Redis in dev — skip silently

  // Check opt-in
  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { leaderboardOptIn: true },
  });
  if (!user?.leaderboardOptIn) return;

  await redis.zadd(keyNational(), { score: xp, member: userId });
  if (bundeslandCode) {
    await redis.zadd(keyBundesland(bundeslandCode), { score: xp, member: userId });
  }
  if (landkreisId) {
    await redis.zadd(keyLandkreis(landkreisId), { score: xp, member: userId });
  }
}

/** Remove user from all leaderboards (opt-out or anonymousMode). */
export async function removeFromLeaderboard(
  userId:        string,
  bundeslandCode: string | null,
  landkreisId:   string | null,
): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  await redis.zrem(keyNational(), userId);
  if (bundeslandCode) await redis.zrem(keyBundesland(bundeslandCode), userId);
  if (landkreisId)   await redis.zrem(keyLandkreis(landkreisId),      userId);
}

// ── Read ──────────────────────────────────────────────────────────────────────

export type LeaderboardScope = "national" | "bundesland" | "landkreis";

export interface LeaderboardEntry {
  rank:        number;
  userId:      string;
  displayName: string;  // pseudonym
  xp:          number;
  isCurrentUser: boolean;
}

export interface LeaderboardResult {
  scope:           LeaderboardScope;
  total:           number;
  kAnonymous:      boolean;  // true when scope too small
  topEntries:      LeaderboardEntry[];
  userRank:        number | null;
  userPercentile:  number | null;
  neighbourhood:   LeaderboardEntry[];  // ±5 around user
}

async function resolveDisplayNames(
  userIds: string[],
): Promise<Map<string, string>> {
  if (userIds.length === 0) return new Map();

  const users = await prisma.user.findMany({
    where:  { id: { in: userIds } },
    select: { id: true, name: true, displayName: true, anonymousMode: true },
  });

  return new Map(
    users.map((u, i) => [
      u.id,
      u.anonymousMode ? `Anonym #${i + 1}` : (u.displayName ?? u.name),
    ]),
  );
}

export async function getLeaderboard(
  scope:         LeaderboardScope,
  bundeslandCode: string | null,
  landkreisId:   string | null,
  currentUserId: string,
): Promise<LeaderboardResult | null> {
  const redis = getRedis();
  if (!redis) return null;

  const key =
    scope === "national"   ? keyNational() :
    scope === "bundesland" ? keyBundesland(bundeslandCode ?? "") :
                             keyLandkreis(landkreisId ?? "");

  const total = await redis.zcard(key);

  // k-Anonymity check
  if (total < K_MIN) {
    return { scope, total, kAnonymous: true, topEntries: [], userRank: null, userPercentile: null, neighbourhood: [] };
  }

  // Top N entries (descending score)
  const topRaw = await redis.zrange(key, 0, TOP_N - 1, { rev: true, withScores: true });
  const topIds  = topRaw.filter((_, i) => i % 2 === 0) as string[];
  const topScores = topRaw.filter((_, i) => i % 2 !== 0).map(Number);
  const topNames  = await resolveDisplayNames(topIds);

  const topEntries: LeaderboardEntry[] = topIds.map((id, i) => ({
    rank:          i + 1,
    userId:        id,
    displayName:   topNames.get(id) ?? "Unbekannt",
    xp:            topScores[i] ?? 0,
    isCurrentUser: id === currentUserId,
  }));

  // User rank
  const userRankRaw = await redis.zrevrank(key, currentUserId);
  const userRank    = userRankRaw !== null ? userRankRaw + 1 : null;
  const userXpRaw   = await redis.zscore(key, currentUserId);
  const userPercentile = userRank !== null
    ? Math.round(((total - userRank) / total) * 100)
    : null;

  // Neighbourhood (±5 around user)
  let neighbourhood: LeaderboardEntry[] = [];
  if (userRank !== null && userXpRaw !== null) {
    const start = Math.max(0, userRank - 1 - 5);
    const end   = Math.min(total - 1, userRank - 1 + 5);
    const raw   = await redis.zrange(key, start, end, { rev: true, withScores: true });
    const ids   = raw.filter((_, i) => i % 2 === 0) as string[];
    const scores = raw.filter((_, i) => i % 2 !== 0).map(Number);
    const names  = await resolveDisplayNames(ids);

    neighbourhood = ids.map((id, i) => ({
      rank:          start + i + 1,
      userId:        id,
      displayName:   names.get(id) ?? "Unbekannt",
      xp:            scores[i] ?? 0,
      isCurrentUser: id === currentUserId,
    }));
  }

  return { scope, total, kAnonymous: false, topEntries, userRank, userPercentile, neighbourhood };
}

// ── Reconcile (cron job) ──────────────────────────────────────────────────────

/**
 * Reconcile Redis ZSETs with PostgreSQL xp values.
 * Run periodically (e.g. every 15 minutes via cron) to fix drift.
 */
export async function reconcileLeaderboard(): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  const users = await prisma.user.findMany({
    where:  { leaderboardOptIn: true },
    select: { id: true, xp: true, bundeslandCode: true, landkreisId: true },
  });

  for (const user of users) {
    await addToLeaderboard(user.id, user.xp, user.bundeslandCode, user.landkreisId);
  }
}
