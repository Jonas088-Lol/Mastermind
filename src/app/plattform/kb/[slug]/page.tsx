import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getSession, isSuper } from "@/lib/session";
import { ARTICLES, getArticle } from "../articles";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return ARTICLES.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticle(slug);
  return { title: article ? `${article.title} · KB` : "Artikel · KB" };
}

export default async function KbArticlePage({ params }: Props) {
  const session = await getSession();
  if (!session || !isSuper(session)) redirect("/login");

  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) notFound();

  const catArticles = ARTICLES.filter((a) => a.category === article.category && a.slug !== slug);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <header className="flex flex-col gap-2">
        <Link
          href="/plattform/kb"
          className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-muted-fg hover:text-fg"
        >
          <ArrowLeft className="size-3.5" />
          Knowledge Base
        </Link>
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-fg">
            {article.category}
          </span>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">{article.title}</h1>
          <p className="mt-1 text-sm text-muted-fg">{article.summary}</p>
        </div>
      </header>

      <div className="flex flex-col gap-6">
        {article.sections.map((section) => (
          <section key={section.heading} className="border border-border bg-bg p-5">
            <h2 className="mb-2 text-sm font-bold">{section.heading}</h2>
            <p className="text-sm leading-relaxed text-muted-fg">{section.body}</p>
          </section>
        ))}
      </div>

      {catArticles.length > 0 && (
        <div className="border-t border-border pt-6">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-fg">
            Weitere Artikel in „{article.category}"
          </p>
          <ul className="flex flex-col gap-2">
            {catArticles.map((a) => (
              <li key={a.slug}>
                <Link
                  href={`/plattform/kb/${a.slug}`}
                  className="flex items-center gap-2 text-sm font-medium text-brand hover:underline"
                >
                  → {a.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
