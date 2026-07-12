/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getSession, isSuper } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function csvRow(values: (string | number | boolean | null | undefined)[]): string {
  return values
    .map((v) => {
      const s = v == null ? "" : String(v);
      return `"${s.replace(/"/g, '""')}"`;
    })
    .join(",");
}

export async function GET() {
  const session = await getSession();
  if (!session || !isSuper(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [recentSessions, recentUsers, recentGrades] = await Promise.all([
    prisma.session.findMany({
      include: { user: { select: { name: true, email: true, school: { select: { name: true } } } } },
      orderBy: { createdAt: "desc" },
      take: 500,
    }),
    prisma.user.findMany({
      select: { name: true, email: true, role: true, createdAt: true, school: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 300,
    }),
    prisma.grade.findMany({
      include: {
        teacher: { select: { name: true, email: true, school: { select: { name: true } } } },
        student: { select: { name: true } },
        subject: { select: { name: true } },
      },
      orderBy: { date: "desc" },
      take: 300,
    }),
  ]);

  const header = csvRow(["Zeitstempel", "Schule", "Typ", "Akteur", "E-Mail", "Aktion", "Ziel", "Details", "IP"]);

  const rows: string[] = [
    ...recentSessions.map((s) =>
      csvRow([
        s.createdAt.toISOString(),
        s.user.school?.name ?? "—",
        "auth",
        s.user.name,
        s.user.email,
        "Anmeldung",
        "Login",
        s.ipAddress ? `IP: ${s.ipAddress}` : "",
        s.ipAddress ?? "",
      ])
    ),
    ...recentUsers.map((u) =>
      csvRow([
        u.createdAt.toISOString(),
        u.school?.name ?? "—",
        "user",
        "System",
        "",
        "Nutzer registriert",
        u.name,
        `Rolle: ${u.role}`,
        "",
      ])
    ),
    ...recentGrades.map((g) =>
      csvRow([
        g.date.toISOString(),
        g.teacher.school?.name ?? "—",
        "data",
        g.teacher.name,
        g.teacher.email,
        "Note eingetragen",
        g.student.name,
        `${g.subject.name} · Note ${g.value.toFixed(1)}`,
        "",
      ])
    ),
  ].sort();

  const csv = [header, ...rows].join("\n");
  const date = new Date().toISOString().slice(0, 10);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="plattform-audit-${date}.csv"`,
    },
  });
}
