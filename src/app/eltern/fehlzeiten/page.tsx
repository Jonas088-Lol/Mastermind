import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db/client";
import { ROLE_HOME, effectiveRole, getSession } from "@/lib/session";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Fehlzeiten · Eltern" };

const STATUS_LABEL: Record<string, { label: string; icon: typeof Clock; cls: string }> = {
  pending:   { label: "Ausstehend",  icon: Clock,         cls: "text-warning" },
  confirmed: { label: "Bestätigt",   icon: CheckCircle2,  cls: "text-success" },
  rejected:  { label: "Abgelehnt",   icon: XCircle,       cls: "text-danger"  },
};

export default async function ElternFehlzeitenPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "parent") redirect(ROLE_HOME[effectiveRole(session)]);

  const links = await prisma.parentStudentLink.findMany({
    where: { parentId: session.userId },
    include: { student: { select: { id: true, name: true, schoolClass: { select: { name: true } } } } },
    orderBy: { student: { name: "asc" } },
  });

  const studentIds = links.map((l) => l.student.id);

  const absences = await prisma.absence.findMany({
    where: { studentId: { in: studentIds } },
    include: {
      student: { select: { id: true, name: true } },
      reporter: { select: { name: true, role: true } },
    },
    orderBy: { fromDate: "desc" },
  });

  const byStudent = new Map<string, typeof absences>();
  for (const a of absences) {
    if (!byStudent.has(a.studentId)) byStudent.set(a.studentId, []);
    byStudent.get(a.studentId)!.push(a);
  }

  const REPORTER_LABEL: Record<string, string> = {
    parent: "Elternteil",
    student: "Schüler",
    teacher: "Lehrkraft",
    admin: "Schulleitung",
    secretary: "Sekretariat",
  };

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Schule</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Fehlzeiten</h1>
        <p className="mt-1 text-sm text-muted-fg">Alle erfassten Abwesenheiten deiner Kinder.</p>
      </header>

      {links.length === 0 ? (
        <p className="text-sm text-muted-fg">Kein Kind mit deinem Konto verknüpft.</p>
      ) : (
        links.map(({ student }) => {
          const list = byStudent.get(student.id) ?? [];
          return (
            <Card key={student.id}>
              <CardHeader>
                <div>
                  <CardTitle>{student.name}</CardTitle>
                  {student.schoolClass && (
                    <p className="mt-0.5 text-sm text-muted-fg">Klasse {student.schoolClass.name}</p>
                  )}
                </div>
                <span className="font-mono text-xs text-muted-fg">{list.length} Einträge</span>
              </CardHeader>
              <CardBody className="!px-0 !pb-0">
                {list.length === 0 ? (
                  <p className="px-5 py-6 text-sm text-muted-fg">Keine Fehlzeiten eingetragen.</p>
                ) : (
                  <ul className="divide-y divide-border border-t border-border">
                    {list.map((a) => {
                      const s = STATUS_LABEL[a.status] ?? STATUS_LABEL.pending;
                      const Icon = s.icon;
                      const reporterLabel = REPORTER_LABEL[a.reporter.role] ?? a.reporter.role;
                      return (
                        <li key={a.id} className="flex items-start gap-4 px-5 py-3.5 text-sm">
                          <Icon className={cn("mt-0.5 size-4 shrink-0", s.cls)} strokeWidth={1.75} />
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold">
                              {a.fromDate.toLocaleDateString("de-DE", { day: "numeric", month: "short", year: "numeric" })}
                              {a.fromDate.toISOString().slice(0, 10) !== a.toDate.toISOString().slice(0, 10) && (
                                <>
                                  {" – "}
                                  {a.toDate.toLocaleDateString("de-DE", { day: "numeric", month: "short", year: "numeric" })}
                                </>
                              )}
                            </p>
                            <p className="mt-0.5 text-xs text-muted-fg">
                              {a.reason ? `${a.reason} · ` : ""}
                              Gemeldet von {reporterLabel}
                            </p>
                          </div>
                          <span className={cn("shrink-0 text-xs font-medium", s.cls)}>{s.label}</span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardBody>
            </Card>
          );
        })
      )}
    </div>
  );
}
