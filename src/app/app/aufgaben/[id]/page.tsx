import { ArrowLeft, CalendarClock, User } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { submitAssignment } from "./actions";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const assignment = await prisma.assignment.findUnique({
    where: { id },
    select: { title: true },
  });
  return { title: assignment?.title ?? "Aufgabe" };
}

const TYPE_LABEL: Record<string, string> = {
  homework: "Hausaufgabe",
  test: "Test / KA",
  project: "Projekt",
  exam: "Prüfung",
};

function formatDue(dueAt: Date): string {
  const now = new Date("2026-05-05");
  const diff = Math.floor((dueAt.getTime() - now.getTime()) / 86_400_000);
  const dateStr = dueAt.toLocaleDateString("de-DE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  if (diff < 0) return `Überfällig · ${dateStr}`;
  if (diff === 0) return `Heute fällig · ${dateStr}`;
  if (diff === 1) return `Morgen fällig · ${dateStr}`;
  if (diff <= 7) return `Fällig in ${diff} Tagen · ${dateStr}`;
  return `Fällig am ${dateStr}`;
}

function gradeLabel(value: number): string {
  return value.toFixed(1).replace(".", ",");
}

export default async function AufgabeDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect("/login");
  const role = effectiveRole(session);
  if (role !== "student") redirect("/");

  const classId = session.classId;
  if (!classId) redirect("/app/aufgaben");

  const assignment = await prisma.assignment.findUnique({
    where: { id },
    include: {
      subject: { select: { name: true, shortName: true, color: true } },
      teacher: { select: { name: true } },
      class: { select: { id: true } },
    },
  });

  // Redirect if not found or not in student's class
  if (!assignment || assignment.classId !== classId) {
    redirect("/app/aufgaben");
  }

  const submission = await prisma.submission.findUnique({
    where: {
      assignmentId_studentId: { assignmentId: id, studentId: session.userId },
    },
    include: { grade: true },
  });

  const isGraded = submission?.status === "graded" && submission.grade != null;
  const isSubmitted = submission?.status === "submitted" || isGraded;
  const isReadOnly = isSubmitted || isGraded;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      {/* Back link */}
      <div>
        <Link
          href="/app/aufgaben"
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-ml-2")}
        >
          <ArrowLeft className="size-3.5" />
          Zurück zu Aufgaben
        </Link>
      </div>

      {/* Assignment header */}
      <header className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="inline-flex items-center px-1.5 py-0.5 text-[11px] font-semibold"
            style={{
              backgroundColor: assignment.subject.color + "22",
              color: assignment.subject.color,
            }}
          >
            {assignment.subject.shortName}
          </span>
          <Badge variant="outline">{TYPE_LABEL[assignment.type] ?? assignment.type}</Badge>
          {isGraded && <Badge variant="success">Bewertet</Badge>}
          {submission?.status === "submitted" && !isGraded && (
            <Badge variant="info">Abgegeben</Badge>
          )}
          {submission?.status === "late" && <Badge variant="danger">Verspätet</Badge>}
        </div>

        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{assignment.title}</h1>

        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-fg">
          <span className="flex items-center gap-1.5">
            <User className="size-3.5" />
            {assignment.teacher.name}
          </span>
          <span className="flex items-center gap-1.5">
            <CalendarClock className="size-3.5" />
            {formatDue(assignment.dueAt)}
          </span>
          {assignment.maxPoints != null && (
            <span className="font-mono text-xs">
              max. {assignment.maxPoints} Punkte
            </span>
          )}
        </div>

        {assignment.description && (
          <p className="border-l-2 border-border pl-4 text-sm leading-relaxed text-muted-fg">
            {assignment.description}
          </p>
        )}
      </header>

      {/* Grade card — shown when graded */}
      {isGraded && submission?.grade && (
        <Card>
          <CardHeader>
            <CardTitle>Bewertung</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="flex items-center gap-6">
              <div className="flex flex-col items-center gap-1">
                <span className="font-mono text-5xl font-bold text-fg">
                  {gradeLabel(submission.grade.value)}
                </span>
                <span className="text-xs uppercase tracking-wider text-muted-fg">Note</span>
              </div>
              {submission.grade.comment && (
                <p className="flex-1 border-l border-border pl-6 text-sm leading-relaxed text-muted-fg">
                  {submission.grade.comment}
                </p>
              )}
            </div>
            <p className="mt-4 font-mono text-[10px] uppercase tracking-wider text-muted-fg">
              Bewertet am{" "}
              {submission.grade.date.toLocaleDateString("de-DE", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
          </CardBody>
        </Card>
      )}

      {/* Submission form */}
      <Card>
        <CardHeader>
          <CardTitle>Abgabe</CardTitle>
          {submission?.submittedAt && (
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-fg">
              Abgegeben am{" "}
              {submission.submittedAt.toLocaleDateString("de-DE", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
              {" · "}
              {submission.submittedAt.toLocaleTimeString("de-DE", {
                hour: "2-digit",
                minute: "2-digit",
              })}{" "}
              Uhr
            </span>
          )}
        </CardHeader>
        <CardBody>
          <form action={submitAssignment} className="flex flex-col gap-4">
            <input type="hidden" name="assignmentId" value={id} />
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="content"
                className="text-xs font-semibold uppercase tracking-wider text-muted-fg"
              >
                Deine Antwort
              </label>
              <textarea
                id="content"
                name="content"
                rows={8}
                disabled={isReadOnly}
                defaultValue={submission?.content ?? ""}
                placeholder={
                  isReadOnly
                    ? "Bereits abgegeben."
                    : "Schreibe deine Antwort hier…"
                }
                className={cn(
                  "resize-y border border-border bg-surface px-3 py-2 text-sm leading-relaxed placeholder:text-muted-fg focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand",
                  isReadOnly && "cursor-not-allowed opacity-60"
                )}
              />
            </div>

            {!isReadOnly && (
              <div className="flex justify-end">
                <Button type="submit" variant="primary" size="md">
                  Aufgabe abgeben
                </Button>
              </div>
            )}

            {isReadOnly && !isGraded && (
              <p className="text-sm text-muted-fg">
                Deine Abgabe wird von der Lehrkraft bewertet.
              </p>
            )}
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
