"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { awardCoins } from "@/lib/coins";
import { awardXpCustom } from "@/lib/xp";

// ── List management ────────────────────────────────────────────────

export async function createVocabList(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "student") redirect("/");

  const title    = ((formData.get("title") as string) ?? "").trim();
  const langFrom = ((formData.get("langFrom") as string) ?? "Deutsch").trim();
  const langTo   = ((formData.get("langTo") as string) ?? "Englisch").trim();
  const subject  = ((formData.get("subject") as string) ?? "").trim() || null;
  const color    = ((formData.get("color") as string) ?? "#6366f1").trim();
  if (!title) return;

  const list = await prisma.vocabList.create({
    data: { userId: session.userId, title, langFrom, langTo, subject, color },
  });

  redirect(`/app/vokabeln/${list.id}`);
}

export async function deleteVocabList(listId: string) {
  const session = await getSession();
  if (!session) return;
  const list = await prisma.vocabList.findUnique({ where: { id: listId } });
  if (!list || list.userId !== session.userId) return;
  await prisma.vocabList.delete({ where: { id: listId } });
  redirect("/app/vokabeln");
}

export async function renameVocabList(listId: string, title: string) {
  const session = await getSession();
  if (!session) return;
  const list = await prisma.vocabList.findUnique({ where: { id: listId } });
  if (!list || list.userId !== session.userId) return;
  await prisma.vocabList.update({ where: { id: listId }, data: { title: title.trim() || list.title } });
  revalidatePath(`/app/vokabeln/${listId}`);
}

// ── Entry management ───────────────────────────────────────────────

export async function addVocabEntry(listId: string, formData: FormData) {
  const session = await getSession();
  if (!session) return;
  const list = await prisma.vocabList.findUnique({ where: { id: listId } });
  if (!list || list.userId !== session.userId) return;

  const word        = ((formData.get("word") as string) ?? "").trim();
  const translation = ((formData.get("translation") as string) ?? "").trim();
  const example     = ((formData.get("example") as string) ?? "").trim() || null;
  const hint        = ((formData.get("hint") as string) ?? "").trim() || null;

  if (!word || !translation) return;

  await prisma.vocabEntry.create({ data: { listId, word, translation, example, hint } });
  revalidatePath(`/app/vokabeln/${listId}`);
}

export async function deleteVocabEntry(entryId: string, listId: string) {
  const session = await getSession();
  if (!session) return;
  const list = await prisma.vocabList.findUnique({ where: { id: listId } });
  if (!list || list.userId !== session.userId) return;
  await prisma.vocabEntry.delete({ where: { id: entryId } });
  revalidatePath(`/app/vokabeln/${listId}`);
}

// ── Learning progress (SM-2) ──────────────────────────────────────

export async function recordVocabAnswer(entryId: string, quality: 0 | 1 | 2 | 3 | 4 | 5) {
  const session = await getSession();
  if (!session) return;

  const entry = await prisma.vocabEntry.findUnique({
    where: { id: entryId },
    include: { list: true },
  });
  if (!entry || entry.list.userId !== session.userId) return;

  // SM-2 algorithm
  let { easeFactor, interval, repetitions, streak } = entry;
  if (quality >= 3) {
    repetitions += 1;
    streak += 1;
    if (repetitions === 1) interval = 1;
    else if (repetitions === 2) interval = 6;
    else interval = Math.round(interval * easeFactor);
    easeFactor = Math.max(1.3, easeFactor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  } else {
    repetitions = 0;
    interval = 1;
    streak = 0;
  }

  const nextReview = new Date(Date.now() + interval * 86400_000);

  await prisma.vocabEntry.update({
    where: { id: entryId },
    data: { easeFactor, interval, repetitions, streak, nextReview },
  });

  // Award coins for a correct answer (quality >= 3 = pass)
  if (quality >= 3) {
    awardCoins(entry.list.userId, "vokabel_session").catch(() => undefined);
    // +2 XP pro richtiger Vokabel (zählt auch für Tages-Streak)
    awardXpCustom(entry.list.userId, 2, "vokabel_antwort", entryId).catch(() => undefined);
  }
}

// ── AI import ──────────────────────────────────────────────────────

export async function generateVocabFromText(listId: string, text: string) {
  const session = await getSession();
  if (!session) return { error: "Nicht angemeldet" };
  const list = await prisma.vocabList.findUnique({ where: { id: listId } });
  if (!list || list.userId !== session.userId) return { error: "Kein Zugriff" };

  const { chat } = await import("@/lib/ai");
  const prompt = `Erstelle aus folgendem Text genau 10-15 Vokabelpaare für einen Lernzettel.
Sprachen: ${list.langFrom} → ${list.langTo}.

TEXT:
${text.slice(0, 3000)}

Antworte NUR als JSON-Array:
[{"word":"${list.langFrom === "Deutsch" ? "deutsches Wort" : "Wort"}","translation":"${list.langTo === "Englisch" ? "English translation" : "Übersetzung"}","example":"Beispielsatz (optional)"}]`;

  try {
    const raw = await chat({ messages: [{ role: "user", content: prompt }], maxTokens: 1500, cache: true });
    const match = raw.match(/\[[\s\S]*\]/);
    if (!match) return { error: "KI-Antwort konnte nicht verarbeitet werden." };

    const pairs = JSON.parse(match[0]) as { word: string; translation: string; example?: string }[];
    if (!Array.isArray(pairs) || pairs.length === 0) return { error: "Keine Vokabeln generiert." };

    await prisma.vocabEntry.createMany({
      data: pairs.slice(0, 20).map((p) => ({
        listId,
        word: String(p.word ?? "").slice(0, 200),
        translation: String(p.translation ?? "").slice(0, 200),
        example: p.example ? String(p.example).slice(0, 400) : null,
      })),
    });

    revalidatePath(`/app/vokabeln/${listId}`);
    return { success: pairs.length };
  } catch {
    return { error: "Fehler beim Verarbeiten der KI-Antwort." };
  }
}
