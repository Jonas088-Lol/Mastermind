/* Copyright 2026 Elian Schock, Jonas Schwenk */
import {
  AlertCircle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Clock,
  FileSignature,
  GraduationCap,
  MessageSquare,
  Sparkles,
  UserX,
} from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db/client";
import { cn } from "@/lib/utils";
import { ROLE_HOME, effectiveRole, getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Eltern" };

interface PageProps {
  searchParams: Promise<{ kind?: string }>;
}

export default async function ElternPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login");

  const effective = effectiveRole(session);
  if (effective !== "parent") redirect(ROLE_HOME[effective]);

  const now = new Date();
  const todayDow = now.getDay() === 0 ? 7 : now.getDay();
  const semesterStart = new Date(now.getFullYear(), 8, 1); // 1. Sep

  const links = await prisma.parentStudentLink.findMany({
    where: { parentId: session.userId },
    include: {
      student: {
        include: {
          school: { select: { name: true } },
          schoolClass: { select: { name: true } },
          studentGrades: {
            include: { subject: { select: { name: true, color: true } } },
            orderBy: { date: "desc" },
            take: 5,
          },
          timetableEntries: {
            where: { day: todayDow },
            include: {
              subject: { select: { name: true, color: true } },
              teacher: { select: { name: true } },
            },
            orderBy: { period: "asc" },
          },
          studentAbsences: {
            where: { fromDate: { gte: semesterStart } },
            select: { id: true, status: true, fromDate: true, toDate: true, reason: true },
            orderBy: { fromDate: "desc" },
          },
          studentAttendance: {
            where: { date: { gte: semesterStart } },
            select: { id: true, status: true, date: true },
            orderBy: { date: "desc" },
            take: 30,
          },
        },
      },
    },
  });

  const { kind } = await searchParams;

  if (links.length === 0) {
    return (
      <div className="mx-auto max-w-7xl">
        <h1 className="text-2xl font-bold">Willkommen</h1>
        <p className="mt-2 text-muted-fg">Kein Kind verknüpft. Bitte wende dich an die Schulleitung.</p>
      </div>
    );
  }

  const activeLink = links.find((l) => l.student.id === kind) ?? links[0];
  const student = activeLink.student;

  const allGrades = student.studentGrades;
  const totalWeight = allGrades.reduce((s, g) => s + g.weight, 0);
  const avgGrade = totalWeight > 0
    ? allGrades.reduce((s, g) => s + g.value * g.weight, 0) / totalWeight
    : null;

  const openTaskCount = student.classId
    ? await prisma.assignment.count({
        where: {
          classId: student.classId,
          dueAt: { gte: now },
          submissions: {
            none: { studentId: student.id, status: { in: ["submitted", "graded"] } },
          },
        },
      })
    : 0;

  const upcomingAssignments = student.classId
    ? await prisma.assignment.findMany({
        where: {
          classId: student.classId,
          dueAt: { gte: now },
        },
        include: { subject: { select: { name: true, color: true } } },
        orderBy: { dueAt: "asc" },
        take: 3,
      })
    : [];

  const myParticipations = await prisma.messageParticipant.findMany({
    where: { userId: session.userId },
    select: { threadId: true, lastReadAt: true },
  });
  let unreadCount = 0;
  for (const p of myParticipations) {
    const lastMsg = await prisma.message.findFirst({
      where: { threadId: p.threadId, senderId: { not: session.userId } },
      orderBy: { sentAt: "desc" },
    });
    if (lastMsg && (!p.lastReadAt || p.lastReadAt < lastMsg.sentAt)) unreadCount++;
  }

  const absences = student.studentAbsences;
  const unexcusedCount = absences.filter((a) => a.status === "pending").length;
  const excusedCount = absences.filter((a) => a.status === "confirmed").length;
  const lateCount = student.studentAttendance.filter((a) => a.status === "verspaetet").length;

  const attendanceDays = student.studentAttendance.length;
  const presentDays = student.studentAttendance.filter((a) => a.status === "anwesend").length;
  const attendancePct = attendanceDays > 0 ? Math.round((presentDays / attendanceDays) * 100) : null;

  const todayLabel = now.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">{todayLabel}</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
            Hallo {session.name.split(" ")[0]}
          </h1>
          <p className="mt-1 text-sm text-muted-fg">
            {unreadCount > 0 ? (
              <>
                <span className="font-semibold text-fg">
                  {unreadCount} ungelesene Nachricht{unreadCount !== 1 ? "en" : ""}
                </span>
                {openTaskCount > 0 && (
                  <> · {openTaskCount} offene Aufgaben für {student.name.split(" ")[0]}</>
                )}
              </>
            ) : openTaskCount > 0 ? (
              <>{openTaskCount} offene Aufgaben für {student.name.split(" ")[0]}</>
            ) : (
              <>Alles auf dem neuesten Stand.</>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/eltern/abwesenheit" className={buttonVariants({ variant: "outline", size: "sm" })}>
            <FileSignature className="size-3.5" />
            Krankmeldung
          </Link>
          <Link href="/eltern/nachrichten/neu" className={buttonVariants({ size: "sm" })}>
            <MessageSquare className="size-3.5" />
            Nachricht an Lehrer
          </Link>
        </div>
      </header>

      {/* Kind-Wechsler */}
      {links.length > 1 && (
        <nav aria-label="Kinder" className="flex gap-px border border-border bg-border">
          {links.map((l) => {
            const isActive = l.student.id === student.id;
            const kidGrades = l.student.studentGrades;
            const kidWeight = kidGrades.reduce((s, g) => s + g.weight, 0);
            const kidAvg = kidWeight > 0
              ? kidGrades.reduce((s, g) => s + g.value * g.weight, 0) / kidWeight
              : null;
            return (
              <Link
                key={l.student.id}
                href={`/eltern?kind=${l.student.id}`}
                className={cn(
                  "flex flex-1 items-center gap-3 px-5 py-4 transition-colors",
                  isActive ? "bg-bg" : "bg-bg/60 hover:bg-bg"
                )}
                aria-current={isActive ? "page" : undefined}
              >
                <Avatar name={l.student.name} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{l.student.name}</p>
                  <p className="truncate text-xs text-muted-fg">
                    Klasse {l.student.klasse ?? "—"}
                    {kidAvg ? ` · Ø ${kidAvg.toFixed(1).replace(".", ",")}` : ""}
                  </p>
                </div>
              </Link>
            );
          })}
        </nav>
      )}

      {/* Kennzahlen */}
      <section className="grid grid-cols-2 gap-px border border-border bg-border lg:grid-cols-5">
        <Stat
          label="Ø-Note"
          value={avgGrade ? avgGrade.toFixed(1).replace(".", ",") : "—"}
          icon={GraduationCap}
          tone="text-brand"
          suffix="alle Fächer"
          href="/eltern/noten/verlauf"
          hrefLabel="Verlauf ansehen"
        />
        <Stat
          label="Anwesenheit"
          value={attendancePct !== null ? `${attendancePct}%` : "—"}
          icon={CheckCircle2}
          tone={attendancePct !== null && attendancePct < 90 ? "text-danger" : "text-success"}
          suffix={attendanceDays > 0 ? `${attendanceDays} erfasste Tage` : "kein Eintrag"}
        />
        <Stat
          label="Fehlzeiten"
          value={String(unexcusedCount + excusedCount)}
          icon={UserX}
          tone={unexcusedCount > 3 ? "text-danger" : "text-muted-fg"}
          suffix={`${unexcusedCount} unentsch. · ${excusedCount} entsch.`}
        />
        <Stat
          label="Verspätungen"
          value={String(lateCount)}
          icon={Clock}
          tone={lateCount > 5 ? "text-warning" : "text-muted-fg"}
          suffix="dieses Semester"
        />
        <Stat
          label="Offene Aufgaben"
          value={String(openTaskCount)}
          icon={AlertCircle}
          tone={openTaskCount > 0 ? "text-warning" : "text-muted-fg"}
          suffix="aktuell fällig"
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          {/* Noten */}
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Aktuelle Noten · {student.name.split(" ")[0]}</CardTitle>
                <p className="mt-1 text-sm text-muted-fg">Letzte Einträge</p>
              </div>
              <Link href="/eltern/noten" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                Alle Noten
                <ArrowRight className="size-3.5" />
              </Link>
            </CardHeader>
            <CardBody className="px-0! pb-0!">
              {allGrades.length === 0 ? (
                <div className="border-t border-border px-5 py-6 text-sm text-muted-fg">
                  Noch keine Noten eingetragen.
                </div>
              ) : (
                <ul className="divide-y divide-border border-t border-border">
                  {allGrades.map((g, i) => (
                    <li key={i} className="flex items-center gap-4 px-5 py-3.5">
                      <span
                        className="inline-block size-3 shrink-0 rounded-full"
                        style={{ backgroundColor: g.subject.color }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{g.subject.name}</p>
                        <p className="text-xs text-muted-fg">
                          {g.date.toLocaleDateString("de-DE", { day: "numeric", month: "short" })}
                          {g.comment && ` · ${g.comment}`}
                        </p>
                      </div>
                      <p
                        className={cn(
                          "font-mono text-lg font-bold tabular-nums",
                          g.value >= 4 && "text-danger",
                          g.value >= 3 && g.value < 4 && "text-warning"
                        )}
                      >
                        {g.value.toFixed(1).replace(".", ",")}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          {/* Fehlzeiten */}
          {absences.length > 0 && (
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Fehlzeiten · dieses Semester</CardTitle>
                  <p className="mt-1 text-sm text-muted-fg">
                    {unexcusedCount} unentschuldigt · {excusedCount} entschuldigt
                  </p>
                </div>
              </CardHeader>
              <CardBody className="px-0! pb-0!">
                <ul className="divide-y divide-border border-t border-border">
                  {absences.slice(0, 8).map((a) => (
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
                          a.status === "pending" ? "text-warning" : a.status === "confirmed" ? "text-success" : "text-danger"
                        )}
                      >
                        {a.status === "confirmed"
                          ? "Entschuldigt"
                          : a.status === "rejected"
                          ? "Abgelehnt"
                          : "Ausstehend"}
                      </span>
                      {a.reason && <span className="text-muted-fg">{a.reason}</span>}
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          )}

          {/* Stundenplan heute */}
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Heute · Stundenplan</CardTitle>
                <p className="mt-1 text-sm text-muted-fg">
                  {student.timetableEntries.length} Stunden
                </p>
              </div>
              <Link href="/eltern/stundenplan" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                Woche
                <ArrowRight className="size-3.5" />
              </Link>
            </CardHeader>
            <CardBody className="px-0! pb-0!">
              {student.timetableEntries.length === 0 ? (
                <div className="border-t border-border px-5 py-6 text-sm text-muted-fg">
                  Kein Stundenplan für heute.
                </div>
              ) : (
                <ol className="divide-y divide-border border-t border-border">
                  {student.timetableEntries.map((e) => (
                    <li key={e.id} className="flex items-center gap-4 px-5 py-3 text-sm">
                      <span className="w-5 font-mono text-xs text-muted-fg">{e.period}.</span>
                      <span
                        className="inline-block size-2 shrink-0"
                        style={{ backgroundColor: e.subject.color }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold">{e.subject.name}</p>
                        <p className="text-xs text-muted-fg">
                          {e.teacher.name} · Raum {e.room ?? "—"}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Nachrichten */}
          <Card>
            <CardHeader>
              <CardTitle>Nachrichten</CardTitle>
              {unreadCount > 0 && <Badge variant="brand">{unreadCount}</Badge>}
            </CardHeader>
            <CardBody className="px-0! pb-0!">
              <div className="border-t border-border px-5 py-4">
                <Link
                  href="/eltern/nachrichten"
                  className={buttonVariants({ variant: "outline", size: "sm" }) + " w-full"}
                >
                  <MessageSquare className="size-3.5" />
                  Nachrichten öffnen
                </Link>
              </div>
            </CardBody>
          </Card>

          {/* Anstehende Aufgaben */}
          {upcomingAssignments.length > 0 && (
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Nächste Aufgaben</CardTitle>
                  <p className="mt-1 text-sm text-muted-fg">für {student.name.split(" ")[0]}</p>
                </div>
              </CardHeader>
              <CardBody className="px-0! pb-0!">
                <ul className="divide-y divide-border border-t border-border">
                  {upcomingAssignments.map((a) => {
                    const daysLeft = Math.ceil(
                      (a.dueAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
                    );
                    return (
                      <li key={a.id} className="px-5 py-3 text-sm">
                        <div className="flex items-start gap-2">
                          <span
                            className="mt-1 size-2 shrink-0"
                            style={{ backgroundColor: a.subject?.color ?? "#6366f1" }}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium">{a.title}</p>
                            <p className="text-xs text-muted-fg">
                              {a.subject?.name} ·{" "}
                              <span
                                className={cn(
                                  daysLeft <= 1 ? "text-danger font-semibold" : "text-muted-fg"
                                )}
                              >
                                {daysLeft === 0
                                  ? "heute"
                                  : daysLeft === 1
                                  ? "morgen"
                                  : `in ${daysLeft} Tagen`}
                              </span>
                            </p>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </CardBody>
            </Card>
          )}

          {/* Schnell-Aktionen */}
          <Card className="border-brand/40 bg-linear-to-br from-brand/8 to-transparent">
            <CardBody className="p-5!">
              <div className="flex items-center gap-2">
                <CalendarClock className="size-4 text-brand" strokeWidth={1.75} />
                <p className="text-xs font-semibold uppercase tracking-wider text-brand">Schnellzugriff</p>
              </div>
              <ul className="mt-4 space-y-2">
                {[
                  { href: "/eltern/noten", label: "Alle Noten" },
                  { href: "/eltern/aufgaben", label: "Aufgaben" },
                  { href: "/eltern/abwesenheit", label: "Krankmeldung" },
                ].map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="flex items-center justify-between text-sm font-medium hover:text-brand"
                    >
                      {link.label}
                      <ArrowRight className="size-3.5 text-muted-fg" />
                    </Link>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
  tone,
  suffix,
  href,
  hrefLabel,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  tone: string;
  suffix: string;
  href?: string;
  hrefLabel?: string;
}) {
  return (
    <div className="bg-bg p-5">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">{label}</p>
        <Icon className={cn("size-4", tone)} strokeWidth={1.75} />
      </div>
      <p className="mt-3 font-mono text-3xl font-bold tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-muted-fg">{suffix}</p>
      {href && (
        <Link href={href} className="mt-1.5 inline-block text-xs font-medium text-brand hover:underline">
          {hrefLabel ?? "Mehr"}
        </Link>
      )}
    </div>
  );
}
