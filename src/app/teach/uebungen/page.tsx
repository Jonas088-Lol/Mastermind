/* Copyright 2026 Elian Schock, Jonas Schwenk */
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BookOpen, Trash2 } from "lucide-react";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { createTeacherExercise, deleteTeacherExercise } from "./actions";

export const metadata: Metadata = { title: "Übungen · Lehrer" };

export default async function TeachUebungenPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "teacher") redirect("/");

  // Beide Abfragen sind unabhängig — parallel laden.
  const [tscEntries, exercises] = await Promise.all([
    prisma.teacherSubjectClass.findMany({
      where: { teacherId: session.userId },
      include: {
        class: { select: { id: true, name: true } },
        subject: { select: { name: true } },
      },
    }),
    prisma.teacherExercise.findMany({
      where: { teacherId: session.userId },
      include: {
        class: { select: { name: true, _count: { select: { students: true } } } },
        _count: { select: { completions: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // Unique classes + unique subject names for the form selects
  const classMap = new Map<string, string>();
  const subjectSet = new Set<string>();
  for (const t of tscEntries) {
    classMap.set(t.class.id, t.class.name);
    subjectSet.add(t.subject.name);
  }
  const classes = [...classMap.entries()].map(([id, name]) => ({ id, name }));
  const subjects = [...subjectSet].sort();

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Lehrer</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Übungen</h1>
        <p className="mt-1 text-sm text-muted-fg">
          Erstelle eigene Aufgaben für deine Klassen — Schüler sehen sie in ihrem Übungen-Bereich.
        </p>
      </header>

      {/* Create form */}
      <section className="rounded-2xl border border-border bg-bg p-5 sm:p-6">
        <h2 className="font-semibold">Neue Aufgabe erstellen</h2>
        {classes.length === 0 ? (
          <p className="mt-3 text-sm text-muted-fg">
            Du bist noch keiner Klasse zugeordnet — wende dich an deinen Schul-Admin.
          </p>
        ) : (
          <form action={createTeacherExercise} className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="classId" className="text-sm font-medium">Klasse</label>
              <select
                id="classId"
                name="classId"
                required
                className="h-10 rounded-lg border border-border bg-bg px-3 text-sm focus:border-brand focus:outline-none"
              >
                <option value="">Klasse wählen…</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="subject" className="text-sm font-medium">Fach</label>
              <select
                id="subject"
                name="subject"
                required
                className="h-10 rounded-lg border border-border bg-bg px-3 text-sm focus:border-brand focus:outline-none"
              >
                <option value="">Fach wählen…</option>
                {subjects.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="topic" className="text-sm font-medium">Thema</label>
              <input
                id="topic"
                name="topic"
                required
                placeholder="z. B. Bruchrechnung"
                className="h-10 rounded-lg border border-border bg-bg px-3 text-sm placeholder:text-muted-fg focus:border-brand focus:outline-none"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="title" className="text-sm font-medium">Titel</label>
              <input
                id="title"
                name="title"
                required
                placeholder="z. B. Übungsblatt Brüche kürzen"
                className="h-10 rounded-lg border border-border bg-bg px-3 text-sm placeholder:text-muted-fg focus:border-brand focus:outline-none"
              />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label htmlFor="description" className="text-sm font-medium">Aufgabenstellung (optional)</label>
              <textarea
                id="description"
                name="description"
                rows={4}
                placeholder="Beschreibe die Aufgabe…"
                className="rounded-lg border border-border bg-bg px-3 py-2 text-sm placeholder:text-muted-fg focus:border-brand focus:outline-none resize-y"
              />
            </div>
            <div className="sm:col-span-2">
              <button
                type="submit"
                className="rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-brand-fg transition-opacity hover:opacity-90"
              >
                Aufgabe erstellen
              </button>
            </div>
          </form>
        )}
      </section>

      {/* Existing exercises */}
      <section className="flex flex-col gap-3">
        <h2 className="font-semibold">Deine Aufgaben ({exercises.length})</h2>
        {exercises.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border p-12 text-center">
            <BookOpen className="size-10 text-muted-fg/40" />
            <p className="text-sm text-muted-fg">Noch keine Aufgaben erstellt</p>
          </div>
        ) : (
          exercises.map((ex) => (
            <div key={ex.id} className="flex items-start gap-4 rounded-2xl border border-border bg-bg p-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">{ex.title}</p>
                  <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-semibold text-brand">
                    {ex.subject}
                  </span>
                  <span className="rounded-full bg-muted/40 px-2 py-0.5 text-[10px] font-semibold text-muted-fg">
                    {ex.topic}
                  </span>
                </div>
                {ex.description && (
                  <p className="mt-1 text-sm text-muted-fg line-clamp-2">{ex.description}</p>
                )}
                <p className="mt-1.5 text-xs text-muted-fg">
                  Klasse {ex.class.name} · erstellt am {ex.createdAt.toLocaleDateString("de-DE")} ·{" "}
                  {ex._count.completions}/{ex.class._count.students} erledigt
                </p>
              </div>
              <form action={deleteTeacherExercise}>
                <input type="hidden" name="id" value={ex.id} />
                <button
                  type="submit"
                  title="Löschen"
                  className="rounded-lg p-2 text-muted-fg transition-colors hover:bg-danger hover:text-white"
                >
                  <Trash2 className="size-4" />
                </button>
              </form>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
