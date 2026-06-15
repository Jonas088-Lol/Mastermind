import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { BookOpen, Plus, Languages, Target, Clock } from "lucide-react";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { createVocabList } from "./actions";

export const metadata: Metadata = { title: "Vokabeltrainer" };

const LANG_PAIRS = [
  { from: "Deutsch", to: "Englisch", icon: "🇩🇪→🇬🇧" },
  { from: "Deutsch", to: "Französisch", icon: "🇩🇪→🇫🇷" },
  { from: "Deutsch", to: "Spanisch", icon: "🇩🇪→🇪🇸" },
  { from: "Deutsch", to: "Latein", icon: "🇩🇪→🏛️" },
  { from: "Deutsch", to: "Italienisch", icon: "🇩🇪→🇮🇹" },
  { from: "Englisch", to: "Deutsch", icon: "🇬🇧→🇩🇪" },
];

const COLORS = ["#6366f1","#3b82f6","#10b981","#f59e0b","#ef4444","#ec4899","#8b5cf6"];

export default async function VokabelnPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "student") redirect("/");

  const lists = await prisma.vocabList.findMany({
    where: { userId: session.userId },
    include: {
      entries: {
        select: { id: true, nextReview: true, repetitions: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const now = new Date();

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <header className="flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">
          Spaced Repetition · SM-2
        </p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Vokabeltrainer</h1>
        <p className="text-sm text-muted-fg">
          Lerne Vokabeln mit wissenschaftlich fundierter Wiederholung — wie Anki, aber in deiner Schul-App.
        </p>
      </header>

      {/* Stats bar */}
      {lists.length > 0 && (
        <div className="grid grid-cols-3 gap-px border border-border bg-border">
          {[
            {
              label: "Listen",
              value: lists.length,
              icon: BookOpen,
              tone: "text-brand",
            },
            {
              label: "Vokabeln gesamt",
              value: lists.reduce((s, l) => s + l.entries.length, 0),
              icon: Languages,
              tone: "text-info",
            },
            {
              label: "Heute fällig",
              value: lists.reduce((s, l) => s + l.entries.filter(e => e.nextReview <= now).length, 0),
              icon: Clock,
              tone: "text-warning",
            },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-3 bg-bg p-4">
              <s.icon className={`size-5 shrink-0 ${s.tone}`} strokeWidth={1.75} />
              <div>
                <p className="font-mono text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-fg">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* New list form */}
        <details className="group">
          <summary className="flex min-h-44 cursor-pointer list-none flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border transition-all hover:border-brand hover:bg-brand/3">
            <div className="grid size-12 place-items-center rounded-xl border-2 border-border bg-surface text-muted-fg group-open:border-brand group-open:bg-brand group-open:text-brand-fg">
              <Plus className="size-5" strokeWidth={1.5} />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold">Neue Vokabelliste</p>
              <p className="text-xs text-muted-fg">Beliebige Sprachen & Fächer</p>
            </div>
          </summary>
          <form action={createVocabList} className="space-y-3 rounded-b-2xl border-2 border-t-0 border-brand/30 bg-bg p-4">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">Name *</label>
              <input name="title" required placeholder="z. B. Englisch Unit 4" className="h-9 w-full border border-border bg-surface px-3 text-sm focus:border-brand focus:outline-none" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">Von</label>
                <select name="langFrom" className="h-9 w-full border border-border bg-surface px-2 text-sm focus:border-brand focus:outline-none">
                  {["Deutsch","Englisch","Französisch","Spanisch","Latein","Italienisch"].map(l => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">Nach</label>
                <select name="langTo" className="h-9 w-full border border-border bg-surface px-2 text-sm focus:border-brand focus:outline-none">
                  {["Englisch","Deutsch","Französisch","Spanisch","Latein","Italienisch"].map(l => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">Farbe</label>
              <div className="flex gap-1.5">
                {COLORS.map((c, i) => (
                  <label key={c} className="cursor-pointer">
                    <input type="radio" name="color" value={c} defaultChecked={i === 0} className="peer sr-only" />
                    <span className="block size-6 ring-offset-1 transition-all peer-checked:ring-2 peer-checked:ring-brand" style={{ backgroundColor: c }} />
                  </label>
                ))}
              </div>
            </div>
            <button type="submit" className="w-full bg-fg py-2 text-sm font-semibold text-bg hover:opacity-90">
              Liste erstellen
            </button>
          </form>
        </details>

        {/* Existing lists */}
        {lists.map((list) => {
          const total   = list.entries.length;
          const due     = list.entries.filter(e => e.nextReview <= now).length;
          const mastered = list.entries.filter(e => e.repetitions >= 3).length;
          const pct     = total > 0 ? Math.round((mastered / total) * 100) : 0;

          return (
            <Link
              key={list.id}
              href={`/app/vokabeln/${list.id}`}
              className="group flex flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-bg transition-shadow hover:shadow-md"
            >
              {/* Header strip */}
              <div className="flex items-center justify-between px-4 py-3" style={{ backgroundColor: list.color + "22", borderBottom: `2px solid ${list.color}40` }}>
                <div>
                  <p className="font-bold text-fg">{list.title}</p>
                  <p className="text-xs text-muted-fg">{list.langFrom} → {list.langTo}</p>
                </div>
                {due > 0 && (
                  <span className="shrink-0 border border-warning/40 bg-warning/10 px-2 py-0.5 font-mono text-xs font-bold text-warning">
                    {due} fällig
                  </span>
                )}
              </div>

              <div className="flex flex-1 flex-col gap-3 p-4">
                <div className="flex items-center gap-3 text-xs text-muted-fg">
                  <span className="flex items-center gap-1"><Languages className="size-3" /> {total} Vokabeln</span>
                  <span className="flex items-center gap-1"><Target className="size-3" /> {mastered} gemeistert</span>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-muted-fg">
                    <span>Fortschritt</span>
                    <span className="font-mono">{pct}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-border">
                    <div className="h-full transition-all" style={{ width: `${pct}%`, backgroundColor: list.color }} />
                  </div>
                </div>

                {total === 0 ? (
                  <p className="text-xs text-muted-fg italic">Noch keine Vokabeln</p>
                ) : (
                  <p className="text-xs text-muted-fg">
                    {due > 0 ? `${due} Vokabeln warten auf Wiederholung` : "Alle Vokabeln erledigt ✓"}
                  </p>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
