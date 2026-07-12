/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/client";
import { getSession } from "@/lib/session";
import { vapidPublicKey } from "@/lib/push";

export async function GET() {
  return Response.json({ publicKey: vapidPublicKey });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const body = await req.json();
  const { endpoint, keys } = body as {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  };

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return Response.json({ error: "Invalid subscription" }, { status: 400 });
  }

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: {
      userId: session.userId,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
    },
    update: {
      userId: session.userId,
      p256dh: keys.p256dh,
      auth: keys.auth,
    },
  });

  return Response.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const body = await req.json();
  const { endpoint } = body as { endpoint: string };

  if (endpoint) {
    await prisma.pushSubscription.deleteMany({
      where: { endpoint, userId: session.userId },
    });
  }

  return Response.json({ ok: true });
}
