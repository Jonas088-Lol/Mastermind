/* Copyright 2026 Elian Schock, Jonas Schwenk */
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ArrowRight, BookOpen, Search } from "lucide-react";
import Link from "next/link";
import { getSession, isSuper } from "@/lib/session";
import { ARTICLES } from "./articles";

export const metadata: Metadata = { title: "Knowledge Base · Plattform" };

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function PlattformKbPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session || !isSuper(session)) redirect("/login");

  const { q } = await searchParams;
  const query = (q ?? "").trim().toLowerCase();

  const filtered = query
    ? ARTICLES.filter(
        (a) =>
          a.title.toLowerCase().includes(query) ||
          a.category.toLowerCase().includes(query) ||
          a.summary.toLowerCase().includes(query)
      )
    : ARTICLES;

  const categories = [...new Set(filtered.map((a) => a.category))];

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      <header>
        <Link
          href="/plattform"
          className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-muted-fg hover:text-fg"
        >
          ← Plattform
        </Link>
        <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Knowledge Base</h1>
        <p className="mt-1 text-sm text-muted-fg">
          Interne Dokumentation für Onboarding, Support und Technik. {ARTICLES.length} Artikel.
        </p>
      </header>

      <form action="/plattform/kb" method="get" className="flex items-center gap-2 border border-border bg-bg px-3 py-2">
        <Search className="size-4 shrink-0 text-muted-fg" />
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Artikel suchen …"
          className="flex-1 bg-transparent text-sm focus:outline-none"
        />
      </form>

      {filtered.length === 0 ? (
        <div className="border border-dashed border-border p-8 text-center">
          <p className="text-sm font-semibold">Keine Artikel für „{q}"</p>
          <Link href="/plattform/kb" className="mt-2 text-xs text-brand hover:underline">
            Suche zurücksetzen
          </Link>
        </div>
      ) : (
        categories.map((cat) => (
          <div key={cat}>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-fg">{cat}</h2>
            <ul className="divide-y divide-border border border-border">
              {filtered
                .filter((a) => a.category === cat)
                .map((a) => (
                  <li key={a.slug}>
                    <Link
                      href={`/plattform/kb/${a.slug}`}
                      className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-surface"
                    >
                      <BookOpen className="size-4 shrink-0 text-muted-fg" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold">{a.title}</p>
                        <p className="mt-0.5 truncate text-xs text-muted-fg">{a.summary}</p>
                      </div>
                      <ArrowRight className="size-3.5 shrink-0 text-muted-fg" />
                    </Link>
                  </li>
                ))}
            </ul>
          </div>
        ))
      )}
    </div>
  );
}
