import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { userId: partnerId } = await params;
  if (partnerId === session.userId) {
    return NextResponse.json({ messages: [], partner: null, myId: session.userId });
  }

  const partner = await prisma.user.findUnique({
    where: { id: partnerId },
    select: { id: true, name: true },
  });
  if (!partner) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [a, b] = [session.userId, partnerId].sort();
  const convo = await prisma.directConversation.findUnique({
    where: { userAId_userBId: { userAId: a, userBId: b } },
    include: {
      messages: {
        include: { author: { select: { id: true, name: true } } },
        orderBy: { sentAt: "asc" },
        take: 100,
      },
    },
  });

  return NextResponse.json({
    messages: convo?.messages ?? [],
    partner,
    myId: session.userId,
  });
}
