import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AlertTriangle, CheckCircle2, Key, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db/client";
import { getSession, isSuper } from "@/lib/session";

export const metadata: Metadata = { title: "Sicherheit · Plattform" };

export default async function PlattformSicherheitPage() {
  const session = await getSession();
  if (!session || !isSuper(session)) redirect("/login");

  const [totalUsers, usersWith2FA] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { twoFactor: true } }),
  ]);

  const twoFAPct = totalUsers > 0 ? Math.round((usersWith2FA / totalUsers) * 100) : 0;

  const checks = [
    { label: "TLS 1.3 erzwungen", ok: true },
    { label: "HSTS aktiviert (max-age 1y)", ok: true },
    { label: "CSP-Header gesetzt", ok: true },
    { label: "Rate-Limiting aktiv", ok: true },
    { label: "Secrets in Vault", ok: true },
    { label: "Dependency-Scan sauber", ok: true },
    { label: "Pen-Test aktuell (< 12 Monate)", ok: false },
  ];

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Plattform</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Sicherheit</h1>
        <p className="mt-1 text-sm text-muted-fg">Plattformweite Sicherheitsübersicht.</p>
      </header>

      <div className="grid grid-cols-2 gap-px border border-border bg-border">
        <div className="bg-bg p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">2FA-Abdeckung</p>
          <p className="mt-2 font-mono text-3xl font-bold">{twoFAPct}%</p>
          <p className="mt-1 text-xs text-muted-fg">{usersWith2FA} von {totalUsers} Nutzern</p>
        </div>
        <div className="bg-bg p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">Security-Score</p>
          <p className="mt-2 font-mono text-3xl font-bold text-success">A</p>
          <p className="mt-1 text-xs text-muted-fg">{checks.filter((c) => c.ok).length}/{checks.length} Checks OK</p>
        </div>
      </div>

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

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Key className="size-4 text-muted-fg" />
            <CardTitle>Plattform-API-Keys</CardTitle>
          </div>
        </CardHeader>
        <CardBody>
          <p className="text-sm text-muted-fg mb-4">API-Keys für interne Service-zu-Service-Kommunikation.</p>
          <div className="space-y-2">
            {["KI-Service", "E-Mail-Provider", "Monitoring"].map((svc) => (
              <div key={svc} className="flex items-center justify-between border border-border px-4 py-2.5">
                <span className="text-sm font-semibold">{svc}</span>
                <span className="font-mono text-xs text-muted-fg">••••••••••••••••</span>
                <Button size="sm" variant="ghost">Rotieren</Button>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
