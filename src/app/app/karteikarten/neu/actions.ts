/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";

export async function createDeck(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "student") throw new Error("Nur Schüler:innen können Decks erstellen");

  const name = String(formData.get("name") ?? "").trim().slice(0, 120);
  const subjectId = String(formData.get("subjectId") ?? "").trim();

  if (!name) throw new Error("Deck-Name ist erforderlich");

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

  const deck = await prisma.flashcardDeck.create({
    data: {
      name,
      userId: session.userId,
      subjectId: resolvedSubjectId,
    },
  });

  // Liste cache-invalidieren, dann in das frische, dynamische Deck springen —
  // wie beim PDF-Import/Vokabeln (Redirect auf die gecachte Liste zeigte das
  // neue Deck nicht an → wirkte, als schlüge das Erstellen fehl).
  revalidatePath("/app/karteikarten");
  redirect(`/app/karteikarten/${deck.id}`);
}
