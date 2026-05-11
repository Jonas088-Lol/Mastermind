import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Plus, Users } from "lucide-react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { prisma } from "@/lib/db/client";
import { ROLE_HOME, effectiveRole, getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Klassen · Admin" };

export default async function AdminKlassenPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "admin") redirect(ROLE_HOME[effectiveRole(session)]);

  const classes = await prisma.schoolClass.findMany({
    where: session.schoolId ? { schoolId: session.schoolId } : {},
    include: {
      students: { select: { id: true } },
      teacherSubjectClasses: {
        include: { teacher: { select: { name: true } }, subject: { select: { name: true } } },
      },
    },
    orderBy: { name: "asc" },
  });

  const totalStudents = classes.reduce((s, c) => s + c.students.length, 0);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Schul-Admin</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Klassen</h1>
          <p className="mt-1 text-sm text-muted-fg">{classes.length} Klassen · {totalStudents} Schüler</p>
        </div>
        <Link href="/admin/klassen/neu" className={buttonVariants({ size: "sm" })}>
          <Plus className="size-3.5" />
          Neue Klasse
        </Link>
      </header>

      {classes.length === 0 ? (
        <div className="grid place-items-center border border-dashed border-border py-16 text-center">
          <Users className="size-8 text-muted-fg" strokeWidth={1.5} />
          <p className="mt-4 font-semibold">Noch keine Klassen</p>
          <p className="mt-1 text-sm text-muted-fg">Importiere einen Untis-Stundenplan oder lege Klassen manuell an.</p>
        </div>
      ) : (
        <div className="grid gap-px border border-border bg-border md:grid-cols-2 xl:grid-cols-3">
          {classes.map((c) => {
            const teachers = [...new Set(c.teacherSubjectClasses.map((t) => t.teacher.name))];
            return (
              <div key={c.id} className="flex flex-col gap-4 bg-bg p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-mono text-2xl font-bold">{c.name}</p>
                    <p className="text-sm text-muted-fg">Jahrgang {c.grade ?? "—"}</p>
                  </div>
                  <span className="font-mono text-sm text-muted-fg">{c.students.length} Schüler</span>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-fg">Lehrer</p>
                  <p className="mt-1 text-sm">{teachers.length > 0 ? teachers.join(", ") : "—"}</p>
                </div>
                <div className="mt-auto flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1">Bearbeiten</Button>
                  <Button size="sm" variant="ghost">Schüler</Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
