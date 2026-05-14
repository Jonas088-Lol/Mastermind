import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Circle, ExternalLink, Plug } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody } from "@/components/ui/card";
import { ROLE_HOME, effectiveRole, getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Integrationen · Admin" };

const INTEGRATIONS = [
  {
    name: "Microsoft Entra ID (SSO)",
    detail: "Single Sign-On über Microsoft 365. Erfordert AZURE_CLIENT_ID und AZURE_CLIENT_SECRET.",
    docsHint: "AZURE_CLIENT_ID · AZURE_TENANT_ID",
  },
  {
    name: "Google Workspace",
    detail: "Google Classroom, Drive und Meet. Erfordert Google OAuth-Credentials.",
    docsHint: "GOOGLE_CLIENT_ID · GOOGLE_CLIENT_SECRET",
  },
  {
    name: "Apple School Manager",
    detail: "MDM-Integration und App-Verteilung über Apple School Manager.",
    docsHint: "Konfiguration über Plattform-Admin",
  },
  {
    name: "WebUntis / Untis",
    detail: "Automatischer Stundenplan-Import. Datei-Upload unter Verwaltung → Stundenplan.",
    docsHint: "→ /admin/stundenplan",
  },
  {
    name: "LTI 1.3 (externe Tools)",
    detail: "Einbindung von Drittanbieter-Lerntools per LTI 1.3.",
    docsHint: "Konfiguration über Plattform-Admin",
  },
  {
    name: "SCIM / Provisioning",
    detail: "Automatische Nutzeranlage aus HR-Systemen über SCIM 2.0.",
    docsHint: "SCIM_TOKEN · Konfiguration über Plattform-Admin",
  },
] as const;

export default async function AdminIntegrationenPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "admin") redirect(ROLE_HOME[effectiveRole(session)]);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Schul-Admin</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Integrationen</h1>
        <p className="mt-1 text-sm text-muted-fg">
          {INTEGRATIONS.length} Integrationen verfügbar · Konfiguration über die Plattform-Verwaltung
        </p>
      </header>

      <div className="border border-dashed border-border bg-surface p-4 text-sm text-muted-fg">
        <div className="flex items-center gap-2">
          <Plug className="size-4 text-muted-fg" strokeWidth={1.5} />
          <p className="font-semibold text-fg">Keine Integrationen aktiv</p>
        </div>
        <p className="mt-1">
          Integrationen werden über Umgebungsvariablen konfiguriert. Wende dich an den Plattform-Admin.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {INTEGRATIONS.map((i) => (
          <Card key={i.name}>
            <CardBody className="!p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Circle className="size-4 text-muted-fg" />
                    <p className="font-semibold">{i.name}</p>
                  </div>
                  <p className="mt-1 text-sm text-muted-fg">{i.detail}</p>
                  <p className="mt-2 font-mono text-[10px] text-muted-fg">{i.docsHint}</p>
                </div>
                <Badge variant="outline">Inaktiv</Badge>
              </div>
              <div className="mt-4">
                <span className="inline-flex items-center gap-1 text-xs text-muted-fg">
                  <ExternalLink className="size-3" />
                  Konfiguration über Plattform-Admin
                </span>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
