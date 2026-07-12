/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { createHomework } from "./actions";

export const metadata: Metadata = { title: "Neue Hausaufgabe" };

export default async function NeueHausaufgabePage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "teacher") redirect("/");

  const tscs = await prisma.teacherSubjectClass.findMany({
    where: { teacherId: session.userId },
    include: {
      class: { select: { id: true, name: true } },
      subject: { select: { id: true, name: true, color: true } },
    },
    orderBy: [{ class: { name: "asc" } }, { subject: { name: "asc" } }],
  });

  if (tscs.length === 0) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <Link
          href="/teach/hausaufgaben"
          className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-muted-fg hover:text-fg"
        >
          <ArrowLeft className="size-3.5" />
          Zurück
        </Link>
        <div className="rounded-2xl border border-dashed border-border p-12 text-center">
          <p className="font-semibold">Keine Klassen zugeordnet</p>
          <p className="mt-1 text-sm text-muted-fg">
            Du wurdest noch keiner Klasse/Fach-Kombination zugewiesen. Bitte Admin kontaktieren.
          </p>
        </div>
      </div>
    );
  }

  // Compute a sensible default due datetime (next weekday, 08:00)
  const nextDay = new Date();
  nextDay.setDate(nextDay.getDate() + 1);
  if (nextDay.getDay() === 6) nextDay.setDate(nextDay.getDate() + 2);
  if (nextDay.getDay() === 0) nextDay.setDate(nextDay.getDate() + 1);
  nextDay.setHours(8, 0, 0, 0);
  const defaultDue = nextDay.toISOString().slice(0, 16); // "YYYY-MM-DDTHH:MM"

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <header className="flex flex-col gap-5">
        <Link
          href="/teach/hausaufgaben"
          className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-muted-fg transition-colors hover:text-fg"
        >
          <ArrowLeft className="size-3.5" />
          Zurück zu Hausaufgaben
        </Link>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Lehrer</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Hausaufgabe erstellen</h1>
          <p className="mt-1 text-sm text-muted-fg">
            Schüler erhalten sofort eine Push-Benachrichtigung.
          </p>
        </div>
      </header>

      <form action={createHomework} className="flex flex-col gap-5">
        {/* Class + Subject combo */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="tscId" className="text-sm font-semibold text-fg">
            Klasse &amp; Fach
          </label>
          <select
            id="tscId"
            name="tscId"
            required
            className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-fg focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          >
            <option value="">Bitte auswählen …</option>
            {tscs.map((tsc) => (
              <option key={tsc.id} value={tsc.id}>
                {tsc.class.name} – {tsc.subject.name}
              </option>
            ))}
          </select>
        </div>

        {/* Title */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="title" className="text-sm font-semibold text-fg">
            Titel
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            maxLength={200}
            placeholder="z.B. Seite 47 Aufgaben 3–6"
            className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-fg placeholder:text-muted-fg focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
        </div>

        {/* Due date/time */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="dueAt" className="text-sm font-semibold text-fg">
            Abgabetermin
          </label>
          <input
            id="dueAt"
            name="dueAt"
            type="datetime-local"
            required
            defaultValue={defaultDue}
            className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-fg focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
        </div>

        {/* Description */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="description" className="text-sm font-semibold text-fg">
            Zusatzinfo <span className="font-normal text-muted-fg">(optional)</span>
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            maxLength={1000}
            placeholder="Hinweise, Materialien, Seitenangaben …"
            className="w-full resize-none rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-fg placeholder:text-muted-fg focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
        </div>

        {/* Requires upload */}
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-surface p-4 transition-colors hover:border-brand/40">
          <input
            type="checkbox"
            name="requiresUpload"
            className="mt-0.5 size-4 accent-brand"
          />
          <div>
            <p className="text-sm font-semibold text-fg">Upload erforderlich</p>
            <p className="text-xs text-muted-fg">
              Schüler müssen ein Foto oder eine Datei hochladen, bevor sie die Aufgabe als erledigt markieren können.
            </p>
          </div>
        </label>

        <SubmitButton
          pendingText="Erstelle…"
          className="mt-2 rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-brand-fg shadow-sm transition-opacity hover:opacity-90"
        >
          Hausaufgabe erstellen
        </SubmitButton>
      </form>
    </div>
  );
}
