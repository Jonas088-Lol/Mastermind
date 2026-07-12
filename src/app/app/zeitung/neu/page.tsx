/* Copyright 2026 Elian Schock, Jonas Schwenk */
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { effectiveRole, getSession } from "@/lib/session";
import { getStudentFeatures } from "@/lib/student-features";
import { createArticle } from "../actions";
import { ArticleForm } from "../ArticleForm";

export const metadata: Metadata = { title: "Neuer Artikel | Schülerzeitung" };

export default async function NeuerArtikelPage() {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "student") redirect("/app");
  const features = await getStudentFeatures(session.userId);
  if (!features.includes("schuelerzeitung")) redirect("/app/zeitung");

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <Link href="/app/zeitung" className="flex w-fit items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-fg hover:text-fg">
        <ArrowLeft className="size-3.5" /> Zur Zeitung
      </Link>
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Schülerzeitung · Redaktion</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Neuer Artikel</h1>
      </header>
      <ArticleForm action={createArticle} submitLabel="Artikel veröffentlichen" />
    </div>
  );
}
