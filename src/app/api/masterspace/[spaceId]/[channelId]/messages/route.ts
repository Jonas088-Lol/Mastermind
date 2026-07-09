import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ spaceId: string; channelId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { spaceId, channelId } = await params;

  const membership = await prisma.spaceMember.findFirst({
    where: { spaceId, userId: session.userId },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const messages = await prisma.spaceMessage.findMany({
    where: { channelId },
    include: {
      author: { select: { id: true, name: true } },
      parent: { select: { id: true, content: true, author: { select: { name: true } } } },
    },
    orderBy: { sentAt: "asc" },
    take: 100,
  });

  return NextResponse.json({ messages, myId: session.userId });
}
