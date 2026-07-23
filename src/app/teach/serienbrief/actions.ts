/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { can } from "@/lib/permissions";
import { spreadsheetToMergeData, type MergeData } from "@/lib/mail-merge";

async function requireMerge() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "teacher") redirect("/");
  if (!(await can(session, "teacher.mail_merge"))) redirect("/teach");
  if (!session.schoolId) redirect("/teach");
  return session;
}

export async function createTemplate(): Promise<void> {
  const session = await requireMerge();
  const t = await prisma.mailMergeTemplate.create({
    data: {
      schoolId: session.schoolId!,
      createdById: session.userId,
      createdByName: session.name,
      title: "Neuer Serienbrief",
    },
  });
  redirect(`/teach/serienbrief/${t.id}`);
}

/** Vorlage speichern (Titel, Betreff, Text, Quelle). */
export async function saveTemplate(formData: FormData): Promise<void> {
  const session = await requireMerge();
  const id = String(formData.get("id") ?? "");

  const owned = await prisma.mailMergeTemplate.findFirst({
    where: { id, schoolId: session.schoolId!, createdById: session.userId },
    select: { id: true },
  });
  if (!owned) redirect("/teach/serienbrief");

  const title = String(formData.get("title") ?? "").trim().slice(0, 140) || "Serienbrief";
  const subject = String(formData.get("subject") ?? "").trim().slice(0, 200);
  const body = String(formData.get("body") ?? "").slice(0, 50_000);
  const sourceType = String(formData.get("sourceType") ?? "manual");
  const sourceRef = String(formData.get("sourceRef") ?? "").trim() || null;
  // CSV-Daten kommen bereits als JSON-Array aus dem Client.
  const sourceData = String(formData.get("sourceData") ?? "").slice(0, 2_000_000) || null;

  const allowed = ["manual", "spreadsheet", "csv", "schooldata"];
  await prisma.mailMergeTemplate.update({
    where: { id: owned.id },
    data: {
      title,
      subject,
      body,
      sourceType: allowed.includes(sourceType) ? sourceType : "manual",
      sourceRef,
      sourceData,
    },
  });

  revalidatePath(`/teach/serienbrief/${owned.id}`);
  revalidatePath("/teach/serienbrief");
}

export async function deleteTemplate(formData: FormData): Promise<void> {
  const session = await requireMerge();
  const id = String(formData.get("id") ?? "");
  const owned = await prisma.mailMergeTemplate.findFirst({
    where: { id, schoolId: session.schoolId!, createdById: session.userId },
    select: { id: true },
  });
  if (owned) await prisma.mailMergeTemplate.delete({ where: { id: owned.id } });
  revalidatePath("/teach/serienbrief");
  redirect("/teach/serienbrief");
}

/** Daten einer MasterCalc-Tabelle als Merge-Daten laden (für die Quelle). */
export async function loadSpreadsheetSource(spreadsheetId: string): Promise<MergeData> {
  const session = await requireMerge();
  const sheet = await prisma.spreadsheet.findFirst({
    where: { id: spreadsheetId, userId: session.userId },
    select: { data: true },
  });
  if (!sheet) return { fields: [], rows: [] };
  return spreadsheetToMergeData(sheet.data);
}
