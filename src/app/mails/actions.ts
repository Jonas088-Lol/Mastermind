"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { sendEmail } from "@/lib/email";

export async function markRead(emailId: string): Promise<void> {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "admin") return;
  await prisma.mailboxEmail.updateMany({
    where: { id: emailId, schoolId: session.schoolId ?? "" },
    data: { readAt: new Date() },
  });
}

export async function sendReply(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "admin") redirect("/login");
  if (!session.schoolId) return;

  const emailId = String(formData.get("emailId") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  if (!emailId || !body) return;

  const [original, school] = await Promise.all([
    prisma.mailboxEmail.findFirst({ where: { id: emailId, schoolId: session.schoolId } }),
    prisma.school.findUnique({ where: { id: session.schoolId }, select: { mailboxAddress: true, mailboxName: true } }),
  ]);
  if (!original || !school?.mailboxAddress) return;

  const toAddress = original.direction === "inbound" ? original.fromAddress : original.toAddress;
  const subject = original.subject.startsWith("Re:") ? original.subject : `Re: ${original.subject}`;
  const fromLabel = school.mailboxName ? `${school.mailboxName} <${school.mailboxAddress}>` : school.mailboxAddress;

  const result = await sendEmail({ to: toAddress, subject, text: body, from: fromLabel });
  if (!result.ok) return;

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
      threadKey: original.threadKey ?? original.messageId ?? original.id,
      readAt: new Date(),
      userId: session.userId,
    },
  });

  revalidatePath("/mails");
}

export async function sendNew(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "admin") redirect("/login");
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

  const fromLabel = school.mailboxName ? `${school.mailboxName} <${school.mailboxAddress}>` : school.mailboxAddress;
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

  revalidatePath("/mails");
}

export async function deleteMail(emailId: string): Promise<void> {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "admin") return;
  await prisma.mailboxEmail.deleteMany({ where: { id: emailId, schoolId: session.schoolId ?? "" } });
  revalidatePath("/mails");
}

export async function saveSettings(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "admin") redirect("/login");
  if (!session.schoolId) return;

  const mailboxAddress = String(formData.get("mailboxAddress") ?? "").trim().toLowerCase();
  const mailboxName = String(formData.get("mailboxName") ?? "").trim();

  await prisma.school.update({
    where: { id: session.schoolId },
    data: { mailboxAddress: mailboxAddress || null, mailboxName: mailboxName || null },
  });

  revalidatePath("/mails");
}
