"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hashPassword, verifyPassword } from "@/lib/auth/passwords";
import { prisma } from "@/lib/db/client";
import { getSession, invalidateOtherSessions } from "@/lib/session";
import { safeJsonParse } from "@/lib/safe-json";

async function getPrefs(userId: string): Promise<Record<string, boolean | string>> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { prefs: true } });
  return user?.prefs ? safeJsonParse<Record<string, boolean | string>>(user.prefs, {}) : {};
}

export async function updatePref(key: string, formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/login");

  const value = formData.get("value");
  const prefs = await getPrefs(session.userId);
  prefs[key] = value === "true" ? true : value === "false" ? false : String(value);

  await prisma.user.update({
    where: { id: session.userId },
    data: { prefs: JSON.stringify(prefs) },
  });

  revalidatePath("/teach/einstellungen");
}

export async function logoutSession(sessionId: string): Promise<void> {
  const session = await getSession();
  if (!session) return;

  const target = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!target || target.userId !== session.userId) return;

  await prisma.session.delete({ where: { id: sessionId } });
  revalidatePath("/teach/einstellungen");
}

export async function changePassword(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/login");

  const current = formData.get("current") as string;
  const newPw = formData.get("new") as string;

  if (!current || !newPw || newPw.length < 12) return;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { passwordHash: true },
  });
  if (!user) return;

  const valid = await verifyPassword(current, user.passwordHash);
  if (!valid) return;

  await prisma.user.update({
    where: { id: session.userId },
    data: { passwordHash: await hashPassword(newPw) },
  });

  await invalidateOtherSessions(session.userId);

  revalidatePath("/teach/einstellungen");
}
