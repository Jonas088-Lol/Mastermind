"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { pushToUsers } from "@/lib/push";

async function guardTeacher() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "teacher") redirect("/login");
  if (!session.schoolId) redirect("/login");
  return session;
}

export async function createWorksheet(formData: FormData): Promise<void> {
  const session = await guardTeacher();

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const gradeLevel = parseInt(String(formData.get("gradeLevel") ?? ""), 10);
  const difficulty = String(formData.get("difficulty") ?? "mittel").trim();
  const estimatedMinutes = parseInt(String(formData.get("estimatedMinutes") ?? "15"), 10);
  const subjectId = String(formData.get("subjectId") ?? "").trim() || null;

  if (!title) return;

  const worksheet = await prisma.worksheet.create({
    data: {
      title,
      description,
      gradeLevel: isNaN(gradeLevel) ? null : gradeLevel,
      difficulty,
      estimatedMinutes: isNaN(estimatedMinutes) ? 15 : estimatedMinutes,
      subjectId,
      status: "draft",
      creatorId: session.userId,
      schoolId: session.schoolId!,
    },
  });

  revalidatePath("/teach/arbeitsblatter");
  redirect(`/teach/arbeitsblatter/${worksheet.id}`);
}

export async function updateWorksheet(id: string, formData: FormData): Promise<void> {
  const session = await guardTeacher();

  const worksheet = await prisma.worksheet.findUnique({ where: { id } });
  if (!worksheet || worksheet.creatorId !== session.userId) return;

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const gradeLevel = parseInt(String(formData.get("gradeLevel") ?? ""), 10);
  const difficulty = String(formData.get("difficulty") ?? "mittel").trim();
  const estimatedMinutes = parseInt(String(formData.get("estimatedMinutes") ?? "15"), 10);
  const subjectId = String(formData.get("subjectId") ?? "").trim() || null;
  const status = String(formData.get("status") ?? "").trim() || undefined;

  await prisma.worksheet.update({
    where: { id },
    data: {
      title: title || undefined,
      description,
      gradeLevel: isNaN(gradeLevel) ? null : gradeLevel,
      difficulty,
      estimatedMinutes: isNaN(estimatedMinutes) ? 15 : estimatedMinutes,
      subjectId,
      ...(status ? { status } : {}),
    },
  });

  revalidatePath(`/teach/arbeitsblatter/${id}`);
}

export async function publishWorksheet(id: string): Promise<void> {
  const session = await guardTeacher();

  const worksheet = await prisma.worksheet.findUnique({ where: { id } });
  if (!worksheet || worksheet.creatorId !== session.userId) return;

  await prisma.worksheet.update({ where: { id }, data: { status: "published" } });
  revalidatePath(`/teach/arbeitsblatter/${id}`);
}

export async function deleteWorksheet(id: string): Promise<void> {
  const session = await guardTeacher();

  const worksheet = await prisma.worksheet.findUnique({ where: { id } });
  if (!worksheet || worksheet.creatorId !== session.userId) return;

  await prisma.worksheet.delete({ where: { id } });
  redirect("/teach/arbeitsblatter");
}

export async function saveWorksheetItem(worksheetId: string, formData: FormData): Promise<void> {
  const session = await guardTeacher();

  const worksheet = await prisma.worksheet.findUnique({ where: { id: worksheetId } });
  if (!worksheet || worksheet.creatorId !== session.userId) return;

  const itemId = String(formData.get("itemId") ?? "").trim() || null;
  const type = String(formData.get("type") ?? "").trim();
  const order = parseInt(String(formData.get("order") ?? "0"), 10);
  const config = String(formData.get("config") ?? "{}").trim();
  const correctAnswer = String(formData.get("correctAnswer") ?? "").trim() || null;
  const hint = String(formData.get("hint") ?? "").trim() || null;
  const points = parseInt(String(formData.get("points") ?? "1"), 10);
  const required = formData.get("required") === "on" || formData.get("required") === "true";

  if (itemId) {
    await prisma.worksheetItem.update({
      where: { id: itemId },
      data: {
        type,
        order: isNaN(order) ? 0 : order,
        config,
        correctAnswer,
        hint,
        points: isNaN(points) ? 1 : points,
        required,
      },
    });
  } else {
    await prisma.worksheetItem.create({
      data: {
        worksheetId,
        type,
        order: isNaN(order) ? 0 : order,
        config,
        correctAnswer,
        hint,
        points: isNaN(points) ? 1 : points,
        required,
      },
    });
  }

  revalidatePath(`/teach/arbeitsblatter/${worksheetId}`);
}

