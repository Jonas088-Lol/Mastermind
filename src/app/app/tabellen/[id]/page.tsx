/* Copyright 2026 Elian Schock, Jonas Schwenk */
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { SpreadsheetEditor } from "./SpreadsheetEditor";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const sheet = await prisma.spreadsheet.findUnique({ where: { id }, select: { title: true } });
  return { title: sheet ? `${sheet.title} · Tabellen` : "Tabelle" };
}

export default async function SpreadsheetEditorPage({ params }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "student") redirect("/");

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
