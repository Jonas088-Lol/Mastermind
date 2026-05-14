import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CheckCircle2, Key, Lock, ShieldCheck, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db/client";
import { ROLE_HOME, effectiveRole, getSession } from "@/lib/session";
import { sendTwoFAReminders } from "./actions";

export const metadata: Metadata = { title: "Sicherheit · Admin" };

export default async function AdminSicherheitPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "admin") redirect(ROLE_HOME[effectiveRole(session)]);

  const schoolId = session.schoolId;

  const [teacherCount, teacherWith2FA, adminCount, adminWith2FA, loginsToday] = await Promise.all([
    prisma.user.count({ where: { role: "teacher", ...(schoolId ? { schoolId } : {}) } }),
    prisma.user.count({ where: { role: "teacher", twoFactor: true, ...(schoolId ? { schoolId } : {}) } }),
    prisma.user.count({ where: { role: { in: ["admin", "super"] }, ...(schoolId ? { schoolId } : {}) } }),
    prisma.user.count({ where: { role: { in: ["admin", "super"] }, twoFactor: true, ...(schoolId ? { schoolId } : {}) } }),
    prisma.session.count({
      where: {
        createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        ...(schoolId ? { user: { schoolId } } : {}),
      },
    }),
  ]);

  const twoFAPct = teacherCount > 0 ? Math.round((teacherWith2FA / teacherCount) * 100) : 0;
  const adminTwoFAPct = adminCount > 0 ? Math.round((adminWith2FA / adminCount) * 100) : 0;
  const teachersWithout2FA = teacherCount - teacherWith2FA;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Schul-Admin</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Sicherheit</h1>
        <p className="mt-1 text-sm text-muted-fg">Sicherheitsrichtlinien und Zugriffsschutz.</p>
      </header>

      <div className="grid grid-cols-2 gap-px border border-border bg-border sm:grid-cols-3">
        <div className="bg-bg p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">2FA · Lehrer</p>
          <p className="mt-2 font-mono text-3xl font-bold">{twoFAPct}%</p>
          <p className="mt-1 text-xs text-muted-fg">{teacherWith2FA} von {teacherCount}</p>
        </div>
        <div className="bg-bg p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">2FA · Admins</p>
          <p className="mt-2 font-mono text-3xl font-bold">{adminTwoFAPct}%</p>
          <p className="mt-1 text-xs text-muted-fg">{adminWith2FA} von {adminCount}</p>
        </div>
        <div className="col-span-2 bg-bg p-5 sm:col-span-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">Logins · Heute</p>
          <p className="mt-2 font-mono text-3xl font-bold">{loginsToday}</p>
          <p className="mt-1 text-xs text-muted-fg">neue Sessions</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-muted-fg" />
            <CardTitle>Zwei-Faktor-Authentifizierung</CardTitle>
          </div>
          <Badge variant={twoFAPct === 100 ? "success" : twoFAPct >= 80 ? "warning" : "danger"}>
            {twoFAPct}%
          </Badge>
        </CardHeader>
        <CardBody>
          <p className="text-sm text-muted-fg">
            {twoFAPct === 100
              ? "Alle Lehrer haben 2FA aktiviert."
              : `${teachersWithout2FA} ${teachersWithout2FA === 1 ? "Lehrer hat" : "Lehrer haben"} noch kein 2FA aktiviert.`}
          </p>
          <ul className="mt-4 space-y-2.5 text-sm">
            {[
              { label: "2FA für Lehrer", active: twoFAPct === 100 },
              { label: "2FA für Admins", active: adminTwoFAPct === 100 },
            ].map((row) => (
              <li key={row.label} className="flex items-center justify-between">
                <span>{row.label}</span>
                {row.active ? (
                  <span className="inline-flex items-center gap-1 text-xs text-success">
                    <CheckCircle2 className="size-3.5" />
                    alle aktiv
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs text-warning">
                    <XCircle className="size-3.5" />
                    ausstehend
                  </span>
                )}
              </li>
            ))}
          </ul>
          {teachersWithout2FA > 0 && (
            <form action={sendTwoFAReminders} className="mt-4">
              <button
                type="submit"
                className="border border-border bg-bg px-3 py-1.5 text-xs font-medium text-muted-fg transition-colors hover:border-brand/40 hover:text-brand"
              >
                Erinnerung an {teachersWithout2FA} {teachersWithout2FA === 1 ? "Lehrer" : "Lehrer"} senden
              </button>
            </form>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lock className="size-4 text-muted-fg" />
            <CardTitle>Passwort-Richtlinie</CardTitle>
          </div>
        </CardHeader>
        <CardBody>
          <ul className="space-y-3 text-sm">
            {[
              { label: "Mindestlänge 8 Zeichen", active: true },
              { label: "Sonderzeichen empfohlen", active: false },
              { label: "Passwort-Ablauf", active: false },
            ].map((row) => (
              <li key={row.label} className="flex items-center justify-between text-sm">
                <span>{row.label}</span>
                {row.active ? (
                  <span className="inline-flex items-center gap-1 text-xs text-success">
                    <CheckCircle2 className="size-3.5" />
                    aktiv
                  </span>
                ) : (
                  <span className="text-xs text-muted-fg">nicht erzwungen</span>
                )}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-muted-fg">
            Erweiterte Passwort-Richtlinien werden über die Plattform-Konfiguration verwaltet.
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Key className="size-4 text-muted-fg" />
            <CardTitle>API-Zugriff & Tokens</CardTitle>
          </div>
        </CardHeader>
        <CardBody>
          <div className="border border-dashed border-border bg-surface p-4 text-center">
            <Key className="mx-auto size-7 text-muted-fg" strokeWidth={1.5} />
            <p className="mt-3 text-sm font-semibold">Keine API-Tokens konfiguriert</p>
            <p className="mt-1 text-xs text-muted-fg">
              API-Token-Verwaltung für Drittanbieter-Integrationen steht in einer zukünftigen Version bereit.
            </p>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
