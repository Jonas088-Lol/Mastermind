/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { safeJsonParse } from "@/lib/safe-json";
import { effectiveRole, getSession } from "@/lib/session";

const MAX_CARDS = 500;
const MAX_FIELD_CHARS = 2000;

export async function importDeck(name: string, cardsJson: string) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "student") {
    throw new Error("Nur Schüler:innen können Decks importieren");
  }

  const deckName = String(name ?? "").trim().slice(0, 120);
  if (!deckName) throw new Error("Deck-Name ist erforderlich");

  const raw = safeJsonParse<unknown>(String(cardsJson ?? "").slice(0, 2_000_000), null);
  if (!Array.isArray(raw)) throw new Error("Ungültiges Karten-Format");

  const cards = raw
    .slice(0, MAX_CARDS)
    .map((c) => {
      if (typeof c !== "object" || c === null) return null;
      const obj = c as { front?: unknown; back?: unknown };
      const front = typeof obj.front === "string" ? obj.front.trim().slice(0, MAX_FIELD_CHARS) : "";
      const back = typeof obj.back === "string" ? obj.back.trim().slice(0, MAX_FIELD_CHARS) : "";
      if (!front || !back) return null;
      return { front, back };
    })
    .filter((c): c is { front: string; back: string } => c !== null);

  if (cards.length === 0) throw new Error("Keine gültigen Karten gefunden");

  const deck = await prisma.flashcardDeck.create({
    data: {
      name: deckName,
      userId: session.userId,
      cards: {
        create: cards.map((c) => ({ front: c.front, back: c.back })),
      },
    },
  });

  redirect(`/app/karteikarten/${deck.id}`);
}
