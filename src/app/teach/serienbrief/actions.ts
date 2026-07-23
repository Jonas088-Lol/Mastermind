/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { can } from "@/lib/permissions";
import { pushToUsers } from "@/lib/push";
import { spreadsheetToMergeData, renderTemplate, type MergeData, type MergeRow } from "@/lib/mail-merge";

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

/**
 * Schuldaten-Quelle: Schüler einer Klasse, die die Lehrkraft unterrichtet.
 * DSGVO: Datenminimierung — nur Name (+ best-effort Vor-/Nachname) und Klasse.
 * Die Schüler-ID wird für den zielgenauen Versand mitgeführt (nicht angezeigt).
 */
export async function loadSchoolClassSource(classId: string): Promise<MergeData> {
  const session = await requireMerge();

  // Nur Klassen, die die Lehrkraft auch unterrichtet.
  const teaches = await prisma.teacherSubjectClass.findFirst({
    where: { teacherId: session.userId, classId },
    select: { id: true },
  });
  if (!teaches) return { fields: [], rows: [] };

  const klass = await prisma.schoolClass.findFirst({
    where: { id: classId, schoolId: session.schoolId! },
    select: { name: true },
  });
  if (!klass) return { fields: [], rows: [] };

  const students = await prisma.user.findMany({
    where: { role: "student", classId, schoolId: session.schoolId! },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const rows: MergeRow[] = students.map((s) => {
    const parts = s.name.trim().split(/\s+/);
    const nachname = parts.length > 1 ? parts[parts.length - 1] : s.name;
    const vorname = parts.length > 1 ? parts.slice(0, -1).join(" ") : "";
    return { __studentId: s.id, Name: s.name, Vorname: vorname, Nachname: nachname, Klasse: klass.name };
  });

  // __studentId ist internes Feld — nicht als wählbarer Platzhalter anzeigen.
  return { fields: ["Name", "Vorname", "Nachname", "Klasse"], rows };
}

/** Klassen, die die Lehrkraft unterrichtet (für die Quellen-Auswahl). */
export async function teacherClasses(): Promise<{ id: string; name: string }[]> {
  const session = await requireMerge();
  const links = await prisma.teacherSubjectClass.findMany({
    where: { teacherId: session.userId },
    select: { class: { select: { id: true, name: true } } },
  });
  const map = new Map(links.map((l) => [l.class.id, l.class]));
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, "de", { numeric: true }));
}

/**
 * Serienbrief als personalisierten digitalen Elternbrief versenden.
 *
 * DSGVO-Leitplanken:
 * - Nur Quelle „schooldata" (echte Schüler), nur Klassen der Lehrkraft.
 * - Pro Schüler ein eigener Brief, sichtbar NUR für dessen Eltern
 *   (ConsentForm.targetStudentId) — kein Einblick in fremde Briefe.
 * - Kein externer Mailversand; nur In-App-Benachrichtigung + Push an Konten
 *   im System. Datenminimierung: gespeichert wird der gerenderte Text.
 */
export async function sendAsElternbrief(formData: FormData): Promise<void> {
  const session = await requireMerge();
  const id = String(formData.get("id") ?? "");

  const t = await prisma.mailMergeTemplate.findFirst({
    where: { id, schoolId: session.schoolId!, createdById: session.userId },
  });
  if (!t) redirect("/teach/serienbrief");

  if (t.sourceType !== "schooldata" || !t.sourceRef) {
    redirect(`/teach/serienbrief/${t.id}?error=${encodeURIComponent("Direktversand nur mit Schuldaten-Quelle (Klasse).")}`);
  }
  const classId = t.sourceRef!;

  // Rechte erneut prüfen (Klasse der Lehrkraft).
  const teaches = await prisma.teacherSubjectClass.findFirst({
    where: { teacherId: session.userId, classId },
    select: { id: true },
  });
  if (!teaches) redirect(`/teach/serienbrief/${t.id}?error=${encodeURIComponent("Du unterrichtest diese Klasse nicht.")}`);

  const students = await prisma.user.findMany({
    where: { role: "student", classId, schoolId: session.schoolId! },
    select: { id: true, name: true, classId: true, class: { select: { name: true } } },
  });
  if (students.length === 0) {
    redirect(`/teach/serienbrief/${t.id}?error=${encodeURIComponent("Keine Schüler in dieser Klasse.")}`);
  }

  const links = await prisma.parentStudentLink.findMany({
    where: { studentId: { in: students.map((s) => s.id) } },
    select: { studentId: true, parentId: true },
  });
  const parentsByStudent = new Map<string, string[]>();
  for (const l of links) {
    const arr = parentsByStudent.get(l.studentId) ?? [];
    arr.push(l.parentId);
    parentsByStudent.set(l.studentId, arr);
  }

  let created = 0;
  let notified = 0;
  for (const s of students) {
    const parts = s.name.trim().split(/\s+/);
    const nachname = parts.length > 1 ? parts[parts.length - 1] : s.name;
    const vorname = parts.length > 1 ? parts.slice(0, -1).join(" ") : "";
    const row: MergeRow = {
      Name: s.name, Vorname: vorname, Nachname: nachname, Klasse: s.class?.name ?? "",
    };
    const parentIds = parentsByStudent.get(s.id) ?? [];
    if (parentIds.length === 0) continue; // kein Elternkonto → nichts anlegen

    const form = await prisma.consentForm.create({
      data: {
        schoolId: session.schoolId!,
        title: renderTemplate(t.title, row).slice(0, 140) || t.title,
        description: renderTemplate(t.body, row),
        isActive: true,
        targetStudentId: s.id,      // nur Eltern dieses Kindes sehen den Brief
        targetClassIds: null,
        createdById: session.userId,
        createdByName: session.name,
      },
    });
    created++;

    await prisma.appNotification.createMany({
      data: parentIds.map((userId) => ({
        userId,
        type: "consent",
        title: "Neuer Elternbrief",
        body: `${renderTemplate(t.subject || t.title, row)} — bitte bestätigen.`,
        linkUrl: "/eltern/einwilligungen",
      })),
    });
    notified += parentIds.length;
    pushToUsers(parentIds, {
      title: "Neuer Elternbrief",
      body: `${renderTemplate(t.subject || t.title, row)} — bitte bestätigen.`,
      url: "/eltern/einwilligungen",
      data: { type: "consent", formId: form.id },
    }).catch(() => undefined);
  }

  // Versandprotokoll — minimal: Anzahlen + Zeitpunkt, keine überflüssigen Personendaten.
  await prisma.mailMergeLog.create({
    data: { templateId: t.id, recipientCount: created, channel: "elternbrief" },
  });

  revalidatePath("/teach/serienbrief");
  revalidatePath("/eltern/einwilligungen");
  redirect(`/teach/serienbrief/${t.id}?sent=${created}&parents=${notified}`);
}
