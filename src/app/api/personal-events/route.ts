/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  // Ungültige Datumsstrings ignorieren (Invalid Date → Prisma-Fehler → 500)
  const parseDate = (s: string | null) => {
    if (!s) return null;
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d;
  };
  const from = parseDate(searchParams.get("from"));
  const to = parseDate(searchParams.get("to"));

  const events = await prisma.personalEvent.findMany({
    where: {
      userId: session.userId,
      ...(from || to
        ? {
            startAt: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
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

  const body = await req.json().catch(() => ({}));
  const { title, description, startAt, endAt, allDay, color, category } = body as Record<string, unknown>;

  if (!title || !startAt) {
    return NextResponse.json({ error: "title and startAt required" }, { status: 400 });
  }

  // Ungültige Datumswerte abfangen (Invalid Date → Prisma-Fehler → 500)
  const start = new Date(String(startAt));
  if (Number.isNaN(start.getTime())) {
    return NextResponse.json({ error: "startAt invalid" }, { status: 400 });
  }
  const end = endAt ? new Date(String(endAt)) : null;

  const event = await prisma.personalEvent.create({
    data: {
      userId: session.userId,
      title: String(title).slice(0, 100),
      description: description ? String(description).slice(0, 500) : null,
      startAt: start,
      endAt: end && !Number.isNaN(end.getTime()) ? end : null,
      allDay: Boolean(allDay),
      color: color ? String(color).slice(0, 32) : "#6366f1",
      category: category ? String(category).slice(0, 50) : "personal",
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
