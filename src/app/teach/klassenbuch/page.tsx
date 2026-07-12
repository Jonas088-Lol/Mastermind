/* Copyright 2026 Elian Schock, Jonas Schwenk */
import {
  AlertTriangle,
  BookMarked,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardEdit,
  ClipboardList,
  PenLine,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { AttendanceButtons } from "./AttendanceButtons";
import { deleteIncident, signLesson } from "./actions";

export const metadata: Metadata = { title: "Klassenbuch" };

interface PageProps {
  searchParams: Promise<{ date?: string }>;
}

export default async function KlassenbuchPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "teacher") redirect("/");

  const { date: dateParam } = await searchParams;

  const displayDate = dateParam ? new Date(dateParam) : new Date();
  const dayStart = new Date(displayDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart.getTime() + 86400000);

  const prevDate = new Date(dayStart.getTime() - 86400000)
    .toISOString()
    .slice(0, 10);
  const nextDate = new Date(dayStart.getTime() + 86400000)
    .toISOString()
    .slice(0, 10);
  const todayStr = new Date().toISOString().slice(0, 10);
  const isToday = dayStart.toISOString().slice(0, 10) === todayStr;

  const lessons = await prisma.lessonLog.findMany({
    where: {
      teacherId: session.userId,
      date: { gte: dayStart, lt: dayEnd },
    },
    include: {
      class: { select: { id: true, name: true } },
      subject: { select: { name: true, shortName: true, color: true } },
      attendanceRecords: {
        include: { student: { select: { id: true, name: true } } },
      },
    },
    orderBy: { period: "asc" },
  });

  const incidents = await prisma.classbookIncident.findMany({
    where: {
      teacherId: session.userId,
      date: { gte: dayStart, lt: dayEnd },
    },
    include: {
      student: { select: { id: true, name: true } },
      class: { select: { name: true } },
    },
    orderBy: { date: "desc" },
  });

  const allRecords = lessons.flatMap((l) => l.attendanceRecords);
  const totalPresent = allRecords.filter((a) => a.status === "anwesend").length;
  const totalMissing = allRecords.filter(
    (a) => a.status === "fehlt" || a.status === "verspaetet"
  ).length;
  const signedLessons = lessons.filter((l) => l.signedAt).length;

  const dateLabel = displayDate.toLocaleDateString("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">
            Klassenbuch
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
            {dateLabel}
          </h1>
          <p className="mt-1 text-sm text-muted-fg">
            {lessons.length} Stunden eingetragen · {signedLessons} signiert
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/teach/klassenbuch?date=${prevDate}`}
            aria-label="Vorheriger Tag"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <ChevronLeft className="size-4" />
          </Link>
          {!isToday ? (
            <Link
              href="/teach/klassenbuch"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <Calendar className="size-3.5" />
              Heute
            </Link>
          ) : (
            <span
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "pointer-events-none opacity-50"
              )}
            >
              <Calendar className="size-3.5" />
              Heute
            </span>
          )}
          <Link
            href={`/teach/klassenbuch?date=${nextDate}`}
            aria-label="Nächster Tag"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <ChevronRight className="size-4" />
          </Link>
          <Link
            href="/teach/klassenbuch/neu"
            className={buttonVariants({ size: "sm" })}
          >
            <Plus className="size-3.5" />
            Eintrag hinzufügen
          </Link>
          <Link
            href="/teach/klassenbuch/vorfall"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <PenLine className="size-3.5" />
            Vorfall erfassen
          </Link>
        </div>
      </header>

      {/* Stats row */}
      <section className="grid grid-cols-2 gap-px border border-border bg-border lg:grid-cols-4">
        <StatBox
          label="Anwesend"
          value={String(totalPresent)}
          suffix={`von ${allRecords.length} gesamt`}
          icon={Users}
          tone="text-success"
        />
        <StatBox
          label="Fehlend"
          value={String(totalMissing)}
          suffix={`${allRecords.filter((a) => a.status === "entschuldigt").length} entschuldigt`}
          icon={AlertTriangle}
          tone={totalMissing > 0 ? "text-warning" : "text-muted-fg"}
        />
        <StatBox
          label="Stunden eingetragen"
          value={String(lessons.length)}
          suffix={`${signedLessons} signiert`}
          icon={ClipboardEdit}
          tone="text-info"
        />
        <StatBox
          label="Vorfälle heute"
          value={String(incidents.length)}
          suffix={`${incidents.filter((i) => i.type === "Verweis").length} Verweis · ${incidents.filter((i) => i.type === "Lob").length} Lob`}
          icon={PenLine}
          tone="text-brand"
        />
      </section>

      {/* Lessons */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Stunden</CardTitle>
            <p className="mt-1 text-sm text-muted-fg">
              Themen, Hausaufgaben und Anwesenheit
            </p>
          </div>
        </CardHeader>
        <CardBody className="px-0! pb-0!">
          {lessons.length === 0 ? (
            <div className="grid place-items-center border-t border-border p-12 text-center">
              <ClipboardList className="size-8 text-muted-fg" strokeWidth={1.5} />
              <p className="mt-4 text-base font-semibold">
                Keine Einträge für diesen Tag
              </p>
              <p className="mt-1 text-sm text-muted-fg">
                Erstelle einen neuen Stundeneintrag.
              </p>
              <Link
                href="/teach/klassenbuch/neu"
                className={cn(
                  buttonVariants({ size: "sm" }),
                  "mt-4"
                )}
              >
                <Plus className="size-3.5" />
                Eintrag hinzufügen
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-border border-t border-border">
              {lessons.map((lesson) => (
                <li key={lesson.id} className="flex flex-col gap-0">
                  {/* Lesson header */}
                  <div className="grid grid-cols-1 gap-3 px-5 py-4 lg:grid-cols-[auto_1fr_auto] lg:items-center lg:gap-6">
                    <div className="flex shrink-0 items-center gap-3 lg:w-36">
                      <div
                        className="grid size-12 shrink-0 place-items-center text-white"
                        style={{
                          backgroundColor: lesson.subject.color,
                        }}
                      >
                        <BookMarked className="size-4" strokeWidth={1.75} />
                      </div>
                      <div>
                        <p className="font-mono text-xs font-bold">
                          {lesson.period}
                        </p>
                        <p className="text-xs text-muted-fg">
                          {lesson.class.name} · {lesson.subject.shortName}
                        </p>
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">{lesson.topic}</p>
                      {lesson.homework && (
                        <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-fg">
                          <ClipboardEdit className="size-3" />
                          HA: {lesson.homework}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-muted-fg">
                        {lesson.attendanceRecords.length} Schüler erfasst ·{" "}
                        {
                          lesson.attendanceRecords.filter(
                            (r) => r.status === "anwesend"
                          ).length
                        }{" "}
                        anwesend
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {lesson.signedAt ? (
                        <Badge variant="success">
                          <Check className="size-3" />
                          Signiert
                        </Badge>
                      ) : (
                        <form action={signLesson.bind(null, lesson.id)}>
                          <button
                            type="submit"
                            className={buttonVariants({ size: "sm" })}
                          >
                            <PenLine className="size-3.5" />
                            Signieren
                          </button>
                        </form>
                      )}
                    </div>
                  </div>

                  {/* Attendance rows */}
                  {lesson.attendanceRecords.length > 0 && (
                    <ul className="border-t border-border bg-surface">
                      {lesson.attendanceRecords.map((record) => (
                        <li
                          key={record.id}
                          className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-3 border-b border-border px-5 py-2.5 last:border-b-0"
                        >
                          <Avatar name={record.student.name} size="sm" />
                          <p className="truncate text-sm font-medium">
                            {record.student.name}
                          </p>
                          <AttendanceStatusBadge status={record.status} />
                          <AttendanceButtons
                            recordId={record.id}
                            lessonId={lesson.id}
                            studentId={record.studentId}
                            currentStatus={record.status}
                          />
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      {/* Incidents */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Vorfälle & Bemerkungen</CardTitle>
            <p className="mt-1 text-sm text-muted-fg">
              {incidents.length > 0
                ? `${incidents.length} Eintrag${incidents.length !== 1 ? "e" : ""} für diesen Tag`
                : "Keine Vorfälle für diesen Tag"}
            </p>
          </div>
          <Link
            href="/teach/klassenbuch/vorfall"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <PenLine className="size-3.5" />
            Vorfall erfassen
          </Link>
        </CardHeader>
        {incidents.length > 0 && (
          <CardBody className="px-0! pb-0!">
            <ul className="divide-y divide-border border-t border-border">
              {incidents.map((inc) => {
                const tone =
                  inc.type === "Verweis"
                    ? "danger"
                    : inc.type === "Lob"
                      ? "success"
                      : "warning";
                return (
                  <li
                    key={inc.id}
                    className="flex items-start gap-4 px-5 py-4"
                  >
                    <Avatar name={inc.student.name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={tone}>{inc.type}</Badge>
                        <p className="text-sm font-semibold">
                          {inc.student.name}
                        </p>
                        <Badge variant="outline">{inc.class.name}</Badge>
                      </div>
                      <p className="mt-1.5 text-sm">{inc.text}</p>
                      <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-muted-fg">
                        {inc.date.toLocaleDateString("de-DE", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <form action={deleteIncident.bind(null, inc.id)} className="shrink-0">
                      <button
                        type="submit"
                        title="Vorfall löschen"
                        className="text-muted-fg hover:text-danger"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </form>
                  </li>
                );
              })}
            </ul>
          </CardBody>
        )}
      </Card>
    </div>
  );
}

function StatBox({
  label,
  value,
  suffix,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  suffix: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  tone: string;
}) {
  return (
    <div className="bg-bg p-5">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">
          {label}
        </p>
        <Icon className={cn("size-4", tone)} strokeWidth={1.75} />
      </div>
      <p className="mt-3 font-mono text-3xl font-bold tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-muted-fg">{suffix}</p>
    </div>
  );
}

function AttendanceStatusBadge({ status }: { status: string }) {
  if (status === "anwesend")
    return (
      <Badge variant="success">
        <Check className="size-3" />
        Anwesend
      </Badge>
    );
  if (status === "verspaetet") return <Badge variant="warning">Verspätet</Badge>;
  if (status === "entschuldigt") return <Badge variant="info">Entschuldigt</Badge>;
  return <Badge variant="danger">Fehlt</Badge>;
}
