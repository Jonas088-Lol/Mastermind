import {
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  CircleDollarSign,
  Clock,
  Download,
  Receipt,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Abrechnung" };

const MONTHLY = [
  { month: "Mai", value: 67400 },
  { month: "Jun", value: 69800 },
  { month: "Jul", value: 71200 },
  { month: "Aug", value: 72500 },
  { month: "Sep", value: 75100 },
  { month: "Okt", value: 78400 },
  { month: "Nov", value: 80900 },
  { month: "Dez", value: 81700 },
  { month: "Jan", value: 78900 },
  { month: "Feb", value: 81200 },
  { month: "Mar", value: 84290, current: true },
];

const PLAN_BREAKDOWN = [
  { plan: "Basic", schools: 8, users: 720, revenue: 1410, tone: "outline" as const },
  { plan: "Pro", schools: 32, users: 24800, revenue: 56720, tone: "brand" as const },
  { plan: "Enterprise", schools: 7, users: 13900, revenue: 26160, tone: "success" as const },
];

const RECENT_INVOICES = [
  { id: "MM-2026-0247", school: "Realschule München", amount: "1.890,00 €", date: "01.03.2026", status: "paid" as const, plan: "Pro" },
  { id: "MM-2026-0248", school: "Gymnasium am Stadtpark", amount: "4.200,00 €", date: "01.03.2026", status: "paid" as const, plan: "Enterprise" },
  { id: "MM-2026-0249", school: "Gesamtschule Köln-Mitte", amount: "1.490,00 €", date: "01.03.2026", status: "open" as const, plan: "Pro" },
  { id: "MM-2026-0250", school: "Berufskolleg Hamburg-Ost", amount: "1.290,00 €", date: "01.03.2026", status: "paid" as const, plan: "Pro" },
  { id: "MM-2026-0251", school: "Realschule Stuttgart-West", amount: "190,00 €", date: "01.03.2026", status: "paid" as const, plan: "Basic" },
  { id: "MM-2026-0246", school: "Realschule München", amount: "1.890,00 €", date: "01.02.2026", status: "paid" as const, plan: "Pro" },
];

export default function AbrechnungPage() {
  const totalMRR = PLAN_BREAKDOWN.reduce((s, p) => s + p.revenue, 0);
  const totalSchools = PLAN_BREAKDOWN.reduce((s, p) => s + p.schools, 0);
  const max = Math.max(...MONTHLY.map((m) => m.value));

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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Abrechnung
            </h1>
            <p className="mt-1 text-sm text-muted-fg">
              Stripe · monatliche Abrechnung · {totalSchools} zahlende Schulen ·{" "}
              {totalMRR.toLocaleString("de-DE")} € MRR
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm">
              <Download className="size-3.5" />
              Buchhaltungs-Export
            </Button>
            <Button size="sm">
              <ArrowUpRight className="size-3.5" />
              Stripe Dashboard
            </Button>
          </div>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-px border border-border bg-border lg:grid-cols-4">
        <Stat label="MRR" value={`${totalMRR.toLocaleString("de-DE")} €`} suffix="↑ 11 % MoM" tone="text-success" />
        <Stat label="ARR" value={`${(totalMRR * 12).toLocaleString("de-DE")} €`} suffix="run-rate" tone="text-brand" />
        <Stat label="ARPU" value={`${Math.round(totalMRR / 38412 * 100) / 100} €`} suffix="je aktivem Nutzer" tone="text-info" />
        <Stat label="Offene Rechnungen" value="1" suffix="2.890 € · Köln" tone="text-warning" />
      </section>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>MRR-Verlauf · 11 Monate</CardTitle>
            <p className="mt-1 text-sm text-muted-fg">
              Wachstum: +25 % seit Mai · stabiles Pro-Wachstum
            </p>
          </div>
          <Badge variant="success">
            <TrendingUp className="size-3" />
            +11 % MoM
          </Badge>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-11 gap-2">
            {MONTHLY.map((m) => {
              const height = (m.value / max) * 100;
              return (
                <div key={m.month} className="flex flex-col items-center gap-2">
                  <div className="flex h-32 w-full items-end bg-surface-2">
                    <div
                      className={cn(
                        "w-full transition-[height]",
                        m.current ? "bg-brand" : "bg-fg/70"
                      )}
                      style={{ height: `${height}%` }}
                    />
                  </div>
                  <p className="font-mono text-[10px] text-muted-fg">
                    {Math.round(m.value / 1000)}k
                  </p>
                  <p
                    className={cn(
                      "text-[10px] font-semibold uppercase tracking-wider",
                      m.current ? "text-brand" : "text-muted-fg"
                    )}
                  >
                    {m.month}
                  </p>
                </div>
              );
            })}
          </div>
        </CardBody>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>MRR nach Plan</CardTitle>
            <span className="font-mono text-xs text-muted-fg">
              {totalSchools} Schulen
            </span>
          </CardHeader>
          <CardBody>
            <ul className="space-y-4">
              {PLAN_BREAKDOWN.map((p) => {
                const pct = Math.round((p.revenue / totalMRR) * 100);
                return (
                  <li key={p.plan} className="space-y-2">
                    <div className="flex items-baseline justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Badge variant={p.tone}>{p.plan}</Badge>
                        <span className="text-xs text-muted-fg">
                          {p.schools} Schulen · {p.users.toLocaleString("de-DE")} Nutzer
                        </span>
                      </div>
                      <span className="font-mono">
                        <span className="font-bold">{p.revenue.toLocaleString("de-DE")} €</span>
                        <span className="ml-2 text-muted-fg">{pct} %</span>
                      </span>
                    </div>
                    <Progress
                      value={pct}
                      tone={p.tone === "outline" ? "warning" : p.tone === "brand" ? "brand" : "success"}
                    />
                  </li>
                );
              })}
            </ul>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Stripe-Status</CardTitle>
            <Badge variant="success">
              <CheckCircle2 className="size-3" />
              Verbunden
            </Badge>
          </CardHeader>
          <CardBody>
            <ul className="space-y-3 text-sm">
              <Row label="Stripe-Konto" value="acct_1Mzx · MasterMind GmbH" status="ok" />
              <Row label="Tax · Auto-Calc" value="aktiv · DACH" status="ok" />
              <Row label="Webhook-Endpoint" value="/api/stripe/webhook · OK" status="ok" />
              <Row label="Subscription-Sync" value="200 / 200 · letzter Sync vor 5 Min" status="ok" />
              <Row label="Failed Charges · 30 T" value="0" status="ok" />
            </ul>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm">
                <Receipt className="size-3.5" />
                Buchhaltungs-Sync
              </Button>
              <Button variant="outline" size="sm">
                <CircleDollarSign className="size-3.5" />
                Auszahlungen
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Letzte Rechnungen</CardTitle>
            <p className="mt-1 text-sm text-muted-fg">
              {RECENT_INVOICES.length} angezeigt · 1 offen
            </p>
          </div>
          <Button variant="ghost" size="sm">
            <Download className="size-3.5" />
            Alle exportieren
          </Button>
        </CardHeader>
        <CardBody className="!px-0 !pb-0">
          <div className="hidden grid-cols-[140px_1fr_100px_auto_auto] items-center gap-4 border-b border-border bg-surface px-5 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-fg lg:grid">
            <span>Rechnungs-Nr.</span>
            <span>Schule</span>
            <span>Plan</span>
            <span className="text-right">Betrag</span>
            <span className="text-right">Status</span>
          </div>
          <ul className="divide-y divide-border">
            {RECENT_INVOICES.map((inv) => (
              <li
                key={inv.id}
                className="grid grid-cols-1 gap-2 px-5 py-3.5 transition-colors hover:bg-surface lg:grid-cols-[140px_1fr_100px_auto_auto] lg:items-center lg:gap-4"
              >
                <p className="font-mono text-[11px] text-muted-fg">{inv.id}</p>
                <div>
                  <p className="text-sm font-semibold">{inv.school}</p>
                  <p className="text-xs text-muted-fg">{inv.date}</p>
                </div>
                <Badge variant={inv.plan === "Enterprise" ? "success" : inv.plan === "Pro" ? "brand" : "outline"}>
                  {inv.plan}
                </Badge>
                <p className="font-mono text-sm font-bold tabular-nums lg:text-right">
                  {inv.amount}
                </p>
                {inv.status === "paid" ? (
                  <Badge variant="success">
                    <CheckCircle2 className="size-3" />
                    Bezahlt
                  </Badge>
                ) : (
                  <Badge variant="warning">
                    <Clock className="size-3" />
                    Offen
                  </Badge>
                )}
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}

function Stat({
  label,
  value,
  suffix,
  tone,
}: {
  label: string;
  value: string;
  suffix: string;
  tone: string;
}) {
  return (
    <div className="bg-bg p-5">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">
          {label}
        </p>
        <CircleDollarSign className={cn("size-4", tone)} strokeWidth={1.75} />
      </div>
      <p className="mt-3 font-mono text-3xl font-bold tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-muted-fg">{suffix}</p>
    </div>
  );
}

function Row({
  label,
  value,
  status,
}: {
  label: string;
  value: string;
  status?: "ok";
}) {
  return (
    <li className="flex items-center justify-between border-b border-border pb-2 last:border-b-0 last:pb-0">
      <span className="text-muted-fg">{label}</span>
      <span className="flex items-center gap-1.5 font-mono text-xs">
        {status === "ok" && <CheckCircle2 className="size-3 text-success" />}
        {value}
      </span>
    </li>
  );
}
