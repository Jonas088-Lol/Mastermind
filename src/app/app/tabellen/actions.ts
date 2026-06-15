"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";

async function requireStudent() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "student") redirect("/");
  return session;
}

export async function createSpreadsheet(): Promise<void> {
  const session = await requireStudent();
  const sheet = await prisma.spreadsheet.create({
    data: { userId: session.userId },
  });
  redirect(`/app/tabellen/${sheet.id}`);
}

export async function renameSpreadsheet(spreadsheetId: string, title: string): Promise<void> {
  const session = await requireStudent();
  const sheet = await prisma.spreadsheet.findUnique({ where: { id: spreadsheetId } });
  if (!sheet || sheet.userId !== session.userId) return;
  await prisma.spreadsheet.update({
    where: { id: spreadsheetId },
    data: { title: title.trim() || "Unbenannte Tabelle" },
  });
  revalidatePath("/app/tabellen");
}

export async function saveSpreadsheetData(spreadsheetId: string, data: string): Promise<void> {
  const session = await requireStudent();
  const sheet = await prisma.spreadsheet.findUnique({ where: { id: spreadsheetId } });
  if (!sheet || sheet.userId !== session.userId) return;
  await prisma.spreadsheet.update({ where: { id: spreadsheetId }, data: { data } });
}

export async function deleteSpreadsheet(spreadsheetId: string): Promise<void> {
  const session = await requireStudent();
  const sheet = await prisma.spreadsheet.findUnique({ where: { id: spreadsheetId } });
  if (!sheet || sheet.userId !== session.userId) redirect("/app/tabellen");
  await prisma.spreadsheet.delete({ where: { id: spreadsheetId } });
  redirect("/app/tabellen");
}
