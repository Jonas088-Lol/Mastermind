import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CheckCircle2, Gift, Target, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { prisma } from "@/lib/db/client";
import { ROLE_HOME, effectiveRole, getSession } from "@/lib/session";
import { cancelPromise, createPromise, fulfillPromise } from "./actions";

export const metadata: Metadata = { title: "Belohnungen · Eltern" };

const STATUS_BADGE: Record<string, { label: string; variant: "brand" | "success" | "outline" }> = {
  open:      { label: "Offen",       variant: "brand" },
  fulfilled: { label: "Erfüllt",     variant: "success" },
  cancelled: { label: "Abgebrochen", variant: "outline" },
};

export default async function ElternBelohnungenPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "parent") redirect(ROLE_HOME[effectiveRole(session)]);

  const links = await prisma.parentStudentLink.findMany({
    where: { parentId: session.userId },
    include: { student: { select: { id: true, name: true, schoolClass: { select: { name: true } } } } },
  });

  const promises = await prisma.rewardPromise.findMany({
    where: { parentId: session.userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const nameById = new Map(links.map(({ student }) => [student.id, student.name]));

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Motivation</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Belohnungs-Versprechen</h1>
        <p className="mt-1 text-sm text-muted-fg">
          Setze deinem Kind ein Ziel und versprich eine Belohnung — dein Kind sieht das Ziel in der App.
        </p>
      </header>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Neues Versprechen</CardTitle>
            <p className="mt-1 text-sm text-muted-fg">Dein Kind bekommt sofort eine Benachrichtigung.</p>
          </div>
        </CardHeader>
        <CardBody>
          <form action={createPromise} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="student">Kind</Label>
              <select
                id="student"
                name="studentId"
                required
                className="w-full border border-border bg-bg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
              >
                {links.map(({ student }) => (
                  <option key={student.id} value={student.id}>
                    {student.name} · Klasse {student.schoolClass?.name ?? "—"}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="title">Ziel</Label>
              <Input
                id="title"
                name="title"
                required
                maxLength={120}
                placeholder="z. B. Note 2 oder besser in Mathe"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rewardText">Belohnung</Label>
              <Input
                id="rewardText"
                name="rewardText"
                required
                maxLength={240}
                placeholder="z. B. 10 € Taschengeld extra"
              />
            </div>

            <Button type="submit" size="lg" className="w-full">
              <Target className="size-4" />
              Versprechen anlegen
            </Button>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Deine Versprechen</CardTitle>
          <span className="font-mono text-xs text-muted-fg">{promises.length} gesamt</span>
        </CardHeader>
        <CardBody className="px-0! pb-0!">
          {promises.length === 0 ? (
            <p className="px-5 py-6 text-sm text-muted-fg">Noch keine Versprechen angelegt.</p>
          ) : (
            <ul className="divide-y divide-border border-t border-border">
              {promises.map((p) => {
                const badge = STATUS_BADGE[p.status] ?? STATUS_BADGE.open;
                return (
                  <li key={p.id} className="flex flex-col gap-3 px-5 py-4 text-sm sm:flex-row sm:items-center sm:gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{p.title}</p>
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                      </div>
                      <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-fg">
                        <Gift className="size-3.5 shrink-0" strokeWidth={1.75} />
                        {p.rewardText}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-fg">
                        {nameById.get(p.studentId) ?? "—"}
                        {" · "}
                        {p.createdAt.toLocaleDateString("de-DE", { day: "numeric", month: "short", year: "numeric" })}
                        {p.fulfilledAt &&
                          ` · erfüllt am ${p.fulfilledAt.toLocaleDateString("de-DE", { day: "numeric", month: "short" })}`}
                      </p>
                    </div>
                    {p.status === "open" && (
                      <div className="flex shrink-0 items-center gap-2">
                        <form action={fulfillPromise}>
                          <input type="hidden" name="id" value={p.id} />
                          <Button type="submit" size="sm" variant="outline">
                            <CheckCircle2 className="size-4 text-success" />
                            Einlösen
                          </Button>
                        </form>
                        <form action={cancelPromise}>
                          <input type="hidden" name="id" value={p.id} />
                          <Button type="submit" size="sm" variant="ghost">
                            <XCircle className="size-4 text-danger" />
                            Abbrechen
                          </Button>
                        </form>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
