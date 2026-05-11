import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CheckCircle2, Circle, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { ROLE_HOME, effectiveRole, getSession } from "@/lib/session";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Integrationen · Admin" };

const INTEGRATIONS = [
  { name: "Microsoft Entra ID (SSO)", detail: "234 Nutzer synchronisiert", status: "active" as const, lastSync: "vor 2 Min.", docs: "#" },
  { name: "WebUntis / Untis", detail: "Stundenplan-Import · Sync alle 15 Min.", status: "active" as const, lastSync: "vor 8 Min.", docs: "#" },
  { name: "Google Workspace", detail: "Google Classroom, Drive, Meet", status: "ready" as const, lastSync: null, docs: "#" },
  { name: "Apple School Manager", detail: "MDM & App-Verteilung", status: "off" as const, lastSync: null, docs: "#" },
  { name: "LTI 1.3 (externe Tools)", detail: "Anbindung von Drittanbieter-LMS", status: "off" as const, lastSync: null, docs: "#" },
  { name: "SCIM / Provisioning", detail: "Automatische Nutzeranlage aus HR-System", status: "active" as const, lastSync: "vor 2 Std.", docs: "#" },
];

export default async function AdminIntegrationenPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "admin") redirect(ROLE_HOME[effectiveRole(session)]);

  const active = INTEGRATIONS.filter((i) => i.status === "active").length;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Schul-Admin</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Integrationen</h1>
        <p className="mt-1 text-sm text-muted-fg">{active} aktive Verbindungen · {INTEGRATIONS.length - active} verfügbar</p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {INTEGRATIONS.map((i) => (
          <Card key={i.name}>
            <CardBody className="!p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <StatusDot status={i.status} />
                    <p className="font-semibold">{i.name}</p>
                  </div>
                  <p className="mt-1 text-sm text-muted-fg">{i.detail}</p>
                  {i.lastSync && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-muted-fg">
                      <RefreshCw className="size-3" />
                      Zuletzt: {i.lastSync}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <Badge variant={i.status === "active" ? "success" : i.status === "ready" ? "warning" : "outline"}>
                    {i.status === "active" ? "Aktiv" : i.status === "ready" ? "Bereit" : "Inaktiv"}
                  </Badge>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Button size="sm" variant={i.status === "active" ? "outline" : "primary"}>
                  {i.status === "active" ? "Konfigurieren" : "Aktivieren"}
                </Button>
                {i.status === "active" && (
                  <Button size="sm" variant="ghost" className="text-danger hover:text-danger">
                    Trennen
                  </Button>
                )}
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}

function StatusDot({ status }: { status: "active" | "ready" | "off" }) {
  if (status === "active") return <CheckCircle2 className="size-4 text-success" />;
  return <Circle className={cn("size-4", status === "ready" ? "text-warning" : "text-muted-fg")} />;
}
