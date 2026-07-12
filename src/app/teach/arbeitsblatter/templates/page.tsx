/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { BookOpen, Clock, FileText, Layers } from "lucide-react";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { WORKSHEET_TEMPLATES, type WorksheetTemplate } from "@/lib/worksheet-templates";

export const metadata: Metadata = { title: "Vorlagen – Arbeitsblätter" };

const DIFFICULTY_VARIANT: Record<string, "success" | "warning" | "danger"> = {
  leicht: "success",
  mittel: "warning",
  schwer: "danger",
};

async function createFromTemplate(template: WorksheetTemplate): Promise<void> {
  "use server";
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "teacher") redirect("/login");
  if (!session.schoolId) redirect("/login");

  const worksheet = await prisma.worksheet.create({
    data: {
      title: template.title,
      description: template.description,
      gradeLevel: template.gradeLevel,
      difficulty: template.difficulty,
      estimatedMinutes: template.estimatedMinutes,
      status: "draft",
      isTemplate: false,
      creatorId: session.userId,
      schoolId: session.schoolId,
      items: {
        create: template.items.map((item) => ({
          type: item.type,
          order: item.order,
          config: item.config,
          correctAnswer: item.correctAnswer,
          hint: item.hint,
          points: item.points,
        })),
      },
    },
  });

  redirect(`/teach/arbeitsblatter/${worksheet.id}`);
}

export default async function TemplatesPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "teacher") redirect("/login");

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">
          Lehrerzentrum · Arbeitsblätter
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
          Vorlagen-Bibliothek
        </h1>
        <p className="mt-1 text-sm text-muted-fg">
          {WORKSHEET_TEMPLATES.length} fertige Arbeitsblätter – direkt verwenden und anpassen.
        </p>
      </header>

      {WORKSHEET_TEMPLATES.length === 0 ? (
        <div className="grid place-items-center border border-border bg-bg p-16 text-center">
          <FileText className="size-10 text-muted-fg" strokeWidth={1.5} />
          <p className="mt-4 text-base font-semibold">Keine Vorlagen vorhanden</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {WORKSHEET_TEMPLATES.map((template, index) => {
            const useTemplate = createFromTemplate.bind(null, template);
            return (
              <Card key={index} className="flex flex-col">
                <CardHeader className="pb-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant={DIFFICULTY_VARIANT[template.difficulty] ?? "neutral"}>
                        {template.difficulty}
                      </Badge>
                      <Badge variant="outline">{template.subject}</Badge>
                      <Badge variant="neutral">Klasse {template.gradeLevel}</Badge>
                    </div>
                    <p className="mt-2 text-sm font-semibold leading-snug">
                      {template.title}
                    </p>
                    {template.description && (
                      <p className="mt-1 line-clamp-2 text-xs text-muted-fg">
                        {template.description}
                      </p>
                    )}
                  </div>
                </CardHeader>
                <CardBody className="flex flex-1 flex-col justify-between pt-0!">
                  <div className="flex flex-wrap gap-4 text-xs text-muted-fg">
                    <span className="flex items-center gap-1">
                      <Layers className="size-3.5" />
                      <span className="font-semibold text-fg">{template.items.length}</span> Aufgaben
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="size-3.5" />
                      ~{template.estimatedMinutes} Min.
                    </span>
                    <span className="flex items-center gap-1">
                      <BookOpen className="size-3.5" />
                      {template.subject}
                    </span>
                  </div>
                  <form action={useTemplate} className="mt-4">
                    <button
                      type="submit"
                      className="inline-flex w-full items-center justify-center border border-border bg-bg px-3 py-2 text-xs font-semibold transition-colors hover:border-brand/40 hover:bg-surface hover:text-brand"
                    >
                      Verwenden
                    </button>
                  </form>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
