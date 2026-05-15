import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Clock, Plus } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { savePeriodConfig, saveTimetableEntry, deleteTimetableEntry } from "./actions";
import { CsvImportCard } from "./CsvImportCard";

export const metadata: Metadata = { title: "Stundenplan · Admin" };

const DEFAULT_START = ["08:00", "08:50", "09:50", "10:40", "11:35", "12:25", "13:25", "14:15", "15:00"];
const DEFAULT_END   = ["08:45", "09:35", "10:35", "11:25", "12:20", "13:10", "14:10", "15:00", "15:45"];
const DAY_LABELS = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag"];

export default async function AdminStundenplanPage() {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "admin") redirect("/admin");
  if (!session.schoolId) redirect("/admin");

  const [classes, teachers, subjects, periodConfigs, timetableEntries] = await Promise.all([
    prisma.schoolClass.findMany({
      where: { schoolId: session.schoolId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.user.findMany({
      where: { schoolId: session.schoolId, role: "teacher" },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.subject.findMany({
      where: { schoolId: session.schoolId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, shortName: true, color: true },
    }),
    prisma.schoolPeriodConfig.findMany({
      where: { schoolId: session.schoolId },
      orderBy: { period: "asc" },
    }),
    prisma.timetableEntry.findMany({
      where: { schoolId: session.schoolId },
      include: {
        class: { select: { name: true } },
        teacher: { select: { name: true } },
        subject: { select: { name: true, shortName: true, color: true } },
      },
      orderBy: [{ classId: "asc" }, { day: "asc" }, { period: "asc" }],
    }),
  ]);

  const periodMap = new Map(periodConfigs.map((p) => [p.period, p]));

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Schul-Admin</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Stundenplan</h1>
      </header>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Stundenzeiten</CardTitle>
            <p className="mt-1 text-sm text-muted-fg">Gilt für alle Klassen dieser Schule</p>
          </div>
          <Clock className="size-4 text-muted-fg" strokeWidth={1.75} />
        </CardHeader>
        <CardBody>
          <form action={savePeriodConfig} className="space-y-3">
            <div className="grid gap-px border border-border bg-border sm:grid-cols-[auto_1fr_1fr]">
              <div className="bg-surface px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-fg">Stunde</div>
              <div className="bg-surface px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-fg">Beginn</div>
              <div className="bg-surface px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-fg">Ende</div>
              {Array.from({ length: 9 }, (_, i) => i + 1).map((p) => {
                const config = periodMap.get(p);
                return (
                  <>
                    <div key={`lbl-${p}`} className="bg-bg px-3 py-2 font-mono text-sm font-bold">{p}.</div>
                    <div key={`start-${p}`} className="bg-bg px-2 py-1.5">
                      <input
                        type="time" name={`start_${p}`}
                        defaultValue={config?.startTime ?? DEFAULT_START[p - 1]}
                        className="w-full bg-transparent font-mono text-sm focus:outline-none"
                      />
                    </div>
                    <div key={`end-${p}`} className="bg-bg px-2 py-1.5">
                      <input
                        type="time" name={`end_${p}`}
                        defaultValue={config?.endTime ?? DEFAULT_END[p - 1]}
                        className="w-full bg-transparent font-mono text-sm focus:outline-none"
                      />
                    </div>
                  </>
                );
              })}
            </div>
            <button type="submit" className="bg-fg px-4 py-2 text-sm font-semibold text-bg hover:bg-fg/90">
              Zeiten speichern
            </button>
          </form>
        </CardBody>
      </Card>

      <CsvImportCard />

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Stundenplan-Einträge</CardTitle>
            <p className="mt-1 text-sm text-muted-fg">{timetableEntries.length} Einträge gesamt</p>
          </div>
        </CardHeader>
        <CardBody>
          <form action={saveTimetableEntry} className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto_auto_auto_auto]">
            <select name="classId" required className="h-9 border border-border bg-bg px-2 text-sm">
              <option value="">Klasse…</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select name="teacherId" required className="h-9 border border-border bg-bg px-2 text-sm">
              <option value="">Lehrer…</option>
              {teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <select name="subjectId" required className="h-9 border border-border bg-bg px-2 text-sm">
              <option value="">Fach…</option>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select name="day" required className="h-9 border border-border bg-bg px-2 text-sm">
              <option value="">Tag…</option>
              {DAY_LABELS.map((d, i) => <option key={i + 1} value={i + 1}>{d}</option>)}
            </select>
            <select name="period" required className="h-9 border border-border bg-bg px-2 text-sm">
              <option value="">Std…</option>
              {Array.from({ length: 9 }, (_, i) => i + 1).map((p) => (
                <option key={p} value={p}>{p}.</option>
              ))}
            </select>
            <input name="room" placeholder="Raum (opt.)" className="h-9 border border-border bg-bg px-2 text-sm w-24" />
            <button type="submit" className="h-9 bg-fg px-3 text-sm font-semibold text-bg hover:bg-fg/90">
              <Plus className="size-3.5" />
            </button>
          </form>

          {timetableEntries.length > 0 && (
            <div className="mt-6 divide-y divide-border border border-border">
              {timetableEntries.map((e) => (
                <div key={e.id} className="flex items-center gap-4 px-4 py-3 text-sm">
                  <span
                    className="inline-block size-3 shrink-0"
                    style={{ backgroundColor: e.subject.color }}
                  />
                  <span className="w-8 font-mono font-bold">{e.class.name}</span>
                  <span className="w-20 text-muted-fg">{DAY_LABELS[e.day - 1]}</span>
                  <span className="w-6 font-mono">{e.period}.</span>
                  <span className="flex-1">{e.subject.name}</span>
                  <span className="text-muted-fg">{e.teacher.name}</span>
                  {e.room && <span className="font-mono text-xs text-muted-fg">R. {e.room}</span>}
                  <form action={deleteTimetableEntry.bind(null, e.id)}>
                    <button type="submit" className="text-xs text-muted-fg hover:text-danger">×</button>
                  </form>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
