/* Copyright 2026 Elian Schock, Jonas Schwenk */
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Download } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { canManageSchool, canAccessArea } from "@/lib/school-admin";
import {
  buildAbsenceReport,
  schoolYearLabel,
  schoolYearOf,
} from "@/lib/absence-report";

export const metadata: Metadata = { title: "Fehltage — Jahresübersicht" };

interface PageProps {
  searchParams: Promise<{ jahr?: string; classId?: string }>;
}

export default async function FehltageJahresuebersichtPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session || !canManageSchool(effectiveRole(session))) redirect("/admin");
  if (!canAccessArea(effectiveRole(session), "fehlzeiten")) redirect("/admin");

  const { jahr, classId } = await searchParams;
  const schoolId = session.schoolId ?? "";

  const currentYear = schoolYearOf(new Date());
  const parsed = jahr ? parseInt(jahr, 10) : NaN;
  const year = Number.isFinite(parsed) ? parsed : currentYear;
  // Aktuelles und die vier vorherigen Schuljahre zur Auswahl.
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  const [classes, rows] = await Promise.all([
    prisma.schoolClass.findMany({
      where: { schoolId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    buildAbsenceReport(schoolId, year, classId || null),
  ]);

  const totals = rows.reduce(
    (acc, r) => ({
      excused: acc.excused + r.excusedDays,
      unexcused: acc.unexcused + r.unexcusedDays,
      pending: acc.pending + r.pendingDays,
      total: acc.total + r.totalDays,
    }),
    { excused: 0, unexcused: 0, pending: 0, total: 0 },
  );

  const query = (extra: Record<string, string>) => {
    const p = new URLSearchParams({ jahr: String(year) });
    if (classId) p.set("classId", classId);
    for (const [k, v] of Object.entries(extra)) {
      if (v) p.set(k, v); else p.delete(k);
    }
    return `?${p.toString()}`;
  };

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <header className="flex items-start gap-3">
        <Link href="/admin/fehlzeiten" className="mt-1 text-muted-fg hover:text-fg">
          <ArrowLeft className="size-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">
            Schulverwaltung
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
            Fehltage — Jahresübersicht
          </h1>
          <p className="mt-1 text-sm text-muted-fg">
            Fehltage je Schüler im Schuljahr {schoolYearLabel(year)}. Gezählt werden
            Unterrichtstage (Mo–Fr); Zeiträume über den Jahreswechsel werden
            anteilig zugeordnet.
          </p>
        </div>
      </header>

      {/* ── Filter ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-wrap gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-fg">
              Schuljahr
            </span>
            <div className="flex flex-wrap gap-1.5">
              {years.map((y) => (
                <Link
                  key={y}
                  href={query({ jahr: String(y) })}
                  className={
                    y === year
                      ? "rounded-lg border border-brand bg-brand/10 px-3 py-1.5 text-xs font-semibold text-brand"
                      : "rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-fg transition-colors hover:border-brand/40 hover:text-fg"
                  }
                >
                  {schoolYearLabel(y)}
                </Link>
              ))}
            </div>
          </div>

          {classes.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-fg">
                Klasse
              </span>
              <div className="flex flex-wrap gap-1.5">
                <Link
                  href={`?jahr=${year}`}
                  className={
                    !classId
                      ? "rounded-lg border border-brand bg-brand/10 px-3 py-1.5 text-xs font-semibold text-brand"
                      : "rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-fg transition-colors hover:border-brand/40 hover:text-fg"
                  }
                >
                  Alle
                </Link>
                {classes.map((c) => (
                  <Link
                    key={c.id}
                    href={`?jahr=${year}&classId=${c.id}`}
                    className={
                      classId === c.id
                        ? "rounded-lg border border-brand bg-brand/10 px-3 py-1.5 text-xs font-semibold text-brand"
                        : "rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-fg transition-colors hover:border-brand/40 hover:text-fg"
                    }
                  >
                    {c.name}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        <a
          href={`/admin/fehlzeiten/jahresuebersicht/export?jahr=${year}${classId ? `&classId=${classId}` : ""}`}
          className="inline-flex shrink-0 items-center gap-2 self-start rounded-xl border border-border px-4 py-2 text-sm font-semibold transition-colors hover:border-brand/40 hover:bg-surface"
        >
          <Download className="size-4" />
          CSV exportieren
        </a>
      </div>

      {/* ── Summen ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Fehltage gesamt", value: totals.total, tone: "text-fg" },
          { label: "Entschuldigt", value: totals.excused, tone: "text-success" },
          { label: "Unentschuldigt", value: totals.unexcused, tone: "text-danger" },
          { label: "Offen", value: totals.pending, tone: "text-warning" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-bg p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">
              {s.label}
            </p>
            <p className={`mt-1 font-mono text-2xl font-bold ${s.tone}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── Tabelle ──────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Schüler · {rows.length}</CardTitle>
        </CardHeader>
        <CardBody className="px-0! pb-0!">
          {rows.length === 0 ? (
            <p className="border-t border-border px-5 py-8 text-center text-sm text-muted-fg">
              Für dieses Schuljahr sind keine Fehlzeiten erfasst.
            </p>
          ) : (
            <div className="overflow-x-auto border-t border-border">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface text-[11px] uppercase tracking-wider text-muted-fg">
                    <th className="px-5 py-2 text-left font-semibold">Schüler</th>
                    <th className="px-3 py-2 text-left font-semibold">Klasse</th>
                    <th className="px-3 py-2 text-right font-semibold">Gesamt</th>
                    <th className="px-3 py-2 text-right font-semibold">Entsch.</th>
                    <th className="px-3 py-2 text-right font-semibold">Unentsch.</th>
                    <th className="px-5 py-2 text-right font-semibold">Offen</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.studentId} className="border-b border-border last:border-b-0">
                      <td className="px-5 py-2.5 font-medium">{r.studentName}</td>
                      <td className="px-3 py-2.5 text-muted-fg">{r.className}</td>
                      <td className="px-3 py-2.5 text-right font-mono font-bold">{r.totalDays}</td>
                      <td className="px-3 py-2.5 text-right font-mono text-success">{r.excusedDays}</td>
                      <td className="px-3 py-2.5 text-right font-mono text-danger">{r.unexcusedDays}</td>
                      <td className="px-5 py-2.5 text-right font-mono text-warning">{r.pendingDays}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
