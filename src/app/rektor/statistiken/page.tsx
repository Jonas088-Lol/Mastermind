import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Statistiken · Schulleitung" };

export default async function StatistikenPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const role = effectiveRole(session);
  if (role !== "rector" && role !== "vice_rector" && role !== "admin" && role !== "super") {
    redirect("/login");
  }

  const schoolId = session.schoolId ?? "";
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400_000);

  const [classes, gradesBySubject, topAbsentees, recentIncidents, incidentCounts] = await Promise.all([
    prisma.schoolClass.findMany({
      where: { schoolId },
      include: { _count: { select: { students: true } } },
      orderBy: [{ grade: "asc" }, { name: "asc" }],
    }),
    prisma.grade.groupBy({
      by: ["subjectId"],
      where: { student: { schoolId } },
      _avg: { value: true },
      _count: { value: true },
    }),
    // Top 10 most-absent students (last 30 days, confirmed absences)
    prisma.absence.findMany({
      where: { student: { schoolId }, status: "confirmed", fromDate: { gte: thirtyDaysAgo } },
      include: { student: { select: { name: true, schoolClass: { select: { name: true } } } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    // Last 10 incidents school-wide
    prisma.classbookIncident.findMany({
      where: { student: { schoolId } },
      include: {
        student: { select: { name: true } },
        teacher: { select: { name: true } },
        class: { select: { name: true } },
      },
      orderBy: { date: "desc" },
      take: 10,
    }),
    // Incident counts per type (last 30 days)
    prisma.classbookIncident.groupBy({
      by: ["type"],
      where: { student: { schoolId }, date: { gte: thirtyDaysAgo } },
      _count: { type: true },
    }),
  ]);

  const subjects = await prisma.subject.findMany({
    where: { schoolId },
    select: { id: true, name: true, shortName: true, color: true },
  });
  const subjectMap = Object.fromEntries(subjects.map((s) => [s.id, s]));

  // Aggregate absences per student
  const absenceMap = new Map<string, { name: string; class: string; count: number }>();
  for (const a of topAbsentees) {
    const key = a.studentId;
    if (!absenceMap.has(key)) {
      absenceMap.set(key, {
        name: a.student.name,
        class: a.student.schoolClass?.name ?? "—",
        count: 0,
      });
    }
    absenceMap.get(key)!.count++;
  }
  const absenceRanking = Array.from(absenceMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const INCIDENT_TONE: Record<string, string> = {
    Verweis: "text-danger",
    Lob: "text-success",
    Hinweis: "text-warning",
  };

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-10">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Schulleitung</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Statistiken</h1>
      </header>

      {/* Klassen-Übersicht */}
      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-fg">
          Klassenübersicht
        </h2>
        <div className="border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface text-xs font-semibold uppercase tracking-wider text-muted-fg">
                <th className="px-5 py-3 text-left">Klasse</th>
                <th className="px-5 py-3 text-right">Schüler</th>
                <th className="px-5 py-3 text-right">Jahrgang</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {classes.map((cls) => (
                <tr key={cls.id} className="hover:bg-surface">
                  <td className="px-5 py-2.5 font-semibold">{cls.name}</td>
                  <td className="px-5 py-2.5 text-right font-mono">{cls._count.students}</td>
                  <td className="px-5 py-2.5 text-right text-muted-fg">{cls.grade}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Noten nach Fach */}
      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-fg">
          Durchschnittsnoten nach Fach
        </h2>
        <div className="space-y-2">
          {gradesBySubject
            .sort((a, b) => (a._avg.value ?? 0) - (b._avg.value ?? 0))
            .map((row) => {
              const subject = subjectMap[row.subjectId];
              if (!subject) return null;
              const avg = row._avg.value ?? 0;
              const tone =
                avg <= 2.0 ? "bg-success" : avg <= 3.0 ? "bg-brand" : avg <= 4.0 ? "bg-warning" : "bg-danger";
              return (
                <div key={row.subjectId} className="flex items-center gap-3">
                  <div className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: subject.color }} />
                  <span className="w-24 text-sm font-medium">{subject.shortName}</span>
                  <div className="flex-1 h-2 bg-border">
                    <div className={`h-2 ${tone}`} style={{ width: `${Math.min(100, ((5 - avg) / 4) * 100)}%` }} />
                  </div>
                  <span className="w-12 text-right font-mono text-sm font-bold">Ø {avg.toFixed(1)}</span>
                  <span className="text-xs text-muted-fg">({row._count.value} Noten)</span>
                </div>
              );
            })}
        </div>
      </section>

      {/* Fehlzeiten-Rangliste */}
      <section>
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wider text-muted-fg">
          Fehlzeiten · letzte 30 Tage
        </h2>
        <p className="mb-4 text-xs text-muted-fg">Nur bestätigte Fehlzeiten</p>
        {absenceRanking.length === 0 ? (
          <p className="text-sm text-muted-fg">Keine bestätigten Fehlzeiten im Zeitraum.</p>
        ) : (
          <div className="border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface text-xs font-semibold uppercase tracking-wider text-muted-fg">
                  <th className="px-5 py-3 text-left">Schüler</th>
                  <th className="px-5 py-3 text-left">Klasse</th>
                  <th className="px-5 py-3 text-right">Meldungen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {absenceRanking.map((s, i) => (
                  <tr key={i} className={cn("hover:bg-surface", s.count >= 3 && "bg-warning/[0.03]")}>
                    <td className="px-5 py-2.5 font-medium">{s.name}</td>
                    <td className="px-5 py-2.5 text-muted-fg">{s.class}</td>
                    <td className={cn("px-5 py-2.5 text-right font-mono font-bold", s.count >= 3 ? "text-danger" : "text-fg")}>
                      {s.count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Vorfälle */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-fg">
            Vorfälle · letzte 30 Tage
          </h2>
          <div className="flex gap-3">
            {incidentCounts.map((ic) => (
              <span key={ic.type} className={cn("text-xs font-semibold", INCIDENT_TONE[ic.type] ?? "text-muted-fg")}>
                {ic._count.type}× {ic.type}
              </span>
            ))}
          </div>
        </div>
        {recentIncidents.length === 0 ? (
          <p className="text-sm text-muted-fg">Keine Vorfälle im Zeitraum.</p>
        ) : (
          <ul className="divide-y divide-border border border-border">
            {recentIncidents.map((inc) => (
              <li key={inc.id} className="flex items-start gap-4 px-5 py-3 text-sm">
                <span className={cn("mt-0.5 shrink-0 text-xs font-bold", INCIDENT_TONE[inc.type] ?? "text-muted-fg")}>
                  {inc.type}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{inc.student.name}</p>
                  <p className="truncate text-xs text-muted-fg">{inc.text}</p>
                </div>
                <div className="text-right text-xs text-muted-fg">
                  <p>{inc.class.name}</p>
                  <p>{inc.date.toLocaleDateString("de-DE", { day: "numeric", month: "short" })}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
