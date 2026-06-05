"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { getSession } from "@/lib/session";
import { hashPassword, verifyPassword } from "@/lib/auth/passwords";

export async function updatePref(key: string, formData: FormData) {
  const session = await getSession();
  if (!session) return;
  const value = formData.get("value") as string;
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { prefs: true },
  });
  const existing = user?.prefs ? (JSON.parse(user.prefs) as Record<string, unknown>) : {};
  existing[key] = value === "true" ? true : value === "false" ? false : value;
  await prisma.user.update({
    where: { id: session.userId },
    data: { prefs: JSON.stringify(existing) },
  });
  revalidatePath("/app/einstellungen");
}

export async function logoutDevice(sessionId: string) {
  const session = await getSession();
  if (!session) return;
  const target = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!target || target.userId !== session.userId) return;
  await prisma.session.delete({ where: { id: sessionId } });
  revalidatePath("/app/einstellungen");
}

export async function logoutAllDevices() {
  const session = await getSession();
  if (!session) return;
  // Exclude the current session (identified by the sid on the session object)
  const currentToken = session.sid;
  await prisma.session.deleteMany({
    where: {
      userId: session.userId,
      ...(currentToken ? { NOT: { token: currentToken } } : {}),
    },
  });
  revalidatePath("/app/einstellungen");
}

export async function deleteOwnAccount(formData: FormData) {
  const session = await getSession();
  if (!session) return;
  const confirm = formData.get("confirm") as string;
  if (confirm !== "LÖSCHEN") return;
  await prisma.session.deleteMany({ where: { userId: session.userId } });
  await prisma.user.update({
    where: { id: session.userId },
    data: { email: `deleted_${session.userId}@deleted.invalid`, name: "Gelöschter Nutzer", passwordHash: "" },
  });
  redirect("/login");
}

export async function changePassword(formData: FormData) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const current = formData.get("current") as string;
  const newPw = formData.get("new") as string;

  if (!current || !newPw) throw new Error("Fehlende Felder");
  if (newPw.length < 12) throw new Error("Neues Passwort mindestens 12 Zeichen");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { passwordHash: true },
  });
  if (!user) throw new Error("Benutzer nicht gefunden");

  const valid = await verifyPassword(current, user.passwordHash);
  if (!valid) throw new Error("Aktuelles Passwort falsch");

  const newHash = await hashPassword(newPw);
  await prisma.user.update({
    where: { id: session.userId },
    data: { passwordHash: newHash },
  });

  revalidatePath("/app/einstellungen");
}
