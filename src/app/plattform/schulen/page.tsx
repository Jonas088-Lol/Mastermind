import {
  ArrowLeft,
  ArrowUpRight,
  Building2,
  Filter,
  Plus,
  Search,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Schulen" };

interface School {
  id: string;
  name: string;
  city: string;
  state: string;
  plan: "Basic" | "Pro" | "Enterprise";
  users: number;
  seats: number;
  mrr: string;
  trend: "up" | "down" | "flat";
  health: "ok" | "watch" | "alert";
  joined: string;
  csm: string;
}

const SCHOOLS: School[] = [
  { id: "rs-muenchen", name: "Realschule München", city: "München", state: "BY", plan: "Pro", users: 847, seats: 1000, mrr: "1.890 €", trend: "up", health: "ok", joined: "2024-09", csm: "L. Krüger" },
  { id: "gym-stadtpark", name: "Gymnasium am Stadtpark", city: "Berlin", state: "BE", plan: "Enterprise", users: 1240, seats: 1500, mrr: "4.200 €", trend: "up", health: "ok", joined: "2025-02", csm: "L. Krüger" },
  { id: "ges-koeln", name: "Gesamtschule Köln-Mitte", city: "Köln", state: "NW", plan: "Pro", users: 612, seats: 800, mrr: "1.490 €", trend: "flat", health: "watch", joined: "2025-08", csm: "T. Vogel" },
  { id: "bk-hamburg", name: "Berufskolleg Hamburg-Ost", city: "Hamburg", state: "HH", plan: "Pro", users: 530, seats: 600, mrr: "1.290 €", trend: "up", health: "ok", joined: "2025-10", csm: "T. Vogel" },
  { id: "rs-stuttgart", name: "Realschule Stuttgart-West", city: "Stuttgart", state: "BW", plan: "Basic", users: 84, seats: 100, mrr: "190 €", trend: "flat", health: "alert", joined: "2026-04", csm: "L. Krüger" },
  { id: "gym-leipzig", name: "Humboldt-Gymnasium Leipzig", city: "Leipzig", state: "SN", plan: "Pro", users: 720, seats: 900, mrr: "1.620 €", trend: "up", health: "ok", joined: "2025-04", csm: "T. Vogel" },
  { id: "rs-dortmund", name: "Helmholtz-Realschule", city: "Dortmund", state: "NW", plan: "Pro", users: 340, seats: 500, mrr: "780 €", trend: "down", health: "watch", joined: "2024-11", csm: "T. Vogel" },
  { id: "ges-bremen", name: "Gesamtschule Bremen-Nord", city: "Bremen", state: "HB", plan: "Pro", users: 489, seats: 600, mrr: "1.180 €", trend: "up", health: "ok", joined: "2025-06", csm: "L. Krüger" },
  { id: "gym-frankfurt", name: "Lessing-Gymnasium", city: "Frankfurt", state: "HE", plan: "Enterprise", users: 980, seats: 1200, mrr: "3.480 €", trend: "up", health: "ok", joined: "2024-08", csm: "L. Krüger" },
];

interface PageProps {
  searchParams: Promise<{ plan?: string; health?: string }>;
}

export default async function SchulenPage({ searchParams }: PageProps) {
  const { plan, health } = await searchParams;
  const filtered = SCHOOLS.filter((s) => {
    if (plan && s.plan.toLowerCase() !== plan.toLowerCase()) return false;
    if (health && s.health !== health) return false;
    return true;
  });

  const totalMRR = SCHOOLS.reduce((sum, s) => sum + parseInt(s.mrr.replace(/\D/g, ""), 10), 0);
  const totalUsers = SCHOOLS.reduce((sum, s) => sum + s.users, 0);
  const totalSeats = SCHOOLS.reduce((sum, s) => sum + s.seats, 0);

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
              Schulen
            </h1>
            <p className="mt-1 text-sm text-muted-fg">
              {SCHOOLS.length} Schulen · {totalUsers.toLocaleString("de-DE")} Nutzer ·{" "}
              {totalMRR.toLocaleString("de-DE")} € MRR
            </p>
          </div>
          <Button size="sm" className="glow-on-hover">
            <Plus className="size-3.5" />
            Schule onboarden
          </Button>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-px border border-border bg-border lg:grid-cols-4">
        <Stat label="Schulen" value={String(SCHOOLS.length)} suffix="aktiv" />
        <Stat label="Nutzer" value={totalUsers.toLocaleString("de-DE")} suffix={`von ${totalSeats.toLocaleString("de-DE")} Sitzen`} />
        <Stat label="MRR" value={`${totalMRR.toLocaleString("de-DE")} €`} suffix="↑ 11 % MoM" />
        <Stat label="Health · OK" value={String(SCHOOLS.filter((s) => s.health === "ok").length)} suffix={`von ${SCHOOLS.length}`} />
      </section>

      <section className="flex flex-col gap-3 border border-border bg-bg p-4 sm:flex-row sm:items-center sm:gap-6">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-fg">
          <Filter className="size-3.5" />
          Filter
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Chip href="/plattform/schulen" active={!plan && !health}>Alle</Chip>
          <Chip href="/plattform/schulen?plan=basic" active={plan === "basic"}>Basic</Chip>
          <Chip href="/plattform/schulen?plan=pro" active={plan === "pro"}>Pro</Chip>
          <Chip href="/plattform/schulen?plan=enterprise" active={plan === "enterprise"}>Enterprise</Chip>
        </div>
        <div className="flex flex-wrap gap-1.5 sm:ml-auto">
          <Chip href="/plattform/schulen?health=watch" active={health === "watch"}>Beobachten</Chip>
          <Chip href="/plattform/schulen?health=alert" active={health === "alert"}>Aufmerksam</Chip>
        </div>
        <form action="/plattform/schulen" method="get" className="sm:ml-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-fg" />
            <Input name="q" placeholder="Schule suchen…" className="h-8 w-48 pl-9 text-xs" />
          </div>
        </form>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>{filtered.length} Schulen</CardTitle>
          <span className="font-mono text-xs text-muted-fg">
            sortiert nach MRR · absteigend
          </span>
        </CardHeader>
        <CardBody className="!px-0 !pb-0">
          <div className="hidden grid-cols-[2fr_1fr_1fr_120px_100px_100px_auto] items-center gap-4 border-b border-border bg-surface px-5 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-fg lg:grid">
            <span>Schule</span>
            <span>Plan</span>
            <span>Auslastung</span>
            <span className="text-right">MRR</span>
            <span className="text-right">Trend</span>
            <span className="text-right">CSM</span>
            <span className="w-7" />
          </div>
          <ul className="divide-y divide-border">
            {filtered.map((s) => (
              <SchoolRow key={s.id} school={s} />
            ))}
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}

function Stat({ label, value, suffix }: { label: string; value: string; suffix: string }) {
  return (
    <div className="bg-bg p-5">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">
        {label}
      </p>
      <p className="mt-3 font-mono text-3xl font-bold tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-muted-fg">{suffix}</p>
    </div>
  );
}

function Chip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-pressed={active}
      className={cn(
        "px-2.5 py-1 text-xs font-medium transition-colors",
        active
          ? "bg-fg text-bg"
          : "border border-border bg-bg text-muted-fg hover:border-fg/30 hover:text-fg"
      )}
    >
      {children}
    </Link>
  );
}

