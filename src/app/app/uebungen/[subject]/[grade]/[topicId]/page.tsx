/* Copyright 2026 Elian Schock, Jonas Schwenk */
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BookOpen, FileText, NotebookPen, Play, Clock, CheckCircle2 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { topicVisual, EXERCISE_BLOCK_SIZE, subjectLabel } from "@/lib/exercise-visuals";

interface PageParams {
  params: Promise<{ subject: string; grade: string; topicId: string }>;
}

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { topicId } = await params;
  const topic = await prisma.exerciseTopic.findUnique({ where: { id: topicId }, select: { title: true } });
  return { title: topic?.title ?? "Thema" };
}

const QUESTION_TYPE_LABEL: Record<string, string> = {
  mc: "Multiple Choice",
  fill_blank: "Lückentext",
  true_false: "Wahr/Falsch",
  order: "Reihenfolge",
  match: "Zuordnung",
  blitz: "Blitzrunde",
};

export default async function TopicPage({ params }: PageParams) {
  const { subject, grade, topicId } = await params;
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "student") redirect("/");

  const topic = await prisma.exerciseTopic.findUnique({
    where: { id: topicId },
    include: {
      lessons: { orderBy: { order: "asc" } },
      questions: { orderBy: { order: "asc" }, select: { id: true, type: true } },
      progress: { where: { userId: session.userId } },
    },
  });

  if (!topic || topic.subject !== subject || topic.grade !== parseInt(grade, 10)) notFound();

  const label = subjectLabel(subject);
  const visual = topicVisual(subject, topic.title);
  const totalBlocks = Math.max(1, Math.ceil(topic.questions.length / EXERCISE_BLOCK_SIZE));

  const relatedNotebooks = await prisma.notebook.findMany({
    where: {
      userId: session.userId,
      OR: [
        { title: { contains: label } },
        { title: { contains: label.toLowerCase() } },
        { subject: { contains: label } },
        { subject: { contains: label.toLowerCase() } },
      ],
    },
    include: {
      pages: {
        select: { id: true, title: true, updatedAt: true },
        orderBy: { order: "asc" },
        take: 5,
      },
    },
    take: 3,
  });
  const progress = topic.progress[0];
  const lesson = topic.lessons[0];

  const typeCounts: Record<string, number> = {};
  for (const q of topic.questions) {
    typeCounts[q.type] = (typeCounts[q.type] ?? 0) + 1;
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <header>
        <Link
          href={`/app/uebungen/${subject}/${grade}`}
          className="mb-4 inline-flex items-center gap-2 text-xs text-muted-fg hover:text-fg"
        >
          <ArrowLeft className="size-3.5" />
          {label} Klasse {grade}
        </Link>
        <div className="flex items-center gap-3">
          <span className={`grid size-12 shrink-0 place-items-center rounded-full ${visual.color}`}>
            <visual.icon className="size-6" strokeWidth={1.75} />
          </span>
          <h1 className="text-3xl font-bold tracking-tight">{topic.title}</h1>
        </div>
        {topic.description && (
          <p className="mt-2 text-sm text-muted-fg">{topic.description}</p>
        )}
      </header>

      {/* Quiz-Info */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(typeCounts).map(([type, count]) => (
          <span
            key={type}
            className="inline-flex items-center gap-1 border border-border bg-surface px-3 py-1 text-xs font-medium"
          >
            {QUESTION_TYPE_LABEL[type] ?? type}
            <span className="font-mono text-muted-fg">×{count}</span>
          </span>
        ))}
      </div>

      {/* Video Lektion — nur eingebettet, wenn es eine valide YouTube-URL ist */}
      {lesson?.videoUrl && getYouTubeEmbed(lesson.videoUrl) && (
        <section className="border border-border overflow-hidden">
          <div className="flex items-center gap-2 border-b border-border bg-surface px-5 py-3">
            <Play className="size-4 text-brand" strokeWidth={1.75} />
            <span className="text-sm font-semibold">Erklärvideo</span>
          </div>
          <div className="aspect-video w-full">
            <iframe
              src={getYouTubeEmbed(lesson.videoUrl)!}
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={topic.title}
            />
          </div>
        </section>
      )}

      {/* Lerntext */}
      {lesson && (
        <section className="border border-border">
          <div className="flex items-center gap-2 border-b border-border bg-surface px-5 py-3">
            <BookOpen className="size-4 text-brand" strokeWidth={1.75} />
            <span className="text-sm font-semibold">Lerntext</span>
          </div>
          <div className="prose prose-sm max-w-none p-5 dark:prose-invert [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-border [&_td]:px-3 [&_td]:py-2 [&_th]:border [&_th]:border-border [&_th]:px-3 [&_th]:py-2 [&_th]:text-left">
            <MarkdownContent content={lesson.content} />
          </div>
        </section>
      )}

      {/* Deine Notizen */}
      {relatedNotebooks.length > 0 && (
        <section className="border border-border">
          <div className="flex items-center justify-between border-b border-border bg-surface px-5 py-3">
            <div className="flex items-center gap-2">
              <NotebookPen className="size-4 text-brand" strokeWidth={1.75} />
              <span className="text-sm font-semibold">Deine Notizen — {label}</span>
            </div>
            <Link href="/app/heft" className="text-xs text-muted-fg hover:text-fg">Alle Hefte →</Link>
          </div>
          <ul className="divide-y divide-border">
            {relatedNotebooks.flatMap((nb) => nb.pages.map((page) => ({ ...page, notebookId: nb.id }))).slice(0, 5).map((page) => (
              <li key={page.id}>
                <Link href={`/app/heft/${page.notebookId}/${page.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-surface">
                  <FileText className="size-3.5 shrink-0 text-muted-fg" />
                  <span className="text-sm">{page.title || "Unbenannte Seite"}</span>
                  <span className="ml-auto text-xs text-muted-fg">{page.updatedAt.toLocaleDateString("de-DE")}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Neues Heft CTA */}
      <div className="flex items-center gap-3 border border-dashed border-border bg-surface/50 px-5 py-4">
        <NotebookPen className="size-4 shrink-0 text-muted-fg" />
        <p className="flex-1 text-sm text-muted-fg">Heft für {label} anlegen und Notizen machen</p>
        <Link
          href={`/app/heft?createFor=${encodeURIComponent(label)}`}
          className="text-xs font-semibold text-brand hover:underline"
        >
          Neues Heft +
        </Link>
      </div>

      {/* Vorheriger Score */}
      {progress?.completedAt && (
        <div className="flex items-center gap-3 rounded-2xl border border-success/30 bg-success/5 px-5 py-4">
          <CheckCircle2 className="size-5 shrink-0 text-success" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-success">Bereits abgeschlossen</p>
            <p className="text-xs text-muted-fg">
              Score: {progress.score}% · {progress.completedAt.toLocaleDateString("de-DE")}
            </p>
          </div>
        </div>
      )}

      {/* Übungsblöcke — kurze Segmente statt eines langen Quiz */}
      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-bold">Übungsblöcke</h2>
          <span className="text-xs text-muted-fg">
            je max. {EXERCISE_BLOCK_SIZE} Fragen · ~{Math.ceil(EXERCISE_BLOCK_SIZE * 0.5)} Min
          </span>
        </div>

        {totalBlocks === 1 ? (
          <Link
            href={`/app/uebungen/${subject}/${grade}/${topicId}/quiz`}
            className={`${buttonVariants({ size: "lg" })} pastel-cta`}
          >
            <Play className="size-4" />
            Quiz starten ({topic.questions.length} Fragen)
          </Link>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: totalBlocks }, (_, b) => {
              const count = Math.min(EXERCISE_BLOCK_SIZE, topic.questions.length - b * EXERCISE_BLOCK_SIZE);
              return (
                <Link
                  key={b}
                  href={`/app/uebungen/${subject}/${grade}/${topicId}/quiz?block=${b}`}
                  className="group flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-sm"
                >
                  <span className={`grid size-10 shrink-0 place-items-center rounded-full ${visual.color}`}>
                    <visual.icon className="size-5" strokeWidth={1.75} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold group-hover:text-brand">Block {b + 1}</p>
                    <p className="flex items-center gap-1 text-xs text-muted-fg">
                      <Clock className="size-3" /> {count} Fragen · ~{Math.ceil(count * 0.5)} Min
                    </p>
                  </div>
                  <Play className="size-4 shrink-0 text-muted-fg transition-colors group-hover:text-brand" />
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

// Liefert eine sichere YouTube-nocookie-Embed-URL oder null. Nicht-YouTube-URLs
// werden NICHT eingebettet (verhindert, dass beliebige URLs in einem iframe
// landen). Nur die 11-stellige Video-ID wird übernommen.
function getYouTubeEmbed(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/);
  return match ? `https://www.youtube-nocookie.com/embed/${match[1]}` : null;
}

function MarkdownContent({ content }: { content: string }) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let inTable = false;
  let tableRows: string[][] = [];
  let isHeaderRow = true;

  function flushTable() {
    if (tableRows.length === 0) return;
    const [header, , ...body] = tableRows;
    if (!header) return;
    elements.push(
      <table key={`table-${elements.length}`}>
        <thead>
          <tr>{header.map((h, i) => <th key={i}>{h.trim()}</th>)}</tr>
        </thead>
        <tbody>
          {body.map((row, ri) => (
            <tr key={ri}>{row.map((cell, ci) => <td key={ci}>{renderInline(cell.trim())}</td>)}</tr>
          ))}
        </tbody>
      </table>
    );
    tableRows = [];
    isHeaderRow = true;
    inTable = false;
  }

  for (const line of lines) {
    if (line.startsWith("|")) {
      inTable = true;
      tableRows.push(line.split("|").slice(1, -1));
      continue;
    }
    if (inTable) {
      flushTable();
    }

    if (line.startsWith("## ")) {
      elements.push(<h2 key={elements.length}>{line.slice(3)}</h2>);
    } else if (line.startsWith("### ")) {
      elements.push(<h3 key={elements.length}>{line.slice(4)}</h3>);
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      elements.push(<li key={elements.length}>{renderInline(line.slice(2))}</li>);
    } else if (/^\d+\. /.test(line)) {
      elements.push(<li key={elements.length}>{renderInline(line.replace(/^\d+\. /, ""))}</li>);
    } else if (line.startsWith("```")) {
      // skip code fence markers
    } else if (line.trim() === "") {
      elements.push(<br key={elements.length} />);
    } else {
      elements.push(<p key={elements.length}>{renderInline(line)}</p>);
    }
  }
  if (inTable) flushTable();

  return <>{elements}</>;
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={i}>{part.slice(1, -1)}</code>;
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    return part;
  });
}
