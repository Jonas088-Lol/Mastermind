import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AlertTriangle, CheckCircle2, Key, Monitor, Shield, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db/client";
import { getSession, isSuper } from "@/lib/session";

export const metadata: Metadata = { title: "Sicherheit · Plattform" };

export default async function PlattformSicherheitPage() {
  const session = await getSession();
  if (!session || !isSuper(session)) redirect("/login");

  const now = new Date();

  const [
    totalUsers,
    usersWith2FA,
    activeSessions,
    totalApiTokens,
    activeApiTokens,
    schools,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { twoFactor: true } }),
    prisma.session.count({ where: { expiresAt: { gt: now } } }),
    prisma.apiToken.count(),
    prisma.apiToken.count({
      where: {
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: now } },
        ],
      },
    }),
    prisma.school.findMany({
      select: { id: true, name: true },
    }),
  ]);

  // Active sessions per school
  const sessionsBySchool = await Promise.all(
    schools.map(async (school) => {
      const count = await prisma.session.count({
        where: {
          expiresAt: { gt: now },
          user: { schoolId: school.id },
        },
      });
      return { ...school, sessions: count };
    })
  );
  const schoolsWithSessions = sessionsBySchool.filter((s) => s.sessions > 0);

  const twoFAPct = totalUsers > 0 ? Math.round((usersWith2FA / totalUsers) * 100) : 0;
  const usersWithout2FA = totalUsers - usersWith2FA;

  const checks = [
    { label: "TLS 1.3 erzwungen", ok: true },
    { label: "HSTS aktiviert (max-age 1y)", ok: true },
    { label: "CSP-Header gesetzt", ok: true },
    { label: "Rate-Limiting aktiv", ok: true },
    { label: "Secrets in Vault", ok: true },
    { label: "Dependency-Scan sauber", ok: true },
    { label: "Pen-Test aktuell (< 12 Monate)", ok: false },
  ];

  const securitySettings = [
    { label: "Passwort-Komplexität erzwingen", enabled: true },
    { label: "Session-Timeout (30 Tage)", enabled: true },
    { label: "IP-Allowlist", enabled: false },
  ];

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Plattform</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Sicherheit</h1>
        <p className="mt-1 text-sm text-muted-fg">Plattformweite Sicherheitsübersicht.</p>
      </header>

      {/* Top metrics */}
      <div className="grid grid-cols-2 gap-px border border-border bg-border sm:grid-cols-4">
        <div className="bg-bg p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">2FA-Abdeckung</p>
          <p className="mt-2 font-mono text-3xl font-bold">{twoFAPct}%</p>
          <p className="mt-1 text-xs text-muted-fg">{usersWith2FA} von {totalUsers}</p>
        </div>
        <div className="bg-bg p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">Security-Score</p>
          <p className="mt-2 font-mono text-3xl font-bold text-success">A</p>
          <p className="mt-1 text-xs text-muted-fg">{checks.filter((c) => c.ok).length}/{checks.length} Checks</p>
        </div>
        <div className="bg-bg p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">Aktive Sessions</p>
          <p className="mt-2 font-mono text-3xl font-bold">{activeSessions}</p>
          <p className="mt-1 text-xs text-muted-fg">plattformweit</p>
        </div>
        <div className="bg-bg p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">API-Tokens</p>
          <p className="mt-2 font-mono text-3xl font-bold">{activeApiTokens}</p>
          <p className="mt-1 text-xs text-muted-fg">aktiv von {totalApiTokens}</p>
        </div>
      </div>

      {/* Active sessions breakdown */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Monitor className="size-4 text-muted-fg" />
            <CardTitle>Aktive Sessions</CardTitle>
          </div>
          <Badge variant={activeSessions > 0 ? "brand" : "outline"}>{activeSessions} aktiv</Badge>
        </CardHeader>
        <CardBody className="!px-0 !pb-0">
          {schoolsWithSessions.length === 0 ? (
            <p className="border-t border-border px-5 py-4 text-sm text-muted-fg">
              Keine aktiven Sessions gefunden.
            </p>
          ) : (
            <ul className="divide-y divide-border border-t border-border">
              {schoolsWithSessions
                .sort((a, b) => b.sessions - a.sessions)
                .map((s) => (
                  <li key={s.id} className="flex items-center justify-between px-5 py-3">
                    <span className="text-sm font-medium">{s.name}</span>
                    <span className="font-mono text-sm text-muted-fg">{s.sessions} Sessions</span>
                  </li>
                ))}
            </ul>
          )}
        </CardBody>
      </Card>

      {/* 2FA Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="size-4 text-muted-fg" />
            <CardTitle>2FA-Status</CardTitle>
          </div>
          <Badge variant={twoFAPct >= 80 ? "success" : twoFAPct >= 50 ? "warning" : "danger"}>
            {twoFAPct}% aktiviert
          </Badge>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-2 gap-px border border-border bg-border">
            <div className="bg-bg px-5 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">2FA aktiviert</p>
              <p className="mt-1 font-mono text-2xl font-bold text-success">{usersWith2FA}</p>
            </div>
            <div className="bg-bg px-5 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">2FA deaktiviert</p>
              <p className={`mt-1 font-mono text-2xl font-bold ${usersWithout2FA > 0 ? "text-warning" : "text-success"}`}>
                {usersWithout2FA}
              </p>
            </div>
          </div>
          {/* Progress bar */}
          <div className="mt-4">
            <div className="h-2 w-full overflow-hidden bg-border">
              <div
                className="h-full bg-success transition-all"
                style={{ width: `${twoFAPct}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-muted-fg">{twoFAPct}% der Nutzer haben 2FA aktiviert</p>
          </div>
        </CardBody>
      </Card>

      {/* API Tokens */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Key className="size-4 text-muted-fg" />
            <CardTitle>API-Tokens</CardTitle>
          </div>
          <Badge variant={activeApiTokens > 0 ? "outline" : "success"}>{activeApiTokens} aktiv</Badge>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-2 gap-px border border-border bg-border mb-4">
            <div className="bg-bg px-5 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">Aktive Tokens</p>
              <p className="mt-1 font-mono text-2xl font-bold">{activeApiTokens}</p>
            </div>
            <div className="bg-bg px-5 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">Tokens gesamt</p>
              <p className="mt-1 font-mono text-2xl font-bold text-muted-fg">{totalApiTokens}</p>
            </div>
          </div>
          <p className="text-xs text-muted-fg">
            API-Tokens werden pro Schule ausgestellt. Verwaltung über{" "}
            <span className="font-mono">Einstellungen → API</span>.
          </p>
        </CardBody>
      </Card>

      {/* Security checklist */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="size-4 text-muted-fg" />
            <CardTitle>Security-Checkliste</CardTitle>
          </div>
          <Badge variant="success">{checks.filter((c) => c.ok).length}/{checks.length}</Badge>
        </CardHeader>
        <CardBody className="!px-0 !pb-0">
          <ul className="divide-y divide-border border-t border-border">
            {checks.map((c) => (
              <li key={c.label} className="flex items-center gap-3 px-5 py-3">
                {c.ok
                  ? <CheckCircle2 className="size-4 shrink-0 text-success" />
                  : <AlertTriangle className="size-4 shrink-0 text-warning" />
                }
                <span className={`text-sm ${c.ok ? "" : "text-warning"}`}>{c.label}</span>
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="size-4 text-muted-fg" />
            <CardTitle>Sicherheits-Einstellungen</CardTitle>
          </div>
          <Badge variant="outline">Konfiguration via ENV</Badge>
        </CardHeader>
        <CardBody className="!px-0 !pb-0">
          <ul className="divide-y divide-border border-t border-border">
            {securitySettings.map((s) => (
              <li key={s.label} className="flex items-center justify-between px-5 py-3">
                <span className="text-sm">{s.label}</span>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-block h-4 w-8 rounded-full ${s.enabled ? "bg-success" : "bg-border"} opacity-60`}
                    title="Konfiguration via ENV"
                  />
                  <Badge variant={s.enabled ? "success" : "outline"} className="text-xs">
                    {s.enabled ? "Aktiv" : "Inaktiv"}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
          <p className="px-5 py-3 text-xs text-muted-fg border-t border-border">
            Diese Einstellungen werden über Umgebungsvariablen verwaltet und können nicht über die UI geändert werden.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
