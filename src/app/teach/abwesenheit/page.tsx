import {
  Calendar,
  CheckCircle2,
  Clock,
  Users,
  XCircle,
} from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { confirmAbsence, rejectAbsence } from "./actions";

export const metadata: Metadata = { title: "Abwesenheiten" };

export default async function AbwesenheitPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "teacher") redirect("/");

  const absences = await prisma.absence.findMany({
    where: { schoolId: session.schoolId ?? undefined },
    include: {
      student: { select: { name: true, klasse: true } },
      reporter: { select: { name: true } },
      confirmedBy: { select: { name: true } },
    },
    orderBy: [{ status: "asc" }, { fromDate: "desc" }],
  });

  const pending = absences.filter((a) => a.status === "pending");
  const confirmed = absences.filter((a) => a.status === "confirmed");
  const rejected = absences.filter((a) => a.status === "rejected");

  function formatRange(from: Date, to: Date) {
    const fmt = (d: Date) => d.toLocaleDateString("de-DE", { day: "numeric", month: "short" });
    return from.toDateString() === to.toDateString()
      ? fmt(from)
      : `${fmt(from)} – ${fmt(to)}`;
  }

  function dayCount(from: Date, to: Date) {
    return Math.ceil((to.getTime() - from.getTime()) / 86_400_000) + 1;
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">
          Lehrer-Cockpit
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Abwesenheiten</h1>
        <p className="mt-1 text-sm text-muted-fg">
          {pending.length} ausstehend · {confirmed.length} bestätigt · {rejected.length} abgelehnt
        </p>
      </header>

      <section className="grid grid-cols-3 gap-px border border-border bg-border">
        <div className="bg-bg p-5">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">Ausstehend</p>
            <Clock className="size-4 text-warning" strokeWidth={1.75} />
          </div>
          <p className="mt-3 font-mono text-3xl font-bold tracking-tight">{pending.length}</p>
        </div>
        <div className="bg-bg p-5">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">Bestätigt</p>
            <CheckCircle2 className="size-4 text-success" strokeWidth={1.75} />
          </div>
          <p className="mt-3 font-mono text-3xl font-bold tracking-tight">{confirmed.length}</p>
        </div>
        <div className="bg-bg p-5">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">Abgelehnt</p>
            <XCircle className="size-4 text-danger" strokeWidth={1.75} />
          </div>
          <p className="mt-3 font-mono text-3xl font-bold tracking-tight">{rejected.length}</p>
        </div>
      </section>

      {pending.length > 0 && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Ausstehend</CardTitle>
              <p className="mt-1 text-sm text-muted-fg">{pending.length} warten auf Bestätigung</p>
            </div>
            <Badge variant="warning">{pending.length} offen</Badge>
          </CardHeader>
          <CardBody className="!px-0 !pb-0">
            <ul className="divide-y divide-border border-t border-border">
              {pending.map((a) => (
                <li key={a.id} className="flex items-start gap-4 px-5 py-4">
                  <div className="grid size-9 shrink-0 place-items-center bg-surface">
                    <Calendar className="size-4 text-muted-fg" strokeWidth={1.75} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold">{a.student.name}</p>
                      {a.student.klasse && (
                        <span className="text-xs text-muted-fg">Klasse {a.student.klasse}</span>
                      )}
                    </div>
                    <p className="mt-0.5 text-sm">
                      {formatRange(a.fromDate, a.toDate)}
                      <span className="ml-1.5 text-xs text-muted-fg">
                        ({dayCount(a.fromDate, a.toDate)} Tag{dayCount(a.fromDate, a.toDate) !== 1 ? "e" : ""})
                      </span>
                    </p>
                    {a.reason && (
                      <p className="mt-0.5 text-xs text-muted-fg">Grund: {a.reason}</p>
                    )}
                    <p className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-fg">
                      Gemeldet von {a.reporter.name} · {a.createdAt.toLocaleDateString("de-DE", { day: "numeric", month: "short" })}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <form action={confirmAbsence.bind(null, a.id)}>
                      <Button type="submit" size="sm" variant="secondary">
                        <CheckCircle2 className="size-3.5 text-success" />
                        Bestätigen
                      </Button>
                    </form>
                    <form action={rejectAbsence.bind(null, a.id)}>
                      <Button type="submit" size="sm" variant="ghost">
                        <XCircle className="size-3.5 text-danger" />
                        Ablehnen
                      </Button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}

      {(confirmed.length > 0 || rejected.length > 0) && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Bearbeitet</CardTitle>
              <p className="mt-1 text-sm text-muted-fg">Bestätigte und abgelehnte Abwesenheiten</p>
            </div>
          </CardHeader>
          <CardBody className="!px-0 !pb-0">
            {absences.length === 0 ? (
              <p className="px-5 py-4 text-sm text-muted-fg">Noch keine Abwesenheiten gemeldet.</p>
            ) : (
              <ul className="divide-y divide-border border-t border-border">
                {[...confirmed, ...rejected].map((a) => (
                  <li key={a.id} className="flex items-start gap-4 px-5 py-3.5">
                    <div className={cn(
                      "grid size-9 shrink-0 place-items-center bg-surface",
                    )}>
                      {a.status === "confirmed"
                        ? <CheckCircle2 className="size-4 text-success" strokeWidth={1.75} />
                        : <XCircle className="size-4 text-danger" strokeWidth={1.75} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold">{a.student.name}</p>
                        {a.student.klasse && (
                          <span className="text-xs text-muted-fg">Klasse {a.student.klasse}</span>
                        )}
                        <Badge variant={a.status === "confirmed" ? "success" : "danger"} className="ml-auto">
                          {a.status === "confirmed" ? "Bestätigt" : "Abgelehnt"}
                        </Badge>
                      </div>
                      <p className="mt-0.5 text-sm text-muted-fg">
                        {formatRange(a.fromDate, a.toDate)}
                      </p>
                      {a.reason && (
                        <p className="mt-0.5 text-xs text-muted-fg">Grund: {a.reason}</p>
                      )}
                      {a.confirmedBy && (
                        <p className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-fg">
                          {a.status === "confirmed" ? "Bestätigt" : "Abgelehnt"} von {a.confirmedBy.name}
                          {a.confirmedAt && ` · ${a.confirmedAt.toLocaleDateString("de-DE", { day: "numeric", month: "short" })}`}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      )}

      {absences.length === 0 && (
        <Card>
          <CardBody>
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <Users className="size-8 text-muted-fg" strokeWidth={1.5} />
              <p className="text-sm text-muted-fg">Noch keine Abwesenheiten gemeldet.</p>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
