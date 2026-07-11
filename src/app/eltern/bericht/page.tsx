import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  CheckCircle2,
  Flame,
  GraduationCap,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Minus,
  UserX,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db/client";
import { ROLE_HOME, effectiveRole, getSession } from "@/lib/session";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Wochenbericht · Eltern" };

const DAY_LABELS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

function gradeBadgeVariant(v: number): "success" | "warning" | "danger" | "neutral" {
  if (v >= 4.5) return "danger";
  if (v >= 3.5) return "warning";
  if (v <= 2.0) return "success";
  return "neutral";
}

export default async function WochenberichtPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "parent") redirect(ROLE_HOME[effectiveRole(session)]);

  const { kind } = await searchParams;

  const now = new Date();
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const prevWeekStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const links = await prisma.parentStudentLink.findMany({
    where: { parentId: session.userId },
    include: {
      student: {
        select: {
          id: true,
          name: true,
          streak: true,
          schoolClass: { select: { name: true } },
        },
      },
    },
    orderBy: { student: { name: "asc" } },
  });

  if (links.length === 0) {
    return (
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-bold">Wochenbericht</h1>
        <p className="mt-2 text-sm text-muted-fg">
          Kein Kind mit deinem Konto verknüpft. Bitte wende dich an die Schulleitung.
        </p>
      </div>
    );
  }

  const activeLink = links.find((l) => l.student.id === kind) ?? links[0];
  const student = activeLink.student;

  const [xpLogs, exerciseAnswers, grades, attendance, absences] = await Promise.all([
    prisma.xpLog.findMany({
      where: { userId: student.id, createdAt: { gte: prevWeekStart } },
      select: { amount: true, createdAt: true },
    }),
    prisma.exerciseAnswer.findMany({
      where: { userId: student.id, createdAt: { gte: weekStart } },
      select: { correct: true },
    }),
    prisma.grade.findMany({
      where: { studentId: student.id, date: { gte: weekStart } },
      include: { subject: { select: { name: true, color: true } } },
      orderBy: { date: "desc" },
    }),
    prisma.attendanceRecord.findMany({
      where: { studentId: student.id, date: { gte: weekStart } },
      select: { id: true, date: true, status: true },
      orderBy: { date: "desc" },
    }),
    prisma.absence.findMany({
      where: { studentId: student.id, fromDate: { gte: weekStart } },
      select: { id: true, fromDate: true, toDate: true, status: true, reason: true },
      orderBy: { fromDate: "desc" },
    }),
  ]);

  // XP: diese Woche vs. Vorwoche
  const xpThisWeek = xpLogs
    .filter((l) => l.createdAt >= weekStart)
    .reduce((s, l) => s + l.amount, 0);
  const xpPrevWeek = xpLogs
    .filter((l) => l.createdAt < weekStart)
    .reduce((s, l) => s + l.amount, 0);
  const xpDiff = xpThisWeek - xpPrevWeek;
  const XpTrendIcon = xpDiff > 0 ? TrendingUp : xpDiff < 0 ? TrendingDown : Minus;
  const xpTrendClass = xpDiff > 0 ? "text-success" : xpDiff < 0 ? "text-danger" : "text-muted-fg";

  // Mini-Balken: XP pro Wochentag (Mo..So der letzten 7 Tage)
  const dayBuckets: { label: string; xp: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i + 1);
    const dow = dayStart.getDay() === 0 ? 6 : dayStart.getDay() - 1;
    const xp = xpLogs
      .filter((l) => l.createdAt >= dayStart && l.createdAt < dayEnd)
      .reduce((s, l) => s + l.amount, 0);
    dayBuckets.push({ label: DAY_LABELS[dow], xp });
  }
  const maxDayXp = Math.max(1, ...dayBuckets.map((d) => d.xp));

  // Übungen
  const correctCount = exerciseAnswers.filter((a) => a.correct).length;
  const wrongCount = exerciseAnswers.length - correctCount;
  const correctPct =
    exerciseAnswers.length > 0 ? Math.round((correctCount / exerciseAnswers.length) * 100) : null;

  // Fehlzeiten
  const missedRecords = attendance.filter((a) => a.status === "fehlt");
  const lateRecords = attendance.filter((a) => a.status === "verspaetet");

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">
          Letzte 7 Tage
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Wochenbericht</h1>
        <p className="mt-1 text-sm text-muted-fg">
          Lernaktivität, Noten und Anwesenheit von {student.name.split(" ")[0]} auf einen Blick.
        </p>
      </header>

      {/* Kind-Wechsler */}
      {links.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {links.map((l) => {
            const isActive = l.student.id === student.id;
            return (
              <a
                key={l.student.id}
                href={`/eltern/bericht?kind=${l.student.id}`}
                className={cn(
                  "rounded-xl px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors",
                  isActive ? "bg-fg text-bg" : "bg-surface-2 text-muted-fg hover:text-fg"
                )}
                aria-current={isActive ? "page" : undefined}
              >
                {l.student.name}
              </a>
            );
          })}
        </div>
      )}

      {/* Kennzahlen */}
      <section className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-4">
        <div className="bg-bg p-5">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">XP</p>
            <Sparkles className="size-4 text-brand" strokeWidth={1.75} />
          </div>
          <p className="mt-3 font-mono text-3xl font-bold tabular-nums">
            {xpThisWeek.toLocaleString("de-DE")}
          </p>
          <div className="mt-1 flex items-center gap-1">
            <XpTrendIcon className={cn("size-3.5", xpTrendClass)} strokeWidth={2} />
            <span className="text-xs text-muted-fg">
              Vorwoche: {xpPrevWeek.toLocaleString("de-DE")} XP
            </span>
          </div>
        </div>
        <div className="bg-bg p-5">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">
              Übungen
            </p>
            <CheckCircle2
              className={cn(
                "size-4",
                correctPct !== null && correctPct >= 70 ? "text-success" : "text-muted-fg"
              )}
              strokeWidth={1.75}
            />
          </div>
          <p className="mt-3 font-mono text-3xl font-bold tabular-nums">
            {correctPct !== null ? `${correctPct}%` : "—"}
          </p>
          <p className="mt-1 text-xs text-muted-fg">
            {exerciseAnswers.length > 0
              ? `${correctCount} richtig · ${wrongCount} falsch`
              : "keine Antworten"}
          </p>
        </div>
        <div className="bg-bg p-5">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">
              Neue Noten
            </p>
            <GraduationCap className="size-4 text-brand" strokeWidth={1.75} />
          </div>
          <p className="mt-3 font-mono text-3xl font-bold tabular-nums">{grades.length}</p>
          <p className="mt-1 text-xs text-muted-fg">diese Woche</p>
        </div>
        <div className="bg-bg p-5">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">
              Streak
            </p>
            <Flame
              className={cn("size-4", student.streak > 0 ? "text-warning" : "text-muted-fg")}
              strokeWidth={1.75}
            />
          </div>
          <p className="mt-3 font-mono text-3xl font-bold tabular-nums">{student.streak}</p>
          <p className="mt-1 text-xs text-muted-fg">Tage in Folge</p>
        </div>
      </section>

      {/* XP pro Wochentag */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>XP pro Tag</CardTitle>
            <p className="mt-1 text-sm text-muted-fg">Letzte 7 Tage</p>
          </div>
        </CardHeader>
        <CardBody>
          <div className="flex h-32 items-end gap-2 sm:gap-3">
            {dayBuckets.map((d, i) => (
              <div key={i} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
                <span className="font-mono text-[10px] tabular-nums text-muted-fg">
                  {d.xp > 0 ? d.xp : ""}
                </span>
                <div
                  className={cn(
                    "w-full rounded-t-md",
                    d.xp > 0 ? "bg-brand" : "bg-surface-2"
                  )}
                  style={{ height: `${Math.max(4, Math.round((d.xp / maxDayXp) * 88))}px` }}
                  aria-label={`${d.label}: ${d.xp} XP`}
                />
                <span
                  className={cn(
                    "text-[11px] font-medium",
                    i === 6 ? "text-fg" : "text-muted-fg"
                  )}
                >
                  {d.label}
                </span>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* Neue Noten */}
      <Card>
        <CardHeader>
          <CardTitle>Neue Noten</CardTitle>
          <span className="text-xs text-muted-fg">{grades.length} diese Woche</span>
        </CardHeader>
        <CardBody className="px-0! pb-0!">
          {grades.length === 0 ? (
            <div className="border-t border-border px-5 py-6 text-sm text-muted-fg">
              Keine neuen Noten in dieser Woche.
            </div>
          ) : (
            <ul className="divide-y divide-border border-t border-border">
              {grades.map((g) => (
                <li key={g.id} className="flex items-center gap-4 px-5 py-3 text-sm">
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: g.subject.color }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{g.subject.name}</p>
                    <p className="text-xs text-muted-fg">
                      {g.date.toLocaleDateString("de-DE", { weekday: "short", day: "numeric", month: "short" })}
                      {g.comment && ` · ${g.comment}`}
                    </p>
                  </div>
                  <Badge variant={gradeBadgeVariant(g.value)}>
                    {g.value.toFixed(1).replace(".", ",")}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      {/* Fehlzeiten */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Anwesenheit</CardTitle>
            <p className="mt-1 text-sm text-muted-fg">
              {missedRecords.length} gefehlt · {lateRecords.length} verspätet
            </p>
          </div>
          <UserX
            className={cn(
              "size-4",
              missedRecords.length > 0 ? "text-danger" : "text-muted-fg"
            )}
            strokeWidth={1.75}
          />
        </CardHeader>
        <CardBody className="px-0! pb-0!">
          {missedRecords.length === 0 && lateRecords.length === 0 && absences.length === 0 ? (
            <div className="border-t border-border px-5 py-6 text-sm text-muted-fg">
              Keine Fehlzeiten in dieser Woche.
            </div>
          ) : (
            <ul className="divide-y divide-border border-t border-border">
              {[...missedRecords, ...lateRecords]
                .sort((a, b) => b.date.getTime() - a.date.getTime())
                .map((r) => (
                  <li key={r.id} className="flex items-center gap-4 px-5 py-3 text-sm">
                    <span className="font-mono text-xs text-muted-fg">
                      {r.date.toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" })}
                    </span>
                    <span
                      className={cn(
                        "text-xs font-semibold",
                        r.status === "fehlt" ? "text-danger" : "text-warning"
                      )}
                    >
                      {r.status === "fehlt" ? "Gefehlt" : "Verspätet"}
                    </span>
                  </li>
                ))}
              {absences.map((a) => (
                <li key={a.id} className="flex items-center gap-4 px-5 py-3 text-sm">
                  <span className="font-mono text-xs text-muted-fg">
                    {a.fromDate.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })}
                    {a.fromDate.toDateString() !== a.toDate.toDateString() && (
                      <> – {a.toDate.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })}</>
                    )}
                  </span>
                  <span
                    className={cn(
                      "text-xs font-semibold",
                      a.status === "confirmed"
                        ? "text-success"
                        : a.status === "rejected"
                        ? "text-danger"
                        : "text-warning"
                    )}
                  >
                    {a.status === "confirmed"
                      ? "Entschuldigt"
                      : a.status === "rejected"
                      ? "Abgelehnt"
                      : "Ausstehend"}
                  </span>
                  {a.reason && <span className="truncate text-muted-fg">{a.reason}</span>}
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      {/* Übungs-Detail */}
      {exerciseAnswers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Übungs-Antworten</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-8">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-success" strokeWidth={1.75} />
                <span className="text-sm">
                  <span className="font-mono font-bold tabular-nums">{correctCount}</span>{" "}
                  <span className="text-muted-fg">richtig</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <XCircle className="size-4 text-danger" strokeWidth={1.75} />
                <span className="text-sm">
                  <span className="font-mono font-bold tabular-nums">{wrongCount}</span>{" "}
                  <span className="text-muted-fg">falsch</span>
                </span>
              </div>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
                <div
                  className="h-full rounded-full bg-success"
                  style={{ width: `${correctPct ?? 0}%` }}
                />
              </div>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
