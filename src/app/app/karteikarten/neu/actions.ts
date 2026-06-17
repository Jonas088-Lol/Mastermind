"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";

export async function createDeck(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "student") throw new Error("Nur Schüler:innen können Decks erstellen");

  const name = String(formData.get("name") ?? "").trim();
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

  await prisma.flashcardDeck.create({
    data: {
      name,
      userId: session.userId,
      subjectId: resolvedSubjectId,
    },
  });

  redirect("/app/karteikarten");
}
