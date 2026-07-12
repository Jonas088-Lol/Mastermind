/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { ArrowLeft, BookOpen, Save } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { createLesson } from "./actions";

export const metadata: Metadata = { title: "Neuer Stundeneintrag" };

const PERIODS = [
  "1.",
  "2.",
  "3.",
  "4.",
  "5.",
  "6.",
  "7.",
  "8.",
  "9.",
  "1.-2.",
  "3.-4.",
  "5.-6.",
  "7.-8.",
];

export default async function NeuePage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "teacher") redirect("/");

  // Load teacher's subject-class combinations
  const tscEntries = await prisma.teacherSubjectClass.findMany({
    where: { teacherId: session.userId },
    include: {
      subject: { select: { id: true, name: true, shortName: true } },
      class: { select: { id: true, name: true } },
    },
    orderBy: [{ class: { name: "asc" } }],
  });

  // Deduplicate classes
  const classMap = new Map<
    string,
    { id: string; name: string }
  >();
  for (const t of tscEntries) {
    if (!classMap.has(t.class.id)) {
      classMap.set(t.class.id, t.class);
    }
  }
  const classes = Array.from(classMap.values());

  // Build subject options grouped: classId -> subjects
  const subjectsByClass = new Map<
    string,
    { id: string; name: string; shortName: string }[]
  >();
  for (const t of tscEntries) {
    const existing = subjectsByClass.get(t.class.id) ?? [];
    if (!existing.find((s) => s.id === t.subject.id)) {
      existing.push(t.subject);
    }
    subjectsByClass.set(t.class.id, existing);
  }

  // For the static form we'll show all subjects that the teacher teaches
  const subjectMap = new Map<
    string,
    { id: string; name: string; shortName: string }
  >();
  for (const t of tscEntries) {
    if (!subjectMap.has(t.subject.id)) {
      subjectMap.set(t.subject.id, t.subject);
    }
  }
  const subjects = Array.from(subjectMap.values());

  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <header className="flex flex-col gap-5">
        <Link
          href="/teach/klassenbuch"
          className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-muted-fg transition-colors hover:text-fg"
        >
          <ArrowLeft className="size-3.5" />
          Zurück zum Klassenbuch
        </Link>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">
            Klassenbuch
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
            Neuer Stundeneintrag
          </h1>
          <p className="mt-1 text-sm text-muted-fg">
            Stunde eintragen · Anwesenheit wird automatisch auf &bdquo;Anwesend&ldquo;
            gesetzt
          </p>
        </div>
      </header>

      <form action={createLesson}>
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <BookOpen className="size-4 text-muted-fg" strokeWidth={1.75} />
                <CardTitle>Grunddaten</CardTitle>
              </div>
            </CardHeader>
            <CardBody className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="classId">Klasse</Label>
                  <select
                    id="classId"
                    name="classId"
                    required
                    className="h-10 w-full border border-border bg-bg px-3 text-sm focus:border-fg/30 focus:outline-none"
                  >
                    <option value="">Klasse wählen…</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="subjectId">Fach</Label>
                  <select
                    id="subjectId"
                    name="subjectId"
                    required
                    className="h-10 w-full border border-border bg-bg px-3 text-sm focus:border-fg/30 focus:outline-none"
                  >
                    <option value="">Fach wählen…</option>
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.shortName})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="period">Stunde</Label>
                  <select
                    id="period"
                    name="period"
                    required
                    className="h-10 w-full border border-border bg-bg px-3 text-sm focus:border-fg/30 focus:outline-none"
                  >
                    <option value="">Stunde wählen…</option>
                    {PERIODS.map((p) => (
                      <option key={p} value={p}>
                        {p} Stunde
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="date">Datum</Label>
                  <Input
                    id="date"
                    name="date"
                    type="date"
                    defaultValue={todayStr}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="topic">Unterrichtsthema</Label>
                <Input
                  id="topic"
                  name="topic"
                  placeholder="z. B. Quadratische Funktionen — Scheitelpunktform"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="homework">
                  Hausaufgaben{" "}
                  <span className="text-muted-fg">(optional)</span>
                </Label>
                <Input
                  id="homework"
                  name="homework"
                  placeholder="z. B. Übungen Buch S. 88, Nr. 3 + 5"
                />
              </div>
            </CardBody>
          </Card>

          <div className="flex items-center justify-between border-t border-border pt-4">
            <Link
              href="/teach/klassenbuch"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Abbrechen
            </Link>
            <button
              type="submit"
              className={buttonVariants({ size: "sm" })}
            >
              <Save className="size-3.5" />
              Eintrag speichern
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
