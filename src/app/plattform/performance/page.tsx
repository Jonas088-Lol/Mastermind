import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Activity, ClipboardList, Database, GraduationCap, Layers, MessageSquare, Users, Zap } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db/client";
import { getSession, isSuper } from "@/lib/session";

export const metadata: Metadata = { title: "Performance · Plattform" };

export default async function PlattformPerformancePage() {
  const session = await getSession();
  if (!session || !isSuper(session)) redirect("/login");

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(now.getTime() - 7 * 86400000);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const dbStart = Date.now();
  const [
    submissionCount,
    gradeCount,
    assignmentCount,
    messageCount,
    flashcardCount,
    notificationCount,
    userCount,
    schoolCount,
    activeSessions24h,
    newUsersWeek,
    aiUsageMonth,
    fileUploadCount,
  ] = await Promise.all([
    prisma.submission.count(),
    prisma.grade.count(),
    prisma.assignment.count(),
    prisma.message.count(),
    prisma.flashcard.count(),
    prisma.appNotification.count(),
    prisma.user.count(),
    prisma.school.count(),
    prisma.session.count({ where: { lastUsedAt: { gte: startOfDay } } }),
    prisma.user.count({ where: { createdAt: { gte: startOfWeek } } }),
    prisma.aiQuotaEntry.aggregate({ _sum: { used: true }, where: { updatedAt: { gte: startOfMonth } } }),
    prisma.fileUpload.count(),
  ]);
  const dbLatencyMs = Date.now() - dbStart;

  const aiRequestsMonth = aiUsageMonth._sum.used ?? 0;

  const activityStats = [
    { label: "Aktive Sessions · Heute", value: activeSessions24h, icon: Activity },
    { label: "Neue Nutzer · 7 Tage", value: newUsersWeek, icon: Users },
    { label: "KI-Anfragen · Monat", value: aiRequestsMonth, icon: Zap },
    { label: "Dateien hochgeladen", value: fileUploadCount, icon: ClipboardList },
  ];

  const dbStats = [
    { label: "Nutzer", value: userCount, icon: Users },
    { label: "Schulen", value: schoolCount, icon: Database },
    { label: "Abgaben", value: submissionCount, icon: ClipboardList },
    { label: "Noten", value: gradeCount, icon: GraduationCap },
    { label: "Aufgaben", value: assignmentCount, icon: ClipboardList },
    { label: "Nachrichten", value: messageCount, icon: MessageSquare },
    { label: "Karteikarten", value: flashcardCount, icon: Layers },
    { label: "Benachrichtigungen", value: notificationCount, icon: Activity },
  ];

  const hasSentry = Boolean(process.env.SENTRY_DSN);
  const hasDatadog = Boolean(process.env.DATADOG_API_KEY);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Plattform</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Performance</h1>
        <p className="mt-1 text-sm text-muted-fg">
          Echtzeit-Metriken aus der aktuellen Instanz · DB-Abfrage in {dbLatencyMs} ms
        </p>
      </header>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Activity className="size-4 text-muted-fg" />
            <CardTitle>Aktivität</CardTitle>
          </div>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-2 gap-px border border-border bg-border sm:grid-cols-4">
            {activityStats.map((s) => (
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
          <div className="flex items-center gap-2">
            <Database className="size-4 text-muted-fg" />
            <CardTitle>Datenbankvolumen</CardTitle>
          </div>
          <span className="font-mono text-xs text-muted-fg">p50 {dbLatencyMs} ms</span>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-2 gap-px border border-border bg-border sm:grid-cols-4">
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
          <CardTitle>Externes Monitoring</CardTitle>
          <span className={`text-xs font-semibold ${hasSentry || hasDatadog ? "text-success" : "text-muted-fg"}`}>
            {hasSentry || hasDatadog ? "Teilweise konfiguriert" : "Nicht konfiguriert"}
          </span>
        </CardHeader>
        <CardBody className="space-y-4">
          <ul className="divide-y divide-border border border-border">
            <MonitoringRow
              label="Sentry"
              detail="Error-Tracking, Traces, Performance-Monitoring"
              envKey="SENTRY_DSN"
              configured={hasSentry}
            />
            <MonitoringRow
              label="Datadog"
              detail="Infrastruktur-Metriken, Dashboards, Alerting"
              envKey="DATADOG_API_KEY"
              configured={hasDatadog}
            />
          </ul>
          <p className="text-xs text-muted-fg">
            Umgebungsvariablen werden auf Serverebene gesetzt (Vercel → Settings → Environment Variables).
          </p>
        </CardBody>
      </Card>
    </div>
  );
}

function MonitoringRow({
  label,
  detail,
  envKey,
  configured,
}: {
  label: string;
  detail: string;
  envKey: string;
  configured: boolean;
}) {
  return (
    <li className="flex items-center gap-4 px-4 py-3">
      <span className={`size-2 shrink-0 ${configured ? "bg-success" : "bg-border-strong"}`} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-xs text-muted-fg">{detail}</p>
      </div>
      <code className="rounded bg-surface px-2 py-0.5 font-mono text-[10px] text-muted-fg">{envKey}</code>
      <span className={`text-xs font-semibold ${configured ? "text-success" : "text-muted-fg"}`}>
        {configured ? "Aktiv" : "Fehlt"}
      </span>
    </li>
  );
}
