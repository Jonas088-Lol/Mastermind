import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { cn } from "@/lib/utils";

interface Props {
  params: Promise<{ subjectId: string }>;
}

const TYPE_DE: Record<string, string> = {
  klausur: "Klassenarbeit",
  test: "Test",
  muendlich: "Mündlich",
  hausaufgabe: "Hausaufgabe",
  projekt: "Projekt",
};

function fmt(n: number) {
  return n.toFixed(1).replace(".", ",");
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { subjectId } = await params;
  const subject = await prisma.subject.findUnique({
    where: { id: subjectId },
    select: { name: true },
  });
  return { title: subject ? `Noten · ${subject.name}` : "Noten" };
}

export default async function NotenDetailPage({ params }: Props) {
  const { subjectId } = await params;
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "student") redirect("/");

  const subject = await prisma.subject.findUnique({
    where: { id: subjectId },
    select: { id: true, name: true, shortName: true, color: true },
  });
  if (!subject) notFound();

  const grades = await prisma.grade.findMany({
    where: { studentId: session.userId, subjectId },
    include: {
      teacher: { select: { name: true } },
    },
    orderBy: { date: "desc" },
  });

  const totalWeight = grades.reduce((s, g) => s + g.weight, 0);
  const weightedAvg =
    totalWeight > 0
      ? grades.reduce((s, g) => s + g.value * g.weight, 0) / totalWeight
      : null;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <header className="flex items-center gap-3">
        <Link href="/app/noten" className="text-muted-fg hover:text-fg">
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">
            Noten · Detail
          </p>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
            <span
              className="inline-block size-3 rounded-full"
              style={{ backgroundColor: subject.color }}
            />
            {subject.name}
          </h1>
          {weightedAvg !== null && (
            <p className="mt-1 text-sm text-muted-fg">
              Ø{" "}
              <span
                className={cn(
                  "font-semibold",
                  weightedAvg >= 4
                    ? "text-danger"
                    : weightedAvg >= 3
                    ? "text-warning"
                    : "text-fg"
                )}
              >
                {fmt(weightedAvg)}
              </span>{" "}
              · {grades.length} Bewertungen
            </p>
          )}
        </div>
      </header>

      {grades.length === 0 ? (
        <p className="text-sm text-muted-fg">Noch keine Noten in diesem Fach.</p>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Alle Bewertungen</CardTitle>
            <span className="font-mono text-xs text-muted-fg">
              {grades.length} Einträge · neueste zuerst
            </span>
          </CardHeader>
          <CardBody className="px-0! pb-0!">
            <ul className="divide-y divide-border border-t border-border">
              {grades.map((g) => (
                <li
                  key={g.id}
                  className="grid grid-cols-[auto_1fr_auto] items-start gap-4 px-5 py-4 transition-colors hover:bg-surface sm:grid-cols-[auto_1fr_auto_auto]"
                >
                  <div className="flex flex-col items-center justify-center pt-0.5">
                    <span className="font-mono text-xs text-muted-fg">
                      {g.date.toLocaleDateString("de-DE", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "2-digit",
                      })}
                    </span>
                  </div>

                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{TYPE_DE[g.type] ?? g.type}</p>
                    {g.comment && (
                      <p className="mt-0.5 text-xs text-muted-fg">{g.comment}</p>
                    )}
                    <p className="mt-0.5 text-xs text-muted-fg">{g.teacher.name}</p>
                  </div>

                  <Badge variant="outline" className="hidden sm:inline-flex">
                    Gewicht {g.weight}
                  </Badge>

                  <p
                    className={cn(
                      "font-mono text-2xl font-bold tabular-nums",
                      g.value >= 4 && "text-danger",
                      g.value >= 3 && g.value < 4 && "text-warning"
                    )}
                  >
                    {fmt(g.value)}
                  </p>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
