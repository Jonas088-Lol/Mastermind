import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

  const [sent, received] = await Promise.all([
    prisma.friendship.findMany({
      where: { requesterId: session.userId },
      include: { addressee: { select: { id: true, name: true, lastSeenAt: true } } },
    }),
    prisma.friendship.findMany({
      where: { addresseeId: session.userId },
      include: { requester: { select: { id: true, name: true, lastSeenAt: true } } },
    }),
  ]);

  const friends = [
    ...sent
      .filter((f) => f.status === "accepted")
      .map((f) => ({
        id: f.id,
        user: f.addressee,
        online: f.addressee.lastSeenAt
          ? f.addressee.lastSeenAt >= fiveMinutesAgo
          : false,
      })),
    ...received
      .filter((f) => f.status === "accepted")
      .map((f) => ({
        id: f.id,
        user: f.requester,
        online: f.requester.lastSeenAt
          ? f.requester.lastSeenAt >= fiveMinutesAgo
          : false,
      })),
  ];

  const pendingReceived = received
    .filter((f) => f.status === "pending")
    .map((f) => ({ id: f.id, from: f.requester }));

  const pendingSent = sent
    .filter((f) => f.status === "pending")
    .map((f) => ({ id: f.id, to: f.addressee }));

  return NextResponse.json({ friends, pendingReceived, pendingSent, myId: session.userId });
}
