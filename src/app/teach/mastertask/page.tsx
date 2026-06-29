import Link from "next/link";
import { redirect } from "next/navigation";
import { effectiveRole, getSession } from "@/lib/session";
import { prisma } from "@/lib/db/client";

export default async function TeachMasterTaskPage() {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "teacher") redirect("/login");

  const tasks = await prisma.masterTask.findMany({
    where: { teacherId: session.userId },
    include: {
      class: { select: { name: true } },
      _count: { select: { files: true, progress: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">MasterTask</h1>
          <p className="text-sm text-muted-foreground mt-1">Lernaufgaben mit Materialien für deine Klassen</p>
        </div>
        <Link
          href="/teach/mastertask/neu"
          className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          + Neue Aufgabe
        </Link>
      </div>

      {tasks.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg font-medium">Noch keine Aufgaben erstellt</p>
          <p className="text-sm mt-1">Erstelle deine erste MasterTask für eine Klasse.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {tasks.map((task) => (
            <Link
              key={task.id}
              href={`/teach/mastertask/${task.id}`}
              className="block border border-border rounded-xl p-4 hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="font-semibold truncate">{task.title}</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Klasse {task.class.name}</p>
                </div>
                {task.dueAt && (
                  <span className="text-xs text-muted-foreground shrink-0">
                    Bis {task.dueAt.toLocaleDateString("de-DE")}
                  </span>
                )}
              </div>
              {task.description && (
                <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{task.description}</p>
              )}
              <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                {task.subject && <span>{task.subject}</span>}
                {task.bookName && (
                  <span>{task.bookName}{task.bookPageFrom ? `, S. ${task.bookPageFrom}${task.bookPageTo ? `–${task.bookPageTo}` : ""}` : ""}</span>
                )}
                <span className="ml-auto">{task._count.files} Datei{task._count.files !== 1 ? "en" : ""}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
