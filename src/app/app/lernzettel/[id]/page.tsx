import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, Copy, Eye, Pencil, Trash2, Tag, BookOpen } from "lucide-react";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { deleteWikiEntry, duplicateWikiEntry, incrementViewCount } from "../actions";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const e = await prisma.schoolWikiEntry.findUnique({ where: { id }, select: { title: true } });
  return { title: e?.title ?? "Lernzettel" };
}

function renderContent(content: string) {
  if (!content) return null;
  // Simple markdown-like rendering
  const lines = content.split("\n");
  return lines.map((line, i) => {
    if (line.startsWith("# ")) return <h2 key={i} className="mt-6 text-xl font-bold first:mt-0">{line.slice(2)}</h2>;
    if (line.startsWith("## ")) return <h3 key={i} className="mt-5 text-lg font-semibold first:mt-0">{line.slice(3)}</h3>;
    if (line.startsWith("### ")) return <h4 key={i} className="mt-4 font-semibold first:mt-0">{line.slice(4)}</h4>;
    if (line.startsWith("- ") || line.startsWith("* ")) return (
      <li key={i} className="ml-4 list-disc text-sm leading-relaxed">{line.slice(2)}</li>
    );
    if (line.trim() === "") return <div key={i} className="h-2" />;
    return <p key={i} className="text-sm leading-relaxed text-fg">{line}</p>;
  });
}

export default async function LernzettelDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect("/login");

  const entry = await prisma.schoolWikiEntry.findUnique({
    where: { id },
  });
  if (!entry) notFound();
  if (entry.schoolId !== session.schoolId) notFound();

  // Fire-and-forget view count
  void incrementViewCount(id);

  const role = effectiveRole(session);
  const isAuthor = entry.authorId === session.userId;
  const canEdit = isAuthor || role === "admin" || role === "teacher";
  const canDelete = isAuthor || role === "admin";

  const tagList = entry.tags ? entry.tags.split(",").map((t) => t.trim()).filter(Boolean) : [];

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      {/* Back + actions */}
      <div className="flex items-center gap-3">
        <Link href="/app/lernzettel" className="flex size-8 items-center justify-center rounded-lg text-muted-fg hover:bg-muted transition-colors">
          <ArrowLeft className="size-4" />
        </Link>
        <span className="flex-1 text-sm text-muted-fg">Schul-Wiki</span>
        {canEdit && (
          <form action={async () => { "use server"; await duplicateWikiEntry(id); }}>
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-semibold text-muted-fg hover:bg-muted transition-colors"
            >
              <Copy className="size-3.5" /> Duplizieren
            </button>
          </form>
        )}
        {canEdit && (
          <Link
            href={`/app/lernzettel/${id}/bearbeiten`}
            className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-semibold text-muted-fg hover:bg-muted transition-colors"
          >
            <Pencil className="size-3.5" /> Bearbeiten
          </Link>
        )}
        {canDelete && (
          <form action={async () => { "use server"; await deleteWikiEntry(id); }}>
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-xl border border-danger/20 px-3 py-1.5 text-xs font-semibold text-danger hover:bg-danger/10 transition-colors"
            >
              <Trash2 className="size-3.5" /> Löschen
            </button>
          </form>
        )}
      </div>

      {/* Header */}
      <div className="rounded-2xl border border-border bg-surface p-6">
        <div className="flex flex-wrap items-start gap-3">
          <h1 className="flex-1 text-2xl font-bold leading-snug">{entry.title}</h1>
          {entry.subject && (
            <span className="rounded-full bg-brand/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-brand">
              {entry.subject}
            </span>
          )}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-fg">
          <span className="flex items-center gap-1"><Eye className="size-3" /> {entry.viewCount} Aufrufe</span>
          <span><BookOpen className="size-3 inline mr-1" />Erstellt {new Date(entry.createdAt).toLocaleDateString("de-DE")}</span>
          {entry.updatedAt > entry.createdAt && (
            <span>Bearbeitet {new Date(entry.updatedAt).toLocaleDateString("de-DE")}</span>
          )}
        </div>
        {tagList.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {tagList.map((tag) => (
              <Link
                key={tag}
                href={`/app/lernzettel?q=${encodeURIComponent(tag)}`}
                className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-[11px] text-muted-fg hover:bg-muted/70 transition-colors"
              >
                <Tag className="size-2.5" /> {tag}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="rounded-2xl border border-border bg-surface p-6">
        {entry.content ? (
          <div className="flex flex-col gap-1">
            {renderContent(entry.content)}
          </div>
        ) : (
          <p className="text-sm text-muted-fg italic">Kein Inhalt vorhanden.</p>
        )}
      </div>
    </div>
  );
}
