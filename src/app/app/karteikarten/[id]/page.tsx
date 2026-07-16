/* Copyright 2026 Elian Schock, Jonas Schwenk */
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, ArrowRight, BarChart3, Layers } from "lucide-react";
import { ExportDeckButton } from "./ExportDeckButton";
import { FlashcardModes } from "./FlashcardModes";
import { AddCardForm } from "./AddCardForm";
import { DeleteCardButton } from "./DeleteCardButton";
import { DeleteDeckButton } from "./DeleteDeckButton";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { cn } from "@/lib/utils";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const deck = await prisma.flashcardDeck.findUnique({
    where: { id },
    select: { name: true },
  });
  return { title: deck?.name ?? "Deck" };
}

export default async function DeckDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "student") redirect("/");

  const deck = await prisma.flashcardDeck.findUnique({
    where: { id },
    include: {
      subject: { select: { name: true, shortName: true, color: true } },
      cards: {
        orderBy: { nextReviewAt: "asc" },
      },
    },
  });

  if (!deck || deck.userId !== session.userId) {
    redirect("/app/karteikarten");
  }

  const now = new Date();
  const total = deck.cards.length;
  const mastered = deck.cards.filter((c) => c.repetitions >= 3).length;
  const due = deck.cards.filter((c) => c.nextReviewAt <= now).length;
  const pct = total > 0 ? Math.round((mastered / total) * 100) : 0;

  const avgRepetitions =
    total > 0
      ? (deck.cards.reduce((s, c) => s + c.repetitions, 0) / total).toFixed(1)
      : null;
  const streakCard =
    total > 0
      ? deck.cards.reduce((best, c) => (c.repetitions > best.repetitions ? c : best), deck.cards[0])
      : null;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      {/* Back link */}
      <div>
        <Link
          href="/app/karteikarten"
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-ml-2")}
        >
          <ArrowLeft className="size-3.5" />
          Zurück zu Karteikarten
        </Link>
      </div>

      {/* Deck header */}
      <header className="flex flex-col gap-4">
        <div className="flex items-start gap-4">
          <div
            className="grid size-12 shrink-0 place-items-center text-white"
            style={{ backgroundColor: deck.subject?.color ?? "#6366f1" }}
          >
            <Layers className="size-5" strokeWidth={1.75} />
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {deck.subject && (
                <Badge variant="outline">{deck.subject.shortName}</Badge>
              )}
              {due > 0 && (
                <Badge variant="brand">{due} fällig</Badge>
              )}
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">{deck.name}</h1>
            <p className="mt-1 text-sm text-muted-fg">
              {total} Karten · {mastered} gemeistert
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center">
            <ExportDeckButton
              name={deck.name}
              cards={deck.cards.map((c) => ({ front: c.front, back: c.back }))}
            />
            <DeleteDeckButton deckId={deck.id} deckName={deck.name} />
          </div>
        </div>

        {/* Mastery progress */}
        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between text-xs">
            <span className="text-muted-fg">Fortschritt</span>
            <span className="font-mono">
              <span className="font-bold">{mastered}</span>
              <span className="text-muted-fg"> / {total}</span>
              <span className="ml-2 text-muted-fg">{pct} %</span>
            </span>
          </div>
          <Progress
            value={pct}
            tone={pct >= 80 ? "success" : pct >= 40 ? "brand" : "warning"}
          />
        </div>

        {/* Lernmodi */}
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Link
              href="/app/karteikarten/session"
              className={buttonVariants({ size: "md" })}
            >
              Spaced-Repetition-Session ({due} fällig)
              <ArrowRight className="size-4" />
            </Link>
          </div>

          {total >= 1 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-fg">
                Weitere Lernmodi
              </p>
              <FlashcardModes
                cards={deck.cards.map((c) => ({ id: c.id, front: c.front, back: c.back }))}
              />
            </div>
          )}
        </div>
      </header>

      {/* Lernstatistik */}
      <section>
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-fg">
          <BarChart3 className="size-4" strokeWidth={1.75} />
          Lernstatistik
        </h2>
        <div className="grid grid-cols-2 gap-px border border-border bg-border sm:grid-cols-4">
          {[
            { label: "Karten gesamt", value: String(total), suffix: total === 1 ? "Karte" : "Karten" },
            {
              label: "Fällig",
              value: String(due),
              suffix: due === 1 ? "Karte" : "Karten",
              tone: due > 0 ? "text-brand" : "text-success",
            },
            {
              label: "Ø Wiederholungen",
              value: avgRepetitions ?? "—",
              suffix: avgRepetitions !== null ? "pro Karte" : "keine Daten",
            },
            {
              label: "Längste Streak",
              value: streakCard ? String(streakCard.repetitions) : "—",
              suffix: streakCard && streakCard.repetitions > 0
                ? streakCard.front.slice(0, 30) + (streakCard.front.length > 30 ? "…" : "")
                : "noch keine",
            },
          ].map((s) => (
            <div key={s.label} className="bg-bg p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">
                {s.label}
              </p>
              <p className={cn("mt-2 font-mono text-2xl font-bold tracking-tight", s.tone)}>
                {s.value}
              </p>
              <p className="mt-0.5 truncate text-xs text-muted-fg">{s.suffix}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Cards list + manuelles Hinzufügen */}
      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-fg">
          Karten erstellen &amp; verwalten ({total})
        </h2>

        {/* Karte selbst hinzufügen */}
        <AddCardForm deckId={deck.id} />

        {total === 0 ? (
          <div className="mt-4 border border-dashed border-border p-10 text-center">
            <Layers className="mx-auto size-8 text-muted-fg" strokeWidth={1.5} />
            <p className="mt-4 text-base font-semibold">Noch keine Karten</p>
            <p className="mt-1 text-sm text-muted-fg">
              Füge oben deine erste Karte hinzu — oder importiere ein Deck bzw. generiere Karten aus einem PDF.
            </p>
          </div>
        ) : (
          <div className="mt-4 flex flex-col gap-px border border-border bg-border">
            {deck.cards.map((card) => {
              const isDue = card.nextReviewAt <= now;
              return (
                <div key={card.id} className="bg-bg p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-fg mb-1">
                        Vorderseite
                      </p>
                      <p className="text-sm font-medium">{card.front}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {isDue && (
                        <Badge variant="brand" className="text-[10px]">fällig</Badge>
                      )}
                      <DeleteCardButton deckId={deck.id} cardId={card.id} />
                    </div>
                  </div>
                  <div className="mt-3 border-t border-border pt-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-fg mb-1">
                      Rückseite
                    </p>
                    <p className="text-sm text-muted-fg">{card.back}</p>
                  </div>
                  <div className="mt-2 flex items-center gap-3 text-[10px] font-mono text-muted-fg">
                    <span>Wiederholungen: {card.repetitions}</span>
                    <span>Intervall: {card.interval}d</span>
                    <span>EF: {card.easeFactor.toFixed(2)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
