import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Activity, ClipboardList, Database, GraduationCap, Layers, MessageSquare } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db/client";
import { getSession, isSuper } from "@/lib/session";

export const metadata: Metadata = { title: "Performance · Plattform" };

export default async function PlattformPerformancePage() {
  const session = await getSession();
  if (!session || !isSuper(session)) redirect("/login");

  const [
    submissionCount,
    gradeCount,
    assignmentCount,
    messageCount,
    flashcardCount,
    notificationCount,
  ] = await Promise.all([
    prisma.submission.count(),
    prisma.grade.count(),
    prisma.assignment.count(),
    prisma.message.count(),
    prisma.flashcard.count(),
    prisma.appNotification.count(),
  ]);

  const dbStats = [
    { label: "Abgaben (Submissions)", value: submissionCount, icon: ClipboardList },
    { label: "Noten (Grades)", value: gradeCount, icon: GraduationCap },
    { label: "Aufgaben (Assignments)", value: assignmentCount, icon: ClipboardList },
    { label: "Nachrichten (Messages)", value: messageCount, icon: MessageSquare },
    { label: "Karteikarten (Flashcards)", value: flashcardCount, icon: Layers },
    { label: "Benachrichtigungen", value: notificationCount, icon: Activity },
  ];

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Plattform</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Performance</h1>
        <p className="mt-1 text-sm text-muted-fg">DB-Zähler aus der aktuellen Instanz.</p>
      </header>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Database className="size-4 text-muted-fg" />
            <CardTitle>Datenbankvolumen</CardTitle>
          </div>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-2 gap-px border border-border bg-border sm:grid-cols-3">
            {dbStats.map((s) => (
              <div key={s.label} className="bg-bg p-4">
                <div className="flex items-center gap-2">
                  <s.icon className="size-3.5 text-muted-fg" strokeWidth={1.75} />
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-fg">{s.label}</p>
                </div>
                <p className="mt-2 font-mono text-2xl font-bold">{s.value.toLocaleString("de-DE")}</p>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Latenzen & Monitoring</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="border border-dashed border-border bg-surface p-6 text-center">
            <Activity className="mx-auto size-8 text-muted-fg" strokeWidth={1.5} />
            <p className="mt-3 font-semibold">Kein Monitoring angebunden</p>
            <p className="mt-1 text-sm text-muted-fg">
              API-Latenzen, Endpoint-Durchsatz und Infrastruktur-Metriken (CPU, Memory, DB-Connections)
              erfordern eine externe Monitoring-Integration, z. B. Datadog, Grafana oder Sentry.
            </p>
          </div>
          <ul className="mt-4 space-y-1.5 text-xs text-muted-fg">
            <li><span className="font-mono">SENTRY_DSN</span> — für Error-Tracking und Traces</li>
            <li><span className="font-mono">DATADOG_API_KEY</span> — für Metriken und Dashboards</li>
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}
