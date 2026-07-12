/* Copyright 2026 Elian Schock, Jonas Schwenk */
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Abrechnung · Schulträger" };

const PLAN_PRICE: Record<string, number> = {
  basic: 99,
  pro: 199,
  enterprise: 499,
};

const PLAN_LABEL: Record<string, string> = {
  basic: "Basic",
  pro: "Pro",
  enterprise: "Enterprise",
};

function PlanBadge({ plan }: { plan: string }) {
  if (plan === "enterprise") {
    return <Badge className="bg-warning/15 text-warning">Enterprise</Badge>;
  }
  if (plan === "pro") {
    return <Badge variant="info">Pro</Badge>;
  }
  return <Badge variant="neutral">Basic</Badge>;
}

// Simulate quarterly data based on current month
function buildQuarterlyRows(monthlyTotal: number) {
  const now = new Date();
  const month = now.getMonth(); // 0-indexed
  const year = now.getFullYear();

  const quarters = [
    { label: "Q1", months: ["Jan", "Feb", "Mrz"] },
    { label: "Q2", months: ["Apr", "Mai", "Jun"] },
    { label: "Q3", months: ["Jul", "Aug", "Sep"] },
    { label: "Q4", months: ["Okt", "Nov", "Dez"] },
  ];

  const currentQuarter = Math.floor(month / 3);

  return quarters.map((q, qi) => ({
    quarter: `${q.label} ${year}`,
    months: q.months,
    total: qi < currentQuarter ? monthlyTotal * 3 : qi === currentQuarter ? monthlyTotal * ((month % 3) + 1) : null,
    status: qi < currentQuarter ? "Abgerechnet" : qi === currentQuarter ? "Laufend" : "Ausstehend",
  }));
}

export default async function SchultraegerAbrechnungPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "school_company" && effectiveRole(session) !== "super") redirect("/login");

  const schools = await prisma.school.findMany({
    include: {
      _count: { select: { users: true } },
    },
    orderBy: { name: "asc" },
  });

  const totalMonthly = schools.reduce((sum, sc) => sum + (PLAN_PRICE[sc.plan] ?? 99), 0);
  const quarterlyRows = buildQuarterlyRows(totalMonthly);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Abrechnung</h1>
        <p className="mt-1 text-sm text-muted-fg">Übersicht über Kosten und Lizenzen aller Schulen im Träger.</p>
      </header>

      {/* Monthly total banner */}
      <div className="border border-border bg-bg p-6">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">
          Monatliche Gesamtkosten
        </p>
        <p className="mt-3 font-mono text-5xl font-bold">{totalMonthly.toLocaleString("de-DE")} €</p>
        <p className="mt-1 text-sm text-muted-fg">
          {schools.length} Schule{schools.length !== 1 ? "n" : ""} ·{" "}
          {schools.filter((s) => s.plan === "basic").length} Basic ·{" "}
          {schools.filter((s) => s.plan === "pro").length} Pro ·{" "}
          {schools.filter((s) => s.plan === "enterprise").length} Enterprise
        </p>
      </div>

      {/* Per-school billing cards */}
      <div>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-fg">
          Schulen im Detail
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {schools.map((school) => {
            const price = PLAN_PRICE[school.plan] ?? 99;
            return (
              <Card key={school.id}>
                <CardHeader>
                  <div className="flex flex-1 flex-col gap-1">
                    <CardTitle className="text-base font-bold normal-case tracking-normal text-fg">
                      {school.name}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <PlanBadge plan={school.plan} />
                      <span className="text-xs text-muted-fg">
                        {school._count.users} aktive Nutzer
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-2xl font-bold">{price} €</p>
                    <p className="text-xs text-muted-fg">/ Monat</p>
                  </div>
                </CardHeader>
                <CardBody>
                  <p className="text-xs text-muted-fg">
                    Plan: <span className="font-semibold text-fg">{PLAN_LABEL[school.plan] ?? school.plan}</span>
                    {school.seats && (
                      <>
                        {" · "}Kontingent:{" "}
                        <span className="font-semibold text-fg">
                          {school._count.users}/{school.seats} Nutzer
                        </span>
                      </>
                    )}
                  </p>
                </CardBody>
              </Card>
            );
          })}
          {schools.length === 0 && (
            <p className="border border-border bg-bg px-5 py-8 text-sm text-muted-fg">
              Keine Schulen vorhanden.
            </p>
          )}
        </div>
      </div>

      {/* Quarterly summary */}
      <div>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-fg">
          Quartalsübersicht
        </h2>
        <table className="w-full border border-border text-sm">
          <thead className="border-b border-border bg-surface text-left text-xs font-semibold uppercase tracking-wider text-muted-fg">
            <tr>
              <th className="px-4 py-3">Quartal</th>
              <th className="px-4 py-3">Monate</th>
              <th className="px-4 py-3 text-right">Betrag</th>
              <th className="px-4 py-3 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {quarterlyRows.map((row) => (
              <tr key={row.quarter} className="bg-bg hover:bg-surface">
                <td className="px-4 py-3 font-medium">{row.quarter}</td>
                <td className="px-4 py-3 text-muted-fg">{row.months.join(", ")}</td>
                <td className="px-4 py-3 text-right font-mono">
                  {row.total !== null ? `${row.total.toLocaleString("de-DE")} €` : "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  {row.status === "Abgerechnet" && (
                    <Badge variant="success">{row.status}</Badge>
                  )}
                  {row.status === "Laufend" && (
                    <Badge variant="info">{row.status}</Badge>
                  )}
                  {row.status === "Ausstehend" && (
                    <Badge variant="neutral">{row.status}</Badge>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Invoice request */}
      <div className="border border-border bg-bg p-6">
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wider text-muted-fg">
          Rechnung anfordern
        </h2>
        <p className="mb-4 text-sm text-muted-fg">
          Rechnungen werden auf Anfrage manuell ausgestellt. Bitte kontaktiere unseren Support.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled
            className={cn(
              buttonVariants({ variant: "secondary", size: "sm" }),
              "cursor-not-allowed opacity-60"
            )}
            title="Bitte kontaktiere support@mastermind.de"
          >
            Rechnung anfordern
          </button>
          <span className="text-xs text-muted-fg">
            Kontaktiere{" "}
            <a
              href="mailto:support@mastermind.de"
              className="font-medium text-brand hover:underline"
            >
              support@mastermind.de
            </a>
          </span>
        </div>
      </div>
    </div>
  );
}
