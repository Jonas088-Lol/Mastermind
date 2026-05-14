import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { prisma } from "@/lib/db/client";
import { getSession, isSuper } from "@/lib/session";
import { createSupportTicket, resolveTicket } from "./actions";

export const metadata: Metadata = { title: "Support · Plattform" };

const PRIORITY_VARIANT = { high: "danger", medium: "warning", low: "outline" } as const;
const PRIORITY_LABEL = { high: "Hoch", medium: "Mittel", low: "Niedrig" } as const;

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
        <div className="xl:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Support-Tickets</CardTitle>
              <Badge variant={open > 0 ? "warning" : "success"}>{open} offen</Badge>
            </CardHeader>
            <CardBody className="!px-0 !pb-0">
              {tickets.length === 0 ? (
                <p className="border-t border-border px-5 py-8 text-sm text-muted-fg">
                  Noch keine Tickets erstellt.
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
        </div>

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
        </div>
      </div>
    </div>
  );
}
