import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Building2,
  CheckCircle2,
  CircleDollarSign,
  Database,
  Flag,
  Gauge,
  Globe,
  HelpCircle,
  KeyRound,
  Server,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db/client";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Plattform-Admin" };

const PLATFORM_STATS = [
  {
    label: "Schulen aktiv",
    value: "47",
    suffix: "↑ 8 ggü. Vormonat",
    icon: Building2,
    tone: "text-brand",
  },
  {
    label: "Aktive Nutzer · 30 T",
    value: "38.412",
    suffix: "MAU · ↑ 12 %",
    icon: Users,
    tone: "text-info",
  },
  {
    label: "MRR",
    value: "84.290 €",
    suffix: "↑ 11 % MoM",
    icon: CircleDollarSign,
    tone: "text-success",
  },
  {
    label: "KI-Anfragen · 24 h",
    value: "182k",
    suffix: "Latenz p95: 1,8 s",
    icon: Sparkles,
    tone: "text-warning",
  },
] as const;

// NOTE: TICKETS uses hardcoded data — a real support ticket system is needed here

const TICKETS = [
  {
    id: "MM-2104",
    school: "Realschule Stuttgart-West",
    subject: "Untis-Import schlägt fehl bei XML mit Umlauten",
    severity: "high" as const,
    by: "I. Hartmann",
    time: "vor 1 Std.",
  },
  {
    id: "MM-2103",
    school: "Gesamtschule Köln-Mitte",
    subject: "SCIM-Sync zeitweise fehlerhaft — 3 Lehrer-Konten doppelt",
    severity: "medium" as const,
    by: "S. Brandt",
    time: "vor 3 Std.",
  },
  {
    id: "MM-2102",
    school: "Gymnasium am Stadtpark",
    subject: "Frage zur Lizenz-Erweiterung um 250 Sitze",
    severity: "low" as const,
    by: "M. Weber",
    time: "gestern",
  },
];

const HEALTH = [
  { name: "API · /api/* (FRA)", status: "ok" as const, p95: "112 ms", uptime: "99,98 %" },
  { name: "DB · Postgres Primary (FRA)", status: "ok" as const, p95: "8 ms", uptime: "100 %" },
  { name: "Redis Cache (FRA)", status: "ok" as const, p95: "2 ms", uptime: "100 %" },
  { name: "KI-Provider · EU-Frankfurt", status: "watch" as const, p95: "1,8 s", uptime: "99,4 %" },
  { name: "WebSocket-Hub", status: "ok" as const, p95: "47 ms", uptime: "99,99 %" },
  { name: "E-Mail (Resend)", status: "ok" as const, p95: "—", uptime: "100 %" },
];

const FEATURE_FLAGS = [
  { name: "ki.korrektur.v3", on: true, schools: "alle Pro · Enterprise" },
  { name: "ki.tutor.audio", on: false, schools: "Beta · 4 Schulen" },
  { name: "community.peer-review", on: true, schools: "alle" },
  { name: "experiment.dashboard.v2", on: false, schools: "intern" },
];

const RECENT_ACTIVITY = [
  {
    actor: "System",
    text: "Nightly-Backup OK · 4,7 GB Frankfurt",
    time: "vor 12 Min.",
    tone: "info" as const,
  },
  {
    actor: "MM-Onboarding",
    text: "Realschule Stuttgart-West aktiviert · Basic-Plan · 84 Sitze",
    time: "vor 2 Std.",
    tone: "success" as const,
  },
  {
    actor: "KI-Provider",
    text: "Latenz-Spitze in 15-Min-Fenster · jetzt wieder normal",
    time: "vor 4 Std.",
    tone: "warning" as const,
  },
  {
    actor: "Andrea Hoffmann · admin@schule.de",
    text: "Lizenz Pro · Realschule München um 200 Sitze erweitert",
    time: "gestern",
    tone: "success" as const,
  },
];

