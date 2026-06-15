import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!session.schoolId) {
    return NextResponse.json({
      hasMasterSpace: false,
      mySpaces: [],
      publicSpaces: [],
      dmConversations: [],
      myId: session.userId,
    });
  }

  const school = await prisma.school.findUnique({
    where: { id: session.schoolId },
    select: { plan: true },
  });

  const hasMasterSpace = school?.plan === "pro" || school?.plan === "enterprise";

  if (!hasMasterSpace) {
    return NextResponse.json({
      hasMasterSpace: false,
      mySpaces: [],
      publicSpaces: [],
      dmConversations: [],
      myId: session.userId,
    });
  }

  // Touch lastSeenAt so friends can see online status
  void prisma.user.update({ where: { id: session.userId }, data: { lastSeenAt: new Date() } }).catch(() => null);

  const [mySpaces, publicSpaces, dmConversations] = await Promise.all([
    prisma.space.findMany({
      where: { schoolId: session.schoolId, members: { some: { userId: session.userId } } },
      include: {
        channels: {
          orderBy: { position: "asc" },
        },
        _count: { select: { members: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.space.findMany({
      where: {
        schoolId: session.schoolId,
        isPublic: true,
        members: { none: { userId: session.userId } },
      },
      include: { _count: { select: { members: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.directConversation.findMany({
      where: { OR: [{ userAId: session.userId }, { userBId: session.userId }] },
      include: {
        userA: { select: { id: true, name: true } },
        userB: { select: { id: true, name: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 30,
    }),
  ]);

  const dmData = dmConversations.map((dm) => ({
    id: dm.id,
    partner:
      dm.userAId === session.userId
        ? { id: dm.userB.id, name: dm.userB.name }
        : { id: dm.userA.id, name: dm.userA.name },
  }));

  return NextResponse.json({
    hasMasterSpace,
    mySpaces,
    publicSpaces,
    dmConversations: dmData,
    myId: session.userId,
  });
}
