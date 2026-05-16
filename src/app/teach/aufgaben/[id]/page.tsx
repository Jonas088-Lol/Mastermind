import {
  ArrowLeft,
  Calendar,
  Download,
  FileText,
  Pencil,
  Paperclip,
  Users,
} from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Aufgabe Details" };

interface PageProps {
  params: Promise<{ id: string }>;
}

const STATUS_LABEL: Record<string, string> = {
  open: "Ausstehend",
  submitted: "Eingereicht",
  graded: "Bewertet",
  late: "Verspätet",
};

export default async function TeachAufgabeDetailPage({ params }: PageProps) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "teacher") redirect("/");

  const assignment = await prisma.assignment.findUnique({
    where: { id },
    include: {
      subject: { select: { name: true, color: true, shortName: true } },
      class: { select: { name: true, students: { select: { id: true } } } },
      submissions: {
        include: {
          student: { select: { id: true, name: true } },
          grade: { select: { value: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!assignment) notFound();
  if (assignment.teacherId !== session.userId) notFound();

  // FileUploads are linked to assignment + userId, not to submission directly
  const allFileUploads = await prisma.fileUpload.findMany({
    where: { assignmentId: id },
    select: { id: true, filename: true, userId: true },
    orderBy: { createdAt: "asc" },
  });

  // Group uploads by userId for quick lookup
  const uploadsByStudent = new Map<string, { id: string; filename: string }[]>();
  for (const f of allFileUploads) {
    const existing = uploadsByStudent.get(f.userId) ?? [];
    existing.push({ id: f.id, filename: f.filename });
    uploadsByStudent.set(f.userId, existing);
  }

  // Stats
  const totalStudents = assignment.class.students.length;
  const submittedCount = assignment.submissions.filter(
    (s) => s.status === "submitted" || s.status === "graded" || s.status === "late"
  ).length;
  const gradedCount = assignment.submissions.filter(
    (s) => s.status === "graded"
  ).length;

  const gradedValues = assignment.submissions
    .filter((s) => s.grade !== null)
    .map((s) => s.grade!.value);
  const avgGrade =
    gradedValues.length > 0
      ? gradedValues.reduce((sum, v) => sum + v, 0) / gradedValues.length
      : null;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      {/* Back link */}
      <Link
        href="/teach/aufgaben"
        className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-muted-fg transition-colors hover:text-fg"
      >
        <ArrowLeft className="size-3.5" />
        Zurück zu Aufgaben
      </Link>

      {/* Header */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="inline-flex items-center px-1.5 py-0.5 text-[11px] font-semibold"
              style={{
                backgroundColor: assignment.subject.color + "22",
                color: assignment.subject.color,
              }}
            >
              {assignment.subject.shortName} · {assignment.class.name}
            </span>
          </div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            {assignment.title}
          </h1>
          <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-fg">
            <Calendar className="size-4" />
            Fällig:{" "}
            {assignment.dueAt.toLocaleDateString("de-DE", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>

        <div className="flex shrink-0 gap-2">
          <Link
            href={`/teach/aufgaben/${assignment.id}/bearbeiten`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
          >
            <Pencil className="size-3.5" />
            Bearbeiten
          </Link>
          {/* CSV Export */}
          <a
            href={`/api/teach/noten-export?assignmentId=${assignment.id}`}
            className={cn(
              buttonVariants({ variant: "secondary", size: "sm" }),
              "gap-1.5"
            )}
          >
            <Download className="size-3.5" />
            CSV Export
          </a>
        </div>
      </header>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardBody className="!py-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-fg">
              Schüler
            </p>
            <p className="mt-1 text-2xl font-bold">{totalStudents}</p>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="!py-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-fg">
              Eingereicht
            </p>
            <p className="mt-1 text-2xl font-bold">
              {submittedCount}
              <span className="ml-1 text-sm font-normal text-muted-fg">
                / {totalStudents}
              </span>
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="!py-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-fg">
              Bewertet
            </p>
            <p className="mt-1 text-2xl font-bold">
              {gradedCount}
              <span className="ml-1 text-sm font-normal text-muted-fg">
                / {submittedCount}
              </span>
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="!py-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-fg">
              Ø Note
            </p>
            <p className="mt-1 text-2xl font-bold">
              {avgGrade !== null
                ? avgGrade.toFixed(1).replace(".", ",")
                : "—"}
            </p>
          </CardBody>
        </Card>
      </div>

      {/* Description */}
      {assignment.description && (
        <Card>
          <CardHeader>
            <CardTitle>Aufgabenbeschreibung</CardTitle>
          </CardHeader>
          <CardBody>
            <p className="text-sm leading-relaxed text-muted-fg">
              {assignment.description}
            </p>
          </CardBody>
        </Card>
      )}

      {/* Submissions list */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="size-4 text-muted-fg" strokeWidth={1.75} />
            <CardTitle>Abgaben</CardTitle>
          </div>
          <span className="font-mono text-xs text-muted-fg">
            {assignment.submissions.length} Einträge
          </span>
        </CardHeader>
        <CardBody className="!px-0 !pb-0">
          {assignment.submissions.length === 0 ? (
            <div className="border-t border-border px-5 py-10 text-center">
              <p className="text-sm text-muted-fg">
                Noch keine Abgaben vorhanden.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border border-t border-border">
              {assignment.submissions.map((sub) => (
                <li
                  key={sub.id}
                  className="grid grid-cols-1 gap-4 px-5 py-4 transition-colors hover:bg-surface lg:grid-cols-[auto_1fr_auto] lg:items-start lg:gap-5"
                >
                  {/* Avatar */}
                  <Avatar name={sub.student.name} size="md" className="mt-0.5" />

                  {/* Content */}
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold">
                        {sub.student.name}
                      </span>
                      <StatusBadge status={sub.status} />
                      {sub.grade !== null && (
                        <span className="font-mono text-xs font-bold text-success">
                          Note:{" "}
                          {sub.grade.value.toFixed(1).replace(".", ",")}
                        </span>
                      )}
                    </div>

                    {/* Submission text preview */}
                    {sub.content && (
                      <p className="mt-1.5 text-xs text-muted-fg line-clamp-2">
                        {sub.content.length > 150
                          ? sub.content.slice(0, 150) + "…"
                          : sub.content}
                      </p>
                    )}

                    {/* File uploads */}
                    {(uploadsByStudent.get(sub.student.id) ?? []).length > 0 && (
                      <ul className="mt-2 flex flex-wrap gap-2">
                        {(uploadsByStudent.get(sub.student.id) ?? []).map((f) => (
                          <li key={f.id}>
                            <a
                              href={`/api/files/${f.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-fg underline-offset-2 hover:text-fg hover:underline"
                            >
                              <Paperclip className="size-3 shrink-0" />
                              {f.filename}
                            </a>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Grade link */}
                  <Link
                    href={`/teach/korrektur/${sub.id}`}
                    className={cn(
                      buttonVariants({ variant: "outline", size: "sm" }),
                      "shrink-0 text-xs"
                    )}
                  >
                    <FileText className="size-3.5" />
                    {sub.status === "graded" ? "Bewertung" : "Korrigieren"}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "graded":
      return <Badge variant="success">{STATUS_LABEL[status]}</Badge>;
    case "submitted":
      return <Badge variant="info">{STATUS_LABEL[status]}</Badge>;
    case "late":
      return <Badge variant="danger">{STATUS_LABEL[status]}</Badge>;
    default:
      return (
        <Badge variant="outline">{STATUS_LABEL[status] ?? status}</Badge>
      );
  }
}
