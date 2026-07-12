/* Copyright 2026 Elian Schock, Jonas Schwenk */
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { sendChallenge } from "../actions";

export const metadata: Metadata = { title: "Duell senden" };

const SUBJECT_LABEL: Record<string, string> = {
  deutsch: "Deutsch", mathematik: "Mathe", englisch: "Englisch",
  physik: "Physik", chemie: "Chemie", biologie: "Biologie",
  geschichte: "Geschichte", informatik: "Informatik",
};

export default async function NeuDuellPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "student") redirect("/");

  const [classmates, topics] = await Promise.all([
    prisma.user.findMany({
      where: {
        schoolId: session.schoolId ?? "",
        role: "student",
        id: { not: session.userId },
        classId: session.classId ?? undefined,
      },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.exerciseTopic.findMany({
      select: { id: true, title: true, subject: true, grade: true },
      orderBy: [{ subject: "asc" }, { grade: "asc" }],
    }),
  ]);

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-8">
      <header>
        <Link
          href="/app/duelle"
          className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-muted-fg transition-colors hover:text-fg"
        >
          <ArrowLeft className="size-3.5" />
          Alle Duelle
        </Link>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">Herausfordern</h1>
        <p className="mt-1 text-sm text-muted-fg">Wähle einen Mitschüler und ein Thema.</p>
      </header>

      <form action={sendChallenge} className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold">Gegner</label>
          <select
            name="challengedId"
            required
            className="h-10 border border-border bg-bg px-3 text-sm focus:border-brand focus:outline-none"
          >
            <option value="">Mitschüler wählen…</option>
            {classmates.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold">Thema</label>
          <select
            name="topicId"
            required
            className="h-10 border border-border bg-bg px-3 text-sm focus:border-brand focus:outline-none"
          >
            <option value="">Thema wählen…</option>
            {topics.map((t) => (
              <option key={t.id} value={t.id}>
                {SUBJECT_LABEL[t.subject] ?? t.subject} Kl.{t.grade} — {t.title}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold">Nachricht <span className="font-normal text-muted-fg">(optional)</span></label>
          <input
            name="message"
            type="text"
            placeholder="z. B. Mal sehen wer besser ist!"
            className="h-10 border border-border bg-bg px-3 text-sm focus:border-brand focus:outline-none"
          />
        </div>

        <div className="border border-border bg-surface px-4 py-3 text-xs text-muted-fg">
          Das Duell läuft 48 Stunden. Beide Spieler müssen dasselbe Quiz absolvieren — wer mehr Fragen korrekt beantwortet, gewinnt. Bei Gleichstand Unentschieden.
        </div>

        <button
          type="submit"
          className="bg-fg px-5 py-2.5 text-sm font-semibold text-bg hover:bg-fg/90"
        >
          Herausforderung senden
        </button>
      </form>
    </div>
  );
}
