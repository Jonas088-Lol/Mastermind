"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { gradeCard } from "./actions";

interface Card {
  id: string;
  front: string;
  back: string;
  deckId: string;
  deck: { name: string };
}

interface Props {
  cards: Card[];
}

export default function StudySessionClient({ cards }: Props) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [sessionResults, setSessionResults] = useState<{ id: string; rating: number }[]>([]);
  const [loading, setLoading] = useState(false);

  const isDone = currentIdx >= cards.length;

  async function handleRate(rating: number) {
    if (loading) return;
    setLoading(true);
    const card = cards[currentIdx];
    try {
      await gradeCard(card.id, rating);
    } catch {
      // best-effort
    }
    setSessionResults((prev) => [...prev, { id: card.id, rating }]);
    setFlipped(false);
    setCurrentIdx((i) => i + 1);
    setLoading(false);
  }

  if (isDone) {
    const total = cards.length;
    const correct = sessionResults.filter((r) => r.rating > 0).length;
    const pct = total > 0 ? Math.round((correct / total) * 100) : 0;

    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-8">
        <div>
          <Link
            href="/app/karteikarten"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-ml-2")}
          >
            <ArrowLeft className="size-3.5" />
            Zurück zu Karteikarten
          </Link>
        </div>

        <div className="border border-border bg-bg p-12 text-center">
          <CheckCircle className="mx-auto size-12 text-success" strokeWidth={1.5} />
          <h1 className="mt-6 text-2xl font-bold tracking-tight">Session abgeschlossen!</h1>
          <p className="mt-2 text-muted-fg">Du hast alle fälligen Karten durchgearbeitet.</p>

          <div className="mt-8 grid grid-cols-3 gap-px border border-border bg-border">
            <div className="bg-bg p-5">
              <p className="font-mono text-3xl font-bold">{correct}</p>
              <p className="mt-1 text-xs text-muted-fg uppercase tracking-wider">Gewusst</p>
            </div>
            <div className="bg-bg p-5">
              <p className="font-mono text-3xl font-bold">{total - correct}</p>
              <p className="mt-1 text-xs text-muted-fg uppercase tracking-wider">Nochmal</p>
            </div>
            <div className="bg-bg p-5">
              <p className="font-mono text-3xl font-bold">{pct}%</p>
              <p className="mt-1 text-xs text-muted-fg uppercase tracking-wider">Trefferquote</p>
            </div>
          </div>

          <div className="mt-8">
            <Link href="/app/karteikarten" className={buttonVariants({ size: "lg" })}>
              Zurück zur Übersicht
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const card = cards[currentIdx];
  const progress = Math.round((currentIdx / cards.length) * 100);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <Link
          href="/app/karteikarten"
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-ml-2")}
        >
          <ArrowLeft className="size-3.5" />
          Zurück
        </Link>
        <span className="font-mono text-xs text-muted-fg">
          {currentIdx + 1} / {cards.length}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1 w-full bg-border">
        <div
          className="h-1 bg-brand transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <p className="text-xs text-muted-fg">
        Deck:{" "}
        <span className="font-semibold text-fg">{card.deck.name}</span>
      </p>

      {/* Card */}
      <div
        onClick={() => !flipped && setFlipped(true)}
        className={cn(
          "min-h-64 border border-border bg-bg p-10 text-center transition-colors",
          !flipped && "cursor-pointer hover:bg-surface"
        )}
      >
        {!flipped ? (
          <div className="flex flex-col items-center justify-center gap-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-fg">Vorderseite</p>
            <p className="text-xl font-semibold leading-relaxed">{card.front}</p>
            <p className="mt-4 text-xs text-muted-fg">Klicken zum Umdrehen</p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-fg">Rückseite</p>
            <p className="text-xl leading-relaxed">{card.back}</p>
          </div>
        )}
      </div>

      {/* Rating buttons — only after flip */}
      {flipped && (
        <div className="flex gap-3">
          <Button
            variant="outline"
            size="lg"
            className="flex-1"
            onClick={() => handleRate(0)}
            disabled={loading}
          >
            Nochmal
          </Button>
          <Button
            size="lg"
            className="flex-1"
            onClick={() => handleRate(4)}
            disabled={loading}
          >
            ✓ Gewusst
          </Button>
        </div>
      )}
    </div>
  );
}
