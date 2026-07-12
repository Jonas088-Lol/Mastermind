/* Copyright 2026 Elian Schock, Jonas Schwenk */
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { buttonVariants } from "@/components/ui/button";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import StudySessionClient from "./StudySessionClient";

export const metadata: Metadata = { title: "Lernsession" };

export default async function StudySessionPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "student") redirect("/");

  const now = new Date();

  const dueCards = await prisma.flashcard.findMany({
    where: {
      deck: { userId: session.userId },
      nextReviewAt: { lte: now },
    },
    include: {
      deck: { select: { name: true } },
    },
    orderBy: { nextReviewAt: "asc" },
  });

  if (dueCards.length === 0) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-8">
        <div>
          <Link
            href="/app/karteikarten"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-ml-2")}
          >
            ← Zurück zu Karteikarten
          </Link>
        </div>
        <div className="border border-dashed border-border p-16 text-center">
          <p className="text-2xl">🎉</p>
          <p className="mt-4 text-base font-semibold">Keine Karten fällig</p>
          <p className="mt-1 text-sm text-muted-fg">Keine Karten fällig · Komm morgen wieder</p>
        </div>
      </div>
    );
  }

  const cards = dueCards.map((c) => ({
    id: c.id,
    front: c.front,
    back: c.back,
    deckId: c.deckId,
    deck: { name: c.deck.name },
  }));

  return <StudySessionClient cards={cards} />;
}
