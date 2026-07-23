/* Copyright 2026 Elian Schock, Jonas Schwenk */
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { can } from "@/lib/permissions";
import { spreadsheetToMergeData, type MergeData } from "@/lib/mail-merge";
import { PrintAll } from "./PrintAll";

export const metadata: Metadata = { title: "Serienbrief drucken · MasterDoc" };

export default async function SerienbriefPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "teacher") redirect("/");
  if (!(await can(session, "teacher.mail_merge"))) redirect("/teach");

  const { id } = await params;
  const template = await prisma.mailMergeTemplate.findFirst({
    where: { id, schoolId: session.schoolId ?? "", createdById: session.userId },
  });
  if (!template) notFound();

  // Daten je nach Quelle laden: CSV liegt gespeichert vor, MasterCalc frisch.
  let data: MergeData = { fields: [], rows: [] };
  if (template.sourceType === "spreadsheet" && template.sourceRef) {
    const sheet = await prisma.spreadsheet.findFirst({
      where: { id: template.sourceRef, userId: session.userId },
      select: { data: true },
    });
    if (sheet) data = spreadsheetToMergeData(sheet.data);
  } else if (template.sourceData) {
    try {
      const parsed = JSON.parse(template.sourceData) as MergeData;
      if (Array.isArray(parsed.rows)) data = parsed;
    } catch { /* leer lassen */ }
  }

  return (
    <PrintAll
      templateId={template.id}
      subject={template.subject}
      body={template.body}
      data={data}
    />
  );
}
