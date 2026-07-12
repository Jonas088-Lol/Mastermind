/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { GraduationCap } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Lernen" };

export default async function LernenPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "student") redirect("/");

  const [paths, progressRecords] = await Promise.all([
    prisma.learningPath.findMany({
      where: { schoolId: session.schoolId ?? "" },
      include: {
        subject: { select: { name: true, shortName: true, color: true } },
        _count: { select: { modules: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.learningProgress.findMany({
      where: { userId: session.userId },
      select: { pathId: true, moduleId: true },
    }),
  ]);

  const progressByPath = new Map<string, Set<string>>();
  for (const p of progressRecords) {
    if (!progressByPath.has(p.pathId)) progressByPath.set(p.pathId, new Set());
    progressByPath.get(p.pathId)!.add(p.moduleId);
  }

  const enriched = paths.map((p) => {
    const done = progressByPath.get(p.id)?.size ?? 0;
    const total = p._count.modules;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    return { ...p, done, total, pct };
  });

  const inProgress = enriched.filter((p) => p.done > 0 && p.pct < 100);
  const notStarted = enriched.filter((p) => p.done === 0);
  const completed = enriched.filter((p) => p.pct === 100 && p.total > 0);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">
            Lernmodus
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Lernpfade</h1>
          <p className="mt-1 text-sm text-muted-fg">
            {enriched.length} Pfade · {inProgress.length} in Bearbeitung · {completed.length} abgeschlossen
          </p>
        </div>
      </header>

      {enriched.length === 0 && (
        <Card>
          <CardBody>
            <div className="flex flex-col items-center gap-4 py-10 text-center">
              <GraduationCap className="size-10 text-muted-fg" strokeWidth={1.5} />
              <p className="text-base font-semibold">Noch keine Lernpfade vorhanden</p>
              <p className="text-sm text-muted-fg">
                Deine Lehrer können Lernpfade mit Quizfragen erstellen.
              </p>
            </div>
          </CardBody>
        </Card>
      )}

      {inProgress.length > 0 && (
        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-fg">
            In Bearbeitung
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {inProgress.map((p) => (
              <PathCard key={p.id} path={p} />
            ))}
          </div>
        </section>
      )}

      {notStarted.length > 0 && (
        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-fg">
            Verfügbare Pfade
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {notStarted.map((p) => (
              <PathCard key={p.id} path={p} />
            ))}
          </div>
        </section>
      )}

      {completed.length > 0 && (
        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-fg">
            Abgeschlossen
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {completed.map((p) => (
              <PathCard key={p.id} path={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function PathCard({
  path,
}: {
  path: {
    id: string;
    title: string;
    description: string | null;
    done: number;
    total: number;
    pct: number;
    subject: { name: string; shortName: string; color: string };
  };
}) {
  return (
    <Link
      href={`/app/lernen/${path.id}`}
      className="group flex flex-col gap-4 border border-border bg-bg p-5 transition-colors hover:bg-surface"
    >
      <div className="flex items-start justify-between">
        <span
          className="inline-flex items-center px-1.5 py-0.5 text-[11px] font-semibold"
          style={{ backgroundColor: path.subject.color + "22", color: path.subject.color }}
        >
          {path.subject.name}
        </span>
        {path.pct === 100 && <Badge variant="success">Fertig</Badge>}
      </div>
      <div>
        <p className="font-semibold leading-snug">{path.title}</p>
        {path.description && (
          <p className="mt-1 text-xs text-muted-fg line-clamp-2">{path.description}</p>
        )}
      </div>
      <div className="mt-auto space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-fg">
          <span>{path.done}/{path.total} Module</span>
          <span className="font-mono font-semibold">{path.pct}%</span>
        </div>
        <Progress value={path.pct} tone={path.pct === 100 ? "success" : "brand"} />
      </div>
    </Link>
  );
}
