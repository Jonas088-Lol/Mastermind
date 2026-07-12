/* Copyright 2026 Elian Schock, Jonas Schwenk */
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CheckCircle2, Clock, FileSignature, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { prisma } from "@/lib/db/client";
import { ROLE_HOME, effectiveRole, getSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { reportAbsence } from "./actions";

export const metadata: Metadata = { title: "Abwesenheit · Eltern" };

const todayStr = () => new Date().toISOString().slice(0, 10);

const STATUS_LABEL: Record<string, { label: string; icon: typeof Clock; cls: string }> = {
  pending:   { label: "Ausstehend",  icon: Clock,         cls: "text-warning" },
  confirmed: { label: "Bestätigt",   icon: CheckCircle2,  cls: "text-success" },
  rejected:  { label: "Abgelehnt",   icon: XCircle,       cls: "text-danger"  },
};

export default async function ElternAbwesenheitPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "parent") redirect(ROLE_HOME[effectiveRole(session)]);

  const links = await prisma.parentStudentLink.findMany({
    where: { parentId: session.userId },
    include: { student: { select: { id: true, name: true, schoolClass: { select: { name: true } } } } },
  });

  const absences = await prisma.absence.findMany({
    where: { reporterId: session.userId },
    include: { student: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const today = todayStr();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Schule</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Krankmeldung</h1>
        <p className="mt-1 text-sm text-muted-fg">Melde dein Kind für einen oder mehrere Tage krank.</p>
      </header>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Neue Meldung</CardTitle>
            <p className="mt-1 text-sm text-muted-fg">Wird direkt an die Schulleitung übermittelt.</p>
          </div>
        </CardHeader>
        <CardBody>
          <form action={reportAbsence} className="space-y-5">
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="from">Von</Label>
                <Input id="from" name="from" type="date" defaultValue={today} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="to">Bis</Label>
                <Input id="to" name="to" type="date" defaultValue={today} required />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="reason">Grund (optional)</Label>
              <textarea
                id="reason"
                name="reason"
                rows={3}
                className="w-full resize-none border border-border bg-bg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                placeholder="z. B. Erkältung, Arzttermin …"
              />
            </div>

            <Button type="submit" size="lg" className="w-full">
              <FileSignature className="size-4" />
              Krankmeldung abschicken
            </Button>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bisherige Meldungen</CardTitle>
          <span className="font-mono text-xs text-muted-fg">{absences.length} gesamt</span>
        </CardHeader>
        <CardBody className="px-0! pb-0!">
          {absences.length === 0 ? (
            <p className="px-5 py-6 text-sm text-muted-fg">Noch keine Abwesenheiten gemeldet.</p>
          ) : (
            <ul className="divide-y divide-border border-t border-border">
              {absences.map((a) => {
                const s = STATUS_LABEL[a.status] ?? STATUS_LABEL.pending;
                const Icon = s.icon;
                return (
                  <li key={a.id} className="flex items-center gap-4 px-5 py-3.5 text-sm">
                    <Icon className={cn("size-4 shrink-0", s.cls)} strokeWidth={1.75} />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{a.student.name}</p>
                      <p className="text-xs text-muted-fg">
                        {a.fromDate.toLocaleDateString("de-DE", { day: "numeric", month: "short" })}
                        {" – "}
                        {a.toDate.toLocaleDateString("de-DE", { day: "numeric", month: "short", year: "numeric" })}
                        {a.reason && ` · ${a.reason}`}
                      </p>
                    </div>
                    <span className={cn("text-xs font-medium", s.cls)}>{s.label}</span>
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
