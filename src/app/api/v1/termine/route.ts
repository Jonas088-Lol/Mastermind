/* Copyright 2026 Elian Schock, Jonas Schwenk */
/**
 * GET /api/v1/termine — Read-only API v1
 *
 * Auth:      Authorization: Bearer <API-Token> (Admin → Sicherheit)
 * Parameter: keine (liefert Schultermine der nächsten 30 Tage)
 * Antwort:   { termine: [{ id, titel, beschreibung, beginn, ende,
 *              ganztaegig, kategorie }] }
 *
 * Beispiel:
 *   curl -H "Authorization: Bearer <token>" https://…/api/v1/termine
 *   → { "termine": [{ "titel": "Sommerfest", "beginn": "2026-07-20T00:00:00.000Z",
 *        "ganztaegig": true, "kategorie": "event", … }] }
 *
 * DSGVO: Nur schulweite Termindaten, keine personenbezogenen Daten.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { authenticateApiRequest } from "@/lib/api-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await authenticateApiRequest(req);
  if (!auth) return NextResponse.json({ error: "Ungültiger oder fehlender API-Token" }, { status: 401 });

  const now = new Date();
  const in30Days = new Date(now.getTime() + 30 * 86400_000);

  const events = await prisma.schoolEvent.findMany({
    where: { schoolId: auth.schoolId, startAt: { gte: now, lte: in30Days } },
    select: {
      id: true,
      title: true,
      description: true,
      startAt: true,
      endAt: true,
      allDay: true,
      category: true,
    },
    orderBy: { startAt: "asc" },
    take: 200,
  });

  return NextResponse.json({
    termine: events.map((e) => ({
      id: e.id,
      titel: e.title,
      beschreibung: e.description,
      beginn: e.startAt.toISOString(),
      ende: e.endAt ? e.endAt.toISOString() : null,
      ganztaegig: e.allDay,
      kategorie: e.category,
    })),
  });
}
