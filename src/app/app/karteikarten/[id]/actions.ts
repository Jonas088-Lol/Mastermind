/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";

const MAX_FIELD_CHARS = 2000;

/** Verifiziert, dass das Deck dem angemeldeten Schüler gehört. */
async function assertOwnDeck(deckId: string, userId: string): Promise<boolean> {
  const deck = await prisma.flashcardDeck.findUnique({
    where: { id: deckId },
    select: { userId: true },
  });
  return !!deck && deck.userId === userId;
}

/** Eine neue Karteikarte (Vorder-/Rückseite) zu einem Deck hinzufügen. */
export async function addFlashcard(
  deckId: string,
  front: string,
  back: string,
): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "student") {
    return { ok: false, error: "Nicht berechtigt" };
  }

  const f = String(front ?? "").trim().slice(0, MAX_FIELD_CHARS);
  const b = String(back ?? "").trim().slice(0, MAX_FIELD_CHARS);
  if (!f || !b) return { ok: false, error: "Vorder- und Rückseite sind erforderlich" };

  if (!(await assertOwnDeck(deckId, session.userId))) {
    return { ok: false, error: "Deck nicht gefunden" };
  }

  await prisma.flashcard.create({ data: { deckId, front: f, back: b } });
  await prisma.flashcardDeck.update({ where: { id: deckId }, data: { updatedAt: new Date() } });

  revalidatePath(`/app/karteikarten/${deckId}`);
  revalidatePath("/app/karteikarten");
  return { ok: true };
}

/** Ein ganzes Deck samt Karten löschen (nur eigenes Deck). */
export async function deleteDeck(deckId: string): Promise<void> {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "student") return;
  if (!(await assertOwnDeck(deckId, session.userId))) return;

  // Karten hängen per onDelete: Cascade am Deck.
  await prisma.flashcardDeck.delete({ where: { id: deckId } });

  revalidatePath("/app/karteikarten");
  redirect("/app/karteikarten");
}

/** Eine Karteikarte löschen (nur aus eigenem Deck). */
export async function deleteFlashcard(deckId: string, cardId: string): Promise<void> {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "student") return;
  if (!(await assertOwnDeck(deckId, session.userId))) return;

  // deleteMany mit deckId-Filter: verhindert Löschen fremder Karten über eine
  // geratene cardId (die Karte muss zu genau diesem Deck gehören).
  await prisma.flashcard.deleteMany({ where: { id: cardId, deckId } });

  revalidatePath(`/app/karteikarten/${deckId}`);
  revalidatePath("/app/karteikarten");
}
