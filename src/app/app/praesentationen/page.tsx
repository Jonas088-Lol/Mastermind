import { Clock, Monitor, Plus } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { createPresentation, createPresentationFromTemplate } from "./actions";
import { PRESENTATION_TEMPLATES } from "./templates";

export const metadata: Metadata = { title: "Präsentationen · MasterMind" };

export default async function PraesentationenPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "student") redirect("/");

  const presentations = await prisma.presentation.findMany({
    where: { userId: session.userId },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8">
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Office</p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Präsentationen</h1>
          <p className="mt-1 text-sm text-muted-fg">PowerPoint-Alternative · Folien · Vollbild-Modus</p>
        </div>
        <form action={createPresentation}>
          <button
            type="submit"
            className="flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-brand-fg transition-colors hover:bg-brand/90"
          >
            <Plus className="size-4" strokeWidth={2} />
            Neue Präsentation
          </button>
        </form>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-muted-fg">
          Mit Vorlage starten
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {PRESENTATION_TEMPLATES.map((template) => (
            <form key={template.key} action={createPresentationFromTemplate.bind(null, template.key)}>
              <button
                type="submit"
                className="flex w-full flex-col items-start gap-1 rounded-2xl border border-border bg-surface px-4 py-4 text-left transition-colors hover:border-brand/50 hover:bg-bg"
              >
                <span className="text-2xl" aria-hidden>{template.emoji}</span>
                <span className="mt-1 text-sm font-semibold text-fg">{template.name}</span>
                <span className="text-[11px] text-muted-fg">
                  {template.slides.length} Folien · {template.description}
                </span>
              </button>
            </form>
          ))}
        </div>
      </section>

      {presentations.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-border bg-bg px-8 py-16 text-center">
          <Monitor className="mx-auto size-12 text-muted-fg" strokeWidth={1} />
          <p className="mt-4 font-semibold">Noch keine Präsentationen</p>
          <p className="mt-1 text-sm text-muted-fg">
            Erstelle deine erste Präsentation mit dem Button oben.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {presentations.map((pres) => {
            const slideCount = (() => {
              try { return (JSON.parse(pres.slides) as unknown[]).length; } catch { return 0; }
            })();

            return (
              <Link
                key={pres.id}
                href={`/app/praesentationen/${pres.id}`}
                className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-bg transition-shadow hover:shadow-md"
              >
                {/* Slide preview — 16:9 ratio */}
                <div className="relative aspect-[16/9] overflow-hidden bg-gradient-to-br from-brand/10 to-brand/5 flex items-center justify-center">
                  <div className="text-center px-4">
                    <p className="text-sm font-bold text-fg line-clamp-2">{pres.title}</p>
                    {slideCount > 0 && (
                      <p className="mt-1 text-[11px] text-muted-fg">{slideCount} Folie{slideCount !== 1 ? "n" : ""}</p>
                    )}
                  </div>
                  {/* Decoration: slide-like border */}
                  <div className="absolute inset-2 border border-brand/20 pointer-events-none" />
                </div>
                <div className="flex items-center gap-2 border-t border-border px-4 py-3">
                  <Monitor className="size-3.5 shrink-0 text-muted-fg" strokeWidth={1.75} />
                  <p className="flex-1 truncate text-xs font-medium">{pres.title}</p>
                  <span className="flex items-center gap-1 text-[11px] text-muted-fg">
                    <Clock className="size-3" strokeWidth={1.75} />
                    {pres.updatedAt.toLocaleDateString("de-DE", {
                      day: "2-digit",
                      month: "short",
                    })}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
