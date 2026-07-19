/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { sendEmail } from "@/lib/email";
import { effectiveRole, getSession } from "@/lib/session";
import { canManageSchool, canAccessArea } from "@/lib/school-admin";

export type BulkInviteResult = {
  sent: number;
  skipped: number;
  errors: { line: number; msg: string }[];
};

async function sendStudentInvite(
  email: string,
  name: string,
  klasse: string,
  schoolId: string,
  schoolName: string
): Promise<void> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await prisma.verificationToken.create({
    data: { email, type: "student-invite", token, expiresAt },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const params = new URLSearchParams({
    token, email, name, role: "student", schoolId,
    ...(klasse ? { klasse } : {}),
  });
  const inviteUrl = `${appUrl}/onboarding?${params.toString()}`;

  await sendEmail({
    to: email,
    subject: `Einladung zu MasterMind — ${schoolName}`,
    html: `
      <p>Hallo ${name},</p>
      <p>Du wurdest eingeladen, MasterMind als Schüler:in an <strong>${schoolName}</strong> zu nutzen.</p>
      <p><a href="${inviteUrl}" style="background:#000;color:#fff;padding:10px 20px;text-decoration:none;display:inline-block;">Jetzt Account erstellen</a></p>
      <p>Dieser Link ist 7 Tage gültig.</p>
    `,
    text: `Hallo ${name},\n\nErstelle deinen Account hier:\n${inviteUrl}\n\nDieser Link ist 7 Tage gültig.\n`,
  });
}

export async function inviteStudent(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session || !canManageSchool(effectiveRole(session))) redirect("/login");
  if (!canAccessArea(effectiveRole(session), "nutzer")) redirect("/admin");
  if (!session.schoolId) return;

  const email = (formData.get("email") as string | null)?.trim().toLowerCase() ?? "";
  const name = (formData.get("name") as string | null)?.trim() ?? "";
  const klasse = (formData.get("klasse") as string | null)?.trim() ?? "";

  if (!email || !name) return;

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) return;

  const school = await prisma.school.findUnique({
    where: { id: session.schoolId },
    select: { name: true },
  });

  await sendStudentInvite(email, name, klasse, session.schoolId, school?.name ?? "Deine Schule");

  revalidatePath("/admin/nutzer");
  redirect("/admin/nutzer");
}

export async function bulkInviteStudents(formData: FormData): Promise<BulkInviteResult> {
  const session = await getSession();
  if (!session || !canManageSchool(effectiveRole(session))) redirect("/login");
  if (!session.schoolId) return { sent: 0, skipped: 0, errors: [] };

  const school = await prisma.school.findUnique({
    where: { id: session.schoolId },
    select: { name: true },
  });
  const schoolName = school?.name ?? "Deine Schule";

  const csvText = (formData.get("csvData") as string | null)?.trim() ?? "";
  if (!csvText) return { sent: 0, skipped: 0, errors: [{ line: 0, msg: "Keine Daten eingegeben" }] };

  const lines = csvText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const dataLines = /name|e-?mail|email/i.test(lines[0]) ? lines.slice(1) : lines;

  const errors: { line: number; msg: string }[] = [];
  let sent = 0;
  let skipped = 0;

  for (let i = 0; i < dataLines.length; i++) {
    const lineNum = i + (lines.length !== dataLines.length ? 2 : 1);
    const sep = dataLines[i].includes(";") ? ";" : ",";
    const cols = dataLines[i].split(sep).map((c) => c.trim());

    if (cols.length < 2) {
      errors.push({ line: lineNum, msg: "Zu wenige Spalten (Name;E-Mail[;Klasse])" });
      continue;
    }

    const [name, emailRaw, klasse] = cols;
    const email = emailRaw.toLowerCase();

    if (!name) { errors.push({ line: lineNum, msg: "Name fehlt" }); continue; }
    if (!email || !email.includes("@")) { errors.push({ line: lineNum, msg: `Ungültige E-Mail: "${emailRaw}"` }); continue; }

    const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existing) { skipped++; continue; }

    const alreadyInvited = await prisma.verificationToken.findFirst({
      where: { email, type: "student-invite" },
    });
    if (alreadyInvited) { skipped++; continue; }

    try {
      await sendStudentInvite(email, name, klasse ?? "", session.schoolId!, schoolName);
      sent++;
    } catch {
      errors.push({ line: lineNum, msg: `E-Mail-Versand fehlgeschlagen für ${email}` });
    }
  }

  revalidatePath("/admin/nutzer");
  return { sent, skipped, errors };
}
