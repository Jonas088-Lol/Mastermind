/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { auditLog } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function csvRow(values: (string | number | boolean | null | undefined)[]): string {
  return values
    .map((v) => {
      let s = v == null ? "" : String(v);
      if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
      return `"${s.replace(/"/g, '""')}"`;
    })
    .join(",");
}

export async function GET() {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "rector") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const schoolId = session.schoolId;
  if (!schoolId) {
    return NextResponse.json({ error: "Kein Schulkonto" }, { status: 400 });
  }

  const users = await prisma.user.findMany({
    where: { schoolId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      klasse: true,
      twoFactor: true,
      verifiedAt: true,
      createdAt: true,
      sessions: {
        select: { lastUsedAt: true },
        orderBy: { lastUsedAt: "desc" },
        take: 1,
      },
      _count: {
        select: { studentSubmissions: true, studentGrades: true, sentMessages: true, xpLogs: true },
      },
    },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });

  const ROLE_DE: Record<string, string> = {
    student: "Schüler",
    teacher: "Lehrkraft",
    parent: "Elternteil",
    admin: "Admin",
    super: "Super-Admin",
  };

  const header = csvRow([
    "ID",
    "Name",
    "E-Mail",
    "Rolle",
    "Klasse",
    "2FA aktiv",
    "E-Mail verifiziert",
    "Registriert am",
    "Letzte Anmeldung",
    "Abgaben",
    "Noten",
    "Nachrichten gesendet",
    "XP-Einträge",
  ]);

  const rows = users.map((u) =>
    csvRow([
      u.id,
      u.name,
      u.email,
      ROLE_DE[u.role] ?? u.role,
      u.klasse ?? "",
      u.twoFactor ? "Ja" : "Nein",
      u.verifiedAt ? u.verifiedAt.toISOString() : "Nein",
      u.createdAt.toISOString(),
      u.sessions[0]?.lastUsedAt.toISOString() ?? "Nie",
      u._count.studentSubmissions,
      u._count.studentGrades,
      u._count.sentMessages,
      u._count.xpLogs,
    ])
  );

  const csv = [header, ...rows].join("\n");
  const date = new Date().toISOString().slice(0, 10);

  await auditLog({
    action: "data.export",
    actorId: session.userId,
    schoolId,
    details: { kind: "dsgvo-export", rows: rows.length },
  }).catch(() => undefined);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="dsgvo-export-${date}.csv"`,
    },
  });
}
