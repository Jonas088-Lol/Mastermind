/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { canManageSchool } from "@/lib/school-admin";
import { auditLog } from "@/lib/audit";
import { csvResponse, csvRow } from "../csv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TYPE_DE: Record<string, string> = {
  klausur: "Klausur",
  test: "Test",
  muendlich: "Mündlich",
  hausaufgabe: "Hausaufgabe",
  projekt: "Projekt",
};

export async function GET() {
  const session = await getSession();
  if (!session || !canManageSchool(effectiveRole(session))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const schoolId = session.schoolId;
  if (!schoolId) {
    return NextResponse.json({ error: "Kein Schulkonto" }, { status: 400 });
  }

  const grades = await prisma.grade.findMany({
    where: { student: { schoolId } },
    select: {
      value: true,
      weight: true,
      type: true,
      date: true,
      student: { select: { name: true, klasse: true } },
      subject: { select: { name: true } },
    },
    orderBy: [{ date: "desc" }],
  });

  const header = csvRow(["Schüler", "Klasse", "Fach", "Note", "Gewichtung", "Art", "Datum"]);
  const rows = grades.map((g) =>
    csvRow([
      g.student.name,
      g.student.klasse ?? "",
      g.subject.name,
      g.value.toLocaleString("de-DE"),
      g.weight.toLocaleString("de-DE"),
      TYPE_DE[g.type] ?? g.type,
      g.date.toLocaleDateString("de-DE"),
    ])
  );

  await auditLog({
    action: "data.export",
    actorId: session.userId,
    schoolId,
    details: { kind: "export-noten", rows: rows.length },
  }).catch(() => undefined);

  return csvResponse([header, ...rows], "noten");
}
