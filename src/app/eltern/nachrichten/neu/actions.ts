"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";

export async function createParentThread(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "parent") redirect("/login");

  const recipientId = (formData.get("recipientId") as string | null)?.trim() ?? "";
  const subject = (formData.get("subject") as string | null)?.trim() ?? "";
  const content = (formData.get("content") as string | null)?.trim() ?? "";

  if (!recipientId || !subject || !content) return;
  if (!session.schoolId) return;

  const recipient = await prisma.user.findUnique({
    where: { id: recipientId },
    select: { role: true, schoolId: true },
  });

  if (!recipient || !["teacher", "admin"].includes(recipient.role)) return;
  if (recipient.schoolId !== session.schoolId) return;

  const thread = await prisma.messageThread.create({
    data: {
      subject,
      schoolId: session.schoolId,
      participants: {
        create: [{ userId: session.userId }, { userId: recipientId }],
      },
      messages: {
        create: { senderId: session.userId, content },
      },
    },
  });

  revalidatePath("/eltern/nachrichten");
  redirect(`/eltern/nachrichten/${thread.id}`);
}
