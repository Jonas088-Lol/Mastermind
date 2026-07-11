import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { getStudentFeatures } from "@/lib/student-features";
import { deleteArticle, updateArticle } from "../actions";
import { ArticleForm } from "../ArticleForm";

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

  if (edit === "1" && isAuthor) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <Link href={`/app/zeitung/${id}`} className="flex w-fit items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-fg hover:text-fg">
          <ArrowLeft className="size-3.5" /> Zurück zum Artikel
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Artikel bearbeiten</h1>
        <ArticleForm
          action={updateArticle.bind(null, id)}
          initial={{ title: article.title, subtitle: article.subtitle, content: article.content, color: article.color, coverUrl: article.coverUrl }}
          submitLabel="Änderungen speichern"
        />
      </div>
    );
  }

  return (
    <article className="mx-auto flex max-w-2xl flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <Link href="/app/zeitung" className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-fg hover:text-fg">
          <ArrowLeft className="size-3.5" /> Schülerzeitung
        </Link>
        {isAuthor && (
          <div className="flex items-center gap-2">
            <Link href={`/app/zeitung/${id}?edit=1`} className="rounded-xl border border-border px-3 py-1.5 text-xs font-semibold hover:bg-surface">
              Bearbeiten
            </Link>
            <form action={deleteArticle.bind(null, id)}>
              <button type="submit" className="flex items-center gap-1.5 rounded-xl border border-danger/30 px-3 py-1.5 text-xs font-semibold text-danger hover:bg-danger/8">
                <Trash2 className="size-3" /> Löschen
              </button>
            </form>
          </div>
        )}
      </div>

      {article.coverUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={article.coverUrl} alt="" className="max-h-96 w-full rounded-2xl object-cover" />
      )}

      <header style={{ borderLeft: `4px solid ${accent}`, paddingLeft: "1rem" }}>
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
    </article>
  );
}
