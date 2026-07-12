/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { Sparkles } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isAiConfigured } from "@/lib/ai";
import { prisma } from "@/lib/db/client";
import { getAiQuota } from "@/lib/db/store";
import { getSession, ROLE_HOME, effectiveRole } from "@/lib/session";
import { TutorWrapper } from "./TutorWrapper";

export const metadata: Metadata = { title: "KI-Tutor" };

export default async function TutorPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const role = effectiveRole(session);
  if (role !== "student" && role !== "super") {
    redirect(ROLE_HOME[role]);
  }

  const now = new Date();

  const [quota, grades, openAssignments] = await Promise.all([
    getAiQuota(session.email),
    prisma.grade.findMany({
      where: { studentId: session.userId },
      include: { subject: { select: { name: true } } },
      orderBy: { date: "desc" },
      take: 30,
    }),
    prisma.assignment.findMany({
      where: {
        class: { students: { some: { id: session.userId } } },
        dueAt: { gte: now, lte: new Date(now.getTime() + 14 * 86400_000) },
      },
      include: { subject: { select: { name: true } } },
      orderBy: { dueAt: "asc" },
      take: 5,
    }),
  ]);

  // Build recentTopics: weak subjects + upcoming assignments
  const bySubject = new Map<string, number[]>();
  for (const g of grades) {
    const n = g.subject.name;
    if (!bySubject.has(n)) bySubject.set(n, []);
    bySubject.get(n)!.push(g.value);
  }
  const weakSubjects = Array.from(bySubject.entries())
    .map(([name, vals]) => ({ name, avg: vals.reduce((a, b) => a + b, 0) / vals.length }))
    .filter((s) => s.avg >= 3.5)
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 3);

  const recentTopics = [
    ...openAssignments.map((a) => ({
      title: `Hilf mir mit: ${a.title}`,
      subject: a.subject.name,
      time: `fällig ${a.dueAt.toLocaleDateString("de-DE", { day: "numeric", month: "short" })}`,
    })),
    ...weakSubjects.map((s) => ({
      title: `Ich verstehe ${s.name} nicht gut — erkläre mir die Grundlagen`,
      subject: s.name,
      time: `Ø ${s.avg.toFixed(1)}`,
    })),
  ].slice(0, 6);

  return (
    <div className="mx-auto flex h-full max-w-7xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-brand" strokeWidth={1.75} />
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">
            KI-Tutor · MasterMind v3
          </p>
        </div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Wobei kann ich dir helfen?
        </h1>
        <p className="text-sm text-muted-fg">
          Erklärt Schritt für Schritt · gibt nie die Lösung weg, sondern führt
          dich hin · DSGVO-konform · Pseudonymisierung vor jeder KI-Anfrage
        </p>
      </header>

      <TutorWrapper
        recentTopics={recentTopics}
        initialQuotaUsed={quota.used}
        initialQuotaLimit={quota.limit}
        isAiConfigured={isAiConfigured()}
      />
    </div>
  );
}
