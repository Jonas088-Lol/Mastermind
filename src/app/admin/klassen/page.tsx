/* Copyright 2026 Elian Schock, Jonas Schwenk */
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BookOpen, Plus, Users } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db/client";
import { ROLE_HOME, effectiveRole, getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Klassen · Admin" };

export default async function AdminKlassenPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "admin") redirect(ROLE_HOME[effectiveRole(session)]);

  const schoolId = session.schoolId ?? "";

  const classes = await prisma.schoolClass.findMany({
    where: { schoolId },
    include: {
      _count: { select: { students: true } },
      teacherSubjectClasses: {
        include: {
          teacher: { select: { id: true, name: true } },
          subject: { select: { name: true, color: true, shortName: true } },
        },
      },
    },
    orderBy: [{ grade: "asc" }, { name: "asc" }],
  });

  const totalStudents = classes.reduce((s, c) => s + c._count.students, 0);
  const avgClassSize = classes.length > 0 ? Math.round(totalStudents / classes.length) : 0;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8">
      {/* ── Header ──────────────────────────────────────── */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Schul-Admin</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Klassen</h1>
          <p className="mt-1 text-sm text-muted-fg">
            {classes.length} {classes.length === 1 ? "Klasse" : "Klassen"} ·{" "}
            {totalStudents} Schüler · Ø {avgClassSize} pro Klasse
          </p>
        </div>
        <Link href="/admin/klassen/neu" className={buttonVariants({ size: "sm" })}>
          <Plus className="size-3.5" />
          Neue Klasse
        </Link>
      </header>

      {/* ── Summary stats ───────────────────────────────── */}
      {classes.length > 0 && (
        <div className="grid grid-cols-3 gap-px border border-border bg-border sm:grid-cols-3">
          <div className="flex flex-col gap-1 bg-bg px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-fg">Klassen</p>
            <p className="text-2xl font-bold tabular-nums">{classes.length}</p>
          </div>
          <div className="flex flex-col gap-1 bg-bg px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-fg">Schüler gesamt</p>
            <p className="text-2xl font-bold tabular-nums">{totalStudents}</p>
          </div>
          <div className="flex flex-col gap-1 bg-bg px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-fg">Ø Klassengröße</p>
            <p className="text-2xl font-bold tabular-nums">{avgClassSize}</p>
          </div>
        </div>
      )}

      {/* ── Class grid ──────────────────────────────────── */}
      {classes.length === 0 ? (
        <div className="grid place-items-center border border-dashed border-border py-16 text-center">
          <Users className="size-8 text-muted-fg" strokeWidth={1.5} />
          <p className="mt-4 font-semibold">Noch keine Klassen</p>
          <p className="mt-1 text-sm text-muted-fg">
            Importiere einen Untis-Stundenplan oder lege Klassen manuell an.
          </p>
          <Link href="/admin/klassen/neu" className={buttonVariants({ size: "sm" }) + " mt-6"}>
            <Plus className="size-3.5" />
            Erste Klasse erstellen
          </Link>
        </div>
      ) : (
        <div className="grid gap-px border border-border bg-border md:grid-cols-2 xl:grid-cols-3">
          {classes.map((c) => {
            const uniqueTeachers = [
              ...new Map(
                c.teacherSubjectClasses.map((t) => [t.teacher.id, t.teacher.name])
              ).values(),
            ];
            const subjects = [
              ...new Map(
                c.teacherSubjectClasses.map((t) => [
                  t.subject.shortName,
                  { name: t.subject.name, color: t.subject.color, shortName: t.subject.shortName },
                ])
              ).values(),
            ];

            return (
              <div key={c.id} className="flex flex-col gap-4 bg-bg p-6">
                {/* ── Class header ─────────────────────────── */}
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-mono text-2xl font-bold">{c.name}</p>
                    <p className="text-sm text-muted-fg">Jahrgang {c.grade ?? "—"}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="flex items-center gap-1 font-mono text-sm text-muted-fg">
                      <Users className="size-3.5" />
                      {c._count.students}
                    </span>
                  </div>
                </div>

                {/* ── Stats row ────────────────────────────── */}
                <div className="grid grid-cols-3 gap-2 border border-border bg-surface px-3 py-2.5">
                  <div className="text-center">
                    <p className="tabular-nums text-sm font-bold">{c._count.students}</p>
                    <p className="text-[10px] text-muted-fg uppercase tracking-wider">Schüler</p>
                  </div>
                  <div className="text-center">
                    <p className="tabular-nums text-sm font-bold">{uniqueTeachers.length}</p>
                    <p className="text-[10px] text-muted-fg uppercase tracking-wider">Lehrer</p>
                  </div>
                  <div className="text-center">
                    <p className="tabular-nums text-sm font-bold">{subjects.length}</p>
                    <p className="text-[10px] text-muted-fg uppercase tracking-wider">Fächer</p>
                  </div>
                </div>

                {/* ── Subjects ─────────────────────────────── */}
                {subjects.length > 0 && (
                  <div>
                    <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-fg">
                      Fächer
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {subjects.slice(0, 8).map((s) => (
                        <span
                          key={s.shortName}
                          className="inline-flex h-5 items-center px-1.5 font-mono text-[10px] font-bold"
                          style={{ backgroundColor: s.color + "22", color: s.color }}
                          title={s.name}
                        >
                          {s.shortName}
                        </span>
                      ))}
                      {subjects.length > 8 && (
                        <span className="inline-flex h-5 items-center px-1.5 text-[10px] text-muted-fg">
                          +{subjects.length - 8}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* ── Teachers ─────────────────────────────── */}
                <div>
                  <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-fg">
                    Lehrkräfte
                  </p>
                  <p className="text-sm">
                    {uniqueTeachers.length > 0 ? uniqueTeachers.join(", ") : "—"}
                  </p>
                </div>

                {/* ── Actions ──────────────────────────────── */}
                <div className="mt-auto flex gap-2">
                  <Link
                    href={`/admin/klassen/${c.id}`}
                    className={buttonVariants({ size: "sm", variant: "outline" }) + " flex-1"}
                  >
                    Bearbeiten
                  </Link>
                  <Link
                    href={`/admin/nutzer?classId=${c.id}`}
                    className={buttonVariants({ size: "sm", variant: "ghost" })}
                    title="Schüler verwalten"
                  >
                    <Users className="size-3.5" />
                    Schüler
                  </Link>
                  <Link
                    href={`/admin/klassen/${c.id}`}
                    className={buttonVariants({ size: "sm", variant: "ghost" })}
                    title="Fächer & Lehrer"
                  >
                    <BookOpen className="size-3.5" />
                    Fächer
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
