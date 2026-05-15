"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { sendEmail } from "@/lib/email";
import { effectiveRole, getSession } from "@/lib/session";

export async function inviteTeacher(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "admin") redirect("/login");
  if (!session.schoolId) return;

  const email = (formData.get("email") as string | null)?.trim().toLowerCase() ?? "";
  const name = (formData.get("name") as string | null)?.trim() ?? "";

  if (!email || !name) return;

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) return;

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await prisma.verificationToken.create({
    data: {
      email,
      type: "teacher-invite",
      token,
      expiresAt,
    },
  });

  const school = await prisma.school.findUnique({
    where: { id: session.schoolId },
    select: { name: true },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const inviteUrl = `${appUrl}/onboarding?token=${token}&email=${encodeURIComponent(email)}&name=${encodeURIComponent(name)}&role=teacher&schoolId=${session.schoolId}`;

  await sendEmail({
    to: email,
    subject: `Einladung zu MasterMind — ${school?.name ?? "Deine Schule"}`,
    html: `
      <p>Hallo ${name},</p>
      <p>Du wurdest eingeladen, MasterMind als Lehrkraft an <strong>${school?.name ?? "deiner Schule"}</strong> zu nutzen.</p>
      <p><a href="${inviteUrl}" style="background:#000;color:#fff;padding:10px 20px;text-decoration:none;display:inline-block;">Jetzt Account erstellen</a></p>
      <p>Dieser Link ist 7 Tage gültig.</p>
      <p>Wenn du diesen Link nicht angefordert hast, ignoriere diese E-Mail.</p>
    `,
    text: `Hallo ${name},\n\nDu wurdest eingeladen, MasterMind als Lehrkraft an ${school?.name ?? "deiner Schule"} zu nutzen.\n\nErstelle deinen Account hier:\n${inviteUrl}\n\nDieser Link ist 7 Tage gültig.\n`,
  });

  revalidatePath("/admin/nutzer");
  redirect("/admin/nutzer");
}
