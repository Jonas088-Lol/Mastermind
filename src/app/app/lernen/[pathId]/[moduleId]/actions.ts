"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { getSession } from "@/lib/session";
import { awardXp } from "@/lib/xp";

export async function submitAnswer(
  questionId: string,
  answer: string,
  correct: boolean,
): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/login");

  await prisma.quizAnswer.create({
    data: { userId: session.userId, questionId, answer, correct },
  });
}

export async function completeModule(pathId: string, moduleId: string): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/login");

  await prisma.learningProgress.upsert({
    where: { userId_moduleId: { userId: session.userId, moduleId } },
    create: { userId: session.userId, pathId, moduleId },
    update: { completedAt: new Date() },
  });

  await awardXp(session.userId, "karteikarte_session");
  revalidatePath(`/app/lernen/${pathId}`);
  revalidatePath("/app/lernen");
}
