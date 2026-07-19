/* Copyright 2026 Elian Schock, Jonas Schwenk */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ShieldCheck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { prisma } from "@/lib/db/client";
import { ROLE_HOME, effectiveRole, getSession } from "@/lib/session";
import { deleteSsoConfig, saveSsoConfig } from "./actions";
import { canManageSchool, canAccessArea } from "@/lib/school-admin";

interface PageProps {
  params: Promise<{ provider: string }>;
}

const PROVIDER_META = {
  entra: {
    label: "Microsoft Entra ID",
    description: "Nutzer melden sich mit ihrem Microsoft 365 Schulaccount an.",
    fields: [
      { name: "clientId", label: "Client ID (Application ID)", placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" },
      { name: "clientSecret", label: "Client Secret", placeholder: "••••••••", type: "password" },
      { name: "tenantId", label: "Tenant ID (Verzeichnis-ID)", placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" },
    ],
  },
  google: {
    label: "Google Workspace",
    description: "Nutzer melden sich mit ihrer Google-Schuladresse an.",
    fields: [
      { name: "clientId", label: "Client ID", placeholder: "xxxxxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com" },
      { name: "clientSecret", label: "Client Secret", placeholder: "GOCSPX-••••••••", type: "password" },
    ],
  },
} as const;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { provider } = await params;
  const meta = PROVIDER_META[provider as keyof typeof PROVIDER_META];
  return { title: meta ? `${meta.label} · Integrationen · Admin` : "Integrationen · Admin" };
}

export default async function SsoConfigPage({ params }: PageProps) {
  const { provider } = await params;
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canManageSchool(effectiveRole(session))) redirect(ROLE_HOME[effectiveRole(session)]);
  if (!canAccessArea(effectiveRole(session), "integrationen")) redirect("/admin");

  if (!(provider in PROVIDER_META)) notFound();
  const meta = PROVIDER_META[provider as keyof typeof PROVIDER_META];

  const school = session.schoolId
    ? await prisma.school.findUnique({ where: { id: session.schoolId }, select: { plan: true } })
    : null;

  if (school?.plan !== "enterprise") {
    redirect("/admin/integrationen");
  }

  const existing = session.schoolId
    ? await prisma.ssoConfig.findUnique({
        where: { schoolId_provider: { schoolId: session.schoolId, provider } },
        select: { clientId: true, tenantId: true, enabled: true },
      })
    : null;

  const saveWithProvider = saveSsoConfig.bind(null, provider as "entra" | "google");
  const deleteWithProvider = deleteSsoConfig.bind(null, provider as "entra" | "google");

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-8">
      <header>
        <Link
          href="/admin/integrationen"
          className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-muted-fg transition-colors hover:text-fg"
        >
          <ArrowLeft className="size-3.5" />
          Integrationen
        </Link>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">{meta.label}</h1>
        <p className="mt-1 text-sm text-muted-fg">{meta.description}</p>
      </header>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-muted-fg" strokeWidth={1.75} />
            <CardTitle>Zugangsdaten</CardTitle>
          </div>
          {existing && (
            <span className="text-xs font-semibold text-success">Konfiguriert</span>
          )}
        </CardHeader>
        <CardBody>
          <form action={saveWithProvider} className="space-y-4">
            {"fields" in meta && meta.fields.map((field) => (
              <div key={field.name} className="space-y-1.5">
                <Label htmlFor={field.name}>{field.label}</Label>
                <Input
                  id={field.name}
                  name={field.name}
                  type={(field as { type?: string }).type ?? "text"}
                  defaultValue={
                    field.name === "clientId"
                      ? (existing?.clientId ?? "")
                      : field.name === "tenantId"
                      ? (existing?.tenantId ?? "")
                      : existing
                      ? "••••••••"
                      : ""
                  }
                  placeholder={field.placeholder}
                  required={field.name !== "tenantId"}
                  className="font-mono text-sm"
                />
              </div>
            ))}

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="enabled"
                name="enabled"
                defaultChecked={existing?.enabled ?? true}
                className="h-4 w-4 rounded border-border"
              />
              <Label htmlFor="enabled" className="cursor-pointer font-normal">
                Integration aktiv schalten
              </Label>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button type="submit">Speichern</Button>
              {existing && (
                <form action={deleteWithProvider}>
                  <Button type="submit" variant="ghost" className="text-danger hover:bg-danger/10">
                    <Trash2 className="size-4" />
                    Konfiguration löschen
                  </Button>
                </form>
              )}
            </div>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader><CardTitle>Hinweise zur Einrichtung</CardTitle></CardHeader>
        <CardBody className="space-y-3 text-sm text-muted-fg">
          {provider === "entra" && (
            <>
              <p>1. Öffne das <strong className="text-fg">Azure-Portal</strong> → App-Registrierungen → Neue Registrierung.</p>
              <p>2. Redirect URI: <code className="rounded bg-surface px-1.5 py-0.5 font-mono text-xs">/api/auth/callback/azure-ad</code></p>
              <p>3. Unter „Zertifikate & Geheimnisse" ein neues Client-Geheimnis erstellen und hier eintragen.</p>
              <p>4. Die Tenant-ID findest du unter Entra ID → Übersicht → Verzeichnis-ID.</p>
            </>
          )}
          {provider === "google" && (
            <>
              <p>1. Öffne die <strong className="text-fg">Google Cloud Console</strong> → APIs & Dienste → Anmeldedaten.</p>
              <p>2. OAuth-Client-ID erstellen (Webanwendung).</p>
              <p>3. Autorisierter Redirect-URI: <code className="rounded bg-surface px-1.5 py-0.5 font-mono text-xs">/api/auth/callback/google</code></p>
              <p>4. Client-ID und Client-Geheimnis hier eintragen.</p>
            </>
          )}
          <p className="pt-1 text-xs">
            Die Zugangsdaten werden in der Datenbank gespeichert. Stelle sicher, dass deine Produktionsdatenbank verschlüsselt ist.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
