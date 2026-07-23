/* Copyright 2026 Elian Schock, Jonas Schwenk */
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { can } from "@/lib/permissions";
import { SerienbriefEditor } from "./SerienbriefEditor";

export const metadata: Metadata = { title: "Serienbrief bearbeiten · MasterDoc" };

export default async function SerienbriefEditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sent?: string; parents?: string; error?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "teacher") redirect("/");
  if (!(await can(session, "teacher.mail_merge"))) redirect("/teach");

  const { id } = await params;
  const { sent, parents, error } = await searchParams;

  const [template, sheets, classLinks] = await Promise.all([
    prisma.mailMergeTemplate.findFirst({
      where: { id, schoolId: session.schoolId ?? "", createdById: session.userId },
    }),
    prisma.spreadsheet.findMany({
      where: { userId: session.userId },
      orderBy: { updatedAt: "desc" },
      select: { id: true, title: true },
    }),
    prisma.teacherSubjectClass.findMany({
      where: { teacherId: session.userId },
      select: { class: { select: { id: true, name: true } } },
    }),
  ]);
  if (!template) notFound();

  const classes = [...new Map(classLinks.map((l) => [l.class.id, l.class])).values()].sort(
    (a, b) => a.name.localeCompare(b.name, "de", { numeric: true }),
  );

  return (
    <SerienbriefEditor
      template={{
        id: template.id,
        title: template.title,
        subject: template.subject,
        body: template.body,
        sourceType: template.sourceType,
        sourceRef: template.sourceRef,
        sourceData: template.sourceData,
      }}
      spreadsheets={sheets}
      classes={classes}
      flash={{ sent, parents, error }}
    />
  );
}
