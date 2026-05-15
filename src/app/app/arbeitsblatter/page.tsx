import { Clock, FileText } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Arbeitsblätter" };

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

export default async function ArbeitsblatterPage() {
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

  const assignments = await prisma.worksheetAssignment.findMany({
    where: { classId },
    include: {
      worksheet: {
        include: {
          subject: { select: { name: true } },
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

  const total = assignments.length;
  const completed = assignments.filter(
    (a) =>
      a.submissions[0]?.status === "submitted" || a.submissions[0]?.status === "graded"
  ).length;
  const open = total - completed;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">
            Schülerbereich
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Arbeitsblätter</h1>
          <p className="mt-1 text-sm text-muted-fg">
            <span className="font-semibold text-fg">{open} offen</span> · {completed} abgegeben ·{" "}
            {total} gesamt
          </p>
        </div>
      </header>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="border border-border bg-bg p-4 text-center">
          <p className="text-2xl font-bold">{total}</p>
          <p className="mt-0.5 text-xs text-muted-fg">Gesamt</p>
        </div>
        <div className="border border-border bg-bg p-4 text-center">
          <p className="text-2xl font-bold text-success">{completed}</p>
          <p className="mt-0.5 text-xs text-muted-fg">Abgegeben</p>
        </div>
        <div className="border border-border bg-bg p-4 text-center">
          <p className="text-2xl font-bold text-brand">{open}</p>
          <p className="mt-0.5 text-xs text-muted-fg">Offen</p>
        </div>
      </div>

      {assignments.length === 0 ? (
        <div className="grid place-items-center border border-border bg-bg p-16 text-center">
          <FileText className="size-10 text-muted-fg" strokeWidth={1.5} />
          <p className="mt-4 text-base font-semibold">Noch keine Arbeitsblätter zugewiesen</p>
          <p className="mt-1 text-sm text-muted-fg">
            Dein Lehrer hat noch kein Arbeitsblatt für deine Klasse freigegeben.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {assignments.map((a) => {
            const sub = a.submissions[0];
            const isDone =
              sub?.status === "submitted" || sub?.status === "graded";
            const { label: dueLabel, overdue } = formatDue(a.dueAt);

            return (
              <Link
                key={a.id}
                href={`/app/arbeitsblatter/${a.id}`}
                className="group flex flex-col border border-border bg-bg transition-colors hover:border-brand/40 hover:bg-surface"
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
                      <Badge variant="success">Abgegeben</Badge>
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
