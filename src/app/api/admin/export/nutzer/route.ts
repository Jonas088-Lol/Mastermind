/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { auditLog } from "@/lib/audit";
import { csvResponse, csvRow } from "../csv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROLE_DE: Record<string, string> = {
  student: "Schüler",
  teacher: "Lehrkraft",
  parent: "Elternteil",
  admin: "Admin",
  super: "Super-Admin",
};

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
      createdAt: true,
    },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });

  const header = csvRow(["Name", "E-Mail", "Rolle", "Klasse", "Erstellt am"]);
  const rows = users.map((u) =>
    csvRow([
      u.name,
      u.email,
      ROLE_DE[u.role] ?? u.role,
      u.klasse ?? "",
      u.createdAt.toLocaleDateString("de-DE"),
    ])
  );

  await auditLog({
    action: "data.export",
    actorId: session.userId,
    schoolId,
    details: { kind: "export-nutzer", rows: rows.length },
  }).catch(() => undefined);

  return csvResponse([header, ...rows], "nutzer");
}
