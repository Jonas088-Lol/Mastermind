import { ArrowLeft, Brain, Sparkles } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db/client";
import { chat, isAiConfigured } from "@/lib/ai";
import { effectiveRole, getSession } from "@/lib/session";

export const metadata: Metadata = { title: "KI-Lernplan" };

export const dynamic = "force-dynamic";

export default async function LernplanPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "student") redirect("/");

  const now = new Date();

  const [assignments, grades] = await Promise.all([
    prisma.assignment.findMany({
      where: {
        class: { students: { some: { id: session.userId } } },
        dueAt: { gte: new Date(now.getTime() - 7 * 86400_000) },
      },
      include: { subject: { select: { name: true } } },
      orderBy: { dueAt: "asc" },
      take: 20,
    }),
    prisma.grade.findMany({
      where: { studentId: session.userId },
      include: { subject: { select: { name: true } } },
      orderBy: { date: "desc" },
      take: 20,
    }),
  ]);

  const openAssignments = assignments.filter((a) => a.dueAt >= now);
  const lateAssignments = assignments.filter((a) => a.dueAt < now);

  const gradesBySubject = grades.reduce<Record<string, number[]>>((acc, g) => {
    const subj = g.subject.name;
    if (!acc[subj]) acc[subj] = [];
    acc[subj].push(g.value);
    return acc;
  }, {});

  const avgBySubject = Object.entries(gradesBySubject).map(([subj, vals]) => ({
    subject: subj,
    avg: vals.reduce((s, v) => s + v, 0) / vals.length,
  }));

  const dueSoon = openAssignments
    .slice(0, 8)
    .map((a) => `- ${a.subject.name}: "${a.title}" (fällig ${a.dueAt.toLocaleDateString("de-DE")}, Typ: ${a.type})`)
    .join("\n");

  const lateList = lateAssignments
    .slice(0, 5)
    .map((a) => `- ${a.subject.name}: "${a.title}" (war fällig ${a.dueAt.toLocaleDateString("de-DE")})`)
    .join("\n");

  const gradeList = avgBySubject
    .map((g) => `- ${g.subject}: Ø ${g.avg.toFixed(1)}`)
    .join("\n");

  const weekStart = now.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" });

  const prompt = `Erstelle einen strukturierten Wochenplan für einen deutschen Schüler. Heute ist ${weekStart}.

Offene Aufgaben (nächste Tage):
${dueSoon || "- Keine offenen Aufgaben"}

Verspätete Aufgaben:
${lateList || "- Keine"}

Aktuelle Notendurchschnitte (niedriger = besser):
${gradeList || "- Keine Noten vorhanden"}

Erstelle einen priorisierten Wochenplan im Markdown-Format mit:
1. Tagesplanung für die nächsten 5 Werktage
2. Für jede Aufgabe: Zeitschätzung + konkreter Tipp
3. Am Ende: 2-3 Empfehlungen für Fächer mit schlechten Noten

Sei präzise und motivierend. Max. 400 Wörter.`;

  const plan = await chat({
    messages: [{ role: "user", content: prompt }],
    maxTokens: 1500,
  });

  const today = now.toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <header className="flex items-center gap-3">
        <Link href="/app/aufgaben" className="text-muted-fg hover:text-fg">
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">KI · Lernassistent</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Wochenplan</h1>
          <p className="mt-0.5 text-sm text-muted-fg">Generiert am {today}</p>
        </div>
        <Sparkles className="ml-auto size-5 text-brand" />
      </header>

      <div className="flex gap-3 border border-border bg-brand/4 p-4 text-sm text-muted-fg">
        <Brain className="mt-0.5 size-4 shrink-0 text-brand" strokeWidth={1.75} />
        <p>
          Dieser Plan wurde basierend auf deinen offenen Aufgaben ({openAssignments.length}) und
          deinen aktuellen Noten erstellt.{" "}
          {!isAiConfigured() && <span className="text-warning">[Demo-Modus — kein API-Key gesetzt]</span>}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dein persönlicher Lernplan</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="prose prose-sm max-w-none text-fg [&_h3]:mb-1 [&_h3]:mt-5 [&_h3]:text-sm [&_h3]:font-bold [&_li]:text-sm [&_p]:text-sm [&_strong]:font-semibold">
            {plan.split("\n").map((line, i) => {
              if (line.startsWith("### ")) return <h3 key={i}>{line.slice(4)}</h3>;
              if (line.startsWith("## ")) return <h2 key={i} className="mb-1 mt-6 text-base font-bold">{line.slice(3)}</h2>;
              if (line.startsWith("**") && line.endsWith("**")) return <p key={i} className="font-semibold">{line.slice(2, -2)}</p>;
              if (line.startsWith("- ")) return <li key={i} className="ml-4 list-disc">{formatInline(line.slice(2))}</li>;
              if (line.trim() === "") return <div key={i} className="h-2" />;
              return <p key={i}>{formatInline(line)}</p>;
            })}
          </div>
        </CardBody>
      </Card>

      <div className="flex justify-end">
        <Link
          href="/app/lernplan"
          className="inline-flex items-center gap-2 border border-border bg-bg px-4 py-2 text-sm font-medium text-muted-fg transition-colors hover:border-brand/40 hover:text-brand"
        >
          <Sparkles className="size-3.5" />
          Neuen Plan generieren
        </Link>
      </div>
    </div>
  );
}

function formatInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**")
      ? <strong key={i}>{p.slice(2, -2)}</strong>
      : p
  );
}
