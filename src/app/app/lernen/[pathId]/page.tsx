/* Copyright 2026 Elian Schock, Jonas Schwenk */
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Circle,
  Lock,
} from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { cn } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ pathId: string }>;
}): Promise<Metadata> {
  const { pathId } = await params;
  const path = await prisma.learningPath.findUnique({
    where: { id: pathId },
    select: { title: true },
  });
  return { title: path?.title ?? "Lernpfad" };
}

export default async function LernpfadPage({
  params,
}: {
  params: Promise<{ pathId: string }>;
}) {
  const { pathId } = await params;
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "student") redirect("/");

  const [path, progressRecords] = await Promise.all([
    prisma.learningPath.findUnique({
      where: { id: pathId },
      include: {
        subject: { select: { name: true, color: true } },
        modules: {
          orderBy: { order: "asc" },
          include: { _count: { select: { questions: true } } },
        },
      },
    }),
    prisma.learningProgress.findMany({
      where: { userId: session.userId, pathId },
      select: { moduleId: true },
    }),
  ]);

  if (!path) notFound();
  if (path.schoolId !== session.schoolId) notFound();

  const doneSet = new Set(progressRecords.map((p) => p.moduleId));
  const doneCount = doneSet.size;
  const totalModules = path.modules.length;
  const progressPct = totalModules > 0 ? Math.round((doneCount / totalModules) * 100) : 0;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <div>
        <Link href="/app/lernen" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-ml-3")}>
          <ArrowLeft className="size-3.5" />
          Alle Lernpfade
        </Link>
      </div>

      <header>
        <div className="flex items-center gap-2">
          <span
            className="inline-flex items-center px-1.5 py-0.5 text-[11px] font-semibold"
            style={{ backgroundColor: path.subject.color + "22", color: path.subject.color }}
          >
            {path.subject.name}
          </span>
          {progressPct === 100 && <Badge variant="success">Abgeschlossen</Badge>}
        </div>
        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{path.title}</h1>
        {path.description && (
          <p className="mt-2 text-sm text-muted-fg">{path.description}</p>
        )}
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-fg">
            <span>{doneCount} von {totalModules} Modulen abgeschlossen</span>
            <span className="font-mono font-semibold">{progressPct}%</span>
          </div>
          <Progress value={progressPct} tone={progressPct === 100 ? "success" : "brand"} />
        </div>
      </header>

      <div className="space-y-3">
        {path.modules.map((m, i) => {
          const isDone = doneSet.has(m.id);
          const isUnlocked = i === 0 || doneSet.has(path.modules[i - 1].id);
          return (
            <div
              key={m.id}
              className={cn(
                "flex items-center gap-4 border border-border bg-bg p-4 transition-colors",
                isUnlocked && !isDone && "hover:bg-surface",
                !isUnlocked && "opacity-50",
              )}
            >
              <div className={cn(
                "grid size-10 shrink-0 place-items-center",
                isDone ? "bg-success/10 text-success" : "bg-surface text-muted-fg",
              )}>
                {isDone ? (
                  <CheckCircle2 className="size-5" strokeWidth={1.75} />
                ) : isUnlocked ? (
                  <Circle className="size-5" strokeWidth={1.75} />
                ) : (
                  <Lock className="size-4" strokeWidth={1.75} />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold">{m.title}</p>
                  {isDone && <Badge variant="success">Fertig</Badge>}
                </div>
                <p className="mt-0.5 text-xs text-muted-fg">
                  {m._count.questions} Frage{m._count.questions !== 1 ? "n" : ""}
                </p>
              </div>
              {isUnlocked && (
                <Link
                  href={`/app/lernen/${pathId}/${m.id}`}
                  className={buttonVariants({ variant: isDone ? "ghost" : "secondary", size: "sm" })}
                >
                  {isDone ? "Wiederholen" : "Starten"}
                  <ArrowRight className="size-3.5" />
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
