/**
 * GET /api/v1/stundenplan — Read-only API v1
 *
 * Auth:      Authorization: Bearer <API-Token> (Admin → Sicherheit)
 * Parameter: ?klasseId=<SchoolClass-ID> (Pflicht)
 * Antwort:   { klasse: { id, name, grade }, stunden: [{ id, tag, stunde,
 *              fach, fachKuerzel, lehrer, raum }] }
 *              tag: 1=Mo … 5=Fr
 *
 * Beispiel:
 *   curl -H "Authorization: Bearer <token>" https://…/api/v1/stundenplan?klasseId=abc123
 *   → { "klasse": { "name": "9b", … }, "stunden": [{ "tag": 1, "stunde": 2,
 *        "fach": "Mathematik", "fachKuerzel": "M", "lehrer": "Müller", "raum": "204" }] }
 *
 * DSGVO: Keine Schülerdaten. Von Lehrkräften wird nur der Nachname ausgegeben.
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
  const klasseId = (searchParams.get("klasseId") ?? "").trim().slice(0, 64);
  if (!klasseId) {
    return NextResponse.json({ error: "Parameter klasseId fehlt" }, { status: 400 });
  }

  // Klasse muss zur Schule des Tokens gehören.
  const klasse = await prisma.schoolClass.findUnique({
    where: { id: klasseId },
    select: { id: true, name: true, grade: true, schoolId: true },
  });
  if (!klasse || klasse.schoolId !== auth.schoolId) {
    return NextResponse.json({ error: "Klasse nicht gefunden" }, { status: 404 });
  }

  const entries = await prisma.timetableEntry.findMany({
    where: { classId: klasse.id, schoolId: auth.schoolId },
    select: {
      id: true,
      day: true,
      period: true,
      room: true,
      subject: { select: { name: true, shortName: true } },
      teacher: { select: { name: true } },
    },
    orderBy: [{ day: "asc" }, { period: "asc" }],
    take: 100,
  });

  return NextResponse.json({
    klasse: { id: klasse.id, name: klasse.name, grade: klasse.grade },
    stunden: entries.map((e) => ({
      id: e.id,
      tag: e.day,
      stunde: e.period,
      fach: e.subject.name,
      fachKuerzel: e.subject.shortName,
      lehrer: lastNameOf(e.teacher.name),
      raum: e.room,
    })),
  });
}
