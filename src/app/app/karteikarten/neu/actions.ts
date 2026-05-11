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

  await prisma.flashcardDeck.create({
    data: {
      name,
      userId: session.userId,
      subjectId: subjectId || null,
    },
  });

  redirect("/app/karteikarten");
}
