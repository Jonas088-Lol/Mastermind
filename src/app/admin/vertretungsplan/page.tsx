import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Maximize2, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db/client";
import { ROLE_HOME, effectiveRole, getSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { createSubstitution } from "./actions";

export const metadata: Metadata = { title: "Vertretungsplan · Admin" };

interface PageProps {
  searchParams: Promise<{ date?: string; show?: string }>;
}

const TYPE_LABELS: Record<string, string> = {
  substitution: "Vertretung",
  cancellation: "Ausfall",
  room_change: "Raumwechsel",
};

const TYPE_VARIANTS: Record<string, "info" | "danger" | "warning"> = {
  substitution: "info",
  cancellation: "danger",
  room_change: "warning",
};

export default async function AdminVertretungsplanPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "admin") redirect(ROLE_HOME[effectiveRole(session)]);

  const { date: dateParam, show: showParam } = await searchParams;

  const schoolId = session.schoolId ?? "";

  // Date filter: default today
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const selectedDate = dateParam ? new Date(dateParam) : today;
  selectedDate.setHours(0, 0, 0, 0);

  const isWeekView = showParam === "week";
  const weekStart = new Date(selectedDate);
  weekStart.setDate(selectedDate.getDate() - selectedDate.getDay() + 1); // Monday
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  const rangeStart = isWeekView ? weekStart : selectedDate;
  const rangeEnd = isWeekView ? weekEnd : new Date(selectedDate.getTime() + 86399999);

  const [entries, classes, teachers] = await Promise.all([
    prisma.substitutionEntry.findMany({
      where: {
        schoolId,
        date: { gte: rangeStart, lte: rangeEnd },
      },
      include: {
        class: { select: { id: true, name: true } },
        absentTeacher: { select: { id: true, name: true } },
        substituteTeacher: { select: { id: true, name: true } },
      },
      orderBy: [{ date: "asc" }, { period: "asc" }],
    }),
    prisma.schoolClass.findMany({
      where: { schoolId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: { schoolId, role: "teacher" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  // Group by date
  const grouped = new Map<string, typeof entries>();
  for (const entry of entries) {
    const key = entry.date.toISOString().split("T")[0];
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(entry);
  }
  const sortedDates = Array.from(grouped.keys()).sort();

  const showCreate = showParam === "create";

  function todayHref() {
    return `/admin/vertretungsplan?date=${today.toISOString().split("T")[0]}`;
  }
  function weekHref() {
    return `/admin/vertretungsplan?date=${selectedDate.toISOString().split("T")[0]}&show=week`;
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Schul-Admin</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Vertretungsplan</h1>
        <p className="mt-1 text-sm text-muted-fg">
          {entries.length} Einträge im ausgewählten Zeitraum
        </p>
      </header>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1.5">
          <Link
            href={todayHref()}
            className={cn(
              "border px-3 py-1.5 text-xs font-semibold transition-colors",
              !isWeekView
                ? "border-fg bg-fg text-bg"
                : "border-border text-muted-fg hover:border-fg/30 hover:text-fg"
            )}
          >
            Heute
          </Link>
          <Link
            href={weekHref()}
            className={cn(
              "border px-3 py-1.5 text-xs font-semibold transition-colors",
              isWeekView
                ? "border-fg bg-fg text-bg"
                : "border-border text-muted-fg hover:border-fg/30 hover:text-fg"
            )}
          >
            Diese Woche
          </Link>
        </div>
        <form method="GET" action="/admin/vertretungsplan" className="flex items-center gap-2">
          <input
            type="date"
            name="date"
            defaultValue={selectedDate.toISOString().split("T")[0]}
            className="border border-border bg-bg px-3 py-1.5 text-xs"
          />
          <button
            type="submit"
            className="border border-border px-3 py-1.5 text-xs font-semibold text-muted-fg hover:border-fg/30 hover:text-fg transition-colors"
          >
            Anzeigen
          </button>
        </form>
        <div className="ml-auto flex items-center gap-2">
          <Link href="/admin/anzeigetafel">
            <Button size="sm" variant="secondary">
              <Maximize2 className="size-3.5" />
              Vollbildanzeige
            </Button>
          </Link>
          <Link
            href={`/admin/vertretungsplan?date=${selectedDate.toISOString().split("T")[0]}&show=create`}
          >
            <Button size="sm" variant="secondary">
              <RefreshCw className="size-3.5" />
              Neue Vertretung
            </Button>
          </Link>
        </div>
      </div>

      {/* Inline create form */}
      {showCreate && (
        <Card>
          <CardHeader>
            <CardTitle>Neue Vertretung erfassen</CardTitle>
          </CardHeader>
          <CardBody>
            <form action={createSubstitution} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-fg">
                    Datum
                  </label>
                  <input
                    type="date"
                    name="date"
                    defaultValue={selectedDate.toISOString().split("T")[0]}
                    required
                    className="w-full border border-border bg-bg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-fg">
                    Stunde
                  </label>
                  <select
                    name="period"
                    required
                    className="w-full border border-border bg-bg px-3 py-2 text-sm"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((p) => (
                      <option key={p} value={p}>
                        {p}. Stunde
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-fg">
                    Typ
                  </label>
                  <select
                    name="type"
                    required
                    className="w-full border border-border bg-bg px-3 py-2 text-sm"
                  >
                    <option value="substitution">Vertretung</option>
                    <option value="cancellation">Ausfall</option>
                    <option value="room_change">Raumwechsel</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-fg">
                    Klasse
                  </label>
                  <select
                    name="classId"
                    required
                    className="w-full border border-border bg-bg px-3 py-2 text-sm"
                  >
                    <option value="">Klasse wählen…</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-fg">
                    Fehlende Lehrkraft
                  </label>
                  <select
                    name="absentTeacherId"
                    className="w-full border border-border bg-bg px-3 py-2 text-sm"
                  >
                    <option value="">Keine Angabe</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-fg">
                    Vertretung durch
                  </label>
                  <select
                    name="substituteTeacherId"
                    className="w-full border border-border bg-bg px-3 py-2 text-sm"
                  >
                    <option value="">Keine Vertretung</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-fg">
                    Fach
                  </label>
                  <input
                    type="text"
                    name="subjectName"
                    placeholder="z.B. Mathematik"
                    className="w-full border border-border bg-bg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-fg">
                    Raum
                  </label>
                  <input
                    type="text"
                    name="room"
                    placeholder="z.B. R204"
                    className="w-full border border-border bg-bg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-fg">
                    Hinweis
                  </label>
                  <input
                    type="text"
                    name="note"
                    placeholder="Optionaler Hinweis"
                    className="w-full border border-border bg-bg px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" variant="secondary">
                  <RefreshCw className="size-4" />
                  Eintragen
                </Button>
                <Link href={`/admin/vertretungsplan?date=${selectedDate.toISOString().split("T")[0]}`}>
                  <Button type="button" variant="ghost">Abbrechen</Button>
                </Link>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      {/* Entries grouped by date */}
      {sortedDates.length === 0 ? (
        <Card>
          <CardBody>
            <p className="py-8 text-center text-sm text-muted-fg">
              Keine Vertretungen im gewählten Zeitraum.
            </p>
          </CardBody>
        </Card>
      ) : (
        sortedDates.map((dateKey) => {
          const dayEntries = grouped.get(dateKey)!;
          const dateObj = new Date(dateKey);
          return (
            <Card key={dateKey}>
              <CardHeader>
                <div>
                  <CardTitle>
                    {dateObj.toLocaleDateString("de-DE", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </CardTitle>
                  <p className="mt-1 text-sm text-muted-fg">
                    {dayEntries.length} Einträge
                  </p>
                </div>
                <Badge variant="info">{dayEntries.length}</Badge>
              </CardHeader>
              <CardBody className="px-0! pb-0!">
                <div className="border-t border-border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-surface">
                        <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-fg">
                          Std.
                        </th>
                        <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-fg">
                          Klasse
                        </th>
                        <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-fg">
                          Fehlt
                        </th>
                        <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-fg">
                          Vertretung
                        </th>
                        <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-fg">
                          Fach
                        </th>
                        <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-fg">
                          Typ
                        </th>
                        <th className="hidden px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-fg lg:table-cell">
                          Hinweis
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {dayEntries.map((entry) => (
                        <tr key={entry.id} className="hover:bg-surface/50">
                          <td className="px-5 py-3 font-mono text-sm font-semibold">
                            {entry.period}.
                          </td>
                          <td className="px-5 py-3 font-semibold">
                            {entry.class.name}
                          </td>
                          <td className="px-5 py-3 text-muted-fg">
                            {entry.absentTeacher?.name ?? "—"}
                          </td>
                          <td className="px-5 py-3">
                            {entry.substituteTeacher?.name ?? (
                              <span className="text-muted-fg">—</span>
                            )}
                          </td>
                          <td className="px-5 py-3 text-muted-fg">
                            {entry.subjectName ?? "—"}
                          </td>
                          <td className="px-5 py-3">
                            <Badge variant={TYPE_VARIANTS[entry.type] ?? "info"}>
                              {TYPE_LABELS[entry.type] ?? entry.type}
                            </Badge>
                          </td>
                          <td className="hidden px-5 py-3 text-muted-fg lg:table-cell">
                            {entry.note ?? "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardBody>
            </Card>
          );
        })
      )}
    </div>
  );
}
