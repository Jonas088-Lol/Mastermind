"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { BOSS_TIERS, type BossTier } from "@/lib/game";
import { chat } from "@/lib/ai";

interface ParsedQuestion {
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correct: number;
}

/** Call AI to generate MC questions for a boss battle. */
async function generateBossQuestions(
  subject: string,
  gradeLevel: number,
  bossName: string,
  count: number,
): Promise<ParsedQuestion[]> {
  const prompt = `Du bist ein erfahrener Lehrer für ${subject} (Klasse ${gradeLevel}).
Erstelle genau ${count} Multiple-Choice-Fragen für einen epischen Bosskampf namens "${bossName}".
Die Fragen sollen zum Lehrplan der Klasse ${gradeLevel} passen und herausfordernd, aber fair sein.

Antworte NUR mit einem JSON-Array ohne Erklärung oder Markdown-Blöcke:
[
  {
    "question": "Frage hier",
    "optionA": "Option A",
    "optionB": "Option B",
    "optionC": "Option C",
    "optionD": "Option D",
    "correct": 0
  }
]
"correct" ist der 0-basierte Index der richtigen Antwort (0=A, 1=B, 2=C, 3=D).`;

  const raw = await chat({
    messages: [{ role: "user", content: prompt }],
    maxTokens: 4000,
  });

  // Extract JSON array from response
  const match = raw.match(/\[[\s\S]*\]/);
  if (!match) return [];

  try {
    const parsed = JSON.parse(match[0]) as unknown[];
    return parsed
      .filter((q): q is ParsedQuestion =>
        typeof q === "object" && q !== null &&
        "question" in q && "optionA" in q && "correct" in q
      )
      .map((q) => ({
        question: String(q.question),
        optionA:  String(q.optionA),
        optionB:  String(q.optionB),
        optionC:  String(q.optionC),
        optionD:  String(q.optionD),
        correct:  Math.min(3, Math.max(0, Number(q.correct))),
      }));
  } catch {
    return [];
  }
}

export async function createBossBattle(formData: FormData) {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "teacher") redirect("/login");

  const teacher = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { schoolId: true },
  });

  const name        = (formData.get("name") as string).trim();
  const description = (formData.get("description") as string | null)?.trim() || `${name} – Bosskampf`;
  const lore        = (formData.get("lore") as string | null)?.trim() || null;
  const subject     = (formData.get("subject") as string | null)?.trim() || null;
  const gradeLevel  = parseInt(formData.get("gradeLevel") as string || "0", 10) || null;
  const tier        = (formData.get("tier") as string) || "common";
  const icon        = (formData.get("icon") as string).trim() || "👹";
  const useAI       = formData.get("useAI") === "on";
  const aiCount     = Math.min(20, Math.max(5, parseInt(formData.get("aiCount") as string || "10", 10)));
  const startHrs    = parseInt(formData.get("startHours") as string || "0", 10);
  const durationHrs = Math.max(1, parseInt(formData.get("durationHours") as string || "24", 10));

  const tierData = BOSS_TIERS[(tier as BossTier) in BOSS_TIERS ? (tier as BossTier) : "common"];
  const startAt  = new Date(Date.now() + startHrs * 3_600_000);
  const endAt    = new Date(startAt.getTime() + durationHrs * 3_600_000);

  // Parse manual questions (JSON encoded by client form)
  const manualRaw = formData.get("questions") as string | null;
  let manualQuestions: ParsedQuestion[] = [];
  if (manualRaw) {
    try {
      manualQuestions = JSON.parse(manualRaw) as ParsedQuestion[];
    } catch { /* ignore */ }
  }

  // AI-generate questions if requested and AI is configured
  let aiQuestions: ParsedQuestion[] = [];
  if (useAI && subject && gradeLevel) {
    aiQuestions = await generateBossQuestions(subject, gradeLevel, name, aiCount);
  }

  const allQuestions = [...manualQuestions, ...aiQuestions];
  const useCustom   = allQuestions.length > 0;

  const battle = await prisma.bossBattle.create({
    data: {
      schoolId:          teacher?.schoolId ?? null,
      name,
      description,
      lore,
      subject,
      gradeLevel,
      tier,
      maxHp:             tierData.hp,
      currentHp:         tierData.hp,
      coinReward:        tierData.coinReward,
      mvpCoinReward:     tierData.mvpCoinReward,
      xpReward:          tierData.xpReward,
      icon,
      startAt,
      endAt,
      isActive:          startHrs === 0,
      createdByUserId:   session.userId,
      useCustomQuestions: useCustom,
      questions: useCustom ? {
        create: allQuestions.map((q) => ({
          question:    q.question,
          optionA:     q.optionA,
          optionB:     q.optionB,
          optionC:     q.optionC,
          optionD:     q.optionD,
          correct:     q.correct,
          aiGenerated: aiQuestions.includes(q),
        })),
      } : undefined,
    },
  });

  redirect(`/teach/boss/${battle.id}`);
}