export async function deleteWorksheetItem(worksheetId: string, itemId: string): Promise<void> {
  const session = await guardTeacher();

  const worksheet = await prisma.worksheet.findUnique({ where: { id: worksheetId } });
  if (!worksheet || worksheet.creatorId !== session.userId) return;

  await prisma.worksheetItem.delete({ where: { id: itemId } });
  revalidatePath(`/teach/arbeitsblatter/${worksheetId}`);
}

export async function reorderItems(worksheetId: string, itemIds: string[]): Promise<void> {
  const session = await guardTeacher();

  const worksheet = await prisma.worksheet.findUnique({ where: { id: worksheetId } });
  if (!worksheet || worksheet.creatorId !== session.userId) return;

  await Promise.all(
    itemIds.map((id, index) =>
      prisma.worksheetItem.update({ where: { id }, data: { order: index + 1 } })
    )
  );

  revalidatePath(`/teach/arbeitsblatter/${worksheetId}`);
}

export async function assignWorksheet(worksheetId: string, formData: FormData): Promise<void> {
  const session = await guardTeacher();

  const worksheet = await prisma.worksheet.findUnique({ where: { id: worksheetId } });
  if (!worksheet || worksheet.creatorId !== session.userId) return;

  const classId = String(formData.get("classId") ?? "").trim() || null;
  const dueAtRaw = String(formData.get("dueAt") ?? "").trim();
  const maxAttempts = parseInt(String(formData.get("maxAttempts") ?? "1"), 10);
  const showHints = formData.get("showHints") === "on" || formData.get("showHints") === "true";
  const showSolution = formData.get("showSolution") === "on" || formData.get("showSolution") === "true";

  const dueAt = dueAtRaw ? new Date(dueAtRaw) : null;

  await prisma.worksheetAssignment.create({
    data: {
      worksheetId,
      classId,
      teacherId: session.userId,
      dueAt: dueAt && !isNaN(dueAt.getTime()) ? dueAt : null,
      maxAttempts: isNaN(maxAttempts) ? 1 : maxAttempts,
      showHints,
      showSolution,
    },
  });

  // Notify students in the assigned class
  if (classId) {
    const students = await prisma.user.findMany({
      where: { classId, role: "student" },
      select: { id: true },
    });
    const studentIds = students.map((s) => s.id);
    if (studentIds.length > 0) {
      const dueLabel = dueAt && !isNaN(dueAt.getTime())
        ? ` · Fällig ${dueAt.toLocaleDateString("de-DE", { day: "numeric", month: "short" })}`
        : "";
      await Promise.all([
        pushToUsers(studentIds, {
          title: "Neues Arbeitsblatt",
          body: `${worksheet.title}${dueLabel}`,
          url: `/app/arbeitsblatter`,
        }),
        prisma.appNotification.createMany({
          data: studentIds.map((userId) => ({
            userId,
            type: "assignment",
            title: "Neues Arbeitsblatt",
            body: `${worksheet.title}${dueLabel}`,
          })),
          skipDuplicates: true,
        }),
      ]);
    }
  }

  revalidatePath(`/teach/arbeitsblatter/${worksheetId}`);
}

export async function deleteAssignment(assignmentId: string): Promise<void> {
  const session = await guardTeacher();

  const assignment = await prisma.worksheetAssignment.findUnique({
    where: { id: assignmentId },
    include: { worksheet: true },
  });
  if (!assignment || assignment.worksheet.creatorId !== session.userId) return;

  const worksheetId = assignment.worksheetId;
  await prisma.worksheetAssignment.delete({ where: { id: assignmentId } });
  revalidatePath(`/teach/arbeitsblatter/${worksheetId}`);
}
