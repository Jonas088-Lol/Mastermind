/* Copyright 2026 Elian Schock, Jonas Schwenk */
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Evaluation · Schulleitung" };

export default async function EvaluationPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const role = effectiveRole(session);
  if (!["rector", "vice_rector", "admin", "super"].includes(role)) redirect("/login");

  const schoolId = session.schoolId!;

  const [teachers, allGrades] = await Promise.all([
    prisma.user.findMany({
      where: { schoolId, role: "teacher" },
      include: {
        teacherSubjectClasses: {
          include: {
            subject: { select: { name: true, color: true } },
            class: { select: { name: true } },
          },
        },
        _count: {
          select: {
            teacherGrades: true,
            teacherAssignments: true,
            createdWorksheets: true,
          },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.grade.findMany({
      where: { teacher: { schoolId } },
      select: { value: true, teacherId: true },
    }),
  ]);

  // Compute per-teacher average grade
  const gradesByTeacher = new Map<string, number[]>();
  for (const g of allGrades) {
    if (!gradesByTeacher.has(g.teacherId)) gradesByTeacher.set(g.teacherId, []);
    gradesByTeacher.get(g.teacherId)!.push(g.value);
  }

  function avgGrade(teacherId: string): string {
    const grades = gradesByTeacher.get(teacherId);
    if (!grades || grades.length === 0) return "—";
    const avg = grades.reduce((s, v) => s + v, 0) / grades.length;
    return avg.toFixed(1).replace(".", ",");
  }

  // Sort by most grades entered
  const sorted = [...teachers].sort(
    (a, b) => b._count.teacherGrades - a._count.teacherGrades,
  );

  const totalGrades = allGrades.length;
  const totalAssignments = teachers.reduce((s, t) => s + t._count.teacherAssignments, 0);

  // Deduplicate subject/class badges per teacher
  type Badge = { subjectName: string; className: string; color: string };
  function getBadges(teacher: (typeof teachers)[number]): Badge[] {
    const seen = new Set<string>();
    const badges: Badge[] = [];
    for (const tsc of teacher.teacherSubjectClasses) {
      const key = `${tsc.subject.name}-${tsc.class.name}`;
      if (!seen.has(key)) {
        seen.add(key);
        badges.push({
          subjectName: tsc.subject.name,
          className: tsc.class.name,
          color: tsc.subject.color,
        });
      }
    }
    return badges;
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Schulleitung</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Lehrkräfte-Evaluation</h1>
        <p className="mt-1 text-sm text-muted-fg">Aktivitätsübersicht aller Lehrkräfte</p>
      </header>

      {/* Summary bar */}
      <div className="grid gap-px border border-border bg-border sm:grid-cols-3">
        <div className="bg-bg p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">Lehrkräfte</p>
          <p className="mt-3 font-mono text-3xl font-bold">{teachers.length}</p>
        </div>
        <div className="bg-bg p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">Noten eingetragen</p>
          <p className="mt-3 font-mono text-3xl font-bold">{totalGrades}</p>
        </div>
        <div className="bg-bg p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">Aufgaben erstellt</p>
          <p className="mt-3 font-mono text-3xl font-bold">{totalAssignments}</p>
        </div>
      </div>

      {/* Per-teacher cards */}
      {sorted.length === 0 ? (
        <p className="text-sm text-muted-fg">Noch keine Lehrkräfte in dieser Schule.</p>
      ) : (
        <div className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-fg">
            Lehrkräfte (sortiert nach Aktivität)
          </h2>
          <div className="border border-border divide-y divide-border">
            {sorted.map((teacher) => {
              const badges = getBadges(teacher);
              return (
                <div key={teacher.id} className="flex flex-col gap-3 bg-bg px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
                  {/* Name + badges */}
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <p className="font-semibold">{teacher.name}</p>
                    <p className="text-xs text-muted-fg">{teacher.email}</p>
                    {badges.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {badges.map((b) => (
                          <span
                            key={`${b.subjectName}-${b.className}`}
                            className="inline-flex items-center gap-1 border border-border px-2 py-0.5 text-[11px] font-medium text-muted-fg"
                          >
                            <span
                              className="inline-block size-2 rounded-full shrink-0"
                              style={{ backgroundColor: b.color }}
                            />
                            {b.subjectName} · {b.className}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="flex shrink-0 gap-6 text-right">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">Noten</p>
                      <p className="mt-1 font-mono text-xl font-bold">{teacher._count.teacherGrades}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">Aufgaben</p>
                      <p className="mt-1 font-mono text-xl font-bold">{teacher._count.teacherAssignments}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">Ø Note</p>
                      <p className="mt-1 font-mono text-xl font-bold">{avgGrade(teacher.id)}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">Arbeitsblätter</p>
                      <p className="mt-1 font-mono text-xl font-bold">{teacher._count.createdWorksheets}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
