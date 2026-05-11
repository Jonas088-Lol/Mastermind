import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Key, Lock, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db/client";
import { ROLE_HOME, effectiveRole, getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Sicherheit · Admin" };

export default async function AdminSicherheitPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "admin") redirect(ROLE_HOME[effectiveRole(session)]);

  const [teacherCount, teacherWith2FA] = await Promise.all([
    prisma.user.count({ where: { role: "teacher", ...(session.schoolId ? { schoolId: session.schoolId } : {}) } }),
    prisma.user.count({ where: { role: "teacher", twoFactor: true, ...(session.schoolId ? { schoolId: session.schoolId } : {}) } }),
  ]);

  const twoFAPct = teacherCount > 0 ? Math.round((teacherWith2FA / teacherCount) * 100) : 0;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Schul-Admin</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Sicherheit</h1>
        <p className="mt-1 text-sm text-muted-fg">Sicherheitsrichtlinien und Zugriffsschutz.</p>
      </header>

      <div className="grid grid-cols-2 gap-px border border-border bg-border">
        <div className="bg-bg p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">2FA · Lehrer</p>
          <p className="mt-2 font-mono text-3xl font-bold">{twoFAPct}%</p>
          <p className="mt-1 text-xs text-muted-fg">{teacherWith2FA} von {teacherCount}</p>
        </div>
        <div className="bg-bg p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">Fehlgeschl. Logins</p>
          <p className="mt-2 font-mono text-3xl font-bold">3</p>
          <p className="mt-1 text-xs text-muted-fg">Letzte 24 Stunden</p>
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
          <p className="text-sm text-muted-fg mb-4">
            {twoFAPct === 100
              ? "Alle Lehrer haben 2FA aktiviert. Sehr gut!"
              : `${teacherCount - teacherWith2FA} Lehrer haben noch kein 2FA aktiviert.`}
          </p>
          <div className="space-y-3">
            <label className="flex items-center justify-between text-sm">
              <span>2FA für Lehrer verpflichtend</span>
              <input type="checkbox" defaultChecked={twoFAPct === 100} className="size-4 accent-brand" />
            </label>
            <label className="flex items-center justify-between text-sm">
              <span>2FA für Admins verpflichtend</span>
              <input type="checkbox" defaultChecked className="size-4 accent-brand" />
            </label>
            <label className="flex items-center justify-between text-sm">
              <span>2FA für Schüler empfohlen</span>
              <input type="checkbox" className="size-4 accent-brand" />
            </label>
          </div>
          <Button size="sm" className="mt-4">Erinnerung an Lehrer senden</Button>
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
          <div className="space-y-3 text-sm">
            <label className="flex items-center justify-between">
              <span>Mindestlänge 12 Zeichen</span>
              <input type="checkbox" defaultChecked className="size-4 accent-brand" />
            </label>
            <label className="flex items-center justify-between">
              <span>Sonderzeichen erforderlich</span>
              <input type="checkbox" defaultChecked className="size-4 accent-brand" />
            </label>
            <label className="flex items-center justify-between">
              <span>Passwort-Ablauf nach 180 Tagen</span>
              <input type="checkbox" className="size-4 accent-brand" />
            </label>
          </div>
          <Button size="sm" variant="outline" className="mt-4">Speichern</Button>
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
          <p className="text-sm text-muted-fg mb-4">API-Tokens für Drittanbieter-Integrationen.</p>
          <div className="border border-dashed border-border py-6 text-center text-sm text-muted-fg">
            Noch kein API-Token erstellt.
          </div>
          <Button size="sm" variant="outline" className="mt-4">
            <Key className="size-3.5" />
            Token erstellen
          </Button>
        </CardBody>
      </Card>
    </div>
  );
}
