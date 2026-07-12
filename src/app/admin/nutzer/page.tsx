/* Copyright 2026 Elian Schock, Jonas Schwenk */
import {
  ArrowLeft,
  ArrowRight,
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
import { redirect } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { prisma } from "@/lib/db/client";
import { ROLE_HOME, effectiveRole, getSession } from "@/lib/session";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Nutzer · Admin" };

const ROLE_LABEL: Record<string, string> = {
  student: "Schüler",
  teacher: "Lehrer",
  parent: "Eltern",
  admin: "Admin",
  super: "Super-Admin",
};

const ROLE_TONE: Record<string, "brand" | "info" | "success" | "warning" | "outline"> = {
  student: "brand",
  teacher: "info",
  parent: "success",
  admin: "warning",
  super: "outline",
};

function relativeTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "gerade eben";
  if (min < 60) return `vor ${min} Min.`;
  const h = Math.floor(min / 60);
  if (h < 24) return `vor ${h} Std.`;
  const d = Math.floor(h / 24);
  if (d === 1) return "gestern";
  return `vor ${d} Tagen`;
}

interface PageProps {
  searchParams: Promise<{ role?: string; status?: string; q?: string }>;
}

export default async function NutzerPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "admin") redirect(ROLE_HOME[effectiveRole(session)]);

  const { role, status, q } = await searchParams;
  const schoolId = session.schoolId;

  const where = {
    ...(schoolId ? { schoolId } : {}),
    ...(role ? { role } : {}),
    ...(status === "unverified" ? { verifiedAt: null } : {}),
    ...(q ? {
      OR: [
        { name: { contains: q } },
        { email: { contains: q } },
      ],
    } : {}),
  };

  // Alle Abfragen sind voneinander unabhängig — parallel statt sequenziell laden.
  const [users, totalCounts, unverifiedCount, teacherAdminWith2FA, school] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        klasse: true,
        twoFactor: true,
        verifiedAt: true,
        createdAt: true,
        sessions: { select: { lastUsedAt: true }, orderBy: { lastUsedAt: "desc" }, take: 1 },
      },
      orderBy: [{ role: "asc" }, { name: "asc" }],
      take: 100,
    }),
    prisma.user.groupBy({
      by: ["role"],
      where: schoolId ? { schoolId } : {},
      _count: { id: true },
    }),
    prisma.user.count({
      where: { ...(schoolId ? { schoolId } : {}), verifiedAt: null },
    }),
    prisma.user.count({
      where: { ...(schoolId ? { schoolId } : {}), role: { in: ["teacher", "admin", "super"] }, twoFactor: true },
    }),
    schoolId
      ? prisma.school.findUnique({ where: { id: schoolId }, select: { name: true } })
      : Promise.resolve(null),
  ]);

  const countByRole = Object.fromEntries(totalCounts.map((r) => [r.role, r._count.id]));
  const totalAll = Object.values(countByRole).reduce((s, n) => s + n, 0);

  const teacherAdminCount = (countByRole["teacher"] ?? 0) + (countByRole["admin"] ?? 0) + (countByRole["super"] ?? 0);
  const twoFAPct = teacherAdminCount > 0 ? Math.round((teacherAdminWith2FA / teacherAdminCount) * 100) : 0;

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
              Nutzer{school ? ` · ${school.name}` : ""}
            </h1>
            <p className="mt-1 text-sm text-muted-fg">
              {totalAll} gesamt · {unverifiedCount} unverifiziert ·{" "}
              {teacherAdminWith2FA}/{teacherAdminCount} 2FA aktiv
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/api/admin/users-export" className={buttonVariants({ variant: "outline", size: "sm" })}>
              <Upload className="size-3.5" />
              CSV-Export
            </Link>
            <Link href="/admin/nutzer/neu" className={buttonVariants({ size: "sm" })}>
              <UserPlus className="size-3.5" />
              Nutzer einladen
            </Link>
          </div>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-px border border-border bg-border lg:grid-cols-4">
        <StatTile label="Schüler" value={String(countByRole["student"] ?? 0)} suffix="registriert" tone="text-brand" />
        <StatTile label="Lehrer" value={String(countByRole["teacher"] ?? 0)} suffix={unverifiedCount > 0 ? `${unverifiedCount} unverifiziert` : "alle aktiv"} tone="text-info" />
        <StatTile label="Eltern" value={String(countByRole["parent"] ?? 0)} suffix="registriert" tone="text-success" />
        <StatTile
          label="2FA · Lehrer/Admin"
          value={`${twoFAPct} %`}
          suffix={`${teacherAdminCount - teacherAdminWith2FA} ohne 2FA`}
          tone={twoFAPct === 100 ? "text-success" : "text-warning"}
        />
      </section>

      <section className="flex flex-col gap-3 border border-border bg-bg p-4 sm:flex-row sm:items-center sm:gap-6">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-fg">
          <Filter className="size-3.5" />
          Rolle
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Chip href="/admin/nutzer" active={!role && !status && !q}>Alle</Chip>
          <Chip href="/admin/nutzer?role=student" active={role === "student"}>Schüler</Chip>
          <Chip href="/admin/nutzer?role=teacher" active={role === "teacher"}>Lehrer</Chip>
          <Chip href="/admin/nutzer?role=parent" active={role === "parent"}>Eltern</Chip>
          <Chip href="/admin/nutzer?role=admin" active={role === "admin"}>Admin</Chip>
        </div>
        <div className="flex flex-wrap gap-1.5 sm:ml-auto">
          <Chip href="/admin/nutzer?status=unverified" active={status === "unverified"}>Unverifiziert</Chip>
        </div>
        <form action="/admin/nutzer" method="get" className="sm:ml-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-fg" />
            <Input name="q" defaultValue={q} placeholder="Name oder E-Mail…" className="h-8 w-56 pl-9 text-xs" />
          </div>
        </form>
      </section>

      {unverifiedCount > 0 && !role && !status && !q && (
        <section className="border border-warning/40 bg-warning/6">
          <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <Mail className="mt-0.5 size-4 shrink-0 text-warning" strokeWidth={1.75} />
              <p className="text-sm">
                <span className="font-semibold">{unverifiedCount} Nutzer</span>{" "}
                haben ihre E-Mail noch nicht bestätigt.
              </p>
            </div>
            <Link href="/admin/nutzer?status=unverified" className={buttonVariants({ size: "sm", variant: "outline" })}>
              Anzeigen
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </section>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{users.length} Nutzer{users.length === 100 ? "+" : ""}</CardTitle>
          <span className="font-mono text-xs text-muted-fg">sortiert nach Rolle · alphabetisch</span>
        </CardHeader>
        <CardBody className="px-0! pb-0!">
          {users.length === 0 ? (
            <p className="border-t border-border px-5 py-8 text-sm text-muted-fg">
              Keine Nutzer gefunden.
            </p>
          ) : (
            <ul className="divide-y divide-border border-t border-border">
              {users.map((u) => {
                const lastSession = u.sessions[0];
                const isUnverified = !u.verifiedAt;
                return (
                  <li key={u.id} className="grid grid-cols-1 gap-3 px-5 py-3.5 transition-colors hover:bg-surface lg:grid-cols-[auto_1fr_120px_120px_100px_auto] lg:items-center lg:gap-4">
                    <Avatar name={u.name} size="md" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold">{u.name}</p>
                        {isUnverified && (
                          <Badge variant="warning">
                            <Mail className="size-3" />
                            unverifiziert
                          </Badge>
                        )}
                        {u.twoFactor && (
                          <Badge variant="success">
                            <ShieldCheck className="size-3" />
                            2FA
                          </Badge>
                        )}
                      </div>
                      <p className="truncate text-xs text-muted-fg">
                        {u.email}
                        {u.klasse && <span className="ml-2">· Klasse {u.klasse}</span>}
                      </p>
                    </div>
                    <Badge variant={ROLE_TONE[u.role] ?? "outline"}>
                      {ROLE_LABEL[u.role] ?? u.role}
                    </Badge>
                    <span className="hidden font-mono text-[10px] uppercase tracking-wider text-muted-fg lg:block">
                      E-Mail + Passwort
                    </span>
                    <span className="hidden font-mono text-[10px] uppercase tracking-wider text-muted-fg lg:block">
                      {lastSession ? relativeTime(lastSession.lastUsedAt) : "nie"}
                    </span>
                    <Link href={`/admin/nutzer/${u.id}`} className="text-xs font-medium text-muted-fg hover:text-fg">
                      Verwalten →
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </CardBody>
      </Card>

      <Card className="border-brand/40 bg-linear-to-br from-brand/6 to-transparent">
        <CardBody className="p-5!">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-brand" strokeWidth={1.75} />
            <p className="text-xs font-semibold uppercase tracking-wider text-brand">2FA-Rollout</p>
          </div>
          <p className="mt-3 text-base font-semibold leading-snug">
            {teacherAdminWith2FA} von {teacherAdminCount} Lehrer/Admins haben 2FA aktiviert.
          </p>
          <Progress
            value={teacherAdminCount > 0 ? (teacherAdminWith2FA / teacherAdminCount) * 100 : 0}
            tone={teacherAdminWith2FA === teacherAdminCount ? "success" : "brand"}
            className="mt-3"
          />
          {teacherAdminWith2FA < teacherAdminCount && (
            <Link href="/admin/sicherheit" className={buttonVariants({ className: "mt-5" })}>
              Erinnerung senden
              <ArrowRight className="size-3.5" />
            </Link>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function StatTile({ label, value, suffix, tone }: { label: string; value: string; suffix: string; tone: string }) {
  return (
    <div className="bg-bg p-5">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">{label}</p>
        <UserCog className={cn("size-4", tone)} strokeWidth={1.75} />
      </div>
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
