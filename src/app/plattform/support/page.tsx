import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CheckCircle2, ExternalLink, Mail, MessageSquare, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { prisma } from "@/lib/db/client";
import { getSession, isSuper } from "@/lib/session";
import { COMPANY } from "@/lib/company";
import { createSupportTicket, resolveTicket } from "./actions";

export const metadata: Metadata = { title: "Support · Plattform" };

const PRIORITY_VARIANT = { high: "danger", medium: "warning", low: "outline" } as const;
const PRIORITY_LABEL = { high: "Hoch", medium: "Mittel", low: "Niedrig" } as const;

const STATUS_SERVICES = [
  { name: "API", ok: true },
  { name: "Datenbank", ok: true },
  { name: "E-Mail", ok: true },
  { name: "Zahlungen", ok: true },
] as const;

const CONTACTS = [
  {
    role: "Technischer Support",
    email: COMPANY.email,
    note: "Für Fehler, Ausfälle & technische Fragen",
  },
  {
    role: "Vertrieb",
    email: "vertrieb@mastermind.app",
    note: "Lizenzen, Pakete & Preise",
  },
  {
    role: "Datenschutz",
    email: COMPANY.emailPrivacy,
    note: "DSGVO-Anfragen & Löschbegehren",
  },
] as const;

export default async function PlattformSupportPage() {
  const session = await getSession();
  if (!session || !isSuper(session)) redirect("/login");

  const tickets = await prisma.appNotification.findMany({
    where: { userId: session.userId, type: "support_ticket" },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const open = tickets.filter((t) => t.readAt === null).length;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Plattform</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Support</h1>
        <p className="mt-1 text-sm text-muted-fg">{open} offene Tickets</p>
      </header>

      <div className="grid gap-6 xl:grid-cols-3">
        {/* Left column: tickets + system status + maintenance */}
        <div className="space-y-6 xl:col-span-2">

          {/* Ticket list */}
          <Card>
            <CardHeader>
              <CardTitle>Support-Tickets</CardTitle>
              <Badge variant={open > 0 ? "warning" : "success"}>{open} offen</Badge>
            </CardHeader>
            <CardBody className="!px-0 !pb-0">
              <div className="border-t border-border bg-surface px-5 py-3">
                <p className="text-xs text-muted-fg">
                  Tickets werden über{" "}
                  <a
                    href="https://tickets.mastermind.de"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-brand underline-offset-2 hover:underline"
                  >
                    tickets.mastermind.de
                    <ExternalLink className="size-3" />
                  </a>{" "}
                  verwaltet. Interne Notizen können unten erstellt werden.
                </p>
              </div>
              {tickets.length === 0 ? (
                <p className="border-t border-border px-5 py-8 text-sm text-muted-fg">
                  Noch keine internen Tickets erstellt.
                </p>
              ) : (
                <ul className="divide-y divide-border border-t border-border">
                  {tickets.map((t) => {
                    const priority = (t.linkUrl ?? "low") as "high" | "medium" | "low";
                    const [school, ...bodyParts] = (t.body ?? "").split(" · ");
                    return (
                      <li key={t.id} className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-surface">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant={PRIORITY_VARIANT[priority] ?? "outline"}>
                              {PRIORITY_LABEL[priority] ?? priority}
                            </Badge>
                            <Badge variant={t.readAt !== null ? "success" : "brand"}>
                              {t.readAt !== null ? "Gelöst" : "Offen"}
                            </Badge>
                          </div>
                          <p className="mt-1 text-sm font-semibold">{t.title}</p>
                          <p className="text-xs text-muted-fg">
                            {school}
                            {bodyParts.length > 0 && ` · ${bodyParts.join(" · ")}`}
                            {" · "}
                            {t.createdAt.toLocaleDateString("de-DE", { day: "numeric", month: "short", year: "numeric" })}
                          </p>
                        </div>
                        {t.readAt === null && (
                          <form action={resolveTicket.bind(null, t.id)}>
                            <button
                              type="submit"
                              className="border border-border px-3 py-1.5 text-xs font-medium text-muted-fg transition-colors hover:border-success/40 hover:text-success"
                            >
                              Lösen
                            </button>
                          </form>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardBody>
          </Card>

          {/* System status */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-muted-fg" />
                <CardTitle>System-Status</CardTitle>
              </div>
              <Badge variant="success">Alle Systeme aktiv</Badge>
            </CardHeader>
            <CardBody className="!px-0 !pb-0">
              <ul className="divide-y divide-border border-t border-border">
                {STATUS_SERVICES.map((svc) => (
                  <li key={svc.name} className="flex items-center justify-between px-5 py-3">
                    <span className="text-sm font-medium">{svc.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-success" />
                      <Badge variant="success">Aktiv</Badge>
                    </div>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>

          {/* Maintenance announcement (UI mockup only) */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Wrench className="size-4 text-muted-fg" />
                <CardTitle>Wartungsankündigung</CardTitle>
              </div>
              <Badge variant="outline">Mockup</Badge>
            </CardHeader>
            <CardBody>
              <p className="mb-4 text-xs text-muted-fg">
                Diese Ankündigung wird nirgends gespeichert — rein informelle Vorschau.
              </p>
              <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="maint-start">Start</Label>
                    <input
                      id="maint-start"
                      name="maint-start"
                      type="datetime-local"
                      className="h-9 w-full border border-border bg-bg px-3 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="maint-end">Ende</Label>
                    <input
                      id="maint-end"
                      name="maint-end"
                      type="datetime-local"
                      className="h-9 w-full border border-border bg-bg px-3 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="maint-msg">Nachricht</Label>
                  <textarea
                    id="maint-msg"
                    name="maint-msg"
                    rows={3}
                    placeholder="Wir führen planmäßige Wartungsarbeiten durch …"
                    className="w-full resize-none border border-border bg-bg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                  />
                </div>
                <Button type="button" variant="outline" className="w-full" disabled>
                  Ankündigung absenden (Demo)
                </Button>
              </form>
            </CardBody>
          </Card>
        </div>

        {/* Right column: new ticket + SLA + contacts */}
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Neues Ticket</CardTitle></CardHeader>
            <CardBody>
              <form action={createSupportTicket} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="school">Schule (optional)</Label>
                  <Input id="school" name="school" placeholder="Schulname …" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="subject">Betreff *</Label>
                  <Input id="subject" name="subject" placeholder="Kurze Beschreibung …" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="priority">Priorität</Label>
                  <select
                    id="priority"
                    name="priority"
                    className="h-10 w-full border border-border bg-bg px-3 text-sm focus:outline-none"
                  >
                    <option value="low">Niedrig</option>
                    <option value="medium">Mittel</option>
                    <option value="high">Hoch</option>
                  </select>
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

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Mail className="size-4 text-muted-fg" />
                <CardTitle>Kontaktdaten</CardTitle>
              </div>
            </CardHeader>
            <CardBody className="!px-0 !pb-0">
              <ul className="divide-y divide-border border-t border-border">
                {CONTACTS.map((c) => (
                  <li key={c.role} className="px-5 py-3.5">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-fg">{c.role}</p>
                    <a
                      href={`mailto:${c.email}`}
                      className="mt-0.5 block text-sm font-medium text-brand hover:underline underline-offset-2"
                    >
                      {c.email}
                    </a>
                    <p className="mt-0.5 text-xs text-muted-fg">{c.note}</p>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
