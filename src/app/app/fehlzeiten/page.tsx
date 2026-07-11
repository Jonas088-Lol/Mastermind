import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AlertTriangle, CheckCircle2, Clock, Info, XCircle } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession, ROLE_HOME } from "@/lib/session";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Fehlzeiten · Schüler" };

const ABSENCE_STATUS: Record<string, { label: string; icon: typeof Clock; cls: string }> = {
  pending:   { label: "Ausstehend",  icon: Clock,         cls: "text-warning" },
  confirmed: { label: "Bestätigt",   icon: CheckCircle2,  cls: "text-success" },
  rejected:  { label: "Abgelehnt",   icon: XCircle,       cls: "text-danger"  },
};

// AttendanceRecord.status: anwesend | fehlt | verspaetet | entschuldigt
const RECORD_BADGE: Record<string, { label: string; cls: string }> = {
  entschuldigt: { label: "Entschuldigt",   cls: "border-success/40 bg-success/10 text-success" },
  fehlt:        { label: "Unentschuldigt", cls: "border-danger/40 bg-danger/10 text-danger" },
  verspaetet:   { label: "Verspätet",      cls: "border-warning/40 bg-warning/10 text-warning" },
};

/** Schuljahresbeginn: 1. August des laufenden Schuljahres. */
function schoolYearStart(now: Date): Date {
  const year = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
  return new Date(year, 7, 1);
}

export default async function SchuelerFehlzeitenPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "student") redirect(ROLE_HOME[effectiveRole(session)]);

  const yearStart = schoolYearStart(new Date());

  const [absences, records] = await Promise.all([
    prisma.absence.findMany({
      where: { studentId: session.userId },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    prisma.attendanceRecord.findMany({
      where: { studentId: session.userId, date: { gte: yearStart } },
      orderBy: { date: "desc" },
      take: 300,
    }),
  ]);

  // ── Statistik (Schuljahr) ──────────────────────────────
  const excused = records.filter((r) => r.status === "entschuldigt").length;
  const unexcused = records.filter((r) => r.status === "fehlt").length;
  const late = records.filter((r) => r.status === "verspaetet").length;
  const present = records.filter((r) => r.status === "anwesend").length;
  const totalAbsent = excused + unexcused;
  const rateBase = present + totalAbsent;
  const attendanceRate = rateBase > 0 ? Math.round((present / rateBase) * 100) : null;

  const stats: { label: string; value: string; cls?: string }[] = [
    { label: "Fehlstunden gesamt", value: String(totalAbsent) },
    { label: "Entschuldigt", value: String(excused), cls: "text-success" },
    { label: "Unentschuldigt", value: String(unexcused), cls: unexcused > 0 ? "text-danger" : undefined },
    { label: "Verspätungen", value: String(late), cls: late > 0 ? "text-warning" : undefined },
  ];
  if (attendanceRate !== null) {
    stats.push({ label: "Anwesenheitsquote", value: `${attendanceRate} %` });
  }

  // ── Monats-Gruppierung (nur Nicht-Anwesend-Einträge) ───
  const relevant = records.filter((r) => r.status !== "anwesend");
  const byMonth = new Map<string, typeof relevant>();
  for (const r of relevant) {
    const key = r.date.toLocaleDateString("de-DE", { month: "long", year: "numeric" });
    const list = byMonth.get(key);
    if (list) list.push(r);
    else byMonth.set(key, [r]);
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Fehlzeiten</h1>
        <p className="mt-1 text-sm text-muted-fg">
          Deine Fehlzeiten und Verspätungen im laufenden Schuljahr.
        </p>
      </header>

      {/* Statistik-Kopf */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="border border-border bg-surface px-4 py-3">
            <p className={cn("font-mono text-xl font-bold tabular-nums", s.cls)}>{s.value}</p>
            <p className="mt-0.5 text-xs text-muted-fg">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Hinweis bei unentschuldigten Fehlzeiten */}
      {unexcused > 0 && (
        <div className="flex items-start gap-3 border border-danger/30 bg-danger/5 px-5 py-4">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-danger" strokeWidth={1.75} />
          <div>
            <p className="text-sm font-semibold">Unentschuldigte Fehlzeiten</p>
            <p className="mt-0.5 text-xs text-muted-fg">
              Du hast {unexcused} unentschuldigte {unexcused === 1 ? "Fehlstunde" : "Fehlstunden"}.
              Bitte reiche eine Entschuldigung nach — deine Eltern können das im
              Eltern-Portal unter "Abwesenheiten" erledigen.
            </p>
          </div>
        </div>
      )}

      <div className="flex items-start gap-3 border border-info/30 bg-info/5 px-5 py-4">
        <Info className="mt-0.5 size-4 shrink-0 text-info" strokeWidth={1.75} />
        <div>
          <p className="text-sm font-semibold">Krankmeldungen über deine Eltern</p>
          <p className="mt-0.5 text-xs text-muted-fg">
            Abwesenheiten müssen von einem Erziehungsberechtigten gemeldet werden.
            Deine Eltern können dies im Eltern-Portal unter "Abwesenheiten" tun.
          </p>
        </div>
      </div>

      {/* Einträge nach Monat */}
      <Card>
        <CardHeader>
          <CardTitle>Einträge im Klassenbuch</CardTitle>
          <span className="font-mono text-xs text-muted-fg">{relevant.length} Einträge</span>
        </CardHeader>
        <CardBody className="px-0! pb-0!">
          {relevant.length === 0 ? (
            <p className="px-5 py-6 text-sm text-muted-fg">
              Keine Fehlzeiten oder Verspätungen im laufenden Schuljahr.
            </p>
          ) : (
            <div className="border-t border-border">
              {[...byMonth.entries()].map(([month, entries]) => (
                <section key={month}>
                  <h2 className="border-b border-border bg-surface px-5 py-2 text-xs font-semibold uppercase tracking-wide text-muted-fg">
                    {month}
                  </h2>
                  <ul className="divide-y divide-border">
                    {entries.map((r) => {
                      const badge = RECORD_BADGE[r.status];
                      return (
                        <li key={r.id} className="flex items-center gap-4 px-5 py-3.5 text-sm">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium">
                              {r.date.toLocaleDateString("de-DE", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
                            </p>
                            {r.reason && <p className="truncate text-xs text-muted-fg">{r.reason}</p>}
                          </div>
                          {badge && (
                            <span className={cn("shrink-0 border px-2 py-0.5 text-xs font-medium", badge.cls)}>
                              {badge.label}
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Gemeldete Abwesenheiten */}
      <Card>
        <CardHeader>
          <CardTitle>Gemeldete Abwesenheiten</CardTitle>
          <span className="font-mono text-xs text-muted-fg">{absences.length} Einträge</span>
        </CardHeader>
        <CardBody className="px-0! pb-0!">
          {absences.length === 0 ? (
            <p className="px-5 py-6 text-sm text-muted-fg">Noch keine Abwesenheiten gemeldet.</p>
          ) : (
            <ul className="divide-y divide-border border-t border-border">
              {absences.map((a) => {
                const s = ABSENCE_STATUS[a.status] ?? ABSENCE_STATUS.pending;
                const Icon = s.icon;
                return (
                  <li key={a.id} className="flex items-center gap-4 px-5 py-3.5 text-sm">
                    <Icon className={cn("size-4 shrink-0", s.cls)} strokeWidth={1.75} />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">
                        {a.fromDate.toLocaleDateString("de-DE", { day: "numeric", month: "short" })}
                        {" – "}
                        {a.toDate.toLocaleDateString("de-DE", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                      {a.reason && <p className="text-xs text-muted-fg">{a.reason}</p>}
                    </div>
                    <span className={cn("text-xs font-medium", s.cls)}>{s.label}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
