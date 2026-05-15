"use server";

import { redirect } from "next/navigation";
import { chat } from "@/lib/ai";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";

const MAX_TEXT_CHARS = 12000;

interface Karte {
  front: string;
  back: string;
}

export async function generateCardsFromPdf(formData: FormData): Promise<{ error: string } | never> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "student") redirect("/");

  const file = formData.get("pdf") as File | null;
  const deckName = ((formData.get("deckName") as string | null) ?? "").trim();
  const subjectId = ((formData.get("subjectId") as string | null) ?? "").trim() || null;

  if (!file || file.size === 0) return { error: "Bitte eine PDF-Datei hochladen." };
  if (file.size > 10 * 1024 * 1024) return { error: "Datei zu groß (max. 10 MB)." };
  if (!deckName) return { error: "Bitte einen Namen für das Deck angeben." };

  const buffer = Buffer.from(await file.arrayBuffer());

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require("pdf-parse") as (buf: Buffer) => Promise<{ text: string }>;

  let rawText: string;
  try {
    const result = await pdfParse(buffer);
    rawText = result.text.trim();
  } catch {
    return { error: "PDF konnte nicht gelesen werden. Bitte sicherstellen, dass die Datei kein Scan-PDF ist." };
  }

  if (!rawText || rawText.length < 50) {
    return { error: "Nicht genug Text im PDF gefunden. Funktioniert nur mit textbasierten PDFs." };
  }

  const truncated = rawText.length > MAX_TEXT_CHARS ? rawText.slice(0, MAX_TEXT_CHARS) + "\n[Text gekürzt]" : rawText;

  const prompt = `Du bist Lernkarten-Generator für deutsche Schüler.

Erstelle 12–15 Lernkarten (Frage/Antwort) aus folgendem Text.

Regeln:
- Jede Frage kurz und präzise (max. 1 Satz)
- Antwort: 1–2 Sätze, vollständig verständlich ohne Kontext
- Keine Metafragen ("Was steht auf Seite X?")
- Wichtige Begriffe, Definitionen, Konzepte bevorzugen

Antworte NUR als JSON-Array im Format:
[{"front":"Frage","back":"Antwort"},...]

TEXT:
${truncated}`;

  const raw = await chat({ messages: [{ role: "user", content: prompt }], maxTokens: 2000 });

  let cards: Karte[] = [];
  try {
    const match = raw.match(/\[[\s\S]*\]/);
    if (!match) throw new Error("Kein JSON-Array gefunden");
    cards = JSON.parse(match[0]) as Karte[];
  } catch {
    return { error: "KI-Antwort konnte nicht verarbeitet werden. Bitte erneut versuchen." };
  }

  if (!Array.isArray(cards) || cards.length === 0) {
    return { error: "Keine Lernkarten generiert. Bitte erneut versuchen." };
  }

  const deck = await prisma.flashcardDeck.create({
    data: {
      name: deckName,
      userId: session.userId,
      ...(subjectId ? { subjectId } : {}),
      cards: {
        create: cards.slice(0, 30).map((c) => ({
          front: String(c.front ?? "").slice(0, 500),
          back: String(c.back ?? "").slice(0, 1000),
        })),
      },
    },
  });

  redirect(`/app/karteikarten/${deck.id}`);
}
