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
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "teacher") redirect("/");
  if (!(await can(session, "teacher.mail_merge"))) redirect("/teach");

  const { id } = await params;
  const [template, sheets] = await Promise.all([
    prisma.mailMergeTemplate.findFirst({
      where: { id, schoolId: session.schoolId ?? "", createdById: session.userId },
    }),
    prisma.spreadsheet.findMany({
      where: { userId: session.userId },
      orderBy: { updatedAt: "desc" },
      select: { id: true, title: true },
    }),
  ]);
  if (!template) notFound();

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
    />
  );
}
