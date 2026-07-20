/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { canUseOffice } from "@/lib/office";
import { SpreadsheetEditor } from "@/app/app/tabellen/[id]/SpreadsheetEditor";

interface Props {
  params: Promise<{ id: string }>;
}


export async function TabelleEditorView({ params }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canUseOffice(effectiveRole(session))) redirect("/");

  const { id } = await params;
  const sheet = await prisma.spreadsheet.findUnique({ where: { id } });

  if (!sheet || sheet.userId !== session.userId) notFound();

  return (
    <SpreadsheetEditor
      spreadsheetId={sheet.id}
      initialTitle={sheet.title}
      initialData={sheet.data}
    />
  );
}
