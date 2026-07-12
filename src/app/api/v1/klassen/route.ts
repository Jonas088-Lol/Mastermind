/* Copyright 2026 Elian Schock, Jonas Schwenk */
/**
 * GET /api/v1/klassen — Read-only API v1
 *
 * Auth:      Authorization: Bearer <API-Token> (Admin → Sicherheit)
 * Parameter: keine
 * Antwort:   { klassen: [{ id, name, grade, schuelerAnzahl }] }
 *
 * Beispiel:
 *   curl -H "Authorization: Bearer <token>" https://…/api/v1/klassen
 *   → { "klassen": [{ "id": "…", "name": "9b", "grade": 9, "schuelerAnzahl": 24 }] }
 *
 * DSGVO: Es werden KEINE personenbezogenen Schülerdaten ausgegeben —
 * nur Klassenname, Jahrgangsstufe und die aggregierte Schüleranzahl.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { authenticateApiRequest } from "@/lib/api-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await authenticateApiRequest(req);
  if (!auth) return NextResponse.json({ error: "Ungültiger oder fehlender API-Token" }, { status: 401 });

  const classes = await prisma.schoolClass.findMany({
    where: { schoolId: auth.schoolId },
    select: {
      id: true,
      name: true,
      grade: true,
      _count: { select: { students: true } },
    },
    orderBy: [{ grade: "asc" }, { name: "asc" }],
    take: 200,
  });

  return NextResponse.json({
    klassen: classes.map((c) => ({
      id: c.id,
      name: c.name,
      grade: c.grade,
      schuelerAnzahl: c._count.students,
    })),
  });
}
