import {
  ArrowLeft,
  Building2,
  Database,
  Download,
  Filter,
  KeyRound,
  Palette,
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
import { effectiveRole, getSession } from "@/lib/session";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Audit-Log" };

type EntryType = "auth" | "user" | "data" | "billing" | "system" | "brand";
type Severity = "info" | "warning" | "critical";

interface AuditEntry {
  date: Date;
  actor: string;
  actorEmail?: string;
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
  billing: Building2,
  system: Database,
  brand: Palette,
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

export default async function AdminAuditPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "admin") redirect("/");

  const { type, severity, q } = await searchParams;
  const schoolId = session.schoolId;

  const schoolName = schoolId
    ? (await prisma.school.findUnique({ where: { id: schoolId }, select: { name: true } }))?.name ?? "Schule"
    : "Schule";

  const [recentSessions, recentUsers, recentGrades, teachersWithout2FA] = await Promise.all([
    prisma.session.findMany({
      where: schoolId ? { user: { schoolId } } : {},
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      take: 15,
    }),
    prisma.user.findMany({
      where: { ...(schoolId ? { schoolId } : {}) },
      select: { name: true, email: true, role: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.grade.findMany({
      where: schoolId ? { subject: { schoolId } } : {},
      include: {
        teacher: { select: { name: true, email: true } },
        student: { select: { name: true } },
        subject: { select: { name: true } },
      },
      orderBy: { date: "desc" },
      take: 10,
    }),
    prisma.user.findMany({
      where: { ...(schoolId ? { schoolId } : {}), role: "teacher", twoFactor: false },
      select: { name: true, email: true, updatedAt: true },
      take: 5,
    }),
  ]);

  const allEntries: AuditEntry[] = [
    ...recentSessions.map((s) => ({
      date: s.createdAt,
      type: "auth" as EntryType,
      severity: "info" as Severity,
      actor: s.user.name,
      actorEmail: s.user.email,
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
      action: "Note eingetragen",
      target: g.student.name,
      detail: `${g.subject.name} · Note ${g.value.toFixed(1)}`,
    })),
    ...teachersWithout2FA.map((t) => ({
      date: t.updatedAt,
      type: "auth" as EntryType,
      severity: "warning" as Severity,
      actor: "System · Sicherheit",
      action: "2FA nicht aktiviert",
      target: t.name,
      detail: `${t.email} · Lehrkraft ohne Zwei-Faktor-Authentifizierung`,
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
        !(e.ip ?? "").includes(search)
      ) return false;
    }
    return true;
  });

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8">
      <header className="flex flex-col gap-3">
        <Link
          href="/admin"
          className="inline-flex w-fit items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-muted-fg transition-colors hover:text-fg"
        >
          <ArrowLeft className="size-3.5" />
          Schul-Admin
        </Link>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Audit-Log
            </h1>
            <p className="mt-1 text-sm text-muted-fg">
              {schoolName} · DSGVO-konform · {allEntries.length} Einträge
            </p>
          </div>
          <Link
            href="/api/admin/audit-export"
            className="inline-flex items-center gap-1.5 border border-border bg-bg px-3 py-1.5 text-xs font-medium text-muted-fg transition-colors hover:text-fg"
          >
            <Download className="size-3.5" />
            CSV-Export
          </Link>
        </div>
      </header>

      <section className="flex flex-col gap-3 border border-border bg-bg p-4 sm:flex-row sm:items-center sm:gap-6">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-fg">
          <Filter className="size-3.5" />
          Typ
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Chip href="/admin/audit" active={!type && !severity && !q}>Alle</Chip>
          <Chip href="/admin/audit?type=auth" active={type === "auth"}>Auth</Chip>
          <Chip href="/admin/audit?type=user" active={type === "user"}>Nutzer</Chip>
          <Chip href="/admin/audit?type=data" active={type === "data"}>Daten</Chip>
        </div>
        <div className="flex flex-wrap gap-1.5 sm:ml-auto">
          <Chip href="/admin/audit?severity=warning" active={severity === "warning"}>Warning</Chip>
        </div>
        <form action="/admin/audit" method="get" className="sm:ml-2">
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

function EntryRow({ entry }: { entry: AuditEntry }) {
  const Icon = TYPE_ICON[entry.type];
  const severityTone = {
    info: "outline" as const,
    warning: "warning" as const,
    critical: "danger" as const,
  }[entry.severity];

  const ts = entry.date.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  const dateStr = entry.date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });

  return (
    <li className="grid grid-cols-1 gap-2 px-5 py-3.5 transition-colors hover:bg-surface lg:grid-cols-[auto_auto_1fr] lg:items-center lg:gap-4">
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
            <Badge variant={severityTone}>
              {entry.severity === "critical" ? "Kritisch" : "Warnung"}
            </Badge>
          )}
          <p className="text-sm">
            <span className="font-semibold">{entry.actor}</span>
            <span className="text-muted-fg"> · </span>
            <span>{entry.action}</span>
            <span className="text-muted-fg"> · </span>
            <span className="font-medium">{entry.target}</span>
          </p>
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-fg">
          {entry.detail}
          {entry.ip && <span className="ml-2 font-mono">· {entry.ip}</span>}
        </p>
      </div>
    </li>
  );
}
