import {
  ArrowRight,
  Brain,
  ClipboardEdit,
  Clock,
  Lightbulb,
  Sparkles,
  Users,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { effectiveRole, getSession } from "@/lib/session";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { prisma } from "@/lib/db/client";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Lehrer-Cockpit" };

export default async function TeachDashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "teacher") redirect("/");

  const now = new Date();
  const TODAY_DOW = now.getDay() === 0 ? 7 : now.getDay();
  const todayDate = now.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" });

  const periodConfigs = await prisma.schoolPeriodConfig.findMany({
    where: { schoolId: session.schoolId ?? "" },
    orderBy: { period: "asc" },
    select: { period: true, startTime: true },
  });
  const DEFAULT_PERIOD_TIMES = ["08:00", "08:50", "09:50", "10:40", "11:35", "12:25", "13:25", "14:15", "15:00"];
  const PERIOD_TIMES = Array.from({ length: 9 }, (_, i) =>
    periodConfigs.find((p) => p.period === i + 1)?.startTime ?? DEFAULT_PERIOD_TIMES[i]
  );

  // Teacher's classes
  const tscEntries = await prisma.teacherSubjectClass.findMany({
    where: { teacherId: session.userId },
    include: {
      subject: { select: { name: true, shortName: true, color: true } },
      class: { include: { students: { select: { id: true } } } },
    },
  });

  const seenClasses = new Set<string>();
  const classes = tscEntries
    .filter((t) => { if (seenClasses.has(t.class.id)) return false; seenClasses.add(t.class.id); return true; })
    .map((t) => ({ id: t.class.id, name: t.class.name, subject: t.subject.name, color: t.subject.color, studentCount: t.class.students.length }));

  // Pending submissions (submitted, not yet graded)
  const pendingSubmissions = await prisma.submission.findMany({
    where: {
      status: "submitted",
      assignment: { teacherId: session.userId },
    },
    include: {
      student: { select: { name: true } },
      assignment: {
        include: {
          subject: { select: { name: true, shortName: true, color: true } },
          class: { select: { name: true } },
        },
      },
    },
    orderBy: { submittedAt: "desc" },
    take: 6,
  });

  // Today's timetable
  const todayEntries = await prisma.timetableEntry.findMany({
    where: { teacherId: session.userId, day: TODAY_DOW },
    include: {
      subject: { select: { name: true, color: true } },
      class: { select: { name: true } },
    },
    orderBy: { period: "asc" },
  });

  // Unread messages count
  const myParticipations = await prisma.messageParticipant.findMany({
    where: { userId: session.userId },
    select: { threadId: true, lastReadAt: true },
  });
  const unreadCount = await (async () => {
    let count = 0;
    for (const p of myParticipations) {
      const lastMsg = await prisma.message.findFirst({
        where: { threadId: p.threadId, senderId: { not: session.userId } },
        orderBy: { sentAt: "desc" },
      });
      if (lastMsg && (!p.lastReadAt || p.lastReadAt < lastMsg.sentAt)) count++;
    }
    return count;
  })();

  const totalStudents = classes.reduce((s, c) => s + c.studentCount, 0);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">
            {todayDate}
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
            Guten Morgen, {session.name.split(" ").pop()}
          </h1>
          <p className="mt-1 text-sm text-muted-fg">
            <span className="font-semibold text-fg">{pendingSubmissions.length} Abgaben</span> warten auf Korrektur ·{" "}
            <span className="font-semibold text-fg">{todayEntries.length} Stunden</span> heute
            {unreadCount > 0 && <> · <span className="font-semibold text-brand">{unreadCount} neue Nachrichten</span></>}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/teach/aufgaben/neu" className={buttonVariants({ variant: "outline", size: "sm" })}>
            Aufgabe stellen
          </Link>
          <Link href="/teach/generator" className={buttonVariants({ size: "sm" })}>
            <Sparkles className="size-3.5" />
            KA generieren
          </Link>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-px border border-border bg-border lg:grid-cols-4">
        {[
          { label: "Schüler gesamt", value: String(totalStudents), icon: Users, suffix: `${classes.length} Klassen`, tone: "text-info" },
          { label: "Korrekturen offen", value: String(pendingSubmissions.length), icon: ClipboardEdit, suffix: "warten auf Feedback", tone: "text-warning" },
          { label: "Stunden heute", value: String(todayEntries.length), icon: Clock, suffix: "Unterrichtsstunden", tone: "text-fg" },
          { label: "KI-Stunden gespart", value: "11,4", icon: Sparkles, suffix: "diesen Monat", tone: "text-brand" },
        ].map((s) => (
          <div key={s.label} className="bg-bg p-5">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">{s.label}</p>
              <s.icon className={cn("size-4", s.tone)} strokeWidth={1.75} />
            </div>
            <p className="mt-3 font-mono text-3xl font-bold tracking-tight">{s.value}</p>
            <p className="mt-1 text-xs text-muted-fg">{s.suffix}</p>
          </div>
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Korrektur-Stapel</CardTitle>
                <p className="mt-1 text-sm text-muted-fg">
                  {pendingSubmissions.length} Abgaben warten
                </p>
              </div>
              <Link href="/teach/korrektur">
                <Button variant="ghost" size="sm">
                  Alle öffnen
                  <ArrowRight className="size-3.5" />
                </Button>
              </Link>
            </CardHeader>
            <CardBody className="!px-0 !pb-0">
              {pendingSubmissions.length === 0 ? (
                <div className="border-t border-border px-5 py-8 text-center text-sm text-muted-fg">
                  Keine offenen Korrekturen. 🎉
                </div>
              ) : (
                <ul className="divide-y divide-border border-t border-border">
                  {pendingSubmissions.map((s) => (
                    <li
                      key={s.id}
                      className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-surface"
                    >
                      <Avatar name={s.student.name} size="sm" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-semibold">{s.student.name}</p>
                          <span
                            className="inline-flex shrink-0 items-center px-1.5 py-0.5 text-[11px] font-semibold"
                            style={{ backgroundColor: s.assignment.subject.color + "22", color: s.assignment.subject.color }}
                          >
                            {s.assignment.class.name} {s.assignment.subject.shortName}
                          </span>
                        </div>
                        <p className="mt-0.5 truncate text-xs text-muted-fg">
                          {s.assignment.title} · {s.submittedAt?.toLocaleDateString("de-DE", { day: "numeric", month: "short" }) ?? "—"}
                        </p>
                      </div>
                      <Button size="sm" variant="secondary">Öffnen</Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Deine Klassen</CardTitle>
                <p className="mt-1 text-sm text-muted-fg">
                  {classes.length} Klassen · {totalStudents} Schüler
                </p>
              </div>
              <Link href="/teach/klassen">
                <Button variant="ghost" size="sm">
                  Übersicht
                  <ArrowRight className="size-3.5" />
                </Button>
              </Link>
            </CardHeader>
            <CardBody className="!px-0 !pb-0">
              <ul className="divide-y divide-border border-t border-border">
                {classes.map((c) => (
                  <li key={c.id} className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-surface">
                    <div
                      className="grid size-10 shrink-0 place-items-center text-white"
                      style={{ backgroundColor: c.color }}
                    >
                      <span className="font-mono text-sm font-bold">{c.name}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">{c.subject}</p>
                      <p className="text-xs text-muted-fg">{c.studentCount} Schüler</p>
                    </div>
                    <Link href={`/teach/klassen/${c.name}`} className="text-xs font-medium text-muted-fg hover:text-brand">
                      Cockpit →
                    </Link>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>KI-Tools</CardTitle>
                <p className="mt-1 text-sm text-muted-fg">4 verfügbar</p>
              </div>
              <Sparkles className="size-4 text-brand" strokeWidth={1.75} />
            </CardHeader>
            <CardBody className="!px-0 !pb-0">
              <ul className="divide-y divide-border border-t border-border">
                {[
                  { label: "KA-Generator", desc: "Klassenarbeiten in Minuten", href: "/teach/generator", icon: Sparkles },
                  { label: "Auto-Korrektur", desc: "KI-Vorbewertung & Stapel", href: "/teach/korrektur", icon: ClipboardEdit },
                  { label: "Kompetenz-Heatmap", desc: "Lernstand pro Klasse", href: "/teach/kompetenzen", icon: Brain },
                  { label: "Lernpfad-Empfehlungen", desc: "KI-Hinweise pro Schüler", href: "/teach/kompetenzen", icon: Lightbulb },
                ].map((tool) => (
                  <li key={tool.label}>
                    <Link
                      href={tool.href}
                      className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-surface"
                    >
                      <tool.icon className="size-4 shrink-0 text-brand" strokeWidth={1.75} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold">{tool.label}</p>
                        <p className="text-xs text-muted-fg">{tool.desc}</p>
                      </div>
                      <ArrowRight className="size-3.5 shrink-0 text-muted-fg" />
                    </Link>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Heute · {today_day_label(TODAY_DOW)}</CardTitle>
              <span className="font-mono text-xs text-muted-fg">{todayEntries.length} Stunden</span>
            </CardHeader>
            <CardBody className="!px-0 !pb-0">
              {todayEntries.length === 0 ? (
                <div className="border-t border-border px-5 py-6 text-sm text-muted-fg">
                  Heute kein Unterricht.
                </div>
              ) : (
                <ol className="divide-y divide-border border-t border-border">
                  {todayEntries.map((e) => (
                    <li key={e.id} className="flex items-center gap-3 px-5 py-3 text-sm">
                      <span className="w-5 font-mono text-xs text-muted-fg">{e.period}.</span>
                      <span className="inline-block size-2 shrink-0" style={{ backgroundColor: e.subject.color }} />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold">{e.subject.name}</p>
                        <p className="text-xs text-muted-fg">{e.class.name} · Raum {e.room ?? "—"}</p>
                      </div>
                      <span className="font-mono text-[10px] text-muted-fg">{PERIOD_TIMES[e.period - 1]}</span>
                    </li>
                  ))}
                </ol>
              )}
            </CardBody>
          </Card>

          {unreadCount > 0 && (
            <Card className="border-brand/40">
              <CardBody className="!p-5">
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-brand" />
                  <p className="text-xs font-semibold uppercase tracking-wider text-brand">
                    {unreadCount} neue Nachricht{unreadCount > 1 ? "en" : ""}
                  </p>
                </div>
                <p className="mt-3 text-sm text-muted-fg">
                  Schüler oder Eltern haben dir geschrieben.
                </p>
                <Link href="/teach/nachrichten">
                  <Button className="mt-4 w-full" variant="outline" size="sm">
                    Nachrichten öffnen
                    <ArrowRight className="size-3.5" />
                  </Button>
                </Link>
              </CardBody>
            </Card>
          )}

          <Card className="border-brand/40 bg-gradient-to-br from-brand/[0.08] to-transparent">
            <CardBody className="!p-5">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-brand" strokeWidth={1.75} />
                <p className="text-xs font-semibold uppercase tracking-wider text-brand">KI-Assistent</p>
              </div>
              <p className="mt-4 text-base font-semibold leading-snug">
                Klassenarbeit für 9b automatisch generieren
              </p>
              <p className="mt-2 text-sm text-muted-fg">
                Basierend auf den Lehrplänen und bisherigen Aufgaben — in 30 Sekunden fertig.
              </p>
              <Link href="/teach/generator" className={buttonVariants({ className: "mt-5 w-full" })}>
                Generieren starten
                <ArrowRight className="size-3.5" />
              </Link>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

function today_day_label(dow: number) {
  return ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag"][dow - 1] ?? "Heute";
}
