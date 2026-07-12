/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function csvRow(values: (string | number | null | undefined)[]): string {
  return values
    .map((v) => {
      const s = v == null ? "" : String(v);
      return `"${s.replace(/"/g, '""')}"`;
    })
    .join(",");
}

export async function GET(request: Request) {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "teacher") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const classId   = searchParams.get("classId") ?? undefined;
  const subjectId = searchParams.get("subjectId") ?? undefined;

  const grades = await prisma.grade.findMany({
    where: {
      teacherId: session.userId,
      ...(classId   ? { student: { classId } }   : {}),
      ...(subjectId ? { subjectId }               : {}),
    },
    include: {
      student: {
        select: {
          name: true,
          email: true,
          schoolClass: { select: { name: true } },
        },
      },
      subject: { select: { name: true, shortName: true } },
    },
    orderBy: [{ subject: { name: "asc" } }, { student: { name: "asc" } }, { date: "desc" }],
  });

  const TYPE_LABEL: Record<string, string> = {
    klausur: "Klausur", test: "Test", muendlich: "Mündlich",
    hausaufgabe: "Hausaufgabe", projekt: "Projekt",
  };

  const header = csvRow(["Schüler", "E-Mail", "Klasse", "Fach", "Note", "Art", "Gewichtung", "Datum", "Kommentar"]);
  const rows = grades.map((g) =>
    csvRow([
      g.student.name,
      g.student.email,
      g.student.schoolClass?.name ?? "",
      g.subject.name,
      g.value,
      TYPE_LABEL[g.type] ?? g.type,
      g.weight,
      g.date.toLocaleDateString("de-DE"),
      g.comment ?? "",
    ])
  );

  const csv = [header, ...rows].join("\n");
  const filename = `noten_${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
