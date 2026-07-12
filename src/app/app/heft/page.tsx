/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { BookOpen, Copy, Plus, FileText } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { createNotebook, duplicateNotebook } from "./actions";

export const metadata: Metadata = { title: "Meine Hefte" };

const PRESET_COLORS = [
  { color: "#6366f1", label: "Violett" },
  { color: "#3b82f6", label: "Blau" },
  { color: "#10b981", label: "Grün" },
  { color: "#f59e0b", label: "Gelb" },
  { color: "#ef4444", label: "Rot" },
  { color: "#ec4899", label: "Pink" },
  { color: "#8b5cf6", label: "Lila" },
  { color: "#f97316", label: "Orange" },
  { color: "#6b7280", label: "Grau" },
];

export default async function HeftPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "student") redirect("/");

  // Fetch real school subjects for this student's class
  const [notebooks, classSubjects] = await Promise.all([
    prisma.notebook.findMany({
      where: { userId: session.userId },
      include: {
        pages: {
          select: { id: true, title: true, updatedAt: true },
          orderBy: { order: "asc" },
        },
      },
      orderBy: { updatedAt: "desc" },
    }),
    session.classId
      ? prisma.teacherSubjectClass.findMany({
          where: { classId: session.classId },
          include: { subject: { select: { name: true, color: true, shortName: true } } },
          distinct: ["subjectId"],
        })
      : Promise.resolve([]),
  ]);

  const subjects = classSubjects.map((tsc) => tsc.subject);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8">
      {/* Header */}
      <header className="flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">
          Digitale Hefte
        </p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Meine Hefte</h1>
        <p className="text-sm text-muted-fg">
          Schreibe wie in Word · Mathe-Formeln · Zeichnen · Auto-Speichern
        </p>
      </header>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {/* ── Neues Heft Karte ───────────────────────────────── */}
        <div className="col-span-full sm:col-span-1">
          <details className="group h-full">
            <summary className="flex h-full min-h-50 cursor-pointer list-none flex-col items-center justify-center gap-3 border-2 border-dashed border-border bg-bg transition-all hover:border-brand hover:bg-brand/3">
              <div className="grid size-14 place-items-center border-2 border-border bg-surface text-muted-fg transition-colors group-open:border-brand group-open:bg-brand group-open:text-brand-fg">
                <Plus className="size-6" strokeWidth={1.5} />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold">Neues Heft</p>
                <p className="text-xs text-muted-fg">Für ein Fach anlegen</p>
              </div>
            </summary>

            {/* Create form */}
            <form
              action={createNotebook}
              className="mt-0 space-y-4 border-2 border-t-0 border-brand/30 bg-bg p-5"
            >
              {/* Subject quick-pick */}
              {subjects.length > 0 && (
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">
                    Fach wählen
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {subjects.map((s) => (
                      <label key={s.name} className="cursor-pointer">
                        <input
                          type="radio"
                          name="subject"
                          value={s.name}
                          className="peer sr-only"
                        />
                        <span
                          className="inline-flex items-center gap-1 border border-border px-2.5 py-1 text-xs font-semibold transition-all peer-checked:border-transparent peer-checked:text-white"
                          style={{
                            // @ts-expect-error CSS variable
                            "--subj-color": s.color,
                          }}
                        >
                          <span
                            className="peer-checked:text-white"
                            style={{ color: s.color }}
                          >
                            {s.shortName}
                          </span>
                          {s.name}
                        </span>
                      </label>
                    ))}
                    <label className="cursor-pointer">
                      <input type="radio" name="subject" value="" className="peer sr-only" defaultChecked />
                      <span className="inline-flex items-center border border-border px-2.5 py-1 text-xs font-semibold text-muted-fg transition-all peer-checked:border-fg peer-checked:bg-fg peer-checked:text-bg">
                        Kein Fach
                      </span>
                    </label>
                  </div>
                </div>
              )}

              {/* Title */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">
                  Heft-Name *
                </label>
                <input
                  name="title"
                  required
                  placeholder="z. B. Mathe Klasse 9 · Algebra"
                  className="h-9 w-full border border-border bg-surface px-3 text-sm focus:border-brand focus:outline-none"
                />
              </div>

              {/* Color */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">
                  Einbandfarbe
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_COLORS.map((p, i) => (
                    <label key={p.color} className="cursor-pointer" title={p.label}>
                      <input
                        type="radio"
                        name="color"
                        value={p.color}
                        defaultChecked={i === 0}
                        className="peer sr-only"
                      />
                      <span
                        className="block size-6 ring-offset-1 transition-all peer-checked:ring-2 peer-checked:ring-brand"
                        style={{ backgroundColor: p.color }}
                      />
                    </label>
                  ))}
                </div>
              </div>

              {/* Icon — hidden, always 📓 */}
              <input type="hidden" name="icon" value="📓" />

              <button
                type="submit"
                className="w-full bg-fg py-2 text-sm font-semibold text-bg transition-opacity hover:opacity-90"
              >
                Heft erstellen
              </button>
            </form>
          </details>
        </div>

        {/* ── Vorhandene Hefte ────────────────────────────────── */}
        {notebooks.map((nb) => {
          const firstPage = nb.pages[0];
          const pageCount = nb.pages.length;
          const lastEdit = nb.pages.reduce(
            (l, p) => (p.updatedAt > l ? p.updatedAt : l),
            nb.updatedAt
          );
          const href = firstPage
            ? `/app/heft/${nb.id}/${firstPage.id}`
            : `/app/heft`;

          return (
            <div
              key={nb.id}
              className="group relative flex flex-col overflow-hidden border border-border bg-bg transition-shadow hover:shadow-md"
            >
              {/* Heft duplizieren (Hover) */}
              <form
                action={duplicateNotebook.bind(null, nb.id)}
                className="absolute right-2 top-2 z-10 hidden group-hover:block"
              >
                <button
                  type="submit"
                  className="grid size-7 place-items-center border border-white/40 bg-black/25 text-white transition-colors hover:bg-black/45"
                  title="Heft duplizieren"
                >
                  <Copy className="size-3.5" strokeWidth={1.75} />
                </button>
              </form>

            <Link
              href={href}
              className="flex flex-1 flex-col"
            >
              {/* Heft-Einband (farbiger Bereich oben) */}
              <div
                className="relative flex min-h-27.5 flex-col justify-end px-4 pb-3 pt-4"
                style={{ backgroundColor: nb.color }}
              >
                {/* Heft-Linien-Dekoration */}
                <div className="pointer-events-none absolute inset-0 flex flex-col justify-end gap-2.5 px-4 pb-3 opacity-20">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-px w-full bg-white" />
                  ))}
                </div>
                {/* Heft-Bindung links */}
                <div className="absolute left-0 top-0 h-full w-3 bg-black/20" />
                <div className="absolute left-3 top-0 h-full w-px bg-white/30" />

                <p className="relative truncate text-base font-bold text-white drop-shadow">
                  {nb.title}
                </p>
                {nb.subject && (
                  <p className="relative text-xs text-white/80">{nb.subject}</p>
                )}
              </div>

              {/* Seiten-Vorschau */}
              <div className="flex flex-1 flex-col justify-between p-4">
                <ul className="space-y-1">
                  {nb.pages.slice(0, 4).map((p) => (
                    <li key={p.id} className="flex items-center gap-2 text-xs text-muted-fg">
                      <FileText className="size-3 shrink-0" strokeWidth={1.75} />
                      <span className="truncate">{p.title}</span>
                    </li>
                  ))}
                  {pageCount > 4 && (
                    <li className="text-xs text-muted-fg">
                      + {pageCount - 4} weitere Seiten
                    </li>
                  )}
                </ul>

                <div className="mt-3 border-t border-border pt-3">
                  <span className="flex items-center gap-1 text-[11px] text-muted-fg">
                    <BookOpen className="size-3 shrink-0" strokeWidth={1.75} />
                    <span className="truncate">
                      {pageCount} {pageCount === 1 ? "Seite" : "Seiten"} · zuletzt bearbeitet am{" "}
                      {lastEdit.toLocaleDateString("de-DE", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })}
                    </span>
                  </span>
                </div>
              </div>
            </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
