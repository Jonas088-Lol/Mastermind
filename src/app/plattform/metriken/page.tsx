import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  Building2,
  Database,
  MessageSquare,
  Swords,
  TrendingUp,
  Users,
} from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/db/client";
import { getSession, isSuper } from "@/lib/session";

export const metadata: Metadata = { title: "Metriken · Plattform" };

const PLAN_LABEL: Record<string, string> = { basic: "Basic", pro: "Pro", enterprise: "Enterprise" };
const PLAN_TONE = { enterprise: "success", pro: "brand", basic: "outline" } as const;

const ROLE_LABEL: Record<string, string> = {
  student: "Schüler",
  teacher: "Lehrer",
  parent: "Eltern",
  admin: "Admin",
  secretary: "Sekretariat",
  rector: "Schulleitung",
  super: "Super-Admin",
};

const WEEK_MS = 7 * 86_400_000;

export default async function PlattformMetrikenPage() {
  const session = await getSession();
  if (!session || !isSuper(session)) redirect("/login");

  const now = Date.now();
  const sevenDaysAgo = new Date(now - WEEK_MS);
  const eightWeeksAgo = new Date(now - 8 * WEEK_MS);

  const [
    schoolsByPlan,
    usersByRole,
    activeSessions7d,
    questionCount,
    bossBattleCount,
    messages7d,
    newUsers8w,
  ] = await Promise.all([
    prisma.school.groupBy({ by: ["plan"], _count: { id: true } }),
    prisma.user.groupBy({ by: ["role"], _count: { id: true } }),
    prisma.session.findMany({
      where: { lastUsedAt: { gte: sevenDaysAgo } },
      distinct: ["userId"],
      select: { userId: true },
    }),
    prisma.exerciseQuestion.count(),
    prisma.bossBattle.count(),
    prisma.message.count({ where: { sentAt: { gte: sevenDaysAgo } } }),
    prisma.user.findMany({
      where: { createdAt: { gte: eightWeeksAgo } },
      select: { createdAt: true },
    }),
  ]);

  const totalSchools = schoolsByPlan.reduce((s, p) => s + p._count.id, 0);
  const totalUsers = usersByRole.reduce((s, r) => s + r._count.id, 0);
  const activeUsers7d = activeSessions7d.length;
  const planMap = Object.fromEntries(schoolsByPlan.map((p) => [p.plan, p._count.id]));

  // Wachstum: neue Nutzer pro Woche (letzte 8 Wochen), Woche 0 = aktuelle Woche
  const weeks = Array.from({ length: 8 }, (_, i) => {
    const end = new Date(now - i * WEEK_MS);
    const start = new Date(now - (i + 1) * WEEK_MS);
    const count = newUsers8w.filter(
      (u) => u.createdAt >= start && u.createdAt < end,
    ).length;
    return { start, end, count };
  });
  const maxWeek = Math.max(1, ...weeks.map((w) => w.count));

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
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Metriken</h1>
          <p className="mt-1 text-sm text-muted-fg">
            Plattform-Kennzahlen für den Betreiber · nur lesend
          </p>
        </div>
      </header>

      {/* KPI-Karten */}
      <section className="grid grid-cols-2 gap-px border border-border bg-border lg:grid-cols-3">
        <Kpi
          label="Schulen gesamt"
          value={totalSchools.toLocaleString("de-DE")}
          icon={<Building2 className="size-4 text-brand" strokeWidth={1.75} />}
          sub={(["basic", "pro", "enterprise"] as const)
            .map((p) => `${PLAN_LABEL[p]}: ${planMap[p] ?? 0}`)
            .join(" · ")}
        />
        <Kpi
          label="Nutzer gesamt"
          value={totalUsers.toLocaleString("de-DE")}
          icon={<Users className="size-4 text-info" strokeWidth={1.75} />}
        />
        <Kpi
          label="Aktiv (7 Tage)"
          value={activeUsers7d.toLocaleString("de-DE")}
          icon={<Activity className="size-4 text-success" strokeWidth={1.75} />}
          sub={totalUsers > 0 ? `${Math.round((activeUsers7d / totalUsers) * 100)}% aller Nutzer` : undefined}
        />
        <Kpi
          label="Fragen in der Bank"
          value={questionCount.toLocaleString("de-DE")}
          icon={<Database className="size-4 text-warning" strokeWidth={1.75} />}
        />
        <Kpi
          label="Boss-Battles gesamt"
          value={bossBattleCount.toLocaleString("de-DE")}
          icon={<Swords className="size-4 text-danger" strokeWidth={1.75} />}
        />
        <Kpi
          label="Nachrichten (7 Tage)"
          value={messages7d.toLocaleString("de-DE")}
          icon={<MessageSquare className="size-4 text-muted-fg" strokeWidth={1.75} />}
        />
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
          <CardBody className="px-0! pb-0!">
            {usersByRole.length === 0 ? (
              <p className="border-t border-border px-5 py-6 text-sm text-muted-fg">Noch keine Nutzer.</p>
            ) : (
              <ul className="divide-y divide-border border-t border-border">
                {[...usersByRole]
                  .sort((a, b) => b._count.id - a._count.id)
                  .map((r) => {
                    const pct = totalUsers > 0 ? Math.round((r._count.id / totalUsers) * 100) : 0;
                    return (
                      <li key={r.role} className="flex items-center justify-between px-5 py-3">
                        <span className="text-sm font-medium">{ROLE_LABEL[r.role] ?? r.role}</span>
                        <span className="font-mono text-sm text-muted-fg">
                          {r._count.id.toLocaleString("de-DE")} · {pct}%
                        </span>
                      </li>
                    );
                  })}
              </ul>
            )}
          </CardBody>
        </Card>

        {/* Schulen nach Plan */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="size-4 text-muted-fg" strokeWidth={1.75} />
              <CardTitle>Schulen nach Plan</CardTitle>
            </div>
          </CardHeader>
          <CardBody className="px-0! pb-0!">
            <ul className="divide-y divide-border border-t border-border">
              {(["enterprise", "pro", "basic"] as const).map((plan) => {
                const count = planMap[plan] ?? 0;
                const pct = totalSchools > 0 ? Math.round((count / totalSchools) * 100) : 0;
                return (
                  <li key={plan} className="flex items-center justify-between px-5 py-3">
                    <Badge variant={PLAN_TONE[plan]}>{PLAN_LABEL[plan]}</Badge>
                    <span className="font-mono text-sm text-muted-fg">
                      {count} {count === 1 ? "Schule" : "Schulen"} · {pct}%
                    </span>
                  </li>
                );
              })}
            </ul>
          </CardBody>
        </Card>
      </div>

      {/* Wachstum */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="size-4 text-muted-fg" strokeWidth={1.75} />
            <CardTitle>Neue Nutzer pro Woche</CardTitle>
          </div>
          <span className="text-xs text-muted-fg">Letzte 8 Wochen</span>
        </CardHeader>
        <CardBody className="px-0! pb-0!">
          <div className="overflow-x-auto">
            <table className="w-full border-t border-border text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[11px] font-semibold uppercase tracking-wider text-muted-fg">
                  <th className="px-5 py-2.5">Woche</th>
                  <th className="px-5 py-2.5 text-right">Neue Nutzer</th>
                  <th className="hidden px-5 py-2.5 sm:table-cell" aria-hidden />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {weeks.map((w, i) => (
                  <tr key={i} className="transition-colors hover:bg-surface">
                    <td className="whitespace-nowrap px-5 py-2.5">
                      {i === 0 ? (
                        <span className="font-semibold">Aktuelle Woche</span>
                      ) : (
                        <span className="text-muted-fg">
                          {w.start.toLocaleDateString("de-DE", { day: "numeric", month: "short" })}
                          {" – "}
                          {w.end.toLocaleDateString("de-DE", { day: "numeric", month: "short" })}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-2.5 text-right font-mono font-semibold">
                      {w.count.toLocaleString("de-DE")}
                    </td>
                    <td className="hidden w-1/2 px-5 py-2.5 sm:table-cell">
                      <div className="h-1.5 w-full rounded-full bg-surface">
                        <div
                          className="h-1.5 rounded-full bg-brand"
                          style={{ width: `${Math.round((w.count / maxWeek) * 100)}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
