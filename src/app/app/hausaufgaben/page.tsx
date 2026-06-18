import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2, Circle, Upload, BookOpen } from "lucide-react";
import type { Metadata } from "next";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { HausaufgabenActions } from "./HausaufgabenActions";

export const metadata: Metadata = { title: "Hausaufgaben" };

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

export default async function StudentHausaufgabenPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "student") redirect("/");

  const { week } = await searchParams;
  const offset = parseInt(week ?? "0", 10) || 0;
  const { monday, sunday } = getWeekBounds(offset);

  const student = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { classId: true },
  });

  if (!student?.classId) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-3 rounded-2xl border border-dashed border-border p-12 text-center">
        <BookOpen className="size-10 text-muted-fg/40" />
        <p className="font-semibold text-muted-fg">Du bist keiner Klasse zugeordnet</p>
        <p className="text-sm text-muted-fg">Wende dich an deinen Lehrer oder Admin.</p>
      </div>
    );
  }

  const homework = await prisma.homework.findMany({
    where: {
      classId: student.classId,
      dueAt: { gte: monday, lte: sunday },
    },
    include: {
      subject: { select: { name: true, color: true } },
      completions: {
        where: { studentId: session.userId },
        select: { done: true, fileUrl: true, fileName: true, doneAt: true },
      },
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

  const pendingCount = homework.filter((hw) => !hw.completions[0]?.done).length;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Hausaufgaben</h1>
          {pendingCount > 0 && (
            <p className="mt-1 text-sm text-muted-fg">
              {pendingCount} noch offen diese Woche
            </p>
          )}
        </div>
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

      {/* Calendar mini-strip */}
      <div className="grid grid-cols-7 gap-1.5">
        {byDay.map((items, i) => {
          const dayDate = new Date(monday);
          dayDate.setDate(monday.getDate() + i);
          const isToday = dayDate.toDateString() === new Date().toDateString();
          const allDone = items.length > 0 && items.every((hw) => hw.completions[0]?.done);
          const hasAny = items.length > 0;

          return (
            <div
              key={i}
              className={`flex flex-col items-center gap-1 rounded-xl border py-2 ${
                isToday ? "border-brand/40 bg-brand/5" : "border-border bg-surface"
              }`}
            >
              <span className={`text-[10px] font-bold uppercase tracking-wider ${isToday ? "text-brand" : "text-muted-fg"}`}>
                {DAYS[i]}
              </span>
              <span className={`text-base font-bold ${isToday ? "text-brand" : "text-fg"}`}>
                {dayDate.getDate()}
              </span>
              {hasAny && (
                <span
                  className={`size-1.5 rounded-full ${allDone ? "bg-green-500" : "bg-amber-400"}`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Homework list */}
      {homework.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border p-12 text-center">
          <CheckCircle2 className="size-10 text-green-500/60" />
          <p className="font-semibold text-muted-fg">Keine Hausaufgaben diese Woche 🎉</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {homework.map((hw) => {
            const completion = hw.completions[0];
            const isDone = completion?.done ?? false;

            return (
              <div
                key={hw.id}
                className={`rounded-2xl border border-border bg-surface p-4 transition-opacity ${isDone ? "opacity-60" : ""}`}
                style={{ borderLeftColor: hw.subject.color, borderLeftWidth: 4 }}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 shrink-0">
                    {isDone ? (
                      <CheckCircle2 className="size-5 text-green-500" />
                    ) : (
                      <Circle className="size-5 text-muted-fg/50" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className={`font-semibold ${isDone ? "line-through text-muted-fg" : "text-fg"}`}>
                          {hw.title}
                        </p>
                        <p className="text-xs text-muted-fg">
                          {hw.subject.name} ·{" "}
                          {new Date(hw.dueAt).toLocaleDateString("de-DE", {
                            weekday: "short",
                            day: "2-digit",
                            month: "2-digit",
                          })}{" "}
                          {new Date(hw.dueAt).toLocaleTimeString("de-DE", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}{" "}
                          Uhr
                        </p>
                        {hw.description && (
                          <p className="mt-1.5 text-sm text-muted-fg">{hw.description}</p>
                        )}
                      </div>
                      {hw.requiresUpload && (
                        <span className="shrink-0 rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-semibold text-brand">
                          Upload
                        </span>
                      )}
                    </div>

                    {completion?.fileUrl && (
                      <a
                        href={completion.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center gap-1.5 text-xs text-brand hover:underline"
                      >
                        <Upload className="size-3" />
                        {completion.fileName ?? "Datei anzeigen"}
                      </a>
                    )}

                    <HausaufgabenActions
                      homeworkId={hw.id}
                      isDone={isDone}
                      requiresUpload={hw.requiresUpload}
                      hasFile={!!completion?.fileUrl}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
