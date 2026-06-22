/**
 * POST /api/tree/unlock-center
 * Validates the answer to the general-knowledge question and unlocks the hub.
 * The correct answer index is server-side only — client never sees it.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db/client";
import { TreeNodeStatus } from "@prisma/client";
import { assignFrontierQuests } from "@/lib/tree-quest-engine";
import { propagateUnlocks } from "@/lib/tree-generator";

// Static pool of general-knowledge questions.
// Stored server-side only; client only receives id + question + options.
const GK_QUESTIONS = [
  { id: 0, question: "Wie viele Bundesländer hat Deutschland?", options: ["14", "15", "16", "17"], correct: 2 },
  { id: 1, question: "Was ist die Hauptstadt von Bayern?", options: ["Nürnberg", "Augsburg", "München", "Regensburg"], correct: 2 },
  { id: 2, question: "Welches ist das größte Organ des menschlichen Körpers?", options: ["Herz", "Leber", "Haut", "Lunge"], correct: 2 },
  { id: 3, question: "Wie viele Planeten hat unser Sonnensystem?", options: ["7", "8", "9", "10"], correct: 1 },
  { id: 4, question: "In welchem Jahr wurde das Grundgesetz der BRD verabschiedet?", options: ["1945", "1948", "1949", "1952"], correct: 2 },
  { id: 5, question: "Was ergibt 17 × 6?", options: ["96", "100", "102", "108"], correct: 2 },
  { id: 6, question: "Welches Element hat das Chemiesymbol 'O'?", options: ["Gold", "Osmium", "Sauerstoff", "Ozon"], correct: 2 },
  { id: 7, question: "Wer schrieb 'Faust'?", options: ["Schiller", "Goethe", "Heine", "Kleist"], correct: 1 },
] as const;

export async function GET() {
  // Return a random question without the correct answer
  const q = GK_QUESTIONS[Math.floor(Math.random() * GK_QUESTIONS.length)]!;
  return NextResponse.json({ id: q.id, question: q.question, options: q.options });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as { questionId?: number; answer?: number };
  const { questionId, answer } = body;

  if (typeof questionId !== "number" || typeof answer !== "number") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const q = GK_QUESTIONS.find((x) => x.id === questionId);
  if (!q) return NextResponse.json({ error: "Unknown question" }, { status: 400 });

  if (answer !== q.correct) {
    return NextResponse.json({ correct: false });
  }

  // Find hub node
  const hub = await prisma.treeNode.findFirst({ where: { isHub: true } });
  if (!hub) return NextResponse.json({ error: "Hub not found" }, { status: 500 });

  const now = new Date();
  await prisma.userTreeProgress.upsert({
    where:  { userId_nodeId: { userId: session.userId, nodeId: hub.id } },
    create: { userId: session.userId, nodeId: hub.id, status: TreeNodeStatus.MASTERED, masteryTier: 1, questsDone: 1, unlockedAt: now, masteredAt: now },
    update: { status: TreeNodeStatus.MASTERED, masteryTier: 1, masteredAt: now, unlockedAt: now },
  });

  // Unlock first tier of each subject
  const newlyAvailable = await propagateUnlocks(session.userId, hub.id);
  await assignFrontierQuests(session.userId);

  return NextResponse.json({ correct: true, newlyAvailable });
}
