/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { canManageSchool } from "@/lib/school-admin";
import { auditLog } from "@/lib/audit";
import { csvResponse, csvRow } from "../csv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUS_DE: Record<string, string> = {
  anwesend: "Anwesend",
  fehlt: "Fehlt",
  verspaetet: "Verspätet",
  entschuldigt: "Entschuldigt",
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

  const records = await prisma.attendanceRecord.findMany({
    where: { student: { schoolId } },
    select: {
      date: true,
      status: true,
      reason: true,
      student: { select: { name: true, klasse: true } },
    },
    orderBy: [{ date: "desc" }],
  });

  const header = csvRow(["Schüler", "Klasse", "Datum", "Status", "Grund"]);
  const rows = records.map((r) =>
    csvRow([
      r.student.name,
      r.student.klasse ?? "",
      r.date.toLocaleDateString("de-DE"),
      STATUS_DE[r.status] ?? r.status,
      r.reason ?? "",
    ])
  );

  await auditLog({
    action: "data.export",
    actorId: session.userId,
    schoolId,
    details: { kind: "export-fehlzeiten", rows: rows.length },
  }).catch(() => undefined);

  return csvResponse([header, ...rows], "fehlzeiten");
}
