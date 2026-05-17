import {
  AlertTriangle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Kalender · Lehrer" };

const DAY_LABELS = ["Mo", "Di", "Mi", "Do", "Fr"] as const;
const DAY_NAMES = [
  "Montag",
  "Dienstag",
  "Mittwoch",
  "Donnerstag",
  "Freitag",
] as const;

interface PageProps {
  searchParams: Promise<{ week?: string }>;
}

// Parse ISO week string "YYYY-WNN" → { year, week }
function parseWeekParam(param: string | undefined): { year: number; week: number } | null {
  if (!param) return null;
  const m = /^(\d{4})-W(\d{1,2})$/.exec(param);
  if (!m) return null;
  const year = parseInt(m[1], 10);
  const week = parseInt(m[2], 10);
  if (week < 1 || week > 53) return null;
  return { year, week };
}

// Get Monday of ISO week
function mondayOfIsoWeek(year: number, week: number): Date {
  const jan4 = new Date(year, 0, 4); // Jan 4 is always in week 1
  const dayOfWeek = (jan4.getDay() + 6) % 7; // 0=Mon…6=Sun
  const week1Monday = new Date(jan4.getTime() - dayOfWeek * 86_400_000);
  return new Date(week1Monday.getTime() + (week - 1) * 7 * 86_400_000);
}

function isoWeekNumber(d: Date): { year: number; week: number } {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
  const week1 = new Date(date.getFullYear(), 0, 4);
  const weekNum =
    1 +
    Math.round(
      ((date.getTime() - week1.getTime()) / 86400000 -
        3 +
        ((week1.getDay() + 6) % 7)) /
        7
    );
  return { year: date.getFullYear(), week: weekNum };
}

function weekLabel(year: number, week: number): string {
  return `${year}-W${String(week).padStart(2, "0")}`;
}

function prevWeek(year: number, week: number): string {
  if (week === 1) return weekLabel(year - 1, 52);
  return weekLabel(year, week - 1);
}

function nextWeek(year: number, week: number): string {
  if (week >= 52) {
    // Simple: just increment year at W52/W53
    const nextMon = mondayOfIsoWeek(year, week);
    const nextNextMon = new Date(nextMon.getTime() + 7 * 86_400_000);
    const { year: ny, week: nw } = isoWeekNumber(nextNextMon);
    return weekLabel(ny, nw);
  }
  return weekLabel(year, week + 1);
}

export default async function KalenderPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "teacher") redirect("/");

  const { week: weekParam } = await searchParams;

  const today = new Date();
  const todayIso = isoWeekNumber(today);

  const parsedWeek = parseWeekParam(weekParam);
  const { year: currentYear, week: currentWeek } = parsedWeek ?? todayIso;

  const monday = mondayOfIsoWeek(currentYear, currentWeek);
  const friday = new Date(monday.getTime() + 4 * 86_400_000);
  const sunday = new Date(monday.getTime() + 6 * 86_400_000);

  // ISO dates for display
  const weekDates = [0, 1, 2, 3, 4].map(
    (i) => new Date(monday.getTime() + i * 86_400_000)
  );

  // today's day index (0=Mon…4=Fri), null if not in this week
  const todayDayIdx = (() => {
    for (let i = 0; i < 5; i++) {
      const d = weekDates[i];
      if (
        d.getDate() === today.getDate() &&
        d.getMonth() === today.getMonth() &&
        d.getFullYear() === today.getFullYear()
      )
        return i;
    }
    return null;
  })();

  // Fetch teacher's class IDs
  const tscEntries = await prisma.teacherSubjectClass.findMany({
    where: { teacherId: session.userId },
    select: { classId: true },
    distinct: ["classId"],
  });
  const myClassIds = tscEntries.map((t) => t.classId);

  const [timetableEntries, assignments, substitutions, schoolEvents] =
    await Promise.all([
      prisma.timetableEntry.findMany({
        where: { teacherId: session.userId },
        include: {
          subject: { select: { name: true, shortName: true, color: true } },
          class: { select: { name: true } },
        },
        orderBy: [{ day: "asc" }, { period: "asc" }],
      }),
      prisma.assignment.findMany({
        where: {
          teacherId: session.userId,
          dueAt: { gte: monday, lte: sunday },
        },
        include: {
          subject: { select: { name: true, color: true } },
          class: { select: { name: true } },
        },
        orderBy: { dueAt: "asc" },
      }),
      prisma.substitutionEntry.findMany({
        where: {
          date: { gte: monday, lte: sunday },
          OR: [
            { absentTeacherId: session.userId },
            { substituteTeacherId: session.userId },
          ],
        },
        include: {
          class: { select: { name: true } },
          absentTeacher: { select: { name: true } },
          substituteTeacher: { select: { name: true } },
        },
        orderBy: [{ date: "asc" }, { period: "asc" }],
      }),
      myClassIds.length > 0
        ? prisma.schoolEvent.findMany({
            where: {
              startAt: { lte: sunday },
              OR: [{ endAt: { gte: monday } }, { startAt: { gte: monday } }],
              schoolId: session.schoolId ?? undefined,
            },
            orderBy: { startAt: "asc" },
          })
        : Promise.resolve([]),
    ]);

  // Filter school events visible to teacher's classes
  const visibleEvents = schoolEvents.filter((ev) => {
    if (!ev.classIds) return true; // all classes
    try {
      const ids = JSON.parse(ev.classIds) as string[];
      return ids.some((id) => myClassIds.includes(id));
    } catch {
      return true;
    }
  });

  const prevWeekParam = prevWeek(currentYear, currentWeek);
  const nextWeekParam = nextWeek(currentYear, currentWeek);
  const isCurrentWeek =
    currentYear === todayIso.year && currentWeek === todayIso.week;

  const startLabel = monday.toLocaleDateString("de-DE", {
    day: "numeric",
    month: "long",
  });
  const endLabel = friday.toLocaleDateString("de-DE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">
            Lehrer-Cockpit
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
            Kalender
          </h1>
          <p className="mt-1 text-sm text-muted-fg">
            KW {currentWeek} · {startLabel} – {endLabel}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/teach/kalender?week=${prevWeekParam}`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
            aria-label="Vorherige Woche"
          >
            <ChevronLeft className="size-4" />
          </Link>
          <Link
            href="/teach/kalender"
            className={buttonVariants({
              variant: isCurrentWeek ? "primary" : "outline",
              size: "sm",
            })}
          >
            Diese Woche
          </Link>
          <Link
            href={`/teach/kalender?week=${nextWeekParam}`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
            aria-label="Nächste Woche"
          >
            <ChevronRight className="size-4" />
          </Link>
        </div>
      </header>

      {/* Legend */}
      <div className="flex flex-wrap gap-4">
        {[
          { color: "bg-blue-500", label: "Stundenplan" },
          { color: "bg-amber-500", label: "Abgaben" },
          { color: "bg-green-500", label: "Schulveranstaltungen" },
          { color: "bg-red-500", label: "Vertretungen" },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <span className={cn("inline-block size-2.5", item.color)} />
            <span className="text-xs font-medium text-muted-fg">{item.label}</span>
          </div>
        ))}
      </div>

      {/* Desktop: day columns */}
      <div className="hidden md:grid md:grid-cols-5 md:gap-3">
        {weekDates.map((date, dayIdx) => {
          const dayNum = dayIdx + 1; // 1=Mon…5=Fri
          const isToday = todayDayIdx === dayIdx;

          // Timetable for this day
          const dayTimetable = timetableEntries.filter((e) => e.day === dayNum);

          // Assignments due on this day
          const dayAssignments = assignments.filter((a) => {
            const d = a.dueAt;
            return (
              d.getDate() === date.getDate() &&
              d.getMonth() === date.getMonth() &&
              d.getFullYear() === date.getFullYear()
            );
          });

          // School events spanning this day
          const dayEvents = visibleEvents.filter((ev) => {
            const start = new Date(ev.startAt);
            start.setHours(0, 0, 0, 0);
            const end = ev.endAt ? new Date(ev.endAt) : new Date(ev.startAt);
            end.setHours(23, 59, 59, 999);
            const d = new Date(date);
            d.setHours(12, 0, 0, 0);
            return d >= start && d <= end;
          });

          // Substitutions for this day
          const daySubstitutions = substitutions.filter((s) => {
            const d = new Date(s.date);
            return (
              d.getDate() === date.getDate() &&
              d.getMonth() === date.getMonth() &&
              d.getFullYear() === date.getFullYear()
            );
          });

          const hasContent =
            dayTimetable.length +
              dayAssignments.length +
              dayEvents.length +
              daySubstitutions.length >
            0;

          return (
            <div
              key={dayIdx}
              className={cn(
                "flex flex-col gap-2 border border-border p-3",
                isToday ? "border-brand/60 bg-brand/[0.03]" : "bg-bg"
              )}
            >
              {/* Day header */}
              <div className="mb-1">
                <p
                  className={cn(
                    "text-[10px] font-semibold uppercase tracking-wider",
                    isToday ? "text-brand" : "text-muted-fg"
                  )}
                >
                  {DAY_LABELS[dayIdx]}
                </p>
                <p className="font-mono text-sm font-bold">
                  {date.toLocaleDateString("de-DE", {
                    day: "numeric",
                    month: "short",
                  })}
                </p>
                {isToday && (
                  <Badge variant="brand" className="mt-1">
                    Heute
                  </Badge>
                )}
              </div>

              {!hasContent && (
                <p className="text-[11px] text-muted-fg">Nichts eingetragen</p>
              )}

              {/* Timetable */}
              {dayTimetable.map((e) => (
                <div
                  key={e.id}
                  className="border-l-2 border-blue-500 bg-blue-500/[0.08] pl-2.5 py-1.5 text-xs"
                >
                  <p className="font-semibold leading-tight">{e.subject.name}</p>
                  <p className="text-muted-fg">
                    Kl. {e.class.name} · {e.period}. Stunde
                    {e.room && <> · {e.room}</>}
                  </p>
                </div>
              ))}

              {/* Assignments */}
              {dayAssignments.map((a) => (
                <Link
                  key={a.id}
                  href={`/teach/aufgaben/${a.id}`}
                  className="border-l-2 border-amber-500 bg-amber-500/[0.08] pl-2.5 py-1.5 text-xs hover:bg-amber-500/[0.14] transition-colors"
                >
                  <p className="font-semibold leading-tight">
                    Abgabe: {a.title}
                  </p>
                  <p className="text-muted-fg">
                    Klasse {a.class.name} · {a.subject.name}
                  </p>
                </Link>
              ))}

              {/* School events */}
              {dayEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="border-l-2 border-green-500 bg-green-500/[0.08] pl-2.5 py-1.5 text-xs"
                >
                  <p className="font-semibold leading-tight">{ev.title}</p>
                  <p className="text-muted-fg">
                    {ev.allDay
                      ? "Ganztägig"
                      : ev.startAt.toLocaleTimeString("de-DE", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                    {ev.category && <> · {ev.category}</>}
                  </p>
                </div>
              ))}

              {/* Substitutions */}
              {daySubstitutions.map((s) => (
                <div
                  key={s.id}
                  className="border-l-2 border-red-500 bg-red-500/[0.08] pl-2.5 py-1.5 text-xs"
                >
                  <div className="flex items-center gap-1">
                    <AlertTriangle className="size-3 text-red-500" />
                    <p className="font-semibold leading-tight">
                      {s.type === "cancellation"
                        ? "Ausfall"
                        : s.substituteTeacherId === session.userId
                        ? "Vertretung"
                        : "Vertreten durch"}
                    </p>
                  </div>
                  <p className="text-muted-fg">
                    Kl. {s.class.name} · {s.period}. Stunde
                    {s.subjectName && <> · {s.subjectName}</>}
                  </p>
                  {s.substituteTeacher &&
                    s.substituteTeacherId !== session.userId && (
                      <p className="text-muted-fg">
                        Vertr.: {s.substituteTeacher.name}
                      </p>
                    )}
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* Mobile: stacked cards */}
      <div className="space-y-4 md:hidden">
        {weekDates.map((date, dayIdx) => {
          const dayNum = dayIdx + 1;
          const isToday = todayDayIdx === dayIdx;

          const dayTimetable = timetableEntries.filter((e) => e.day === dayNum);
          const dayAssignments = assignments.filter((a) => {
            const d = a.dueAt;
            return (
              d.getDate() === date.getDate() &&
              d.getMonth() === date.getMonth() &&
              d.getFullYear() === date.getFullYear()
            );
          });
          const dayEvents = visibleEvents.filter((ev) => {
            const start = new Date(ev.startAt);
            start.setHours(0, 0, 0, 0);
            const end = ev.endAt ? new Date(ev.endAt) : new Date(ev.startAt);
            end.setHours(23, 59, 59, 999);
            const d = new Date(date);
            d.setHours(12, 0, 0, 0);
            return d >= start && d <= end;
          });
          const daySubstitutions = substitutions.filter((s) => {
            const d = new Date(s.date);
            return (
              d.getDate() === date.getDate() &&
              d.getMonth() === date.getMonth() &&
              d.getFullYear() === date.getFullYear()
            );
          });

          const totalItems =
            dayTimetable.length +
            dayAssignments.length +
            dayEvents.length +
            daySubstitutions.length;

          return (
            <Card
              key={dayIdx}
              className={isToday ? "border-brand/60" : undefined}
            >
              <CardHeader>
                <div>
                  <CardTitle>
                    {DAY_NAMES[dayIdx]},{" "}
                    {date.toLocaleDateString("de-DE", {
                      day: "numeric",
                      month: "long",
                    })}
                  </CardTitle>
                  {isToday && (
                    <p className="mt-0.5 text-xs font-semibold uppercase tracking-wider text-brand">
                      Heute
                    </p>
                  )}
                </div>
                <span className="font-mono text-xs text-muted-fg">
                  {totalItems} Einträge
                </span>
              </CardHeader>
              {totalItems > 0 && (
                <CardBody className="!px-0 !pb-0">
                  <ul className="divide-y divide-border border-t border-border">
                    {dayTimetable.map((e) => (
                      <li
                        key={e.id}
                        className="flex items-center gap-3 px-5 py-3"
                      >
                        <span className="size-2 shrink-0 bg-blue-500" />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold">
                            {e.subject.name} · Kl. {e.class.name}
                          </p>
                          <p className="text-xs text-muted-fg">
                            {e.period}. Stunde{e.room && <> · {e.room}</>}
                          </p>
                        </div>
                      </li>
                    ))}
                    {dayAssignments.map((a) => (
                      <li
                        key={a.id}
                        className="flex items-center gap-3 px-5 py-3"
                      >
                        <span className="size-2 shrink-0 bg-amber-500" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">
                            Abgabe: {a.title}
                          </p>
                          <p className="text-xs text-muted-fg">
                            Klasse {a.class.name} · {a.subject.name}
                          </p>
                        </div>
                      </li>
                    ))}
                    {dayEvents.map((ev) => (
                      <li
                        key={ev.id}
                        className="flex items-center gap-3 px-5 py-3"
                      >
                        <span className="size-2 shrink-0 bg-green-500" />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold">{ev.title}</p>
                          <p className="text-xs text-muted-fg">
                            {ev.allDay ? "Ganztägig" : "—"} · {ev.category}
                          </p>
                        </div>
                      </li>
                    ))}
                    {daySubstitutions.map((s) => (
                      <li
                        key={s.id}
                        className="flex items-center gap-3 px-5 py-3"
                      >
                        <span className="size-2 shrink-0 bg-red-500" />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold">
                            {s.substituteTeacherId === session.userId
                              ? "Vertretung"
                              : "Vertreten durch"}{" "}
                            · Kl. {s.class.name}
                          </p>
                          <p className="text-xs text-muted-fg">
                            {s.period}. Stunde{s.subjectName && <> · {s.subjectName}</>}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </CardBody>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
