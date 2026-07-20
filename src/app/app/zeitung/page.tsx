/* Copyright 2026 Elian Schock, Jonas Schwenk */
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Newspaper, PenLine } from "lucide-react";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { getStudentFeatures } from "@/lib/student-features";
import { AutoRefresh } from "@/components/app/AutoRefresh";
import { KATEGORIEN, kategorieInfo } from "./colors";
import { can } from "@/lib/permissions";

export const metadata: Metadata = { title: "Schülerzeitung | MasterMind" };
export const dynamic = "force-dynamic";

export default async function ZeitungPage({ searchParams }: { searchParams: Promise<{ rubrik?: string }> }) {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "student") redirect("/app");
  // Von der Schulleitung sperrbar
  if (!(await can(session, "student.newspaper"))) redirect("/app");
  if (!session.schoolId) redirect("/app");

  const { rubrik: rubrikRaw } = await searchParams;
  const rubrik = KATEGORIEN.some((k) => k.value === rubrikRaw) ? rubrikRaw : undefined;

  const [articles, features] = await Promise.all([
    prisma.newspaperArticle.findMany({
      where: { schoolId: session.schoolId, published: true, ...(rubrik ? { category: rubrik } : {}) },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    getStudentFeatures(session.userId),
  ]);
  const isEditor = features.includes("schuelerzeitung");

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      {/* Neue Artikel erscheinen ohne Neuladen */}
      <AutoRefresh seconds={20} />

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Schule</p>
          <h1 className="mt-1 flex items-center gap-2.5 text-3xl font-bold tracking-tight">
            <Newspaper className="size-7 text-brand" /> Schülerzeitung
          </h1>
        </div>
        {isEditor && (
          <Link
            href="/app/zeitung/neu"
            className="flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-brand-fg transition-all hover:brightness-105 active:scale-95"
          >
            <PenLine className="size-4" /> Neuer Artikel
          </Link>
        )}
      </header>

      {/* Rubrik-Filter */}
      <nav className="flex flex-wrap gap-2" aria-label="Rubriken">
        <Link href="/app/zeitung"
          className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors ${
            !rubrik ? "border-brand bg-brand text-brand-fg" : "border-border bg-surface text-muted-fg hover:text-fg"
          }`}>
          Alle
        </Link>
        {KATEGORIEN.map((k) => (
          <Link key={k.value} href={`/app/zeitung?rubrik=${k.value}`}
            className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors ${
              rubrik === k.value ? "border-brand bg-brand text-brand-fg" : "border-border bg-surface text-muted-fg hover:text-fg"
            }`}>
            {k.emoji} {k.label}
          </Link>
        ))}
      </nav>

      {articles.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-10 text-center text-muted-fg">
          <p className="text-3xl">📰</p>
          <p className="mt-2 font-semibold text-fg">Noch keine Artikel</p>
          <p className="mt-1 text-sm">
            {isEditor ? "Schreib den ersten Artikel deiner Schülerzeitung!" : "Die Redaktion arbeitet bestimmt schon an der ersten Ausgabe."}
          </p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          {articles.map((a, i) => {
            const accent = a.color ?? "#2a78d6";
            const big = i === 0; // neuester Artikel als Aufmacher
            return (
              <Link
                key={a.id}
                href={`/app/zeitung/${a.id}`}
                className={`group overflow-hidden rounded-2xl border border-border bg-surface transition-all hover:-translate-y-0.5 hover:shadow-md ${big ? "sm:col-span-2" : ""}`}
              >
                {a.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.coverUrl} alt="" className={`w-full object-cover ${big ? "h-56 sm:h-72" : "h-40"}`} />
                ) : (
                  <div className={`w-full ${big ? "h-24" : "h-16"}`} style={{ background: `linear-gradient(120deg, ${accent}33, ${accent}0d)` }} />
                )}
                <div className="p-5" style={{ borderTop: `3px solid ${accent}` }}>
                  {kategorieInfo(a.category) && (
                    <span className="mb-2 inline-block rounded-xl border border-border bg-bg px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-fg">
                      {kategorieInfo(a.category)!.emoji} {kategorieInfo(a.category)!.label}
                    </span>
                  )}
                  <h2 className={`font-bold leading-snug group-hover:underline ${big ? "text-2xl" : "text-lg"}`}>{a.title}</h2>
                  {a.subtitle && <p className="mt-1 text-sm text-muted-fg">{a.subtitle}</p>}
                  <p className="mt-3 text-xs text-muted-fg">
                    Von <span className="font-semibold text-fg">{a.authorName}</span>
                    {" · "}
                    {a.createdAt.toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
