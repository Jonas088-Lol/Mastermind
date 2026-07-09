"use server";

import { prisma } from "@/lib/db/client";
import { getSession } from "@/lib/session";
import { chat } from "@/lib/ai";
import { guardAiAction } from "@/lib/security/ai-action-guard";

type QuizResult = {
  questions: { question: string; options: string[]; correct: number; explanation: string }[];
} | { error: string };

export async function generateQuizFromPage(pageId: string): Promise<QuizResult> {
  const session = await getSession();
  if (!session) return { error: "Nicht angemeldet." };

  const page = await prisma.notebookPage.findUnique({
    where: { id: pageId },
    include: { notebook: true },
  });

  if (!page || page.notebook.userId !== session.userId) {
    return { error: "Keine Berechtigung." };
  }

  const guard = await guardAiAction({ userId: session.userId, email: session.email, scope: "heft-quiz", limit: 15 });
  if (guard) return guard;

  // Extract text from block content
  let text = "";
  try {
    const blocks = JSON.parse(page.content) as { type: string; content: string }[];
    text = blocks
      .filter(b => b.content && b.type !== "math" && b.type !== "divider")
      .map(b => b.content)
      .join("\n");
  } catch {
    return { error: "Seiteninhalt konnte nicht gelesen werden." };
  }

  if (!text || text.trim().length < 50) {
    return { error: "Zu wenig Inhalt auf dieser Seite. Schreibe erst mehr Text, dann generiere das Quiz." };
  }

  const prompt = `Du bist ein Lernassistent für Schüler. Erstelle 5–8 Multiple-Choice-Fragen aus folgenden Lernnotizen.

LERNNOTIZEN:
${text.slice(0, 3000)}

Regeln:
- Jede Frage testet das Verständnis, nicht das wortwörtliche Abschreiben
- 4 Antwortmöglichkeiten, genau eine richtig
- Erkläre kurz warum die richtige Antwort korrekt ist

Antworte NUR als JSON:
[{"question":"...","options":["A","B","C","D"],"correct":0,"explanation":"..."}]`;

  try {
    const raw = await chat({ messages: [{ role: "user", content: prompt }], maxTokens: 2000 });
    const match = raw.match(/\[[\s\S]*\]/);
    if (!match) return { error: "KI-Antwort konnte nicht verarbeitet werden." };

    const questions = JSON.parse(match[0]) as { question: string; options: string[]; correct: number; explanation: string }[];
    if (!Array.isArray(questions) || questions.length === 0) {
      return { error: "Keine Fragen generiert. Versuche es erneut." };
    }

    return { questions: questions.slice(0, 10) };
  } catch {
    return { error: "Fehler beim Generieren. Bitte erneut versuchen." };
  }
}
