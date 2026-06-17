import { BookOpen, CheckCircle2, Sparkles } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { buttonVariants } from "@/components/ui/button";
import { AssignmentCard } from "@/components/app/AssignmentCard";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Aufgaben" };

export default async function AufgabenPage() {
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

  function getStatus(
    a: AssignmentRow
  ): "open" | "submitted" | "graded" | "late" {
    const sub = a.submissions[0];
    if (sub?.status === "graded") return "graded";
    if (sub?.status === "submitted") return "submitted";
    const isLate = !sub && a.dueAt < new Date();
    if (isLate) return "late";
    return "open";
  }

  // Compute status for each assignment
  const rows = assignments.map((a) => ({
    ...a,
    computedStatus: getStatus(a),
    submittedAt: a.submissions[0]?.submittedAt ?? null,
  }));

  // Stats
  const counts = {
    open: rows.filter((a) => a.computedStatus === "open").length,
    submitted: rows.filter((a) => a.computedStatus === "submitted").length,
    graded: rows.filter((a) => a.computedStatus === "graded").length,
    late: rows.filter((a) => a.computedStatus === "late").length,
  };

  // Group by subject — keep insertion order (already ordered by dueAt)
  const bySubject = new Map<
    string,
    {
      subject: { name: string; shortName: string; color: string };
      assignments: typeof rows;
    }
  >();

  for (const a of rows) {
    if (!bySubject.has(a.subjectId)) {
      bySubject.set(a.subjectId, { subject: a.subject, assignments: [] });
    }
    bySubject.get(a.subjectId)!.assignments.push(a);
  }

  // Sort subjects: those with open/late assignments first, then the rest
  const sortedSubjects = [...bySubject.entries()].sort(([, a], [, b]) => {
    const hasUrgentA = a.assignments.some(
      (x) => x.computedStatus === "open" || x.computedStatus === "late"
    );
    const hasUrgentB = b.assignments.some(
      (x) => x.computedStatus === "open" || x.computedStatus === "late"
    );
    if (hasUrgentA && !hasUrgentB) return -1;
    if (!hasUrgentA && hasUrgentB) return 1;
    return 0;
  });

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-10">
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
            <span className="font-semibold text-fg">{counts.open} offen</span>{" "}
            ·{" "}
            <span
              className={
                counts.late > 0 ? "font-semibold text-danger" : undefined
              }
            >
              {counts.late} verspätet
            </span>{" "}
            · {counts.submitted} abgegeben · {counts.graded} bewertet
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

      {/* Empty state */}
      {rows.length === 0 && (
        <div className="grid place-items-center rounded-2xl border border-border bg-bg p-16 text-center">
          <CheckCircle2 className="size-10 text-success" strokeWidth={1.5} />
          <p className="mt-4 text-base font-semibold">Keine Aufgaben</p>
          <p className="mt-1 max-w-sm text-sm text-muted-fg">
            Es wurden noch keine Aufgaben für deine Klasse erstellt.
          </p>
        </div>
      )}

      {/* Subject sections */}
      {sortedSubjects.map(([subjectId, { subject, assignments: subAssignments }]) => (
        <section key={subjectId} className="flex flex-col gap-4">
          {/* Subject header bar */}
          <div
            className="flex items-center gap-3 rounded-xl px-4 py-3"
            style={{ backgroundColor: subject.color + "18" }}
          >
            <span
              className="grid size-8 shrink-0 place-items-center rounded-lg text-sm font-bold text-white"
              style={{ backgroundColor: subject.color }}
            >
              {subject.shortName.slice(0, 2)}
            </span>
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-bold" style={{ color: subject.color }}>
                {subject.name}
              </h2>
              <p className="text-[11px] text-muted-fg">
                {subAssignments.length}{" "}
                {subAssignments.length === 1 ? "Aufgabe" : "Aufgaben"}
                {subAssignments.filter((a) => a.computedStatus === "open").length > 0 && (
                  <>
                    {" "}
                    ·{" "}
                    <span className="text-amber-600 font-semibold">
                      {subAssignments.filter((a) => a.computedStatus === "open").length} offen
                    </span>
                  </>
                )}
                {subAssignments.filter((a) => a.computedStatus === "late").length > 0 && (
                  <>
                    {" "}
                    ·{" "}
                    <span className="text-danger font-semibold">
                      {subAssignments.filter((a) => a.computedStatus === "late").length} verspätet
                    </span>
                  </>
                )}
              </p>
            </div>
            <BookOpen className="size-4 shrink-0 text-muted-fg" />
          </div>

          {/* Assignment grid */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {subAssignments.map((a) => (
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
