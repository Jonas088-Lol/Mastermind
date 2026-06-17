import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Filter,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Aufgaben" };

interface PageProps {
  searchParams: Promise<{ status?: string }>;
}

const TYPE_LABEL: Record<string, string> = {
  homework: "Hausaufgabe",
  test: "Test / KA",
  project: "Projekt",
  exam: "Prüfung",
};

const STATUS_LABEL: Record<string, string> = {
  open: "Offen",
  submitted: "Abgegeben",
  graded: "Bewertet",
  late: "Verspätet",
};

function formatDue(dueAt: Date): string {
  const now = new Date();
  const diff = Math.floor((dueAt.getTime() - now.getTime()) / 86_400_000);
  const dateStr = dueAt.toLocaleDateString("de-DE", { day: "numeric", month: "short" });
  if (diff < 0) return `überfällig · ${dateStr}`;
  if (diff === 0) return `Heute · ${dateStr}`;
  if (diff === 1) return `Morgen · ${dateStr}`;
  if (diff <= 7) return `in ${diff} Tagen · ${dateStr}`;
  return dateStr;
}

export default async function AufgabenPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login");
  const role = effectiveRole(session);
  if (role !== "student") redirect("/");

  const { status } = await searchParams;
  const filter = (status ?? "alle") as "alle" | "offen" | "erledigt" | "spät";

  const classId = session.classId;
  if (!classId) {
    return (
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <p className="text-muted-fg">Kein Klasse zugewiesen. Bitte wende dich an deinen Admin.</p>
      </div>
    );
  }

  const assignments = await prisma.assignment.findMany({
    where: { classId },
    include: {
      subject: { select: { name: true, shortName: true, color: true } },
      teacher: { select: { name: true } },
      submissions: {
        where: { studentId: session.userId },
        take: 1,
      },
    },
    orderBy: { dueAt: "asc" },
  });

  type AssignmentRow = (typeof assignments)[number];

  function getStatus(a: AssignmentRow): "open" | "due-soon" | "submitted" | "graded" | "late" {
    const sub = a.submissions[0];
    if (sub?.status === "graded") return "graded";
    if (sub?.status === "submitted") return "submitted";
    const now = new Date();
    const diff = (a.dueAt.getTime() - now.getTime()) / 86_400_000;
    if (!sub && diff < 0) return "late";
    if (diff <= 1) return "due-soon";
    return "open";
  }

  const rows = assignments.map((a) => ({ ...a, computedStatus: getStatus(a) }));

  const filtered = rows.filter((a) => {
    if (filter === "offen") return a.computedStatus === "open" || a.computedStatus === "due-soon";
    if (filter === "erledigt") return a.computedStatus === "submitted" || a.computedStatus === "graded";
    if (filter === "spät") return a.computedStatus === "late";
    return true;
  });

  const counts = {
    alle: rows.length,
    offen: rows.filter((a) => a.computedStatus === "open" || a.computedStatus === "due-soon").length,
    erledigt: rows.filter((a) => a.computedStatus === "submitted" || a.computedStatus === "graded").length,
    spät: rows.filter((a) => a.computedStatus === "late").length,
  };

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">
            Schule · {session.klasse ?? "—"}
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Aufgaben</h1>
          <p className="mt-1 text-sm text-muted-fg">
            <span className="font-semibold text-fg">{counts.offen} offen</span> ·{" "}
            {counts.erledigt} erledigt · {counts.spät} verspätet
          </p>
        </div>
        <Link href="/app/lernplan" className={buttonVariants({ variant: "outline", size: "sm" })}>
          <Sparkles className="size-3.5" />
          KI-Lernplan generieren
        </Link>
      </header>

      <section className="flex flex-col gap-3 rounded-2xl border border-border bg-bg p-4 sm:flex-row sm:items-center sm:gap-6">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-fg">
          <Filter className="size-3.5" />
          Filter
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <FilterChip href="/app/aufgaben" active={filter === "alle"}>
            Alle ({counts.alle})
          </FilterChip>
          <FilterChip href="/app/aufgaben?status=offen" active={filter === "offen"}>
            Offen ({counts.offen})
          </FilterChip>
          <FilterChip href="/app/aufgaben?status=erledigt" active={filter === "erledigt"}>
            Erledigt ({counts.erledigt})
          </FilterChip>
          <FilterChip href="/app/aufgaben?status=sp%C3%A4t" active={filter === "spät"}>
            Verspätet ({counts.spät})
          </FilterChip>
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>{filterLabel(filter)}</CardTitle>
          <span className="font-mono text-xs text-muted-fg">{filtered.length} Aufgaben</span>
        </CardHeader>
        <CardBody className="px-0! pb-0!">
          {filtered.length === 0 ? (
            <div className="grid place-items-center border-t border-border p-12 text-center">
              <CheckCircle2 className="size-8 text-success" strokeWidth={1.5} />
              <p className="mt-4 text-base font-semibold">Nichts in dieser Sicht</p>
              <p className="mt-1 max-w-sm text-sm text-muted-fg">
                Wechsle zu einem anderen Filter oder hol dir einen KI-Lernplan.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border border-t border-border">
              {filtered.map((a) => {
                const st = a.computedStatus;
                const isDone = st === "submitted" || st === "graded";
                return (
                  <li
                    key={a.id}
                    className={cn(
                      "grid grid-cols-1 gap-3 px-5 py-4 transition-colors hover:bg-surface lg:grid-cols-[1fr_auto_auto] lg:items-center lg:gap-4",
                      st === "late" && "bg-danger/4"
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-semibold"
                          style={{ backgroundColor: a.subject.color + "22", color: a.subject.color }}
                        >
                          {a.subject.shortName}
                        </span>
                        <Badge variant="outline">{TYPE_LABEL[a.type] ?? a.type}</Badge>
                        {st === "late" && <Badge variant="danger">Verspätet</Badge>}
                        {st === "graded" && <Badge variant="success">Bewertet</Badge>}
                        {st === "submitted" && <Badge variant="info">Abgegeben</Badge>}
                      </div>
                      <p className={cn("mt-1.5 text-sm font-semibold", isDone && "text-muted-fg line-through")}>
                        {a.title}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-fg">
                        <CalendarClock className="size-3" />
                        {formatDue(a.dueAt)}
                        <span>·</span>
                        <span>{a.teacher.name}</span>
                      </p>
                    </div>

                    <span className="hidden font-mono text-[10px] uppercase tracking-wider text-muted-fg lg:block">
                      {STATUS_LABEL[st] ?? st}
                    </span>

                    {!isDone && st !== "late" && (
                      <Link
                        href={`/app/aufgaben/${a.id}`}
                        className={buttonVariants({ size: "sm", variant: st === "due-soon" ? "primary" : "secondary" })}
                      >
                        Starten
                        <ArrowRight className="size-3.5" />
                      </Link>
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

function filterLabel(filter: string) {
  if (filter === "offen") return "Offene Aufgaben";
  if (filter === "erledigt") return "Erledigte Aufgaben";
  if (filter === "spät") return "Verspätete Aufgaben";
  return "Alle Aufgaben";
}

function FilterChip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-pressed={active}
      className={cn(
        "px-2.5 py-1 text-xs font-medium transition-colors",
        active
          ? "rounded-xl bg-fg text-bg"
          : "rounded-xl border border-border bg-bg text-muted-fg hover:border-fg/30 hover:text-fg"
      )}
    >
      {children}
    </Link>
  );
}
