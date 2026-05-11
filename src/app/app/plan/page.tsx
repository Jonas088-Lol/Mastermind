import {
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

const DAY_LABELS = ["Mo", "Di", "Mi", "Do", "Fr"];

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
  const dayOfWeek = today.getDay() === 0 ? 7 : today.getDay(); // 1=Mon…7=Sun
  const mondayOfCurrentWeek = new Date(today.getTime() - (dayOfWeek - 1) * 86_400_000);
  const mondayOfShownWeek = new Date(mondayOfCurrentWeek.getTime() + weekOffset * 7 * 86_400_000);

  const weekDates = [0, 1, 2, 3, 4].map((offset) =>
    new Date(mondayOfShownWeek.getTime() + offset * 86_400_000).toLocaleDateString("de-DE", {
      day: "numeric",
      month: "long",
    })
  );

  // Only highlight today's column when viewing the current week
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
        <p className="text-muted-fg">Kein Klasse zugewiesen.</p>
      </div>
    );
  }

  const entries = await prisma.timetableEntry.findMany({
    where: { classId },
    include: {
      subject: { select: { name: true, shortName: true, color: true } },
      teacher: { select: { name: true } },
    },
    orderBy: [{ day: "asc" }, { period: "asc" }],
  });

  const periodConfigs = session.schoolId
    ? await prisma.schoolPeriodConfig.findMany({
        where: { schoolId: session.schoolId },
        orderBy: { period: "asc" },
        select: { period: true, startTime: true, endTime: true },
      })
    : [];
  const PERIOD_TIMES = Array.from({ length: 9 }, (_, i) => {
    const cfg = periodConfigs.find((p) => p.period === i + 1);
    return cfg ? `${cfg.startTime} – ${cfg.endTime}` : DEFAULT_PERIOD_TIMES[i];
  });

  // Build grid: day 1-5 → period 1-9
  type PeriodEntry = (typeof entries)[number] | null;
  const grid: PeriodEntry[][] = Array.from({ length: 5 }, () => Array(9).fill(null));
  for (const e of entries) {
    if (e.day >= 1 && e.day <= 5 && e.period >= 1 && e.period <= 9) {
      grid[e.day - 1][e.period - 1] = e;
    }
  }

  const maxPeriod = Math.max(1, ...entries.map((e) => e.period));

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
        <div className="flex items-center gap-2">
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
        </div>
      </header>

      {entries.length === 0 ? (
        <p className="text-muted-fg">Kein Stundenplan eingetragen.</p>
      ) : (
        <>
          {/* Desktop grid */}
          <section className="hidden border border-border bg-bg lg:block">
            <div className="grid border-b border-border" style={{ gridTemplateColumns: "auto repeat(5, 1fr)" }}>
              <div className="border-r border-border bg-surface px-3 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-fg">
                Stunde
              </div>
              {DAY_LABELS.map((label, i) => (
                <div
                  key={label}
                  className={cn(
                    "border-l border-border px-3 py-3 text-center",
                    todayDayOfWeek !== null && i + 1 === todayDayOfWeek && "bg-brand/[0.05]"
                  )}
                >
                  <p className={cn(
                    "text-[10px] font-semibold uppercase tracking-wider",
                    todayDayOfWeek !== null && i + 1 === todayDayOfWeek ? "text-brand" : "text-muted-fg"
                  )}>
                    {label}
                  </p>
                  <p className="mt-0.5 font-mono text-xs">{weekDates[i]}</p>
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
                  return (
                    <div
                      key={dayIdx}
                      className={cn(
                        "border-l border-border p-2",
                        todayDayOfWeek !== null && dayIdx + 1 === todayDayOfWeek && "bg-brand/[0.03]"
                      )}
                    >
                      {entry && <PeriodCell entry={entry} />}
                    </div>
                  );
                })}
              </div>
            ))}
          </section>

          {/* Mobile cards */}
          <section className="space-y-6 lg:hidden">
            {DAY_LABELS.map((label, dayIdx) => {
              const dayEntries = grid[dayIdx].filter(Boolean) as NonNullable<PeriodEntry>[];
              if (dayEntries.length === 0) return null;
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
                  <CardBody className="!px-0 !pb-0">
                    <ol className="divide-y divide-border border-t border-border">
                      {dayEntries.map((e) => (
                        <li key={e.id} className="flex items-center gap-4 px-5 py-3 text-sm">
                          <span className="w-12 font-mono text-[10px] text-muted-fg">
                            {e.period}.<br />
                            {PERIOD_TIMES[e.period - 1]?.split(" – ")[0]}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold">{e.subject.name}</p>
                            <p className="text-xs text-muted-fg">
                              {e.teacher.name} · Raum {e.room ?? "—"}
                            </p>
                          </div>
                          <span
                            className="inline-block size-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: e.subject.color }}
                          />
                        </li>
                      ))}
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

function PeriodCell({ entry }: { entry: NonNullable<Awaited<ReturnType<typeof prisma.timetableEntry.findFirst>>> & { subject: { name: string; shortName: string; color: string }; teacher: { name: string } } }) {
  return (
    <div
      className="relative h-full min-h-[60px] overflow-hidden border border-border p-2"
      style={{ backgroundColor: entry.subject.color + "15" }}
    >
      <span
        className="absolute inset-y-0 left-0 w-1"
        style={{ backgroundColor: entry.subject.color }}
      />
      <p className="pl-1.5 text-[11px] font-bold leading-tight">{entry.subject.name}</p>
      <p className="mt-0.5 truncate pl-1.5 text-[10px] text-muted-fg">{entry.room ?? "—"}</p>
      <p className="truncate pl-1.5 text-[10px] text-muted-fg">{entry.teacher.name}</p>
    </div>
  );
}