export default async function PlattformPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const dbSchools = await prisma.school.findMany({
    include: { _count: { select: { users: true } } },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const totalSchoolCount = dbSchools.length;
  const totalUserCount = dbSchools.reduce((s, x) => s + x._count.users, 0);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8">
          <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="grid size-14 shrink-0 place-items-center bg-fg text-bg">
                <Globe className="size-6" strokeWidth={1.75} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">
                  Plattform-Admin · MasterMind
                </p>
                <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
                  {totalSchoolCount} Schulen · {totalUserCount.toLocaleString("de-DE")} aktive Nutzer
                </h1>
                <p className="mt-1 text-sm text-muted-fg">
                  Alle Systeme grün · 1 KI-Provider mit erhöhter Latenz · 3 offene Tickets
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm">
                <Activity className="size-3.5" />
                Status-Page
              </Button>
              <Button variant="outline" size="sm">
                <Building2 className="size-3.5" />
                Schule onboarden
              </Button>
              <Button size="sm" className="glow-on-hover">
                <Sparkles className="size-3.5" />
                Release ausrollen
              </Button>
            </div>
          </header>

          <section className="grid grid-cols-2 gap-px border border-border bg-border lg:grid-cols-4">
            {PLATFORM_STATS.map((s) => (
              <div key={s.label} className="bg-bg p-5">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">
                    {s.label}
                  </p>
                  <s.icon className={cn("size-4", s.tone)} strokeWidth={1.75} />
                </div>
                <p className="mt-3 font-mono text-3xl font-bold tracking-tight">
                  {s.value}
                </p>
                <p className="mt-1 text-xs text-muted-fg">{s.suffix}</p>
              </div>
            ))}
          </section>

          <div className="grid gap-6 xl:grid-cols-3">
            <div className="space-y-6 xl:col-span-2">
              <Card>
                <CardHeader>
                  <div>
                    <CardTitle>Schulen</CardTitle>
                    <p className="mt-1 text-sm text-muted-fg">
                      {dbSchools.length} von {totalSchoolCount} angezeigt · sortiert nach Erstellungsdatum
                    </p>
                  </div>
                  <Link
                    href="/plattform/schulen"
                    className={buttonVariants({ variant: "ghost", size: "sm" })}
                  >
                    Alle Schulen
                    <ArrowRight className="size-3.5" />
                  </Link>
                </CardHeader>
                <CardBody className="!px-0 !pb-0">
                  {dbSchools.length === 0 ? (
                    <p className="px-5 py-6 text-sm text-muted-fg">
                      Noch keine Schulen registriert.
                    </p>
                  ) : (
                    <ul className="divide-y divide-border border-t border-border">
                      {dbSchools.map((s) => (
                        <DbSchoolRow key={s.id} school={s} />
                      ))}
                    </ul>
                  )}
                </CardBody>
              </Card>

              <Card>
                <CardHeader>
                  <div>
                    <CardTitle>Support-Queue</CardTitle>
                    <p className="mt-1 text-sm text-muted-fg">
                      3 offene Tickets · Erstantwort &lt; 2 Std.
                    </p>
                  </div>
                  <Link
                    href="/plattform/support"
                    className={buttonVariants({ variant: "ghost", size: "sm" })}
                  >
                    Support öffnen
                    <ArrowRight className="size-3.5" />
                  </Link>
                </CardHeader>
                <CardBody className="!px-0 !pb-0">
                  <ul className="divide-y divide-border border-t border-border">
                    {TICKETS.map((t) => (
                      <li
                        key={t.id}
                        className="flex items-start gap-3 px-5 py-3.5 transition-colors hover:bg-surface"
                      >
                        <SeverityDot severity={t.severity} />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline">{t.id}</Badge>
                            <Badge
                              variant={
                                t.severity === "high"
                                  ? "danger"
                                  : t.severity === "medium"
                                    ? "warning"
                                    : "neutral"
                              }
                            >
                              {t.severity === "high"
                                ? "Hoch"
                                : t.severity === "medium"
                                  ? "Mittel"
                                  : "Niedrig"}
                            </Badge>
                            <p className="truncate text-sm font-semibold">
                              {t.subject}
                            </p>
                          </div>
                          <p className="mt-0.5 truncate text-xs text-muted-fg">
                            {t.school} · {t.by} · {t.time}
                          </p>
                        </div>
                        <Button size="sm" variant="secondary">
                          Öffnen
                          <ArrowRight className="size-3.5" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                </CardBody>
              </Card>

              <Card>
                <CardHeader>
                  <div>
                    <CardTitle>Aktivität · plattformweit</CardTitle>
                    <p className="mt-1 text-sm text-muted-fg">
                      Letzte Stunden · alle Schulen
                    </p>
                  </div>
                  <Link
                    href="/plattform/audit"
                    className={buttonVariants({ variant: "ghost", size: "sm" })}
                  >
                    Audit-Log
                    <ArrowRight className="size-3.5" />
                  </Link>
                </CardHeader>
                <CardBody className="!px-0 !pb-0">
                  <ul className="divide-y divide-border border-t border-border">
                    {RECENT_ACTIVITY.map((a, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-3 px-5 py-3 transition-colors hover:bg-surface"
                      >
                        <ActivityDot tone={a.tone} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm">
                            <span className="font-semibold">{a.actor}</span>
                            <span className="text-muted-fg"> · </span>
                            <span>{a.text}</span>
                          </p>
                        </div>
                        <span className="hidden shrink-0 font-mono text-[10px] uppercase tracking-wider text-muted-fg sm:inline">
                          {a.time}
                        </span>
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
                    <CardTitle>System-Health</CardTitle>
                    <p className="mt-1 text-sm text-muted-fg">
                      Frankfurt am Main · Multi-AZ
                    </p>
                  </div>
                  <Badge variant="success">
                    <CheckCircle2 className="size-3" />
                    OK
                  </Badge>
                </CardHeader>
                <CardBody className="!px-0 !pb-0">
                  <ul className="divide-y divide-border border-t border-border">
                    {HEALTH.map((h) => (
                      <HealthRow key={h.name} item={h} />
                    ))}
                  </ul>
                </CardBody>
              </Card>

              <Card>
                <CardHeader>
                  <div>
                    <CardTitle>Feature-Flags</CardTitle>
                    <p className="mt-1 text-sm text-muted-fg">4 von 12 angezeigt</p>
                  </div>
                  <Link
                    href="/plattform/flags"
                    className={buttonVariants({ variant: "ghost", size: "sm" })}
                  >
                    <Flag className="size-3.5" />
                    Verwalten
                  </Link>
                </CardHeader>
                <CardBody className="!px-0 !pb-0">
                  <ul className="divide-y divide-border border-t border-border">
                    {FEATURE_FLAGS.map((f) => (
                      <li
                        key={f.name}
                        className="flex items-center gap-3 px-5 py-3"
                      >
                        <span
                          className={cn(
                            "size-2 shrink-0",
                            f.on ? "bg-success" : "bg-border-strong"
                          )}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-mono text-xs font-bold">{f.name}</p>
                          <p className="text-[10px] uppercase tracking-wider text-muted-fg">
                            {f.schools}
                          </p>
                        </div>
                        <Badge variant={f.on ? "success" : "outline"}>
                          {f.on ? "An" : "Aus"}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                </CardBody>
              </Card>

              <div className="grid grid-cols-2 gap-2">
                <QuickTile
                  href="/plattform/abrechnung"
                  icon={<CircleDollarSign className="size-4" />}
                  label="Abrechnung"
                  hint="Stripe · 84k MRR"
                />
                <QuickTile
                  href="/plattform/sicherheit"
                  icon={<KeyRound className="size-4" />}
                  label="Sicherheit"
                  hint="2FA · Audit"
                />
                <QuickTile
                  href="/plattform/performance"
                  icon={<Gauge className="size-4" />}
                  label="Performance"
                  hint="p95 · 112 ms"
                />
                <QuickTile
                  href="/plattform/kb"
                  icon={<HelpCircle className="size-4" />}
                  label="Wissens-DB"
                  hint="Onboarding · FAQ"
                />
              </div>

              <Card className="border-brand/40 bg-gradient-to-br from-brand/[0.08] to-transparent">
                <CardBody className="!p-5">
                  <div className="flex items-center gap-2">
                    <Zap className="size-4 text-brand" strokeWidth={1.75} />
                    <p className="text-xs font-semibold uppercase tracking-wider text-brand">
                      Wachstum · 30 T
                    </p>
                  </div>
                  <p className="mt-4 text-base font-semibold leading-snug">
                    +8 Schulen, +4.120 Nutzer, +9.140 € MRR
                  </p>
                  <Progress value={68} tone="brand" className="mt-3" />
                  <p className="mt-2 text-xs text-muted-fg">
                    68 % des Quartalsziels · noch 47 Tage
                  </p>
                </CardBody>
              </Card>
            </div>
          </div>
    </div>
  );
}

type DbSchoolData = {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  plan: string;
  seats: number;
  createdAt: Date;
  _count: { users: number };
};

function DbSchoolRow({ school }: { school: DbSchoolData }) {
  const pct = school.seats > 0 ? Math.round((school._count.users / school.seats) * 100) : 0;
  const planLabel =
    school.plan === "enterprise" ? "Enterprise" : school.plan === "pro" ? "Pro" : "Basic";
  const planTone =
    school.plan === "enterprise" ? "success" : school.plan === "pro" ? "brand" : ("outline" as const);
  const location = [school.city, school.state].filter(Boolean).join(" · ") || "—";
  const joined = school.createdAt.toLocaleDateString("de-DE", { month: "long", year: "numeric" });
  return (
    <li className="grid grid-cols-1 gap-3 px-5 py-4 transition-colors hover:bg-surface lg:grid-cols-[auto_1fr_auto_auto_auto] lg:items-center lg:gap-6">
      <div className="grid size-10 shrink-0 place-items-center bg-fg text-bg">
        <Building2 className="size-4" strokeWidth={1.75} />
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-semibold">{school.name}</p>
          <Badge variant={planTone}>{planLabel}</Badge>
        </div>
        <p className="mt-0.5 text-xs text-muted-fg">
          {location} · seit {joined}
        </p>
      </div>
      <div className="hidden w-32 lg:block">
        <p className="font-mono text-xs font-semibold tabular-nums">
          <span className="font-bold">{school._count.users}</span>
          <span className="text-muted-fg"> / {school.seats}</span>
        </p>
        <Progress
          value={pct}
          tone={pct >= 90 ? "warning" : pct >= 70 ? "brand" : "success"}
          className="mt-1 h-1"
        />
      </div>
      <p className="hidden font-mono text-sm font-bold tabular-nums lg:inline">
        {school._count.users} Nutzer
      </p>
      <ArrowUpRight className="hidden size-3.5 text-muted-fg lg:inline" />
    </li>
  );
}

function HealthRow({
  item,
}: {
  item: { name: string; status: "ok" | "watch" | "alert"; p95: string; uptime: string };
}) {
  const Icon =
    item.name.includes("DB") || item.name.includes("Redis")
      ? Database
      : item.name.includes("API")
        ? Server
        : Activity;
  return (
    <li className="flex items-center gap-3 px-5 py-3">
      <Icon className="size-4 shrink-0 text-muted-fg" strokeWidth={1.75} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{item.name}</p>
        <p className="font-mono text-[10px] uppercase tracking-wider text-muted-fg">
          p95 {item.p95} · Uptime {item.uptime}
        </p>
      </div>
      <span
        className={cn(
          "size-2",
          item.status === "ok" && "bg-success",
          item.status === "watch" && "bg-warning",
          item.status === "alert" && "bg-danger"
        )}
        aria-label={item.status}
      />
    </li>
  );
}

function SeverityDot({ severity }: { severity: "low" | "medium" | "high" }) {
  const tone =
    severity === "high"
      ? "bg-danger"
      : severity === "medium"
        ? "bg-warning"
        : "bg-info";
  return <span className={cn("mt-1.5 size-2 shrink-0", tone)} aria-hidden />;
}

function ActivityDot({ tone }: { tone: "info" | "success" | "warning" }) {
  const cls =
    tone === "success" ? "bg-success" : tone === "warning" ? "bg-warning" : "bg-info";
  return <span className={cn("mt-1.5 size-1.5 shrink-0", cls)} aria-hidden />;
}

function QuickTile({
  href,
  icon,
  label,
  hint,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  hint: string;
}) {
  return (
    <Link href={href} className="premium-card group flex flex-col gap-2 p-3">
      <span className="grid size-8 place-items-center bg-fg text-bg">{icon}</span>
      <span className="text-sm font-semibold">{label}</span>
      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-fg">
        {hint}
      </span>
    </Link>
  );
}
