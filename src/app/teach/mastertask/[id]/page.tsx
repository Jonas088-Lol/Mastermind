import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { effectiveRole, getSession } from "@/lib/session";
import { prisma } from "@/lib/db/client";
import { MasterTaskTeacherDetail } from "./MasterTaskTeacherDetail";

export default async function TeachMasterTaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  if (!session || effectiveRole(session) !== "teacher") redirect("/login");

  const task = await prisma.masterTask.findUnique({
    where: { id },
    include: {
      class: { select: { id: true, name: true } },
      files: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!task || task.teacherId !== session.userId) notFound();

  // Get all students in the class + their progress
  const [students, progressRecords] = await Promise.all([
    prisma.user.findMany({
      where: { classId: task.classId, role: "student" },
      select: { id: true, name: true, avatarUrl: true },
      orderBy: { name: "asc" },
    }),
    prisma.masterTaskProgress.findMany({
      where: { taskId: id },
      select: { studentId: true, status: true, comment: true, submissionPath: true, submissionName: true, updatedAt: true },
    }),
  ]);

  const progressMap = new Map(progressRecords.map((p) => [p.studentId, p]));

  const studentsWithProgress = students.map((s) => ({
    ...s,
    progress: progressMap.get(s.id) ?? null,
  }));

  return (
    <MasterTaskTeacherDetail task={task} students={studentsWithProgress} />
  );
}
