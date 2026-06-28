import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/session";
import { createWikiEntry } from "../actions";

export const metadata: Metadata = { title: "Neuer Lernzettel" };

export default async function NeuLernzettelPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!session.schoolId) redirect("/app");

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link href="/app/lernzettel" className="flex size-8 items-center justify-center rounded-lg text-muted-fg hover:bg-muted transition-colors">
          <ArrowLeft className="size-4" />
        </Link>
        <h1 className="text-2xl font-bold">Neuer Lernzettel</h1>
      </div>

      <form action={createWikiEntry} className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-muted-fg">Titel *</label>
          <input
            name="title"
            required
            placeholder="z.B. Photosynthese – Grundlagen"
            className="rounded-xl border border-border bg-surface px-4 py-3 text-base placeholder:text-muted-fg focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>

        <div className="flex gap-4">
          <div className="flex flex-1 flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted-fg">Fach (optional)</label>
            <input
              name="subject"
              placeholder="z.B. Biologie"
              className="rounded-xl border border-border bg-surface px-4 py-2.5 text-sm placeholder:text-muted-fg focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted-fg">Tags (komma-getrennt)</label>
            <input
              name="tags"
              placeholder="z.B. Klausur, Zelle, Energie"
              className="rounded-xl border border-border bg-surface px-4 py-2.5 text-sm placeholder:text-muted-fg focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-muted-fg">Inhalt</label>
          <textarea
            name="content"
            rows={18}
            placeholder="Schreibe hier deinen Lernzettel…&#10;&#10;Tipp: Du kannst Überschriften mit # markieren, Listen mit - beginnen."
            className="rounded-xl border border-border bg-surface px-4 py-3 text-sm leading-relaxed placeholder:text-muted-fg focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand resize-y font-mono"
          />
        </div>

        <div className="flex items-center justify-between">
          <Link href="/app/lernzettel" className="rounded-xl border border-border px-5 py-2.5 text-sm font-semibold hover:bg-muted transition-colors">
            Abbrechen
          </Link>
          <button
            type="submit"
            className="rounded-xl bg-brand px-6 py-2.5 text-sm font-semibold text-brand-fg transition-opacity hover:opacity-90"
          >
            Veröffentlichen
          </button>
        </div>
      </form>
    </div>
  );
}
