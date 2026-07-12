/* Copyright 2026 Elian Schock, Jonas Schwenk */
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AlertTriangle, Calendar, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody } from "@/components/ui/card";
import { prisma } from "@/lib/db/client";
import { ROLE_HOME, effectiveRole, getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Aufgaben · Eltern" };

// Bucket helpers
function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}
function nextMonday(d: Date): Date {
  const day = d.getDay(); // 0=Sun
  const diff = day === 0 ? 1 : 8 - day;
  return addDays(startOfDay(d), diff);
}

type Bucket = "overdue" | "thisWeek" | "nextWeek" | "later";

function getBucket(dueAt: Date, now: Date): Bucket {
  const today = startOfDay(now);
  const sunday = addDays(nextMonday(today), -1); // end of current week (Sun)
  const endNextWeek = addDays(nextMonday(today), 6); // end of next week (Sun)

  if (dueAt < today) return "overdue";
  if (dueAt <= sunday) return "thisWeek";
  if (dueAt <= endNextWeek) return "nextWeek";
  return "later";
}

const BUCKET_LABELS: Record<Bucket, string> = {
  overdue: "Überfällig",
  thisWeek: "Diese Woche",
  nextWeek: "Nächste Woche",
  later: "Später",
};

const BUCKET_ICON: Record<Bucket, typeof AlertTriangle> = {
  overdue: AlertTriangle,
  thisWeek: Clock,
  nextWeek: Calendar,
  later: Calendar,
};

export default async function ElternAufgabenPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "parent") redirect(ROLE_HOME[effectiveRole(session)]);

  const now = new Date();

  const links = await prisma.parentStudentLink.findMany({
    where: { parentId: session.userId },
    include: { student: { select: { id: true, name: true } } },
    orderBy: { student: { name: "asc" } },
  });

  const childIds = links.map((l) => l.student.id);

  const assignments =
    childIds.length === 0
      ? []
      : await prisma.assignment.findMany({
          where: {
            class: { students: { some: { id: { in: childIds } } } },
            dueAt: { gte: new Date(now.getTime() - 14 * 86_400_000) },
          },
          include: {
            subject: { select: { name: true, color: true, shortName: true } },
            class: { select: { name: true } },
            submissions: {
              where: { studentId: { in: childIds } },
              select: { studentId: true, status: true },
            },
          },
          orderBy: { dueAt: "asc" },
        });

  // Group into buckets
  const buckets: Record<Bucket, typeof assignments> = {
    overdue: [],
    thisWeek: [],
    nextWeek: [],
    later: [],
  };
  for (const a of assignments) {
    buckets[getBucket(a.dueAt, now)].push(a);
  }

  const overdueCount = buckets.overdue.length;
  const totalCount = assignments.length;

  const BUCKET_ORDER: Bucket[] = ["overdue", "thisWeek", "nextWeek", "later"];

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">
            Schuljahr 2025/26
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Aufgaben</h1>
          <p className="mt-1 text-sm text-muted-fg">
            Hausaufgaben und Abgaben{links.length > 0 ? " für " + links.map((l) => l.student.name).join(" & ") : ""}.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {overdueCount > 0 && (
            <Badge variant="danger">
              <AlertTriangle className="size-3" />
              {overdueCount} überfällig
            </Badge>
          )}
          <span className="text-xs text-muted-fg">{totalCount} Aufgaben insgesamt</span>
        </div>
      </header>

      {childIds.length === 0 && (
        <p className="text-sm text-muted-fg">Kein Kind mit deinem Konto verknüpft.</p>
      )}

      {childIds.length > 0 && assignments.length === 0 && (
        <Card>
          <CardBody>
            <p className="py-4 text-center text-sm text-muted-fg">
              Keine aktuellen Aufgaben in den letzten 14 Tagen oder zukünftig.
            </p>
          </CardBody>
        </Card>
      )}

      {BUCKET_ORDER.map((bucket) => {
        const list = buckets[bucket];
        if (list.length === 0) return null;

        const Icon = BUCKET_ICON[bucket];
        const isOverdue = bucket === "overdue";

        return (
          <section key={bucket} className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Icon
                className={["size-4", isOverdue ? "text-danger" : "text-muted-fg"].join(" ")}
                strokeWidth={1.75}
              />
              <h2
                className={[
                  "text-sm font-semibold uppercase tracking-wider",
                  isOverdue ? "text-danger" : "text-muted-fg",
                ].join(" ")}
              >
                {BUCKET_LABELS[bucket]}
              </h2>
              <span
                className={[
                  "ml-1 inline-flex items-center rounded-full px-2 py-0.5 font-mono text-xs font-bold",
                  isOverdue
                    ? "bg-danger/10 text-danger"
                    : "bg-muted text-muted-fg",
                ].join(" ")}
              >
                {list.length}
              </span>
            </div>

            <Card>
              <CardBody className="px-0! pb-0!">
                <ul className="divide-y divide-border">
                  {list.map((a) => {
                    const dueDate = a.dueAt.toLocaleDateString("de-DE", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                    });
                    const daysLeft = Math.floor(
                      (a.dueAt.getTime() - now.getTime()) / 86_400_000,
                    );

                    return (
                      <li
                        key={a.id}
                        className={[
                          "flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start",
                          isOverdue ? "border-l-4 border-l-danger" : "",
                        ].join(" ")}
                      >
                        {/* Subject dot + title */}
                        <div className="flex min-w-0 flex-1 flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span
                              className="inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-[11px] font-semibold"
                              style={{
                                backgroundColor: a.subject.color + "22",
                                color: a.subject.color,
                              }}
                            >
                              {a.subject.shortName}
                            </span>
                            <p className="truncate font-semibold text-sm">{a.title}</p>
                          </div>
                          <p className="flex items-center gap-1.5 text-xs text-muted-fg">
                            <span>{a.subject.name}</span>
                            <span>·</span>
                            <span>Klasse {a.class.name}</span>
                            <span>·</span>
                            <Clock className="size-3 shrink-0" />
                            <span>{dueDate}</span>
                            {!isOverdue && daysLeft === 0 && (
                              <Badge variant="warning">Heute</Badge>
                            )}
                          </p>
                        </div>

                        {/* Per-child submission status */}
                        <div className="flex flex-wrap gap-2 sm:justify-end">
                          {links.map(({ student }) => {
                            const sub = a.submissions.find(
                              (s) => s.studentId === student.id,
                            );

                            let variant: "success" | "warning" | "danger" | "outline" =
                              "outline";
                            let label = "Ausstehend";

                            if (sub) {
                              if (
                                sub.status === "graded" ||
                                sub.status === "submitted"
                              ) {
                                variant = "success";
                                label =
                                  sub.status === "graded" ? "Bewertet" : "Abgegeben";
                              } else if (sub.status === "late") {
                                variant = "warning";
                                label = "Verspätet";
                              } else {
                                variant = isOverdue ? "danger" : "warning";
                                label = isOverdue ? "Überfällig" : "Ausstehend";
                              }
                            } else if (isOverdue) {
                              variant = "danger";
                              label = "Überfällig";
                            }

                            return (
                              <div key={student.id} className="flex flex-col items-end gap-0.5">
                                <span className="text-[10px] text-muted-fg">
                                  {links.length > 1 ? student.name : ""}
                                </span>
                                <Badge variant={variant}>{label}</Badge>
                              </div>
                            );
                          })}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </CardBody>
            </Card>
          </section>
        );
      })}
    </div>
  );
}
