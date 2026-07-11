import { Clock, FileText } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Arbeitsblätter" };

type StatusKey = "alle" | "offen" | "abgegeben" | "bewertet";

const STATUS_TABS: { key: StatusKey; label: string }[] = [
  { key: "alle", label: "Alle" },
  { key: "offen", label: "Offen" },
  { key: "abgegeben", label: "Abgegeben" },
  { key: "bewertet", label: "Bewertet" },
];

const DIFFICULTY_LABEL: Record<string, string> = {
  leicht: "Leicht",
  mittel: "Mittel",
  schwer: "Schwer",
};

const DIFFICULTY_VARIANT: Record<string, "success" | "warning" | "danger"> = {
  leicht: "success",
  mittel: "warning",
  schwer: "danger",
};

function formatDue(dueAt: Date | null): { label: string; overdue: boolean } {
  if (!dueAt) return { label: "Kein Abgabedatum", overdue: false };
  const now = new Date();
  const overdue = dueAt < now;
  const label = dueAt.toLocaleDateString("de-DE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return { label, overdue };
}

interface PageProps {
  searchParams: Promise<{ status?: string; fach?: string }>;
}

export default async function ArbeitsblatterPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "student") redirect("/");

  const classId = session.classId;
  if (!classId) {
    return (
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">
            Schülerbereich
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Arbeitsblätter</h1>
        </header>
        <p className="text-muted-fg">
          Keine Klasse zugewiesen. Bitte wende dich an deinen Lehrer oder Administrator.
        </p>
      </div>
    );
  }

  const { status: statusParam, fach: fachParam } = await searchParams;
  const activeStatus: StatusKey =
    STATUS_TABS.find((t) => t.key === statusParam?.trim().slice(0, 20))?.key ?? "alle";
  const activeFach = fachParam?.trim().slice(0, 64) || null;

  const assignments = await prisma.worksheetAssignment.findMany({
    where: { classId },
    include: {
      worksheet: {
        include: {
          subject: { select: { name: true, color: true } },
        },
      },
      submissions: {
        where: { studentId: session.userId },
        take: 1,
        orderBy: { startedAt: "desc" },
      },
    },
    orderBy: { dueAt: "asc" },
  });

  type AssignmentRow = (typeof assignments)[number];

  function getStatus(a: AssignmentRow): "open" | "submitted" | "graded" {
    const status = a.submissions[0]?.status;
    if (status === "graded") return "graded";
    if (status === "submitted") return "submitted";
    return "open";
  }

  const rows = assignments.map((a) => ({ ...a, computedStatus: getStatus(a) }));

  // Header stats — always over all assignments (unfiltered)
  const openCount = rows.filter((a) => a.computedStatus === "open").length;
  const submittedCount = rows.filter((a) => a.computedStatus === "submitted").length;
  const gradedCount = rows.filter((a) => a.computedStatus === "graded").length;
  const doneCount = submittedCount + gradedCount;

  // Subject filter options (worksheets without subject are ignored here)
  const subjects = [
    ...new Map(
      rows
        .filter((a) => a.worksheet.subjectId && a.worksheet.subject)
        .map((a) => [a.worksheet.subjectId as string, a.worksheet.subject!])
    ).entries(),
  ].sort(([, a], [, b]) => a.name.localeCompare(b.name, "de"));

  // Apply filters
  const statusMatch: Record<StatusKey, (s: string) => boolean> = {
    alle: () => true,
    offen: (s) => s === "open",
    abgegeben: (s) => s === "submitted",
    bewertet: (s) => s === "graded",
  };
  const filtered = rows.filter(
    (a) =>
      statusMatch[activeStatus](a.computedStatus) &&
      (!activeFach || a.worksheet.subjectId === activeFach)
  );

  function buildHref(next: { status?: StatusKey; fach?: string | null }) {
    const params = new URLSearchParams();
    const s = next.status ?? activeStatus;
    const f = next.fach === undefined ? activeFach : next.fach;
    if (s !== "alle") params.set("status", s);
    if (f) params.set("fach", f);
    const qs = params.toString();
    return qs ? `/app/arbeitsblatter?${qs}` : "/app/arbeitsblatter";
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">
            Schülerbereich
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Arbeitsblätter</h1>
          <p className="mt-1 text-sm text-muted-fg">
            <span className="font-semibold text-fg">{openCount} offen</span> · {doneCount}{" "}
            erledigt
            {gradedCount > 0 && <> · {gradedCount} bewertet</>}
          </p>
        </div>
      </header>

      {/* Filters */}
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

      {filtered.length === 0 ? (
        <div className="grid place-items-center rounded-2xl border border-border bg-bg p-16 text-center">
          <FileText className="size-10 text-muted-fg" strokeWidth={1.5} />
          <p className="mt-4 text-base font-semibold">
            {rows.length === 0
              ? "Noch keine Arbeitsblätter zugewiesen"
              : "Keine passenden Arbeitsblätter"}
          </p>
          <p className="mt-1 max-w-sm text-sm text-muted-fg">
            {rows.length === 0
              ? "Dein Lehrer hat noch kein Arbeitsblatt für deine Klasse freigegeben."
              : "Für die gewählten Filter gibt es keine Arbeitsblätter."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((a) => {
            const sub = a.submissions[0];
            const isDone = a.computedStatus !== "open";
            const { label: dueLabel, overdue } = formatDue(a.dueAt);

            return (
              <Link
                key={a.id}
                href={`/app/arbeitsblatter/${a.id}`}
                className="group flex flex-col rounded-2xl border border-border bg-bg transition-colors hover:border-brand/40 hover:bg-surface"
              >
                <div className="flex flex-1 flex-col gap-3 p-4">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {a.worksheet.subject && (
                      <Badge variant="outline">{a.worksheet.subject.name}</Badge>
                    )}
                    <Badge
                      variant={DIFFICULTY_VARIANT[a.worksheet.difficulty] ?? "neutral"}
                    >
                      {DIFFICULTY_LABEL[a.worksheet.difficulty] ?? a.worksheet.difficulty}
                    </Badge>
                    {!isDone && a.dueAt && (
                      <Badge variant={overdue ? "danger" : "neutral"}>
                        {overdue ? "Überfällig" : `Fällig ${dueLabel}`}
                      </Badge>
                    )}
                  </div>

                  <p className="text-sm font-semibold leading-snug group-hover:text-brand">
                    {a.worksheet.title}
                  </p>

                  <div className="mt-auto flex items-center justify-between gap-2">
                    <p
                      className={`flex items-center gap-1 text-xs ${
                        overdue && !isDone ? "font-semibold text-danger" : "text-muted-fg"
                      }`}
                    >
                      <Clock className="size-3 shrink-0" />
                      {dueLabel}
                    </p>
                    {a.worksheet.estimatedMinutes > 0 && (
                      <span className="text-xs text-muted-fg">
                        ~{a.worksheet.estimatedMinutes} Min.
                      </span>
                    )}
                  </div>
                </div>

                <div className="border-t border-border px-4 py-2.5">
                  {isDone ? (
                    <div className="flex items-center justify-between">
                      <Badge variant="success">
                        {a.computedStatus === "graded" ? "Bewertet" : "Abgegeben"}
                      </Badge>
                      {sub?.score !== null && sub?.maxScore !== null && sub?.score !== undefined && sub?.maxScore !== undefined && (
                        <span className="font-mono text-xs text-muted-fg">
                          {sub.score}/{sub.maxScore} Pkt.
                        </span>
                      )}
                    </div>
                  ) : (
                    <Badge variant="brand">Offen</Badge>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
