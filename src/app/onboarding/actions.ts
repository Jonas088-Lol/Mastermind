/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use server";

import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { hashPassword } from "@/lib/auth/passwords";
import { prisma } from "@/lib/db/client";
import { sendEmail } from "@/lib/email";
import { setSession } from "@/lib/session";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function err(msg: string): never {
  redirect(`/onboarding?step=5&error=${encodeURIComponent(msg)}`);
}

export async function createSchoolAndAdmin(formData: FormData) {
  const schoolName = String(formData.get("school-name") ?? "").trim();
  const adminName = String(formData.get("admin-name") ?? "").trim();
  const adminEmail = String(formData.get("admin-email") ?? "")
    .trim()
    .toLowerCase();
  const adminPassword = String(formData.get("admin-password") ?? "");
  const plan = String(formData.get("plan") ?? "basic");

  if (!schoolName || schoolName.length < 3) err("Schulname zu kurz (min. 3 Zeichen)");
  if (!adminName || adminName.length < 2) err("Vor- und Nachname angeben");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) err("Ungültige E-Mail-Adresse");
  if (adminPassword.length < 12) err("Passwort mindestens 12 Zeichen");
  if (!["basic", "pro", "enterprise"].includes(plan)) err("Ungültiger Plan");

  let slug = slugify(schoolName);
  const existing = await prisma.school.findUnique({ where: { slug } });
  if (existing) slug = `${slug}-${randomBytes(3).toString("hex")}`;

  const existingUser = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (existingUser) err("Diese E-Mail-Adresse ist bereits registriert");

  const passwordHash = await hashPassword(adminPassword);

  const school = await prisma.school.create({
    data: {
      slug,
      name: schoolName,
      plan,
      users: {
        create: {
          email: adminEmail,
          name: adminName,
          passwordHash,
          role: "admin",
          verifiedAt: new Date(),
        },
      },
    },
    include: { users: true },
  });

  const admin = school.users[0];

  await sendEmail({
    to: adminEmail,
    subject: `Willkommen bei MasterMind — ${schoolName} ist live`,
    text:
      `Hallo ${adminName},\n\n` +
      `deine Schule „${schoolName}" wurde erfolgreich eingerichtet.\n\n` +
      `Melde dich mit dieser E-Mail-Adresse und deinem Passwort an.\n\n` +
      `— MasterMind\n`,
  });

  await setSession({ email: admin.email, realRole: "admin" });
  redirect("/admin/branding");
}

export async function activateTeacherInvite(formData: FormData) {
  const token = String(formData.get("token") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const name = String(formData.get("name") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const schoolId = String(formData.get("schoolId") ?? "").trim();

  function inviteErr(msg: string): never {
    redirect(
      `/onboarding?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}&name=${encodeURIComponent(name)}&role=teacher&schoolId=${encodeURIComponent(schoolId)}&error=${encodeURIComponent(msg)}`
    );
  }

  if (!token) inviteErr("Ungültiger Einladungslink");
  if (password.length < 12) inviteErr("Passwort mindestens 12 Zeichen");

  const vt = await prisma.verificationToken.findUnique({ where: { token } });
  if (!vt || vt.type !== "teacher-invite") inviteErr("Ungültiger Einladungslink");
  if (vt.email.toLowerCase() !== email) inviteErr("E-Mail stimmt nicht überein");
  if (vt.expiresAt < new Date()) inviteErr("Einladungslink abgelaufen (7-Tage-Frist)");
  if (vt.consumedAt) inviteErr("Dieser Einladungslink wurde bereits verwendet");

  const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { id: true } });
  if (!school) inviteErr("Schule nicht gefunden");

  const existingUser = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existingUser) inviteErr("Diese E-Mail-Adresse ist bereits registriert");

  const passwordHash = await hashPassword(password);

  await prisma.user.create({
    data: {
      email,
      name,
      passwordHash,
      role: "teacher",
      schoolId: school.id,
      verifiedAt: new Date(),
    },
  });

  await prisma.verificationToken.update({
    where: { token },
    data: { consumedAt: new Date() },
  });

  await setSession({ email, realRole: "teacher" });
  redirect("/teach");
}

export async function activateStudentInvite(formData: FormData) {
  const token = String(formData.get("token") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const name = String(formData.get("name") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const schoolId = String(formData.get("schoolId") ?? "").trim();
  const klasse = String(formData.get("klasse") ?? "").trim() || null;

  function inviteErr(msg: string): never {
    const p = new URLSearchParams({ token, email, name, role: "student", schoolId, error: msg });
    if (klasse) p.set("klasse", klasse);
    redirect(`/onboarding?${p.toString()}`);
  }

  if (!token) inviteErr("Ungültiger Einladungslink");
  if (password.length < 12) inviteErr("Passwort mindestens 12 Zeichen");

  const vt = await prisma.verificationToken.findUnique({ where: { token } });
  if (!vt || vt.type !== "student-invite") inviteErr("Ungültiger Einladungslink");
  if (vt.email.toLowerCase() !== email) inviteErr("E-Mail stimmt nicht überein");
  if (vt.expiresAt < new Date()) inviteErr("Einladungslink abgelaufen (7-Tage-Frist)");
  if (vt.consumedAt) inviteErr("Dieser Einladungslink wurde bereits verwendet");

  const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { id: true } });
  if (!school) inviteErr("Schule nicht gefunden");

  const existingUser = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existingUser) inviteErr("Diese E-Mail-Adresse ist bereits registriert");

  const passwordHash = await hashPassword(password);

  await prisma.user.create({
    data: {
      email,
      name,
      passwordHash,
      role: "student",
      klasse,
      schoolId: school.id,
      verifiedAt: new Date(),
    },
  });

  await prisma.verificationToken.update({
    where: { token },
    data: { consumedAt: new Date() },
  });

  await setSession({ email, realRole: "student" });
  redirect("/app");
}
