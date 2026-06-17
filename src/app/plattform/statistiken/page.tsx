import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Activity, ArrowLeft, BarChart3, Building2, GraduationCap, MessageSquare, Users, Zap } from "lucide-react";
import Link from "next/link";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { prisma } from "@/lib/db/client";
import { getSession, isSuper } from "@/lib/session";

export const metadata: Metadata = { title: "Statistiken · Plattform" };

const PLAN_TONE = { enterprise: "success", pro: "brand", basic: "outline" } as const;
const PLAN_LABEL = { enterprise: "Enterprise", pro: "Pro", basic: "Basic" } as const;

export default async function PlattformStatistikenPage() {
  const session = await getSession();
  if (!session || !isSuper(session)) redirect("/login");

  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000);
  const sevenDaysAgo  = new Date(Date.now() -  7 * 86_400_000);

  const [
    schools,
    usersByRole,
    activeUsers30d,
    activeUsers7d,
    assignmentCount,
    submissionCount,
    gradeCount,
    messageCount,
    aiQuotaTotal,
    recentSchools,
  ] = await Promise.all([
    prisma.school.findMany({
      select: { id: true, name: true, plan: true, seats: true, createdAt: true, _count: { select: { users: true, classes: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.groupBy({ by: ["role"], _count: { id: true } }),
    prisma.session.count({ where: { lastUsedAt: { gte: thirtyDaysAgo } } }),
    prisma.session.count({ where: { lastUsedAt: { gte: sevenDaysAgo } } }),
    prisma.assignment.count(),
    prisma.submission.count(),
    prisma.grade.count(),
    prisma.message.count(),
    prisma.aiQuotaEntry.aggregate({ _sum: { used: true } }),
    prisma.school.findMany({
      select: { id: true, name: true, plan: true, createdAt: true, _count: { select: { users: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const totalSchools = schools.length;
  const totalUsers   = usersByRole.reduce((s, r) => s + r._count.id, 0);
  const totalSeats   = schools.reduce((s, sc) => s + sc.seats, 0);
  const seatsFilled  = totalSeats > 0 ? Math.round((totalUsers / totalSeats) * 100) : 0;
  const totalAiCalls = aiQuotaTotal._sum.used ?? 0;

  const roleMap = Object.fromEntries(usersByRole.map((r) => [r.role, r._count.id]));

  const byPlan = schools.reduce<Record<string, number>>((acc, s) => {
    acc[s.plan] = (acc[s.plan] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8">
      <header className="flex flex-col gap-3">
        <Link
          href="/plattform"
          className="inline-flex w-fit items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-muted-fg transition-colors hover:text-fg"
        >
          <ArrowLeft className="size-3.5" />
          Plattform
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Statistiken</h1>
          <p className="mt-1 text-sm text-muted-fg">
            {totalSchools} {totalSchools === 1 ? "Schule" : "Schulen"} · {totalUsers.toLocaleString("de-DE")} Nutzer
          </p>
        </div>
      </header>

      {/* KPI Grid */}
      <section className="grid grid-cols-2 gap-px border border-border bg-border lg:grid-cols-4">
        <Kpi label="Schulen" value={totalSchools} icon={<Building2 className="size-4 text-brand" strokeWidth={1.75} />} />
        <Kpi label="Nutzer gesamt" value={totalUsers.toLocaleString("de-DE")} icon={<Users className="size-4 text-info" strokeWidth={1.75} />} />
        <Kpi label="Aktiv (30 Tage)" value={activeUsers30d.toLocaleString("de-DE")} icon={<Activity className="size-4 text-success" strokeWidth={1.75} />} sub={`${activeUsers7d} letzte 7 Tage`} />
        <Kpi label="KI-Anfragen gesamt" value={totalAiCalls.toLocaleString("de-DE")} icon={<Zap className="size-4 text-warning" strokeWidth={1.75} />} />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Nutzer nach Rolle */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="size-4 text-muted-fg" strokeWidth={1.75} />
              <CardTitle>Nutzer nach Rolle</CardTitle>
            </div>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              {(["student", "teacher", "parent", "admin", "secretary", "rector"] as const).map((role) => {
                const count = roleMap[role] ?? 0;
                const pct   = totalUsers > 0 ? Math.round((count / totalUsers) * 100) : 0;
                const ROLE_LABEL: Record<string, string> = {
                  student: "Schüler", teacher: "Lehrer", parent: "Eltern",
                  admin: "Admin", secretary: "Sekretariat", rector: "Schulleitung",
                };
                return (
                  <div key={role} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{ROLE_LABEL[role] ?? role}</span>
                      <span className="font-mono text-muted-fg">{count.toLocaleString("de-DE")} · {pct}%</span>
                    </div>
                    <Progress value={pct} tone="brand" className="h-1.5" />
                  </div>
                );
              })}
            </div>
          </CardBody>
        </Card>

        {/* Plan-Verteilung */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="size-4 text-muted-fg" strokeWidth={1.75} />
              <CardTitle>Plan-Verteilung</CardTitle>
            </div>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              {(["enterprise", "pro", "basic"] as const).map((plan) => {
                const count = byPlan[plan] ?? 0;
                const pct   = totalSchools > 0 ? Math.round((count / totalSchools) * 100) : 0;
                const tone  = PLAN_TONE[plan] ?? "outline";
                return (
                  <div key={plan} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Badge variant={tone}>{PLAN_LABEL[plan]}</Badge>
                        <span className="text-xs text-muted-fg">{count} {count === 1 ? "Schule" : "Schulen"}</span>
                      </div>
                      <span className="font-mono text-muted-fg">{pct}%</span>
                    </div>
                    <Progress value={pct} tone={tone === "success" ? "success" : tone === "brand" ? "brand" : "warning"} className="h-1.5" />
                  </div>
                );
              })}
            </div>
            <div className="mt-6 grid grid-cols-3 gap-px border border-border bg-border">
              <div className="bg-bg px-3 py-3 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-fg">Sitze gesamt</p>
                <p className="mt-1 font-mono text-xl font-bold">{totalSeats.toLocaleString("de-DE")}</p>
              </div>
              <div className="bg-bg px-3 py-3 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-fg">Belegt</p>
                <p className="mt-1 font-mono text-xl font-bold">{totalUsers.toLocaleString("de-DE")}</p>
              </div>
              <div className="bg-bg px-3 py-3 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-fg">Auslastung</p>
                <p className="mt-1 font-mono text-xl font-bold">{seatsFilled}%</p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Aktivitätszähler */}
      <Card>
        <CardHeader>
          <CardTitle>Plattform-Aktivität</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-2 gap-px border border-border bg-border sm:grid-cols-4">
            <ActivityStat label="Aufgaben" value={assignmentCount} icon={<GraduationCap className="size-3.5 text-muted-fg" />} />
            <ActivityStat label="Abgaben" value={submissionCount} icon={<GraduationCap className="size-3.5 text-muted-fg" />} />
            <ActivityStat label="Noten" value={gradeCount} icon={<BarChart3 className="size-3.5 text-muted-fg" />} />
            <ActivityStat label="Nachrichten" value={messageCount} icon={<MessageSquare className="size-3.5 text-muted-fg" />} />
          </div>
        </CardBody>
      </Card>

      {/* Neueste Schulen */}
      <Card>
        <CardHeader>
          <CardTitle>Neueste Schulen</CardTitle>
          <Link href="/schultraeger/schulen" className="text-xs font-semibold text-brand hover:underline">
            Alle anzeigen →
          </Link>
        </CardHeader>
        <CardBody className="px-0! pb-0!">
          {recentSchools.length === 0 ? (
            <p className="border-t border-border px-5 py-6 text-sm text-muted-fg">Noch keine Schulen registriert.</p>
          ) : (
            <ul className="divide-y divide-border border-t border-border">
              {recentSchools.map((sc) => {
                const tone  = PLAN_TONE[sc.plan as keyof typeof PLAN_TONE] ?? "outline";
                const label = PLAN_LABEL[sc.plan as keyof typeof PLAN_LABEL] ?? sc.plan;
                return (
                  <li key={sc.id} className="flex items-center gap-4 px-5 py-3 transition-colors hover:bg-surface">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">{sc.name}</p>
                      <p className="text-xs text-muted-fg">
                        {sc._count.users} Nutzer · registriert{" "}
                        {sc.createdAt.toLocaleDateString("de-DE", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </div>
                    <Badge variant={tone}>{label}</Badge>
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

function Kpi({
  label,
  value,
  icon,
  sub,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  sub?: string;
}) {
  return (
    <div className="bg-bg p-5">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">{label}</p>
        {icon}
      </div>
      <p className="mt-3 font-mono text-3xl font-bold">{value}</p>
      {sub && <p className="mt-1 text-xs text-muted-fg">{sub}</p>}
    </div>
  );
}

function ActivityStat({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-bg p-4">
      <div className="flex items-center gap-1.5">
        {icon}
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-fg">{label}</p>
      </div>
      <p className="mt-2 font-mono text-2xl font-bold">{value.toLocaleString("de-DE")}</p>
    </div>
  );
}
