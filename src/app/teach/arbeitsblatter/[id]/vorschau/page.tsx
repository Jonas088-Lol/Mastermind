/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { buttonVariants } from "@/components/ui/button";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import type { WorksheetData, WorksheetItemData } from "@/components/worksheet";
import { PreviewClient } from "./PreviewClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const worksheet = await prisma.worksheet.findUnique({
    where: { id },
    select: { title: true },
  });
  return { title: worksheet ? `Vorschau · ${worksheet.title}` : "Vorschau" };
}

export default async function WorksheetPreviewPage({ params }: PageProps) {
  const { id } = await params;

  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "teacher") redirect("/login");

  const worksheet = await prisma.worksheet.findUnique({
    where: { id },
    include: {
      items: { orderBy: { order: "asc" } },
    },
  });

  if (!worksheet || worksheet.creatorId !== session.userId) notFound();

  const items: WorksheetItemData[] = worksheet.items.map((item) => ({
    id: item.id,
    type: item.type,
    order: item.order,
    config: item.config,
    correctAnswer: item.correctAnswer,
    hint: item.hint,
    points: item.points,
    required: item.required,
  }));

  const worksheetData: WorksheetData = {
    id: worksheet.id,
    title: worksheet.title,
    description: worksheet.description,
    estimatedMinutes: worksheet.estimatedMinutes,
    difficulty: worksheet.difficulty,
    language: worksheet.language,
    items,
  };

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 pb-12">
      <header className="flex items-center gap-4">
        <Link
          href={`/teach/arbeitsblatter/${id}`}
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          <ArrowLeft className="size-3.5" />
          Zurück
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold tracking-tight">
            Vorschau · {worksheet.title}
          </h1>
        </div>
      </header>

      <div className="border border-border">
        <PreviewClient worksheet={worksheetData} />
      </div>
    </div>
  );
}
