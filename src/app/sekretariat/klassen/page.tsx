/* Copyright 2026 Elian Schock, Jonas Schwenk */
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Klassenlisten · Sekretariat" };

export default async function KlassenlistenPage({
  searchParams,
}: {
  searchParams: Promise<{ grade?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const role = effectiveRole(session);
  if (role !== "secretary" && role !== "rector" && role !== "vice_rector" && role !== "admin" && role !== "super") {
    redirect("/login");
  }

  const { grade: gradeParam } = await searchParams;
  const gradeFilter = gradeParam ? parseInt(gradeParam, 10) : undefined;

  const schoolId = session.schoolId ?? "";

  const classes = await prisma.schoolClass.findMany({
    where: {
      schoolId,
      ...(gradeFilter && !isNaN(gradeFilter) ? { grade: gradeFilter } : {}),
    },
    include: {
      _count: { select: { students: true } },
      teacherSubjectClasses: {
        include: {
          teacher: { select: { id: true, name: true } },
          subject: { select: { name: true, color: true } },
        },
      },
    },
    orderBy: [{ grade: "asc" }, { name: "asc" }],
  });

  // Distinct grade levels for filter chips
  const allGrades = await prisma.schoolClass.findMany({
    where: { schoolId },
    select: { grade: true },
    distinct: ["grade"],
    orderBy: { grade: "asc" },
  });

  const totalStudents = classes.reduce((sum, c) => sum + c._count.students, 0);
  const avgSize = classes.length > 0 ? Math.round(totalStudents / classes.length) : 0;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Sekretariat</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Klassenlisten</h1>
        <p className="mt-1 text-sm text-muted-fg">{classes.length} Klassen</p>
      </header>

      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-px border border-border bg-border">
        <div className="bg-bg px-5 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">Klassen gesamt</p>
          <p className="mt-1 font-mono text-2xl font-bold">{classes.length}</p>
        </div>
        <div className="bg-bg px-5 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">Schüler gesamt</p>
          <p className="mt-1 font-mono text-2xl font-bold">{totalStudents}</p>
        </div>
        <div className="bg-bg px-5 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">Ø Klassengröße</p>
          <p className="mt-1 font-mono text-2xl font-bold">{avgSize}</p>
        </div>
      </div>

      {/* Grade filter chips */}
      {allGrades.length > 1 && (
        <div className="flex flex-wrap gap-2">
          <Link
            href="/sekretariat/klassen"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              !gradeFilter && "border-brand text-brand"
            )}
          >
            Alle Jahrgänge
          </Link>
          {allGrades.map((g) => (
            <Link
              key={g.grade}
              href={`/sekretariat/klassen?grade=${g.grade}`}
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                gradeFilter === g.grade && "border-brand text-brand"
              )}
            >
              Jahrgang {g.grade}
            </Link>
          ))}
        </div>
      )}

      {classes.length === 0 ? (
        <div className="grid place-items-center border border-dashed border-border py-16">
          <p className="text-sm text-muted-fg">
            {gradeFilter ? `Keine Klassen im Jahrgang ${gradeFilter}.` : "Noch keine Klassen angelegt."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {classes.map((cls) => {
            // Deduplicate teachers
            const teacherMap = new Map<string, string>();
            for (const tsc of cls.teacherSubjectClasses) {
              teacherMap.set(tsc.teacher.id, tsc.teacher.name);
            }
            const teachers = Array.from(teacherMap.values());

            // Deduplicate subjects
            const subjectNames = Array.from(
              new Set(cls.teacherSubjectClasses.map((tsc) => tsc.subject.name))
            );

            return (
              <section key={cls.id} className="border border-border">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface px-5 py-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <Users className="size-4 shrink-0 text-muted-fg" strokeWidth={1.75} />
                    <Badge variant="outline">Klasse {cls.name}</Badge>
                    <span className="text-xs text-muted-fg">Jahrgang {cls.grade}</span>
                    <span className="font-mono text-xs text-muted-fg">{cls._count.students} Schüler</span>
                    {teachers.length > 0 && (
                      <span className="text-xs text-muted-fg">
                        {teachers.length === 1 ? "Lehrer:" : "Lehrer:"}{" "}
                        <span className="text-fg">{teachers.join(", ")}</span>
                      </span>
                    )}
                    {subjectNames.length > 0 && (
                      <span className="text-xs text-muted-fg">
                        {subjectNames.length} {subjectNames.length === 1 ? "Fach" : "Fächer"}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/sekretariat/schueler?class=${encodeURIComponent(cls.name)}`}
                      className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
                    >
                      Schüler
                    </Link>
                    <Link
                      href={`/sekretariat/zeugnisse?class=${encodeURIComponent(cls.name)}`}
                      className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
                    >
                      Zeugnisse
                    </Link>
                  </div>
                </div>

                {cls._count.students === 0 ? (
                  <p className="px-5 py-4 text-sm text-muted-fg">Noch keine Schüler zugewiesen.</p>
                ) : (
                  <div className="px-5 py-3">
                    {subjectNames.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {cls.teacherSubjectClasses.map((tsc) => (
                          <span
                            key={tsc.id}
                            className="inline-flex items-center gap-1 border border-border px-2 py-0.5 text-xs"
                          >
                            <span
                              className="size-2 rounded-full shrink-0"
                              style={{ backgroundColor: tsc.subject.color }}
                            />
                            {tsc.subject.name}
                            <span className="text-muted-fg">· {tsc.teacher.name}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
