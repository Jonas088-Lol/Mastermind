"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { logger } from "@/lib/logger";
import { pushToUsers } from "@/lib/push";
import { ROLE_HOME, effectiveRole, getSession } from "@/lib/session";

async function guardTeacher(pathId: string) {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "teacher") redirect(ROLE_HOME["teacher"]);
  const path = await prisma.learningPath.findUnique({
    where: { id: pathId },
    select: { createdById: true },
  });
  if (!path || path.createdById !== session.userId) redirect("/teach/lernpfade");
  return session;
}

export async function updateLearningPath(pathId: string, formData: FormData): Promise<void> {
  await guardTeacher(pathId);
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  if (!title) return;
  await prisma.learningPath.update({ where: { id: pathId }, data: { title, description } });
  revalidatePath(`/teach/lernpfade/${pathId}`);
}

export async function addModule(pathId: string, formData: FormData): Promise<void> {
  await guardTeacher(pathId);
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;
  const count = await prisma.learningModule.count({ where: { pathId } });
  await prisma.learningModule.create({
    data: { pathId, title, order: count + 1 },
  });
  revalidatePath(`/teach/lernpfade/${pathId}`);
}

export async function deleteModule(pathId: string, moduleId: string): Promise<void> {
  await guardTeacher(pathId);
  await prisma.learningModule.delete({ where: { id: moduleId } });
  revalidatePath(`/teach/lernpfade/${pathId}`);
}

export async function addQuestion(
  pathId: string,
  moduleId: string,
  formData: FormData
): Promise<void> {
  await guardTeacher(pathId);
  const question = String(formData.get("question") ?? "").trim();
  const optA = String(formData.get("optA") ?? "").trim();
  const optB = String(formData.get("optB") ?? "").trim();
  const optC = String(formData.get("optC") ?? "").trim();
  const optD = String(formData.get("optD") ?? "").trim();
  const correct = String(formData.get("correct") ?? "0").trim();
  const explanation = String(formData.get("explanation") ?? "").trim() || null;
  if (!question || !optA || !optB) return;
  const count = await prisma.quizQuestion.count({ where: { moduleId } });
  await prisma.quizQuestion.create({
    data: {
      moduleId,
      question,
      options: JSON.stringify([optA, optB, optC, optD].filter(Boolean)),
      correct,
      explanation,
      order: count + 1,
    },
  });
  revalidatePath(`/teach/lernpfade/${pathId}`);
}

export async function deleteQuestion(
  pathId: string,
  questionId: string
): Promise<void> {
  await guardTeacher(pathId);
  await prisma.quizQuestion.delete({ where: { id: questionId } });
  revalidatePath(`/teach/lernpfade/${pathId}`);
}

export async function recommendToClass(pathId: string, formData: FormData): Promise<void> {
  const session = await guardTeacher(pathId);
  const classId = (formData.get("classId") as string | null)?.trim() ?? "";
  if (!classId) return;

  const path = await prisma.learningPath.findUnique({
    where: { id: pathId },
    select: { title: true },
  });
  if (!path) return;

  const students = await prisma.user.findMany({
    where: { classId, role: "student", schoolId: session.schoolId ?? undefined },
    select: { id: true },
  });
  if (students.length === 0) return;

  const studentIds = students.map((s) => s.id);

  await Promise.all([
    pushToUsers(studentIds, {
      title: "Lernpfad empfohlen",
      body: `Dein Lehrer empfiehlt: ${path.title}`,
      url: `/app/lernen/${pathId}`,
    }).catch((err) => { logger.warn("lernpfade: push failed", { error: String(err) }); }),
    prisma.appNotification.createMany({
      data: studentIds.map((userId) => ({
        userId,
        type: "info",
        title: "Lernpfad empfohlen",
        body: `Dein Lehrer empfiehlt: ${path.title}`,
      })),
    }),
  ]);
}
