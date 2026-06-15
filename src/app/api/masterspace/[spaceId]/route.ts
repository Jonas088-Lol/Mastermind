import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ spaceId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { spaceId } = await params;

  const [space, membership] = await Promise.all([
    prisma.space.findUnique({
      where: { id: spaceId },
      include: {
        channels: {
          orderBy: { position: "asc" },
          include: { _count: { select: { voiceParticipants: true } } },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                lastSeenAt: true,
                userConsent: { select: { activityTracking: true } },
                activitySessions: {
                  where: { sessionDate: new Date().toISOString().slice(0, 10) },
                  take: 1,
                  select: {
                    currentActivity: true,
                    currentPage: true,
                    tabFocused: true,
                    isActive: true,
                    tabSwitches: true,
                    lastHeartbeat: true,
                  },
                },
              },
            },
          },
          orderBy: { joinedAt: "asc" },
        },
      },
    }),
    prisma.spaceMember.findFirst({
      where: { spaceId, userId: session.userId },
    }),
  ]);

  if (!space || !membership) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Only expose activity data for members who gave consent
  const members = space.members.map((m) => {
    const hasConsent = m.user.userConsent?.activityTracking === true;
    const todaySession = m.user.activitySessions[0] ?? null;
    return {
      userId: m.userId,
      role: m.role,
      user: {
        id: m.user.id,
        name: m.user.name,
        lastSeenAt: m.user.lastSeenAt,
        activity: hasConsent && todaySession ? {
          currentActivity: todaySession.currentActivity,
          isActive: todaySession.isActive,
          tabFocused: todaySession.tabFocused,
          tabSwitches: todaySession.tabSwitches,
          lastHeartbeat: todaySession.lastHeartbeat,
        } : null,
      },
    };
  });

  return NextResponse.json({
    space: { ...space, members },
    myRole: membership.role,
    myId: session.userId,
  });
}
