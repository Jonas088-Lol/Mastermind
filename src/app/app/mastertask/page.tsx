/* Copyright 2026 Elian Schock, Jonas Schwenk */
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db/client";
import { KanbanBoard } from "./KanbanBoard";

export default async function StudentMasterTaskPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { classId: true },
  });

  if (!user?.classId) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p>Du bist keiner Klasse zugeordnet.</p>
      </div>
    );
  }

  const [tasks, progressRecords] = await Promise.all([
    prisma.masterTask.findMany({
      where: { classId: user.classId },
      select: {
        id: true,
        title: true,
        description: true,
        subject: true,
        dueAt: true,
        bookName: true,
        bookPageFrom: true,
        bookPageTo: true,
        exerciseNr: true,
        _count: { select: { files: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.masterTaskProgress.findMany({
      where: { studentId: session.userId },
      select: { taskId: true, status: true },
    }),
  ]);

  const statusMap = new Map(progressRecords.map((p) => [p.taskId, p.status as "todo" | "in_progress" | "done"]));
  const tasksWithStatus = tasks.map((t) => ({ ...t, status: statusMap.get(t.id) ?? "todo" as const }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">MasterTask</h1>
        <p className="text-sm text-muted-foreground mt-1">Deine Lernaufgaben auf einen Blick</p>
      </div>

      {tasks.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg font-medium">Noch keine Aufgaben</p>
          <p className="text-sm mt-1">Deine Lehrkraft hat noch keine MasterTasks erstellt.</p>
        </div>
      ) : (
        <KanbanBoard tasks={tasksWithStatus} />
      )}
    </div>
  );
}
