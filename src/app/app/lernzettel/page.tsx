/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { BookOpen, Plus, Eye, Search } from "lucide-react";
import { prisma } from "@/lib/db/client";
import { getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Schulinterne Lernzettel" };

export default async function LernzettelPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; subject?: string; sort?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!session.schoolId) redirect("/app");

  const { q, subject, sort } = await searchParams;
  const sortByTitle = sort === "titel";

  const entries = await prisma.schoolWikiEntry.findMany({
    where: {
      schoolId: session.schoolId,
      ...(q ? { OR: [
        { title: { contains: q } },
        { content: { contains: q } },
        { tags: { contains: q } },
      ]} : {}),
      ...(subject ? { subject } : {}),
    },
    orderBy: sortByTitle ? { title: "asc" } : { updatedAt: "desc" },
    select: {
      id: true, title: true, subject: true, tags: true,
      viewCount: true, createdAt: true, updatedAt: true,
      authorId: true,
    },
  });

  // Distinct subjects for filter
  const subjects = await prisma.schoolWikiEntry.findMany({
    where: { schoolId: session.schoolId, subject: { not: null } },
    select: { subject: true },
    distinct: ["subject"],
  });

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <header className="flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Schul-Wiki</p>
          <h1 className="mt-1 flex items-center gap-3 text-3xl font-bold tracking-tight sm:text-4xl">
            <BookOpen className="size-7 text-brand" strokeWidth={1.5} />
            Lernzettel
          </h1>
          <p className="mt-1 text-sm text-muted-fg">{entries.length} Lernzettel</p>
        </div>
        <Link
          href="/app/lernzettel/neu"
          className="flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-brand-fg transition-opacity hover:opacity-90"
        >
          <Plus className="size-4" />
          Neuer Lernzettel
        </Link>
      </header>

      {/* Search + filter */}
      <form className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-fg" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Suchen…"
            className="w-full rounded-xl border border-border bg-surface pl-9 pr-3 py-2.5 text-sm placeholder:text-muted-fg focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>
        <select
          name="subject"
          defaultValue={subject ?? ""}
          className="rounded-xl border border-border bg-surface px-3 py-2.5 text-sm focus:border-brand focus:outline-none"
        >
          <option value="">Alle Fächer</option>
          {subjects.map((s) => (
            <option key={s.subject} value={s.subject!}>{s.subject}</option>
          ))}
        </select>
        <select
          name="sort"
          defaultValue={sortByTitle ? "titel" : ""}
          className="rounded-xl border border-border bg-surface px-3 py-2.5 text-sm focus:border-brand focus:outline-none"
        >
          <option value="">Zuletzt bearbeitet</option>
          <option value="titel">Titel A–Z</option>
        </select>
        <button
          type="submit"
          className="rounded-xl bg-muted px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-muted/70"
        >
          Suchen
        </button>
        {(q || subject || sortByTitle) && (
          <Link href="/app/lernzettel" className="rounded-xl border border-border px-4 py-2.5 text-sm text-muted-fg hover:bg-muted transition-colors">
            Zurücksetzen
          </Link>
        )}
      </form>

      {/* Entry list */}
      {entries.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-muted-fg">
          <BookOpen className="size-10" strokeWidth={1.5} />
          <p className="text-sm font-semibold">Noch keine Lernzettel</p>
          <p className="text-xs">Erstelle den ersten Lernzettel für deine Klasse!</p>
          <Link
            href="/app/lernzettel/neu"
            className="mt-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-brand-fg transition-opacity hover:opacity-90"
          >
            Jetzt erstellen
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {entries.map((e) => {
            const tagList = e.tags ? e.tags.split(",").map((t) => t.trim()).filter(Boolean) : [];
            return (
              <Link
                key={e.id}
                href={`/app/lernzettel/${e.id}`}
                className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5 transition-all hover:border-brand/30 hover:shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold leading-snug">{e.title}</p>
                  {e.subject && (
                    <span className="shrink-0 rounded-full bg-brand/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand">
                      {e.subject}
                    </span>
                  )}
                </div>
                {tagList.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {tagList.map((tag) => (
                      <span key={tag} className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-fg">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-3 text-[10px] text-muted-fg mt-auto">
                  <span className="flex items-center gap-1">
                    <Eye className="size-3" /> {e.viewCount}
                  </span>
                  <span>{new Date(e.updatedAt).toLocaleDateString("de-DE")}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
