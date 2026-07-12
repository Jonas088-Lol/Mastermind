/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { ArrowRight, BookOpen, Plus, Tag } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Fächer · Admin" };

export default async function AdminFaecherPage() {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "admin") redirect("/admin");

  const schoolId = session.schoolId ?? "";

  const subjects = await prisma.subject.findMany({
    where: { schoolId },
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: {
          assignments: true,
          timetableEntries: true,
          teacherSubjectClasses: true,
          grades: true,
        },
      },
      teacherSubjectClasses: {
        select: {
          teacherId: true,
          classId: true,
        },
      },
    },
  });

  const totalAssignments = subjects.reduce((s, sub) => s + sub._count.assignments, 0);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      {/* ── Header ──────────────────────────────────────── */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Schul-Admin</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Fächer</h1>
          <p className="mt-1 text-sm text-muted-fg">
            {subjects.length} {subjects.length === 1 ? "Fach" : "Fächer"} · {totalAssignments} Aufgaben gesamt
          </p>
        </div>
        <Link href="/admin/faecher/neu" className={buttonVariants({ size: "sm" })}>
          <Plus className="size-3.5" />
          Neues Fach
        </Link>
      </header>

      {/* ── Summary stats ───────────────────────────────── */}
      {subjects.length > 0 && (
        <div className="grid grid-cols-3 gap-px border border-border bg-border">
          <div className="flex flex-col gap-1 bg-bg px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-fg">Fächer</p>
            <p className="text-2xl font-bold tabular-nums">{subjects.length}</p>
          </div>
          <div className="flex flex-col gap-1 bg-bg px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-fg">Aufgaben</p>
            <p className="text-2xl font-bold tabular-nums">{totalAssignments}</p>
          </div>
          <div className="flex flex-col gap-1 bg-bg px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-fg">Stundenplan-Einträge</p>
            <p className="text-2xl font-bold tabular-nums">
              {subjects.reduce((s, sub) => s + sub._count.timetableEntries, 0)}
            </p>
          </div>
        </div>
      )}

      {/* ── Subject list ────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Alle Fächer</CardTitle>
            <p className="mt-1 text-sm text-muted-fg">
              Fächer werden im Stundenplan, bei Aufgaben und Noten verwendet.
            </p>
          </div>
          <BookOpen className="size-4 text-muted-fg" strokeWidth={1.75} />
        </CardHeader>
        <CardBody className="px-0! pb-0!">
          {subjects.length === 0 ? (
            <div className="border-t border-border px-5 py-10 text-center text-sm text-muted-fg">
              Noch keine Fächer angelegt.{" "}
              <Link href="/admin/faecher/neu" className="font-semibold text-brand hover:underline">
                Erstes Fach erstellen
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-border border-t border-border">
              {subjects.map((s) => {
                const uniqueTeachers = new Set(s.teacherSubjectClasses.map((t) => t.teacherId)).size;
                const uniqueClasses = new Set(s.teacherSubjectClasses.map((t) => t.classId)).size;

                return (
                  <li
                    key={s.id}
                    className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-surface"
                  >
                    {/* Color dot + shortName badge */}
                    <div className="flex shrink-0 items-center gap-2">
                      <span
                        className="size-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: s.color }}
                        aria-hidden="true"
                      />
                      <div
                        className="grid h-8 min-w-[2rem] place-items-center px-1.5 font-mono text-xs font-bold text-white"
                        style={{ backgroundColor: s.color }}
                        title={s.name}
                      >
                        {s.shortName}
                      </div>
                    </div>

                    {/* Name + stats */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{s.name}</p>
                        <Badge variant="outline">{s.shortName}</Badge>
                        {s.category && s.category !== "allgemein" && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-surface px-1.5 py-0.5 text-[10px] font-medium text-muted-fg">
                            <Tag className="size-2.5" strokeWidth={1.75} />
                            {s.category}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-muted-fg">
                        {uniqueTeachers} {uniqueTeachers === 1 ? "Lehrer" : "Lehrer"} ·{" "}
                        {uniqueClasses} {uniqueClasses === 1 ? "Klasse" : "Klassen"} ·{" "}
                        {s._count.assignments} Aufgaben ·{" "}
                        {s._count.grades} Noten
                      </p>
                    </div>

                    {/* Quick action */}
                    <Link
                      href={`/admin/faecher/${s.id}`}
                      className="flex items-center gap-1 text-xs font-medium text-muted-fg hover:text-brand"
                    >
                      Bearbeiten
                      <ArrowRight className="size-3.5" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
