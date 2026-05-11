import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db/client";
import { getSession } from "@/lib/session";
import { listSubmissions } from "@/lib/korrektur-data";
import { AcceptButton } from "../AcceptButton";

export const metadata: Metadata = { title: "Korrektur" };

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function KorrekturDetailPage({ params }: PageProps) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect("/login");

  // Try to find in real DB first
  const dbSub = await prisma.submission.findUnique({
    where: { id },
    include: {
      student: { select: { name: true, email: true, klasse: true } },
      assignment: {
        select: {
          title: true,
          description: true,
          maxPoints: true,
          subject: { select: { name: true } },
        },
      },
      grade: true,
    },
  });

  // Fall back to mock data
  const mockSubs = listSubmissions();
  const mockSub = mockSubs.find((s) => s.id === id);

  if (!dbSub && !mockSub) {
    notFound();
  }

  const isReal = !!dbSub;
  const defaultGrade = isReal
    ? (dbSub!.grade?.value ?? 2.0)
    : parseFloat(mockSub!.aiGrade.replace(",", "."));

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link
          href="/teach/korrektur"
          className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-fg transition-colors hover:text-fg"
        >
          <ArrowLeft className="size-3.5" />
          Zurück zur Übersicht
        </Link>
      </div>

      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">
          Korrektur-Detail
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">
          {isReal ? dbSub!.assignment.title : mockSub!.assignment}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Badge variant="outline">
            {isReal ? dbSub!.assignment.subject.name : mockSub!.subject}
          </Badge>
          {!isReal && <Badge variant="outline">{mockSub!.klasse}</Badge>}
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Schüler</CardTitle>
          </CardHeader>
          <CardBody>
            <p className="text-base font-semibold">
              {isReal ? dbSub!.student.name : mockSub!.student}
            </p>
            {isReal && dbSub!.student.email && (
              <p className="mt-0.5 text-sm text-muted-fg">{dbSub!.student.email}</p>
            )}
            {isReal && dbSub!.student.klasse && (
              <p className="mt-0.5 text-xs text-muted-fg">Klasse {dbSub!.student.klasse}</p>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Aufgaben-Details</CardTitle>
          </CardHeader>
          <CardBody>
            {isReal ? (
              <>
                {dbSub!.assignment.description && (
                  <p className="text-sm text-muted-fg">{dbSub!.assignment.description}</p>
                )}
                {dbSub!.assignment.maxPoints !== null && (
                  <p className="mt-2 text-sm">
                    <span className="font-semibold">Max. Punkte:</span>{" "}
                    {dbSub!.assignment.maxPoints}
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="text-sm text-muted-fg">{mockSub!.assignment}</p>
                <p className="mt-2 text-sm">
                  <span className="font-semibold">Seiten:</span> {mockSub!.pages}
                </p>
                <p className="mt-1 text-sm">
                  <span className="font-semibold">Bewertungskriterien:</span>{" "}
                  {mockSub!.rubricHits}/{mockSub!.rubricTotal} erfüllt
                </p>
              </>
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Abgabe-Inhalt</CardTitle>
        </CardHeader>
        <CardBody>
          {isReal && dbSub!.content ? (
            <p className="whitespace-pre-wrap text-sm">{dbSub!.content}</p>
          ) : (
            <p className="text-sm italic text-muted-fg">
              {isReal
                ? "Kein Inhalt hinterlegt."
                : "Abgabe liegt als Datei vor (Mock-Daten — kein Volltext verfügbar)."}
            </p>
          )}
        </CardBody>
      </Card>

      <Card className="border-brand/40 bg-gradient-to-r from-brand/[0.08] to-transparent">
        <CardHeader>
          <CardTitle>KI-gestützte Bewertung</CardTitle>
          <Badge variant="brand">KI-Vorschlag</Badge>
        </CardHeader>
        <CardBody>
          {!isReal && (
            <p className="mb-4 text-sm text-muted-fg">
              KI-Vorschlag:{" "}
              <span className="font-mono font-bold text-fg">{mockSub!.aiGrade}</span>
              {" "}
              (Konfidenz: {mockSub!.aiConfidence}%)
            </p>
          )}
          <p className="mb-4 text-sm text-muted-fg">
            Note mit einem Klick annehmen (KI-Vorschlag):
          </p>
          <div className="flex items-center gap-3">
            <span className="font-mono text-2xl font-bold">
              {isReal
                ? String(defaultGrade.toFixed(1)).replace(".", ",")
                : mockSub!.aiGrade}
            </span>
            <AcceptButton submissionId={id} grade={defaultGrade} />
          </div>
          <p className="mt-3 text-xs text-muted-fg">
            Die Note wird direkt übernommen und der Schüler benachrichtigt.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
