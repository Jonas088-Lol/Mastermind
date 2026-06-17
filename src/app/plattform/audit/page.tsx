import {
  ArrowLeft,
  Database,
  Download,
  Filter,
  KeyRound,
  Search,
  ShieldCheck,
  UserCog,
  Users,
} from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { prisma } from "@/lib/db/client";
import { getSession, isSuper } from "@/lib/session";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Audit-Log · Plattform" };

type EntryType = "auth" | "user" | "data" | "system";
type Severity = "info" | "warning" | "critical";

interface AuditEntry {
  date: Date;
  actor: string;
  actorEmail?: string;
  scope: string;
  type: EntryType;
  severity: Severity;
  action: string;
  target: string;
  detail: string;
  ip?: string;
}

const TYPE_ICON: Record<EntryType, React.ComponentType<{ className?: string; strokeWidth?: number }>> = {
  auth: KeyRound,
  user: UserCog,
  data: Users,
  system: Database,
};

const ROLE_LABEL: Record<string, string> = {
  student: "Schüler",
  teacher: "Lehrkraft",
  parent: "Elternteil",
  admin: "Admin",
  super: "Super-Admin",
};

interface PageProps {
  searchParams: Promise<{ type?: string; severity?: string; q?: string }>;
}

export default async function AuditPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session || !isSuper(session)) redirect("/login");

  const { type, severity, q } = await searchParams;

  const [recentSessions, recentUsers, recentGrades, teachersWithout2FA] = await Promise.all([
    prisma.session.findMany({
      include: {
        user: { select: { name: true, email: true, school: { select: { name: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.user.findMany({
      select: {
        name: true,
        email: true,
        role: true,
        createdAt: true,
        school: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 15,
    }),
    prisma.grade.findMany({
      include: {
        teacher: { select: { name: true, email: true, school: { select: { name: true } } } },
        student: { select: { name: true } },
        subject: { select: { name: true } },
      },
      orderBy: { date: "desc" },
      take: 10,
    }),
    prisma.user.findMany({
      where: { role: "teacher", twoFactor: false },
      select: { name: true, email: true, updatedAt: true, school: { select: { name: true } } },
      take: 8,
    }),
  ]);

  const allEntries: AuditEntry[] = [
    ...recentSessions.map((s) => ({
      date: s.createdAt,
      type: "auth" as EntryType,
      severity: "info" as Severity,
      actor: s.user.name,
      actorEmail: s.user.email,
      scope: s.user.school?.name ?? "Plattform",
      action: "Anmeldung",
      target: "Login",
      detail: s.ipAddress ? `IP: ${s.ipAddress}` : "Sitzung gestartet",
      ip: s.ipAddress ?? undefined,
    })),
    ...recentUsers.map((u) => ({
      date: u.createdAt,
      type: "user" as EntryType,
      severity: "info" as Severity,
      actor: "System",
      scope: u.school?.name ?? "Plattform",
      action: "Nutzer registriert",
      target: u.name,
      detail: `Rolle: ${ROLE_LABEL[u.role] ?? u.role} · ${u.email}`,
    })),
    ...recentGrades.map((g) => ({
      date: g.date,
      type: "data" as EntryType,
      severity: "info" as Severity,
      actor: g.teacher.name,
      actorEmail: g.teacher.email,
      scope: g.teacher.school?.name ?? "—",
      action: "Note eingetragen",
      target: g.student.name,
      detail: `${g.subject.name} · Note ${g.value.toFixed(1)}`,
    })),
    ...teachersWithout2FA.map((t) => ({
      date: t.updatedAt,
      type: "auth" as EntryType,
      severity: "warning" as Severity,
      actor: "System · Sicherheit",
      scope: t.school?.name ?? "—",
      action: "2FA nicht aktiviert",
      target: t.name,
      detail: `${t.email} · Lehrkraft ohne 2FA`,
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  const filtered = allEntries.filter((e) => {
    if (type && e.type !== type) return false;
    if (severity && e.severity !== severity) return false;
    if (q) {
      const search = q.toLowerCase();
      if (
        !e.actor.toLowerCase().includes(search) &&
        !e.target.toLowerCase().includes(search) &&
        !e.detail.toLowerCase().includes(search) &&
        !e.scope.toLowerCase().includes(search) &&
        !(e.ip ?? "").includes(search)
      ) return false;
    }
    return true;
  });

  const warningCount = allEntries.filter((e) => e.severity === "warning").length;

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
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Audit-Log</h1>
            <p className="mt-1 text-sm text-muted-fg">
              Plattformweit · DSGVO-konform · {allEntries.length} Einträge
            </p>
          </div>
          <Link
            href="/api/super/audit-export"
            className="inline-flex items-center gap-1.5 border border-border bg-bg px-3 py-1.5 text-xs font-medium text-muted-fg transition-colors hover:text-fg"
          >
            <Download className="size-3.5" />
            CSV-Export
          </Link>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-px border border-border bg-border lg:grid-cols-4">
        <StatTile label="Einträge gesamt" value={String(allEntries.length)} suffix="letzte Aktivitäten" />
        <StatTile label="Logins" value={String(recentSessions.length)} suffix="zuletzt erfasst" />
        <StatTile label="Warnungen" value={String(warningCount)} suffix="Sicherheitshinweise" />
        <StatTile label="Neue Nutzer" value={String(recentUsers.length)} suffix="zuletzt registriert" />
      </section>

      <section className="flex flex-col gap-3 border border-border bg-bg p-4 sm:flex-row sm:items-center sm:gap-6">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-fg">
          <Filter className="size-3.5" />
          Typ
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Chip href="/plattform/audit" active={!type && !severity && !q}>Alle</Chip>
          <Chip href="/plattform/audit?type=auth" active={type === "auth"}>Auth</Chip>
          <Chip href="/plattform/audit?type=user" active={type === "user"}>Nutzer</Chip>
          <Chip href="/plattform/audit?type=data" active={type === "data"}>Daten</Chip>
          <Chip href="/plattform/audit?type=system" active={type === "system"}>System</Chip>
        </div>
        <div className="flex flex-wrap gap-1.5 sm:ml-auto">
          <Chip href="/plattform/audit?severity=warning" active={severity === "warning"}>Warning</Chip>
        </div>
        <form action="/plattform/audit" method="get" className="sm:ml-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-fg" />
            <Input name="q" defaultValue={q} placeholder="Akteur · IP · Ziel…" className="h-8 w-56 pl-9 text-xs" />
          </div>
        </form>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>{filtered.length} Einträge</CardTitle>
          <Badge variant="outline">
            <ShieldCheck className="size-3" />
            Append-only
          </Badge>
        </CardHeader>
        <CardBody className="px-0! pb-0!">
          {filtered.length === 0 ? (
            <p className="border-t border-border px-5 py-8 text-sm text-muted-fg">
              Keine Einträge für diesen Filter.
            </p>
          ) : (
            <ul className="divide-y divide-border border-t border-border">
              {filtered.map((e, i) => (
                <EntryRow key={i} entry={e} />
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function StatTile({ label, value, suffix }: { label: string; value: string; suffix: string }) {
  return (
    <div className="bg-bg p-5">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">{label}</p>
      <p className="mt-3 font-mono text-3xl font-bold tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-muted-fg">{suffix}</p>
    </div>
  );
}

function Chip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-pressed={active}
      className={cn(
        "px-2.5 py-1 text-xs font-medium transition-colors",
        active ? "bg-fg text-bg" : "border border-border bg-bg text-muted-fg hover:border-fg/30 hover:text-fg"
      )}
    >
      {children}
    </Link>
  );
}

function EntryRow({ entry }: { entry: AuditEntry }) {
  const Icon = TYPE_ICON[entry.type] ?? Database;
  const severityTone = { info: "outline" as const, warning: "warning" as const, critical: "danger" as const }[entry.severity];
  const ts = entry.date.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  const dateStr = entry.date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });

  return (
    <li className="grid grid-cols-1 gap-2 px-5 py-3.5 transition-colors hover:bg-surface lg:grid-cols-[auto_auto_1fr_auto] lg:items-center lg:gap-4">
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "grid size-8 shrink-0 place-items-center",
            entry.severity === "critical"
              ? "bg-danger/10 text-danger"
              : entry.severity === "warning"
                ? "bg-warning/10 text-warning"
                : "bg-surface text-muted-fg"
          )}
        >
          <Icon className="size-4" strokeWidth={1.75} />
        </span>
        <div className="font-mono text-[10px] uppercase tracking-wider text-muted-fg">
          <p className="font-bold">{ts}</p>
          <p>{dateStr}</p>
        </div>
      </div>
      <Avatar name={entry.actor} size="sm" className="hidden lg:grid" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {entry.severity !== "info" && (
            <Badge variant={severityTone}>{entry.severity === "critical" ? "Kritisch" : "Warnung"}</Badge>
          )}
          <p className="text-sm">
            <span className="font-semibold">{entry.actor}</span>
            <span className="text-muted-fg"> · </span>
            <span>{entry.action}</span>
            <span className="text-muted-fg"> · </span>
            <span className="font-medium">{entry.target}</span>
          </p>
          <Badge variant="outline">{entry.scope}</Badge>
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-fg">
          {entry.detail}
          {entry.ip && <span className="ml-2 font-mono">· {entry.ip}</span>}
        </p>
      </div>
    </li>
  );
}
