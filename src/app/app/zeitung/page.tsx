import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Newspaper, PenLine } from "lucide-react";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { getStudentFeatures } from "@/lib/student-features";
import { AutoRefresh } from "@/components/app/AutoRefresh";

export const metadata: Metadata = { title: "Schülerzeitung | MasterMind" };
export const dynamic = "force-dynamic";

export default async function ZeitungPage() {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "student") redirect("/app");
  if (!session.schoolId) redirect("/app");

  const [articles, features] = await Promise.all([
    prisma.newspaperArticle.findMany({
      where: { schoolId: session.schoolId, published: true },
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
