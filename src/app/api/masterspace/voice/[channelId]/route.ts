/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { channelId } = await params;

  const channel = await prisma.spaceChannel.findUnique({
    where: { id: channelId },
    select: { spaceId: true },
  });
  if (!channel) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const membership = await prisma.spaceMember.findFirst({
    where: { spaceId: channel.spaceId, userId: session.userId },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const participants = await prisma.voiceParticipant.findMany({
    where: { channelId },
    include: { user: { select: { id: true, name: true, lastSeenAt: true } } },
    orderBy: { joinedAt: "asc" },
  });

  return NextResponse.json({ participants, myId: session.userId });
}
