import {
  ArrowLeft,
  Filter,
  Mail,
  Search,
  ShieldCheck,
  Upload,
  UserCog,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Nutzer" };

type UserRole = "schueler" | "lehrer" | "elternteil" | "admin";
type UserStatus = "aktiv" | "eingeladen" | "deaktiviert";

interface User {
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  klasse?: string;
  invitedAt?: string;
  lastSeen: string;
  twoFactor: boolean;
  sso?: "microsoft" | "google" | "apple";
}

const USERS: User[] = [
  { name: "Andrea Hoffmann", email: "admin@schule.de", role: "admin", status: "aktiv", lastSeen: "vor 12 Min.", twoFactor: true, sso: "microsoft" },
  { name: "Markus Becker", email: "becker@schule.de", role: "lehrer", status: "aktiv", lastSeen: "vor 2 Std.", twoFactor: true, sso: "microsoft" },
  { name: "Julia Wagner", email: "wagner@schule.de", role: "lehrer", status: "aktiv", lastSeen: "vor 4 Std.", twoFactor: true, sso: "microsoft" },
  { name: "Dr. Heinrich Klein", email: "klein@schule.de", role: "lehrer", status: "aktiv", lastSeen: "gestern", twoFactor: true, sso: "microsoft" },
  { name: "Stefan Sommer", email: "sommer@schule.de", role: "lehrer", status: "aktiv", lastSeen: "vor 6 Std.", twoFactor: false, sso: "microsoft" },
  { name: "Petra Bauer", email: "p.bauer@schule.de", role: "lehrer", status: "eingeladen", invitedAt: "vor 2 Tagen", lastSeen: "—", twoFactor: false },
  { name: "Hannes Otto", email: "h.otto@schule.de", role: "lehrer", status: "eingeladen", invitedAt: "vor 5 Tagen", lastSeen: "—", twoFactor: false },
  { name: "Lukas Meier", email: "lukas@schule.de", role: "schueler", status: "aktiv", klasse: "9b", lastSeen: "vor 30 Min.", twoFactor: false },
  { name: "Anna Bauer", email: "anna.b@schule.de", role: "schueler", status: "aktiv", klasse: "9b", lastSeen: "vor 12 Min.", twoFactor: false },
  { name: "Ben Schulz", email: "ben.s@schule.de", role: "schueler", status: "aktiv", klasse: "9b", lastSeen: "vor 1 Std.", twoFactor: false },
  { name: "Cara Lange", email: "cara.l@schule.de", role: "schueler", status: "aktiv", klasse: "9b", lastSeen: "vor 3 Std.", twoFactor: false },
  { name: "Tom Weber", email: "tom.w@schule.de", role: "schueler", status: "deaktiviert", klasse: "10a", lastSeen: "vor 2 Wochen", twoFactor: false },
  { name: "Sandra Meier", email: "sandra.meier@email.de", role: "elternteil", status: "aktiv", lastSeen: "vor 4 Std.", twoFactor: false },
  { name: "Familie Weber", email: "weber@email.de", role: "elternteil", status: "aktiv", lastSeen: "gestern", twoFactor: false },
  { name: "Greta Hoffmann (Mutter)", email: "g.hoffmann@email.de", role: "elternteil", status: "eingeladen", invitedAt: "vor 1 Tag", lastSeen: "—", twoFactor: false },
];

const ROLE_LABEL: Record<UserRole, string> = {
  schueler: "Schüler",
  lehrer: "Lehrer",
  elternteil: "Eltern",
  admin: "Admin",
};

const ROLE_TONE: Record<UserRole, "brand" | "info" | "success" | "warning"> = {
  schueler: "brand",
  lehrer: "info",
  elternteil: "success",
  admin: "warning",
};

interface PageProps {
  searchParams: Promise<{ role?: string; status?: string }>;
}

export default async function NutzerPage({ searchParams }: PageProps) {
  const { role, status } = await searchParams;
  const filtered = USERS.filter((u) => {
    if (role && u.role !== role) return false;
    if (status && u.status !== status) return false;
    return true;
  });

  const counts = {
    total: USERS.length,
    schueler: USERS.filter((u) => u.role === "schueler").length,
    lehrer: USERS.filter((u) => u.role === "lehrer").length,
    elternteil: USERS.filter((u) => u.role === "elternteil").length,
    admin: USERS.filter((u) => u.role === "admin").length,
    eingeladen: USERS.filter((u) => u.status === "eingeladen").length,
    twoFactor: USERS.filter((u) => u.twoFactor).length,
    twoFactorEligible: USERS.filter((u) => u.role === "lehrer" || u.role === "admin").length,
  };

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
              Nutzer · Realschule München
            </h1>
            <p className="mt-1 text-sm text-muted-fg">
              {counts.total} angezeigt · {counts.eingeladen} ausstehende Einladungen ·{" "}
              {counts.twoFactor}/{counts.twoFactorEligible} 2FA aktiv
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm">
              <Upload className="size-3.5" />
              CSV / SCIM
            </Button>
            <Link href="/admin/nutzer/einladen" className={cn(buttonVariants({ size: "sm" }), "glow-on-hover")}>
              <UserPlus className="size-3.5" />
              Lehrer einladen
            </Link>
          </div>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-px border border-border bg-border lg:grid-cols-4">
        <Stat label="Schüler" value={String(counts.schueler)} suffix="aktiv" tone="text-brand" />
        <Stat label="Lehrer" value={String(counts.lehrer)} suffix={`${counts.eingeladen > 0 ? `${counts.eingeladen} eingeladen` : "alle aktiv"}`} tone="text-info" />
        <Stat label="Eltern" value={String(counts.elternteil)} suffix="aktiv" tone="text-success" />
        <Stat label="2FA-Quote · Lehrer/Admin" value={`${Math.round((counts.twoFactor / counts.twoFactorEligible) * 100)} %`} suffix={`${counts.twoFactorEligible - counts.twoFactor} ohne 2FA`} tone={counts.twoFactor === counts.twoFactorEligible ? "text-success" : "text-warning"} />
      </section>

      <section className="flex flex-col gap-3 border border-border bg-bg p-4 sm:flex-row sm:items-center sm:gap-6">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-fg">
          <Filter className="size-3.5" />
          Rolle
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Chip href="/admin/nutzer" active={!role && !status}>Alle</Chip>
          <Chip href="/admin/nutzer?role=schueler" active={role === "schueler"}>Schüler</Chip>
          <Chip href="/admin/nutzer?role=lehrer" active={role === "lehrer"}>Lehrer</Chip>
          <Chip href="/admin/nutzer?role=elternteil" active={role === "elternteil"}>Eltern</Chip>
          <Chip href="/admin/nutzer?role=admin" active={role === "admin"}>Admin</Chip>
        </div>
        <div className="flex flex-wrap gap-1.5 sm:ml-auto">
          <Chip href="/admin/nutzer?status=eingeladen" active={status === "eingeladen"}>Eingeladen</Chip>
          <Chip href="/admin/nutzer?status=deaktiviert" active={status === "deaktiviert"}>Deaktiviert</Chip>
        </div>
        <form action="/admin/nutzer" method="get" className="sm:ml-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-fg" />
            <Input name="q" placeholder="Name oder E-Mail…" className="h-8 w-56 pl-9 text-xs" />
          </div>
        </form>
      </section>

      {counts.eingeladen > 0 && (
        <section className="border border-warning/40 bg-warning/[0.06]">
          <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <Mail className="mt-0.5 size-4 shrink-0 text-warning" strokeWidth={1.75} />
              <p className="text-sm">
                <span className="font-semibold">{counts.eingeladen} Einladungen ausstehend</span>{" "}
                · älteste vor 5 Tagen versendet.
              </p>
            </div>
            <Button size="sm" variant="outline">
              Alle erinnern
            </Button>
          </div>
        </section>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{filtered.length} Nutzer</CardTitle>
          <span className="font-mono text-xs text-muted-fg">
            sortiert nach Rolle · alphabetisch
          </span>
        </CardHeader>
        <CardBody className="!px-0 !pb-0">
          <ul className="divide-y divide-border border-t border-border">
            {filtered.map((u) => (
              <UserRow key={u.email} user={u} />
            ))}
          </ul>
        </CardBody>
      </Card>

      <Card className="border-brand/40 bg-gradient-to-br from-brand/[0.06] to-transparent">
        <CardBody className="!p-5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-brand" strokeWidth={1.75} />
            <p className="text-xs font-semibold uppercase tracking-wider text-brand">
              2FA-Rollout
            </p>
          </div>
          <p className="mt-3 text-base font-semibold leading-snug">
            {counts.twoFactor} von {counts.twoFactorEligible} Lehrer/Admins haben 2FA aktiviert.
          </p>
          <Progress
            value={(counts.twoFactor / counts.twoFactorEligible) * 100}
            tone={counts.twoFactor === counts.twoFactorEligible ? "success" : "brand"}
            className="mt-3"
          />
          <p className="mt-2 text-xs text-muted-fg">
            Schul-Admin-Pflicht: 2FA für alle Lehrer und Admins. Schüler optional.
          </p>
          {counts.twoFactor < counts.twoFactorEligible && (
            <Button className="mt-5">
              {counts.twoFactorEligible - counts.twoFactor} Lehrer erinnern
            </Button>
          )}
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
        <UserCog className={cn("size-4", tone)} strokeWidth={1.75} />
      </div>
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

function UserRow({ user }: { user: User }) {
  return (
    <li className="grid grid-cols-1 gap-3 px-5 py-3.5 transition-colors hover:bg-surface lg:grid-cols-[auto_1fr_140px_140px_120px_auto] lg:items-center lg:gap-4">
      <Avatar name={user.name} size="md" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-semibold">{user.name}</p>
          {user.status === "deaktiviert" && (
            <Badge variant="outline">deaktiviert</Badge>
          )}
          {user.status === "eingeladen" && (
            <Badge variant="warning">
              <Mail className="size-3" />
              eingeladen
            </Badge>
          )}
          {user.twoFactor && (
            <Badge variant="success">
              <ShieldCheck className="size-3" />
              2FA
            </Badge>
          )}
        </div>
        <p className="truncate text-xs text-muted-fg">
          {user.email}
          {user.klasse && <span className="ml-2">· Klasse {user.klasse}</span>}
          {user.invitedAt && <span className="ml-2">· eingeladen {user.invitedAt}</span>}
        </p>
      </div>
      <Badge variant={ROLE_TONE[user.role]}>{ROLE_LABEL[user.role]}</Badge>
      <span className="hidden font-mono text-[10px] uppercase tracking-wider text-muted-fg lg:block">
        {user.sso ? `SSO · ${user.sso}` : "E-Mail + Passwort"}
      </span>
      <span className="hidden font-mono text-[10px] uppercase tracking-wider text-muted-fg lg:block">
        {user.lastSeen}
      </span>
      <Button size="sm" variant="ghost">
        {user.status === "eingeladen" ? "Erinnern" : "Verwalten"}
      </Button>
    </li>
  );
}
