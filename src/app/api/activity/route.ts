/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getSession } from "@/lib/session";
import { subjectKeyFromPage, STATIC_TREES, getCurrentRank, rankUpXp } from "@/lib/skill-tree-static";
import { awardXpCustom } from "@/lib/xp";

export const dynamic = "force-dynamic";

// GET — current user's own activity data (for privacy dashboard)
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const today = new Date().toISOString().slice(0, 10);
  const [consent, todaySession, last7] = await Promise.all([
    prisma.userConsent.findUnique({ where: { userId: session.userId } }),
    prisma.activitySession.findUnique({
      where: { userId_sessionDate: { userId: session.userId, sessionDate: today } },
    }),
    prisma.activitySession.findMany({
      where: { userId: session.userId },
      orderBy: { sessionDate: "desc" },
      take: 7,
      select: { sessionDate: true, activeSeconds: true, tabSwitches: true },
    }),
  ]);

  return NextResponse.json({ consent, todaySession, last7 });
}

// POST — heartbeat from client
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Only process if user has given consent
  const consent = await prisma.userConsent.findUnique({ where: { userId: session.userId } });
  if (!consent?.activityTracking) return NextResponse.json({ ok: true, skipped: true });

  const body = await req.json().catch(() => ({}));
  const {
    page = "",
    activity = "",
    isActive = false,
    tabFocused = true,
    tabSwitchesDelta = 0,
    activeSecondsDelta = 0,
  } = body as {
    page?: string;
    activity?: string;
    isActive?: boolean;
    tabFocused?: boolean;
    tabSwitchesDelta?: number;
    activeSecondsDelta?: number;
  };

  const today = new Date().toISOString().slice(0, 10);

  await prisma.activitySession.upsert({
    where: { userId_sessionDate: { userId: session.userId, sessionDate: today } },
    update: {
      currentPage: page,
      currentActivity: activity,
      isActive,
      tabFocused,
      tabSwitches: { increment: tabSwitchesDelta },
      activeSeconds: { increment: activeSecondsDelta },
      lastHeartbeat: new Date(),
    },
    create: {
      userId: session.userId,
      sessionDate: today,
      currentPage: page,
      currentActivity: activity,
      isActive,
      tabFocused,
      tabSwitches: tabSwitchesDelta,
      activeSeconds: activeSecondsDelta,
      lastHeartbeat: new Date(),
    },
  });

  // Track per-subject learning minutes and award XP on rank-up
  if (activeSecondsDelta > 0) {
    const subjectKey = subjectKeyFromPage(page);
    if (subjectKey) {
      const addedMinutes = activeSecondsDelta / 60;
      const tree = STATIC_TREES[subjectKey];

      // Read current minutes BEFORE updating to detect rank crossings
      const existing = await prisma.userSubjectMinutes.findUnique({
        where: { userId_subjectKey: { userId: session.userId, subjectKey } },
        select: { totalMinutes: true },
      });
      const oldMinutes = existing?.totalMinutes ?? 0;
      const newMinutes = oldMinutes + addedMinutes;

      await prisma.userSubjectMinutes.upsert({
        where: { userId_subjectKey: { userId: session.userId, subjectKey } },
        update: { totalMinutes: { increment: addedMinutes } },
        create: { userId: session.userId, subjectKey, totalMinutes: addedMinutes },
      });

      // Award XP for each rank threshold crossed in this heartbeat
      const oldRank = getCurrentRank(tree, oldMinutes).rank;
      const newRank = getCurrentRank(tree, newMinutes).rank;
      if (newRank > oldRank) {
        for (let r = oldRank + 1; r <= newRank; r++) {
          const xp = rankUpXp(r);
          if (xp > 0) {
            awardXpCustom(
              session.userId,
              xp,
              `skilltree_rankup_${subjectKey}_rank${r}`,
              subjectKey,
            ).catch(() => undefined);
          }
        }
      }
    }
  }

  // Also touch lastSeenAt so online status works
  await prisma.user.update({
    where: { id: session.userId },
    data: { lastSeenAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
