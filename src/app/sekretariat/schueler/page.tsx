/* Copyright 2026 Elian Schock, Jonas Schwenk */
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Schüler · Sekretariat" };

export default async function SchuelerPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; class?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const role = effectiveRole(session);
  if (role !== "secretary" && role !== "rector" && role !== "vice_rector" && role !== "admin" && role !== "super") {
    redirect("/login");
  }

  const { q, class: classFilter } = await searchParams;
  const schoolId = session.schoolId ?? "";

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const students = await prisma.user.findMany({
    where: {
      schoolId,
      role: "student",
      ...(q ? { name: { contains: q } } : {}),
      ...(classFilter ? { schoolClass: { name: classFilter } } : {}),
    },
    include: {
      schoolClass: { select: { name: true, grade: true } },
      studentAbsences: {
        where: { fromDate: { gte: monthStart } },
        select: { id: true, status: true },
      },
    },
    orderBy: [{ klasse: "asc" }, { name: "asc" }],
  });

  // Summary counts (unfiltered for the school)
  const [totalAll, pendingThisMonth, noClass] = await Promise.all([
    prisma.user.count({ where: { schoolId, role: "student" } }),
    prisma.absence.count({
      where: {
        schoolId,
        status: "pending",
        fromDate: { gte: monthStart },
        student: { role: "student" },
      },
    }),
    prisma.user.count({ where: { schoolId, role: "student", classId: null } }),
  ]);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Sekretariat</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Schüler</h1>
        <p className="mt-1 text-sm text-muted-fg">{totalAll} Schüler gesamt</p>
      </header>

      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-px border border-border bg-border">
        <div className="bg-bg px-5 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">Schüler gesamt</p>
          <p className="mt-1 font-mono text-2xl font-bold">{totalAll}</p>
        </div>
        <div className="bg-bg px-5 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">Ausstehende Fehlzeiten</p>
          <p className={cn("mt-1 font-mono text-2xl font-bold", pendingThisMonth > 0 && "text-warning")}>
            {pendingThisMonth}
          </p>
          <p className="text-[10px] text-muted-fg">diesen Monat</p>
        </div>
        <div className="bg-bg px-5 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">Ohne Klasse</p>
          <p className={cn("mt-1 font-mono text-2xl font-bold", noClass > 0 && "text-warning")}>
            {noClass}
          </p>
        </div>
      </div>

      {/* Search form */}
      <form method="get" className="flex gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Schüler suchen …"
          className="h-9 flex-1 border border-border bg-bg px-3 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
        />
        {classFilter && (
          <input type="hidden" name="class" value={classFilter} />
        )}
        <button
          type="submit"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          Suchen
        </button>
        {(q || classFilter) && (
          <Link href="/sekretariat/schueler" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
            Zurücksetzen
          </Link>
        )}
      </form>

      {classFilter && (
        <p className="text-sm text-muted-fg">
          Klasse: <span className="font-semibold text-fg">{classFilter}</span>
        </p>
      )}

      {/* Bulk actions */}
      <div className="flex items-center gap-3 border border-dashed border-border px-4 py-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-fg">Sammelaktionen</span>
        <Link
          href="/sekretariat/schueler/email-alle"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          <Mail className="size-3.5" />
          E-Mail an alle senden
        </Link>
      </div>

      <div className="border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface text-xs font-semibold uppercase tracking-wider text-muted-fg">
              <th className="px-5 py-3 text-left">Name</th>
              <th className="px-5 py-3 text-left">Klasse</th>
              <th className="px-5 py-3 text-left">E-Mail</th>
              <th className="px-5 py-3 text-right">Fehlzeiten (Monat)</th>
              <th className="px-5 py-3 text-right">Aktionen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {students.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-sm text-muted-fg">
                  {q ? `Keine Schüler für "${q}" gefunden.` : "Keine Schüler vorhanden."}
                </td>
              </tr>
            ) : (
              students.map((s) => {
                const absCount = s.studentAbsences.length;
                const pendingCount = s.studentAbsences.filter((a) => a.status === "pending").length;
                const confirmedCount = s.studentAbsences.filter((a) => a.status === "confirmed").length;

                const absVariant =
                  absCount === 0 ? "success" : absCount <= 2 ? "warning" : "danger";

                return (
                  <tr key={s.id} className="hover:bg-surface">
                    <td className="px-5 py-3 font-medium">{s.name}</td>
                    <td className="px-5 py-3">
                      {s.schoolClass ? (
                        <Badge variant="outline">{s.schoolClass.name}</Badge>
                      ) : (
                        <span className="text-xs text-muted-fg">{s.klasse ?? "—"}</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-muted-fg">{s.email}</td>
                    <td className="px-5 py-3 text-right">
                      {absCount > 0 ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <Badge variant={absVariant}>{absCount}</Badge>
                          {pendingCount > 0 && (
                            <span className="font-mono text-xs text-muted-fg">{pendingCount} ausstehend</span>
                          )}
                          {confirmedCount > 0 && (
                            <span className="font-mono text-xs text-muted-fg">{confirmedCount} bestätigt</span>
                          )}
                        </div>
                      ) : (
                        <Badge variant="success">0</Badge>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/admin/nutzer/${s.id}`}
                          className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
                        >
                          Profil öffnen
                        </Link>
                        <Link
                          href={`/app/nachrichten/neu?to=${s.id}`}
                          className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
                          title="Nachricht senden"
                        >
                          <Mail className="size-3.5" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