function SchoolRow({ school }: { school: School }) {
  const pct = Math.round((school.users / school.seats) * 100);
  const planTone = {
    Basic: "outline",
    Pro: "brand",
    Enterprise: "success",
  }[school.plan] as "outline" | "brand" | "success";
  return (
    <li className="grid grid-cols-1 gap-3 px-5 py-4 transition-colors hover:bg-surface lg:grid-cols-[2fr_1fr_1fr_120px_100px_100px_auto] lg:items-center lg:gap-4">
      <div className="flex items-center gap-3">
        <div className="grid size-10 shrink-0 place-items-center bg-fg text-bg">
          <Building2 className="size-4" strokeWidth={1.75} />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-semibold">{school.name}</p>
            {school.health !== "ok" && (
              <Badge variant={school.health === "watch" ? "warning" : "danger"}>
                {school.health === "watch" ? "beobachten" : "aufmerksam"}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-fg">
            {school.city} · {school.state} · seit {school.joined}
          </p>
        </div>
      </div>
      <Badge variant={planTone}>{school.plan}</Badge>
      <div>
        <p className="font-mono text-xs font-semibold tabular-nums">
          <span className="font-bold">{school.users}</span>
          <span className="text-muted-fg"> / {school.seats}</span>
          <span className="ml-2 text-muted-fg">{pct} %</span>
        </p>
        <Progress
          value={pct}
          tone={pct >= 90 ? "warning" : pct >= 70 ? "brand" : "success"}
          className="mt-1 h-1"
        />
      </div>
      <p className="font-mono text-sm font-bold tabular-nums lg:text-right">
        {school.mrr}
      </p>
      <TrendCell trend={school.trend} />
      <span className="hidden font-mono text-[10px] uppercase tracking-wider text-muted-fg lg:inline lg:text-right">
        {school.csm}
      </span>
      <ArrowUpRight className="hidden size-3.5 text-muted-fg lg:inline" />
    </li>
  );
}

function TrendCell({ trend }: { trend: "up" | "down" | "flat" }) {
  if (trend === "up")
    return (
      <span className="flex items-center justify-end gap-1 font-mono text-[10px] text-success">
        <TrendingUp className="size-3" />
        steigend
      </span>
    );
  if (trend === "down")
    return (
      <span className="flex items-center justify-end gap-1 font-mono text-[10px] text-danger">
        <TrendingDown className="size-3" />
        fallend
      </span>
    );
  return (
    <span className="flex items-center justify-end font-mono text-[10px] text-muted-fg">
      stabil
    </span>
  );
}
