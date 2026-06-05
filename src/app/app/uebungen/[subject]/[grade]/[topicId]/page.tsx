import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BookOpen, Play } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";

interface PageParams {
  params: Promise<{ subject: string; grade: string; topicId: string }>;
}

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { topicId } = await params;
  const topic = await prisma.exerciseTopic.findUnique({ where: { id: topicId }, select: { title: true } });
  return { title: topic?.title ?? "Thema" };
}

const SUBJECT_LABEL: Record<string, string> = {
  mathematik: "Mathematik", deutsch: "Deutsch", englisch: "Englisch",
  physik: "Physik", chemie: "Chemie", biologie: "Biologie",
  geschichte: "Geschichte", informatik: "Informatik",
};

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

  const label = SUBJECT_LABEL[subject] ?? subject;
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
        <h1 className="text-3xl font-bold tracking-tight">{topic.title}</h1>
        {topic.description && (
          <p className="mt-1 text-sm text-muted-fg">{topic.description}</p>
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

      {/* Video Lektion */}
      {lesson?.videoUrl && (
        <section className="border border-border overflow-hidden">
          <div className="flex items-center gap-2 border-b border-border bg-surface px-5 py-3">
            <Play className="size-4 text-brand" strokeWidth={1.75} />
            <span className="text-sm font-semibold">Erklärvideo</span>
          </div>
          <div className="aspect-video w-full">
            <iframe
              src={getYouTubeEmbed(lesson.videoUrl)}
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

      {/* Vorheriger Score */}
      {progress?.completedAt && (
        <div className="flex items-center gap-3 border border-success/30 bg-success/5 px-5 py-4">
          <div className="flex-1">
            <p className="text-sm font-semibold text-success">Bereits abgeschlossen</p>
            <p className="text-xs text-muted-fg">
              Score: {progress.score}% · {progress.completedAt.toLocaleDateString("de-DE")}
            </p>
          </div>
          <Link
            href={`/app/uebungen/${subject}/${grade}/${topicId}/quiz`}
            className={buttonVariants({ size: "sm", variant: "outline" })}
          >
            Nochmal üben
          </Link>
        </div>
      )}

      {/* Start-Button */}
      {!progress?.completedAt && (
        <Link
          href={`/app/uebungen/${subject}/${grade}/${topicId}/quiz`}
          className={buttonVariants({ size: "lg" })}
        >
          <Play className="size-4" />
          Quiz starten ({topic.questions.length} Fragen)
        </Link>
      )}
    </div>
  );
}

function getYouTubeEmbed(url: string): string {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/);
  if (match) return `https://www.youtube-nocookie.com/embed/${match[1]}`;
  return url;
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
