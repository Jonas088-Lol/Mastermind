/* Copyright 2026 Elian Schock, Jonas Schwenk */
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Trash2 } from "lucide-react";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { createSchoolYearEvent, deleteSchoolYearEvent } from "./actions";

export const metadata: Metadata = { title: "Schuljahresplanung · Schulleitung" };

const CATEGORY_LABELS: Record<string, string> = {
  holiday: "Ferien",
  exam: "Prüfung",
  event: "Veranstaltung",
  meeting: "Konferenz",
  deadline: "Frist",
};

const CATEGORY_COLORS: Record<string, string> = {
  holiday: "bg-green-100 text-green-800",
  exam: "bg-red-100 text-red-800",
  event: "bg-blue-100 text-blue-800",
  meeting: "bg-amber-100 text-amber-800",
  deadline: "bg-orange-100 text-orange-800",
};

function formatDate(date: Date): string {
  return date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatDateRange(startAt: Date, endAt: Date | null): string {
  if (!endAt || endAt.getTime() === startAt.getTime()) return formatDate(startAt);
  return `${formatDate(startAt)} – ${formatDate(endAt)}`;
}

const MONTHS_DE = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];

export default async function SchuljahrPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const role = effectiveRole(session);
  if (!["rector", "vice_rector", "admin", "super"].includes(role)) redirect("/login");

  const schoolYearStart = new Date(2025, 7, 1); // Aug 2025
  const schoolYearEnd = new Date(2026, 6, 31);  // Jul 2026

  const events = await prisma.schoolEvent.findMany({
    where: {
      schoolId: session.schoolId!,
      startAt: { gte: schoolYearStart, lte: schoolYearEnd },
    },
    orderBy: { startAt: "asc" },
  });

  const now = new Date();
  const upcomingHolidays = events.filter(
    (e) => e.category === "holiday" && e.startAt >= now,
  ).length;
  const upcomingExams = events.filter(
    (e) => e.category === "exam" && e.startAt >= now,
  ).length;

  // Group events by month (use startAt month)
  const byMonth = new Map<number, typeof events>();
  for (const event of events) {
    const m = event.startAt.getMonth();
    if (!byMonth.has(m)) byMonth.set(m, []);
    byMonth.get(m)!.push(event);
  }

  // School year months: Aug(7) … Jul(6)
  const schoolYearMonths = [7, 8, 9, 10, 11, 0, 1, 2, 3, 4, 5, 6];

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Schulleitung</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Schuljahresplanung 2025/26</h1>
      </header>

      {/* Summary stats */}
      <div className="grid gap-px border border-border bg-border sm:grid-cols-3">
        <div className="bg-bg p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">Termine gesamt</p>
          <p className="mt-3 font-mono text-3xl font-bold">{events.length}</p>
        </div>
        <div className="bg-bg p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">Bevorstehende Ferien</p>
          <p className="mt-3 font-mono text-3xl font-bold text-green-700">{upcomingHolidays}</p>
        </div>
        <div className="bg-bg p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">Bevorstehende Prüfungen</p>
          <p className="mt-3 font-mono text-3xl font-bold text-red-700">{upcomingExams}</p>
        </div>
      </div>

      {/* Timeline */}
      <div className="flex flex-col gap-6">
        <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-fg">
          Jahresübersicht
        </h2>

        {schoolYearMonths.map((monthIdx) => {
          const monthEvents = byMonth.get(monthIdx);
          if (!monthEvents || monthEvents.length === 0) return null;
          const year = monthIdx >= 7 ? 2025 : 2026;
          return (
            <div key={monthIdx}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-fg">
                {MONTHS_DE[monthIdx]} {year}
              </h3>
              <div className="border border-border divide-y divide-border">
                {monthEvents.map((event) => (
                  <div key={event.id} className="flex items-start justify-between gap-4 bg-bg px-5 py-4">
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-block px-2 py-0.5 text-[11px] font-semibold ${
                            CATEGORY_COLORS[event.category] ?? "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {CATEGORY_LABELS[event.category] ?? event.category}
                        </span>
                        <span className="font-medium text-fg">{event.title}</span>
                      </div>
                      <p className="text-xs text-muted-fg">
                        {formatDateRange(event.startAt, event.endAt)}
                      </p>
                      {event.description && (
                        <p className="mt-0.5 text-xs text-muted-fg">{event.description}</p>
                      )}
                    </div>
                    <form
                      action={async () => {
                        "use server";
                        await deleteSchoolYearEvent(event.id);
                      }}
                    >
                      <button
                        type="submit"
                        className="shrink-0 p-1 text-muted-fg hover:text-red-600"
                        title="Termin löschen"
                      >
                        <Trash2 className="size-4" strokeWidth={1.75} />
                      </button>
                    </form>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {events.length === 0 && (
          <p className="text-sm text-muted-fg">Noch keine Termine für dieses Schuljahr eingetragen.</p>
        )}
      </div>

      {/* Create form */}
      <div className="border border-border bg-bg">
        <div className="border-b border-border px-5 py-4">
          <h2 className="font-semibold">Neuen Termin eintragen</h2>
        </div>
        <form action={createSchoolYearEvent} className="flex flex-col gap-4 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-fg" htmlFor="title">
                Titel *
              </label>
              <input
                id="title"
                name="title"
                type="text"
                required
                placeholder="z. B. Herbstferien"
                className="border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-fg"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-fg" htmlFor="category">
                Kategorie
              </label>
              <select
                id="category"
                name="category"
                className="border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-fg"
              >
                <option value="event">Veranstaltung</option>
                <option value="holiday">Ferien</option>
                <option value="exam">Prüfung</option>
                <option value="meeting">Konferenz</option>
                <option value="deadline">Frist</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-fg" htmlFor="startAt">
                Datum von *
              </label>
              <input
                id="startAt"
                name="startAt"
                type="date"
                required
                className="border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-fg"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-fg" htmlFor="endAt">
                Datum bis (optional)
              </label>
              <input
                id="endAt"
                name="endAt"
                type="date"
                className="border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-fg"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-fg" htmlFor="description">
              Beschreibung (optional)
            </label>
            <textarea
              id="description"
              name="description"
              rows={2}
              placeholder="Kurze Beschreibung..."
              className="border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-fg resize-none"
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              className="bg-fg px-5 py-2 text-sm font-semibold text-bg hover:bg-fg/90"
            >
              Termin speichern
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
