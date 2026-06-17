"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { sendEmail } from "@/lib/email";
import { logger } from "@/lib/logger";

export async function sendBulkStudentEmail(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/login");
  const role = effectiveRole(session);
  if (role !== "secretary" && role !== "rector" && role !== "vice_rector" && role !== "admin" && role !== "super") {
    redirect("/login");
  }

  const subject = (formData.get("subject") as string | null)?.trim() ?? "";
  const message = (formData.get("message") as string | null)?.trim() ?? "";
  const classFilter = (formData.get("classFilter") as string | null)?.trim() ?? "";

  if (!subject || !message) return;

  const schoolId = session.schoolId ?? "";

  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { mailboxAddress: true, mailboxName: true },
  });

  if (!school?.mailboxAddress) {
    redirect("/sekretariat/schueler/email-alle?error=no-mailbox");
  }

  const students = await prisma.user.findMany({
    where: {
      schoolId,
      role: "student",
      ...(classFilter ? { schoolClass: { name: classFilter } } : {}),
    },
    select: { email: true, name: true },
  });

  const from = school.mailboxName
    ? `${school.mailboxName} <${school.mailboxAddress}>`
    : school.mailboxAddress;

  let sent = 0;
  for (const student of students) {
    if (!student.email) continue;
    const result = await sendEmail({
      to: student.email,
      subject,
      text: message,
      from,
    });
    if (result.ok) sent++;
    else logger.warn("bulk student email failed", { to: student.email, error: result.error });
  }

  redirect(`/sekretariat/schueler/email-alle?sent=${sent}`);
}
