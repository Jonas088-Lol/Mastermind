/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json() as { token?: string; platform?: string };
  const { token, platform } = body;

  if (!token || typeof token !== "string") {
    return NextResponse.json({ error: "token required" }, { status: 400 });
  }

  // Store as a PushSubscription-compatible record (endpoint = token for FCM/APNs)
  await prisma.pushSubscription.upsert({
    where: { endpoint: token },
    update: { userId: session.userId },
    create: {
      userId: session.userId,
      endpoint: token,
      // FCM/APNs tokens don't have p256dh/auth — store platform info instead
      p256dh: platform ?? "native",
      auth: platform ?? "native",
    },
  });

  return NextResponse.json({ ok: true });
}
