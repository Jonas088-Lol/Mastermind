import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CheckCircle2, Clock, FileSignature, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession, ROLE_HOME } from "@/lib/session";
import { cn } from "@/lib/utils";
import { reportStudentAbsence } from "./actions";

export const metadata: Metadata = { title: "Fehlzeiten · Schüler" };

const todayStr = () => new Date().toISOString().slice(0, 10);

const STATUS_LABEL: Record<string, { label: string; icon: typeof Clock; cls: string }> = {
  pending:   { label: "Ausstehend",  icon: Clock,         cls: "text-warning" },
  confirmed: { label: "Bestätigt",   icon: CheckCircle2,  cls: "text-success" },
  rejected:  { label: "Abgelehnt",   icon: XCircle,       cls: "text-danger"  },
};

export default async function SchuelerFehlzeitenPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "student") redirect(ROLE_HOME[effectiveRole(session)]);

  const absences = await prisma.absence.findMany({
    where: { studentId: session.userId },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  const today = todayStr();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Fehlzeiten</h1>
        <p className="mt-1 text-sm text-muted-fg">
          Melde dich krank oder trage Fehlzeiten ein — die Schule bestätigt sie.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Neue Abwesenheit melden</CardTitle>
        </CardHeader>
        <CardBody>
          <form action={reportStudentAbsence} className="space-y-5">
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

            <Button type="submit" className="w-full">
              <FileSignature className="size-4" />
              Abwesenheit melden
            </Button>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Meine Fehlzeiten</CardTitle>
          <span className="font-mono text-xs text-muted-fg">{absences.length} Einträge</span>
        </CardHeader>
        <CardBody className="!px-0 !pb-0">
          {absences.length === 0 ? (
            <p className="px-5 py-6 text-sm text-muted-fg">Noch keine Fehlzeiten eingetragen.</p>
          ) : (
            <ul className="divide-y divide-border border-t border-border">
              {absences.map((a) => {
                const s = STATUS_LABEL[a.status] ?? STATUS_LABEL.pending;
                const Icon = s.icon;
                return (
                  <li key={a.id} className="flex items-center gap-4 px-5 py-3.5 text-sm">
                    <Icon className={cn("size-4 shrink-0", s.cls)} strokeWidth={1.75} />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">
                        {a.fromDate.toLocaleDateString("de-DE", { day: "numeric", month: "short" })}
                        {" – "}
                        {a.toDate.toLocaleDateString("de-DE", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                      {a.reason && <p className="text-xs text-muted-fg">{a.reason}</p>}
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
