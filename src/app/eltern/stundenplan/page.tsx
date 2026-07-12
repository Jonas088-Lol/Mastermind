/* Copyright 2026 Elian Schock, Jonas Schwenk */
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db/client";
import { ROLE_HOME, effectiveRole, getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Stundenplan · Eltern" };

const DAY_NAMES = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag"];
const MAX_PERIOD = 8;

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

export default async function ElternStundenplanPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "parent") redirect(ROLE_HOME[effectiveRole(session)]);

  // today's day-of-week: 1=Mo … 5=Fr, 0/6 = weekend → no highlight
  const todayDow = (() => {
    const d = new Date().getDay();
    return d === 0 || d === 6 ? -1 : d;
  })();

  const links = await prisma.parentStudentLink.findMany({
    where: { parentId: session.userId },
    include: {
      student: {
        select: {
          id: true,
          name: true,
          klasse: true,
          classId: true,
          schoolClass: {
            include: {
              timetableEntries: {
                include: {
                  subject: { select: { name: true, color: true, shortName: true } },
                  teacher: { select: { name: true } },
                },
                orderBy: [{ day: "asc" }, { period: "asc" }],
              },
            },
          },
        },
      },
    },
    orderBy: { student: { name: "asc" } },
  });

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-10">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">
          Schuljahr 2025/26
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Stundenplan</h1>
        <p className="mt-1 text-sm text-muted-fg">
          Wochenstundenplan deiner {links.length === 1 ? "Tochter / deines Sohnes" : "Kinder"}.
        </p>
      </header>

      {links.length === 0 && (
        <p className="text-sm text-muted-fg">Kein Kind mit deinem Konto verknüpft.</p>
      )}

      {links.map(({ student }, studentIdx) => {
        const entries = student.schoolClass?.timetableEntries ?? [];
        const className =
          student.schoolClass?.name ?? student.klasse ?? "Unbekannte Klasse";

        // Build a day → period → entry lookup
        const grid: Map<number, Map<number, (typeof entries)[number]>> = new Map();
        for (const e of entries) {
          if (!grid.has(e.day)) grid.set(e.day, new Map());
          grid.get(e.day)!.set(e.period, e);
        }

        // Compute the actual max period used (at least 6, at most MAX_PERIOD)
        const maxPeriodUsed = entries.reduce((m, e) => Math.max(m, e.period), 0);
        const periods = Array.from(
          { length: Math.max(6, Math.min(maxPeriodUsed, MAX_PERIOD)) },
          (_, i) => i + 1,
        );

        return (
          <section key={student.id} className="flex flex-col gap-4">
            {links.length > 1 && (
              <div className="flex items-baseline gap-3">
                <h2 className="text-xl font-bold">{student.name}</h2>
                <span className="text-sm text-muted-fg">Klasse {className}</span>
              </div>
            )}

            {entries.length === 0 ? (
              <p className="text-sm text-muted-fg">
                Kein Stundenplan für Klasse {className} hinterlegt.
              </p>
            ) : (
              <>
                {/* Desktop: full week grid */}
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full border-separate border-spacing-0 rounded-lg border border-border text-sm">
                    <thead>
                      <tr>
                        <th className="w-10 border-b border-r border-border bg-muted px-3 py-2 text-left text-xs font-semibold text-muted-fg">
                          Std.
                        </th>
                        {DAY_NAMES.map((name, idx) => (
                          <th
                            key={name}
                            className={[
                              "border-b border-r border-border px-3 py-2 text-left text-xs font-semibold last:border-r-0",
                              idx + 1 === todayDow
                                ? "bg-brand/10 text-brand"
                                : "bg-muted text-muted-fg",
                            ].join(" ")}
                          >
                            <span className="flex items-center gap-1.5">
                              {name}
                              {idx + 1 === todayDow && (
                                <span className="rounded bg-brand px-1 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-brand-fg">
                                  Heute
                                </span>
                              )}
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {periods.map((period, pIdx) => (
                        <tr key={period} className={pIdx % 2 === 0 ? "" : "bg-muted/30"}>
                          <td className="border-b border-r border-border px-3 py-2 text-center align-top font-mono text-xs font-semibold text-muted-fg last-of-type:border-b-0">
                            <span className="block">{period}.</span>
                            <span className="block text-[10px] font-normal text-muted-fg/70">
                              {DEFAULT_PERIOD_TIMES[period - 1]?.split(" – ")[0]}
                            </span>
                            <span className="block text-[10px] font-normal text-muted-fg/70">
                              {DEFAULT_PERIOD_TIMES[period - 1]?.split(" – ")[1]}
                            </span>
                          </td>
                          {Array.from({ length: 5 }, (_, dayIdx) => {
                            const dayNum = dayIdx + 1;
                            const entry = grid.get(dayNum)?.get(period);
                            const isToday = dayNum === todayDow;
                            return (
                              <td
                                key={dayIdx}
                                className={[
                                  "border-b border-r border-border px-3 py-2 align-top last:border-r-0",
                                  isToday ? "bg-brand/5" : "",
                                  pIdx === periods.length - 1 ? "border-b-0" : "",
                                ].join(" ")}
                              >
                                {entry ? (
                                  <div className="flex flex-col gap-0.5">
                                    <div className="flex items-center gap-1.5">
                                      <span
                                        className="inline-block size-2 shrink-0 rounded-sm"
                                        style={{ backgroundColor: entry.subject.color }}
                                      />
                                      <span className="font-semibold leading-snug">
                                        {entry.subject.name}
                                      </span>
                                    </div>
                                    <p className="text-xs text-muted-fg">{entry.teacher.name}</p>
                                    {entry.room && (
                                      <p className="text-xs text-muted-fg">Raum {entry.room}</p>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-xs text-muted-fg/40">–</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile: day columns as cards */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:hidden">
                  {Array.from({ length: 5 }, (_, idx) => {
                    const dayNum = idx + 1;
                    const isToday = dayNum === todayDow;
                    const dayEntries = entries.filter((e) => e.day === dayNum);
                    return (
                      <Card
                        key={dayNum}
                        className={isToday ? "border-brand/40 ring-1 ring-brand/20" : ""}
                      >
                        <CardHeader>
                          <CardTitle className="text-sm">{DAY_NAMES[idx]}</CardTitle>
                          {isToday && (
                            <span className="rounded bg-brand px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-brand-fg">
                              Heute
                            </span>
                          )}
                        </CardHeader>
                        <CardBody className="px-0! pb-0!">
                          {dayEntries.length === 0 ? (
                            <p className="border-t border-border px-4 py-3 text-xs text-muted-fg">
                              Frei
                            </p>
                          ) : (
                            <ol className="divide-y divide-border border-t border-border">
                              {dayEntries.map((e) => (
                                <li key={e.id} className="flex items-start gap-2 px-4 py-2.5 text-xs">
                                  <span className="w-14 shrink-0 font-mono leading-snug text-muted-fg">
                                    {e.period}.<br />
                                    {DEFAULT_PERIOD_TIMES[e.period - 1]?.split(" – ")[0]}<br />
                                    {DEFAULT_PERIOD_TIMES[e.period - 1]?.split(" – ")[1]}
                                  </span>
                                  <span
                                    className="mt-1 inline-block size-1.5 shrink-0 rounded-sm"
                                    style={{ backgroundColor: e.subject.color }}
                                  />
                                  <div className="min-w-0">
                                    <p className="font-semibold leading-snug">{e.subject.name}</p>
                                    <p className="text-muted-fg">{e.teacher.name}</p>
                                    {e.room && (
                                      <p className="text-muted-fg">Raum {e.room}</p>
                                    )}
                                  </div>
                                </li>
                              ))}
                            </ol>
                          )}
                        </CardBody>
                      </Card>
                    );
                  })}
                </div>
              </>
            )}

            {studentIdx < links.length - 1 && (
              <hr className="mt-4 border-border" />
            )}
          </section>
        );
      })}
    </div>
  );
}
