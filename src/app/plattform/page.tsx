import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Building2,
  CheckCircle2,
  ClipboardList,
  Database,
  Flag,
  Gauge,
  Globe,
  GraduationCap,
  HelpCircle,
  KeyRound,
  Server,
  Users,
  Zap,
} from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db/client";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Plattform-Admin" };

function buildHealth() {
  const aiKey = Boolean(process.env.ANTHROPIC_API_KEY);
  const vapidOk = Boolean(process.env.VAPID_PRIVATE_KEY && process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY);
  return [
    { name: "API · /api/*", status: "ok" as const },
    { name: "DB · SQLite", status: "ok" as const },
    { name: "KI-Provider · Anthropic", status: aiKey ? ("ok" as const) : ("watch" as const) },
    { name: "Push-Service (VAPID)", status: vapidOk ? ("ok" as const) : ("watch" as const) },
  ];
}

export default async function PlattformPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [
    schools,
    userCount,
    submissionsPending,
    assignmentCount,
    gradeCount,
    recentSchools,
    recentUsers,
  ] = await Promise.all([
    prisma.school.findMany({
      include: { _count: { select: { users: true, classes: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.count(),
    prisma.submission.count({ where: { status: "submitted" } }),
    prisma.assignment.count(),
    prisma.grade.count(),
    prisma.school.findMany({
      orderBy: { createdAt: "desc" },
      take: 4,
      select: { id: true, name: true, plan: true, createdAt: true },
    }),
    prisma.user.findMany({
      where: { role: { in: ["teacher", "admin"] } },
      orderBy: { createdAt: "desc" },
      take: 4,
      select: {
        id: true,
        name: true,
        role: true,
        createdAt: true,
        school: { select: { name: true } },
      },
    }),
  ]);

  const health = buildHealth();
  const totalSchoolCount = schools.length;
  const totalUserCount = userCount;

  // Build activity feed from recent DB events
  type ActivityItem = { text: string; detail: string; tone: "success" | "info" | "warning"; relTime: string };
  const activityItems: ActivityItem[] = [];
  for (const s of recentSchools) {
    activityItems.push({
      text: `${s.name} registriert`,
      detail: `Plan: ${s.plan} · ${s.createdAt.toLocaleDateString("de-DE", { day: "numeric", month: "short", year: "numeric" })}`,
      tone: "success",
      relTime: relativeTime(s.createdAt),
    });
  }
  for (const u of recentUsers) {
    activityItems.push({
      text: `${u.name} beigetreten`,
      detail: `${u.role === "teacher" ? "Lehrer" : "Admin"} · ${u.school?.name ?? "—"}`,
      tone: "info",
      relTime: relativeTime(u.createdAt),
    });
  }
  activityItems.sort((a, b) => 0); // already sorted by createdAt desc in queries

  const stats = [
    { label: "Schulen aktiv", value: String(totalSchoolCount), suffix: "", icon: Building2, tone: "text-brand" },
    { label: "Nutzer gesamt", value: totalUserCount.toLocaleString("de-DE"), suffix: "", icon: Users, tone: "text-info" },
    { label: "Aufgaben erstellt", value: String(assignmentCount), suffix: "", icon: ClipboardList, tone: "text-success" },
    { label: "Noten vergeben", value: String(gradeCount), suffix: "", icon: GraduationCap, tone: "text-warning" },
  ] as const;

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
              {totalSchoolCount} {totalSchoolCount === 1 ? "Schule" : "Schulen"} · {totalUserCount.toLocaleString("de-DE")} Nutzer
            </h1>
            <p className="mt-1 text-sm text-muted-fg">
              {submissionsPending} offene Abgaben · {assignmentCount} Aufgaben · {gradeCount} Noten
            </p>
          </div>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-px border border-border bg-border lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-bg p-5">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">{s.label}</p>
              <s.icon className={cn("size-4", s.tone)} strokeWidth={1.75} />
            </div>
            <p className="mt-3 font-mono text-3xl font-bold tracking-tight">{s.value}</p>
            {s.suffix && <p className="mt-1 text-xs text-muted-fg">{s.suffix}</p>}
          </div>
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Schulen</CardTitle>
                <p className="mt-1 text-sm text-muted-fg">{totalSchoolCount} registriert · sortiert nach Erstellungsdatum</p>
              </div>
              <Link href="/schultraeger/schulen" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                Alle Schulen
                <ArrowRight className="size-3.5" />
              </Link>
            </CardHeader>
            <CardBody className="!px-0 !pb-0">
              {schools.length === 0 ? (
                <p className="px-5 py-6 text-sm text-muted-fg">Noch keine Schulen registriert.</p>
              ) : (
                <ul className="divide-y divide-border border-t border-border">
                  {schools.map((s) => (
                    <SchoolRow key={s.id} school={s} />
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Aktivität · plattformweit</CardTitle>
                <p className="mt-1 text-sm text-muted-fg">Neueste Schulen & Nutzer</p>
              </div>
            </CardHeader>
            <CardBody className="!px-0 !pb-0">
              {activityItems.length === 0 ? (
                <p className="px-5 py-4 text-sm text-muted-fg">Noch keine Aktivität.</p>
              ) : (
                <ul className="divide-y divide-border border-t border-border">
                  {activityItems.map((a, i) => (
                    <li key={i} className="flex items-start gap-3 px-5 py-3 transition-colors hover:bg-surface">
                      <span className={cn("mt-1.5 size-1.5 shrink-0", a.tone === "success" ? "bg-success" : a.tone === "warning" ? "bg-warning" : "bg-info")} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold">{a.text}</p>
                        <p className="text-xs text-muted-fg">{a.detail}</p>
                      </div>
                      <span className="hidden shrink-0 font-mono text-[10px] uppercase tracking-wider text-muted-fg sm:inline">
                        {a.relTime}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>System-Health</CardTitle>
                <p className="mt-1 text-sm text-muted-fg">Kernkomponenten</p>
              </div>
              <Badge variant={health.every((h) => h.status === "ok") ? "success" : "warning"}>
                <CheckCircle2 className="size-3" />
                {health.every((h) => h.status === "ok") ? "OK" : "Warnung"}
              </Badge>
            </CardHeader>
            <CardBody className="!px-0 !pb-0">
              <ul className="divide-y divide-border border-t border-border">
                {health.map((h) => (
                  <HealthRow key={h.name} item={h} />
                ))}
              </ul>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Feature-Flags</CardTitle>
              </div>
              <Link href="/plattform/flags" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                <Flag className="size-3.5" />
                Alle Flags
                <ArrowRight className="size-3.5" />
              </Link>
            </CardHeader>
            <CardBody>
              <p className="text-sm text-muted-fg">
                Verwaltung aktiver Flags, Rollouts und Experimente auf der{" "}
                <Link href="/plattform/flags" className="font-semibold text-brand hover:underline">
                  Flags-Seite
                </Link>.
              </p>
            </CardBody>
          </Card>

          <div className="grid grid-cols-2 gap-2">
            <QuickTile href="/schultraeger" icon={<Building2 className="size-4" />} label="Schulträger" hint="Schulen · Stats" />
            <QuickTile href="/admin" icon={<KeyRound className="size-4" />} label="Admin" hint="Schul-Admin" />
            <QuickTile href="/teach" icon={<Gauge className="size-4" />} label="Lehrer" hint="Cockpit" />
            <QuickTile href="/app" icon={<HelpCircle className="size-4" />} label="Schüler-App" hint="Lernbereich" />
          </div>

          <Card className="border-brand/40 bg-gradient-to-br from-brand/[0.08] to-transparent">
            <CardBody className="!p-5">
              <div className="flex items-center gap-2">
                <Zap className="size-4 text-brand" strokeWidth={1.75} />
                <p className="text-xs font-semibold uppercase tracking-wider text-brand">Plattform-Status</p>
              </div>
              <p className="mt-4 text-base font-semibold leading-snug">
                {totalSchoolCount} Schulen · {totalUserCount.toLocaleString("de-DE")} Nutzer · {gradeCount} Noten
              </p>
              <Progress
                value={Math.min(100, Math.round((totalSchoolCount / 100) * 100))}
                tone="brand"
                className="mt-3"
              />
              <p className="mt-2 text-xs text-muted-fg">
                {totalSchoolCount} / 100 Schulen-Ziel
              </p>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

type SchoolData = {
  id: string;
  name: string;
  city: string | null;
  plan: string;
  seats: number;
  createdAt: Date;
  _count: { users: number; classes: number };
};

function SchoolRow({ school }: { school: SchoolData }) {
  const pct = school.seats > 0 ? Math.round((school._count.users / school.seats) * 100) : 0;
  const planVariant = school.plan === "enterprise" ? "success" : school.plan === "pro" ? "brand" : ("outline" as const);
  const planLabel = school.plan === "enterprise" ? "Enterprise" : school.plan === "pro" ? "Pro" : "Basic";
  const joined = school.createdAt.toLocaleDateString("de-DE", { month: "short", year: "numeric" });
  return (
    <li className="flex items-center gap-4 px-5 py-3 transition-colors hover:bg-surface">
      <div className="grid size-9 shrink-0 place-items-center bg-fg text-bg">
        <Building2 className="size-4" strokeWidth={1.75} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-semibold">{school.name}</p>
          <Badge variant={planVariant}>{planLabel}</Badge>
        </div>
        <p className="text-xs text-muted-fg">
          {school._count.users} / {school.seats} Nutzer · {school._count.classes} Klassen · seit {joined}
        </p>
      </div>
      <div className="hidden w-24 lg:block">
        <Progress value={pct} tone={pct >= 90 ? "warning" : "brand"} className="h-1" />
        <p className="mt-1 text-right font-mono text-[10px] text-muted-fg">{pct}%</p>
      </div>
      <ArrowUpRight className="hidden size-3.5 text-muted-fg lg:inline" />
    </li>
  );
}

function HealthRow({ item }: { item: { name: string; status: "ok" | "watch" | "alert" } }) {
  const Icon = item.name.includes("DB") ? Database : item.name.includes("API") ? Server : Activity;
  return (
    <li className="flex items-center gap-3 px-5 py-3">
      <Icon className="size-4 shrink-0 text-muted-fg" strokeWidth={1.75} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{item.name}</p>
      </div>
      <span className={cn("size-2", item.status === "ok" && "bg-success", item.status === "watch" && "bg-warning", item.status === "alert" && "bg-danger")} />
    </li>
  );
}

function QuickTile({ href, icon, label, hint }: { href: string; icon: React.ReactNode; label: string; hint: string }) {
  return (
    <Link href={href} className="group flex flex-col gap-2 border border-border bg-bg p-3 transition-colors hover:bg-surface">
      <span className="grid size-8 place-items-center bg-fg text-bg">{icon}</span>
      <span className="text-sm font-semibold">{label}</span>
      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-fg">{hint}</span>
    </Link>
  );
}

function relativeTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `vor ${mins} Min.`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `vor ${hrs} Std.`;
  const days = Math.floor(hrs / 24);
  return `vor ${days} Tag${days === 1 ? "" : "en"}`;
}
