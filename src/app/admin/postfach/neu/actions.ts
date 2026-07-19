/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { sendEmail } from "@/lib/email";
import { canManageSchool, canAccessArea } from "@/lib/school-admin";

export async function sendNewEmail(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session || !canManageSchool(effectiveRole(session))) redirect("/login");
  if (!canAccessArea(effectiveRole(session), "postfach")) redirect("/admin");
  if (!session.schoolId) return;

  const to = String(formData.get("to") ?? "").trim();
  const subject = String(formData.get("subject") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();

  if (!to || !subject || !body) return;

  const school = await prisma.school.findUnique({
    where: { id: session.schoolId },
    select: { mailboxAddress: true, mailboxName: true },
  });
  if (!school?.mailboxAddress) return;

  const fromLabel = school.mailboxName
    ? `${school.mailboxName} <${school.mailboxAddress}>`
    : school.mailboxAddress;

  const result = await sendEmail({ to, subject, text: body, from: fromLabel });
  if (!result.ok) return;

  const messageId = result.id ? `<${result.id}@resend.dev>` : null;

  await prisma.mailboxEmail.create({
    data: {
      schoolId: session.schoolId,
      direction: "outbound",
      fromAddress: school.mailboxAddress,
      fromName: school.mailboxName ?? null,
      toAddress: to,
      subject,
      bodyText: body,
      messageId,
      threadKey: messageId,
      readAt: new Date(),
      userId: session.userId,
    },
  });

  revalidatePath("/admin/postfach");
  redirect("/admin/postfach?tab=gesendet");
}
