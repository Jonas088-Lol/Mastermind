import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { safeJsonParse } from "@/lib/safe-json";
import { VorlagenClient, type TemplateItem } from "./VorlagenClient";

export const metadata: Metadata = { title: "Aufgaben-Vorlagen" };

interface TemplateContent {
  taskText?: string;
  type?: string;
  maxPoints?: number | null;
}

export default async function VorlagenPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "teacher") redirect("/");
  const schoolId = session.schoolId ?? "";

  const rows = await prisma.assignmentTemplate.findMany({
    where: {
      schoolId,
      OR: [{ teacherId: session.userId }, { shared: true }],
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const templates: TemplateItem[] = rows.map((t) => {
    const content = safeJsonParse<TemplateContent>(t.content, {});
    return {
      id: t.id,
      title: t.title,
      description: t.description,
      subjectName: t.subjectName,
      teacherName: t.teacherName,
      shared: t.shared,
      own: t.teacherId === session.userId,
      taskText: typeof content.taskText === "string" ? content.taskText : "",
      type: typeof content.type === "string" ? content.type : "homework",
      maxPoints: typeof content.maxPoints === "number" ? content.maxPoints : null,
      createdAt: t.createdAt.toLocaleDateString("de-DE"),
    };
  });

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Lehrer</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Aufgaben-Vorlagen</h1>
        <p className="mt-1 text-sm text-muted-fg">
          Eigene Vorlagen speichern, mit dem Kollegium teilen und schnell wiederverwenden.
        </p>
      </header>
      <VorlagenClient
        mine={templates.filter((t) => t.own)}
        shared={templates.filter((t) => !t.own)}
      />
    </div>
  );
}
