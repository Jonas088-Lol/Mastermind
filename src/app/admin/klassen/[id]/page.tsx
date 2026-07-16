/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { ArrowLeft, KeyRound, Plus, Trash2, UserMinus, UserPlus, X } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { prisma } from "@/lib/db/client";
import { ROLE_HOME, effectiveRole, getSession } from "@/lib/session";
import {
  assignStudent,
  assignTeacherToClass,
  deleteClass,
  removeStudent,
  unassignTeacherFromClass,
  updateClass,
} from "./actions";

export const metadata: Metadata = { title: "Klasse bearbeiten · Admin" };

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminKlasseDetailPage({ params }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "admin") redirect(ROLE_HOME[effectiveRole(session)]);

  const { id } = await params;

  const klass = await prisma.schoolClass.findUnique({
    where: { id },
    include: {
      students: {
        select: { id: true, name: true, email: true },
        orderBy: { name: "asc" },
      },
      teacherSubjectClasses: {
        include: {
          teacher: { select: { name: true, email: true } },
          subject: { select: { name: true, shortName: true, color: true } },
        },
        orderBy: { subject: { name: "asc" } },
      },
    },
  });

  if (!klass || klass.schoolId !== session.schoolId) notFound();

  // Für die Lehrer-Zuordnung: alle Lehrkräfte + Fächer der Schule.
  const [schoolTeachers, schoolSubjects] = await Promise.all([
    prisma.user.findMany({
      where: { schoolId: session.schoolId, role: "teacher" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.subject.findMany({
      where: { schoolId: session.schoolId },
      select: { id: true, name: true, shortName: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const unassignedStudents = await prisma.user.findMany({
    where: { schoolId: session.schoolId, role: "student", classId: null },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const saveAction = updateClass.bind(null, id);
  const removeAction = deleteClass.bind(null, id);
  const addStudentAction = assignStudent.bind(null, id);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <header className="flex items-center gap-3">
        <Link href="/admin/klassen" className="text-muted-fg hover:text-fg">
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Klassen</p>
          <h1 className="mt-1 font-mono text-3xl font-bold tracking-tight sm:text-4xl">{klass.name}</h1>
          <p className="mt-0.5 text-sm text-muted-fg">Jahrgang {klass.grade} · {klass.students.length} Schüler</p>
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-8">
          {/* ── Edit form ─────────────────────────────────── */}
          <Card>
            <CardHeader>
              <CardTitle>Klasse bearbeiten</CardTitle>
            </CardHeader>
            <CardBody>
              <form action={saveAction} className="flex flex-col gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="name">Bezeichnung</Label>
                    <Input id="name" name="name" defaultValue={klass.name} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="grade">Jahrgang</Label>
                    <select
                      id="grade"
                      name="grade"
                      defaultValue={klass.grade}
                      className="h-10 w-full border border-border bg-bg px-3 text-sm focus:border-brand focus:outline-none"
                    >
                      {Array.from({ length: 13 }, (_, i) => i + 1).map((g) => (
                        <option key={g} value={g}>Klasse {g}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="bg-fg px-4 py-2 text-sm font-semibold text-bg transition-opacity hover:opacity-90"
                  >
                    Speichern
                  </button>
                </div>
              </form>
            </CardBody>
          </Card>

          {/* ── Students ─────────────────────────────────── */}
          <Card id="schueler">
            <CardHeader>
              <CardTitle>Schüler · {klass.students.length}</CardTitle>
              {unassignedStudents.length > 0 && (
                <form action={addStudentAction} className="flex items-center gap-2">
                  <select
                    name="userId"
                    required
                    className="h-8 border border-border bg-bg px-2 text-xs focus:border-brand focus:outline-none"
                  >
                    <option value="">Schüler zuweisen…</option>
                    {unassignedStudents.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    className="inline-flex h-8 items-center gap-1 bg-fg px-3 text-xs font-semibold text-bg transition-opacity hover:opacity-90"
                  >
                    <UserPlus className="size-3" />
                    Hinzufügen
                  </button>
                </form>
              )}
            </CardHeader>
            <CardBody className="px-0! pb-0!">
              {klass.students.length === 0 ? (
                <p className="border-t border-border px-5 py-6 text-sm text-muted-fg">
                  Noch keine Schüler zugewiesen.
                </p>
              ) : (
                <ul className="divide-y divide-border border-t border-border">
                  {klass.students.map((s) => {
                    const removeAction = removeStudent.bind(null, id, s.id);
                    return (
                      <li key={s.id} className="flex items-center gap-3 px-5 py-3">
                        <Avatar name={s.name} size="sm" className="shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{s.name}</p>
                          <p className="truncate text-xs text-muted-fg">{s.email}</p>
                        </div>
                        <form action={removeAction}>
                          <button
                            type="submit"
                            aria-label={`${s.name} entfernen`}
                            className="grid size-7 place-items-center text-muted-fg transition-colors hover:bg-danger/10 hover:text-danger"
                          >
                            <UserMinus className="size-3.5" />
                          </button>
                        </form>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>

        {/* ── Sidebar ───────────────────────────────────── */}
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Lehrer & Fächer</CardTitle>
            </CardHeader>
            <CardBody className="px-0! pb-0!">
              {klass.teacherSubjectClasses.length === 0 ? (
                <p className="border-t border-border px-5 py-4 text-sm text-muted-fg">Noch nicht zugewiesen.</p>
              ) : (
                <ul className="divide-y divide-border border-t border-border">
                  {klass.teacherSubjectClasses.map((ts) => (
                    <li key={ts.id} className="flex items-center gap-3 px-4 py-3">
                      <span
                        className="inline-flex h-5 items-center px-1.5 font-mono text-[10px] font-bold"
                        style={{ backgroundColor: ts.subject.color + "22", color: ts.subject.color }}
                      >
                        {ts.subject.shortName}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold">{ts.subject.name}</p>
                        <p className="truncate text-xs text-muted-fg">{ts.teacher.name}</p>
                      </div>
                      <form action={unassignTeacherFromClass}>
                        <input type="hidden" name="id" value={ts.id} />
                        <button
                          type="submit"
                          title="Zuordnung entfernen"
                          className="rounded-lg p-1.5 text-muted-fg transition-colors hover:bg-danger/10 hover:text-danger"
                        >
                          <X className="size-4" />
                        </button>
                      </form>
                    </li>
                  ))}
                </ul>
              )}

              {/* Lehrkraft einer Klasse zuordnen */}
              <form
                action={assignTeacherToClass}
                className="flex flex-col gap-2 border-t border-border px-4 py-4"
              >
                <input type="hidden" name="classId" value={klass.id} />
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-fg">
                  Lehrkraft zuordnen
                </p>
                {schoolTeachers.length === 0 || schoolSubjects.length === 0 ? (
                  <p className="text-xs text-muted-fg">
                    {schoolTeachers.length === 0
                      ? "Noch keine Lehrkräfte an der Schule."
                      : "Noch keine Fächer angelegt."}
                  </p>
                ) : (
                  <>
                    <select
                      name="teacherId"
                      required
                      className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fg focus:border-brand focus:outline-none"
                    >
                      <option value="">Lehrkraft wählen…</option>
                      {schoolTeachers.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                    <select
                      name="subjectId"
                      required
                      className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fg focus:border-brand focus:outline-none"
                    >
                      <option value="">Fach wählen…</option>
                      {schoolSubjects.map((s) => (
                        <option key={s.id} value={s.id}>{s.name} ({s.shortName})</option>
                      ))}
                    </select>
                    <Button type="submit" size="sm" className="w-full">
                      <Plus className="size-3.5" />
                      Zuordnen
                    </Button>
                  </>
                )}
              </form>
            </CardBody>
          </Card>

          <Link
            href={`/admin/klassen/${klass.id}/codes`}
            className="flex items-center gap-3 rounded-2xl border border-border bg-bg p-4 transition-colors hover:bg-surface"
          >
            <KeyRound className="size-5 shrink-0 text-brand" />
            <div className="flex-1">
              <p className="text-sm font-semibold">Beitrittscodes</p>
              <p className="text-xs text-muted-fg">Schüler per Code aufnehmen</p>
            </div>
            <span className="text-xs text-muted-fg">→</span>
          </Link>

          <Card>
            <CardHeader>
              <CardTitle className="text-danger">Gefahrenzone</CardTitle>
            </CardHeader>
            <CardBody>
              <p className="mb-3 text-xs text-muted-fg">
                Klasse löschen entfernt alle Zuweisungen. Schüler bleiben erhalten.
              </p>
              <form action={removeAction}>
                <button
                  type="submit"
                  className="inline-flex h-9 w-full items-center justify-center gap-2 border border-danger text-xs font-semibold text-danger transition-colors hover:bg-danger hover:text-bg"
                >
                  <Trash2 className="size-3.5" />
                  Klasse löschen
                </button>
              </form>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
