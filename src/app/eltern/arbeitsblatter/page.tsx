import { Clock, FileText } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db/client";
import { ROLE_HOME, effectiveRole, getSession } from "@/lib/session";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Arbeitsblätter · Eltern" };

function formatDue(dueAt: Date | null): { label: string; overdue: boolean } {
  if (!dueAt) return { label: "Kein Abgabedatum", overdue: false };
  const overdue = dueAt < new Date();
  return {
    label: dueAt.toLocaleDateString("de-DE", { day: "numeric", month: "short", year: "numeric" }),
    overdue,
  };
}

export default async function ElternArbeitsblatterPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const effective = effectiveRole(session);
  if (effective !== "parent") redirect(ROLE_HOME[effective]);

  const links = await prisma.parentStudentLink.findMany({
    where: { parentId: session.userId },
    include: { student: { select: { id: true, name: true, classId: true } } },
  });

  if (links.length === 0) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Elternbereich</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Arbeitsblätter</h1>
        </header>
        <p className="text-muted-fg">Kein Kind verknüpft. Bitte wende dich an die Schulverwaltung.</p>
      </div>
    );
  }

  // Load worksheet assignments for all linked children
  const childData = await Promise.all(
    links.map(async ({ student }) => {
      if (!student.classId) return { student, assignments: [] };
      const assignments = await prisma.worksheetAssignment.findMany({
        where: { classId: student.classId },
        include: {
          worksheet: { include: { subject: { select: { name: true, color: true } } } },
          submissions: { where: { studentId: student.id }, take: 1, orderBy: { startedAt: "desc" } },
        },
        orderBy: { dueAt: "asc" },
      });
      return { student, assignments };
    })
  );

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Elternbereich</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Arbeitsblätter</h1>
        <p className="mt-1 text-sm text-muted-fg">Alle zugewiesenen Arbeitsblätter Ihrer Kinder im Überblick.</p>
      </header>

      {childData.map(({ student, assignments }) => {
        const done = assignments.filter(
          (a) => a.submissions[0]?.status === "submitted" || a.submissions[0]?.status === "graded"
        ).length;
        const open = assignments.length - done;

        return (
          <Card key={student.id}>
            <CardHeader>
              <div>
                <CardTitle>{student.name}</CardTitle>
                <p className="mt-0.5 text-sm text-muted-fg">
                  {open} offen · {done} abgegeben · {assignments.length} gesamt
                </p>
              </div>
              <FileText className="size-4 text-muted-fg" strokeWidth={1.75} />
            </CardHeader>

            {assignments.length === 0 ? (
              <CardBody>
                <p className="text-sm text-muted-fg">Noch keine Arbeitsblätter zugewiesen.</p>
              </CardBody>
            ) : (
              <CardBody className="px-0! pb-0!">
                <ul className="divide-y divide-border border-t border-border">
                  {assignments.map((a) => {
                    const sub = a.submissions[0];
                    const isDone = sub?.status === "submitted" || sub?.status === "graded";
                    const isStarted = sub?.status === "in_progress";
                    const { label: dueLabel, overdue } = formatDue(a.dueAt);

                    return (
                      <li key={a.id} className="flex items-start gap-4 px-5 py-3.5">
                        {/* Status dot */}
                        <div
                          className={cn(
                            "mt-1 size-2.5 shrink-0 rounded-full",
                            isDone ? "bg-success" : overdue ? "bg-danger" : isStarted ? "bg-warning" : "bg-border-strong"
                          )}
                        />

                        {/* Info */}
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm">{a.worksheet.title}</p>
                          <div className="mt-0.5 flex flex-wrap items-center gap-2">
                            {a.worksheet.subject && (
                              <span
                                className="rounded px-1.5 py-0.5 text-[10px] font-bold text-white"
                                style={{ backgroundColor: a.worksheet.subject.color }}
                              >
                                {a.worksheet.subject.name}
                              </span>
                            )}
                            {a.worksheet.difficulty && (
                              <Badge
                                variant={
                                  a.worksheet.difficulty === "leicht" ? "success" :
                                  a.worksheet.difficulty === "schwer" ? "danger" : "warning"
                                }
                              >
                                {a.worksheet.difficulty === "leicht" ? "Leicht" :
                                 a.worksheet.difficulty === "schwer" ? "Schwer" : "Mittel"}
                              </Badge>
                            )}
                          </div>
                          <p className={cn("mt-1 flex items-center gap-1 text-xs", overdue && !isDone ? "text-danger" : "text-muted-fg")}>
                            <Clock className="size-3" />
                            {dueLabel}
                          </p>
                        </div>

                        {/* Status badge */}
                        <Badge
                          variant={isDone ? "success" : overdue ? "danger" : isStarted ? "warning" : "outline"}
                          className="shrink-0"
                        >
                          {isDone ? "Abgegeben" : overdue ? "Überfällig" : isStarted ? "In Bearbeitung" : "Offen"}
                        </Badge>
                      </li>
                    );
                  })}
                </ul>
              </CardBody>
            )}
          </Card>
        );
      })}
    </div>
  );
}
