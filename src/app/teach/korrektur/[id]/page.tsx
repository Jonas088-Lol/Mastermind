/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { ArrowLeft, CheckCircle2, Clock, Download, FileText, Paperclip } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { AcceptButton } from "../AcceptButton";
import { GradeForm } from "./GradeForm";

export const metadata: Metadata = { title: "Korrektur" };

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function KorrekturDetailPage({ params }: PageProps) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "teacher") redirect("/");

  const sub = await prisma.submission.findUnique({
    where: { id },
    include: {
      student: {
        select: {
          name: true,
          email: true,
          klasse: true,
          schoolClass: { select: { name: true } },
        },
      },
      assignment: {
        select: {
          title: true,
          description: true,
          maxPoints: true,
          teacherId: true,
          subject: { select: { id: true, name: true } },
        },
      },
      grade: true,
    },
  });

  if (!sub) notFound();
  if (sub.assignment.teacherId !== session.userId) notFound();

  const files = await prisma.fileUpload.findMany({
    where: { assignmentId: sub.assignmentId, userId: sub.studentId },
    select: { id: true, filename: true, size: true, mimeType: true },
    orderBy: { createdAt: "asc" },
  });

  const isGraded = sub.status === "graded";
  const currentGrade = sub.grade?.value ?? null;

  function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <Link
        href="/teach/korrektur"
        className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-muted-fg transition-colors hover:text-fg"
      >
        <ArrowLeft className="size-3.5" />
        Zurück zur Übersicht
      </Link>

      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Korrektur-Detail</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">{sub.assignment.title}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Badge variant="outline">{sub.assignment.subject.name}</Badge>
          <Badge variant="outline">{sub.student.schoolClass?.name ?? sub.student.klasse ?? "—"}</Badge>
          {isGraded && <Badge variant="success"><CheckCircle2 className="size-3" />Bewertet</Badge>}
          {sub.status === "late" && <Badge variant="danger">Verspätet</Badge>}
          {sub.status === "submitted" && <Badge variant="info">Abgegeben</Badge>}
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Schüler</CardTitle></CardHeader>
          <CardBody>
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center bg-surface text-sm font-bold">
                {sub.student.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold">{sub.student.name}</p>
                {sub.student.email && <p className="text-xs text-muted-fg">{sub.student.email}</p>}
              </div>
            </div>
            {sub.submittedAt && (
              <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-fg">
                <Clock className="size-3.5" />
                Abgegeben: {sub.submittedAt.toLocaleDateString("de-DE", {
                  day: "numeric", month: "long", year: "numeric",
                })} · {sub.submittedAt.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} Uhr
              </p>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader><CardTitle>Aufgabe</CardTitle></CardHeader>
          <CardBody>
            {sub.assignment.description && (
              <p className="text-sm text-muted-fg">{sub.assignment.description}</p>
            )}
            {sub.assignment.maxPoints != null && (
              <p className="mt-2 text-sm">
                <span className="font-semibold">Max. Punkte:</span> {sub.assignment.maxPoints}
              </p>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Submission content */}
      <Card>
        <CardHeader>
          <CardTitle>Abgabe-Inhalt</CardTitle>
          <span className="text-xs text-muted-fg">{sub.content ? `${sub.content.length} Zeichen` : "Keine Texteingabe"}</span>
        </CardHeader>
        <CardBody>
          {sub.content ? (
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{sub.content}</pre>
          ) : (
            <p className="text-sm italic text-muted-fg">Kein Textinhalt — Abgabe vermutlich als Datei.</p>
          )}
        </CardBody>
      </Card>

      {/* Uploaded files */}
      {files.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Paperclip className="size-4 text-muted-fg" strokeWidth={1.75} />
              <CardTitle>Angehängte Dateien</CardTitle>
            </div>
            <span className="text-xs text-muted-fg">{files.length} {files.length === 1 ? "Datei" : "Dateien"}</span>
          </CardHeader>
          <CardBody className="p-0!">
            <ul className="divide-y divide-border">
              {files.map((f) => (
                <li key={f.id}>
                  <a
                    href={`/api/files/${f.id}?download=1`}
                    className="flex items-center gap-3 px-5 py-3 text-sm transition-colors hover:bg-surface"
                  >
                    <FileText className="size-4 shrink-0 text-muted-fg" strokeWidth={1.75} />
                    <span className="flex-1 truncate font-medium">{f.filename}</span>
                    <span className="text-xs text-muted-fg">{formatBytes(f.size)}</span>
                    <Download className="size-3.5 shrink-0 text-muted-fg" />
                  </a>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}

      {/* Grade section */}
      <Card className={cn(isGraded && "border-success/30 bg-success/3")}>
        <CardHeader>
          <CardTitle>Bewertung</CardTitle>
          {isGraded && currentGrade != null && (
            <span className="font-mono text-2xl font-bold text-success">
              {currentGrade.toFixed(1).replace(".", ",")}
            </span>
          )}
        </CardHeader>
        <CardBody>
          <GradeForm
            submissionId={id}
            currentGrade={currentGrade}
            currentComment={sub.grade?.comment ?? ""}
            subjectId={sub.assignment.subject.id}
            studentId={sub.studentId}
            isGraded={isGraded}
            assignmentTitle={sub.assignment.title}
            assignmentDescription={sub.assignment.description ?? null}
            submissionContent={sub.content ?? null}
            maxPoints={sub.assignment.maxPoints ?? null}
            klasse={sub.student.schoolClass?.name ?? sub.student.klasse ?? ""}
            subjectName={sub.assignment.subject.name}
          />
        </CardBody>
      </Card>
    </div>
  );
}
