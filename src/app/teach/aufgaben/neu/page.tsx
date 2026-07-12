/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { NeueAufgabeForm } from "./NeueAufgabeForm";

export const metadata: Metadata = { title: "Neue Aufgabe" };

export default async function NeueAufgabePage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "teacher") redirect("/");

  // Load all class-subject combos this teacher is assigned to
  const tscs = await prisma.teacherSubjectClass.findMany({
    where: { teacherId: session.userId },
    include: {
      class: { select: { id: true, name: true, _count: { select: { students: true } } } },
      subject: { select: { id: true, name: true } },
    },
    orderBy: [{ class: { name: "asc" } }, { subject: { name: "asc" } }],
  });

  // Group subjects per class
  const classMap = new Map<string, { id: string; name: string; studentCount: number; subjects: { id: string; name: string }[] }>();
  for (const tsc of tscs) {
    if (!classMap.has(tsc.classId)) {
      classMap.set(tsc.classId, {
        id: tsc.class.id,
        name: tsc.class.name,
        studentCount: tsc.class._count.students,
        subjects: [],
      });
    }
    const entry = classMap.get(tsc.classId)!;
    if (!entry.subjects.find((s) => s.id === tsc.subjectId)) {
      entry.subjects.push({ id: tsc.subject.id, name: tsc.subject.name });
    }
  }

  const classes = Array.from(classMap.values());

  if (classes.length === 0) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <Link href="/teach/aufgaben" className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-muted-fg hover:text-fg">
          <ArrowLeft className="size-3.5" />
          Zurück zu Aufgaben
        </Link>
        <div className="border border-dashed border-border p-12 text-center">
          <p className="font-semibold">Keine Klassen zugeordnet</p>
          <p className="mt-1 text-sm text-muted-fg">Du wurdest noch keiner Klasse/Fach-Kombination zugewiesen. Bitte Admin kontaktieren.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <header className="flex flex-col gap-5">
        <Link
          href="/teach/aufgaben"
          className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-muted-fg transition-colors hover:text-fg"
        >
          <ArrowLeft className="size-3.5" />
          Zurück zu Aufgaben
        </Link>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Lehrer</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Aufgabe erstellen</h1>
          <p className="mt-1 text-sm text-muted-fg">
            Aufgabe wird sofort veröffentlicht · Schüler erhalten eine Push-Benachrichtigung.
          </p>
        </div>
      </header>

      <NeueAufgabeForm classes={classes} />
    </div>
  );
}
