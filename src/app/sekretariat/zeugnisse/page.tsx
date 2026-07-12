/* Copyright 2026 Elian Schock, Jonas Schwenk */
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Zeugnisübersicht · Sekretariat" };

function gradeColor(avg: number): string {
  if (avg <= 2) return "text-success font-semibold";
  if (avg <= 4) return "text-warning font-semibold";
  return "text-danger font-semibold";
}

export default async function ZeugnissePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const role = effectiveRole(session);
  if (!["secretary", "rector", "vice_rector", "admin", "super"].includes(role)) redirect("/login");

  const { class: classFilter } = await searchParams;
  const classFilterStr = typeof classFilter === "string" ? classFilter : undefined;

  const schoolId = session.schoolId!;

  const [classes, students] = await Promise.all([
    prisma.schoolClass.findMany({
      where: { schoolId },
      orderBy: [{ grade: "asc" }, { name: "asc" }],
      select: { id: true, name: true, grade: true },
    }),
    prisma.user.findMany({
      where: {
        schoolId,
        role: "student",
        ...(classFilterStr ? { klasse: classFilterStr } : {}),
      },
      include: {
        studentGrades: {
          include: { subject: { select: { name: true, shortName: true } } },
        },
      },
      orderBy: [{ klasse: "asc" }, { name: "asc" }],
    }),
  ]);

  // Collect all unique subjects that appear in these students' grades
  const subjectMap = new Map<string, { name: string; shortName: string }>();
  for (const student of students) {
    for (const grade of student.studentGrades) {
      if (!subjectMap.has(grade.subjectId)) {
        subjectMap.set(grade.subjectId, {
          name: grade.subject.name,
          shortName: grade.subject.shortName,
        });
      }
    }
  }
  const subjects = Array.from(subjectMap.entries()).map(([id, s]) => ({ id, ...s }));
  subjects.sort((a, b) => a.name.localeCompare(b.name, "de"));

  // Compute per-student averages per subject
  type StudentRow = {
    id: string;
    name: string;
    klasse: string | null;
    subjectAverages: Map<string, number>;
    overallAverage: number | null;
  };

  const rows: StudentRow[] = students.map((student) => {
    const subjectAverages = new Map<string, number>();
    const gradesBySubject = new Map<string, number[]>();

    for (const grade of student.studentGrades) {
      const arr = gradesBySubject.get(grade.subjectId) ?? [];
      arr.push(grade.value);
      gradesBySubject.set(grade.subjectId, arr);
    }

    for (const [subjectId, values] of gradesBySubject.entries()) {
      const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
      subjectAverages.set(subjectId, avg);
    }

    const allValues = student.studentGrades.map((g: { value: number }) => g.value);
    const overallAverage =
      allValues.length > 0
        ? allValues.reduce((sum, v) => sum + v, 0) / allValues.length
        : null;

    return {
      id: student.id,
      name: student.name,
      klasse: student.klasse,
      subjectAverages,
      overallAverage,
    };
  });

  // Unique klasse values for filter tabs (from the actual students)
  const klasseValues = Array.from(new Set(students.map((s) => s.klasse).filter(Boolean) as string[])).sort();

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Sekretariat</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Zeugnisübersicht</h1>
        <p className="mt-1 text-sm text-muted-fg">
          {students.length} Schüler{classFilterStr ? ` · Klasse ${classFilterStr}` : ""}
        </p>
      </header>

      {/* Class filter tabs */}
      <div className="flex flex-wrap gap-2 border-b border-border pb-3">
        <Link
          href="/sekretariat/zeugnisse"
          className={cn(
            "px-3 py-1.5 text-sm font-medium transition-colors",
            !classFilterStr
              ? "border-b-2 border-fg text-fg"
              : "text-muted-fg hover:text-fg"
          )}
        >
          Alle
        </Link>
        {klasseValues.map((k) => (
          <Link
            key={k}
            href={`/sekretariat/zeugnisse?class=${encodeURIComponent(k)}`}
            className={cn(
              "px-3 py-1.5 text-sm font-medium transition-colors",
              classFilterStr === k
                ? "border-b-2 border-fg text-fg"
                : "text-muted-fg hover:text-fg"
            )}
          >
            {k}
          </Link>
        ))}
        {classes.length > 0 && klasseValues.length === 0 && (
          <p className="text-xs text-muted-fg self-center">Noch keine Noten eingetragen.</p>
        )}
      </div>

      {students.length === 0 ? (
        <div className="grid place-items-center border border-dashed border-border py-16">
          <p className="text-sm text-muted-fg">Keine Schüler{classFilterStr ? ` in Klasse ${classFilterStr}` : ""} gefunden.</p>
        </div>
      ) : subjects.length === 0 ? (
        <div className="grid place-items-center border border-dashed border-border py-16">
          <p className="text-sm text-muted-fg">Noch keine Noten eingetragen.</p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-border">
          <table className="w-full min-w-[600px] text-sm">
            <thead>
              <tr className="border-b border-border bg-surface text-xs font-semibold uppercase tracking-wider text-muted-fg">
                <th className="sticky left-0 bg-surface px-5 py-3 text-left">Schüler</th>
                <th className="px-3 py-3 text-center text-muted-fg/60">Kl.</th>
                {subjects.map((s) => (
                  <th key={s.id} className="px-3 py-3 text-center" title={s.name}>
                    {s.shortName}
                  </th>
                ))}
                <th className="px-5 py-3 text-center">Gesamt-Ø</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-surface">
                  <td className="sticky left-0 bg-bg px-5 py-3 font-medium">{row.name}</td>
                  <td className="px-3 py-3 text-center font-mono text-xs text-muted-fg">
                    {row.klasse ?? "—"}
                  </td>
                  {subjects.map((s) => {
                    const avg = row.subjectAverages.get(s.id);
                    return (
                      <td key={s.id} className="px-3 py-3 text-center font-mono text-xs">
                        {avg != null ? (
                          <span className={gradeColor(avg)}>{avg.toFixed(1)}</span>
                        ) : (
                          <span className="text-muted-fg/40">—</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-5 py-3 text-center font-mono text-xs">
                    {row.overallAverage != null ? (
                      <span className={cn("font-bold", gradeColor(row.overallAverage))}>
                        {row.overallAverage.toFixed(1)}
                      </span>
                    ) : (
                      <span className="text-muted-fg/40">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Legend */}
      {subjects.length > 0 && (
        <div className="flex flex-wrap gap-4 text-xs text-muted-fg">
          <span className="text-success font-semibold">≤ 2,0 sehr gut / gut</span>
          <span className="text-warning font-semibold">≤ 4,0 befriedigend / ausreichend</span>
          <span className="text-danger font-semibold">&gt; 4,0 mangelhaft / ungenügend</span>
        </div>
      )}
    </div>
  );
}
