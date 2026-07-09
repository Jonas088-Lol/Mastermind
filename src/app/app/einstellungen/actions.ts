"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { getSession, invalidateOtherSessions } from "@/lib/session";
import { hashPassword, verifyPassword } from "@/lib/auth/passwords";
import { eraseUser } from "@/lib/privacy/data-subject";

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
  // Kaskadierende Löschung + Anonymisierung (Art. 17 DSGVO) über den zentralen
  // Dienst — löscht persönliche Inhalte, anonymisiert aufbewahrungspflichtige.
  await eraseUser(session.userId);
  redirect("/login");
}

export async function redeemClassCode(formData: FormData): Promise<{ error?: string; success?: string }> {
  const session = await getSession();
  if (!session) return { error: "Nicht eingeloggt" };

  const raw = (formData.get("code") as string | null)?.trim().toUpperCase();
  if (!raw) return { error: "Bitte Code eingeben." };

  const code = await prisma.provisioningCode.findUnique({
    where: { code: raw },
    include: { school: { select: { id: true } } },
  });

  if (!code) return { error: "Ungültiger Code." };
  if (code.revoked) return { error: "Dieser Code wurde widerrufen." };
  if (code.expiresAt && code.expiresAt < new Date()) return { error: "Dieser Code ist abgelaufen." };
  if (code.uses >= code.maxUses) return { error: "Dieser Code ist bereits ausgeschöpft." };
  if (code.kind !== "CLASS_JOIN") return { error: "Ungültiger Code-Typ." };
  if (!code.classId) return { error: "Kein Kurs diesem Code zugeordnet." };
  if (code.schoolId && code.schoolId !== session.schoolId) return { error: "Dieser Code gehört nicht zu deiner Schule." };

  await prisma.$transaction([
    prisma.user.update({
      where: { id: session.userId },
      data: { classId: code.classId },
    }),
    prisma.provisioningCode.update({
      where: { id: code.id },
      data: { uses: { increment: 1 } },
    }),
  ]);

  revalidatePath("/app/einstellungen");
  return { success: "Klasse erfolgreich beigetreten!" };
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

  // Alle anderen Sitzungen beenden — die aktuelle bleibt aktiv.
  await invalidateOtherSessions(session.userId);

  revalidatePath("/app/einstellungen");
}
