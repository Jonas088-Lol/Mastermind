/* Copyright 2026 Elian Schock, Jonas Schwenk */
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CheckCircle2, Gift, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody } from "@/components/ui/card";
import { prisma } from "@/lib/db/client";
import { ROLE_HOME, effectiveRole, getSession } from "@/lib/session";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Ziele · MasterMind" };

export default async function ZielePage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "student") redirect(ROLE_HOME[effectiveRole(session)]);

  const promises = await prisma.rewardPromise.findMany({
    where: { studentId: session.userId, status: { in: ["open", "fulfilled"] } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const open = promises.filter((p) => p.status === "open");
  const fulfilled = promises.filter((p) => p.status === "fulfilled");

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Von deinen Eltern</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Deine Ziele</h1>
        <p className="mt-1 text-sm text-muted-fg">
          Erreiche ein Ziel und deine Eltern lösen die Belohnung ein.
        </p>
      </header>

      {promises.length === 0 && (
        <Card>
          <CardBody>
            <p className="py-4 text-center text-sm text-muted-fg">
              Noch keine Ziele — deine Eltern können dir hier Ziele mit Belohnungen setzen.
            </p>
          </CardBody>
        </Card>
      )}

      {open.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-fg">Offene Ziele</h2>
          {open.map((p) => (
            <PromiseCard key={p.id} title={p.title} rewardText={p.rewardText} status="open" />
          ))}
        </section>
      )}

      {fulfilled.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-fg">Erreicht & eingelöst</h2>
          {fulfilled.map((p) => (
            <PromiseCard key={p.id} title={p.title} rewardText={p.rewardText} status="fulfilled" />
          ))}
        </section>
      )}
    </div>
  );
}

function PromiseCard({
  title,
  rewardText,
  status,
}: {
  title: string;
  rewardText: string;
  status: "open" | "fulfilled";
}) {
  const isOpen = status === "open";
  const Icon = isOpen ? Target : CheckCircle2;
  return (
    <Card className={cn(!isOpen && "opacity-80")}>
      <CardBody>
        <div className="flex items-start gap-4">
          <div
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-xl",
              isOpen ? "bg-brand/10 text-brand" : "bg-success/10 text-success"
            )}
          >
            <Icon className="size-5" strokeWidth={1.75} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold">{title}</p>
              <Badge variant={isOpen ? "brand" : "success"}>{isOpen ? "Offen" : "Eingelöst"}</Badge>
            </div>
            <p className="mt-1.5 flex items-center gap-1.5 text-sm text-muted-fg">
              <Gift className="size-4 shrink-0 text-warning" strokeWidth={1.75} />
              <span className="min-w-0">{rewardText}</span>
            </p>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
