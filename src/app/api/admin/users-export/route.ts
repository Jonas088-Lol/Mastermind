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

  const users = await prisma.user.findMany({
    where: { schoolId },
    select: {
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

  const header = csvRow(["Name", "E-Mail", "Rolle", "Klasse", "2FA", "Verifiziert", "Registriert", "Letzte Anmeldung"]);

  const rows = users.map((u) =>
    csvRow([
      u.name,
      u.email,
      ROLE_DE[u.role] ?? u.role,
      u.klasse ?? "",
      u.twoFactor ? "Ja" : "Nein",
      u.verifiedAt ? "Ja" : "Nein",
      u.createdAt.toLocaleDateString("de-DE"),
      u.sessions[0]?.lastUsedAt.toLocaleDateString("de-DE") ?? "Nie",
    ])
  );

  const csv = [header, ...rows].join("\n");
  const date = new Date().toISOString().slice(0, 10);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="nutzer-${date}.csv"`,
    },
  });
}
