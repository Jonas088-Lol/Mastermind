/* Copyright 2026 Elian Schock, Jonas Schwenk */
import {
  ArrowRight,
  Brain,
  Clock,
  Flame,
  Layers,
  Plus,
  Sparkles,
  Target,
  Trophy,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { ImportDeckForm } from "./ImportDeckForm";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Karteikarten" };

export default async function KarteikartenPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "student") redirect("/");

  const [decks, userRow] = await Promise.all([
    prisma.flashcardDeck.findMany({
      where: { userId: session.userId },
      include: {
        subject: { select: { name: true, shortName: true, color: true } },
        cards: {
          select: { id: true, nextReviewAt: true, repetitions: true, easeFactor: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.user.findUnique({
      where: { id: session.userId },
      select: { streak: true },
    }),
  ]);

  const now = new Date();

  const deckStats = decks.map((deck) => {
    const total = deck.cards.length;
    const mastered = deck.cards.filter((c) => c.repetitions >= 3).length;
    const due = deck.cards.filter((c) => c.nextReviewAt <= now).length;
    const nextDue = deck.cards
      .filter((c) => c.nextReviewAt > now)
      .sort((a, b) => a.nextReviewAt.getTime() - b.nextReviewAt.getTime())[0]?.nextReviewAt;
    return { ...deck, total, mastered, due, nextDue };
  });

  const totalDue = deckStats.reduce((s, d) => s + d.due, 0);
  const totalCards = deckStats.reduce((s, d) => s + d.total, 0);
  const totalMastered = deckStats.reduce((s, d) => s + d.mastered, 0);

  const allCards = decks.flatMap((d) => d.cards);
  const accuracyCards = allCards.filter((c) => c.repetitions > 0);
  const goodCards = accuracyCards.filter((c) => c.easeFactor >= 2.0).length;
  const accuracy =
    accuracyCards.length > 0 ? Math.round((goodCards / accuracyCards.length) * 100) : null;

  const streak = userRow?.streak ?? 0;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">
            Spaced Repetition · SM-2-Algorithmus
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Karteikarten</h1>
          <p className="mt-1 text-sm text-muted-fg">
            {totalDue > 0 ? (
              <>
                <span className="font-semibold text-fg">{totalDue} Karten heute fällig</span> ·{" "}
                10 Minuten reichen für deine Streak.
              </>
            ) : (
              <span className="text-success font-semibold">Alle Karten erledigt für heute!</span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/app/karteikarten/neu" className={buttonVariants({ variant: "outline", size: "sm" })}>
            <Plus className="size-3.5" />
            Neues Deck
          </Link>
          <Link href="/app/karteikarten/aus-pdf" className={buttonVariants({ variant: "outline", size: "sm" })}>
            <Sparkles className="size-3.5" />
            Aus PDF generieren
          </Link>
          <ImportDeckForm />
        </div>
      </header>

      <section className="grid grid-cols-2 gap-px border border-border bg-border lg:grid-cols-4">
        {[
          {
            label: "Streak",
            value: String(streak),
            suffix: streak === 1 ? "Tag" : "Tage",
            icon: Flame,
            tone: streak > 0 ? "text-warning" : "text-muted-fg",
          },
          {
            label: "Heute fällig",
            value: String(totalDue),
            suffix: totalDue === 1 ? "Karte" : "Karten",
            icon: Clock,
            tone: totalDue > 0 ? "text-brand" : "text-success",
          },
          {
            label: "Gemeistert",
            value: String(totalMastered),
            suffix: `von ${totalCards}`,
            icon: Trophy,
            tone: "text-success",
          },
          {
            label: "Qualität",
            value: accuracy !== null ? `${accuracy}%` : "—",
            suffix: accuracy !== null ? "Ease ≥ 2,0" : "noch keine Daten",
            icon: Target,
            tone: accuracy !== null && accuracy >= 70 ? "text-success" : "text-warning",
          },
        ].map((s) => (
          <div key={s.label} className="bg-bg p-5">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">{s.label}</p>
              <s.icon className={cn("size-4", s.tone)} strokeWidth={1.75} />
            </div>
            <p className="mt-3 font-mono text-3xl font-bold tracking-tight">
              {s.value}
              <span className="ml-2 align-baseline text-xs font-medium text-muted-fg">{s.suffix}</span>
            </p>
          </div>
        ))}
      </section>

      {totalDue > 0 && (
        <section className="border border-brand/40 bg-gradient-to-r from-brand/8 to-transparent">
          <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="grid size-12 shrink-0 place-items-center bg-brand text-brand-fg">
                <Brain className="size-5" strokeWidth={1.75} />
              </div>
              <div>
                <p className="text-base font-semibold leading-snug">
                  Heutige Lernsession · {totalDue} {totalDue === 1 ? "Karte" : "Karten"}
                </p>
                <p className="mt-1 text-sm text-muted-fg">
                  {deckStats
                    .filter((d) => d.due > 0)
                    .map((d) => `${d.due} × ${d.name}`)
                    .join(" · ")}
                </p>
              </div>
            </div>
            <Link href="/app/karteikarten/session" className={buttonVariants({ size: "lg", className: "sm:shrink-0" })}>
              Session starten
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </section>
      )}

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-fg">Deine Decks</h2>
          <span className="font-mono text-xs text-muted-fg">{decks.length} aktiv</span>
        </div>

        {decks.length === 0 ? (
          <div className="border border-dashed border-border p-12 text-center">
            <Layers className="mx-auto size-8 text-muted-fg" strokeWidth={1.5} />
            <p className="mt-4 text-base font-semibold">Noch keine Decks</p>
            <p className="mt-1 text-sm text-muted-fg">
              Erstelle dein erstes Karteideck oder lass die KI eines generieren.
            </p>
          </div>
        ) : (
          <div className="grid gap-px border border-border bg-border md:grid-cols-2">
            {deckStats.map((deck) => {
              const pct = deck.total > 0 ? Math.round((deck.mastered / deck.total) * 100) : 0;
              const nextDueLabel = deck.due > 0
                ? `${deck.due} ${deck.due === 1 ? "Karte" : "Karten"} fällig`
                : deck.nextDue
                ? `Nächste: ${formatNextDue(deck.nextDue, now)}`
                : "Alle gemeistert";

              return (
                <Link
                  key={deck.id}
                  href={`/app/karteikarten/${deck.id}`}
                  className="group flex flex-col gap-4 bg-bg p-5 transition-colors hover:bg-surface"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div
                      className="grid size-10 shrink-0 place-items-center text-white"
                      style={{ backgroundColor: deck.subject?.color ?? "#6366f1" }}
                    >
                      <Layers className="size-4" strokeWidth={1.75} />
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {deck.subject && (
                        <Badge variant="outline">{deck.subject.shortName}</Badge>
                      )}
                      {deck.due > 0 && (
                        <Badge variant="brand">{deck.due} fällig</Badge>
                      )}
                      {deck.due === 0 && deck.total > 0 && (
                        <Badge variant="success">Erledigt</Badge>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-base font-bold tracking-tight">{deck.name}</h3>
                    <p className="mt-1 text-xs text-muted-fg">{deck.total} Karten</p>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-baseline justify-between text-xs">
                      <span className="text-muted-fg">Fortschritt (rep ≥ 3)</span>
                      <span className="font-mono">
                        <span className="font-bold">{deck.mastered}</span>
                        <span className="text-muted-fg"> / {deck.total}</span>
                        <span className="ml-2 text-muted-fg">{pct}%</span>
                      </span>
                    </div>
                    <Progress
                      value={pct}
                      tone={pct >= 80 ? "success" : pct >= 40 ? "brand" : "warning"}
                    />
                  </div>

                  <div className="flex items-center justify-between border-t border-border pt-3">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-muted-fg">
                      {nextDueLabel}
                    </span>
                    <span className="flex items-center gap-1 text-xs font-medium text-muted-fg transition-colors group-hover:text-brand">
                      Lernen
                      <ArrowRight className="size-3.5" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function formatNextDue(date: Date, now: Date): string {
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "heute";
  if (diffDays === 1) return "morgen";
  if (diffDays < 7) return `in ${diffDays} Tagen`;
  return date.toLocaleDateString("de-DE", { day: "numeric", month: "short" });
}
