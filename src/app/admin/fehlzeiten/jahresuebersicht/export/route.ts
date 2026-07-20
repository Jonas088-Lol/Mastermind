/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { NextResponse } from "next/server";
import { getSession, effectiveRole } from "@/lib/session";
import { canManageSchool, canAccessArea } from "@/lib/school-admin";
import { buildAbsenceReport, schoolYearLabel, schoolYearOf } from "@/lib/absence-report";

export const runtime = "nodejs";

/** Ein CSV-Feld sicher escapen (Semikolon-getrennt für Excel/DE). */
function csv(value: string | number): string {
  const s = String(value);
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * Jahresübersicht der Fehltage als CSV — für die Meldung ans Kultusministerium.
 */
export async function GET(request: Request) {
  const session = await getSession();
  if (!session || !canManageSchool(effectiveRole(session))) {
    return new NextResponse("Forbidden", { status: 403 });
  }
  if (!canAccessArea(effectiveRole(session), "fehlzeiten")) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const url = new URL(request.url);
  const parsed = parseInt(url.searchParams.get("jahr") ?? "", 10);
  const year = Number.isFinite(parsed) ? parsed : schoolYearOf(new Date());
  const classId = url.searchParams.get("classId") || null;

  const rows = await buildAbsenceReport(session.schoolId ?? "", year, classId);

  const lines = [
    ["Schüler", "Klasse", "Fehltage gesamt", "Entschuldigt", "Unentschuldigt", "Offen", "Einträge"]
      .map(csv)
      .join(";"),
    ...rows.map((r) =>
      [r.studentName, r.className, r.totalDays, r.excusedDays, r.unexcusedDays, r.pendingDays, r.entries]
        .map(csv)
        .join(";"),
    ),
  ];

  // BOM, damit Excel die Umlaute korrekt als UTF-8 liest.
  const body = "﻿" + lines.join("\r\n") + "\r\n";
  const label = schoolYearLabel(year).replace("/", "-");

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="fehltage-${label}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
