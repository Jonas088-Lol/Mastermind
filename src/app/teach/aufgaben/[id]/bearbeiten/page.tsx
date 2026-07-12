/* Copyright 2026 Elian Schock, Jonas Schwenk */
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { updateAssignment } from "./actions";

export const metadata: Metadata = { title: "Aufgabe bearbeiten" };

const TYPE_OPTIONS = [
  { value: "homework", label: "Hausaufgabe" },
  { value: "test", label: "Test / KA" },
  { value: "project", label: "Projekt" },
  { value: "exam", label: "Prüfung" },
];

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AufgabeBearbeitenPage({ params }: PageProps) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "teacher") redirect("/");

  const assignment = await prisma.assignment.findUnique({
    where: { id },
    include: {
      subject: { select: { name: true } },
      class: { select: { name: true } },
    },
  });

  if (!assignment) notFound();
  if (assignment.teacherId !== session.userId) notFound();

  const dueAtStr = assignment.dueAt.toISOString().slice(0, 16);

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-8">
      <header>
        <Link
          href={`/teach/aufgaben/${id}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-muted-fg hover:text-fg"
        >
          <ArrowLeft className="size-3.5" />
          Zurück
        </Link>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">Aufgabe bearbeiten</h1>
        <p className="mt-1 text-sm text-muted-fg">
          {assignment.subject.name} · Klasse {assignment.class.name}
        </p>
      </header>

      <form action={updateAssignment.bind(null, id)} className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="title" className="text-sm font-semibold">Titel</label>
          <input
            id="title"
            name="title"
            type="text"
            required
            defaultValue={assignment.title}
            className="h-10 border border-border bg-bg px-3 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="description" className="text-sm font-semibold">
            Beschreibung <span className="font-normal text-muted-fg">(optional)</span>
          </label>
          <textarea
            id="description"
            name="description"
            rows={4}
            defaultValue={assignment.description ?? ""}
            placeholder="Aufgabenbeschreibung…"
            className="resize-y border border-border bg-bg px-3 py-2 text-sm placeholder:text-muted-fg focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="dueAt" className="text-sm font-semibold">Fälligkeitsdatum</label>
            <input
              id="dueAt"
              name="dueAt"
              type="datetime-local"
              required
              defaultValue={dueAtStr}
              className="h-10 border border-border bg-bg px-3 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="maxPoints" className="text-sm font-semibold">
              Max. Punkte <span className="font-normal text-muted-fg">(optional)</span>
            </label>
            <input
              id="maxPoints"
              name="maxPoints"
              type="number"
              min="1"
              defaultValue={assignment.maxPoints ?? ""}
              placeholder="z. B. 100"
              className="h-10 border border-border bg-bg px-3 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold">Art</label>
          <div className="flex flex-wrap gap-3">
            {TYPE_OPTIONS.map((t) => (
              <label key={t.value} className="flex cursor-pointer items-center gap-1.5 text-sm">
                <input
                  type="radio"
                  name="type"
                  value={t.value}
                  defaultChecked={assignment.type === t.value}
                />
                {t.label}
              </label>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 pt-2">
          <Link href={`/teach/aufgaben/${id}`} className="text-sm text-muted-fg hover:text-fg">
            Abbrechen
          </Link>
          <button
            type="submit"
            className="bg-fg px-5 py-2.5 text-sm font-semibold text-bg hover:bg-fg/90"
          >
            Änderungen speichern
          </button>
        </div>
      </form>
    </div>
  );
}
