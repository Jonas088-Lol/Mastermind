/* Copyright 2026 Elian Schock, Jonas Schwenk */
/**
 * GET /api/v1/vertretungen — Read-only API v1
 *
 * Auth:      Authorization: Bearer <API-Token> (Admin → Sicherheit)
 * Parameter: ?datum=YYYY-MM-DD (optional, Default: heute)
 * Antwort:   { datum, vertretungen: [{ id, datum, stunde, klasse, fach,
 *              abwesend, vertretung, typ, raum, notiz }] }
 *
 * Beispiel:
 *   curl -H "Authorization: Bearer <token>" https://…/api/v1/vertretungen?datum=2026-07-13
 *   → { "datum": "2026-07-13", "vertretungen": [{ "stunde": 3, "klasse": "9b",
 *        "fach": "Mathematik", "abwesend": "Müller", "vertretung": "Schmidt",
 *        "typ": "substitution", "raum": "204", … }] }
 *
 * DSGVO: Keine Schülerdaten. Von Lehrkräften wird nur der Nachname
 * ausgegeben (wie auf öffentlichen Vertretungsplänen üblich).
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { authenticateApiRequest } from "@/lib/api-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Nur der Nachname der Lehrkraft (DSGVO-Minimalprinzip). */
function lastNameOf(name: string | null | undefined): string | null {
  if (!name) return null;
  const parts = name.trim().split(/\s+/);
  return parts[parts.length - 1] || null;
}

export async function GET(req: Request) {
  const auth = await authenticateApiRequest(req);
  if (!auth) return NextResponse.json({ error: "Ungültiger oder fehlender API-Token" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const datumParam = (searchParams.get("datum") ?? "").trim().slice(0, 10);

  let day: Date;
  if (/^\d{4}-\d{2}-\d{2}$/.test(datumParam)) {
    day = new Date(`${datumParam}T00:00:00.000Z`);
    if (Number.isNaN(day.getTime())) {
      return NextResponse.json({ error: "Ungültiges Datum (erwartet YYYY-MM-DD)" }, { status: 400 });
    }
  } else if (datumParam) {
    return NextResponse.json({ error: "Ungültiges Datum (erwartet YYYY-MM-DD)" }, { status: 400 });
  } else {
    const now = new Date();
    day = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  }
  const nextDay = new Date(day.getTime() + 86400_000);

  const entries = await prisma.substitutionEntry.findMany({
    where: { schoolId: auth.schoolId, date: { gte: day, lt: nextDay } },
    select: {
      id: true,
      date: true,
      period: true,
      subjectName: true,
      note: true,
      type: true,
      room: true,
      class: { select: { name: true } },
      absentTeacher: { select: { name: true } },
      substituteTeacher: { select: { name: true } },
    },
    orderBy: [{ period: "asc" }],
    take: 500,
  });

  return NextResponse.json({
    datum: day.toISOString().slice(0, 10),
    vertretungen: entries.map((e) => ({
      id: e.id,
      datum: e.date.toISOString().slice(0, 10),
      stunde: e.period,
      klasse: e.class.name,
      fach: e.subjectName,
      abwesend: lastNameOf(e.absentTeacher?.name),
      vertretung: lastNameOf(e.substituteTeacher?.name),
      typ: e.type,
      raum: e.room,
      notiz: e.note,
    })),
  });
}
