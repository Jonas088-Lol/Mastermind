/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { LandingIcon } from "@/components/ui/LandingIcon";
import { Clock, FileText, Plus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { canUseOffice } from "@/lib/office";
import { createDocument, createDocumentFromTemplate } from "@/app/app/dokumente/actions";
import { DOCUMENT_TEMPLATES } from "@/app/app/dokumente/templates";


export async function DokumenteView({ basePath }: { basePath: string }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canUseOffice(effectiveRole(session))) redirect("/");

  const documents = await prisma.document.findMany({
    where: { userId: session.userId },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8">
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Office</p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Dokumente</h1>
          <p className="mt-1 text-sm text-muted-fg">Word-Alternative · Formeln · Auto-Speichern</p>
        </div>
        <form action={createDocument}>
          <button
            type="submit"
            className="flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-brand-fg transition-colors hover:bg-brand/90"
          >
            <Plus className="size-4" strokeWidth={2} />
            Neues Dokument
          </button>
        </form>
      </header>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-fg">
          Vorlagen
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {DOCUMENT_TEMPLATES.map((template) => (
            <form key={template.key} action={createDocumentFromTemplate.bind(null, template.key)}>
              <button
                type="submit"
                className="flex w-full items-start gap-3 rounded-2xl border border-border bg-surface p-4 text-left transition-colors hover:border-brand/50 hover:bg-bg"
              >
                <LandingIcon emoji={template.emoji} />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{template.name}</span>
                  <span className="mt-0.5 block text-xs text-muted-fg">
                    {template.description}
                  </span>
                </span>
              </button>
            </form>
          ))}
        </div>
      </section>

      {documents.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-border bg-bg px-8 py-16 text-center">
          <FileText className="mx-auto size-12 text-muted-fg" strokeWidth={1} />
          <p className="mt-4 font-semibold">Noch keine Dokumente</p>
          <p className="mt-1 text-sm text-muted-fg">
            Erstelle dein erstes Dokument mit dem Button oben.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {documents.map((doc) => (
            <Link
              key={doc.id}
              href={`${basePath}/dokumente/${doc.id}`}
              className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-bg transition-shadow hover:shadow-md"
            >
              {/* Paper preview */}
              <div className="relative flex h-40 flex-col overflow-hidden bg-white px-5 pb-3 pt-5">
                <div className="pointer-events-none absolute inset-x-5 bottom-3 flex flex-col gap-4 opacity-10">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-px bg-blue-400" />
                  ))}
                </div>
                <div className="pointer-events-none absolute bottom-0 left-14 top-0 w-px bg-red-300 opacity-20" />
                <p className="relative line-clamp-3 font-serif text-sm font-medium text-gray-800">
                  {doc.title}
                </p>
              </div>
              <div className="flex items-center gap-2 border-t border-border px-4 py-3">
                <FileText className="size-3.5 shrink-0 text-muted-fg" strokeWidth={1.75} />
                <p className="flex-1 truncate text-xs font-medium">{doc.title}</p>
                <span className="flex items-center gap-1 text-[11px] text-muted-fg">
                  <Clock className="size-3" strokeWidth={1.75} />
                  {doc.updatedAt.toLocaleDateString("de-DE", {
                    day: "2-digit",
                    month: "short",
                  })}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
