import { ArrowLeft, Building2, CircleDollarSign, Users } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { prisma } from "@/lib/db/client";
import { getSession, isSuper } from "@/lib/session";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Abrechnung · Plattform" };

const PLAN_TONE = {
  enterprise: "success",
  pro: "brand",
  basic: "outline",
} as const;

const PLAN_LABEL = { enterprise: "Enterprise", pro: "Pro", basic: "Basic" } as const;

export default async function AbrechnungPage() {
  const session = await getSession();
  if (!session || !isSuper(session)) redirect("/login");

  const schools = await prisma.school.findMany({
    select: { id: true, name: true, plan: true, seats: true, createdAt: true, _count: { select: { users: true } } },
    orderBy: [{ plan: "asc" }, { name: "asc" }],
  });

  const byPlan = schools.reduce<Record<string, typeof schools>>((acc, s) => {
    if (!acc[s.plan]) acc[s.plan] = [];
    acc[s.plan].push(s);
    return acc;
  }, {});

  const totalSchools = schools.length;
  const totalUsers = schools.reduce((s, x) => s + x._count.users, 0);

  const planStats = ["enterprise", "pro", "basic"].map((plan) => ({
    plan,
    schools: (byPlan[plan] ?? []).length,
    users: (byPlan[plan] ?? []).reduce((s, x) => s + x._count.users, 0),
  }));

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
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Abrechnung</h1>
          <p className="mt-1 text-sm text-muted-fg">
            {totalSchools} {totalSchools === 1 ? "Schule" : "Schulen"} · {totalUsers.toLocaleString("de-DE")} Nutzer
          </p>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-px border border-border bg-border lg:grid-cols-3">
        <div className="bg-bg p-5">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">Schulen gesamt</p>
            <Building2 className="size-4 text-brand" strokeWidth={1.75} />
          </div>
          <p className="mt-3 font-mono text-3xl font-bold">{totalSchools}</p>
        </div>
        <div className="bg-bg p-5">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">Nutzer gesamt</p>
            <Users className="size-4 text-info" strokeWidth={1.75} />
          </div>
          <p className="mt-3 font-mono text-3xl font-bold">{totalUsers.toLocaleString("de-DE")}</p>
        </div>
        <div className="col-span-2 bg-bg p-5 lg:col-span-1">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">MRR</p>
            <CircleDollarSign className="size-4 text-muted-fg" strokeWidth={1.75} />
          </div>
          <p className="mt-3 font-mono text-3xl font-bold text-muted-fg">—</p>
          <p className="mt-1 text-xs text-muted-fg">Stripe nicht angebunden</p>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Plan-Verteilung</CardTitle>
              <p className="mt-1 text-sm text-muted-fg">{totalSchools} Schulen</p>
            </div>
          </CardHeader>
          <CardBody>
            {totalSchools === 0 ? (
              <p className="text-sm text-muted-fg">Noch keine Schulen registriert.</p>
            ) : (
              <ul className="space-y-4">
                {planStats.map((p) => {
                  if (p.schools === 0) return null;
                  const pct = Math.round((p.schools / totalSchools) * 100);
                  const tone = PLAN_TONE[p.plan as keyof typeof PLAN_TONE] ?? "outline";
                  const label = PLAN_LABEL[p.plan as keyof typeof PLAN_LABEL] ?? p.plan;
                  return (
                    <li key={p.plan} className="space-y-2">
                      <div className="flex items-baseline justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <Badge variant={tone}>{label}</Badge>
                          <span className="text-xs text-muted-fg">
                            {p.schools} {p.schools === 1 ? "Schule" : "Schulen"} · {p.users.toLocaleString("de-DE")} Nutzer
                          </span>
                        </div>
                        <span className="font-mono text-muted-fg">{pct} %</span>
                      </div>
                      <Progress
                        value={pct}
                        tone={tone === "success" ? "success" : tone === "brand" ? "brand" : "warning"}
                      />
                    </li>
                  );
                })}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Abrechnungs-Integration</CardTitle>
          </CardHeader>
          <CardBody className="space-y-3 text-sm">
            <div className="border border-dashed border-border bg-surface p-4 text-center">
              <CircleDollarSign className="mx-auto size-8 text-muted-fg" strokeWidth={1.5} />
              <p className="mt-3 font-semibold">Stripe nicht angebunden</p>
              <p className="mt-1 text-xs text-muted-fg">
                MRR, ARR, Rechnungen und Zahlungsstatus werden über Stripe verwaltet.
                Um echte Abrechnungsdaten anzuzeigen, konfiguriere die Stripe-Integration.
              </p>
            </div>
            <ul className="space-y-2 text-xs text-muted-fg">
              <li className="flex gap-2"><span className="font-mono">STRIPE_SECRET_KEY</span>— Umgebungsvariable setzen</li>
              <li className="flex gap-2"><span className="font-mono">STRIPE_WEBHOOK_SECRET</span>— Für Echtzeit-Updates</li>
            </ul>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Schulen nach Plan</CardTitle>
            <p className="mt-1 text-sm text-muted-fg">{totalSchools} registriert</p>
          </div>
        </CardHeader>
        <CardBody className="px-0! pb-0!">
          {schools.length === 0 ? (
            <p className="border-t border-border px-5 py-6 text-sm text-muted-fg">Noch keine Schulen registriert.</p>
          ) : (
            <ul className="divide-y divide-border border-t border-border">
              {schools.map((s) => {
                const tone = PLAN_TONE[s.plan as keyof typeof PLAN_TONE] ?? "outline";
                const label = PLAN_LABEL[s.plan as keyof typeof PLAN_LABEL] ?? s.plan;
                const pct = s.seats > 0 ? Math.round((s._count.users / s.seats) * 100) : 0;
                return (
                  <li key={s.id} className="flex items-center gap-4 px-5 py-3 transition-colors hover:bg-surface">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold">{s.name}</p>
                        <Badge variant={tone}>{label}</Badge>
                      </div>
                      <p className="text-xs text-muted-fg">
                        {s._count.users} / {s.seats} Sitze · {pct}% belegt · seit {s.createdAt.toLocaleDateString("de-DE", { month: "short", year: "numeric" })}
                      </p>
                    </div>
                    <div className="hidden w-24 lg:block">
                      <Progress value={pct} tone={pct >= 90 ? "warning" : "brand"} className="h-1" />
                    </div>
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
