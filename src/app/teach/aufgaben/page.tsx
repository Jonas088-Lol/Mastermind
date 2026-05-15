import {
  ArrowRight,
  ClipboardList,
  Clock,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";


export const metadata: Metadata = { title: "Aufgaben" };

const TYPE_LABEL: Record<string, string> = {
  homework: "Hausaufgabe",
  test: "Test / KA",
  project: "Projekt",
  exam: "Prüfung",
};

export default async function TeachAufgabenPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "teacher") redirect("/");

  const assignments = await prisma.assignment.findMany({
    where: { teacherId: session.userId },
    include: {
      subject: { select: { name: true, shortName: true, color: true } },
      class: { select: { name: true } },
      submissions: {
        select: { id: true, status: true },
      },
    },
    orderBy: { dueAt: "asc" },
  });

  const now = new Date();

  const rows = assignments.map((a) => {
    const submitted = a.submissions.filter((s) => s.status !== "open").length;
    const total = a.submissions.length;
    const daysLeft = (a.dueAt.getTime() - now.getTime()) / 86_400_000;
    let status: "upcoming" | "due-soon" | "grading" | "done";
    if (daysLeft < 0 && submitted < total) status = "grading";
    else if (daysLeft < 0) status = "done";
    else if (daysLeft <= 2) status = "due-soon";
    else status = "upcoming";
    return { ...a, submitted, total, status, daysLeft };
  });

  const counts = {
    gesamt: rows.length,
    offen: rows.filter((r) => r.status === "upcoming" || r.status === "due-soon").length,
    korrektur: rows.filter((r) => r.status === "grading").length,
    erledigt: rows.filter((r) => r.status === "done").length,
  };

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Lehrerzentrum</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Aufgaben</h1>
          <p className="mt-1 text-sm text-muted-fg">
            <span className="font-semibold text-fg">{counts.offen} aktiv</span> ·{" "}
            {counts.korrektur} in Korrektur · {counts.erledigt} abgeschlossen
          </p>
        </div>
        <Link href="/teach/aufgaben/neu" className="inline-flex items-center gap-1.5 bg-fg px-3 py-2 text-xs font-semibold text-bg transition-opacity hover:opacity-90">
          <Plus className="size-3.5" />
          Neue Aufgabe
        </Link>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Alle Aufgaben</CardTitle>
          <span className="font-mono text-xs text-muted-fg">{rows.length} Aufgaben</span>
        </CardHeader>
        <CardBody className="!px-0 !pb-0">
          {rows.length === 0 ? (
            <div className="grid place-items-center border-t border-border p-12 text-center">
              <ClipboardList className="size-8 text-muted-fg" strokeWidth={1.5} />
              <p className="mt-4 text-base font-semibold">Noch keine Aufgaben</p>
              <p className="mt-1 text-sm text-muted-fg">Erstelle deine erste Aufgabe.</p>
            </div>
          ) : (
            <ul className="divide-y divide-border border-t border-border">
              {rows.map((a) => {
                const pct = a.total > 0 ? Math.round((a.submitted / a.total) * 100) : 0;
                return (
                  <li
                    key={a.id}
                    className="grid grid-cols-1 gap-4 px-5 py-4 transition-colors hover:bg-surface lg:grid-cols-[1fr_auto_auto] lg:items-center lg:gap-6"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className="inline-flex items-center px-1.5 py-0.5 text-[11px] font-semibold"
                          style={{ backgroundColor: a.subject.color + "22", color: a.subject.color }}
                        >
                          {a.class.name}
                        </span>
                        <Badge variant="outline">{TYPE_LABEL[a.type] ?? a.type}</Badge>
                        {a.status === "due-soon" && <Badge variant="warning">Bald fällig</Badge>}
                        {a.status === "grading" && <Badge variant="brand">Korrektur</Badge>}
                        {a.status === "done" && <Badge variant="success">Erledigt</Badge>}
                      </div>
                      <p className="mt-1.5 text-sm font-semibold">{a.title}</p>
                      <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-fg">
                        <Clock className="size-3" />
                        {a.dueAt.toLocaleDateString("de-DE", { day: "numeric", month: "short", year: "numeric" })}
                        <span>·</span>
                        {a.subject.name}
                      </p>
                    </div>

                    <div className="w-32">
                      <div className="flex items-baseline justify-between text-xs">
                        <span className="text-muted-fg">Abgaben</span>
                        <span className="font-mono font-bold">{a.submitted}/{a.total}</span>
                      </div>
                      <Progress
                        value={pct}
                        tone={pct >= 80 ? "success" : pct >= 50 ? "brand" : "warning"}
                        className="mt-1"
                      />
                    </div>

                    <Link
                      href={`/teach/korrektur?assignmentId=${a.id}`}
                      className="flex items-center gap-1 text-xs font-medium text-muted-fg hover:text-brand"
                    >
                      {a.status === "grading" ? "Korrigieren" : "Details"}
                      <ArrowRight className="size-3.5" />
                    </Link>
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
