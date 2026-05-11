import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getSession, isSuper } from "@/lib/session";


export const metadata: Metadata = { title: "Support · Plattform" };

const TICKETS = [
  { id: "T-1042", school: "Realschule München", subject: "SSO Login schlägt fehl", priority: "high" as const, status: "open" as const, created: "vor 2 Std." },
  { id: "T-1041", school: "Gymnasium Augsburg", subject: "Untis-Import hängt", priority: "medium" as const, status: "pending" as const, created: "vor 5 Std." },
  { id: "T-1039", school: "GS Nürnberg", subject: "Frage zu DSGVO-Export", priority: "low" as const, status: "resolved" as const, created: "gestern" },
  { id: "T-1038", school: "BOS Ingolstadt", subject: "Neues Schuljahr anlegen", priority: "low" as const, status: "resolved" as const, created: "gestern" },
];

const PRIORITY_VARIANT = { high: "danger", medium: "warning", low: "outline" } as const;
const STATUS_VARIANT = { open: "brand", pending: "warning", resolved: "success" } as const;

export default async function PlattformSupportPage() {
  const session = await getSession();
  if (!session || !isSuper(session)) redirect("/login");

  const open = TICKETS.filter((t) => t.status !== "resolved").length;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Plattform</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Support</h1>
        <p className="mt-1 text-sm text-muted-fg">{open} offene Tickets</p>
      </header>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Support-Tickets</CardTitle>
              <Badge variant={open > 0 ? "warning" : "success"}>{open} offen</Badge>
            </CardHeader>
            <CardBody className="!px-0 !pb-0">
              <ul className="divide-y divide-border border-t border-border">
                {TICKETS.map((t) => (
                  <li key={t.id} className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-surface">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs text-muted-fg">{t.id}</span>
                        <Badge variant={PRIORITY_VARIANT[t.priority]}>
                          {t.priority === "high" ? "Hoch" : t.priority === "medium" ? "Mittel" : "Niedrig"}
                        </Badge>
                        <Badge variant={STATUS_VARIANT[t.status]}>
                          {t.status === "open" ? "Offen" : t.status === "pending" ? "Wartend" : "Gelöst"}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm font-semibold">{t.subject}</p>
                      <p className="text-xs text-muted-fg">{t.school} · {t.created}</p>
                    </div>
                    <Button size="sm" variant="secondary">Öffnen</Button>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Neues Ticket</CardTitle></CardHeader>
            <CardBody>
              <form className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="school">Schule</Label>
                  <Input id="school" name="school" placeholder="Schulname …" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="subject">Betreff</Label>
                  <Input id="subject" name="subject" placeholder="Kurze Beschreibung …" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="body">Details</Label>
                  <textarea
                    id="body"
                    name="body"
                    rows={4}
                    className="w-full resize-none border border-border bg-bg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                    placeholder="Was genau ist passiert?"
                  />
                </div>
                <Button type="submit" className="w-full">
                  <MessageSquare className="size-3.5" />
                  Ticket erstellen
                </Button>
              </form>
            </CardBody>
          </Card>

          <Card>
            <CardHeader><CardTitle>SLA-Zeiten</CardTitle></CardHeader>
            <CardBody>
              <ul className="space-y-2 text-sm">
                <li className="flex justify-between"><span className="text-muted-fg">Hoch</span><span className="font-semibold">4 Stunden</span></li>
                <li className="flex justify-between"><span className="text-muted-fg">Mittel</span><span className="font-semibold">1 Werktag</span></li>
                <li className="flex justify-between"><span className="text-muted-fg">Niedrig</span><span className="font-semibold">3 Werktage</span></li>
              </ul>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
