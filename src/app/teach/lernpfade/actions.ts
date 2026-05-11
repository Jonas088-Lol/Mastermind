"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { ROLE_HOME, effectiveRole, getSession } from "@/lib/session";

export async function createLearningPath(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "teacher") redirect(ROLE_HOME["teacher"]);
  if (!session.schoolId) throw new Error("Keine Schule zugeordnet");

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const subjectId = String(formData.get("subjectId") ?? "").trim();

  if (!title || !subjectId) throw new Error("Pflichtfelder fehlen");

  const modulesRaw = String(formData.get("modules") ?? "[]");
  type RawModule = { title: string; questions: { question: string; options: string[]; correct: number; explanation?: string }[] };
  const modules: RawModule[] = JSON.parse(modulesRaw);

  const path = await prisma.learningPath.create({
    data: {
      schoolId: session.schoolId,
      subjectId,
      title,
      description,
      createdById: session.userId,
    },
  });

  for (let mi = 0; mi < modules.length; mi++) {
    const m = modules[mi];
    const learningModule = await prisma.learningModule.create({
      data: { pathId: path.id, title: m.title, order: mi + 1 },
    });
    for (let qi = 0; qi < m.questions.length; qi++) {
      const q = m.questions[qi];
      await prisma.quizQuestion.create({
        data: {
          moduleId: learningModule.id,
          question: q.question,
          options: JSON.stringify(q.options),
          correct: String(q.correct),
          explanation: q.explanation ?? null,
          order: qi + 1,
        },
      });
    }
  }

  revalidatePath("/teach/lernpfade");
  redirect("/teach/lernpfade");
}

export async function deleteLearningPath(pathId: string): Promise<void> {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "teacher") redirect(ROLE_HOME["teacher"]);

  await prisma.learningPath.deleteMany({
    where: { id: pathId, schoolId: session.schoolId ?? undefined, createdById: session.userId },
  });
  revalidatePath("/teach/lernpfade");
}
