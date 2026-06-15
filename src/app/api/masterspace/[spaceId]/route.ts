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
        channels: { orderBy: { position: "asc" } },
        members: {
          include: { user: { select: { id: true, name: true } } },
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

  return NextResponse.json({ space, myRole: membership.role, myId: session.userId });
}
