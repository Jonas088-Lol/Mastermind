"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/client";
import { getSession } from "@/lib/session";

export async function saveQuizResult(topicId: string, score: number): Promise<void> {
  const session = await getSession();
  if (!session) return;

  await prisma.exerciseProgress.upsert({
    where: { userId_topicId: { userId: session.userId, topicId } },
    update: { score, completedAt: new Date() },
    create: { userId: session.userId, topicId, score, completedAt: new Date() },
  });

  revalidatePath("/app/uebungen");
}
