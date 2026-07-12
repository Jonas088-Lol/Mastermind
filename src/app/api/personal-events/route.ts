/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const events = await prisma.personalEvent.findMany({
    where: {
      userId: session.userId,
      ...(from || to
        ? {
            startAt: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {}),
            },
          }
        : {}),
    },
    orderBy: { startAt: "asc" },
  });

  return NextResponse.json({ events });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { title, description, startAt, endAt, allDay, color, category } = body;

  if (!title || !startAt) {
    return NextResponse.json({ error: "title and startAt required" }, { status: 400 });
  }

  const event = await prisma.personalEvent.create({
    data: {
      userId: session.userId,
      title: String(title).slice(0, 100),
      description: description ? String(description).slice(0, 500) : null,
      startAt: new Date(startAt),
      endAt: endAt ? new Date(endAt) : null,
      allDay: Boolean(allDay),
      color: color ?? "#6366f1",
      category: category ?? "personal",
    },
  });

  return NextResponse.json({ event });
}

export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await prisma.personalEvent.deleteMany({
    where: { id, userId: session.userId },
  });

  return NextResponse.json({ ok: true });
}
