import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Statistiken · Schulleitung" };

export default async function StatistikenPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const role = effectiveRole(session);
  if (role !== "rector" && role !== "vice_rector" && role !== "admin" && role !== "super") {
    redirect("/login");
  }

  const schoolId = session.schoolId ?? "";

  const [classes, gradesBySubject, absencesByClass] = await Promise.all([
    prisma.schoolClass.findMany({
      where: { schoolId },
      include: {
        students: { where: { role: "student" }, select: { id: true } },
        _count: { select: { students: true } },
      },
      orderBy: [{ grade: "asc" }, { name: "asc" }],
    }),
    prisma.grade.groupBy({
      by: ["subjectId"],
      where: { student: { schoolId } },
      _avg: { value: true },
      _count: { value: true },
    }),
    prisma.absence.groupBy({
      by: ["studentId"],
      where: { student: { schoolId }, status: { in: ["pending", "confirmed"] } },
      _count: { studentId: true },
      orderBy: { _count: { studentId: "desc" } },
      take: 10,
    }),
  ]);

  const subjects = await prisma.subject.findMany({
    where: { schoolId },
    select: { id: true, name: true, shortName: true, color: true },
  });
  const subjectMap = Object.fromEntries(subjects.map((s) => [s.id, s]));

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
                  <div
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: subject.color }}
                  />
                  <span className="w-24 text-sm font-medium">{subject.shortName}</span>
                  <div className="flex-1 h-2 bg-border">
                    <div
                      className={`h-2 ${tone}`}
                      style={{ width: `${Math.min(100, ((5 - avg) / 4) * 100)}%` }}
                    />
                  </div>
                  <span className="w-12 text-right font-mono text-sm font-bold">
                    Ø {avg.toFixed(1)}
                  </span>
                  <span className="text-xs text-muted-fg">({row._count.value} Noten)</span>
                </div>
              );
            })}
        </div>
      </section>
    </div>
  );
}
