import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Calendar, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db/client";
import { ROLE_HOME, effectiveRole, getSession } from "@/lib/session";
import { createSchoolEvent, deleteSchoolEvent } from "./actions";

export const metadata: Metadata = { title: "Schulkalender · Admin" };

interface PageProps {
  searchParams: Promise<{ month?: string; create?: string }>;
}

const CATEGORY_LABELS: Record<string, string> = {
  holiday: "Ferien",
  exam: "Klausur",
  event: "Veranstaltung",
  deadline: "Termin",
  meeting: "Konferenz",
};

const CATEGORY_VARIANTS: Record<
  string,
  "success" | "danger" | "info" | "warning" | "brand"
> = {
  holiday: "success",
  exam: "danger",
  event: "info",
  deadline: "warning",
  meeting: "brand",
};

function parseMonth(raw?: string): { year: number; month: number } {
  if (raw && /^\d{4}-\d{2}$/.test(raw)) {
    const [y, m] = raw.split("-").map(Number);
    return { year: y, month: m - 1 }; // month is 0-indexed
  }
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() };
}

function monthHref(year: number, month: number) {
  const m = String(month + 1).padStart(2, "0");
  return `/admin/schulkalender?month=${year}-${m}`;
}

export default async function AdminSchulkalenderPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "admin") redirect(ROLE_HOME[effectiveRole(session)]);

  const { month: monthParam, create: showCreateParam } = await searchParams;
  const showCreate = showCreateParam === "1";

  const { year, month } = parseMonth(monthParam);
  const schoolId = session.schoolId ?? "";

  const rangeStart = new Date(year, month, 1);
  const rangeEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);

  const events = await prisma.schoolEvent.findMany({
    where: {
      schoolId,
      startAt: { gte: rangeStart, lte: rangeEnd },
    },
    orderBy: { startAt: "asc" },
  });

  // Group events by date key
  const grouped = new Map<string, typeof events>();
  for (const ev of events) {
    const key = ev.startAt.toISOString().split("T")[0];
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(ev);
  }
  const sortedKeys = Array.from(grouped.keys()).sort();

  // Navigation dates
  const prevYear = month === 0 ? year - 1 : year;
  const prevMonth = month === 0 ? 11 : month - 1;
  const nextYear = month === 11 ? year + 1 : year;
  const nextMonth = month === 11 ? 0 : month + 1;

  const monthLabel = new Date(year, month, 1).toLocaleDateString("de-DE", {
    month: "long",
    year: "numeric",
  });

  const currentMonthStr = `${year}-${String(month + 1).padStart(2, "0")}`;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Schul-Admin</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Schulkalender</h1>
        <p className="mt-1 text-sm text-muted-fg">
          {events.length} Ereignisse im {monthLabel}
        </p>
      </header>

      {/* Month navigation */}
      <div className="flex items-center gap-3">
        <Link href={monthHref(prevYear, prevMonth)}>
          <Button size="sm" variant="ghost">
            <ChevronLeft className="size-4" />
          </Button>
        </Link>
        <span className="min-w-[11rem] text-center text-sm font-semibold">{monthLabel}</span>
        <Link href={monthHref(nextYear, nextMonth)}>
          <Button size="sm" variant="ghost">
            <ChevronRight className="size-4" />
          </Button>
        </Link>
        <div className="ml-auto">
          <Link
            href={
              showCreate
                ? `/admin/schulkalender?month=${currentMonthStr}`
                : `/admin/schulkalender?month=${currentMonthStr}&create=1`
            }
          >
            <Button size="sm" variant="secondary">
              <Calendar className="size-4" />
              {showCreate ? "Abbrechen" : "Termin hinzufügen"}
            </Button>
          </Link>
        </div>
      </div>

      {/* Create form */}
      {showCreate && (
        <Card>
          <CardHeader>
            <CardTitle>Neuen Termin erstellen</CardTitle>
          </CardHeader>
          <CardBody>
            <form action={createSchoolEvent} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-fg">
                    Titel
                  </label>
                  <input
                    type="text"
                    name="title"
                    placeholder="z.B. Herbstferien"
                    required
                    className="w-full border border-border bg-bg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-fg">
                    Kategorie
                  </label>
                  <select
                    name="category"
                    required
                    className="w-full border border-border bg-bg px-3 py-2 text-sm"
                  >
                    <option value="holiday">Ferien</option>
                    <option value="exam">Klausur</option>
                    <option value="event">Veranstaltung</option>
                    <option value="deadline">Termin</option>
                    <option value="meeting">Konferenz</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-fg">
                    Ganztägig
                  </label>
                  <div className="flex h-[38px] items-center gap-2 border border-border bg-bg px-3">
                    <input
                      type="checkbox"
                      name="allDay"
                      id="allDay"
                      defaultChecked
                      className="size-4"
                    />
                    <label htmlFor="allDay" className="text-sm">
                      Ganztägiger Termin
                    </label>
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-fg">
                    Startdatum
                  </label>
                  <input
                    type="date"
                    name="startAt"
                    required
                    defaultValue={`${year}-${String(month + 1).padStart(2, "0")}-01`}
                    className="w-full border border-border bg-bg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-fg">
                    Enddatum (optional)
                  </label>
                  <input
                    type="date"
                    name="endAt"
                    className="w-full border border-border bg-bg px-3 py-2 text-sm"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-fg">
                    Beschreibung (optional)
                  </label>
                  <textarea
                    name="description"
                    rows={2}
                    placeholder="Optionale Beschreibung…"
                    className="w-full resize-none border border-border bg-bg px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <Button type="submit" variant="secondary">
                <Calendar className="size-4" />
                Termin erstellen
              </Button>
            </form>
          </CardBody>
        </Card>
      )}

      {/* Events calendar list */}
      {sortedKeys.length === 0 ? (
        <Card>
          <CardBody>
            <p className="py-8 text-center text-sm text-muted-fg">
              Keine Termine im {monthLabel}.
            </p>
          </CardBody>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {sortedKeys.map((dateKey) => {
            const dayEvents = grouped.get(dateKey)!;
            const dateObj = new Date(dateKey);
            return (
              <Card key={dateKey}>
                <CardHeader>
                  <div>
                    <CardTitle className="text-base">
                      {dateObj.toLocaleDateString("de-DE", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                      })}
                    </CardTitle>
                  </div>
                  <span className="text-xs text-muted-fg">{dayEvents.length} Termin{dayEvents.length !== 1 ? "e" : ""}</span>
                </CardHeader>
                <CardBody className="px-0! pb-0!">
                  <ul className="divide-y divide-border border-t border-border">
                    {dayEvents.map((ev) => (
                      <li key={ev.id} className="flex items-start gap-4 px-5 py-3.5">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold">{ev.title}</p>
                            <Badge variant={CATEGORY_VARIANTS[ev.category] ?? "info"}>
                              {CATEGORY_LABELS[ev.category] ?? ev.category}
                            </Badge>
                            {ev.allDay && (
                              <span className="text-[10px] uppercase tracking-wider text-muted-fg">
                                Ganztägig
                              </span>
                            )}
                          </div>
                          {ev.description && (
                            <p className="mt-0.5 text-xs text-muted-fg">{ev.description}</p>
                          )}
                          {ev.endAt && ev.endAt.toDateString() !== ev.startAt.toDateString() && (
                            <p className="mt-0.5 text-[11px] text-muted-fg">
                              bis{" "}
                              {ev.endAt.toLocaleDateString("de-DE", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </p>
                          )}
                        </div>
                        <form action={deleteSchoolEvent.bind(null, ev.id)}>
                          <Button
                            type="submit"
                            size="sm"
                            variant="ghost"
                            title="Termin löschen"
                          >
                            <Trash2 className="size-3.5 text-danger" />
                          </Button>
                        </form>
                      </li>
                    ))}
                  </ul>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
