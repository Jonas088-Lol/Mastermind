import type { Metadata } from "next";
import Link from "next/link";
import { TrendingUp } from "lucide-react";
import { redirect } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db/client";
import { ROLE_HOME, effectiveRole, getSession } from "@/lib/session";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Noten · Eltern" };

const TYPE_LABEL: Record<string, string> = {
  klausur:     "Klausur",
  test:        "Test",
  muendlich:   "Mündlich",
  hausaufgabe: "Hausaufgabe",
  projekt:     "Projekt",
};

function gradeColor(v: number) {
  if (v >= 4.5) return "text-danger";
  if (v >= 3.5) return "text-warning";
  return "";
}

export default async function ElternNotenPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "parent") redirect(ROLE_HOME[effectiveRole(session)]);

  const links = await prisma.parentStudentLink.findMany({
    where: { parentId: session.userId },
    include: {
      student: {
        select: {
          id: true,
          name: true,
          schoolClass: { select: { name: true } },
          studentGrades: {
            include: {
              subject: { select: { id: true, name: true, color: true } },
            },
            orderBy: { date: "desc" },
          },
        },
      },
    },
    orderBy: { student: { name: "asc" } },
  });

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-10">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Schule</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Noten</h1>
        </div>
        <Link
          href="/eltern/noten/verlauf"
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          <TrendingUp className="size-3.5" />
          Notenverlauf
        </Link>
      </header>

      {links.length === 0 && (
        <p className="text-sm text-muted-fg">Kein Kind mit deinem Konto verknüpft.</p>
      )}

      {links.map(({ student }) => {
        const grades = student.studentGrades;

        // Group by subject
        type SubjectGroup = {
          id: string;
          name: string;
          color: string;
          grades: typeof grades;
          avg: number;
        };
        const subjectMap = new Map<string, SubjectGroup>();
        for (const g of grades) {
          if (!subjectMap.has(g.subjectId)) {
            subjectMap.set(g.subjectId, {
              id: g.subjectId,
              name: g.subject.name,
              color: g.subject.color,
              grades: [],
              avg: 0,
            });
          }
          subjectMap.get(g.subjectId)!.grades.push(g);
        }
        for (const sg of subjectMap.values()) {
          const totalWeight = sg.grades.reduce((s, g) => s + g.weight, 0);
          sg.avg = totalWeight > 0
            ? sg.grades.reduce((s, g) => s + g.value * g.weight, 0) / totalWeight
            : 0;
        }
        const subjects = Array.from(subjectMap.values()).sort((a, b) =>
          a.name.localeCompare(b.name)
        );

        const totalWeight = grades.reduce((s, g) => s + g.weight, 0);
        const overallAvg = totalWeight > 0
          ? grades.reduce((s, g) => s + g.value * g.weight, 0) / totalWeight
          : null;

        return (
          <section key={student.id} className="flex flex-col gap-6">
            {links.length > 1 && (
              <div className="flex items-baseline gap-3">
                <h2 className="text-xl font-bold">{student.name}</h2>
                {student.schoolClass && (
                  <span className="text-sm text-muted-fg">Klasse {student.schoolClass.name}</span>
                )}
              </div>
            )}

            {/* Summary stats */}
            <div className="grid grid-cols-3 gap-px border border-border bg-border">
              <div className="bg-bg p-5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">Ø gesamt</p>
                <p className={cn("mt-2 font-mono text-3xl font-bold tabular-nums", overallAvg ? gradeColor(overallAvg) : "")}>
                  {overallAvg ? overallAvg.toFixed(1).replace(".", ",") : "—"}
                </p>
              </div>
              <div className="bg-bg p-5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">Einträge</p>
                <p className="mt-2 font-mono text-3xl font-bold">{grades.length}</p>
              </div>
              <div className="bg-bg p-5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">Fächer</p>
                <p className="mt-2 font-mono text-3xl font-bold">{subjects.length}</p>
              </div>
            </div>

            {/* Per subject */}
            {subjects.length === 0 ? (
              <p className="text-sm text-muted-fg">Noch keine Noten eingetragen.</p>
            ) : (
              subjects.map((sg) => (
                <Card key={sg.id}>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: sg.color }} />
                      <CardTitle>{sg.name}</CardTitle>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-fg">{sg.grades.length} Noten</span>
                      <p className={cn("font-mono text-lg font-bold tabular-nums", gradeColor(sg.avg))}>
                        Ø {sg.avg.toFixed(1).replace(".", ",")}
                      </p>
                    </div>
                  </CardHeader>
                  <CardBody className="px-0! pb-0!">
                    <ul className="divide-y divide-border border-t border-border">
                      {sg.grades.map((g) => (
                        <li key={g.id} className="flex items-center gap-4 px-5 py-3 text-sm">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium">{TYPE_LABEL[g.type] ?? g.type}</p>
                            <p className="text-xs text-muted-fg">
                              {g.date.toLocaleDateString("de-DE", { day: "numeric", month: "short", year: "numeric" })}
                              {g.comment && ` · ${g.comment}`}
                            </p>
                          </div>
                          <p className={cn("font-mono text-base font-bold tabular-nums", gradeColor(g.value))}>
                            {g.value.toFixed(1).replace(".", ",")}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </CardBody>
                </Card>
              ))
            )}
          </section>
        );
      })}
    </div>
  );
}
