/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { sendEmail } from "@/lib/email";
import { canManageSchool, canAccessArea } from "@/lib/school-admin";

export async function markAsRead(emailId: string): Promise<void> {
  const session = await getSession();
  if (!session || !canManageSchool(effectiveRole(session))) return;
  if (!canAccessArea(effectiveRole(session), "postfach")) redirect("/admin");

  await prisma.mailboxEmail.updateMany({
    where: { id: emailId, schoolId: session.schoolId ?? "" },
    data: { readAt: new Date() },
  });
}

export async function replyToEmail(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session || !canManageSchool(effectiveRole(session))) redirect("/login");
  if (!session.schoolId) return;

  const emailId = String(formData.get("emailId") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  if (!emailId || !body) return;

  const original = await prisma.mailboxEmail.findFirst({
    where: { id: emailId, schoolId: session.schoolId },
  });
  if (!original) return;

  const school = await prisma.school.findUnique({
    where: { id: session.schoolId },
    select: { mailboxAddress: true, mailboxName: true },
  });
  if (!school?.mailboxAddress) return;

  const toAddress = original.direction === "inbound" ? original.fromAddress : original.toAddress;
  const subject = original.subject.startsWith("Re:") ? original.subject : `Re: ${original.subject}`;

  const fromLabel = school.mailboxName
    ? `${school.mailboxName} <${school.mailboxAddress}>`
    : school.mailboxAddress;

  const result = await sendEmail({
    to: toAddress,
    subject,
    text: body,
    from: fromLabel,
  });

  if (!result.ok) return;

  const threadKey = original.threadKey ?? original.messageId ?? original.id;

  await prisma.mailboxEmail.create({
    data: {
      schoolId: session.schoolId,
      direction: "outbound",
      fromAddress: school.mailboxAddress,
      fromName: school.mailboxName ?? null,
      toAddress,
      subject,
      bodyText: body,
      inReplyTo: original.messageId ?? null,
      threadKey,
      readAt: new Date(),
      userId: session.userId,
    },
  });

  revalidatePath(`/admin/postfach/${emailId}`);
  revalidatePath("/admin/postfach");
}

export async function deleteEmail(emailId: string): Promise<void> {
  const session = await getSession();
  if (!session || !canManageSchool(effectiveRole(session))) return;

  await prisma.mailboxEmail.deleteMany({
    where: { id: emailId, schoolId: session.schoolId ?? "" },
  });

  revalidatePath("/admin/postfach");
  redirect("/admin/postfach");
}
