"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hashPassword, verifyPassword } from "@/lib/auth/passwords";
import { prisma } from "@/lib/db/client";
import { ROLE_HOME, effectiveRole, getSession } from "@/lib/session";

async function requireParent() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "parent") redirect(ROLE_HOME[effectiveRole(session)]);
  return session;
}

export async function updateProfile(formData: FormData): Promise<void> {
  const session = await requireParent();

  const name = (formData.get("name") as string | null)?.trim() ?? "";
  const email = (formData.get("email") as string | null)?.trim().toLowerCase() ?? "";

  if (!name || !email) return;

  if (email !== session.email) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing && existing.id !== session.userId) return;
  }

  await prisma.user.update({
    where: { id: session.userId },
    data: { name, email },
  });

  revalidatePath("/eltern/einstellungen");
}

export async function changePassword(formData: FormData): Promise<void> {
  const session = await requireParent();

  const current = formData.get("current") as string;
  const newPw = formData.get("new") as string;

  if (!current || !newPw) return;
  if (newPw.length < 12) return;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { passwordHash: true },
  });
  if (!user) return;

  const valid = await verifyPassword(current, user.passwordHash);
  if (!valid) return;

  const newHash = await hashPassword(newPw);
  await prisma.user.update({
    where: { id: session.userId },
    data: { passwordHash: newHash },
  });

  revalidatePath("/eltern/einstellungen");
}

export async function updateNotifPrefs(formData: FormData): Promise<void> {
  const session = await requireParent();

  const prefs = {
    teacher_message: formData.get("teacher_message") === "on",
    grade: formData.get("grade") === "on",
    overdue: formData.get("overdue") === "on",
    school_info: formData.get("school_info") === "on",
  };

  await prisma.user.update({
    where: { id: session.userId },
    data: { notifPrefs: JSON.stringify(prefs) },
  });

  revalidatePath("/eltern/einstellungen");
}
