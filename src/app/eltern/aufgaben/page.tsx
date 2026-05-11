import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db/client";
import { ROLE_HOME, effectiveRole, getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Aufgaben · Eltern" };

const now = new Date("2026-05-05");

export default async function ElternAufgabenPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "parent") redirect(ROLE_HOME[effectiveRole(session)]);

  const links = await prisma.parentStudentLink.findMany({
    where: { parentId: session.userId },
    include: {
      student: {
        include: {
          schoolClass: {
            include: {
              assignments: {
                include: {
                  subject: { select: { name: true, shortName: true, color: true } },
                  teacher: { select: { name: true } },
                  submissions: { where: { studentId: { not: "" } }, select: { studentId: true, status: true } },
                },
                orderBy: { dueAt: "asc" },
              },
            },
          },
        },
      },
    },
  });

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Schuljahr 2025/26</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Aufgaben</h1>
      </header>

      {links.map(({ student }) => {
        const assignments = student.schoolClass?.assignments ?? [];
        return (
          <div key={student.id}>
            {links.length > 1 && <h2 className="mb-4 text-lg font-bold">{student.name}</h2>}
            <Card>
              <CardHeader>
                <CardTitle>Aktuelle Aufgaben</CardTitle>
                <span className="font-mono text-xs text-muted-fg">{assignments.length} Aufgaben</span>
              </CardHeader>
              <CardBody className="!px-0 !pb-0">
                {assignments.length === 0 ? (
                  <div className="border-t border-border px-5 py-8 text-sm text-muted-fg">Keine Aufgaben.</div>
                ) : (
                  <ul className="divide-y divide-border border-t border-border">
                    {assignments.map((a) => {
                      const studentSub = a.submissions.find((s) => s.studentId === student.id);
                      const daysLeft = Math.floor((a.dueAt.getTime() - now.getTime()) / 86_400_000);
                      const isPast = daysLeft < 0;
                      return (
                        <li key={a.id} className="flex items-center gap-4 px-5 py-3.5">
                          <span
                            className="inline-flex shrink-0 items-center px-1.5 py-0.5 text-[11px] font-semibold"
                            style={{ backgroundColor: a.subject.color + "22", color: a.subject.color }}
                          >
                            {a.subject.shortName}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold">{a.title}</p>
                            <p className="flex items-center gap-1 text-xs text-muted-fg">
                              <Clock className="size-3" />
                              {a.dueAt.toLocaleDateString("de-DE", { day: "numeric", month: "short" })}
                              {" · "}{a.teacher.name}
                            </p>
                          </div>
                          {studentSub ? (
                            <Badge variant={studentSub.status === "graded" ? "success" : "brand"}>
                              {studentSub.status === "graded" ? "Bewertet" : "Abgegeben"}
                            </Badge>
                          ) : (
                            <Badge variant={isPast ? "danger" : daysLeft <= 2 ? "warning" : "outline"}>
                              {isPast ? "Überfällig" : daysLeft === 0 ? "Heute" : `${daysLeft}d`}
                            </Badge>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardBody>
            </Card>
          </div>
        );
      })}
    </div>
  );
}
