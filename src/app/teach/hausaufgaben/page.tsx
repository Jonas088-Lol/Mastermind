/* Copyright 2026 Elian Schock, Jonas Schwenk */
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ArrowRight, Plus, BookOpen } from "lucide-react";
import type { Metadata } from "next";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Hausaufgaben · Lehrer" };

interface PageProps {
  searchParams: Promise<{ week?: string }>;
}

function getWeekBounds(offset: number) {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(now.getDate() + diff + offset * 7);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { monday, sunday };
}

const DAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

export default async function TeacherHausaufgabenPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "teacher") redirect("/");

  const { week } = await searchParams;
  const offset = parseInt(week ?? "0", 10) || 0;
  const { monday, sunday } = getWeekBounds(offset);

  const homework = await prisma.homework.findMany({
    where: {
      teacherId: session.userId,
      dueAt: { gte: monday, lte: sunday },
    },
    include: {
      class: { select: { name: true } },
      subject: { select: { name: true, color: true } },
      _count: { select: { completions: { where: { done: true } } } },
    },
    orderBy: { dueAt: "asc" },
  });

  // Group by day-of-week index (Mon=0 … Sun=6)
  const byDay: (typeof homework)[] = Array.from({ length: 7 }, () => []);
  for (const hw of homework) {
    const idx = (new Date(hw.dueAt).getDay() + 6) % 7;
    byDay[idx].push(hw);
  }

  const fmt = (d: Date) => d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
  const weekLabel = `${fmt(monday)} – ${fmt(sunday)}`;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Lehrer</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Hausaufgaben</h1>
        </div>
        <Link
          href="/teach/hausaufgaben/neu"
          className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-brand-fg shadow-sm transition-opacity hover:opacity-90"
        >
          <Plus className="size-4" />
          Neue Hausaufgabe
        </Link>
      </header>

      {/* Week navigation */}
      <div className="flex items-center gap-3">
        <Link
          href={`?week=${offset - 1}`}
          className="grid size-8 place-items-center rounded-lg border border-border bg-surface text-muted-fg transition-colors hover:text-fg"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <span className="min-w-36 text-center text-sm font-semibold">{weekLabel}</span>
        <Link
          href={`?week=${offset + 1}`}
          className="grid size-8 place-items-center rounded-lg border border-border bg-surface text-muted-fg transition-colors hover:text-fg"
        >
          <ArrowRight className="size-4" />
        </Link>
        {offset !== 0 && (
          <Link href="?" className="text-xs text-brand hover:underline">
            Aktuelle Woche
          </Link>
        )}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {byDay.map((items, i) => {
          const dayDate = new Date(monday);
          dayDate.setDate(monday.getDate() + i);
          const isToday = dayDate.toDateString() === new Date().toDateString();

          return (
            <div
              key={i}
              className={`flex flex-col gap-2 rounded-2xl border p-3 ${
                isToday ? "border-brand/40 bg-brand/5" : "border-border bg-surface"
              }`}
            >
              <div className="text-center">
                <p className={`text-xs font-bold uppercase tracking-wider ${isToday ? "text-brand" : "text-muted-fg"}`}>
                  {DAYS[i]}
                </p>
                <p className={`text-xl font-bold ${isToday ? "text-brand" : "text-fg"}`}>
                  {dayDate.getDate()}
                </p>
              </div>
              {items.length === 0 ? (
                <p className="mt-1 text-center text-xs text-muted-fg/40">–</p>
              ) : (
                items.map((hw) => (
                  <div
                    key={hw.id}
                    className="rounded-xl border border-border bg-bg p-2 text-xs"
                    style={{ borderLeftColor: hw.subject.color, borderLeftWidth: 3 }}
                  >
                    <p className="font-semibold leading-tight text-fg">{hw.title}</p>
                    <p className="mt-0.5 text-muted-fg">
                      {hw.class.name} · {hw.subject.name}
                    </p>
                    <p className="mt-0.5 text-muted-fg/70">
                      {new Date(hw.dueAt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} Uhr
                    </p>
                    {hw.requiresUpload && (
                      <span className="mt-1 inline-block rounded bg-brand/10 px-1.5 py-0.5 text-[10px] font-semibold text-brand">
                        Upload
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          );
        })}
      </div>

      {homework.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border p-12 text-center">
          <BookOpen className="size-10 text-muted-fg/40" />
          <p className="font-semibold text-muted-fg">Keine Hausaufgaben in dieser Woche</p>
          <Link href="/teach/hausaufgaben/neu" className="text-sm text-brand hover:underline">
            Jetzt erstellen
          </Link>
        </div>
      )}

      {/* List view below calendar */}
      {homework.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-muted-fg">
            Alle Aufgaben dieser Woche
          </h2>
          {homework.map((hw) => (
            <div
              key={hw.id}
              className="flex items-start gap-4 rounded-xl border border-border bg-surface p-4"
              style={{ borderLeftColor: hw.subject.color, borderLeftWidth: 3 }}
            >
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-fg">{hw.title}</p>
                <p className="text-sm text-muted-fg">
                  {hw.class.name} · {hw.subject.name}
                </p>
                {hw.description && (
                  <p className="mt-1 text-sm text-muted-fg">{hw.description}</p>
                )}
              </div>
              <div className="shrink-0 text-right text-xs text-muted-fg">
                <p className="font-semibold text-fg">
                  {new Date(hw.dueAt).toLocaleDateString("de-DE", {
                    weekday: "short",
                    day: "2-digit",
                    month: "2-digit",
                  })}
                </p>
                <p>{new Date(hw.dueAt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} Uhr</p>
                {hw.requiresUpload && (
                  <span className="mt-1 inline-block rounded bg-brand/10 px-1.5 py-0.5 font-semibold text-brand">
                    Upload erforderlich
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
