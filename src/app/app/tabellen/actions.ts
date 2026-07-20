/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { canUseOffice, officeBasePath } from "@/lib/office";
import { rateLimit } from "@/lib/security/rate-limit";
import { awardCoins } from "@/lib/coins";

async function requireOffice() {
  const session = await getSession();
  if (!session) redirect("/login");
  const role = effectiveRole(session);
  if (!canUseOffice(role)) redirect("/");
  // Basis-Pfad: jede Rolle bleibt in ihrer eigenen Ansicht.
  return { session, role, base: officeBasePath(role) };
}

export async function createSpreadsheet(): Promise<void> {
  const { session, role, base } = await requireOffice();
  // Missbrauchsschutz: max. 30 neue Tabellen/Stunde.
  const rl = await rateLimit({ scope: "create-sheet", key: session.userId, limit: 30, windowSec: 3600 });
  if (!rl.ok) redirect(`${base}/tabellen`);
  const sheet = await prisma.spreadsheet.create({
    data: { userId: session.userId },
  });
  if (role === "student") awardCoins(session.userId, "office_dokument_erstellt", undefined, sheet.id).catch(() => undefined);
  redirect(`${base}/tabellen/${sheet.id}`);
}

export async function renameSpreadsheet(spreadsheetId: string, title: string): Promise<void> {
  const { session, role, base } = await requireOffice();
  const sheet = await prisma.spreadsheet.findUnique({ where: { id: spreadsheetId } });
  if (!sheet || sheet.userId !== session.userId) return;
  await prisma.spreadsheet.update({
    where: { id: spreadsheetId },
    data: { title: title.trim().slice(0, 200) || "Unbenannte Tabelle" },
  });
  revalidatePath(`${base}/tabellen`);
}

export async function saveSpreadsheetData(spreadsheetId: string, data: string): Promise<void> {
  const { session, role, base } = await requireOffice();
  if (typeof data !== "string" || data.length > 2_000_000) return;
  const sheet = await prisma.spreadsheet.findUnique({ where: { id: spreadsheetId } });
  if (!sheet || sheet.userId !== session.userId) return;
  await prisma.spreadsheet.update({ where: { id: spreadsheetId }, data: { data } });
}

export async function deleteSpreadsheet(spreadsheetId: string): Promise<void> {
  const { session, role, base } = await requireOffice();
  const sheet = await prisma.spreadsheet.findUnique({ where: { id: spreadsheetId } });
  if (!sheet || sheet.userId !== session.userId) redirect(`${base}/tabellen`);
  await prisma.spreadsheet.delete({ where: { id: spreadsheetId } });
  redirect(`${base}/tabellen`);
}
