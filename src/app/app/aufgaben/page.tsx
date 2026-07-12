/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { AlertTriangle, CalendarClock, CheckCircle2, Clock, Sparkles } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { buttonVariants } from "@/components/ui/button";
import { AssignmentCard } from "@/components/app/AssignmentCard";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Aufgaben" };

type StatusKey = "alle" | "offen" | "abgegeben" | "bewertet" | "ueberfaellig";

const STATUS_TABS: { key: StatusKey; label: string }[] = [
  { key: "alle", label: "Alle" },
  { key: "offen", label: "Offen" },
  { key: "abgegeben", label: "Abgegeben" },
  { key: "bewertet", label: "Bewertet" },
  { key: "ueberfaellig", label: "Überfällig" },
];

interface PageProps {
  searchParams: Promise<{ status?: string; fach?: string }>;
}

export default async function AufgabenPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login");
  const role = effectiveRole(session);
  if (role !== "student") redirect("/");

  const classId = session.classId;
  if (!classId) {
    return (
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <p className="text-muted-fg">
          Keine Klasse zugewiesen. Bitte wende dich an deinen Admin.
        </p>
      </div>
    );
  }

  const { status: statusParam, fach: fachParam } = await searchParams;
  const activeStatus: StatusKey =
    STATUS_TABS.find((t) => t.key === statusParam?.trim().slice(0, 20))?.key ??
    "alle";
  const activeFach = fachParam?.trim().slice(0, 64) || null;

  const assignments = await prisma.assignment.findMany({
    where: { classId },
    include: {
      subject: { select: { name: true, shortName: true, color: true } },
      teacher: { select: { name: true } },
      submissions: {
        where: { studentId: session.userId },
        select: { status: true, submittedAt: true },
        take: 1,
      },
    },
    orderBy: { dueAt: "asc" },
  });

  type AssignmentRow = (typeof assignments)[number];

  const now = new Date();

  function getStatus(
    a: AssignmentRow
  ): "open" | "submitted" | "graded" | "late" {
    const sub = a.submissions[0];
    if (sub?.status === "graded") return "graded";
    if (sub?.status === "submitted") return "submitted";
    if (!sub && a.dueAt < now) return "late";
    return "open";
  }

  const rows = assignments.map((a) => ({
    ...a,
    computedStatus: getStatus(a),
    submittedAt: a.submissions[0]?.submittedAt ?? null,
  }));

  // Header stats — always over all assignments (unfiltered)
  const counts = {
    open: rows.filter((a) => a.computedStatus === "open").length,
    submitted: rows.filter((a) => a.computedStatus === "submitted").length,
    graded: rows.filter((a) => a.computedStatus === "graded").length,
    late: rows.filter((a) => a.computedStatus === "late").length,
  };

  // Subject filter options (from all assignments of the class)
  const subjects = [
    ...new Map(rows.map((a) => [a.subjectId, a.subject])).entries(),
  ].sort(([, a], [, b]) => a.name.localeCompare(b.name, "de"));

  // Apply filters
  const statusMatch: Record<StatusKey, (s: string) => boolean> = {
    alle: () => true,
    offen: (s) => s === "open",
    abgegeben: (s) => s === "submitted",
    bewertet: (s) => s === "graded",
    ueberfaellig: (s) => s === "late",
  };
  const filtered = rows.filter(
    (a) =>
      statusMatch[activeStatus](a.computedStatus) &&
      (!activeFach || a.subjectId === activeFach)
  );

  // Group by due date
  const endOfWeek = new Date(now);
  const day = endOfWeek.getDay(); // 0 = Sonntag
  endOfWeek.setDate(endOfWeek.getDate() + (day === 0 ? 0 : 7 - day));
  endOfWeek.setHours(23, 59, 59, 999);

  const groups = [
    {
      key: "late",
      title: "Überfällig",
      icon: AlertTriangle,
      accent: "text-danger",
      items: filtered.filter((a) => a.computedStatus === "late"),
    },
    {
      key: "week",
      title: "Diese Woche",
      icon: Clock,
      accent: "text-fg",
      items: filtered.filter(
        (a) => a.computedStatus === "open" && a.dueAt <= endOfWeek
      ),
    },
    {
      key: "later",
      title: "Später",
      icon: CalendarClock,
      accent: "text-fg",
      items: filtered.filter(
        (a) => a.computedStatus === "open" && a.dueAt > endOfWeek
      ),
    },
    {
      key: "done",
      title: "Erledigt",
      icon: CheckCircle2,
      accent: "text-success",
      items: filtered.filter(
        (a) =>
          a.computedStatus === "submitted" || a.computedStatus === "graded"
      ),
    },
  ].filter((g) => g.items.length > 0);

  function buildHref(next: { status?: StatusKey; fach?: string | null }) {
    const params = new URLSearchParams();
    const s = next.status ?? activeStatus;
    const f = next.fach === undefined ? activeFach : next.fach;
    if (s !== "alle") params.set("status", s);
    if (f) params.set("fach", f);
    const qs = params.toString();
    return qs ? `/app/aufgaben?${qs}` : "/app/aufgaben";
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8">
      {/* Page header */}
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">
            Schule · {session.klasse ?? "—"}
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
            Aufgaben
          </h1>
          <p className="mt-1 text-sm text-muted-fg">
            <span className="font-semibold text-fg">{counts.open} offen</span> ·{" "}
            {counts.submitted} abgegeben · {counts.graded} bewertet
            {counts.late > 0 && (
              <>
                {" "}
                ·{" "}
                <span className="font-semibold text-danger">
                  {counts.late} überfällig
                </span>
              </>
            )}
          </p>
        </div>
        <Link
          href="/app/lernplan"
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          <Sparkles className="size-3.5" />
          KI-Lernplan generieren
        </Link>
      </header>

      {/* Status filter pills */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          {STATUS_TABS.map((tab) => (
            <Link
              key={tab.key}
              href={buildHref({ status: tab.key })}
              className={cn(
                "rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors",
                activeStatus === tab.key
                  ? "border-fg bg-fg text-bg"
                  : "border-border text-muted-fg hover:border-fg/30 hover:text-fg"
              )}
            >
              {tab.label}
            </Link>
          ))}
        </div>

        {/* Subject filter pills */}
        {subjects.length > 1 && (
          <div className="flex flex-wrap gap-2">
            <Link
              href={buildHref({ fach: null })}
              className={cn(
                "rounded-full border px-3 py-1 text-[11px] font-semibold transition-colors",
                !activeFach
                  ? "border-fg bg-fg text-bg"
                  : "border-border text-muted-fg hover:border-fg/30 hover:text-fg"
              )}
            >
              Alle Fächer
            </Link>
            {subjects.map(([id, subject]) => (
              <Link
                key={id}
                href={buildHref({ fach: id })}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold transition-colors",
                  activeFach === id
                    ? "border-fg bg-fg text-bg"
                    : "border-border text-muted-fg hover:border-fg/30 hover:text-fg"
                )}
              >
                <span
                  className="size-2 rounded-full"
                  style={{ backgroundColor: subject.color }}
                />
                {subject.name}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="grid place-items-center rounded-2xl border border-border bg-bg p-16 text-center">
          <CheckCircle2 className="size-10 text-success" strokeWidth={1.5} />
          <p className="mt-4 text-base font-semibold">
            {rows.length === 0 ? "Keine Aufgaben" : "Keine passenden Aufgaben"}
          </p>
          <p className="mt-1 max-w-sm text-sm text-muted-fg">
            {rows.length === 0
              ? "Es wurden noch keine Aufgaben für deine Klasse erstellt."
              : "Für die gewählten Filter gibt es keine Aufgaben."}
          </p>
        </div>
      )}

      {/* Due-date sections */}
      {groups.map((group) => (
        <section key={group.key} className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <group.icon className={cn("size-4 shrink-0", group.accent)} />
            <h2 className={cn("text-sm font-bold", group.accent)}>
              {group.title}
            </h2>
            <span className="text-xs text-muted-fg">
              {group.items.length}{" "}
              {group.items.length === 1 ? "Aufgabe" : "Aufgaben"}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {group.items.map((a) => (
              <AssignmentCard
                key={a.id}
                assignment={{
                  id: a.id,
                  title: a.title,
                  description: a.description,
                  type: a.type,
                  dueAt: a.dueAt,
                  maxPoints: a.maxPoints,
                  coverEmoji: a.coverEmoji,
                  subject: a.subject,
                  teacher: a.teacher,
                }}
                status={a.computedStatus}
                submittedAt={a.submittedAt}
                href={`/app/aufgaben/${a.id}`}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
