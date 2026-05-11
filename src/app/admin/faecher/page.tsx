import { ArrowRight, BookOpen, Plus } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Fächer · Admin" };

export default async function AdminFaecherPage() {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "admin") redirect("/admin");

  const subjects = await prisma.subject.findMany({
    where: { schoolId: session.schoolId ?? "" },
    orderBy: { name: "asc" },
    include: {
      _count: { select: { assignments: true, timetableEntries: true, teacherSubjectClasses: true } },
    },
  });

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      <header className="flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Schul-Admin</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Fächer</h1>
          <p className="mt-1 text-sm text-muted-fg">{subjects.length} Fächer an dieser Schule</p>
        </div>
        <Link href="/admin/faecher/neu" className={buttonVariants({ size: "sm" })}>
          <Plus className="size-3.5" />
          Neues Fach
        </Link>
      </header>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Alle Fächer</CardTitle>
            <p className="mt-1 text-sm text-muted-fg">Fächer werden im Stundenplan, bei Aufgaben und Noten verwendet.</p>
          </div>
          <BookOpen className="size-4 text-muted-fg" strokeWidth={1.75} />
        </CardHeader>
        <CardBody className="!px-0 !pb-0">
          {subjects.length === 0 ? (
            <div className="border-t border-border px-5 py-10 text-center text-sm text-muted-fg">
              Noch keine Fächer angelegt.{" "}
              <Link href="/admin/faecher/neu" className="font-semibold text-brand hover:underline">
                Erstes Fach erstellen
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-border border-t border-border">
              {subjects.map((s) => (
                <li key={s.id} className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-surface">
                  <div
                    className="grid size-10 shrink-0 place-items-center font-mono text-sm font-bold text-white"
                    style={{ backgroundColor: s.color }}
                  >
                    {s.shortName}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{s.name}</p>
                    <p className="text-xs text-muted-fg">
                      {s._count.assignments} Aufgaben · {s._count.timetableEntries} Stunden · {s._count.teacherSubjectClasses} Klassen
                    </p>
                  </div>
                  <Link
                    href={`/admin/faecher/${s.id}`}
                    className="flex items-center gap-1 text-xs font-medium text-muted-fg hover:text-brand"
                  >
                    Bearbeiten
                    <ArrowRight className="size-3.5" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
