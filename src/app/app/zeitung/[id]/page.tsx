import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, MessageCircle, Trash2 } from "lucide-react";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { getStudentFeatures } from "@/lib/student-features";
import { addComment, deleteArticle, deleteComment, updateArticle } from "../actions";
import { ArticleForm } from "../ArticleForm";
import { kategorieInfo } from "../colors";
import { PrintArticleButton } from "./PrintArticleButton";

export const metadata: Metadata = { title: "Artikel | Schülerzeitung" };

export default async function ArtikelPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "student") redirect("/app");

  const { id } = await params;
  const { edit } = await searchParams;

  const article = await prisma.newspaperArticle.findUnique({ where: { id } });
  if (!article || article.schoolId !== session.schoolId || !article.published) notFound();

  const features = await getStudentFeatures(session.userId);
  const isAuthor = article.authorId === session.userId && features.includes("schuelerzeitung");
  const accent = article.color ?? "#2a78d6";
  const rubrik = kategorieInfo(article.category);

  const comments = await prisma.newspaperComment.findMany({
    where: { articleId: id },
    orderBy: { createdAt: "asc" },
    take: 200,
  });
  const role = effectiveRole(session);
  const isStaff = ["admin", "rector", "vice_rector", "super"].includes(role);

  if (edit === "1" && isAuthor) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <Link href={`/app/zeitung/${id}`} className="flex w-fit items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-fg hover:text-fg">
          <ArrowLeft className="size-3.5" /> Zurück zum Artikel
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Artikel bearbeiten</h1>
        <ArticleForm
          action={updateArticle.bind(null, id)}
          initial={{ title: article.title, subtitle: article.subtitle, content: article.content, color: article.color, coverUrl: article.coverUrl, category: article.category }}
          submitLabel="Änderungen speichern"
        />
      </div>
    );
  }

  return (
    <article className="print-article mx-auto flex max-w-2xl flex-col gap-6">
      <style>{`
        .print-only { display: none; }
        @media print {
          /* Nur den Artikel drucken: alles ausblenden, Artikel wieder einblenden */
          body * { visibility: hidden; }
          .print-article, .print-article * { visibility: visible; }
          .print-article {
            position: absolute;
            inset: 0 auto auto 0;
            width: 100%;
            max-width: none;
            margin: 0;
            padding: 0;
            color: #000;
            background: #fff;
          }
          .print-hidden, .print-hidden * { display: none !important; visibility: hidden !important; }
          .print-only { display: block; }
          .print-article h1, .print-article p { color: #000; }
          @page { margin: 2cm; }
        }
      `}</style>

      {/* Kopfzeile nur im Druck sichtbar */}
      <div className="print-only" style={{ borderBottom: "3px double #000", paddingBottom: "0.5rem" }}>
        <p style={{ fontSize: "1.75rem", fontWeight: 800, letterSpacing: "0.02em", margin: 0 }}>Schülerzeitung</p>
        <p style={{ fontSize: "0.8rem", margin: "0.25rem 0 0", display: "flex", justifyContent: "space-between" }}>
          <span>{rubrik ? `Rubrik: ${rubrik.label}` : "Artikel"}</span>
          <span>{article.createdAt.toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric" })}</span>
        </p>
      </div>

      <div className="print-hidden flex items-center justify-between gap-3">
        <Link href="/app/zeitung" className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-fg hover:text-fg">
          <ArrowLeft className="size-3.5" /> Schülerzeitung
        </Link>
        <div className="flex items-center gap-2">
          <PrintArticleButton />
          {isAuthor && (
            <>
            <Link href={`/app/zeitung/${id}?edit=1`} className="rounded-xl border border-border px-3 py-1.5 text-xs font-semibold hover:bg-surface">
              Bearbeiten
            </Link>
            <form action={deleteArticle.bind(null, id)}>
              <button type="submit" className="flex items-center gap-1.5 rounded-xl border border-danger/30 px-3 py-1.5 text-xs font-semibold text-danger hover:bg-danger/8">
                <Trash2 className="size-3" /> Löschen
              </button>
            </form>
            </>
          )}
        </div>
      </div>

      {article.coverUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={article.coverUrl} alt="" className="max-h-96 w-full rounded-2xl object-cover" />
      )}

      <header style={{ borderLeft: `4px solid ${accent}`, paddingLeft: "1rem" }}>
        {rubrik && (
          <span className="mb-2 inline-block rounded-xl border border-border bg-surface px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-fg">
            {rubrik.emoji} {rubrik.label}
          </span>
        )}
        <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl">{article.title}</h1>
        {article.subtitle && <p className="mt-2 text-lg text-muted-fg">{article.subtitle}</p>}
        <p className="mt-3 text-sm text-muted-fg">
          Von <span className="font-semibold text-fg">{article.authorName}</span>
          {" · "}
          {article.createdAt.toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric" })}
        </p>
      </header>

      <div className="space-y-4 text-[15px] leading-relaxed">
        {article.content.split(/\n{2,}/).map((para, i) => (
          <p key={i} className="whitespace-pre-line">{para}</p>
        ))}
      </div>

      {/* Kommentare */}
      <section className="print-hidden mt-2 flex flex-col gap-4 border-t border-border pt-6">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <MessageCircle className="size-5 text-brand" /> Kommentare
          <span className="text-sm font-semibold text-muted-fg">({comments.length})</span>
        </h2>

        {comments.length === 0 ? (
          <p className="text-sm text-muted-fg">Noch keine Kommentare — sei die/der Erste!</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {comments.map((c) => {
              const canDelete = c.userId === session.userId || article.authorId === session.userId || isStaff;
              return (
                <li key={c.id} className="rounded-xl border border-border bg-surface p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-xs text-muted-fg">
                      <span className="font-semibold text-fg">{c.userName}</span>
                      {" · "}
                      {c.createdAt.toLocaleString("de-DE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </p>
                    {canDelete && (
                      <form action={deleteComment.bind(null, c.id)}>
                        <button type="submit" aria-label="Kommentar löschen"
                          className="rounded-lg p-1 text-muted-fg transition-colors hover:text-danger">
                          <Trash2 className="size-3.5" />
                        </button>
                      </form>
                    )}
                  </div>
                  <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed">{c.text}</p>
                </li>
              );
            })}
          </ul>
        )}

        <form action={addComment.bind(null, id)} className="flex flex-col gap-2">
          <label htmlFor="comment-text" className="text-[10px] font-semibold uppercase tracking-wider text-muted-fg">
            Dein Kommentar
          </label>
          <textarea id="comment-text" name="text" required rows={3} maxLength={500}
            placeholder="Was denkst du über diesen Artikel?"
            className="resize-y rounded-xl border border-border bg-bg px-3 py-2.5 text-sm leading-relaxed focus:border-brand focus:outline-none" />
          <button type="submit"
            className="w-fit rounded-xl bg-brand px-4 py-2 text-sm font-bold text-brand-fg transition-all hover:brightness-105 active:scale-95">
            Kommentieren
          </button>
        </form>
      </section>
    </article>
  );
}
