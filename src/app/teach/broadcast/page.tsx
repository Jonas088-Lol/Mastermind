/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { CheckCircle2, Megaphone, Users } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { sendTeacherBroadcast } from "./actions";
import { can } from "@/lib/permissions";

export const metadata: Metadata = { title: "Broadcast · Lehrer" };

interface PageProps {
  searchParams: Promise<{ sent?: string }>;
}

export default async function TeacherBroadcastPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "teacher") redirect("/");
  // Von der Schulleitung sperrbar — dann gar kein Formular zeigen.
  if (!(await can(session, "teacher.broadcast"))) redirect("/teach/nachrichten");

  const { sent } = await searchParams;

  const tscEntries = await prisma.teacherSubjectClass.findMany({
    where: { teacherId: session.userId },
    include: { class: { select: { id: true, name: true } } },
  });

  const seen = new Set<string>();
  const classes = tscEntries
    .filter((t) => {
      if (seen.has(t.classId)) return false;
      seen.add(t.classId);
      return true;
    })
    .map((t) => ({ id: t.class.id, name: t.class.name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const myClassIds = classes.map((c) => c.id);

  // Empfänger-Zahlen, Klassen-Zählung (eine groupBy statt N Einzel-Counts) und
  // Verlauf parallel laden — alle Abfragen sind voneinander unabhängig.
  const [allStudentCount, allParentCount, classGroupCounts, recentBroadcasts] = await Promise.all([
    prisma.user.count({
      where: { classId: { in: myClassIds }, role: "student" },
    }),
    prisma.parentStudentLink.count({
      where: { student: { classId: { in: myClassIds } } },
    }),
    prisma.user.groupBy({
      by: ["classId"],
      where: { classId: { in: myClassIds }, role: "student" },
      _count: { id: true },
    }),
    // Broadcast history — last 10 notifications of type "broadcast" for any student in teacher's classes
    prisma.appNotification.findMany({
      where: {
        type: "broadcast",
        user: { classId: { in: myClassIds } },
      },
      orderBy: { createdAt: "desc" },
      distinct: ["title", "body", "createdAt"],
      take: 10,
      select: {
        id: true,
        title: true,
        body: true,
        createdAt: true,
      },
    }),
  ]);
  const classCountMap = Object.fromEntries(
    classGroupCounts.map((c) => [c.classId, c._count.id]),
  );

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Lehrer-Cockpit</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Broadcast-Nachricht</h1>
        <p className="mt-1 text-sm text-muted-fg">
          Sende eine Systemnachricht an Schüler oder Eltern deiner Klassen.
        </p>
      </header>

      {sent === "1" && (
        <div className="flex items-center gap-3 border border-success/30 bg-success/8 px-4 py-3 text-sm">
          <CheckCircle2 className="size-4 shrink-0 text-success" strokeWidth={1.75} />
          <span className="font-medium text-success">Nachricht wurde erfolgreich gesendet.</span>
        </div>
      )}

      <form action={sendTeacherBroadcast} className="flex flex-col gap-6">
        {/* Target selector */}
        <div className="flex flex-col gap-3">
          <label className="text-sm font-semibold">Empfänger-Gruppe</label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {[
              { value: "class", label: "Meine Klassen", desc: "Einzelne Klasse wählen" },
              { value: "all_students", label: "Alle Schüler", desc: `${allStudentCount} Schüler gesamt` },
              { value: "all_parents", label: "Alle Eltern", desc: `${allParentCount} Kontakte gesamt` },
            ].map((opt) => (
              <label
                key={opt.value}
                className="flex cursor-pointer flex-col gap-0.5 border border-border bg-bg px-3 py-2.5 text-sm transition-colors has-[:checked]:border-fg has-[:checked]:bg-surface"
              >
                <input type="radio" name="targetType" value={opt.value} defaultChecked={opt.value === "class"} className="sr-only" />
                <span className="font-semibold">{opt.label}</span>
                <span className="text-xs text-muted-fg">{opt.desc}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Class picker (shown always — JS-free fallback; hidden via CSS when not needed would require client) */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold">
            Klasse{" "}
            <span className="font-normal text-muted-fg">(nur für „Meine Klassen" relevant)</span>
          </label>
          <select
            name="classId"
            className="h-10 border border-border bg-bg px-3 text-sm focus:border-fg focus:outline-none"
          >
            <option value="">Klasse wählen…</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({classCountMap[c.id] ?? 0} Schüler)
              </option>
            ))}
          </select>
        </div>

        {/* Subject */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold">Betreff</label>
          <input
            name="subject"
            type="text"
            required
            placeholder="z. B. Hausaufgaben für Montag"
            className="h-10 border border-border bg-bg px-3 text-sm focus:border-fg focus:outline-none focus:ring-1 focus:ring-fg/20"
          />
        </div>

        {/* Body */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold">Nachricht</label>
          <textarea
            name="message"
            required
            placeholder="Text der Nachricht…"
            className="border border-border bg-bg px-3 py-2.5 text-sm focus:border-fg focus:outline-none focus:ring-1 focus:ring-fg/20"
            style={{ minHeight: 120 }}
          />
        </div>

        {/* Recipient preview */}
        <div className="flex items-center gap-3 border border-border bg-surface px-4 py-3 text-sm">
          <Users className="size-4 shrink-0 text-muted-fg" strokeWidth={1.75} />
          <div>
            <p className="font-semibold">Vorschau Empfänger</p>
            <p className="mt-0.5 text-xs text-muted-fg">
              Klasse (einzeln): je nach Auswahl ·{" "}
              Alle Schüler: <strong className="text-fg">{allStudentCount}</strong> ·{" "}
              Alle Eltern: <strong className="text-fg">{allParentCount}</strong>
            </p>
          </div>
        </div>

        {/* Warning */}
        <div className="border border-warning/30 bg-warning/5 px-4 py-3 text-sm text-muted-fg">
          <strong className="font-semibold text-fg">Hinweis:</strong> Diese Nachricht wird sofort als
          App-Benachrichtigung gesendet und kann nicht zurückgerufen werden.
        </div>

        <button
          type="submit"
          className="flex items-center justify-center gap-2 bg-fg px-5 py-2.5 text-sm font-semibold text-bg hover:bg-fg/90"
        >
          <Megaphone className="size-4" strokeWidth={1.75} />
          Nachricht senden
        </button>
      </form>

      {/* Broadcast history */}
      {recentBroadcasts.length > 0 && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Broadcast-Verlauf</CardTitle>
              <p className="mt-1 text-sm text-muted-fg">
                Zuletzt gesendete Nachrichten an deine Klassen
              </p>
            </div>
            <Badge variant="neutral">{recentBroadcasts.length}</Badge>
          </CardHeader>
          <CardBody className="px-0! pb-0!">
            <ul className="divide-y divide-border border-t border-border">
              {recentBroadcasts.map((n) => (
                <li key={n.id} className="px-5 py-3.5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{n.title}</p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-fg">{n.body}</p>
                    </div>
                    <span className="shrink-0 font-mono text-[10px] text-muted-fg">
                      {n.createdAt.toLocaleDateString("de-DE", { day: "numeric", month: "short", year: "2-digit" })}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
