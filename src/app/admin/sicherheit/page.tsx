import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CheckCircle2, Key, Lock, ShieldCheck, Trash2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { prisma } from "@/lib/db/client";
import { ROLE_HOME, effectiveRole, getSession } from "@/lib/session";
import { createApiToken, revokeApiToken, sendTwoFAReminders } from "./actions";

export const metadata: Metadata = { title: "Sicherheit · Admin" };

interface PageProps {
  searchParams: Promise<{ newToken?: string; tokenName?: string }>;
}

export default async function AdminSicherheitPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "admin") redirect(ROLE_HOME[effectiveRole(session)]);

  const { newToken, tokenName } = await searchParams;
  const schoolId = session.schoolId;

  const [teacherCount, teacherWith2FA, adminCount, adminWith2FA, loginsToday, apiTokens] = await Promise.all([
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
    schoolId
      ? prisma.apiToken.findMany({
          where: { schoolId },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
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
            <CardTitle>API-Tokens · {apiTokens.length}</CardTitle>
          </div>
        </CardHeader>
        <CardBody className="space-y-5">
          {newToken && (
            <div className="border border-success bg-success/6 p-4">
              <p className="mb-1 text-xs font-semibold text-success">
                Token &bdquo;{tokenName}&ldquo; erstellt — einmalig sichtbar
              </p>
              <p className="break-all font-mono text-sm">{newToken}</p>
              <p className="mt-2 text-xs text-muted-fg">
                Kopiere diesen Token jetzt. Er wird nicht erneut angezeigt.
              </p>
            </div>
          )}

          {apiTokens.length > 0 && (
            <ul className="divide-y divide-border border border-border">
              {apiTokens.map((t) => {
                const revokeAction = revokeApiToken.bind(null, t.id);
                const expired = t.expiresAt ? t.expiresAt < new Date() : false;
                return (
                  <li key={t.id} className="flex items-center gap-3 px-4 py-3">
                    <Key className="size-4 shrink-0 text-muted-fg" strokeWidth={1.5} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold">{t.name}</p>
                        <Badge variant={expired ? "danger" : "success"}>
                          {expired ? "abgelaufen" : t.scopes}
                        </Badge>
                      </div>
                      <p className="font-mono text-xs text-muted-fg">
                        {t.prefix}… · erstellt {t.createdAt.toLocaleDateString("de-DE")}
                        {t.lastUsedAt && ` · zuletzt genutzt ${t.lastUsedAt.toLocaleDateString("de-DE")}`}
                        {t.expiresAt && ` · läuft ab ${t.expiresAt.toLocaleDateString("de-DE")}`}
                      </p>
                    </div>
                    <form action={revokeAction}>
                      <button
                        type="submit"
                        aria-label="Token widerrufen"
                        className="grid size-7 place-items-center text-muted-fg transition-colors hover:bg-danger/10 hover:text-danger"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </form>
                  </li>
                );
              })}
            </ul>
          )}

          <form action={createApiToken} className="space-y-3 border-t border-border pt-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-fg">Neuer Token</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="token-name">Name</Label>
                <Input id="token-name" name="name" placeholder="z. B. Untis-Sync" required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="token-scopes">Berechtigungen</Label>
                <select
                  id="token-scopes"
                  name="scopes"
                  className="h-10 w-full border border-border bg-bg px-3 text-sm focus:border-brand focus:outline-none"
                >
                  <option value="read">read — Lesezugriff</option>
                  <option value="write">write — Schreib- & Lesezugriff</option>
                  <option value="admin">admin — Vollzugriff</option>
                </select>
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="token-expires">Ablaufdatum</Label>
                <select
                  id="token-expires"
                  name="expiresIn"
                  className="h-10 w-full border border-border bg-bg px-3 text-sm focus:border-brand focus:outline-none"
                >
                  <option value="">Kein Ablaufdatum</option>
                  <option value="30d">30 Tage</option>
                  <option value="90d">90 Tage</option>
                  <option value="365d">1 Jahr</option>
                </select>
              </div>
            </div>
            <button
              type="submit"
              className="bg-fg px-4 py-2 text-sm font-semibold text-bg transition-opacity hover:opacity-90"
            >
              Token erstellen
            </button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
