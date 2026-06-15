import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Download,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { PlanAddEvent, DeleteEventButton } from "@/components/app/PlanAddEvent";

export const metadata: Metadata = { title: "Stundenplan" };

const DEFAULT_PERIOD_TIMES = [
  "08:00 – 08:45",
  "08:50 – 09:35",
  "09:50 – 10:35",
  "10:40 – 11:25",
  "11:35 – 12:20",
  "12:25 – 13:10",
  "13:25 – 14:10",
  "14:15 – 15:00",
  "15:00 – 15:45",
];

const DAY_LABELS = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag"];

interface PageProps {
  searchParams: Promise<{ week?: string }>;
}

export default async function PlanPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "student") redirect("/");

  const { week: weekParam } = await searchParams;
  const weekOffset = parseInt(weekParam ?? "0", 10) || 0;

  const today = new Date();
  const dayOfWeek = today.getDay() === 0 ? 7 : today.getDay();
  const mondayOfCurrentWeek = new Date(today.getTime() - (dayOfWeek - 1) * 86_400_000);
  const mondayOfShownWeek = new Date(mondayOfCurrentWeek.getTime() + weekOffset * 7 * 86_400_000);
  const weekEnd = new Date(mondayOfShownWeek.getTime() + 4 * 86_400_000 + 86_399_999);

  const weekDates = [0, 1, 2, 3, 4].map((offset) =>
    new Date(mondayOfShownWeek.getTime() + offset * 86_400_000).toLocaleDateString("de-DE", {
      day: "numeric",
      month: "long",
    })
  );

  const todayDayOfWeek = weekOffset === 0 ? dayOfWeek : null;

  const startLabel = mondayOfShownWeek.toLocaleDateString("de-DE", { day: "numeric", month: "long" });
  const endLabel = new Date(mondayOfShownWeek.getTime() + 4 * 86_400_000).toLocaleDateString("de-DE", {
    day: "numeric",
    month: "long",
  });

  const weekNumber = (() => {
    const d = new Date(mondayOfShownWeek);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
    const week1 = new Date(d.getFullYear(), 0, 4);
    return (
      1 +
      Math.round(
        ((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7
      )
    );
  })();

  const classId = session.classId;
  if (!classId) {
    return (
      <div className="mx-auto max-w-7xl">
        <p className="text-muted-fg">Keine Klasse zugewiesen.</p>
      </div>
    );
  }

  const [entries, periodConfigs, substitutions, personalEvents] = await Promise.all([
    prisma.timetableEntry.findMany({
      where: { classId },
      include: {
        subject: { select: { name: true, shortName: true, color: true } },
        teacher: { select: { name: true } },
      },
      orderBy: [{ day: "asc" }, { period: "asc" }],
    }),
    session.schoolId
      ? prisma.schoolPeriodConfig.findMany({
          where: { schoolId: session.schoolId },
          orderBy: { period: "asc" },
          select: { period: true, startTime: true, endTime: true },
        })
      : [],
    prisma.substitutionEntry.findMany({
      where: { classId, date: { gte: mondayOfShownWeek, lte: weekEnd } },
      include: {
        absentTeacher: { select: { name: true } },
        substituteTeacher: { select: { name: true } },
      },
      orderBy: [{ date: "asc" }, { period: "asc" }],
    }),
    prisma.personalEvent.findMany({
      where: { userId: session.userId, startAt: { gte: mondayOfShownWeek, lte: weekEnd } },
      orderBy: { startAt: "asc" },
    }),
  ]);

  const PERIOD_TIMES = Array.from({ length: 9 }, (_, i) => {
    const cfg = (periodConfigs as Array<{ period: number; startTime: string; endTime: string }>).find((p) => p.period === i + 1);
    return cfg ? `${cfg.startTime} – ${cfg.endTime}` : DEFAULT_PERIOD_TIMES[i];
  });

  type TimetableEntry = (typeof entries)[number];
  type SubstEntry = (typeof substitutions)[number];

  const grid: (TimetableEntry | null)[][] = Array.from({ length: 5 }, () => Array(9).fill(null));
  for (const e of entries) {
    if (e.day >= 1 && e.day <= 5 && e.period >= 1 && e.period <= 9) {
      grid[e.day - 1][e.period - 1] = e;
    }
  }

  // day-of-week (1=Mon…5=Fri) + period → substitution
  const substMap = new Map<string, SubstEntry>();
  for (const s of substitutions) {
    const dow = new Date(s.date).getDay();
    const mapped = dow === 0 ? 7 : dow;
    substMap.set(`${mapped}-${s.period}`, s);
  }

  // personal events grouped by day-of-week
  const eventsByDay = new Map<number, typeof personalEvents>();
  for (const ev of personalEvents) {
    const dow = new Date(ev.startAt).getDay();
    const mapped = dow === 0 ? 7 : dow;
    if (mapped >= 1 && mapped <= 5) {
      if (!eventsByDay.has(mapped)) eventsByDay.set(mapped, []);
      eventsByDay.get(mapped)!.push(ev);
    }
  }

  const maxPeriod = Math.max(1, ...entries.map((e) => e.period));
  const hasSubstitutions = substitutions.length > 0;
  const todayIso = mondayOfShownWeek.toISOString().slice(0, 10);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">
            Klasse {session.klasse ?? "—"} · Schuljahr 2025/26
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Stundenplan</h1>
          <p className="mt-1 text-sm text-muted-fg">
            KW {weekNumber} · {startLabel} – {endLabel}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/app/plan?week=${weekOffset - 1}`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
            aria-label="Vorherige Woche"
          >
            <ChevronLeft className="size-4" />
          </Link>
          <Link
            href="/app/plan"
            className={buttonVariants({ variant: weekOffset === 0 ? "primary" : "outline", size: "sm" })}
          >
            Diese Woche
          </Link>
          <Link
            href={`/app/plan?week=${weekOffset + 1}`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
            aria-label="Nächste Woche"
          >
            <ChevronRight className="size-4" />
          </Link>
          <Link href="/api/stundenplan/ical" className={buttonVariants({ variant: "outline", size: "sm" })}>
            <Download className="size-3.5" />
            iCal
          </Link>
          <PlanAddEvent defaultDate={todayIso} />
        </div>
      </header>

      {/* Vertretungsplan-Banner */}
      {hasSubstitutions && (
        <div className="flex items-start gap-3 rounded-2xl border border-warning/30 bg-warning/5 px-4 py-3">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
          <div className="text-sm">
            <span className="font-semibold text-warning">Vertretungen diese Woche:</span>
            <span className="ml-1 text-muted-fg">{substitutions.length} Stunde{substitutions.length !== 1 && "n"} betroffen</span>
          </div>
        </div>
      )}

      {entries.length === 0 ? (
        <p className="text-muted-fg">Kein Stundenplan eingetragen.</p>
      ) : (
        <>
          {/* Desktop grid */}
          <section className="hidden overflow-hidden rounded-2xl border border-border bg-bg lg:block">
            <div className="grid border-b border-border" style={{ gridTemplateColumns: "auto repeat(5, 1fr)" }}>
              <div className="border-r border-border bg-surface px-3 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-fg">
                Stunde
              </div>
              {DAY_LABELS.map((label, i) => (
                <div
                  key={label}
                  className={cn(
                    "border-l border-border px-3 py-3 text-center",
                    todayDayOfWeek !== null && i + 1 === todayDayOfWeek && "bg-brand/8"
                  )}
                >
                  <p className={cn(
                    "text-[10px] font-semibold uppercase tracking-wider",
                    todayDayOfWeek !== null && i + 1 === todayDayOfWeek ? "text-brand" : "text-muted-fg"
                  )}>
                    {label}
                  </p>
                  <p className="mt-0.5 font-mono text-xs">{weekDates[i]}</p>
                  {todayDayOfWeek !== null && i + 1 === todayDayOfWeek && (
                    <span className="mt-1 inline-block rounded-full bg-brand px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
                      Heute
                    </span>
                  )}
                  {/* Personal events for this day */}
                  {(eventsByDay.get(i + 1) ?? []).map((ev) => (
                    <div
                      key={ev.id}
                      className="group mt-1.5 flex items-center justify-between gap-1 rounded-lg px-1.5 py-1 text-left text-[10px] font-medium text-white"
                      style={{ backgroundColor: ev.color }}
                    >
                      <span className="truncate">{ev.title}</span>
                      <DeleteEventButton id={ev.id} />
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {Array.from({ length: maxPeriod }, (_, periodIdx) => (
              <div
                key={periodIdx}
                className="grid border-b border-border last:border-b-0"
                style={{ gridTemplateColumns: "auto repeat(5, 1fr)" }}
              >
                <div className="flex w-24 flex-col justify-center border-r border-border bg-surface px-3 py-3">
                  <p className="font-mono text-xs font-semibold">{periodIdx + 1}.</p>
                  <p className="font-mono text-[10px] text-muted-fg">{PERIOD_TIMES[periodIdx]}</p>
                </div>
                {Array.from({ length: 5 }, (_, dayIdx) => {
                  const entry = grid[dayIdx][periodIdx];
                  const subst = substMap.get(`${dayIdx + 1}-${periodIdx + 1}`);
                  return (
                    <div
                      key={dayIdx}
                      className={cn(
                        "border-l border-border p-2",
                        todayDayOfWeek !== null && dayIdx + 1 === todayDayOfWeek && "bg-brand/3"
                      )}
                    >
                      {subst ? (
                        <SubstitutionCell subst={subst} />
                      ) : entry ? (
                        <PeriodCell entry={entry} />
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ))}
          </section>

          {/* Mobile cards */}
          <section className="space-y-4 lg:hidden">
            {DAY_LABELS.map((label, dayIdx) => {
              const dayEntries = grid[dayIdx].filter(Boolean) as NonNullable<TimetableEntry>[];
              const dayEvents = eventsByDay.get(dayIdx + 1) ?? [];
              const daySubsts = substitutions.filter((s) => {
                const dow = new Date(s.date).getDay();
                return (dow === 0 ? 7 : dow) === dayIdx + 1;
              });
              if (dayEntries.length === 0 && dayEvents.length === 0) return null;
              return (
                <Card key={label} className={todayDayOfWeek !== null && dayIdx + 1 === todayDayOfWeek ? "border-brand/40" : undefined}>
                  <CardHeader>
                    <div>
                      <CardTitle>{label} · {weekDates[dayIdx]}</CardTitle>
                      {todayDayOfWeek !== null && dayIdx + 1 === todayDayOfWeek && (
                        <p className="mt-0.5 text-xs font-semibold uppercase tracking-wider text-brand">Heute</p>
                      )}
                    </div>
                    <span className="font-mono text-xs text-muted-fg">{dayEntries.length} Stunden</span>
                  </CardHeader>
                  {dayEvents.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 px-5 pb-2">
                      {dayEvents.map((ev) => (
                        <div
                          key={ev.id}
                          className="group flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-white"
                          style={{ backgroundColor: ev.color }}
                        >
                          {ev.title}
                          <DeleteEventButton id={ev.id} />
                        </div>
                      ))}
                    </div>
                  )}
                  {daySubsts.length > 0 && (
                    <div className="mx-5 mb-2 rounded-xl border border-warning/30 bg-warning/5 px-3 py-2 text-xs text-warning">
                      <AlertTriangle className="mr-1 inline size-3" />
                      {daySubsts.length} Vertretung{daySubsts.length !== 1 && "en"}
                    </div>
                  )}
                  <CardBody className="px-0! pb-0!">
                    <ol className="divide-y divide-border border-t border-border">
                      {dayEntries.map((e) => {
                        const subst = substMap.get(`${dayIdx + 1}-${e.period}`);
                        return (
                          <li key={e.id} className={cn("flex items-center gap-4 px-5 py-3 text-sm", subst && "bg-warning/3")}>
                            <span className="w-14 shrink-0 font-mono text-[10px] leading-snug text-muted-fg">
                              {e.period}.<br />
                              {PERIOD_TIMES[e.period - 1]?.split(" – ")[0]}<br />
                              {PERIOD_TIMES[e.period - 1]?.split(" – ")[1]}
                            </span>
                            <div className="min-w-0 flex-1">
                              {subst ? (
                                <>
                                  <p className="flex items-center gap-1 font-semibold text-warning">
                                    <AlertTriangle className="size-3" />
                                    {subst.type === "cancelled" ? "Ausfall" : subst.subjectName ?? e.subject.name}
                                  </p>
                                  <p className="text-xs text-muted-fg">
                                    {subst.substituteTeacher?.name ?? "—"} · {subst.note ?? "Vertretung"}
                                  </p>
                                </>
                              ) : (
                                <>
                                  <p className="font-semibold">{e.subject.name}</p>
                                  <p className="text-xs text-muted-fg">
                                    {e.teacher.name} · Raum {e.room ?? "—"}
                                  </p>
                                </>
                              )}
                            </div>
                            <span
                              className="inline-block size-2.5 shrink-0 rounded-full"
                              style={{ backgroundColor: subst ? "#f59e0b" : e.subject.color }}
                            />
                          </li>
                        );
                      })}
                    </ol>
                  </CardBody>
                </Card>
              );
            })}
          </section>
        </>
      )}
    </div>
  );
}

type TimetableEntryWithIncludes = Awaited<ReturnType<typeof prisma.timetableEntry.findFirst>> & {
  subject: { name: string; shortName: string; color: string };
  teacher: { name: string };
  room?: string | null;
};

function PeriodCell({ entry }: { entry: NonNullable<TimetableEntryWithIncludes> }) {
  return (
    <div
      className="relative h-full min-h-14 overflow-hidden rounded-xl border border-border p-2"
      style={{ backgroundColor: entry.subject.color + "15" }}
    >
      <span
        className="absolute inset-y-0 left-0 w-1 rounded-l-xl"
        style={{ backgroundColor: entry.subject.color }}
      />
      <p className="pl-2 text-xs font-bold leading-tight">{entry.subject.name}</p>
      <p className="mt-0.5 truncate pl-2 text-[11px] text-muted-fg">{entry.room ?? "—"}</p>
      <p className="truncate pl-2 text-[11px] text-muted-fg">{entry.teacher.name}</p>
    </div>
  );
}

type SubstEntryWithIncludes = {
  type: string;
  subjectName: string | null;
  note: string | null;
  room: string | null;
  absentTeacher: { name: string } | null;
  substituteTeacher: { name: string } | null;
};

function SubstitutionCell({ subst }: { subst: SubstEntryWithIncludes }) {
  const isCancelled = subst.type === "cancelled";
  return (
    <div className={cn(
      "relative h-full min-h-14 overflow-hidden rounded-xl border p-2",
      isCancelled
        ? "border-danger/30 bg-danger/5"
        : "border-warning/40 bg-warning/8"
    )}>
      <span className={cn("absolute inset-y-0 left-0 w-1 rounded-l-xl", isCancelled ? "bg-danger" : "bg-warning")} />
      <p className={cn("pl-2 text-xs font-bold leading-tight", isCancelled ? "text-danger" : "text-warning")}>
        {isCancelled ? "Ausfall" : subst.subjectName ?? "Vertretung"}
      </p>
      {!isCancelled && subst.substituteTeacher && (
        <p className="mt-0.5 truncate pl-2 text-[11px] text-muted-fg">{subst.substituteTeacher.name}</p>
      )}
      {subst.note && (
        <p className="truncate pl-2 text-[11px] text-muted-fg">{subst.note}</p>
      )}
    </div>
  );
}
