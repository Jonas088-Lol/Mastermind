import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, CheckCircle2, Circle, Lock, Plug } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody } from "@/components/ui/card";
import { prisma } from "@/lib/db/client";
import { ROLE_HOME, effectiveRole, getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Integrationen · Admin" };

interface Integration {
  name: string;
  detail: string;
  envVars?: string[];
  requiresEnterprise: boolean;
  configHref?: string;
  configLabel?: string;
  ssoProvider?: "entra" | "google";
}

const INTEGRATIONS: Integration[] = [
  {
    name: "Microsoft Entra ID (SSO)",
    detail: "Single Sign-On über Microsoft 365. Nutzer melden sich mit ihrem Schul-Account an — kein separates Passwort.",
    requiresEnterprise: true,
    ssoProvider: "entra",
    configLabel: "Konfigurieren",
  },
  {
    name: "Google Workspace",
    detail: "Google Classroom, Drive und Meet. Nutzer melden sich mit ihrer Google-Schuladresse an.",
    requiresEnterprise: true,
    ssoProvider: "google",
    configLabel: "Konfigurieren",
  },
  {
    name: "Apple School Manager",
    detail: "MDM-Integration und App-Verteilung über Apple School Manager.",
    requiresEnterprise: true,
    configLabel: "Über Plattform-Admin einrichten",
  },
  {
    name: "WebUntis / Untis",
    detail: "Automatischer Stundenplan-Import per XML-Datei.",
    requiresEnterprise: false,
    configHref: "/admin/stundenplan",
    configLabel: "Zum Stundenplan-Import",
  },
  {
    name: "LTI 1.3 (externe Tools)",
    detail: "Einbindung von Drittanbieter-Lerntools per LTI 1.3 — z. B. H5P, GeoGebra, Moodle.",
    requiresEnterprise: true,
    configLabel: "Über Plattform-Admin einrichten",
  },
  {
    name: "SCIM / Provisioning",
    detail: "Automatische Nutzeranlage und Deaktivierung aus HR-Systemen über SCIM 2.0.",
    envVars: ["SCIM_TOKEN"],
    requiresEnterprise: true,
    configLabel: "Über Plattform-Admin einrichten",
  },
];

export default async function AdminIntegrationenPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "admin") redirect(ROLE_HOME[effectiveRole(session)]);

  const schoolId = session.schoolId;
  const school = schoolId
    ? await prisma.school.findUnique({ where: { id: schoolId }, select: { plan: true } })
    : null;
  const isEnterprise = school?.plan === "enterprise";

  const ssoConfigs = schoolId && isEnterprise
    ? await prisma.ssoConfig.findMany({ where: { schoolId }, select: { provider: true, enabled: true } })
    : [];
  const ssoByProvider = Object.fromEntries(ssoConfigs.map((c) => [c.provider, c]));

  const enterpriseGated = INTEGRATIONS.filter((i) => i.requiresEnterprise);
  const available = INTEGRATIONS.filter((i) => !i.requiresEnterprise);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Schul-Admin</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Integrationen</h1>
        <p className="mt-1 text-sm text-muted-fg">
          {INTEGRATIONS.length} Integrationen verfügbar · {available.length} im aktuellen Plan freigeschaltet
        </p>
      </header>

      {!isEnterprise && (
        <div className="flex items-start gap-3 border border-warning/40 bg-warning/5 p-4 text-sm">
          <Lock className="mt-0.5 size-4 shrink-0 text-warning" strokeWidth={1.75} />
          <div>
            <p className="font-semibold text-fg">
              {enterpriseGated.length} Integrationen erfordern den Enterprise-Plan
            </p>
            <p className="mt-0.5 text-muted-fg">
              SSO, SCIM, LTI 1.3 und Apple School Manager sind im Enterprise-Plan enthalten.
              Für ein Upgrade wende dich an den Plattform-Support.
            </p>
            <Link
              href="/admin/lizenz"
              className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
            >
              Lizenz & Upgrade ansehen
              <ArrowRight className="size-3" />
            </Link>
          </div>
        </div>
      )}

      <div className="border border-dashed border-border bg-surface p-4 text-sm text-muted-fg">
        <div className="flex items-center gap-2">
          <Plug className="size-4 text-muted-fg" strokeWidth={1.5} />
          <p className="font-semibold text-fg">{isEnterprise ? "SSO direkt konfigurierbar" : "Aktivierung durch den Plattform-Admin"}</p>
        </div>
        <p className="mt-1">
          {isEnterprise
            ? "Microsoft Entra ID und Google Workspace kannst du direkt hier konfigurieren. SCIM und LTI 1.3 erfordern Einrichtung durch den Plattform-Admin."
            : "Integrationen werden nach dem Upgrade auf Enterprise freigeschaltet. WebUntis kannst du schon jetzt unter "}
          {!isEnterprise && (
            <Link href="/admin/stundenplan" className="text-brand hover:underline">
              Stundenplan-Import
            </Link>
          )}
          {!isEnterprise && " einrichten."}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {INTEGRATIONS.map((i) => {
          const locked = i.requiresEnterprise && !isEnterprise;
          const ssoConfig = i.ssoProvider ? ssoByProvider[i.ssoProvider] : null;
          const isConfigured = Boolean(ssoConfig);
          const isActive = ssoConfig?.enabled ?? false;
          const ssoHref = isEnterprise && i.ssoProvider
            ? `/admin/integrationen/${i.ssoProvider}`
            : null;

          return (
            <Card key={i.name} className={locked ? "opacity-60" : undefined}>
              <CardBody className="!p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {isActive ? (
                        <CheckCircle2 className="size-4 text-success" strokeWidth={1.75} />
                      ) : (
                        <Circle className="size-4 text-muted-fg" />
                      )}
                      <p className="font-semibold">{i.name}</p>
                    </div>
                    <p className="mt-1 text-sm text-muted-fg">{i.detail}</p>
                    {i.envVars && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {i.envVars.map((v) => (
                          <code key={v} className="rounded bg-surface px-1.5 py-0.5 font-mono text-[10px] text-muted-fg">
                            {v}
                          </code>
                        ))}
                      </div>
                    )}
                  </div>
                  <Badge variant={locked ? "outline" : isActive ? "success" : isConfigured ? "info" : "outline"}>
                    {locked ? "Enterprise" : isActive ? "Aktiv" : isConfigured ? "Konfiguriert" : "Inaktiv"}
                  </Badge>
                </div>
                {(ssoHref || i.configHref || (!ssoHref && i.configLabel)) && (
                  <div className="mt-4 border-t border-border pt-3">
                    {ssoHref ? (
                      <Link
                        href={ssoHref}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
                      >
                        {isConfigured ? "Konfiguration bearbeiten" : i.configLabel}
                        <ArrowRight className="size-3" />
                      </Link>
                    ) : i.configHref ? (
                      <Link
                        href={i.configHref}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
                      >
                        {i.configLabel}
                        <ArrowRight className="size-3" />
                      </Link>
                    ) : (
                      <span className="text-xs text-muted-fg">{i.configLabel}</span>
                    )}
                  </div>
                )}
              </CardBody>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
