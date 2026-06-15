import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

// GET — teacher/admin: see all students in school who consented, their today activity
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = effectiveRole(session);
  if (!["teacher", "admin", "rector", "vice_rector"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!session.schoolId) return NextResponse.json({ students: [] });

  const today = new Date().toISOString().slice(0, 10);
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);

  // Only students who gave consent to activity tracking
  const consents = await prisma.userConsent.findMany({
    where: {
      activityTracking: true,
      user: { schoolId: session.schoolId, role: "student" },
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          klasse: true,
          lastSeenAt: true,
          activitySessions: {
            where: { sessionDate: today },
            take: 1,
          },
        },
      },
    },
  });

  const students = consents.map(({ user }) => {
    const todaySession = user.activitySessions[0] ?? null;
    const lastSeen = user.lastSeenAt;

    let onlineStatus: "active" | "idle" | "away" | "offline" = "offline";
    if (lastSeen) {
      if (lastSeen >= twoMinutesAgo && todaySession?.isActive && todaySession.tabFocused) {
        onlineStatus = "active";
      } else if (lastSeen >= fiveMinutesAgo) {
        onlineStatus = "idle";
      } else if (lastSeen >= new Date(Date.now() - 15 * 60 * 1000)) {
        onlineStatus = "away";
      }
    }

    return {
      id: user.id,
      name: user.name,
      klasse: user.klasse,
      lastSeenAt: lastSeen,
      onlineStatus,
      currentActivity: todaySession?.currentActivity ?? null,
      currentPage: todaySession?.currentPage ?? null,
      tabFocused: todaySession?.tabFocused ?? null,
      tabSwitches: todaySession?.tabSwitches ?? 0,
      activeSeconds: todaySession?.activeSeconds ?? 0,
      lastHeartbeat: todaySession?.lastHeartbeat ?? null,
    };
  });

  return NextResponse.json({ students, date: today });
}
