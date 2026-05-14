import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";

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
  if (!session || effectiveRole(session) !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const schoolId = session.schoolId;
  if (!schoolId) {
    return NextResponse.json({ error: "Kein Schulkonto" }, { status: 400 });
  }

  const [recentSessions, recentUsers, recentGrades] = await Promise.all([
    prisma.session.findMany({
      where: { user: { schoolId } },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.user.findMany({
      where: { schoolId },
      select: { name: true, email: true, role: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.grade.findMany({
      where: { subject: { schoolId } },
      include: {
        teacher: { select: { name: true, email: true } },
        student: { select: { name: true } },
        subject: { select: { name: true } },
      },
      orderBy: { date: "desc" },
      take: 200,
    }),
  ]);

  const header = csvRow(["Zeitstempel", "Typ", "Akteur", "E-Mail Akteur", "Aktion", "Ziel", "Details", "IP"]);

  const rows: string[] = [
    ...recentSessions.map((s) =>
      csvRow([
        s.createdAt.toISOString(),
        "auth",
        s.user.name,
        s.user.email,
        "Anmeldung",
        "Login",
        s.ipAddress ? `IP: ${s.ipAddress}` : "Sitzung gestartet",
        s.ipAddress ?? "",
      ])
    ),
    ...recentUsers.map((u) =>
      csvRow([
        u.createdAt.toISOString(),
        "user",
        "System",
        "",
        "Nutzer registriert",
        u.name,
        `Rolle: ${u.role} · ${u.email}`,
        "",
      ])
    ),
    ...recentGrades.map((g) =>
      csvRow([
        g.date.toISOString(),
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
      "Content-Disposition": `attachment; filename="audit-log-${date}.csv"`,
    },
  });
}
