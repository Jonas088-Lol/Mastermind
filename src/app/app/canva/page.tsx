import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Pencil, Plus, Trash2, Globe, Lock } from "lucide-react";
import { prisma } from "@/lib/db/client";
import { getSession } from "@/lib/session";
import { saveCanvaEmbed, deleteCanvaEmbed } from "./actions";
import { CanvaViewer } from "./CanvaViewer";

export const metadata: Metadata = { title: "Canva" };

export default async function CanvaPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const embeds = await prisma.canvaEmbed.findMany({
    where: {
      OR: [
        { userId: session.userId },
        ...(session.schoolId ? [{ schoolId: session.schoolId, isPublic: true }] : []),
      ],
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <header className="flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Design</p>
          <h1 className="mt-1 flex items-center gap-3 text-3xl font-bold tracking-tight sm:text-4xl">
            <Pencil className="size-7 text-brand" strokeWidth={1.5} />
            Canva
          </h1>
          <p className="mt-1 text-sm text-muted-fg">{embeds.length} gespeicherte Designs</p>
        </div>
      </header>

      {/* Add embed form */}
      <details className="group rounded-2xl border border-border bg-surface">
        <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-4 font-semibold text-sm select-none">
          <Plus className="size-4 text-brand transition-transform group-open:rotate-45" />
          Canva-Design hinzufügen
        </summary>
        <form action={saveCanvaEmbed} className="flex flex-col gap-4 border-t border-border px-5 pb-5 pt-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted-fg">Titel</label>
            <input
              name="title"
              placeholder="z.B. Biologie Präsentation – Zellstruktur"
              required
              className="rounded-xl border border-border bg-bg px-3 py-2 text-sm placeholder:text-muted-fg focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted-fg">Canva-Link (Share- oder Embed-URL)</label>
            <input
              name="embedUrl"
              type="url"
              placeholder="https://www.canva.com/design/..."
              required
              className="rounded-xl border border-border bg-bg px-3 py-2 text-sm placeholder:text-muted-fg focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" name="isPublic" className="rounded" />
            Für alle Schulnutzer sichtbar
          </label>
          <button
            type="submit"
            className="self-start rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-brand-fg transition-opacity hover:opacity-90"
          >
            Speichern
          </button>
        </form>
      </details>

      {/* Embed grid */}
      {embeds.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-muted-fg">
          <Pencil className="size-10" strokeWidth={1.5} />
          <p className="text-sm">Noch keine Canva-Designs gespeichert</p>
          <p className="text-xs">Füge oben einen Canva-Link hinzu, um es hier einzubetten.</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {embeds.map((e) => (
            <div key={e.id} className="flex flex-col rounded-2xl border border-border bg-surface overflow-hidden">
              <CanvaViewer embedUrl={e.embedUrl} title={e.title} />
              <div className="flex items-center gap-2 border-t border-border px-4 py-3">
                <p className="flex-1 truncate text-sm font-semibold">{e.title}</p>
                {e.isPublic ? (
                  <span title="Schulweit sichtbar"><Globe className="size-3.5 shrink-0 text-green-500" /></span>
                ) : (
                  <span title="Privat"><Lock className="size-3.5 shrink-0 text-muted-fg" /></span>
                )}
                {e.userId === session.userId && (
                  <form action={async () => { "use server"; await deleteCanvaEmbed(e.id); }}>
                    <button
                      type="submit"
                      className="flex size-7 items-center justify-center rounded-lg text-muted-fg hover:bg-danger/10 hover:text-danger transition-colors"
                      title="Löschen"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </form>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
