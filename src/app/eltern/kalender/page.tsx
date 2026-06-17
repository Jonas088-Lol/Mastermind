import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/db/client";
import { ROLE_HOME, effectiveRole, getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Kalender · Eltern" };

type CategoryKey = "holiday" | "exam" | "event" | "deadline" | "meeting";

const CATEGORY_LABEL: Record<CategoryKey, string> = {
  holiday: "Ferien",
  exam: "Klausur",
  event: "Veranstaltung",
  deadline: "Abgabe",
  meeting: "Termin",
};

const CATEGORY_VARIANT: Record<CategoryKey, "success" | "danger" | "info" | "warning" | "neutral"> = {
  holiday: "success",
  exam: "danger",
  event: "info",
  deadline: "warning",
  meeting: "neutral",
};

function parseMonth(monthParam: string | undefined): { year: number; month: number } {
  if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
    const [y, m] = monthParam.split("-").map(Number);
    if (y >= 2020 && y <= 2040 && m >= 1 && m <= 12) {
      return { year: y, month: m };
    }
  }
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

function monthLabel(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleDateString("de-DE", {
    month: "long",
    year: "numeric",
  });
}

function prevMonthParam(year: number, month: number): string {
  const d = new Date(year, month - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function nextMonthParam(year: number, month: number): string {
  const d = new Date(year, month, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function getWeekNumber(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

export default async function KalenderPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "parent") redirect(ROLE_HOME[effectiveRole(session)]);

  const { month: monthParam } = await searchParams;
  const { year, month } = parseMonth(monthParam);

  // Show 3 months: current + next 2
  const rangeStart = new Date(year, month - 1, 1);
  const rangeEnd = new Date(year, month + 2, 0, 23, 59, 59); // end of month+2

  const links = await prisma.parentStudentLink.findMany({
    where: { parentId: session.userId },
    include: {
      student: {
        select: {
          id: true,
          name: true,
          schoolId: true,
          classId: true,
          schoolClass: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { student: { name: "asc" } },
  });

  const schoolIds = [...new Set(links.map((l) => l.student.schoolId).filter(Boolean))] as string[];
  const childClassIds = [...new Set(links.map((l) => l.student.classId).filter(Boolean))] as string[];

  // Fetch school events
  const schoolEvents = schoolIds.length > 0
    ? await prisma.schoolEvent.findMany({
        where: {
          schoolId: { in: schoolIds },
          startAt: { gte: rangeStart, lte: rangeEnd },
        },
        orderBy: { startAt: "asc" },
      })
    : [];

  // Filter to events relevant to children's classes
  const relevantEvents = schoolEvents.filter((ev) => {
    if (!ev.classIds) return true; // applies to all
    try {
      const ids = JSON.parse(ev.classIds) as string[];
      return childClassIds.some((cid) => ids.includes(cid));
    } catch {
      return true;
    }
  });

  // Fetch assignment deadlines for children's classes
  const assignmentDeadlines = childClassIds.length > 0
    ? await prisma.assignment.findMany({
        where: {
          classId: { in: childClassIds },
          dueAt: { gte: rangeStart, lte: rangeEnd },
        },
        include: {
          subject: { select: { name: true } },
          class: { select: { name: true } },
        },
        orderBy: { dueAt: "asc" },
      })
    : [];

  // Build unified event list
  type UiEvent = {
    id: string;
    title: string;
    date: Date;
    category: CategoryKey;
    description?: string | null;
    location?: string | null;
  };

  const allEvents: UiEvent[] = [
    ...relevantEvents.map((ev) => ({
      id: ev.id,
      title: ev.title,
      date: ev.startAt,
      category: (ev.category as CategoryKey) ?? "event",
      description: ev.description,
    })),
    ...assignmentDeadlines.map((a) => ({
      id: `asgn-${a.id}`,
      title: `${a.subject.name}: ${a.title}`,
      date: a.dueAt,
      category: "deadline" as CategoryKey,
      description: `Klasse ${a.class.name}`,
    })),
  ].sort((a, b) => a.date.getTime() - b.date.getTime());

  // Group by month
  const byMonth = new Map<string, { label: string; weeks: Map<number, UiEvent[]> }>();

  for (const ev of allEvents) {
    const m = `${ev.date.getFullYear()}-${String(ev.date.getMonth() + 1).padStart(2, "0")}`;
    if (!byMonth.has(m)) {
      byMonth.set(m, {
        label: monthLabel(ev.date.getFullYear(), ev.date.getMonth() + 1),
        weeks: new Map(),
      });
    }
    const week = getWeekNumber(ev.date);
    const months = byMonth.get(m)!;
    if (!months.weeks.has(week)) months.weeks.set(week, []);
    months.weeks.get(week)!.push(ev);
  }

  const prevParam = prevMonthParam(year, month);
  const nextParam = nextMonthParam(year, month);
  const endMonthDate = new Date(year, month + 1, 1);
  const endMonthLabel = monthLabel(endMonthDate.getFullYear(), endMonthDate.getMonth() + 1);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-10">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Schule</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Schulkalender</h1>
        <p className="mt-1 text-sm text-muted-fg">
          Schulveranstaltungen, Klausuren und Abgabetermine der nächsten 3 Monate.
        </p>
      </header>

      {/* Month navigation */}
      <div className="flex items-center gap-4">
        <a
          href={`/eltern/kalender?month=${prevParam}`}
          className="flex size-8 items-center justify-center border border-border text-muted-fg transition-colors hover:bg-surface-2 hover:text-fg"
        >
          <ChevronLeft className="size-4" strokeWidth={2} />
        </a>
        <span className="flex-1 text-center text-sm font-semibold capitalize">
          {monthLabel(year, month)} – {endMonthLabel}
        </span>
        <a
          href={`/eltern/kalender?month=${nextParam}`}
          className="flex size-8 items-center justify-center border border-border text-muted-fg transition-colors hover:bg-surface-2 hover:text-fg"
        >
          <ChevronRight className="size-4" strokeWidth={2} />
        </a>
      </div>

      {links.length === 0 && (
        <p className="text-sm text-muted-fg">Kein Kind mit deinem Konto verknüpft.</p>
      )}

      {byMonth.size === 0 && links.length > 0 && (
        <p className="text-sm text-muted-fg">Keine Termine in diesem Zeitraum gefunden.</p>
      )}

      {Array.from(byMonth.entries()).map(([monthKey, { label, weeks }]) => (
        <section key={monthKey} className="flex flex-col gap-4">
          <h2 className="text-base font-semibold capitalize">{label}</h2>
          <Card>
            <CardBody className="px-0! pb-0!">
              {Array.from(weeks.entries())
                .sort(([a], [b]) => a - b)
                .map(([week, events]) => (
                  <div key={week} className="border-b border-border last:border-0">
                    <div className="bg-surface px-5 py-2">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">
                        KW {week}
                      </p>
                    </div>
                    <ul className="divide-y divide-border">
                      {events.map((ev) => (
                        <li key={ev.id} className="flex items-start gap-4 px-5 py-3.5 text-sm">
                          <div className="w-16 shrink-0 text-xs text-muted-fg">
                            <p className="font-medium">
                              {ev.date.toLocaleDateString("de-DE", { weekday: "short", day: "numeric", month: "short" })}
                            </p>
                            {!["holiday"].includes(ev.category) && (
                              <p>
                                {ev.date.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} Uhr
                              </p>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium">{ev.title}</p>
                            {ev.description && (
                              <p className="mt-0.5 text-xs text-muted-fg">{ev.description}</p>
                            )}
                          </div>
                          <Badge variant={CATEGORY_VARIANT[ev.category] ?? "neutral"}>
                            {CATEGORY_LABEL[ev.category] ?? ev.category}
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
            </CardBody>
          </Card>
        </section>
      ))}

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {(Object.entries(CATEGORY_LABEL) as [CategoryKey, string][]).map(([key, label]) => (
          <Badge key={key} variant={CATEGORY_VARIANT[key]}>
            {label}
          </Badge>
        ))}
      </div>
    </div>
  );
}
