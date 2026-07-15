/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";

export interface CreateDeckState {
  error?: string;
}

export async function createDeck(
  _prev: CreateDeckState,
  formData: FormData,
): Promise<CreateDeckState> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "student") {
    return { error: "Nur Schüler:innen können Decks erstellen." };
  }

  const name = String(formData.get("name") ?? "").trim().slice(0, 120);
  const subjectId = String(formData.get("subjectId") ?? "").trim();

  if (!name) return { error: "Bitte gib einen Deck-Namen ein." };

  // Verify the subject belongs to the user's school before linking
  let resolvedSubjectId: string | null = subjectId || null;
  if (resolvedSubjectId) {
    const subject = await prisma.subject.findUnique({
      where: { id: resolvedSubjectId },
      select: { schoolId: true },
    });
    if (!subject || subject.schoolId !== session.schoolId) {
      resolvedSubjectId = null;
    }
  }

  let deckId: string;
  try {
    const deck = await prisma.flashcardDeck.create({
      data: {
        name,
        userId: session.userId,
        subjectId: resolvedSubjectId,
      },
    });
    deckId = deck.id;
  } catch {
    // Echte DB-Fehler (z. B. ungültige FK) nicht als 500 werfen, sondern dem
    // Nutzer sichtbar machen.
    return { error: "Deck konnte nicht gespeichert werden. Bitte erneut versuchen." };
  }

  // Liste cache-invalidieren, dann in das frische, dynamische Deck springen —
  // wie beim PDF-Import/Vokabeln (Redirect auf die gecachte Liste zeigte das
  // neue Deck nicht an → wirkte, als schlüge das Erstellen fehl).
  revalidatePath("/app/karteikarten");
  redirect(`/app/karteikarten/${deckId}`);
}
