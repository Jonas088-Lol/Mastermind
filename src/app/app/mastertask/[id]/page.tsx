/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db/client";
import { StudentTaskView } from "./StudentTaskView";

export default async function StudentMasterTaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { classId: true },
  });

  const task = await prisma.masterTask.findUnique({
    where: { id },
    include: { files: { orderBy: { createdAt: "asc" } } },
  });

  if (!task || task.classId !== user?.classId) notFound();

  const progress = await prisma.masterTaskProgress.findUnique({
    where: { taskId_studentId: { taskId: id, studentId: session.userId } },
  });

  return <StudentTaskView task={task} progress={progress} />;
}
