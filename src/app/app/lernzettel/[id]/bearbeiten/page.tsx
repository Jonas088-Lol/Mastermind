/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { updateWikiEntry } from "../../actions";
import { canManageSchool } from "@/lib/school-admin";

interface Props {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = { title: "Lernzettel bearbeiten" };

export default async function BearbeitenPage({ params }: Props) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect("/login");

  const entry = await prisma.schoolWikiEntry.findUnique({ where: { id } });
  if (!entry || entry.schoolId !== session.schoolId) notFound();

  const role = effectiveRole(session);
  const canEdit = entry.authorId === session.userId || canManageSchool(role) || role === "teacher";
  if (!canEdit) redirect(`/app/lernzettel/${id}`);

  const action = updateWikiEntry.bind(null, id);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link href={`/app/lernzettel/${id}`} className="flex size-8 items-center justify-center rounded-lg text-muted-fg hover:bg-muted transition-colors">
          <ArrowLeft className="size-4" />
        </Link>
        <h1 className="text-2xl font-bold">Lernzettel bearbeiten</h1>
      </div>

      <form action={action} className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-muted-fg">Titel *</label>
          <input
            name="title"
            required
            defaultValue={entry.title}
            className="rounded-xl border border-border bg-surface px-4 py-3 text-base placeholder:text-muted-fg focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>

        <div className="flex gap-4">
          <div className="flex flex-1 flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted-fg">Fach (optional)</label>
            <input
              name="subject"
              defaultValue={entry.subject ?? ""}
              placeholder="z.B. Biologie"
              className="rounded-xl border border-border bg-surface px-4 py-2.5 text-sm placeholder:text-muted-fg focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted-fg">Tags (komma-getrennt)</label>
            <input
              name="tags"
              defaultValue={entry.tags}
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
            defaultValue={entry.content}
            className="rounded-xl border border-border bg-surface px-4 py-3 text-sm leading-relaxed placeholder:text-muted-fg focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand resize-y font-mono"
          />
        </div>

        <div className="flex items-center justify-between">
          <Link href={`/app/lernzettel/${id}`} className="rounded-xl border border-border px-5 py-2.5 text-sm font-semibold hover:bg-muted transition-colors">
            Abbrechen
          </Link>
          <button
            type="submit"
            className="rounded-xl bg-brand px-6 py-2.5 text-sm font-semibold text-brand-fg transition-opacity hover:opacity-90"
          >
            Speichern
          </button>
        </div>
      </form>
    </div>
  );
}
