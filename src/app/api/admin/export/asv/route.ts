/* Copyright 2026 Elian Schock, Jonas Schwenk */
// ASV-kompatibler Schülerdaten-Export (Amtliche Schulverwaltung Bayern).
// Spaltenaufbau orientiert sich am ASV-Schülerimport: Familienname, Rufname,
// Geburtsdatum (TT.MM.JJJJ), Klasse — Semikolon-getrennt, Windows-1252-sicher
// via UTF-8 mit BOM (ASV liest beides).
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { canManageSchool } from "@/lib/school-admin";
import { auditLog } from "@/lib/audit";
import { csvResponse, csvRow } from "../csv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** "Max Mustermann" → { vorname: "Max", nachname: "Mustermann" } */
function splitName(full: string): { vorname: string; nachname: string } {
  const parts = full.trim().split(/\s+/);
  if (parts.length === 1) return { vorname: "", nachname: parts[0] };
  return { vorname: parts.slice(0, -1).join(" "), nachname: parts[parts.length - 1] };
}

function asvDate(d: Date | null): string {
  if (!d) return "";
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export async function GET() {
  const session = await getSession();
  if (!session || !canManageSchool(effectiveRole(session))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const schoolId = session.schoolId;
  if (!schoolId) {
    return NextResponse.json({ error: "Kein Schulkonto" }, { status: 400 });
  }

  const students = await prisma.user.findMany({
    where: { schoolId, role: "student" },
    select: {
      name: true,
      email: true,
      birthDate: true,
      klasse: true,
      schoolClass: { select: { name: true } },
    },
    orderBy: [{ klasse: "asc" }, { name: "asc" }],
  });

  const header = csvRow([
    "Familienname",
    "Rufname",
    "Geburtsdatum",
    "Klasse",
    "E-Mail",
  ]);
  const rows = students.map((s) => {
    const { vorname, nachname } = splitName(s.name);
    return csvRow([
      nachname,
      vorname,
      asvDate(s.birthDate),
      s.schoolClass?.name ?? s.klasse ?? "",
      s.email,
    ]);
  });

  await auditLog({
    action: "data.export",
    actorId: session.userId,
    schoolId,
    details: { kind: "export-asv", rows: rows.length },
  }).catch(() => undefined);

  return csvResponse([header, ...rows], "asv-schueler");
}
