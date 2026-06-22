import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { ROLE_HOME, effectiveRole, getSession } from "@/lib/session";
import { getLeaderboard } from "@/lib/leaderboard";
import { RanglisteClient } from "./RanglisteClient";

export const metadata: Metadata = { title: "Rangliste · MasterMind" };

export default async function RanglistePage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "student") redirect(ROLE_HOME[effectiveRole(session)]);

  const me = await prisma.user.findUnique({
    where:  { id: session.userId },
    select: {
      id: true, name: true, displayName: true, xp: true,
      leaderboardOptIn: true, anonymousMode: true,
      bundeslandCode: true,
      landkreis: { select: { id: true, name: true } },
      school:    { select: { bundeslandCode: true } },
    },
  });
  if (!me) redirect("/login");

  const bundeslandCode = me.bundeslandCode ?? me.school?.bundeslandCode ?? null;
  const landkreisId    = me.landkreis?.id   ?? null;
  const landkreisName  = me.landkreis?.name ?? null;

  // Try Redis-backed leaderboards; falls back to null when Redis not configured
  const [national, bundesland, landkreis] = await Promise.all([
    getLeaderboard("national",   bundeslandCode, landkreisId, session.userId).catch(() => null),
    bundeslandCode
      ? getLeaderboard("bundesland", bundeslandCode, landkreisId, session.userId).catch(() => null)
      : Promise.resolve(null),
    landkreisId
      ? getLeaderboard("landkreis", bundeslandCode, landkreisId, session.userId).catch(() => null)
      : Promise.resolve(null),
  ]);

  // Postgres fallback when Redis is not configured
  const fallback = (!national && !bundesland && !landkreis)
    ? await getPostgresFallback(session.userId, bundeslandCode, landkreisId)
    : null;

  return (
    <RanglisteClient
      me={{
        id:               me.id,
        name:             me.displayName ?? me.name,
        xp:               me.xp,
        leaderboardOptIn: me.leaderboardOptIn,
        anonymousMode:    me.anonymousMode,
        bundeslandCode,
        landkreisId,
        landkreisName,
      }}
      national={national}
      bundesland={bundesland}
      landkreis={landkreis}
      fallback={fallback}
    />
  );
}

// ── Postgres fallback (no Redis) ───────────────────────────────────────────────
async function getPostgresFallback(
  userId: string,
  bundeslandCode: string | null,
  landkreisId: string | null,
) {
  const K_MIN = 20;

  const [nationalUsers, blUsers, lkUsers] = await Promise.all([
    prisma.user.findMany({
      where:   { role: "student", leaderboardOptIn: true },
      select:  { id: true, name: true, displayName: true, xp: true, anonymousMode: true },
      orderBy: { xp: "desc" },
      take:    100,
    }),
    bundeslandCode ? prisma.user.findMany({
      where:   { role: "student", leaderboardOptIn: true, bundeslandCode },
      select:  { id: true, name: true, displayName: true, xp: true, anonymousMode: true },
      orderBy: { xp: "desc" },
      take:    100,
    }) : Promise.resolve([]),
    landkreisId ? prisma.user.findMany({
      where:   { role: "student", leaderboardOptIn: true, landkreisId },
      select:  { id: true, name: true, displayName: true, xp: true, anonymousMode: true },
      orderBy: { xp: "desc" },
      take:    100,
    }) : Promise.resolve([]),
  ]);

  function mapEntries(users: typeof nationalUsers, currentUserId: string) {
    return users.map((u, i) => ({
      rank:          i + 1,
      userId:        u.id,
      displayName:   u.anonymousMode ? `Anonym #${i + 1}` : (u.displayName ?? u.name),
      xp:            u.xp,
      isCurrentUser: u.id === currentUserId,
    }));
  }

  function buildResult(users: typeof nationalUsers, scope: "national" | "bundesland" | "landkreis") {
    if (users.length === 0) return null;
    const entries  = mapEntries(users, userId);
    const myEntry  = entries.find((e) => e.userId === userId);
    const total    = users.length;
    const kAnon    = total < K_MIN;
    return {
      scope,
      total,
      kAnonymous:   kAnon,
      topEntries:   kAnon ? [] : entries.slice(0, 10),
      userRank:     myEntry?.rank ?? null,
      userPercentile: myEntry ? Math.round(((total - myEntry.rank) / total) * 100) : null,
      neighbourhood: kAnon ? [] : entries.filter((e) =>
        myEntry ? Math.abs(e.rank - myEntry.rank) <= 5 : false
      ),
    };
  }

  return {
    national:   buildResult(nationalUsers, "national"),
    bundesland: blUsers.length  > 0 ? buildResult(blUsers, "bundesland")  : null,
    landkreis:  lkUsers.length  > 0 ? buildResult(lkUsers, "landkreis")   : null,
  };
}
