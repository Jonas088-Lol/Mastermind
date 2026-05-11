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
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Audit-Log" };

type EntryType = "auth" | "user" | "data" | "billing" | "system" | "brand";
type Severity = "info" | "warning" | "critical";

interface AuditEntry {
  ts: string;
  date: string;
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

const ENTRIES: AuditEntry[] = [
  { ts: "12:32", date: "12.03.", actor: "Plattform-Admin", actorEmail: "super@mastermind.app", scope: "Realschule München", type: "user", severity: "info", action: "Rolle aktualisiert", target: "Markus Becker", detail: "Lehrer → Lehrer + Klassensprecher", ip: "10.0.4.12" },
  { ts: "11:48", date: "12.03.", actor: "System · SCIM", scope: "Realschule München", type: "user", severity: "info", action: "Nutzer importiert", target: "8 Schüler · Klasse 7c", detail: "Quelle: schule.de SCIM-API" },
  { ts: "11:12", date: "12.03.", actor: "Andrea Hoffmann", actorEmail: "admin@schule.de", scope: "Realschule München", type: "billing", severity: "info", action: "Lizenz erweitert", target: "Pro · 800 → 1000 Sitze", detail: "Verlängerung um 12 Monate · 1.890 €/Mo" },
  { ts: "10:54", date: "12.03.", actor: "Plattform", scope: "Plattform", type: "system", severity: "info", action: "Backup", target: "DB · Postgres Primary", detail: "Tägliches Snapshot · 4,7 GB · Frankfurt" },
  { ts: "09:18", date: "12.03.", actor: "Tom Vogel", actorEmail: "tom@mastermind.app", scope: "Plattform", type: "system", severity: "warning", action: "Feature-Flag", target: "ki.tutor.audio", detail: "Beta-Aktivierung für 4 Schulen" },
  { ts: "08:02", date: "12.03.", actor: "Familie Weber", actorEmail: "weber@email.de", scope: "Realschule München", type: "auth", severity: "warning", action: "3 Failed-Logins", target: "weber@email.de", detail: "IP gleicht Heim-Adresse · kein Block ausgelöst", ip: "84.130.x.x" },
  { ts: "22:45", date: "11.03.", actor: "Andrea Hoffmann", actorEmail: "admin@schule.de", scope: "Realschule München", type: "auth", severity: "info", action: "SSO-Konfig", target: "Microsoft Entra ID", detail: "Tenant gewechselt · 234 Nutzer betroffen" },
  { ts: "18:30", date: "11.03.", actor: "L. Krüger", actorEmail: "lk@mastermind.app", scope: "Gymnasium Stadtpark", type: "billing", severity: "info", action: "Plan upgegradet", target: "Pro → Enterprise", detail: "1.500 Sitze · 4.200 €/Mo" },
  { ts: "15:08", date: "11.03.", actor: "Plattform", scope: "Plattform", type: "system", severity: "critical", action: "KI-Provider-Latenz", target: "EU-Frankfurt", detail: "p95 > 3 s für 12 Min · auto-recovery" },
  { ts: "14:22", date: "11.03.", actor: "Andrea Hoffmann", actorEmail: "admin@schule.de", scope: "Realschule München", type: "brand", severity: "info", action: "Branding", target: "Akzentfarbe", detail: "Hex #1E3A8A → #2563EB" },
  { ts: "11:45", date: "11.03.", actor: "Sabine Brandt", actorEmail: "sabine@gesamtschule-koeln.de", scope: "Gesamtschule Köln-Mitte", type: "data", severity: "info", action: "DSGVO-Export", target: "Schüler Kl. 8a", detail: "ZIP · 12 Datensätze · auf Antrag" },
  { ts: "09:00", date: "11.03.", actor: "Plattform", scope: "Plattform", type: "system", severity: "info", action: "Release", target: "v2.4.1", detail: "Hotfix: Untis-Import Umlaute · 47 Schulen aktualisiert" },
];

const TYPE_ICON: Record<EntryType, React.ComponentType<{ className?: string; strokeWidth?: number }>> = {
  auth: KeyRound,
  user: UserCog,
  data: Users,
  billing: Building2,
  system: Database,
  brand: Palette,
};

interface PageProps {
  searchParams: Promise<{ type?: string; severity?: string }>;
}

export default async function AuditPage({ searchParams }: PageProps) {
  const { type, severity } = await searchParams;
  const filtered = ENTRIES.filter((e) => {
    if (type && e.type !== type) return false;
    if (severity && e.severity !== severity) return false;
    return true;
  });

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
              Audit-Log
            </h1>
            <p className="mt-1 text-sm text-muted-fg">
              Plattformweit · DSGVO-konform · 90 Tage retention · {ENTRIES.length} angezeigt
            </p>
          </div>
          <Button variant="outline" size="sm">
            <Download className="size-3.5" />
            CSV-Export
          </Button>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-px border border-border bg-border lg:grid-cols-4">
        <Stat label="Heute · Einträge" value="247" suffix="↓ 8 % ggü. Vortag" />
        <Stat label="Failed-Logins · 24 h" value="12" suffix="3 mehrfach pro IP" />
        <Stat label="Kritische Events" value="1" suffix="KI-Latenz · resolved" />
        <Stat label="DSGVO-Anfragen" value="2" suffix="diesen Monat" />
      </section>

      <section className="flex flex-col gap-3 border border-border bg-bg p-4 sm:flex-row sm:items-center sm:gap-6">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-fg">
          <Filter className="size-3.5" />
          Typ
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Chip href="/plattform/audit" active={!type && !severity}>Alle</Chip>
          <Chip href="/plattform/audit?type=auth" active={type === "auth"}>Auth</Chip>
          <Chip href="/plattform/audit?type=user" active={type === "user"}>Nutzer</Chip>
          <Chip href="/plattform/audit?type=billing" active={type === "billing"}>Abrechnung</Chip>
          <Chip href="/plattform/audit?type=system" active={type === "system"}>System</Chip>
          <Chip href="/plattform/audit?type=data" active={type === "data"}>Daten</Chip>
        </div>
        <div className="flex flex-wrap gap-1.5 sm:ml-auto">
          <Chip href="/plattform/audit?severity=warning" active={severity === "warning"}>Warning</Chip>
          <Chip href="/plattform/audit?severity=critical" active={severity === "critical"}>Kritisch</Chip>
        </div>
        <form action="/plattform/audit" method="get" className="sm:ml-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-fg" />
            <Input name="q" placeholder="Akteur · IP · Target…" className="h-8 w-56 pl-9 text-xs" />
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
        <CardBody className="!px-0 !pb-0">
          <ul className="divide-y divide-border border-t border-border">
            {filtered.map((e, i) => (
              <EntryRow key={i} entry={e} />
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

function EntryRow({ entry }: { entry: AuditEntry }) {
  const Icon = TYPE_ICON[entry.type];
  const severityTone = {
    info: "outline" as const,
    warning: "warning" as const,
    critical: "danger" as const,
  }[entry.severity];

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
          <p className="font-bold">{entry.ts}</p>
          <p>{entry.date}</p>
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
          {entry.ip && (
            <span className="ml-2 font-mono">· {entry.ip}</span>
          )}
        </p>
      </div>
    </li>
  );
}
